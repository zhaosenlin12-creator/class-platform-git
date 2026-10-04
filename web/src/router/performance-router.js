/**
 * 性能优化路由配置 - 实现路由级别的懒加载和预加载策略
 */
import { lazyLoad, preloadManager } from '@/utils/LazyLoader'

// 路由性能监控中间件
const routePerformanceMiddleware = (to, from, next) => {
    const startTime = performance.now()

    // 标记路由加载开始
    if (window.performance && window.performance.mark) {
        performance.mark(`route-${to.name}-start`)
    }

    // 预加载相关路由
    const preloadRoutes = getPreloadRoutesForCurrentRoute(to.name)
    preloadRoutes.forEach(route => {
        preloadManager.preloadRoute(route)
    })

    next()

    // 路由加载完成后的性能记录
    Vue.nextTick(() => {
        const endTime = performance.now()
        const loadTime = endTime - startTime

        if (window.performance && window.performance.mark) {
            performance.mark(`route-${to.name}-end`)
            performance.measure(`route-${to.name}-load-time`, `route-${to.name}-start`, `route-${to.name}-end`)
        }

        // 发送性能数据到监控系统
        if (window.performanceMonitor) {
            window.performanceMonitor.trackRouteLoad(to.name, loadTime)
        }
    })
}

// 获取当前路由应该预加载的相关路由
const getPreloadRoutesForCurrentRoute = (routeName) => {
    const preloadMap = {
        'Dashboard': ['teaching/CourseList', 'teaching/StudentList'],
        'CourseList': ['teaching/CourseDetail', 'teaching/ExamList'],
        'StudentList': ['teaching/StudentDetail', 'teaching/AssignmentList'],
        'TeacherDashboard': ['teaching/ClassList', 'teaching/CourseManagement']
    }

    return preloadMap[routeName] || []
}

// 性能优化的路由配置
export const performanceRoutes = [
    {
        path: '/performance',
        name: 'Performance',
        component: lazyLoad('performance/PerformanceCenter'),
        meta: {
            title: '性能中心',
            keepAlive: true,
            permission: ['admin', 'teacher']
        },
        beforeEnter: routePerformanceMiddleware,
        children: [
            {
                path: 'dashboard',
                name: 'PerformanceDashboard',
                component: lazyLoad('performance/Dashboard'),
                meta: {
                    title: '性能监控',
                    preload: ['performance/BundleAnalyzer', 'performance/LoadTest']
                }
            },
            {
                path: 'bundle-analyzer',
                name: 'BundleAnalyzer',
                component: lazyLoad('performance/BundleAnalyzer'),
                meta: {
                    title: 'Bundle分析',
                    permission: ['admin']
                }
            },
            {
                path: 'load-test',
                name: 'LoadTest',
                component: lazyLoad('performance/LoadTest'),
                meta: {
                    title: '负载测试',
                    permission: ['admin']
                }
            },
            {
                path: 'optimization',
                name: 'OptimizationReport',
                component: lazyLoad('performance/OptimizationReport'),
                meta: {
                    title: '优化报告',
                    permission: ['admin']
                }
            }
        ]
    }
]

// 教学系统优化路由
export const optimizedTeachingRoutes = [
    {
        path: '/teaching-optimized',
        name: 'TeachingOptimized',
        component: lazyLoad('teaching/OptimizedTeachingCenter'),
        meta: {
            title: '优化教学系统',
            keepAlive: true
        },
        beforeEnter: routePerformanceMiddleware,
        children: [
            {
                path: 'courses',
                name: 'OptimizedCourseList',
                component: lazyLoad('teaching/OptimizedCourseList'),
                meta: {
                    title: '优化课程列表',
                    keepAlive: true,
                    preload: ['teaching/CourseDetail']
                }
            },
            {
                path: 'virtual-classroom',
                name: 'VirtualClassroom',
                component: lazyLoad('teaching/VirtualClassroom'),
                meta: {
                    title: '虚拟教室',
                    keepAlive: true
                }
            },
            {
                path: 'performance-monitor',
                name: 'TeachingPerformanceMonitor',
                component: lazyLoad('teaching/PerformanceMonitor'),
                meta: {
                    title: '教学性能监控',
                    permission: ['admin', 'teacher']
                }
            }
        ]
    }
]

// 路由级别的缓存策略
export const routeCacheConfig = {
    // 需要缓存的路由
    keepAliveRoutes: [
        'CourseList',
        'StudentList',
        'OptimizedCourseList',
        'Dashboard',
        'PerformanceDashboard'
    ],

    // 缓存排除列表
    excludeCache: [
        'Login',
        'LoadTest',
        'BundleAnalyzer'
    ],

    // 缓存清理策略
    cacheCleanup: {
        maxCacheSize: 20,
        cleanupInterval: 300000, // 5分钟清理一次
        inactiveTimeout: 600000 // 10分钟未使用则清理
    }
}

// 路由预取策略
export const routePrefetchConfig = {
    // 立即预取的关键路由
    immediate: [
        'teaching/CourseList',
        'teaching/StudentList',
        'dashboard/Dashboard'
    ],

    // 空闲时预取的路由
    idle: [
        'teaching/ExamList',
        'teaching/AssignmentList',
        'profile/UserProfile'
    ],

    // 基于用户行为预取的路由
    behavioral: {
        'CourseList': ['teaching/CourseDetail', 'teaching/ExamCreate'],
        'StudentList': ['teaching/StudentDetail', 'teaching/GradeManagement'],
        'Dashboard': ['teaching/ClassOverview', 'monitor/SystemStatus']
    }
}

export default {
    performanceRoutes,
    optimizedTeachingRoutes,
    routeCacheConfig,
    routePrefetchConfig,
    routePerformanceMiddleware
}
