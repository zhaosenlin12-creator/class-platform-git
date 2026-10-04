/**
 * 前端性能监控工具
 * 用于监控页面性能指标，包括加载时间、渲染性能等
 *
 * @author Teaching-Open System
 * @since 2024
 */

/**
 * 性能监控类
 */
export class PerformanceMonitor {
    constructor (options = {}) {
        this.options = {
            enableConsoleLog: false,
            enableAnalytics: true,
            sampleRate: 1.0,
            ...options
        }

        this.metrics = {}
        this.observers = []
        this.timers = new Map()

        // 如果支持Performance API，则初始化监控
        if (typeof window !== 'undefined' && window.performance) {
            this.init()
        }
    }

    /**
   * 初始化性能监控
   */
    init () {
    // 监控页面加载性能
        this.monitorPageLoad()

        // 监控资源加载性能
        this.monitorResourceLoad()

        // 监控用户交互性能
        this.monitorUserInteraction()

        // 监控内存使用
        this.monitorMemoryUsage()

        // 监控长任务
        this.monitorLongTasks()
    }

    /**
   * 监控页面加载性能
   */
    monitorPageLoad () {
    // 使用 PerformanceObserver 监控导航时间
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries()
                entries.forEach(entry => {
                    if (entry.entryType === 'navigation') {
                        this.collectNavigationMetrics(entry)
                    }
                })
            })

            observer.observe({ entryTypes: ['navigation'] })
            this.observers.push(observer)
        } else {
            // 降级方案：使用 performance.timing
            window.addEventListener('load', () => {
                setTimeout(() => this.collectLegacyMetrics(), 0)
            })
        }
    }

    /**
   * 收集导航性能指标
   */
    collectNavigationMetrics (entry) {
        const metrics = {
            // DNS查询时间
            dnsTime: entry.domainLookupEnd - entry.domainLookupStart,
            // TCP连接时间
            tcpTime: entry.connectEnd - entry.connectStart,
            // SSL握手时间
            sslTime: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
            // 请求响应时间
            requestTime: entry.responseEnd - entry.requestStart,
            // DOM解析时间
            domParseTime: entry.domInteractive - entry.responseEnd,
            // 资源加载时间
            resourceTime: entry.loadEventStart - entry.domContentLoadedEventEnd,
            // 首次内容绘制
            fcp: this.getFCP(),
            // 最大内容绘制
            lcp: this.getLCP(),
            // 首次输入延迟
            fid: this.getFID(),
            // 累积布局偏移
            cls: this.getCLS()
        }

        this.metrics.pageLoad = metrics
        this.reportMetrics('pageLoad', metrics)
    }

    /**
   * 收集传统性能指标（兼容旧浏览器）
   */
    collectLegacyMetrics () {
        const timing = window.performance.timing
        const metrics = {
            dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
            tcpTime: timing.connectEnd - timing.connectStart,
            sslTime: timing.secureConnectionStart > 0 ? timing.connectEnd - timing.secureConnectionStart : 0,
            requestTime: timing.responseEnd - timing.requestStart,
            domParseTime: timing.domInteractive - timing.responseEnd,
            resourceTime: timing.loadEventStart - timing.domContentLoadedEventEnd,
            totalTime: timing.loadEventEnd - timing.navigationStart
        }

        this.metrics.pageLoad = metrics
        this.reportMetrics('pageLoad', metrics)
    }

    /**
   * 监控资源加载性能
   */
    monitorResourceLoad () {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries()
                entries.forEach(entry => {
                    this.collectResourceMetrics(entry)
                })
            })

            observer.observe({ entryTypes: ['resource'] })
            this.observers.push(observer)
        }
    }

    /**
   * 收集资源性能指标
   */
    collectResourceMetrics (entry) {
        const resourceMetrics = {
            name: entry.name,
            type: this.getResourceType(entry.name),
            duration: entry.duration,
            size: entry.transferSize || 0,
            startTime: entry.startTime,
            redirectTime: entry.redirectEnd - entry.redirectStart,
            dnsTime: entry.domainLookupEnd - entry.domainLookupStart,
            tcpTime: entry.connectEnd - entry.connectStart,
            requestTime: entry.responseEnd - entry.requestStart
        }

        if (!this.metrics.resources) {
            this.metrics.resources = []
        }
        this.metrics.resources.push(resourceMetrics)

        // 只报告慢资源
        if (entry.duration > 1000) {
            this.reportMetrics('slowResource', resourceMetrics)
        }
    }

    /**
   * 获取资源类型
   */
    getResourceType (url) {
        if (url.includes('.js')) return 'script'
        if (url.includes('.css')) return 'stylesheet'
        if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image'
        if (url.includes('/api/')) return 'api'
        return 'other'
    }

    /**
   * 监控用户交互性能
   */
    monitorUserInteraction () {
    // 监控点击响应时间
        document.addEventListener('click', (event) => {
            this.measureInteraction('click', event)
        }, true)

        // 监控输入响应时间
        document.addEventListener('input', (event) => {
            this.measureInteraction('input', event)
        }, true)
    }

    /**
   * 测量交互性能
   */
    measureInteraction (type, event) {
        const startTime = performance.now()

        // 使用 requestAnimationFrame 来测量到下一帧的时间
        requestAnimationFrame(() => {
            const endTime = performance.now()
            const duration = endTime - startTime

            const interactionMetrics = {
                type,
                duration,
                target: event.target.tagName || 'unknown',
                timestamp: Date.now()
            }

            if (!this.metrics.interactions) {
                this.metrics.interactions = []
            }
            this.metrics.interactions.push(interactionMetrics)

            // 只报告慢交互
            if (duration > 100) {
                this.reportMetrics('slowInteraction', interactionMetrics)
            }
        })
    }

    /**
   * 监控内存使用
   */
    monitorMemoryUsage () {
        if ('memory' in performance) {
            setInterval(() => {
                const memoryInfo = {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                    timestamp: Date.now()
                }

                this.metrics.memory = memoryInfo

                // 内存使用率超过80%时报告
                const usageRate = memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit
                if (usageRate > 0.8) {
                    this.reportMetrics('highMemoryUsage', memoryInfo)
                }
            }, 30000) // 每30秒检查一次
        }
    }

    /**
   * 监控长任务
   */
    monitorLongTasks () {
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries()
                    entries.forEach(entry => {
                        const longTaskMetrics = {
                            duration: entry.duration,
                            startTime: entry.startTime,
                            attribution: entry.attribution || []
                        }

                        if (!this.metrics.longTasks) {
                            this.metrics.longTasks = []
                        }
                        this.metrics.longTasks.push(longTaskMetrics)

                        this.reportMetrics('longTask', longTaskMetrics)
                    })
                })

                observer.observe({ entryTypes: ['longtask'] })
                this.observers.push(observer)
            } catch (e) {
                // longtask 不被所有浏览器支持
                console.warn('Long task monitoring not supported')
            }
        }
    }

    /**
   * 获取首次内容绘制时间 (FCP)
   */
    getFCP () {
        if ('PerformanceObserver' in window) {
            return new Promise((resolve) => {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries()
                    const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint')
                    if (fcpEntry) {
                        resolve(fcpEntry.startTime)
                        observer.disconnect()
                    }
                })
                observer.observe({ entryTypes: ['paint'] })
            })
        }
        return null
    }

    /**
   * 获取最大内容绘制时间 (LCP)
   */
    getLCP () {
        if ('PerformanceObserver' in window) {
            return new Promise((resolve) => {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries()
                    const lastEntry = entries[entries.length - 1]
                    resolve(lastEntry.startTime)
                })
                observer.observe({ entryTypes: ['largest-contentful-paint'] })

                // 3秒后停止观察
                setTimeout(() => {
                    observer.disconnect()
                }, 3000)
            })
        }
        return null
    }

    /**
   * 获取首次输入延迟 (FID)
   */
    getFID () {
        if ('PerformanceObserver' in window) {
            return new Promise((resolve) => {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries()
                    const fidEntry = entries[0]
                    if (fidEntry) {
                        resolve(fidEntry.processingStart - fidEntry.startTime)
                        observer.disconnect()
                    }
                })
                observer.observe({ entryTypes: ['first-input'] })
            })
        }
        return null
    }

    /**
   * 获取累积布局偏移 (CLS)
   */
    getCLS () {
        let clsValue = 0
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries()
                entries.forEach(entry => {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value
                    }
                })
            })
            observer.observe({ entryTypes: ['layout-shift'] })
        }
        return clsValue
    }

    /**
   * 开始计时
   */
    startTimer (name) {
        this.timers.set(name, performance.now())
    }

    /**
   * 结束计时
   */
    endTimer (name) {
        const startTime = this.timers.get(name)
        if (startTime) {
            const duration = performance.now() - startTime
            this.timers.delete(name)

            const timerMetrics = {
                name,
                duration,
                timestamp: Date.now()
            }

            if (!this.metrics.customTimers) {
                this.metrics.customTimers = []
            }
            this.metrics.customTimers.push(timerMetrics)

            this.reportMetrics('customTimer', timerMetrics)
            return duration
        }
        return null
    }

    /**
   * 报告性能指标
   */
    reportMetrics (type, metrics) {
        if (Math.random() > this.options.sampleRate) {
            return // 采样率控制
        }

        if (this.options.enableConsoleLog) {
        }

        if (this.options.enableAnalytics) {
            // 这里可以集成具体的分析服务
            this.sendToAnalytics(type, metrics)
        }
    }

    /**
   * 发送数据到分析服务
   */
    sendToAnalytics (type, metrics) {
    // 实际项目中可以替换为具体的分析服务API
        const data = {
            type,
            metrics,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
        }

        // 使用beacon API发送数据，确保页面卸载时数据不丢失
        if ('sendBeacon' in navigator) {
            navigator.sendBeacon('/api/analytics/performance', JSON.stringify(data))
        } else {
            // 降级方案
            fetch('/api/analytics/performance', {
                method: 'POST',
                body: JSON.stringify(data),
                headers: {
                    'Content-Type': 'application/json'
                },
                keepalive: true
            }).catch(() => {
                // 忽略发送失败的情况
            })
        }
    }

    /**
   * 获取所有性能指标
   */
    getAllMetrics () {
        return { ...this.metrics }
    }

    /**
   * 清理资源
   */
    destroy () {
        this.observers.forEach(observer => observer.disconnect())
        this.observers = []
        this.timers.clear()
        this.metrics = {}
    }
}

// 创建全局性能监控实例
export const globalPerformanceMonitor = new PerformanceMonitor({
    enableConsoleLog: process.env.NODE_ENV === 'development',
    enableAnalytics: process.env.NODE_ENV === 'production',
    sampleRate: 0.1 // 10%的采样率
})

// Vue插件形式安装
export const PerformanceMonitorPlugin = {
    install (Vue, options = {}) {
        const monitor = new PerformanceMonitor(options)

        // 添加到Vue原型，方便在组件中使用
        Vue.prototype.$perf = monitor

        // 监控路由切换性能
        Vue.mixin({
            beforeRouteEnter (to, from, next) {
                monitor.startTimer(`route:${to.path}`)
                next()
            },
            mounted () {
                if (this.$route) {
                    monitor.endTimer(`route:${this.$route.path}`)
                }
            }
        })
    }
}

export default PerformanceMonitor
