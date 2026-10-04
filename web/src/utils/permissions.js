import store from '@/store'

/**
 * 将权限JSON字符串转换为对象
 * @param {string} json 权限JSON字符串
 * @returns {Array} 权限数组
 */
export function actionToObject (json) {
    try {
        return JSON.parse(json)
    } catch (e) {
    }
    return []
}

/**
 * 教学平台用户角色定义
 */
export const USER_ROLES = {
    SUPER_ADMIN: 'super_admin', // 超级管理员
    SCHOOL_ADMIN: 'school_admin', // 学校管理员
    TEACHER: 'teacher', // 教师
    STUDENT: 'student', // 学生
    PARENT: 'parent', // 家长
    GUEST: 'guest' // 访客
}

/**
 * 权限模块定义
 */
export const PERMISSION_MODULES = {
    USER_MANAGEMENT: 'user_management', // 用户管理
    COURSE_MANAGEMENT: 'course_management', // 课程管理
    HOMEWORK_MANAGEMENT: 'homework_management', // 作业管理
    GRADE_MANAGEMENT: 'grade_management', // 成绩管理
    SYSTEM_SETTINGS: 'system_settings', // 系统设置
    DATA_ANALYSIS: 'data_analysis', // 数据分析
    CONTENT_MANAGEMENT: 'content_management', // 内容管理
    TEACHING_TOOLS: 'teaching_tools' // 教学工具
}

/**
 * 操作权限定义
 */
export const PERMISSION_ACTIONS = {
    CREATE: 'create', // 创建
    READ: 'read', // 查看
    UPDATE: 'update', // 编辑
    DELETE: 'delete', // 删除
    EXPORT: 'export', // 导出
    IMPORT: 'import', // 导入
    APPROVE: 'approve', // 审核
    ASSIGN: 'assign' // 分配
}

/**
 * 默认角色权限配置
 */
export const DEFAULT_ROLE_PERMISSIONS = {
    [USER_ROLES.SUPER_ADMIN]: {
    // 超级管理员拥有所有权限
        [PERMISSION_MODULES.USER_MANAGEMENT]: Object.values(PERMISSION_ACTIONS),
        [PERMISSION_MODULES.COURSE_MANAGEMENT]: Object.values(PERMISSION_ACTIONS),
        [PERMISSION_MODULES.HOMEWORK_MANAGEMENT]: Object.values(PERMISSION_ACTIONS),
        [PERMISSION_MODULES.GRADE_MANAGEMENT]: Object.values(PERMISSION_ACTIONS),
        [PERMISSION_MODULES.SYSTEM_SETTINGS]: Object.values(PERMISSION_ACTIONS),
        [PERMISSION_MODULES.DATA_ANALYSIS]: Object.values(PERMISSION_ACTIONS),
        [PERMISSION_MODULES.CONTENT_MANAGEMENT]: Object.values(PERMISSION_ACTIONS),
        [PERMISSION_MODULES.TEACHING_TOOLS]: Object.values(PERMISSION_ACTIONS)
    },
    [USER_ROLES.SCHOOL_ADMIN]: {
    // 学校管理员权限
        [PERMISSION_MODULES.USER_MANAGEMENT]: [PERMISSION_ACTIONS.CREATE, PERMISSION_ACTIONS.READ, PERMISSION_ACTIONS.UPDATE],
        [PERMISSION_MODULES.COURSE_MANAGEMENT]: Object.values(PERMISSION_ACTIONS),
        [PERMISSION_MODULES.HOMEWORK_MANAGEMENT]: [PERMISSION_ACTIONS.READ, PERMISSION_ACTIONS.EXPORT],
        [PERMISSION_MODULES.GRADE_MANAGEMENT]: [PERMISSION_ACTIONS.READ, PERMISSION_ACTIONS.EXPORT],
        [PERMISSION_MODULES.DATA_ANALYSIS]: [PERMISSION_ACTIONS.READ, PERMISSION_ACTIONS.EXPORT],
        [PERMISSION_MODULES.CONTENT_MANAGEMENT]: Object.values(PERMISSION_ACTIONS),
        [PERMISSION_MODULES.TEACHING_TOOLS]: [PERMISSION_ACTIONS.READ, PERMISSION_ACTIONS.ASSIGN]
    },
    [USER_ROLES.TEACHER]: {
    // 教师权限
        [PERMISSION_MODULES.COURSE_MANAGEMENT]: [PERMISSION_ACTIONS.CREATE, PERMISSION_ACTIONS.READ, PERMISSION_ACTIONS.UPDATE],
        [PERMISSION_MODULES.HOMEWORK_MANAGEMENT]: Object.values(PERMISSION_ACTIONS),
        [PERMISSION_MODULES.GRADE_MANAGEMENT]: Object.values(PERMISSION_ACTIONS),
        [PERMISSION_MODULES.DATA_ANALYSIS]: [PERMISSION_ACTIONS.READ, PERMISSION_ACTIONS.EXPORT],
        [PERMISSION_MODULES.TEACHING_TOOLS]: [PERMISSION_ACTIONS.READ, PERMISSION_ACTIONS.CREATE, PERMISSION_ACTIONS.UPDATE]
    },
    [USER_ROLES.STUDENT]: {
    // 学生权限
        [PERMISSION_MODULES.COURSE_MANAGEMENT]: [PERMISSION_ACTIONS.READ],
        [PERMISSION_MODULES.HOMEWORK_MANAGEMENT]: [PERMISSION_ACTIONS.READ, PERMISSION_ACTIONS.CREATE, PERMISSION_ACTIONS.UPDATE],
        [PERMISSION_MODULES.GRADE_MANAGEMENT]: [PERMISSION_ACTIONS.READ],
        [PERMISSION_MODULES.TEACHING_TOOLS]: [PERMISSION_ACTIONS.READ]
    },
    [USER_ROLES.PARENT]: {
    // 家长权限
        [PERMISSION_MODULES.HOMEWORK_MANAGEMENT]: [PERMISSION_ACTIONS.READ],
        [PERMISSION_MODULES.GRADE_MANAGEMENT]: [PERMISSION_ACTIONS.READ],
        [PERMISSION_MODULES.DATA_ANALYSIS]: [PERMISSION_ACTIONS.READ]
    },
    [USER_ROLES.GUEST]: {
    // 访客权限（极少）
        [PERMISSION_MODULES.COURSE_MANAGEMENT]: [PERMISSION_ACTIONS.READ]
    }
}

