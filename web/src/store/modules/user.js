import Vue from 'vue'
import { login, logout, phoneLogin, thirdLogin } from '@/api/login'
import { ACCESS_TOKEN, USER_NAME, USER_INFO, USER_ROLE, USER_AUTH, SYS_BUTTON_AUTH, UI_CACHE_DB_DICT_DATA, SYS_CONFIG, MENU } from '@/store/mutation-types'
import { welcome } from '@/utils/util'
import { queryPermissionsByUser } from '@/api/api'
import { getAction, getMenu, postAction } from '@/api/manage'
import { resolveTeachingAccess } from '@/utils/teachingAccess'

const runtimeConsole = typeof window !== 'undefined' && window.console
    ? window.console
    : global.console

const console = typeof window !== 'undefined' && window.__APP_DEBUG__ === true
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

// 从localStorage安全获取数据的辅助函数（因为Vue.ls在store初始化时可能还未就绪）
// 注意：vue-ls使用 'pro__' 前缀存储数据
const STORAGE_PREFIX = 'pro__'

const isSuccessfulResponse = (response) => {
    if (!response || typeof response !== 'object') {
        return false
    }

    if (response.success === true) {
        return true
    }

    return Number(response.code) === 200
}

const safeGetFromStorage = (key) => {
    try {
    // vue-ls存储格式：{ value: xxx, expire: xxx }
        const fullKey = STORAGE_PREFIX + key
        const item = localStorage.getItem(fullKey)
        if (item) {
            const parsed = JSON.parse(item)
            // vue-ls存储的数据格式是 { value: xxx, expire: xxx }
            if (parsed && typeof parsed === 'object' && 'value' in parsed) {
                // 检查是否过期
                if (parsed.expire && parsed.expire < Date.now()) {
                    console.log('[STORE] 数据已过期:', key)
                    return null
                }
                return parsed.value
            }
            // 如果不是vue-ls格式，直接返回
            return parsed
        }
    } catch (e) {
        console.warn('[STORE] 从localStorage读取失败:', key, e)
    }
    return null
}

const clearPersistedAuthState = () => {
    const keys = [ACCESS_TOKEN, USER_NAME, USER_INFO, USER_ROLE, UI_CACHE_DB_DICT_DATA, MENU]
    keys.forEach((key) => {
        Vue.ls.remove(key)
        try {
            localStorage.removeItem(key)
            localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
            sessionStorage.removeItem(key)
            sessionStorage.removeItem(`${STORAGE_PREFIX}${key}`)
        } catch (_error) {}
    })

    try {
        sessionStorage.removeItem(USER_AUTH)
        sessionStorage.removeItem(SYS_BUTTON_AUTH)
        sessionStorage.removeItem('__last_path__')
        sessionStorage.removeItem('__app_loaded__')
    } catch (_error) {}
}

const resolveAuthenticatedUserType = ({ token = '', userInfo = {}, userRole = [] } = {}) => {
    const access = resolveTeachingAccess({
        userRole,
        userType: userInfo && (userInfo.userType || userInfo.type) ? (userInfo.userType || userInfo.type) : '',
        userInfo: userInfo || {}
    })

    if (access.isStudent) {
        return 'student'
    }

    if (access.isAdmin) {
        return 'admin'
    }

    if (token || access.hasRole) {
        return 'teacher'
    }

    return ''
}

// 初始用户状态 - 【关键】从localStorage恢复token和用户信息
const getDefaultState = () => {
    // 从localStorage恢复数据（直接使用localStorage，避免Vue.ls未初始化的问题）
    const savedToken = safeGetFromStorage(ACCESS_TOKEN) || ''
    const savedUserInfo = safeGetFromStorage(USER_INFO) || null
    const savedUserRole = safeGetFromStorage(USER_ROLE) || []
    const savedSysConfig = safeGetFromStorage(SYS_CONFIG) || {}
    const savedMenu = safeGetFromStorage(MENU) || []

    // 判断用户类型
    const userType = resolveAuthenticatedUserType({
        token: savedToken,
        userInfo: savedUserInfo,
        userRole: savedUserRole
    })

    console.log('🔄 [STORE INIT] Token存在:', !!savedToken)

    return {
    // 基本信息 - 从localStorage恢复
        token: savedToken,
        username: (savedUserInfo && savedUserInfo.username) || '',
        realname: (savedUserInfo && (savedUserInfo.realname || savedUserInfo.realName)) || '',
        welcome: savedToken ? '欢迎回来' : '',
        avatar: (savedUserInfo && savedUserInfo.avatar) || '',
        info: savedUserInfo,
        userType: userType,

        // 权限相关
        permissionList: [],
        menuList: savedMenu,
        userRole: savedUserRole,

        // 系统配置
        sysConfig: savedSysConfig,

        // 登录状态
        loginStatus: savedToken ? 'logged_in' : 'logged_out',
        loginTime: null,
        lastActiveTime: null,

        // 用户偏好设置
        preferences: {
            language: 'zh-CN',
            theme: 'default',
            notifications: true
        }
    }
}

