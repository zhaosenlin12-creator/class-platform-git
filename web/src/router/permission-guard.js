/**
 * 路由权限守卫
 * 实现基于角色和权限的路由访问控制
 */

import router from './index'
import store from '@/store'
import { hasRole, hasPermission, USER_ROLES } from '@/utils/permissions'

// 白名单路由 - 无需登录即可访问（登录统一在首页）
const WHITE_LIST = [
    '/user/register',
    '/user/forgot-password',
    '/404',
    '/403',
    '/',
    '/index',
    '/home',
    '/workList',
    '/courseList',
    '/newsList',
    '/news-detail',
    '/student/home',
    '/student/classrooms',
    '/student/homework',
    '/student/programming',
    '/admin/dashboard',
    '/admin/classroom-manager',
    '/classroom/online'
]

// 路由权限映射配置
const ROUTE_PERMISSIONS = {
    // 学生端路由
    '/student/home': {
        roles: [USER_ROLES.STUDENT],
        permission: null // 无需特定权限,只需学生角色
    },
    '/student/classrooms': {
        roles: [USER_ROLES.STUDENT],
        permission: { module: 'teaching_tools', action: 'read' }
    },
    '/student/homework': {
        roles: [USER_ROLES.STUDENT],
        permission: { module: 'homework_management', action: 'read' }
    },
    '/student/homework/submit': {
        roles: [USER_ROLES.STUDENT],
        permission: { module: 'homework_management', action: 'create' }
    },
    '/student/classroom': {
        roles: [USER_ROLES.STUDENT],
        permission: { module: 'teaching_tools', action: 'read' }
    },
    '/student/exam': {
        roles: [USER_ROLES.STUDENT],
        permission: { module: 'grade_management', action: 'read' }
    },
    '/student/programming': {
        roles: [USER_ROLES.STUDENT],
        permission: { module: 'teaching_tools', action: 'read' }
    },

    // 教师端路由
    '/teacher/dashboard': {
        roles: [USER_ROLES.TEACHER, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN],
        permission: null
    },
    '/teacher/students': {
        roles: [USER_ROLES.TEACHER, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN],
        permission: { module: 'user_management', action: 'read' }
    },
    '/teacher/courses': {
        roles: [USER_ROLES.TEACHER, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN],
        permission: { module: 'course_management', action: 'read' }
    },
    '/teacher/homework': {
        roles: [USER_ROLES.TEACHER, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN],
        permission: { module: 'homework_management', action: 'read' }
    },
    '/teacher/homework/create': {
        roles: [USER_ROLES.TEACHER, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN],
        permission: { module: 'homework_management', action: 'create' }
    },
    '/teacher/exam': {
        roles: [USER_ROLES.TEACHER, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN],
        permission: { module: 'grade_management', action: 'read' }
    },
    '/teacher/classroom': {
        roles: [USER_ROLES.TEACHER, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN],
        permission: { module: 'teaching_tools', action: 'create' }
    },

    // 作业管理路由
    '/homework/management': {
        roles: [USER_ROLES.TEACHER, USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN],
        permission: { module: 'homework_management', action: 'read' }
    },

    // 管理员路由
    '/admin/users': {
        roles: [USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN],
        permission: { module: 'user_management', action: 'read' }
    },
    '/admin/system': {
        roles: [USER_ROLES.SUPER_ADMIN],
        permission: { module: 'system_settings', action: 'read' }
    },
    '/admin/data-analysis': {
        roles: [USER_ROLES.SCHOOL_ADMIN, USER_ROLES.SUPER_ADMIN],
        permission: { module: 'data_analysis', action: 'read' }
    }
}

/**
 * 检查路由权限
 * @param {string} path 路由路径
 * @param {Object} user 用户信息
 * @returns {boolean} 是否有权限访问
 */
