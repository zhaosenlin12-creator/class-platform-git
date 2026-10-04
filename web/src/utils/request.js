import Vue from 'vue'
import axios from 'axios'
import store from '@/store'
import { VueAxios } from './axios'
import { Modal, message } from 'ant-design-vue'
import { ACCESS_TOKEN } from '@/store/mutation-types'

import { ErrorHandler } from './errorHandler'
import { checkAPIPermission, addDataScopeFilter } from './api-permission'
import { getStoredAccessToken, resolveApiBaseUrl, shouldAttachTokenToRequest } from './trustedApi'

const runtimeConsole = typeof window !== 'undefined' && window.console
    ? window.console
    : global.console

const isDebugEnabled = typeof window !== 'undefined' && window.__APP_DEBUG__ === true

const console = isDebugEnabled
    ? runtimeConsole
    : {
        log () {},
        warn () {},
        error (...args) {
            return runtimeConsole && runtimeConsole.error
                ? runtimeConsole.error(...args)
                : undefined
        }
    }

// 请求缓存默认关闭，只有显式声明 cacheable 才启用，避免用户态和实时统计被串用
const requestCache = new Map()
const CACHE_EXPIRE_TIME = 5 * 60 * 1000 // 5分钟缓存

// 请求取消 (防止重复请求)
const pendingRequests = new Map()

// ==================== Token刷新机制 ====================
// 配置项
const TOKEN_REFRESH_CONFIG = {
    enabled: false, // 是否启用Token刷新 (后端接口未实现,暂时禁用)
    refreshUrl: '/sys/user/refreshToken', // Token刷新接口
    maxRetries: 1 // 刷新失败后重试次数
}

// Token刷新状态
let isRefreshing = false // 是否正在刷新
let refreshSubscribers = [] // 等待刷新完成的请求队列

// 添加请求到刷新队列
function subscribeTokenRefresh (cb) {
    refreshSubscribers.push(cb)
}

// 通知所有等待的请求
function onRefreshed (token) {
    refreshSubscribers.forEach(cb => cb(token))
    refreshSubscribers = []
}

// 刷新Token失败
function onRefreshFailure (error) {
    refreshSubscribers = []
    isRefreshing = false
    return Promise.reject(error)
}

/**
 * 【指定 axios的 baseURL】
 * 开发环境使用代理，生产环境使用完整URL
 * @type {*|string}
 */
const apiBaseUrl = resolveApiBaseUrl()

// baseURL resolution is centralized in trustedApi to keep env/config/storage handling consistent.

console.log('🔧 [API CONFIG] Environment:', process.env.NODE_ENV)
console.log('🔧 [API CONFIG] BaseURL:', apiBaseUrl || '(使用代理)')

// 创建 axios 实例
const service = axios.create({
    baseURL: apiBaseUrl, // api base_url
    timeout: 60000 // 请求超时时间
})

function shouldSkipAuthInjection (config = {}) {
    const rawUrl = String(config.url || '').trim()
    return rawUrl === '/sys/login' || rawUrl === '/sys/phoneLogin' || rawUrl.startsWith('/thirdLogin/')
}

function isLogoutRequest (config = {}) {
    return String(config.url || '').trim() === '/sys/logout'
}

// 启用Mock模式
// setupMock(service) // 暂时禁用Mock模式，使用真实API

