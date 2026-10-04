/**
 * 懒加载工具类
 * 用于图片、组件等资源的懒加载，提升页面性能
 *
 * @author Teaching-Open System
 * @since 2024
 */

/**
 * 图片懒加载指令
 * 使用方式: v-lazy="imageUrl"
 */
export const lazyLoadDirective = {
    bind (el, binding) {
    // 创建 IntersectionObserver
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // 元素进入可视区域
                    const img = entry.target
                    const src = binding.value

                    // 创建新的图片对象来预加载
                    const newImg = new Image()
                    newImg.onload = () => {
                        // 图片加载成功后替换src
                        img.src = src
                        img.classList.remove('lazy-loading')
                        img.classList.add('lazy-loaded')
                    }
                    newImg.onerror = () => {
                        // 图片加载失败
                        img.classList.remove('lazy-loading')
                        img.classList.add('lazy-error')
                        // 可以设置默认错误图片
                        img.src = '/default-error.png'
                    }
                    newImg.src = src

                    // 停止观察该元素
                    observer.unobserve(img)
                }
            })
        }, {
            rootMargin: '50px' // 提前50px开始加载
        })

        // 设置初始状态
        el.classList.add('lazy-loading')
        el.src = binding.value || '/default-placeholder.png'

        // 开始观察
        observer.observe(el)

        // 将observer存储到元素上，便于解绑时使用
        el._observer = observer
    },
    unbind (el) {
    // 清理observer
        if (el._observer) {
            el._observer.disconnect()
            delete el._observer
        }
    }
}

/**
 * 组件懒加载函数
 * 用于路由组件的懒加载
 * @param {Function} importFunc - 动态import函数
 * @param {Object} options - 配置选项
 * @returns {Function} 异步组件
 */
export function lazyLoadComponent (importFunc, options = {}) {
    const {
        loading = null, // 加载中显示的组件
        error = null, // 加载失败显示的组件
        delay = 200, // 延迟显示loading的时间
        timeout = 10000 // 超时时间
    } = options

    return () => ({
        component: importFunc(),
        loading,
        error,
        delay,
        timeout
    })
}

/**
 * 路由懒加载函数
 * 简化版本的组件懒加载，专门用于路由
 * @param {Function} importFunc - 动态import函数
 * @returns {Function} 异步组件
 */
export function lazyLoadRoute (importFunc) {
    return () => importFunc()
}

/**
 * 图片预加载函数
 * @param {Array} imageUrls - 图片URL数组
 * @returns {Promise} 预加载Promise
 */
export function preloadImages (imageUrls) {
    const promises = imageUrls.map(url => {
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(url)
            img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
            img.src = url
        })
    })

    return Promise.allSettled(promises)
}

/**
 * 资源预加载类
 * 用于批量预加载各种资源
 */
export class ResourcePreloader {
    constructor () {
        this.cache = new Map()
        this.loading = new Set()
    }

    /**
   * 预加载图片
   * @param {string} url - 图片URL
   * @returns {Promise}
   */
    async loadImage (url) {
        if (this.cache.has(url)) {
            return this.cache.get(url)
        }

        if (this.loading.has(url)) {
            // 如果正在加载，等待完成
            return new Promise((resolve) => {
                const checkLoading = () => {
                    if (!this.loading.has(url)) {
                        resolve(this.cache.get(url))
                    } else {
                        setTimeout(checkLoading, 50)
                    }
                }
                checkLoading()
            })
        }

        this.loading.add(url)

        try {
            const image = await new Promise((resolve, reject) => {
                const img = new Image()
                img.onload = () => resolve(img)
                img.onerror = reject
                img.src = url
            })

            this.cache.set(url, image)
            this.loading.delete(url)
            return image
        } catch (error) {
            this.loading.delete(url)
            throw error
        }
    }

    /**
   * 预加载脚本
   * @param {string} url - 脚本URL
   * @returns {Promise}
   */
    async loadScript (url) {
        if (this.cache.has(url)) {
            return this.cache.get(url)
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = url
            script.onload = () => {
                this.cache.set(url, true)
                resolve()
            }
            script.onerror = reject
            document.head.appendChild(script)
        })
    }

    /**
   * 预加载CSS
   * @param {string} url - CSS URL
   * @returns {Promise}
   */
    async loadCSS (url) {
        if (this.cache.has(url)) {
            return this.cache.get(url)
        }

        return new Promise((resolve, reject) => {
            const link = document.createElement('link')
            link.rel = 'stylesheet'
            link.href = url
            link.onload = () => {
                this.cache.set(url, true)
                resolve()
            }
            link.onerror = reject
            document.head.appendChild(link)
        })
    }

    /**
   * 批量预加载资源
   * @param {Array} resources - 资源配置数组
   * @returns {Promise}
   */
    async loadResources (resources) {
        const promises = resources.map(resource => {
            const { type, url } = resource
            switch (type) {
            case 'image':
                return this.loadImage(url)
            case 'script':
                return this.loadScript(url)
            case 'css':
                return this.loadCSS(url)
            default:
                return Promise.resolve()
            }
        })

        return Promise.allSettled(promises)
    }

    /**
   * 清除缓存
   */
    clearCache () {
        this.cache.clear()
        this.loading.clear()
    }
}

// 创建全局预加载器实例
export const globalPreloader = new ResourcePreloader()

/**
 * 视口检测工具
 * 用于检测元素是否在视口内
 */
export class ViewportDetector {
    constructor (options = {}) {
        this.options = {
            rootMargin: '0px',
            threshold: 0.1,
            ...options
        }
        this.observers = new Map()
        this.callbacks = new Map()
    }

    /**
   * 观察元素
   * @param {Element} element - 要观察的元素
   * @param {Function} callback - 回调函数
   */
    observe (element, callback) {
        if (!element || typeof callback !== 'function') return

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    callback(entry.target, entry)
                }
            })
        }, this.options)

        observer.observe(element)
        this.observers.set(element, observer)
        this.callbacks.set(element, callback)
    }

    /**
   * 停止观察元素
   * @param {Element} element - 要停止观察的元素
   */
    unobserve (element) {
        const observer = this.observers.get(element)
        if (observer) {
            observer.unobserve(element)
            observer.disconnect()
            this.observers.delete(element)
            this.callbacks.delete(element)
        }
    }

    /**
   * 销毁所有观察者
   */
    destroy () {
        this.observers.forEach(observer => observer.disconnect())
        this.observers.clear()
        this.callbacks.clear()
    }
}

// 创建全局视口检测器实例
export const globalViewportDetector = new ViewportDetector()

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function} 防抖后的函数
 */
export function debounce (func, wait, immediate = false) {
    let timeout
    return function executedFunction (...args) {
        const later = () => {
            timeout = null
            if (!immediate) func.apply(this, args)
        }
        const callNow = immediate && !timeout
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
        if (callNow) func.apply(this, args)
    }
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 限制时间
 * @returns {Function} 节流后的函数
 */
export function throttle (func, limit) {
    let inThrottle
    return function executedFunction (...args) {
        if (!inThrottle) {
            func.apply(this, args)
            inThrottle = true
            setTimeout(() => inThrottle = false, limit)
        }
    }
}
