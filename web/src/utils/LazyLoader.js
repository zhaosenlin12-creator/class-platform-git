/**
 * 懒加载工具类 - 优化Bundle大小和首屏加载
 */

// 路由懒加载
export const lazyLoad = (componentPath) => {
    return () => import(/* webpackChunkName: "[request]" */ `@/views/${componentPath}`)
}

// 组件懒加载
export const lazyComponent = (componentPath) => {
    return () => import(/* webpackChunkName: "component-[request]" */ `@/components/${componentPath}`)
}

// 第三方库懒加载
export const lazyLibrary = {
    // ECharts按需加载
    echarts: () => import(/* webpackChunkName: "echarts" */ 'echarts/core').then(echarts => {
    // 只导入需要的图表类型
        return import(/* webpackChunkName: "echarts-charts" */ 'echarts/charts').then(charts => {
            return import(/* webpackChunkName: "echarts-components" */ 'echarts/components').then(components => {
                return import(/* webpackChunkName: "echarts-renderers" */ 'echarts/renderers').then(renderers => {
                    // 注册必要的组件
                    echarts.use([
                        charts.LineChart,
                        charts.BarChart,
                        charts.PieChart,
                        components.TitleComponent,
                        components.TooltipComponent,
                        components.GridComponent,
                        components.DatasetComponent,
                        components.TransformComponent,
                        components.LegendComponent,
                        renderers.CanvasRenderer
                    ])
                    return echarts
                })
            })
        })
    }),

    // Moment.js替换为Day.js减少Bundle大小
    dayjs: () => import(/* webpackChunkName: "dayjs" */ 'dayjs').then(dayjs => {
        return import(/* webpackChunkName: "dayjs-plugins" */ 'dayjs/plugin/relativeTime').then(relativeTime => {
            dayjs.extend(relativeTime)
            return dayjs
        })
    }),

    // 文件上传组件
    uploader: () => import(/* webpackChunkName: "uploader" */ '@/components/upload/FileUploader.vue'),

    // 富文本编辑器
    editor: () => import(/* webpackChunkName: "editor" */ '@/components/editor/RichEditor.vue'),

    // PDF预览器
    pdfViewer: () => import(/* webpackChunkName: "pdf-viewer" */ '@/components/viewer/PDFViewer.vue')
}

// 预加载策略
export class PreloadManager {
    constructor () {
        this.preloadedChunks = new Set()
        this.observer = null
        this.init()
    }

    init () {
    // 关键路由预加载
        this.preloadCriticalRoutes()

        // 基于用户行为预加载
        this.setupIntersectionObserver()

        // 空闲时间预加载
        this.setupIdlePreload()
    }

    // 预加载关键路由
    preloadCriticalRoutes () {
        const criticalRoutes = [
            'dashboard/Dashboard',
            'teaching/CourseList',
            'teaching/StudentList'
        ]

        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                criticalRoutes.forEach(route => {
                    this.preloadRoute(route)
                })
            })
        }
    }

    // 预加载指定路由
    preloadRoute (routePath) {
        if (!this.preloadedChunks.has(routePath)) {
            this.preloadedChunks.add(routePath)
            lazyLoad(routePath)().catch(err => {
                console.warn(`Preload failed for route: ${routePath}`, err)
                this.preloadedChunks.delete(routePath)
            })
        }
    }

    // 设置交叉观察器进行预加载
    setupIntersectionObserver () {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const preloadTarget = entry.target.dataset.preload
                        if (preloadTarget && !this.preloadedChunks.has(preloadTarget)) {
                            this.preloadRoute(preloadTarget)
                        }
                    }
                })
            }, { rootMargin: '100px' })
        }
    }

    // 观察预加载目标
    observe (element) {
        if (this.observer && element) {
            this.observer.observe(element)
        }
    }

    // 停止观察
    unobserve (element) {
        if (this.observer && element) {
            this.observer.unobserve(element)
        }
    }

    // 空闲时间预加载
    setupIdlePreload () {
        if ('requestIdleCallback' in window) {
            const preloadQueue = [
                'teaching/ExamList',
                'teaching/AssignmentList',
                'profile/UserProfile',
                'settings/SystemSettings'
            ]

            const preloadNext = () => {
                if (preloadQueue.length > 0) {
                    const route = preloadQueue.shift()
                    this.preloadRoute(route)
                    requestIdleCallback(preloadNext)
                }
            }

            // 延迟开始预加载
            setTimeout(() => {
                requestIdleCallback(preloadNext)
            }, 3000)
        }
    }

    // 销毁
    destroy () {
        if (this.observer) {
            this.observer.disconnect()
            this.observer = null
        }
        this.preloadedChunks.clear()
    }
}

// 单例实例
export const preloadManager = new PreloadManager()

// 资源提示
export const addResourceHints = () => {
    const head = document.head

    // DNS预解析
    const dnsPrefetchLinks = [
        'https://cdn.jsdelivr.net',
        'https://unpkg.com',
        'https://fonts.googleapis.com'
    ]

    dnsPrefetchLinks.forEach(url => {
        const link = document.createElement('link')
        link.rel = 'dns-prefetch'
        link.href = url
        head.appendChild(link)
    })

    // 预连接关键资源
    const preconnectLinks = [
        'https://fonts.gstatic.com'
    ]

    preconnectLinks.forEach(url => {
        const link = document.createElement('link')
        link.rel = 'preconnect'
        link.href = url
        link.crossOrigin = 'anonymous'
        head.appendChild(link)
    })
}

// 性能监控
export const BundlePerformanceMonitor = {
    // 监控chunk加载时间
    trackChunkLoad (chunkName, startTime) {
        const endTime = performance.now()
        const loadTime = endTime - startTime

        // 发送性能数据
        if (window.performance && window.performance.mark) {
            performance.mark(`chunk-${chunkName}-loaded`)
            performance.measure(`chunk-${chunkName}-load-time`, `chunk-${chunkName}-start`, `chunk-${chunkName}-loaded`)
        }

        // 记录到监控系统
        this.reportToMonitoring({
            metric: 'chunk_load_time',
            chunk: chunkName,
            duration: loadTime,
            timestamp: Date.now()
        })
    },

    // 监控Bundle大小
    trackBundleSize () {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    if (entry.entryType === 'navigation') {
                        this.reportToMonitoring({
                            metric: 'bundle_transfer_size',
                            size: entry.transferSize,
                            timestamp: Date.now()
                        })
                    }
                })
            })
            observer.observe({ entryTypes: ['navigation'] })
        }
    },

    // 上报监控数据
    reportToMonitoring (data) {
    // 这里可以集成到现有的监控系统
        if (process.env.NODE_ENV === 'development') {
        }

    // 实际项目中可以发送到监控后端
    // fetch('/api/monitoring/performance', {
    //   method: 'POST',
    //   body: JSON.stringify(data)
    // });
    }
}