const err = (error, skipRefresh = false) => {
    const token = store.getters.token || getStoredAccessToken()

    // 增强错误日志记录 (不记录敏感信息)
    console.error('[ERROR HANDLER] Full error object:', {
        hasConfig: !!error.config,
        hasResponse: !!error.response,
        message: error.message,
        errorType: error.constructor.name,
        isCancel: error.__CANCEL__ || (error.message && error.message.includes('cancel'))
    })

    console.error('API Request Error:', {
        url: error.config && error.config.url,
        method: error.config && error.config.method,
        status: error.response && error.response.status,
        message: error.message
    // 注意: 不记录token或其他敏感信息
    })

    // 如果没有config，说明请求根本没发出去
    if (!error.config) {
        console.error('[ERROR HANDLER] ❌ No config found! Request was blocked or cancelled before sending.')
        console.error('[ERROR HANDLER] Error details:', error)
    }

    // 处理401未授权错误 - Token刷新逻辑
    if (error.response && error.response.status === 401 && !skipRefresh) {
        const isLoggingOut = typeof window !== 'undefined' && window.__LOGGING_OUT__ === true
        if (isLoggingOut || isLogoutRequest(error.config)) {
            return Promise.reject(error)
        }
        const data = error.response.data || {}
        const isTokenExpired = data.message === 'Token失效，请重新登录' ||
                          (data.message && data.message.includes('token')) ||
                          (data.message && data.message.includes('登录')) ||
                          (data.message && data.message.includes('过期'))

        // 如果用户从未登录（没有token），静默处理，不显示弹窗
        if (!token) {
            console.log('[AUTH] 用户未登录，静默处理401错误')
            return Promise.reject(error)
        }

        // 如果启用了Token刷新且有Token
        if (TOKEN_REFRESH_CONFIG.enabled && token && isTokenExpired) {
            const config = error.config

            // 避免刷新接口本身再次刷新(死循环)
            if (config && config.url && config.url.includes('refreshToken')) {
                // 刷新接口失败,降级到原有逻辑
                return handleTokenExpiredFallback(error)
            }

            // 如果正在刷新,将请求加入队列
            if (isRefreshing && config) {
                return new Promise((resolve) => {
                    subscribeTokenRefresh((newToken) => {
                        config.headers['X-Access-Token'] = newToken
                        config._retry = true // 标记为重试请求
                        resolve(service(config))
                    })
                })
            }

            // 开始刷新Token
            if (!isRefreshing && config) {
                isRefreshing = true

                return refreshAccessToken()
                    .then((newToken) => {
                        // 刷新成功
                        isRefreshing = false
                        onRefreshed(newToken)

                        // 重试当前请求
                        config.headers['X-Access-Token'] = newToken
                        config._retry = true
                        return service(config)
                    })
                    .catch((refreshError) => {
                        // 刷新失败,降级到原有逻辑
                        isRefreshing = false
                        onRefreshFailure(refreshError)
                        return handleTokenExpiredFallback(error)
                    })
            }
        } else if (token && isTokenExpired) {
            // Token刷新未启用或失败,使用原有逻辑
            return handleTokenExpiredFallback(error)
        }
    }

    // 处理500错误中的Token过期
    if (error.response && error.response.status === 500) {
        const data = error.response.data
        const isTokenExpired = data.message === 'Token失效，请重新登录' ||
                          (data.message && data.message.includes('token')) ||
                          (data.message && data.message.includes('登录'))

        if (token && isTokenExpired) {
            return handleTokenExpiredFallback(error)
        }
    }

    // 使用统一的错误处理器
    // 登录接口的错误不在这里处理，由登录组件自己处理
    if (!error.config || !error.config.url || !error.config.url.includes('/sys/login')) {
        ErrorHandler.handleApiError(error, {
            component: 'request_interceptor',
            hasToken: !!token,
            timestamp: new Date().toISOString()
        })
    }

    // 更新store中的错误状态
    if (error.config && error.config.url) {
        const errorKey = error.config.url.split('/').pop() || 'unknown'
        store.commit('SET_ERROR', {
            key: errorKey,
            error: {
                status: error.response && error.response.status,
                message: (error.response && error.response.data && error.response.data.message) || error.message,
                timestamp: Date.now()
            }
        })
    }

    return Promise.reject(error)
}

// Token过期降级处理 (原有逻辑)
function handleTokenExpiredFallback (error) {
    Modal.error({
        title: '登录已过期',
        content: '很抱歉，登录已过期，请重新登录',
        okText: '重新登录',
        mask: false,
        onOk: () => {
            store.dispatch('Logout').then(() => {
                Vue.ls.remove(ACCESS_TOKEN)
                window.location.reload()
            })
        }
    })
    return Promise.reject(error)
}

// 刷新Token函数
function refreshAccessToken () {
    const oldToken = store.getters.token || getStoredAccessToken()

    return new Promise((resolve, reject) => {
    // 调用刷新Token接口
        axios.post(TOKEN_REFRESH_CONFIG.refreshUrl, {}, {
            headers: {
                'X-Access-Token': oldToken
            }
        })
            .then(response => {
                if (response.data && response.data.success && response.data.result) {
                    const newToken = response.data.result.token || response.data.result

                    // 保存新Token
                    Vue.ls.set(ACCESS_TOKEN, newToken, 7 * 24 * 60 * 60 * 1000)
                    store.commit('SET_TOKEN', newToken)

                    console.warn('✅ Token自动刷新成功')
                    resolve(newToken)
                } else {
                    console.warn('❌ Token刷新失败: 响应格式错误')
                    reject(new Error('Token refresh failed'))
                }
            })
            .catch(error => {
                console.warn('❌ Token刷新失败:', error.message)
                reject(error)
            })
    })
}