function checkRoutePermission (path, user) {
    // 1. 检查是否在白名单
    if (WHITE_LIST.includes(path)) {
        return true
    }

    // 2. 未登录拒绝访问
    if (!user || !user.role) {
        return false
    }

    // 3. 超级管理员拥有所有权限
    if (user.role === USER_ROLES.SUPER_ADMIN) {
        return true
    }

    // 4. 查找精确匹配的路由权限配置
    let routeConfig = ROUTE_PERMISSIONS[path]

    // 5. 如果没有精确匹配,尝试模糊匹配父路由
    if (!routeConfig) {
        const parentPath = path.substring(0, path.lastIndexOf('/'))
        if (parentPath) {
            routeConfig = ROUTE_PERMISSIONS[parentPath]
        }
    }

    // 6. 如果没有配置,默认允许(向后兼容)
    if (!routeConfig) {
        console.warn(`路由 ${path} 未配置权限,默认允许访问`)
        return true
    }

    // 7. 检查角色
    if (routeConfig.roles && !hasRole(routeConfig.roles, user)) {
        return false
    }

    // 8. 检查权限
    if (routeConfig.permission) {
        const { module, action } = routeConfig.permission
        return hasPermission(module, action, user)
    }

    return true
}

/**
 * 全局路由前置守卫
 */
router.beforeEach(async (to, from, next) => {
    try {
    // 🔥 临时禁用所有路由权限检查 - 用于开发测试
    // TODO: 生产环境需要启用权限检查
        next()
        return

    /* 原权限检查代码 - 已暂时禁用
    // 获取用户信息
    const user = store.getters.userInfo
    const token = store.getters.token

    // 白名单直接放行
    if (WHITE_LIST.includes(to.path)) {
      next()
      return
    }

    // 未登录跳转首页登录
    if (!token) {
      next({
        path: '/home',
        query: { redirect: to.fullPath }
      })
      return
    }

    // 已登录但未获取用户信息
    if (!user || !user.role) {
      try {
        // 尝试获取用户信息
        await store.dispatch('GetInfo')
        const updatedUser = store.getters.userInfo

        // 获取用户信息后再次检查权限
        if (checkRoutePermission(to.path, updatedUser)) {
          next()
        } else {
          message.error('您没有权限访问该页面')
          next('/403')
        }
      } catch (error) {
        // 获取用户信息失败,清除token并跳转首页登录
        console.error('获取用户信息失败:', error)
        await store.dispatch('Logout')
        next({
          path: '/home',
          query: { redirect: to.fullPath }
        })
      }
      return
    }

    // 检查路由权限
    if (checkRoutePermission(to.path, user)) {
      next()
    } else {
      message.error('您没有权限访问该页面')
      next('/403')
    }
    */
    } catch (error) {
        console.error('路由守卫错误:', error)
        next('/404')
    }
})

/**
 * 全局路由后置守卫
 */
router.afterEach((to) => {
    // 设置页面标题
    const routeTitle = to.meta && to.meta.title ? to.meta.title : '页面'
    const sysConfig = store.getters.sysConfig || {}
    const brandName = sysConfig.brandName || '乐启享'

    // 如果是首页，只显示品牌名
    if (to.path === '/dashboard/analysis' || to.path === '/') {
        document.title = brandName
    } else if (routeTitle && routeTitle !== '页面') {
        document.title = routeTitle + ' · ' + brandName
    } else {
        document.title = brandName
    }

    // 记录路由访问日志(可选)
    if (process.env.NODE_ENV === 'development') {
    }
})

/**
 * 动态添加路由权限配置
 * @param {string} path 路由路径
 * @param {Object} config 权限配置
 */
export function addRoutePermission (path, config) {
    ROUTE_PERMISSIONS[path] = config
}

/**
 * 批量添加路由权限配置
 * @param {Object} configs 权限配置对象
 */
export function addRoutePermissions (configs) {
    Object.assign(ROUTE_PERMISSIONS, configs)
}

/**
 * 获取路由权限配置
 * @param {string} path 路由路径
 * @returns {Object} 权限配置
 */
export function getRoutePermission (path) {
    return ROUTE_PERMISSIONS[path]
}

export default {
    checkRoutePermission,
    addRoutePermission,
    addRoutePermissions,
    getRoutePermission
}
