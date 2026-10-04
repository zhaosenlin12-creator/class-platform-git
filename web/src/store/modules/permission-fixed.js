import { asyncRouterMap, constantRouterMap } from '@/config/router.config'
import { generatorDynamicRouter } from '@/router/generator-routers'
import { getMenu } from '@/api/manage'

const LEGACY_COMPONENT_MAP = {
    'test/CourseTest': 'teaching/TeachingCourseList',
    'test/StudentTest': 'management/StudentManagement',
    'test/HomeworkTest': 'management/HomeworkManager',
    'test/ProgrammingTest': 'student/Programming',
    'test/ProgressTest': 'progress/StudentProgressDashboard',
    'test/StatisticsTest': 'statistics/Dashboard'
}

function sanitizeMenuComponents (menus = []) {
    if (!Array.isArray(menus)) {
        return []
    }
    return menus.map(menu => {
        if (!menu || typeof menu !== 'object') {
            return menu
        }
        const sanitized = { ...menu }
        if (sanitized.component && LEGACY_COMPONENT_MAP[sanitized.component]) {
            sanitized.component = LEGACY_COMPONENT_MAP[sanitized.component]
        }
        if (sanitized.children && sanitized.children.length) {
            sanitized.children = sanitizeMenuComponents(sanitized.children)
        }
        return sanitized
    })
}

/**
 * 过滤账户是否拥有某一个权限，并将菜单从加载列表移除
 *
 * @param permission
 * @param route
 * @returns {boolean}
 */
function hasPermission (permission, route) {
    if (route.meta && route.meta.permission) {
        let flag = false
        for (let i = 0, len = permission.length; i < len; i++) {
            flag = route.meta.permission.includes(permission[i])
            if (flag) {
                return true
            }
        }
        return false
    }
    return true
}

/**
 * 单账户多角色时，使用该方法可过滤角色不存在的菜单
 *
 * @param roles
 * @param route
 * @returns {*}
 */
// eslint-disable-next-line
function hasRole(roles, route) {
    if (route.meta && route.meta.roles) {
        return route.meta.roles.includes(roles.id)
    } else {
        return true
    }
}

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

/**
 * 获取后端菜单信息
 */
function getMenuData () {
    return new Promise((resolve, reject) => {
        getMenu().then(res => {
            const menuData = Array.isArray(res && res.result && res.result.menu)
                ? res.result.menu
                : []
            if (res.success && menuData.length > 0) {
                resolve(sanitizeMenuComponents(menuData))
            } else {
                resolve([])
            }
        }).catch(error => {
            console.error('getMenuData - 获取菜单失败:', error)
            resolve([])
        })
    })
}

const permission = {
    state: {
        routers: constantRouterMap,
        addRouters: []
    },
    mutations: {
        SET_ROUTERS: (state, routers) => {
            state.addRouters = routers
            state.routers = constantRouterMap.concat(routers)
        }
    },
    actions: {
        GenerateRoutes ({ commit }, data) {
            return new Promise(resolve => {
                getMenuData().then(menuData => {
                    // 使用动态路由生成器
                    const sanitizedMenu = sanitizeMenuComponents(menuData)
                    generatorDynamicRouter(sanitizedMenu).then((routers) => {
                        commit('SET_ROUTERS', routers)
                        resolve(routers)
                    }).catch(error => {
                        console.error('GenerateRoutes - 路由生成失败:', error)

                        // 出错时使用基础路由
                        commit('SET_ROUTERS', asyncRouterMap)
                        resolve(asyncRouterMap)
                    })
                })
            })
        }
    }
}

export default permission
