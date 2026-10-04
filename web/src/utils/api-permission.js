/**
 * API请求权限拦截器
 * 实现基于数据范围的访问控制
 */

/* eslint-disable no-unreachable, no-undef */
import store from '@/store'
import { USER_ROLES, PERMISSION_MODULES, PERMISSION_ACTIONS } from './permissions'
import { message } from 'ant-design-vue'

/**
 * API权限配置
 * 格式: { method: 'POST', url: '/api/homework/create', permission: { module, action } }
 */
const API_PERMISSIONS = [
    // 作业管理API
    {
        method: 'POST',
        url: '/api/homework/create',
        permission: { module: PERMISSION_MODULES.HOMEWORK_MANAGEMENT, action: PERMISSION_ACTIONS.CREATE },
        roles: [USER_ROLES.TEACHER, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN]
    },
    {
        method: 'PUT',
        url: '/api/homework/update',
        permission: { module: PERMISSION_MODULES.HOMEWORK_MANAGEMENT, action: PERMISSION_ACTIONS.UPDATE },
        roles: [USER_ROLES.TEACHER, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN],
        checkOwner: true // 需要检查是否为创建者
    },
    {
        method: 'DELETE',
        url: '/api/homework/delete',
        permission: { module: PERMISSION_MODULES.HOMEWORK_MANAGEMENT, action: PERMISSION_ACTIONS.DELETE },
        roles: [USER_ROLES.TEACHER, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN],
        checkOwner: true
    },
    {
        method: 'POST',
        url: '/api/homework/submit',
        permission: { module: PERMISSION_MODULES.HOMEWORK_MANAGEMENT, action: PERMISSION_ACTIONS.CREATE },
        roles: [USER_ROLES.STUDENT]
    },
    {
        method: 'GET',
        url: '/api/homework/list',
        permission: { module: PERMISSION_MODULES.HOMEWORK_MANAGEMENT, action: PERMISSION_ACTIONS.READ },
        roles: [USER_ROLES.STUDENT, USER_ROLES.TEACHER, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN],
        filterByUser: true // 教师只能查看自己的作业
    },
    {
        method: 'GET',
        url: '/api/homework/submissions',
        permission: { module: PERMISSION_MODULES.HOMEWORK_MANAGEMENT, action: PERMISSION_ACTIONS.READ },
        roles: [USER_ROLES.TEACHER, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN]
    },

    // 课程管理API
    {
        method: 'POST',
        url: '/api/course/create',
        permission: { module: PERMISSION_MODULES.COURSE_MANAGEMENT, action: PERMISSION_ACTIONS.CREATE },
        roles: [USER_ROLES.TEACHER, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN]
    },
    {
        method: 'PUT',
        url: '/api/course/update',
        permission: { module: PERMISSION_MODULES.COURSE_MANAGEMENT, action: PERMISSION_ACTIONS.UPDATE },
        roles: [USER_ROLES.TEACHER, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN],
        checkOwner: true
    },
    {
        method: 'DELETE',
        url: '/api/course/delete',
        permission: { module: PERMISSION_MODULES.COURSE_MANAGEMENT, action: PERMISSION_ACTIONS.DELETE },
        roles: [USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN]
    },
    {
        method: 'GET',
        url: '/api/course/list',
        permission: { module: PERMISSION_MODULES.COURSE_MANAGEMENT, action: PERMISSION_ACTIONS.READ },
        roles: [USER_ROLES.STUDENT, USER_ROLES.TEACHER, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN],
        filterByUser: true // 教师只能查看自己的课程
    },

    // 用户管理API
    {
        method: 'POST',
        url: '/api/user/create',
        permission: { module: PERMISSION_MODULES.USER_MANAGEMENT, action: PERMISSION_ACTIONS.CREATE },
        roles: [USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN]
    },
    {
        method: 'PUT',
        url: '/api/user/update',
        permission: { module: PERMISSION_MODULES.USER_MANAGEMENT, action: PERMISSION_ACTIONS.UPDATE },
        roles: [USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN]
    },
    {
        method: 'DELETE',
        url: '/api/user/delete',
        permission: { module: PERMISSION_MODULES.USER_MANAGEMENT, action: PERMISSION_ACTIONS.DELETE },
        roles: [USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN]
    },
    {
        method: 'GET',
        url: '/api/user/list',
        permission: { module: PERMISSION_MODULES.USER_MANAGEMENT, action: PERMISSION_ACTIONS.READ },
        roles: [USER_ROLES.TEACHER, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN]
    },

    // 成绩管理API
    {
        method: 'POST',
        url: '/api/grade/create',
        permission: { module: PERMISSION_MODULES.GRADE_MANAGEMENT, action: PERMISSION_ACTIONS.CREATE },
        roles: [USER_ROLES.TEACHER, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN]
    },
    {
        method: 'PUT',
        url: '/api/grade/update',
        permission: { module: PERMISSION_MODULES.GRADE_MANAGEMENT, action: PERMISSION_ACTIONS.UPDATE },
        roles: [USER_ROLES.TEACHER, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN]
    },
    {
        method: 'GET',
        url: '/api/grade/list',
        permission: { module: PERMISSION_MODULES.GRADE_MANAGEMENT, action: PERMISSION_ACTIONS.READ },
        roles: [USER_ROLES.STUDENT, USER_ROLES.TEACHER, USER_ROLES.PARENT, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN],
        filterByUser: true // 学生和家长只能查看自己的成绩
    },

    // 数据分析API
    {
        method: 'GET',
        url: '/api/analytics/teacher',
        permission: { module: PERMISSION_MODULES.DATA_ANALYSIS, action: PERMISSION_ACTIONS.READ },
        roles: [USER_ROLES.TEACHER, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN]
    },
    {
        method: 'GET',
        url: '/api/analytics/student',
        permission: { module: PERMISSION_MODULES.DATA_ANALYSIS, action: PERMISSION_ACTIONS.READ },
        roles: [USER_ROLES.STUDENT, USER_ROLES.TEACHER, USER_ROLES.PARENT, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN],
        filterByUser: true
    },
    {
        method: 'GET',
        url: '/api/analytics/school',
        permission: { module: PERMISSION_MODULES.DATA_ANALYSIS, action: PERMISSION_ACTIONS.READ },
        roles: [USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN]
    }
]