/**
 * 检查用户是否有特定权限
 * @param {string} module 权限模块
 * @param {string} action 权限操作
 * @param {Object} user 用户信息（可选，默认从store获取）
 * @returns {boolean} 是否有权限
 */
export function hasPermission (module, action, user = null) {
    try {
        const currentUser = user || store.getters.userInfo
        if (!currentUser || !currentUser.role) {
            return false
        }

        // 超级管理员拥有所有权限
        if (currentUser.role === USER_ROLES.SUPER_ADMIN) {
            return true
        }

        // 检查用户自定义权限
        if (currentUser.permissions && currentUser.permissions[module]) {
            return currentUser.permissions[module].includes(action)
        }

        // 检查默认角色权限
        const rolePermissions = DEFAULT_ROLE_PERMISSIONS[currentUser.role]
        if (rolePermissions && rolePermissions[module]) {
            return rolePermissions[module].includes(action)
        }

        return false
    } catch (error) {
        console.error('权限检查失败:', error)
        return false
    }
}

/**
 * 检查用户角色
 * @param {string|Array} roles 角色或角色数组
 * @param {Object} user 用户信息（可选，默认从store获取）
 * @returns {boolean} 是否匹配角色
 */
export function hasRole (roles, user = null) {
    try {
        const currentUser = user || store.getters.userInfo
        if (!currentUser || !currentUser.role) {
            return false
        }

        if (Array.isArray(roles)) {
            return roles.includes(currentUser.role)
        } else {
            return currentUser.role === roles
        }
    } catch (error) {
        console.error('角色检查失败:', error)
        return false
    }
}

/**
 * 获取用户可访问的菜单项
 * @param {Array} menuItems 菜单项数组
 * @param {Object} user 用户信息（可选，默认从store获取）
 * @returns {Array} 过滤后的菜单项
 */
export function getAccessibleMenus (menuItems, user = null) {
    try {
        const currentUser = user || store.getters.userInfo
        if (!currentUser) {
            return []
        }

        // 超级管理员可以访问所有菜单
        if (currentUser.role === USER_ROLES.SUPER_ADMIN) {
            return menuItems
        }

        return menuItems.filter(menu => {
            // 检查菜单项权限
            if (menu.permission) {
                const { module, action } = menu.permission
                if (!hasPermission(module, action, currentUser)) {
                    return false
                }
            }

            // 检查角色权限
            if (menu.roles && !hasRole(menu.roles, currentUser)) {
                return false
            }

            // 递归处理子菜单
            if (menu.children && menu.children.length > 0) {
                menu.children = getAccessibleMenus(menu.children, currentUser)
            }

            return true
        })
    } catch (error) {
        console.error('菜单过滤失败:', error)
        return []
    }
}

