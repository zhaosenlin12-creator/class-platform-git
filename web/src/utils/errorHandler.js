import { Modal } from 'ant-design-vue'
import messageCenter from './messageCenter'
import store from '@/store'

/**
 * 错误消息映射 - 将技术性错误转换为用户友好的提示
 */
const ERROR_MESSAGE_MAP = {
    // 用户相关
    '该账号已存在': '该账号已被使用，请更换一个账号名称',
    '用户名已存在': '该账号已被使用，请更换一个账号名称',
    '该账号已被使用': '该账号已被使用，请更换一个账号名称',
    '学号已存在': '该学号已存在，请检查学号是否正确或使用其他学号',
    '手机号已被注册': '该手机号已被注册，请使用其他手机号',
    '邮箱已被注册': '该邮箱已被注册，请使用其他邮箱',

    // 文件上传相关
    'File too large': '文件大小超过限制，请压缩文件后重新上传',
    'LIMIT_FILE_SIZE': '文件大小超过限制（最大100MB），请压缩文件后重新上传',

    // 数据库相关
    'SequelizeUniqueConstraintError': '数据已存在，请检查是否有重复的信息',
    'Duplicate entry': '数据已存在，请检查是否有重复的信息',

    // 网络相关
    'Network Error': '网络连接失败，请检查网络后重试',
    'timeout': '请求超时，请稍后重试',
    'ECONNABORTED': '请求超时，请稍后重试',
    'ECONNREFUSED': '服务器连接失败，请稍后重试',

    // 通用技术错误
    'Internal Server Error': '服务器繁忙，请稍后重试',
    'Internal Error': '操作失败，请稍后重试',
    'undefined': '操作失败，请稍后重试',
    'null': '操作失败，请稍后重试',
    'Error': '操作失败，请稍后重试'
}

/**
 * 技术性错误关键词 - 如果错误消息包含这些词，则替换为友好提示
 */
const TECHNICAL_KEYWORDS = [
    'Error:', 'Exception', 'Stack', 'at ', 'undefined', 'null',
    'Cannot read', 'is not defined', 'is not a function',
    'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'socket hang up',
    'Sequelize', 'MySQL', 'SQL', 'syntax error'
]

/**
 * 获取用户友好的错误消息
 */
function getFriendlyErrorMessage (originalMessage) {
    if (!originalMessage) return null

    // 直接匹配
    if (ERROR_MESSAGE_MAP[originalMessage]) {
        return ERROR_MESSAGE_MAP[originalMessage]
    }

    // 部分匹配
    for (const [key, value] of Object.entries(ERROR_MESSAGE_MAP)) {
        if (originalMessage.includes(key)) {
            return value
        }
    }

    return null
}

/**
 * 检查是否是技术性错误消息
 */
function isTechnicalError (message) {
    if (!message) return false
    return TECHNICAL_KEYWORDS.some(keyword => message.includes(keyword))
}

/**
 * 从错误对象中提取用户友好的错误消息
 * @param {Error|Object} error - 错误对象
 * @param {string} defaultMessage - 默认消息
 * @returns {string} 用户友好的错误消息
 */
export function extractErrorMessage (error, defaultMessage = '操作失败，请稍后重试') {
    if (!error) return defaultMessage

    // 1. 尝试从响应中获取服务器返回的消息（后端已经是友好的）
    const serverMessage = error.response && error.response.data && error.response.data.message
    if (serverMessage && !isTechnicalError(serverMessage)) {
        return serverMessage
    }

    // 2. 尝试映射已知错误
    const friendlyMessage = getFriendlyErrorMessage(serverMessage || error.message)
    if (friendlyMessage) {
        return friendlyMessage
    }

    // 3. 如果服务器消息是技术性的，返回默认消息
    if (serverMessage && isTechnicalError(serverMessage)) {
        return defaultMessage
    }

    // 4. 如果error.message是技术性的，返回默认消息
    if (error.message && isTechnicalError(error.message)) {
        return defaultMessage
    }

    // 5. 如果error.message看起来是友好的中文消息，直接返回
    if (error.message && /^[\u4e00-\u9fa5]/.test(error.message)) {
        return error.message
    }

    return defaultMessage
}

