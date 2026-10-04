import { asyncRouterMap, constantRouterMap } from '@/config/router.config'
import { getAccessibleMenus, hasPermission, hasRole } from '@/utils/permissions'

function filterAsyncRouter (routerMap, roles) {
    const accessedRouters = routerMap.filter(route => {
        if (hasPermission(roles.permissionList, route)) {
            if (route.children && route.children.length) {
                route.children = filterAsyncRouter(route.children, roles)
            }
            return true
        }
        return false
    })
    return accessedRouters
}

const permission = {
    state: {
        routers: constantRouterMap,
        addRouters: [],
        permissions: [], // 用户权限列表
        roles: [], // 用户角色列表
        menuPermissions: {} // 菜单权限缓存
    },

    mutations: {
        SET_ROUTERS: (state, data) => {
            state.addRouters = data
            state.routers = constantRouterMap.concat(data)
        },

        SET_PERMISSIONS: (state, permissions) => {
            state.permissions = permissions
        },

        SET_ROLES: (state, roles) => {
            state.roles = roles
        },

        SET_MENU_PERMISSIONS: (state, menuPermissions) => {
            state.menuPermissions = menuPermissions
        },

        UPDATE_PERMISSION: (state, { role, module, action, hasPermission }) => {
            // 更新特定权限
            if (!state.menuPermissions[role]) {
                state.menuPermissions[role] = {}
            }
            if (!state.menuPermissions[role][module]) {
                state.menuPermissions[role][module] = []
            }

            const index = state.menuPermissions[role][module].indexOf(action)
            if (hasPermission && index === -1) {
                state.menuPermissions[role][module].push(action)
            } else if (!hasPermission && index !== -1) {
                state.menuPermissions[role][module].splice(index, 1)
            }
        }
    },

    getters: {
    // 获取当前用户的路由权限
        permissionRouters: (state) => {
            return state.routers
        },

        // 获取当前用户权限
        userPermissions: (state) => {
            return state.permissions
        },

        // 获取当前用户角色
        userRoles: (state) => {
            return state.roles
        },

        // 检查是否有特定权限
        hasPermission: (state) => (module, action) => {
            return hasPermission(module, action)
        },

        // hasRole已移动到主getters.js以避免重复

        // 获取可访问的菜单
        accessibleMenus: (state) => (menuItems) => {
            return getAccessibleMenus(menuItems)
        }
    },

    actions: {
        GenerateRoutes ({ commit }, data) {
            return new Promise(resolve => {
                const { roles } = data
                let accessedRouters
                accessedRouters = filterAsyncRouter(asyncRouterMap, roles)
                commit('SET_ROUTERS', accessedRouters)
                resolve()
            })
        },

        // 动态添加主界面路由，需要缓存
        UpdateAppRouter ({ commit }, routes) {
            return new Promise(resolve => {
                let routelist = routes.constRoutes
                commit('SET_ROUTERS', routelist)
                resolve()
            })
        },

        // 设置用户权限
        SetUserPermissions ({ commit }, permissions) {
            commit('SET_PERMISSIONS', permissions)
        },

        // 设置用户角色
        SetUserRoles ({ commit }, roles) {
            commit('SET_ROLES', roles)
        },

        // 更新菜单权限
        UpdateMenuPermissions ({ commit }, menuPermissions) {
            commit('SET_MENU_PERMISSIONS', menuPermissions)
        },

        // 清除权限信息
        ClearPermissions ({ commit }) {
            commit('SET_PERMISSIONS', [])
            commit('SET_ROLES', [])
            commit('SET_MENU_PERMISSIONS', {})
        },

        // 检查并过滤路由权限
        FilterRoutes ({ commit, state }, { routes, user }) {
            return new Promise(resolve => {
                try {
                    const accessibleRoutes = getAccessibleMenus(routes, user)
                    commit('SET_ROUTERS', accessibleRoutes)
                    resolve(accessibleRoutes)
                } catch (error) {
                    console.error('路由权限过滤失败:', error)
                    resolve([])
                }
            })
        },

        // 验证路由访问权限
        ValidateRouteAccess ({ state }, { route, user }) {
            return new Promise((resolve, reject) => {
                try {
                    // 检查路由权限要求
                    if (route.meta && route.meta.permission) {
                        const { module, action } = route.meta.permission
                        if (!hasPermission(module, action, user)) {
                            reject(new Error('没有访问权限'))
                            return
                        }
                    }

                    // 检查角色权限要求
                    if (route.meta && route.meta.roles) {
                        if (!hasRole(route.meta.roles, user)) {
                            reject(new Error('角色权限不足'))
                            return
                        }
                    }

                    resolve(true)
                } catch (error) {
                    reject(error)
                }
            })
        }
    }
}

export default permission
