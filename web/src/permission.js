import Vue from 'vue'
import router from './router'
import store from './store'
import NProgress from 'nprogress' // progress bar
import 'nprogress/nprogress.css' // progress bar style

import { generateIndexRouter } from '@/utils/util'
import { getStoredAccessToken } from '@/utils/trustedApi'
import { resolveTeachingAccess } from '@/utils/teachingAccess'

const console = typeof window !== 'undefined' && window.__ROUTER_DEBUG__ === true
    ? window.console
    : {
        log () {},
        warn () {},
        error () {}
    }

const LEGACY_COMPONENT_MAP = {
    'test/CourseTest': 'teaching/TeachingCourseList',
    'test/StudentTest': 'management/StudentManagement',
    'test/HomeworkTest': 'management/HomeworkManager',
    'test/ProgrammingTest': 'student/Programming',
    'test/ProgressTest': 'progress/StudentProgressDashboard',
    'test/StatisticsTest': 'statistics/Dashboard',
    'teacher/SimpleClassroom': 'classroom/ClassroomManager'
}

function sanitizeMenuComponents (menus = []) {
    return menus.map(menu => {
        const sanitized = {
            ...menu,
            meta: { ...(menu.meta || {}) }
        }

        const shouldUseClassroomManager =
            sanitized.path === '/teacher/classroom' ||
            sanitized.component === 'teacher/SimpleClassroom'

        if (sanitized.component && LEGACY_COMPONENT_MAP[sanitized.component]) {
            sanitized.component = LEGACY_COMPONENT_MAP[sanitized.component]
        }
        if (shouldUseClassroomManager) {
            sanitized.component = 'classroom/ClassroomManager'
            sanitized.title = '课堂管理'
            sanitized.meta.title = '课堂管理'
        }
        if (sanitized.children && sanitized.children.length > 0) {
            sanitized.children = sanitizeMenuComponents(sanitized.children)
        }
        return sanitized
    })
}

function resolveAuthenticatedHomePath () {
    const access = resolveTeachingAccess({
        userRole: store.getters.userRole || [],
        userType: store.getters.userType || '',
        userInfo: store.getters.userInfo || {}
    })

    return access.homePath || '/portal/home'
}

NProgress.configure({ showSpinner: false }) // NProgress Configuration

const whiteList = [
    '/',
    '/portal',
    '/portal/home',
    '/portal/index',
    '/portal/workList',
    '/portal/courseList',
    '/portal/newsList',
    '/portal/news-detail',
    '/portal/friend-detail',
    '/portal/work-detail',
    '/user/register',
    '/user/register-result',
    '/user/alteration',
    '/home',
    '/index',
    '/workList',
    '/courseList',
    '/friend-detail',
    '/work-detail',
    '/newsList',
    '/news-detail'
] // no redirect whitelist - 登录统一在首页

// 【关键】标记路由是否正在加载中，防止重复加载
let isLoadingRoutes = false
// 标记是否是首次加载（刷新页面）- 使用sessionStorage持久化
let isFirstLoad = !sessionStorage.getItem('__app_loaded__')