export class ErrorHandler {
    static handleApiError (error, context = null) {
    // 增强的错误日志记录
        const errorDetails = {
            url: error.config && error.config.url,
            method: error.config && error.config.method,
            status: error.response && error.response.status,
            message: error.message,
            data: error.response && error.response.data,
            context,
            timestamp: new Date().toISOString()
        }

        console.error('API Error Details:', errorDetails)

        // 记录错误到全局状态
        this.recordErrorToStore(errorDetails)

        // 网络连接错误检测
        if (!navigator.onLine) {
            this.showError('网络连接中断', '请检查网络连接后重试')
            return
        }

        if (error.response) {
            const { status, data } = error.response
            const serverMessage = data && data.message

            // 尝试获取友好的错误消息
            const friendlyMessage = getFriendlyErrorMessage(serverMessage)

            switch (status) {
            case 400:
                // 优先使用服务器返回的消息（已经是友好的），否则使用映射
                this.showError('操作失败', friendlyMessage || serverMessage || '请检查输入数据')
                break
            case 401:
                this.handleUnauthorized(serverMessage)
                break
            case 403:
                this.showError('访问被拒绝', '您没有权限执行此操作')
                break
            case 404:
                this.showError('资源未找到', serverMessage || '请求的资源不存在')
                break
            case 408:
                this.showError('请求超时', '请求响应时间过长，请重试')
                break
            case 409:
                this.showError('数据冲突', friendlyMessage || serverMessage || '请刷新页面后重试')
                break
            case 413:
                this.showError('文件过大', friendlyMessage || serverMessage || '文件大小超过限制，请压缩后重新上传')
                break
            case 422:
                this.showValidationError(data.errors || serverMessage)
                break
            case 429:
                this.showError('请求过于频繁', '请稍后再试')
                break
            case 500:
                // 500错误也尝试显示友好消息
                this.showError('操作失败', friendlyMessage || serverMessage || '系统繁忙，请稍后重试')
                break
            case 502:
                this.showError('网关错误', '服务器网关错误，请稍后重试')
                break
            case 503:
                this.showError('服务不可用', serverMessage || '服务暂时不可用，请稍后重试')
                break
            case 504:
                this.showError('网关超时', '服务器响应超时，请稍后重试')
                break
            default:
                this.showError('网络错误', friendlyMessage || serverMessage || `请求失败 (${status})`)
            }
        } else if (error.request) {
            if (error.code === 'ECONNABORTED') {
                this.showError('请求超时', '网络请求超时，请检查网络连接')
            } else {
                this.showError('网络连接失败', '请检查网络连接后重试')
            }
        } else {
            const friendlyMessage = getFriendlyErrorMessage(error.message)
            this.showError('操作失败', friendlyMessage || error.message || '未知错误')
        }
    }

    // 记录错误到store
    static recordErrorToStore (errorDetails) {
        try {
            if (store && store.commit) {
                store.commit('ADD_NOTIFICATION', {
                    type: 'error',
                    title: '系统错误',
                    description: errorDetails.message,
                    timestamp: Date.now(),
                    context: errorDetails.context,
                    details: errorDetails
                })
            }
        } catch (storeError) {
            console.warn('无法记录错误到store:', storeError)
        }
    }

    static handleUnauthorized (message) {
        Modal.error({
            title: '登录已过期',
            content: message || '您的登录状态已过期，请重新登录',
            okText: '重新登录',
            onOk: () => {
                window.location.href = '/portal/home'
            }
        })
    }

    static showValidationError (errors) {
        if (typeof errors === 'object') {
            const errorMessages = Object.values(errors).flat()
            this.showError('数据验证失败', errorMessages.join('; '))
        } else {
            this.showError('数据验证失败', errors)
        }
    }

    static showError (title, description = '') {
        messageCenter.error(title, description)
    }

    static showSuccess (title, description = '') {
        messageCenter.success(title, description)
    }

    static showWarning (title, description = '') {
        messageCenter.warning(title, description)
    }

    static showInfo (title, description = '') {
        messageCenter.info(title, description)
    }

    static showLoading (content = '加载中...') {
        return messageCenter.loading(content)
    }

    static showMessage (type, content) {
        messageCenter.showSimpleMessage(type, content)
    }

    // 重试机制
    static async retryRequest (requestFn, maxRetries = 3, delay = 1000) {
        let lastError = null

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await requestFn()
                if (attempt > 1) {
                    this.showSuccess('重试成功', `第${attempt}次尝试成功`)
                }
                return result
            } catch (error) {
                lastError = error
                console.warn(`请求失败，第${attempt}次尝试:`, error.message)

                if (attempt < maxRetries) {
                    this.showWarning('请求重试中', `第${attempt}次尝试失败，正在重试...`)
                    await new Promise(resolve => setTimeout(resolve, delay * attempt))
                }
            }
        }

        this.showError('请求失败', `尝试${maxRetries}次后仍然失败`)
        throw lastError
    }

    // 网络状态监控
    static initNetworkMonitoring () {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                this.showSuccess('网络已连接', '网络连接已恢复')
            })

            window.addEventListener('offline', () => {
                this.showWarning('网络连接中断', '请检查网络连接')
            })
        }
    }

    // 清理所有错误消息
    static clearAllErrors () {
        messageCenter.clearAll()
    }
}

export const handleApiError = ErrorHandler.handleApiError.bind(ErrorHandler)
export const showError = ErrorHandler.showError.bind(ErrorHandler)
export const showSuccess = ErrorHandler.showSuccess.bind(ErrorHandler)
export const showWarning = ErrorHandler.showWarning.bind(ErrorHandler)
export const showInfo = ErrorHandler.showInfo.bind(ErrorHandler)
export const showLoading = ErrorHandler.showLoading.bind(ErrorHandler)
export const showMessage = ErrorHandler.showMessage.bind(ErrorHandler)

export default ErrorHandler