// 生成请求唯一key
function generateRequestKey (config) {
    const { method, url, params, data } = config
    const token = (config.headers && config.headers['X-Access-Token']) || getStoredAccessToken() || ''
    return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}:${token}`
}

// 移除pending请求
function removePendingRequest (config) {
    const requestKey = generateRequestKey(config)
    if (pendingRequests.has(requestKey)) {
        const cancel = pendingRequests.get(requestKey)
        cancel(requestKey)
        pendingRequests.delete(requestKey)
    }
}

// 请求缓存处理
function getCachedResponse (config) {
    if (config.method !== 'get' || config.disableCache || !config.cacheable) {
        return null
    }

    const cacheKey = generateRequestKey(config)
    const cached = requestCache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRE_TIME) {
        return cached.data
    }

    return null
}

// 设置响应缓存
function setCachedResponse (config, response) {
    if (config.method === 'get' && !config.disableCache && config.cacheable) {
        const cacheKey = generateRequestKey(config)
        requestCache.set(cacheKey, {
            data: response,
            timestamp: Date.now()
        })

        // 自动清理过期缓存
        setTimeout(() => {
            if (requestCache.has(cacheKey)) {
                const cached = requestCache.get(cacheKey)
                if (Date.now() - cached.timestamp >= CACHE_EXPIRE_TIME) {
                    requestCache.delete(cacheKey)
                }
            }
        }, CACHE_EXPIRE_TIME)
    }
}

// request interceptor
service.interceptors.request.use(config => {
    console.log('[REQUEST INTERCEPTOR] Config received:', {
        url: config.url,
        method: config.method,
        baseURL: config.baseURL
    })

    // 【关键】优先从store获取token，如果没有再从localStorage获取
    let token = store.getters.token || getStoredAccessToken()

    // 调试日志
    console.log('[REQUEST INTERCEPTOR] Token状态:', {
        fromStore: !!store.getters.token,
        fromLS: !!getStoredAccessToken(),
        hasToken: !!token
    })

    config.headers = config.headers || {}
    if (token && !shouldSkipAuthInjection(config)) {
        config.headers['X-Access-Token'] = token
    }

    // API权限检查
    const isTrustedRequestTarget = shouldAttachTokenToRequest(config)
    const attachToken = token && isTrustedRequestTarget && !shouldSkipAuthInjection(config)
    const expectedAuthorization = token ? `Bearer ${token}` : ''

    config.withCredentials = isTrustedRequestTarget

    if (!attachToken) {
        if (config.headers && config.headers['X-Access-Token']) {
            delete config.headers['X-Access-Token']
        }
        if (config.headers && expectedAuthorization && config.headers.Authorization === expectedAuthorization) {
            delete config.headers.Authorization
        }
        if (token) {
            console.warn('[REQUEST INTERCEPTOR] Skip token for untrusted request target:', {
                url: config.url,
                baseURL: config.baseURL
            })
        }
    }

    if (!checkAPIPermission(config)) {
        console.error('[REQUEST INTERCEPTOR] Permission denied!')
        message.error('您没有权限执行此操作')
        return Promise.reject(new Error('Permission denied'))
    }

    console.log('[REQUEST INTERCEPTOR] Permission check passed')

    // 添加数据范围过滤
    config = addDataScopeFilter(config)

    // 检查缓存 (GET请求)
    const cachedResponse = getCachedResponse(config)
    if (cachedResponse) {
        return Promise.resolve(cachedResponse)
    }

    // 取消重复请求 (暂时禁用，避免误杀正常请求)
    // removePendingRequest(config)
    // config.cancelToken = new CancelToken(cancel => {
    //   const requestKey = generateRequestKey(config)
    //   pendingRequests.set(requestKey, cancel)
    // })

    // 添加请求重试配置
    config.retry = config.retry || 2 // 默认重试2次
    config.retryDelay = config.retryDelay || 1000 // 重试延迟1秒

    if (config.method === 'get') {
        if (config.url.indexOf('sys/dict/getDictItems') < 0) {
            config.params = {
                _t: Date.parse(new Date()) / 1000,
                ...config.params
            }
        }
    }

    console.log('[REQUEST INTERCEPTOR] Final config:', {
        url: config.url,
        method: config.method,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`
    })

    return config
}, (error) => {
    console.error('[REQUEST INTERCEPTOR ERROR]:', error)
    return Promise.reject(error)
})

// response interceptor
service.interceptors.response.use(
    (response) => {
    // 移除已完成的请求
        removePendingRequest(response.config)

        // 设置缓存
        setCachedResponse(response.config, response.data)

        return response.data
    },
    (error) => {
    // 移除失败的请求
        if (error.config) {
            removePendingRequest(error.config)
        }

        // 请求重试逻辑
        const config = error.config
        if (!config || !config.retry || error.message.includes('cancel')) {
            return err(error)
        }

        config.__retryCount = config.__retryCount || 0

        if (config.__retryCount >= config.retry) {
            console.warn(`⚠️ 请求重试${config.retry}次后仍失败:`, config.url)
            return err(error)
        }

        config.__retryCount++

        // 创建新的Promise进行重试
        const backoff = new Promise((resolve) => {
            setTimeout(() => {
                resolve()
            }, config.retryDelay || 1000)
        })

        return backoff.then(() => {
            return service(config)
        })
    }
)

const installer = {
    vm: {},
    install (Vue, router = {}) {
        Vue.use(VueAxios, router, service)
    }
}

export {
    installer as VueAxios,
    service as axios
}

// 默认导出service，兼容import request from '@/utils/request'
export default service
