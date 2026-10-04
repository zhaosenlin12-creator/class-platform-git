import { hasPermission, hasRole, PERMISSION_MODULES, PERMISSION_ACTIONS } from '@/utils/permissions'

/**
 * 权限指令
 * 用法：
 * v-permission="{ module: 'homework_management', action: 'create' }"
 * v-permission:role="'teacher'"
 * v-permission:roles="['teacher', 'admin']"
 */
export default {
    name: 'permission',

    /**
   * 指令被绑定到元素上时调用
   */
    bind (el, binding) {
        checkPermission(el, binding)
    },

    /**
   * 指令更新时调用
   */
    update (el, binding) {
        checkPermission(el, binding)
    }
}

/**
 * 检查权限并控制元素显示/隐藏
 * @param {Element} el DOM元素
 * @param {Object} binding 指令绑定对象
 */
function checkPermission (el, binding) {
    const { arg, value } = binding

    try {
        let hasAuth = false

        if (arg === 'role') {
            // 角色权限检查
            hasAuth = hasRole(value)
        } else if (arg === 'roles') {
            // 多角色权限检查
            hasAuth = hasRole(value)
        } else {
            // 功能权限检查
            if (value && typeof value === 'object' && value.module && value.action) {
                hasAuth = hasPermission(value.module, value.action)
            } else if (typeof value === 'string') {
                // 支持字符串形式，如 "homework_management:create"
                const [module, action] = value.split(':')
                if (module && action) {
                    hasAuth = hasPermission(module, action)
                }
            }
        }

        // 根据权限控制元素显示
        if (!hasAuth) {
            // 移除元素而不是隐藏，避免占用空间
            if (el.parentNode) {
                el.parentNode.removeChild(el)
            }
        }
    } catch (error) {
        console.error('权限指令错误:', error)
        // 出错时隐藏元素，保证安全
        if (el.parentNode) {
            el.parentNode.removeChild(el)
        }
    }
}

/**
 * 权限检查混入
 * 在组件中使用：mixins: [permissionMixin]
 */
export const permissionMixin = {
    methods: {
    /**
     * 检查是否有权限
     * @param {string} module 权限模块
     * @param {string} action 权限操作
     * @returns {boolean} 是否有权限
     */
        $hasPermission (module, action) {
            return hasPermission(module, action)
        },

        /**
     * 检查是否有角色
     * @param {string|Array} roles 角色或角色数组
     * @returns {boolean} 是否有角色
     */
        $hasRole (roles) {
            return hasRole(roles)
        },

        /**
     * 检查是否可以创建
     * @param {string} module 权限模块
     * @returns {boolean} 是否可以创建
     */
        $canCreate (module) {
            return hasPermission(module, PERMISSION_ACTIONS.CREATE)
        },

        /**
     * 检查是否可以查看
     * @param {string} module 权限模块
     * @returns {boolean} 是否可以查看
     */
        $canRead (module) {
            return hasPermission(module, PERMISSION_ACTIONS.READ)
        },

        /**
     * 检查是否可以编辑
     * @param {string} module 权限模块
     * @returns {boolean} 是否可以编辑
     */
        $canUpdate (module) {
            return hasPermission(module, PERMISSION_ACTIONS.UPDATE)
        },

        /**
     * 检查是否可以删除
     * @param {string} module 权限模块
     * @returns {boolean} 是否可以删除
     */
        $canDelete (module) {
            return hasPermission(module, PERMISSION_ACTIONS.DELETE)
        },

        /**
     * 检查是否可以导出
     * @param {string} module 权限模块
     * @returns {boolean} 是否可以导出
     */
        $canExport (module) {
            return hasPermission(module, PERMISSION_ACTIONS.EXPORT)
        },

        /**
     * 检查是否可以导入
     * @param {string} module 权限模块
     * @returns {boolean} 是否可以导入
     */
        $canImport (module) {
            return hasPermission(module, PERMISSION_ACTIONS.IMPORT)
        },

        /**
     * 检查是否可以审核
     * @param {string} module 权限模块
     * @returns {boolean} 是否可以审核
     */
        $canApprove (module) {
            return hasPermission(module, PERMISSION_ACTIONS.APPROVE)
        },

        /**
     * 检查是否可以分配
     * @param {string} module 权限模块
     * @returns {boolean} 是否可以分配
     */
        $canAssign (module) {
            return hasPermission(module, PERMISSION_ACTIONS.ASSIGN)
        },

        /**
     * 检查是否是教师
     * @returns {boolean} 是否是教师
     */
        $isTeacher () {
            return hasRole('teacher')
        },

        /**
     * 检查是否是学生
     * @returns {boolean} 是否是学生
     */
        $isStudent () {
            return hasRole('student')
        },

        /**
     * 检查是否是管理员
     * @returns {boolean} 是否是管理员
     */
        $isAdmin () {
            return hasRole(['super_admin', 'school_admin'])
        },

        /**
     * 检查是否可以管理作业
     * @returns {boolean} 是否可以管理作业
     */
        $canManageHomework () {
            return hasPermission(PERMISSION_MODULES.HOMEWORK_MANAGEMENT, PERMISSION_ACTIONS.CREATE) ||
             hasPermission(PERMISSION_MODULES.HOMEWORK_MANAGEMENT, PERMISSION_ACTIONS.UPDATE) ||
             hasPermission(PERMISSION_MODULES.HOMEWORK_MANAGEMENT, PERMISSION_ACTIONS.DELETE)
        },

        /**
     * 检查是否可以管理成绩
     * @returns {boolean} 是否可以管理成绩
     */
        $canManageGrades () {
            return hasPermission(PERMISSION_MODULES.GRADE_MANAGEMENT, PERMISSION_ACTIONS.CREATE) ||
             hasPermission(PERMISSION_MODULES.GRADE_MANAGEMENT, PERMISSION_ACTIONS.UPDATE) ||
             hasPermission(PERMISSION_MODULES.GRADE_MANAGEMENT, PERMISSION_ACTIONS.DELETE)
        },

        /**
     * 检查是否可以管理用户
     * @returns {boolean} 是否可以管理用户
     */
        $canManageUsers () {
            return hasPermission(PERMISSION_MODULES.USER_MANAGEMENT, PERMISSION_ACTIONS.CREATE) ||
             hasPermission(PERMISSION_MODULES.USER_MANAGEMENT, PERMISSION_ACTIONS.UPDATE) ||
             hasPermission(PERMISSION_MODULES.USER_MANAGEMENT, PERMISSION_ACTIONS.DELETE)
        }
    }
}