router.beforeEach(async (to, from, next) => {
    NProgress.start() // start progress bar

    const token = store.getters.token || getStoredAccessToken()

    // 特殊路径前缀：这些路径刷新时保持原地，不跳转
    const keepPaths = ['/classroom/online', '/classroom/review']

    // 检测刷新：如果是首次加载且有token且不是安全路径
    if (isFirstLoad) {
    // 标记已加载，防止重复触发
        sessionStorage.setItem('__app_loaded__', 'true')
        isFirstLoad = false

        // 如果有token且不是安全路径，根据路径前缀跳转到对应首页
        // 注意：必须在动态路由加载之前跳转，否则会被通配符路由捕获到404

        // 检查是否是需要保持的特殊路径（如课堂页面）
        const isKeepPath = keepPaths.some(p => to.path.startsWith(p))

        // 生产环境支持直接打开后台深链接，本地恢复源码时也应保持一致，
        // 因此首次加载时不要把有效路由强制改写到默认首页。

        // 课堂页面刷新时保持原地，不跳转
        if (isKeepPath) {
            console.log('[ROUTER] 🔄 课堂页面刷新，保持原地:', to.path)
        }
    }

    // 【关键】如果目标是404页面且有token，说明是刷新导致的路由未匹配，跳转到首页
    if (to.path === '/404' && token) {
    // 从 from 或 sessionStorage 获取原始路径
        const originalPath = sessionStorage.getItem('__last_path__') || from.path || ''
        let targetPath = '/portal/home'

        if (originalPath.startsWith('/admin/') || originalPath.startsWith('/dashboard/') || originalPath.startsWith('/management/')) {
            targetPath = '/admin/dashboard'
        } else if (originalPath.startsWith('/teacher/')) {
            targetPath = '/teacher/dashboard'
        } else if (originalPath.startsWith('/student/')) {
            targetPath = '/student/home'
        }

        console.log('[ROUTER] 🔄 拦截404跳转，原路径:', originalPath, '跳转到:', targetPath)
        next({ path: targetPath, replace: true })
        NProgress.done()
        return
    }

    // 记录当前路径，用于404恢复
    if (to.path !== '/404') {
        sessionStorage.setItem('__last_path__', to.path)
    }

    if (token) {
    /* has token */
    // 已删除 /user/login 路由，统一在首页登录
    // if (to.path === '/user/login') {
    //   next({ path: INDEX_MAIN_PAGE_PATH })
    //   NProgress.done()
    //   return
    // }

        // 检查路由是否已经加载
        // 注意：这里检查permissionList和addRouters，确保路由真正加载完成
        const permissionList = store.getters.permissionList || []
        const addRouters = store.getters.addRouters || []
        const hasPermissionList = permissionList.length > 0
        const hasRoutes = addRouters.length > 0

        console.log('[ROUTER] 路由检查:', {
            hasPermissionList,
            hasRoutes,
            permissionListLength: permissionList.length,
            addRoutersLength: addRouters.length,
            toPath: to.path
        })

        // 如果路由已加载，直接通过
        if (hasPermissionList && hasRoutes) {
            console.log('[ROUTER] 路由已加载，直接通过')
            next()
            return
        }

        // 防止重复加载 - 如果正在加载，等待加载完成后再重试
        if (isLoadingRoutes) {
            console.log('[ROUTER] 路由正在加载中，等待完成后重试...')
            // 等待一小段时间后重试，不要直接放行
            await new Promise(resolve => setTimeout(resolve, 100))
            // 重新检查路由状态
            const newAddRouters = store.getters.addRouters || []
            if (newAddRouters.length > 0) {
                console.log('[ROUTER] 路由加载完成，重新导航')
                next({ ...to, replace: true })
            } else {
                // 继续等待
                next({ ...to, replace: true })
            }
            return
        }

        // 需要加载路由（permissionList或addRouters任一缺失都需要重新加载）
        if (!hasPermissionList || !hasRoutes) {
            console.log('[ROUTER] 需要加载路由和权限列表')
            isLoadingRoutes = true
            // 安全地添加路由，避免重复添加
            // eslint-disable-next-line no-inner-declarations
            function addRoutesSafely (routes) {
                if (!routes || routes.length === 0) {
                    console.warn('[ROUTER] 没有路由需要添加')
                    return
                }

                // 获取所有现有路由（包括嵌套路由）
                const existingRoutes = router.getRoutes()
                const existingRouteNames = new Set()

                // 递归收集所有路由名称（包括嵌套路由）
                function collectRouteNames (routes, names) {
                    routes.forEach(route => {
                        if (route.name) {
                            names.add(route.name)
                        }
                        if (route.children && route.children.length > 0) {
                            collectRouteNames(route.children, names)
                        }
                    })
                }

                collectRouteNames(existingRoutes, existingRouteNames)

                // 递归过滤路由，检查是否已存在
                function filterRoutes (routes) {
                    return routes.filter(route => {
                        // 检查当前路由名称
                        if (route.name && existingRouteNames.has(route.name)) {
                            console.warn(`[ROUTER] 路由 "${route.name}" (${route.path}) 已存在，跳过添加`)
                            return false
                        }

                        // 如果有children，递归过滤
                        if (route.children && route.children.length > 0) {
                            route.children = filterRoutes(route.children)
                        }

                        // 如果当前路由名称存在，添加到集合中
                        if (route.name) {
                            existingRouteNames.add(route.name)
                        }

                        return true
                    })
                }

                const routesToAdd = filterRoutes(routes)

                if (routesToAdd.length === 0) {
                    console.log('[ROUTER] 所有路由已存在，无需添加')
                    return
                }

                console.log(`[ROUTER] 准备添加 ${routesToAdd.length} 个路由`)

                // 使用新的 addRoute 方法（Vue Router 3.5+）
                // 如果支持 addRoute，逐个添加；否则使用 addRoutes（向后兼容）
                if (typeof router.addRoute === 'function') {
                    routesToAdd.forEach(route => {
                        try {
                            router.addRoute(route)
                            console.log(`[ROUTER] ✅ 添加路由: ${route.name || route.path}`)
                        } catch (error) {
                            console.error(`[ROUTER] ❌ 添加路由失败: ${route.name || route.path}`, error)
                        }
                    })
                } else if (typeof router.addRoutes === 'function') {
                    // 向后兼容旧版本
                    router.addRoutes(routesToAdd)
                    console.log(`[ROUTER] ✅ 使用 addRoutes 添加 ${routesToAdd.length} 个路由`)
                } else {
                    console.error('[ROUTER] ❌ 不支持动态添加路由')
                }
            }

            // 先尝试从localStorage读取缓存的菜单数据
            const cachedMenu = null // 临时禁用缓存，强制重新获取菜单
            // const cachedMenu = Vue.ls.get('MENU');
            if (cachedMenu && cachedMenu.length > 0) {
                console.log('[ROUTER] 使用缓存的菜单数据，菜单数量:', cachedMenu.length)
                try {
                    // 使用缓存的菜单数据生成路由
                    const sanitizedMenu = sanitizeMenuComponents(cachedMenu)
                    if (sanitizedMenu !== cachedMenu) {
                        Vue.ls.set('MENU', sanitizedMenu)
                    }
                    let routesToUse = generateIndexRouter(sanitizedMenu)

                    // 设置permissionList，确保路由守卫能正确识别
                    store.commit('SET_PERMISSIONLIST', sanitizedMenu)

                    store.dispatch('UpdateAppRouter', { constRoutes: routesToUse }).then(() => {
                        console.log('[ROUTER] 路由已更新到store（使用缓存）')

                        // 使用新的 addRoute 方法，避免重复添加
                        addRoutesSafely(store.getters.addRouters)

                        // 确定跳转目标
                        let redirect = decodeURIComponent(from.query.redirect || to.path)

                        // 防止重定向回登录页
                        if (redirect === '/user/login' || redirect.includes('/user/login')) {
                            redirect = resolveAuthenticatedHomePath()
                        }

                        // 如果目标路径是首页，根据用户类型跳转到相应页面
                        if (redirect === '/' || redirect === '/home') {
                            const userType = store.getters.userType
                            const userRole = store.getters.userRole || []

                            if (userType === 'student' || userRole.includes('student')) {
                                redirect = '/student/home'
                            } else {
                                redirect = resolveAuthenticatedHomePath()
                            }
                        }

                        console.log('[ROUTER] 使用缓存菜单，跳转到:', redirect)

                        // 【关键】动态路由添加后，必须重新导航才能正确匹配
                        isLoadingRoutes = false
                        next({ ...to, replace: true })
                    }).catch((error) => {
                        console.error('[ROUTER] 使用缓存菜单更新路由失败:', error)
                        isLoadingRoutes = false
                        // 即使使用缓存失败，也尝试调用API
                        fetchPermissionList()
                    })
                } catch (error) {
                    console.warn('[ROUTER] 使用缓存菜单失败，尝试API获取:', error)
                    fetchPermissionList()
                }
            } else {
                // 没有缓存，调用API获取
                console.log('[ROUTER] 没有缓存菜单，调用API获取')
                fetchPermissionList()
            }

            // eslint-disable-next-line no-inner-declarations
            function fetchPermissionList () {
                console.log('[ROUTER] 开始获取权限列表...')

                // 设置超时，防止无限等待
                const timeout = setTimeout(() => {
                    console.warn('[ROUTER] 权限获取超时，允许访问当前页面')
                    next()
                }, 10000) // 10秒超时

                store.dispatch('GetPermissionList').then(res => {
                    clearTimeout(timeout)
                    console.log('[ROUTER] 权限列表获取成功:', res)

                    const rawMenu = res && res.result && res.result.menu
                    const menuData = sanitizeMenuComponents(rawMenu || [])
                    if (menuData.length > 0) {
                        Vue.ls.set('MENU', menuData)
                    }

                    if (!menuData || menuData.length === 0) {
                        console.warn('[ROUTER] 没有菜单数据，允许访问但可能无法导航')
                        // 即使没有菜单数据，也允许访问（可能是首次登录或权限问题）
                        // 让用户先进入当前页面，后续路由跳转会触发重新加载
                        next()
                        return
                    }

                    // 使用菜单数据生成路由
                    console.log('[ROUTER] 生成路由，菜单数量:', menuData.length)
                    let routesToUse = generateIndexRouter(menuData)

                    // 添加主界面路由
                    store.dispatch('UpdateAppRouter', { constRoutes: routesToUse }).then(() => {
                        console.log('[ROUTER] 路由已更新到store')

                        // 动态添加可访问路由表，使用新的方法避免重复
                        addRoutesSafely(store.getters.addRouters)

                        // 确定跳转目标
                        let redirect = decodeURIComponent(from.query.redirect || to.path)

                        // 防止重定向回登录页
                        if (redirect === '/user/login' || redirect.includes('/user/login')) {
                            redirect = resolveAuthenticatedHomePath()
                        }

                        // 如果目标路径是根路径，根据用户类型跳转到相应页面
                        // 但允许用户访问 /home 和 /index（公共首页）
                        if (redirect === '/') {
                            const userType = store.getters.userType
                            const userRole = store.getters.userRole || []

                            console.log('[ROUTER] 确定跳转目标，用户类型:', userType, '角色:', userRole)

                            if (userType === 'student' || userRole.includes('student')) {
                                redirect = '/student/home'
                            } else {
                                redirect = resolveAuthenticatedHomePath()
                            }
                        }

                        console.log('[ROUTER] 最终跳转目标:', redirect, '当前路径:', to.path)

                        // 【关键】动态路由添加后，必须重新导航才能正确匹配
                        // 使用 next({ ...to, replace: true }) 会触发路由重新解析
                        isLoadingRoutes = false
                        next({ ...to, replace: true })
                    }).catch((error) => {
                        clearTimeout(timeout)
                        console.error('[ROUTER] 更新路由失败:', error)
                        isLoadingRoutes = false
                        // 即使更新路由失败，也允许访问
                        next()
                    })
                }).catch((error) => {
                    clearTimeout(timeout)
                    console.error('[ROUTER] 权限获取失败:', error)
                    isLoadingRoutes = false
                    // 权限获取失败，但不清除token（可能是网络问题），允许用户继续访问
                    // 如果token真的无效，会在API请求时被拦截
                    next()
                })
            }
        } else {
            // 路由已加载，直接通过
            next()
        }
    } else {
        if (whiteList.indexOf(to.path) !== -1) {
            // 在免登录白名单，直接进入
            next()
        } else {
            // 未登录用户跳转到首页登录，不进行自动登录
            next({ path: '/portal/home', query: { redirect: to.fullPath } })
            NProgress.done()
        }
    }
})

router.afterEach(() => {
    NProgress.done() // finish progress bar
})