/**
 * 检查资源访问权限
 * @param {string} resourceType 资源类型
 * @param {string} resourceId 资源ID
 * @param {string} action 操作类型
 * @param {Object} user 用户信息（可选，默认从store获取）
 * @returns {boolean} 是否有权限
 */
export function hasResourcePermission (resourceType, resourceId, action, user = null) {
    try {
        const currentUser = user || store.getters.userInfo
        if (!currentUser) {
            return false
        }

        // 超级管理员拥有所有资源权限
        if (currentUser.role === USER_ROLES.SUPER_ADMIN) {
            return true
        }

        // 检查资源所有者权限
        if (resourceType === 'homework' && action === PERMISSION_ACTIONS.UPDATE) {
            // 作业只能由创建者修改
            return currentUser.id === resourceId || hasPermission(PERMISSION_MODULES.HOMEWORK_MANAGEMENT, action)
        }

        if (resourceType === 'course' && action === PERMISSION_ACTIONS.UPDATE) {
            // 课程只能由授课教师修改
            return currentUser.id === resourceId || hasPermission(PERMISSION_MODULES.COURSE_MANAGEMENT, action)
        }

        // 学生只能查看自己的成绩
        if (resourceType === 'grade' && currentUser.role === USER_ROLES.STUDENT) {
            return currentUser.id === resourceId && action === PERMISSION_ACTIONS.READ
        }

        // 家长只能查看自己孩子的相关信息
        if (currentUser.role === USER_ROLES.PARENT) {
            // 这里需要检查资源是否属于家长的孩子
            // 实际实现中需要查询家长-学生关系
            return false // 简化处理
        }

        return false
    } catch (error) {
        console.error('资源权限检查失败:', error)
        return false
    }
}

/**
 * 获取用户角色的显示名称
 * @param {string} role 角色代码
 * @returns {string} 角色显示名称
 */
export function getRoleDisplayName (role) {
    const roleNames = {
        [USER_ROLES.SUPER_ADMIN]: '超级管理员',
        [USER_ROLES.SCHOOL_ADMIN]: '学校管理员',
        [USER_ROLES.TEACHER]: '教师',
        [USER_ROLES.STUDENT]: '学生',
        [USER_ROLES.PARENT]: '家长',
        [USER_ROLES.GUEST]: '访客'
    }
    return roleNames[role] || '未知角色'
}

/**
 * 获取权限模块的显示名称
 * @param {string} module 权限模块代码
 * @returns {string} 模块显示名称
 */
export function getModuleDisplayName (module) {
    const moduleNames = {
        [PERMISSION_MODULES.USER_MANAGEMENT]: '用户管理',
        [PERMISSION_MODULES.COURSE_MANAGEMENT]: '课程管理',
        [PERMISSION_MODULES.HOMEWORK_MANAGEMENT]: '作业管理',
        [PERMISSION_MODULES.GRADE_MANAGEMENT]: '成绩管理',
        [PERMISSION_MODULES.SYSTEM_SETTINGS]: '系统设置',
        [PERMISSION_MODULES.DATA_ANALYSIS]: '数据分析',
        [PERMISSION_MODULES.CONTENT_MANAGEMENT]: '内容管理',
        [PERMISSION_MODULES.TEACHING_TOOLS]: '教学工具'
    }
    return moduleNames[module] || '未知模块'
}

/**
 * 获取权限操作的显示名称
 * @param {string} action 权限操作代码
 * @returns {string} 操作显示名称
 */
export function getActionDisplayName (action) {
    const actionNames = {
        [PERMISSION_ACTIONS.CREATE]: '创建',
        [PERMISSION_ACTIONS.READ]: '查看',
        [PERMISSION_ACTIONS.UPDATE]: '编辑',
        [PERMISSION_ACTIONS.DELETE]: '删除',
        [PERMISSION_ACTIONS.EXPORT]: '导出',
        [PERMISSION_ACTIONS.IMPORT]: '导入',
        [PERMISSION_ACTIONS.APPROVE]: '审核',
        [PERMISSION_ACTIONS.ASSIGN]: '分配'
    }
    return actionNames[action] || '未知操作'
}

/**
 * 生成权限字符串
 * @param {string} module 权限模块
 * @param {string} action 权限操作
 * @returns {string} 权限字符串
 */
export function generatePermissionKey (module, action) {
    return `${module}:${action}`
}

/**
 * 解析权限字符串
 * @param {string} permissionKey 权限字符串
 * @returns {Object} 包含module和action的对象
 */
export function parsePermissionKey (permissionKey) {
    const [module, action] = permissionKey.split(':')
    return { module, action }
}