const user = {
    state: getDefaultState(),

    // 重置状态的方法
    resetState (state) {
        Object.assign(state, getDefaultState())
    },

    mutations: {
    // 重置状态
        RESET_STATE: (state) => {
            user.resetState(state)
        },

        // 基本信息的mutations
        SET_TOKEN: (state, token) => {
            state.token = token
        },
        SET_NAME: (state, { username, realname, welcome }) => {
            state.username = username
            state.realname = realname
            state.welcome = welcome
        },
        SET_AVATAR: (state, avatar) => {
            state.avatar = avatar
        },
        SET_INFO: (state, info) => {
            state.info = info || null
            // 同步更新相关字段
            if (!info) {
                state.avatar = ''
                state.username = ''
                state.realname = ''
                return
            }
            if (info.avatar) state.avatar = info.avatar
            if (info.username) state.username = info.username
            if (info.realname || info.realName) state.realname = info.realname || info.realName
        },
        SET_USER_TYPE: (state, userType) => {
            state.userType = userType
        },

        // 权限相关的mutations
        SET_PERMISSIONLIST: (state, permissionList) => {
            state.permissionList = permissionList
        },
        SET_MENU: (state, menuList) => {
            state.menuList = menuList
        },
        SET_USER_ROLE: (state, userRole) => {
            state.userRole = Array.isArray(userRole) ? userRole : []
        },

        // 系统配置
        SET_SYS_CONFIG: (state, configInfo) => {
            state.sysConfig = configInfo
        },

        // 登录状态管理
        SET_LOGIN_STATUS: (state, status) => {
            state.loginStatus = status
            if (status === 'logged_in') {
                state.loginTime = new Date()
                state.lastActiveTime = new Date()
            } else if (status === 'logged_out') {
                state.loginTime = null
                state.lastActiveTime = null
            }
        },
        UPDATE_LAST_ACTIVE_TIME: (state) => {
            state.lastActiveTime = new Date()
        },

        // 用户偏好设置
        SET_USER_PREFERENCES: (state, preferences) => {
            state.preferences = { ...state.preferences, ...preferences }
        },
        SET_LANGUAGE: (state, language) => {
            state.preferences.language = language
        },
        SET_THEME: (state, theme) => {
            state.preferences.theme = theme
        },
        SET_NOTIFICATIONS: (state, enabled) => {
            state.preferences.notifications = enabled
        }
    },

    actions: {
    // 重置用户状态
        resetUserState ({ commit }) {
            return new Promise(resolve => {
                clearPersistedAuthState()
                commit('RESET_STATE')
                // 清除本地存储
                resolve()
            })
        },

        // 更新用户活跃时间
        updateLastActiveTime ({ commit }) {
            commit('UPDATE_LAST_ACTIVE_TIME')
        },

        // 设置用户偏好
        setUserPreferences ({ commit }, preferences) {
            commit('SET_USER_PREFERENCES', preferences)
            // 可以在这里添加接口调用保存到后端
        },

        // 设置语言
        setLanguage ({ commit }, language) {
            commit('SET_LANGUAGE', language)
        },

        // CAS验证登录
        ValidateLogin ({ commit }, userInfo) {
            return new Promise((resolve, reject) => {
                commit('SET_LOGIN_STATUS', 'logging_in')
                getAction('/cas/client/validateLogin', userInfo).then(response => {
                    if (response.success) {
                        const result = response.result
                        const userInfo = result.userInfo
                        const expire = 7 * 24 * 60 * 60 * 1000

                        Vue.ls.set(ACCESS_TOKEN, result.token, expire)
                        Vue.ls.set(USER_NAME, userInfo.username, expire)
                        Vue.ls.set(USER_INFO, userInfo, expire)

                        commit('SET_TOKEN', result.token)
                        commit('SET_INFO', userInfo)
                        commit('SET_NAME', { username: userInfo.username, realname: userInfo.realname, welcome: welcome() })
                        commit('SET_AVATAR', userInfo.avatar)
                        commit('SET_LOGIN_STATUS', 'logged_in')
                        resolve(response)
                    } else {
                        commit('SET_LOGIN_STATUS', 'login_failed')
                        resolve(response)
                    }
                }).catch(error => {
                    commit('SET_LOGIN_STATUS', 'login_failed')
                    reject(error)
                })
            })
        },
        // 教师登录
        Login ({ commit }, userInfo) {
            return new Promise((resolve, reject) => {
                if (typeof window !== 'undefined') {
                    window.__LOGGING_OUT__ = false
                }
                clearPersistedAuthState()
                commit('RESET_STATE')
                commit('SET_LOGIN_STATUS', 'logging_in')
                login(userInfo).then(async response => {
                    if (isSuccessfulResponse(response) && response.result) {
                        const result = response.result
                        const userInfo = result.userInfo
                        const userRole = Array.isArray(result.role) ? result.role : []
                        const expire = 7 * 24 * 60 * 60 * 1000
                        const resolvedUserType = resolveAuthenticatedUserType({
                            token: result.token,
                            userInfo,
                            userRole
                        })

                        // 保存到本地存储
                        Vue.ls.set(ACCESS_TOKEN, result.token, expire)
                        Vue.ls.set(USER_NAME, userInfo.username, expire)
                        Vue.ls.set(USER_INFO, userInfo, expire)
                        Vue.ls.set(USER_ROLE, userRole, expire)
                        Vue.ls.set(UI_CACHE_DB_DICT_DATA, result.sysAllDictItems, expire)

                        // 更新状态
                        commit('SET_TOKEN', result.token)
                        commit('SET_INFO', userInfo)
                        commit('SET_USER_ROLE', userRole)
                        commit('SET_USER_TYPE', resolvedUserType)
                        commit('SET_NAME', { username: userInfo.username, realname: userInfo.realname, welcome: welcome() })
                        commit('SET_AVATAR', userInfo.avatar)
                        commit('SET_LOGIN_STATUS', 'logged_in')

                        // 同步获取菜单数据
                        try {
                            console.log('[LOGIN] 开始获取菜单数据...')
                            const menuRes = await getMenu()
                            if (menuRes && menuRes.result) {
                                console.log('[LOGIN] 成功获取菜单数据:', menuRes.result)
                                const menuData = Array.isArray(menuRes.result.menu) ? menuRes.result.menu : []
                                Vue.ls.set(MENU, menuData, expire)
                                commit('SET_MENU', menuData)
                                sessionStorage.setItem(USER_AUTH, JSON.stringify(menuRes.result.auth || []))
                                sessionStorage.setItem(SYS_BUTTON_AUTH, JSON.stringify(menuRes.result.allAuth || []))
                            } else {
                                console.warn('[LOGIN] 菜单响应格式错误:', menuRes)
                            }
                        } catch (err) {
                            console.error('[LOGIN] 获取菜单失败:', err)
                        }

                        resolve(response)
                    } else {
                        commit('SET_LOGIN_STATUS', 'login_failed')
                        reject(response)
                    }
                }).catch(error => {
                    commit('SET_LOGIN_STATUS', 'login_failed')
                    reject(error)
                })
            })
        },
        // 学生登录
        StudentLogin ({ commit }, userInfo) {
            return new Promise((resolve, reject) => {
                if (typeof window !== 'undefined') {
                    window.__LOGGING_OUT__ = false
                }
                clearPersistedAuthState()
                commit('RESET_STATE')
                commit('SET_LOGIN_STATUS', 'logging_in')
                // 学生登录使用统一的 /sys/login 接口
                postAction('/sys/login', userInfo).then(response => {
                    if (isSuccessfulResponse(response) && response.result) {
                        const result = response.result
                        const userInfo = result.userInfo
                        const userRole = result.role || ['student']
                        const expire = 7 * 24 * 60 * 60 * 1000

                        // 保存到本地存储
                        Vue.ls.set(ACCESS_TOKEN, result.token, expire)
                        Vue.ls.set(USER_NAME, userInfo.username, expire)
                        Vue.ls.set(USER_INFO, userInfo, expire)
                        Vue.ls.set(USER_ROLE, userRole, expire)

                        // 更新状态
                        commit('SET_TOKEN', result.token)
                        commit('SET_INFO', userInfo)
                        commit('SET_USER_ROLE', userRole)
                        commit('SET_USER_TYPE', 'student')
                        commit('SET_NAME', { username: userInfo.username, realname: userInfo.realName || userInfo.realname, welcome: welcome() })
                        commit('SET_AVATAR', userInfo.avatar)
                        commit('SET_LOGIN_STATUS', 'logged_in')
                        resolve(response)
                    } else {
                        commit('SET_LOGIN_STATUS', 'login_failed')
                        reject(response)
                    }
                }).catch(error => {
                    commit('SET_LOGIN_STATUS', 'login_failed')
                    reject(error)
                })
            })
        },
        // 学生注册
        StudentRegister ({ _commit }, studentInfo) {
            return new Promise((resolve, reject) => {
                getAction('/student/register', studentInfo).then(response => {
                    if (isSuccessfulResponse(response)) {
                        resolve(response)
                    } else {
                        reject(response)
                    }
                }).catch(error => {
                    reject(error)
                })
            })
        },
        // 手机号登录
        PhoneLogin ({ commit }, userInfo) {
            return new Promise((resolve, reject) => {
                if (typeof window !== 'undefined') {
                    window.__LOGGING_OUT__ = false
                }
                clearPersistedAuthState()
                commit('RESET_STATE')
                commit('SET_LOGIN_STATUS', 'logging_in')
                phoneLogin(userInfo).then(response => {
                    if (isSuccessfulResponse(response) && response.result) {
                        const result = response.result
                        const userInfo = result.userInfo
                        const userRole = Array.isArray(result.role) ? result.role : []
                        const resolvedUserType = resolveAuthenticatedUserType({
                            token: result.token,
                            userInfo,
                            userRole
                        })
                        Vue.ls.set(ACCESS_TOKEN, result.token, 7 * 24 * 60 * 60 * 1000)
                        Vue.ls.set(USER_NAME, userInfo.username, 7 * 24 * 60 * 60 * 1000)
                        Vue.ls.set(USER_INFO, userInfo, 7 * 24 * 60 * 60 * 1000)
                        Vue.ls.set(USER_ROLE, userRole, 7 * 24 * 60 * 60 * 1000)
                        Vue.ls.set(UI_CACHE_DB_DICT_DATA, result.sysAllDictItems, 7 * 24 * 60 * 60 * 1000)
                        commit('SET_TOKEN', result.token)
                        commit('SET_INFO', userInfo)
                        commit('SET_USER_ROLE', userRole)
                        commit('SET_USER_TYPE', resolvedUserType)
                        commit('SET_NAME', { username: userInfo.username, realname: userInfo.realname, welcome: welcome() })
                        commit('SET_AVATAR', userInfo.avatar)
                        commit('SET_LOGIN_STATUS', 'logged_in')
                        resolve(response)
                    } else {
                        commit('SET_LOGIN_STATUS', 'login_failed')
                        reject(response)
                    }
                }).catch(error => {
                    commit('SET_LOGIN_STATUS', 'login_failed')
                    reject(error)
                })
            })
        },
        // 获取用户信息
        GetPermissionList ({ commit, state }) {
            return new Promise((resolve, reject) => {
                const accessToken = state.token || safeGetFromStorage(ACCESS_TOKEN)
                const userRole = Array.isArray(state.userRole) && state.userRole.length > 0
                    ? state.userRole
                    : (safeGetFromStorage(USER_ROLE) || [])

                if (!accessToken) {
                    reject(new Error('missing access token'))
                    return
                }

                // 所有用户都使用统一的权限API获取菜单
                const params = { token: accessToken }
                queryPermissionsByUser(params).then(response => {
                    // 根据用户角色设置用户类型
                    const persistedUserInfo = state.info || safeGetFromStorage(USER_INFO) || {}
                    const resolvedUserType = resolveAuthenticatedUserType({
                        token: accessToken,
                        userInfo: persistedUserInfo,
                        userRole
                    })
                    if (resolvedUserType) {
                        commit('SET_USER_TYPE', resolvedUserType)
                    }

                    // 继续处理菜单数据
                    const menuData = Array.isArray(response.result && response.result.menu) ? response.result.menu : []
                    const authData = Array.isArray(response.result && response.result.auth) ? response.result.auth : []
                    const allAuthData = Array.isArray(response.result && response.result.allAuth) ? response.result.allAuth : []
                    // Vue.ls.set(USER_AUTH,authData);
                    sessionStorage.setItem(USER_AUTH, JSON.stringify(authData))
                    sessionStorage.setItem(SYS_BUTTON_AUTH, JSON.stringify(allAuthData))
                    if (menuData && menuData.length > 0) {
                        // update--begin--autor:qinfeng-----date:20200109------for：JEECG-63 一级菜单的子菜单全部是隐藏路由，则一级菜单不显示------
                        menuData.forEach((item) => {
                            if (item['children']) {
                                let hasChildrenMenu = item['children'].filter((i) => {
                                    return !i.hidden || i.hidden === false
                                })
                                if (hasChildrenMenu == null || hasChildrenMenu.length === 0) {
                                    item['hidden'] = true
                                }
                            }
                        })
                        // update--end--autor:qinfeng-----date:20200109------for：JEECG-63 一级菜单的子菜单全部是隐藏路由，则一级菜单不显示------
                        // 修复：只有非学生用户才设置为teacher，避免覆盖学生类型
                        Vue.ls.set(MENU, menuData, 7 * 24 * 60 * 60 * 1000)
                        commit('SET_MENU', menuData)
                        commit('SET_PERMISSIONLIST', menuData)
                    } else {
                        reject(new Error('getPermissionList: permissions must be a non-null array'))
                    }
                    resolve(response)
                }).catch(error => {
                    reject(error)
                })
            })
        },

        // 登出
        Logout ({ commit, dispatch, state }) {
            return new Promise((resolve) => {
                if (typeof window !== 'undefined') {
                    window.__LOGGING_OUT__ = true
                }
                const logoutToken = state.token
                const finalizeLogout = () => {
                    commit('SET_LOGIN_STATUS', 'logged_out')
                    dispatch('resetUserState').then(() => {
                        if (typeof window !== 'undefined') {
                            window.setTimeout(() => {
                                window.__LOGGING_OUT__ = false
                            }, 300)
                        }
                        resolve()
                    })
                }

                if (!logoutToken) {
                    finalizeLogout()
                    return
                }

                // 先带 token 调用后端登出接口，再清理本地状态，避免拦截器把 token 提前移除导致 401
                logout(logoutToken).then(() => {
                    finalizeLogout()
                }).catch(() => {
                    // 即使后端接口失败，也要清除本地状态
                    finalizeLogout()
                })
            })
        },
        // 第三方登录
        ThirdLogin ({ commit }, token) {
            return new Promise((resolve, reject) => {
                if (typeof window !== 'undefined') {
                    window.__LOGGING_OUT__ = false
                }
                clearPersistedAuthState()
                commit('RESET_STATE')
                commit('SET_LOGIN_STATUS', 'logging_in')
                thirdLogin(token).then(response => {
                    if (isSuccessfulResponse(response) && response.result) {
                        const result = response.result
                        const userInfo = result.userInfo
                        const userRole = Array.isArray(result.role) ? result.role : []
                        const resolvedUserType = resolveAuthenticatedUserType({
                            token: result.token,
                            userInfo,
                            userRole
                        })
                        Vue.ls.set(ACCESS_TOKEN, result.token, 7 * 24 * 60 * 60 * 1000)
                        Vue.ls.set(USER_NAME, userInfo.username, 7 * 24 * 60 * 60 * 1000)
                        Vue.ls.set(USER_INFO, userInfo, 7 * 24 * 60 * 60 * 1000)
                        Vue.ls.set(USER_ROLE, userRole, 7 * 24 * 60 * 60 * 1000)
                        commit('SET_TOKEN', result.token)
                        commit('SET_INFO', userInfo)
                        commit('SET_USER_ROLE', userRole)
                        commit('SET_USER_TYPE', resolvedUserType)
                        commit('SET_NAME', { username: userInfo.username, realname: userInfo.realname, welcome: welcome() })
                        commit('SET_AVATAR', userInfo.avatar)
                        commit('SET_LOGIN_STATUS', 'logged_in')
                        resolve(response)
                    } else {
                        commit('SET_LOGIN_STATUS', 'login_failed')
                        reject(response)
                    }
                }).catch(error => {
                    commit('SET_LOGIN_STATUS', 'login_failed')
                    reject(error)
                })
            })
        }
    }

    // getters已移动到主getters.js文件以避免重复
}

export default user