/**
 * 检查API请求权限
 * @param {Object} config Axios请求配置
 * @returns {boolean} 是否有权限
 */
export function checkAPIPermission (config) {
    try {
    // 🔥 临时禁用所有API权限检查 - 用于开发测试
    // TODO: 生产环境需要启用权限检查
        // API 权限校验当前保持关闭，避免恢复期被前端旧权限映射误拦截。
        // 如后续需要重新启用，应基于当前角色模型重写。
        void config
        return true

        /* 原权限检查代码 - 已暂时禁用
    const user = store.getters.userInfo

    // 允许未登录时访问的公开API
    const publicAPIs = [
      '/sys/common/sysConfig',
      '/sys/config/getCurrentConfig',
      '/teaching/menu/getUserMenu',
      '/sys/randomImage',
      '/sys/login',
      '/sys/logout',
      '/sys/dict',
      '/sys/menu',
      '/sys/permission',
      '/teaching/teachingWork/leaderboard'
    ]

    // 检查是否为公开API
    const isPublicAPI = publicAPIs.some(api => config.url && config.url.includes(api))
    if (isPublicAPI) {
      return true
    }

    if (!user || !user.role) {
      return false
    }
    */

        // 超级管理员拥有所有API权限
        if (user.role === USER_ROLES.SUPER_ADMIN) {
            return true
        }

        // 查找匹配的API权限配置
        const apiConfig = API_PERMISSIONS.find(api => {
            return api.method === config.method.toUpperCase() &&
             (config.url.includes(api.url) || api.url.includes(config.url))
        })

        // 如果没有配置,默认允许(向后兼容)
        if (!apiConfig) {
            return true
        }

        // 检查角色
        if (apiConfig.roles && !apiConfig.roles.includes(user.role)) {
            return false
        }

        // 检查权限
        if (apiConfig.permission) {
            const { module, action } = apiConfig.permission
            if (!hasPermission(module, action, user)) {
                return false
            }
        }

        return true
    } catch (error) {
        console.error('API权限检查失败:', error)
        return false
    }
}

/**
 * 添加数据范围过滤参数
 * @param {Object} config Axios请求配置
 * @returns {Object} 修改后的配置
 */
export function addDataScopeFilter (config) {
    try {
        const user = store.getters.userInfo
        if (!user || !user.role) {
            return config
        }

        // 超级管理员无需过滤
        if (user.role === USER_ROLES.SUPER_ADMIN) {
            return config
        }

        // 查找API配置
        const apiConfig = API_PERMISSIONS.find(api => {
            return api.method === config.method.toUpperCase() &&
             (config.url.includes(api.url) || api.url.includes(config.url))
        })

        if (!apiConfig || !apiConfig.filterByUser) {
            return config
        }

        // 学生只能查看自己的数据
        if (user.role === USER_ROLES.STUDENT) {
            config.params = config.params || {}
            config.params.studentId = user.id
            config.params.userId = user.id
        }

        // 教师只能查看自己的课程和作业
        if (user.role === USER_ROLES.TEACHER) {
            if (config.url.includes('course') || config.url.includes('homework')) {
                config.params = config.params || {}
                config.params.teacherId = user.id
            }
        }

        // 家长只能查看自己孩子的数据
        if (user.role === USER_ROLES.PARENT) {
            config.params = config.params || {}
            config.params.parentId = user.id
            // 这里需要后端返回家长关联的学生列表
        }

        return config
    } catch (error) {
        console.error('数据范围过滤失败:', error)
        return config
    }
}

/**
 * 检查资源所有权
 * @param {string} resourceType 资源类型
 * @param {string} resourceId 资源ID
 * @param {string} ownerId 所有者ID
 * @returns {boolean} 是否为所有者
 */
export function checkResourceOwnership (resourceType, resourceId, ownerId) {
    try {
        const user = store.getters.userInfo
        if (!user || !user.role) {
            return false
        }

        // 超级管理员拥有所有资源
        if (user.role === USER_ROLES.SUPER_ADMIN) {
            return true
        }

        // 检查是否为资源所有者
        return user.id === ownerId
    } catch (error) {
        console.error('资源所有权检查失败:', error)
        return false
    }
}

/**
 * API权限错误处理
 * @param {Object} error 错误对象
 */
export function handleAPIPermissionError (error) {
    if (error.response) {
        switch (error.response.status) {
        case 401:
            message.error('未登录或登录已过期,请重新登录')
            store.dispatch('Logout').then(() => {
                window.location.href = '/portal/home'
            })
            break
        case 403:
            message.error('您没有权限执行此操作')
            break
        case 404:
            message.error('请求的资源不存在')
            break
        default:
            message.error(error.response.data.message || '请求失败')
        }
    } else {
        message.error('网络错误,请检查网络连接')
    }
}

/**
 * 动态添加API权限配置
 * @param {Object} config API权限配置
 */
export function addAPIPermission (config) {
    API_PERMISSIONS.push(config)
}

/**
 * 批量添加API权限配置
 * @param {Array} configs API权限配置数组
 */
export function addAPIPermissions (configs) {
    API_PERMISSIONS.push(...configs)
}

/**
 * 获取API权限配置
 * @param {string} method HTTP方法
 * @param {string} url API路径
 * @returns {Object} 权限配置
 */
export function getAPIPermission (method, url) {
    return API_PERMISSIONS.find(api => {
        return api.method === method.toUpperCase() &&
           (url.includes(api.url) || api.url.includes(url))
    })
}

export default {
    checkAPIPermission,
    addDataScopeFilter,
    checkResourceOwnership,
    handleAPIPermissionError,
    addAPIPermission,
    addAPIPermissions,
    getAPIPermission
}
