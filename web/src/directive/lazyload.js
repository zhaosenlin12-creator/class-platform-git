/**
 * 图片懒加载指令
 * 使用IntersectionObserver实现高性能懒加载
 *
 * 使用方式:
 * <img v-lazy="imageUrl" alt="描述" />
 */

const LazyLoad = {
    install (Vue) {
        Vue.directive('lazy', {
            inserted (el, binding) {
                // 检查浏览器支持
                if (!('IntersectionObserver' in window)) {
                    // 降级处理: 直接加载
                    el.src = binding.value
                    return
                }

                // 创建观察器
                const observer = new IntersectionObserver(
                    (entries) => {
                        entries.forEach((entry) => {
                            if (entry.isIntersecting) {
                                // 元素进入视口
                                const img = entry.target
                                const src = binding.value

                                // 加载图片
                                img.src = src

                                // 加载成功后添加类名(可用于淡入动画)
                                img.onload = () => {
                                    img.classList.add('loaded')
                                }

                                // 加载失败处理
                                img.onerror = () => {
                                    img.classList.add('error')
                                    // 使用默认占位图
                                    img.src = '/img/placeholder.png'
                                }

                                // 停止观察
                                observer.unobserve(img)
                            }
                        })
                    },
                    {
                        // 提前200px开始加载
                        rootMargin: '200px',
                        threshold: 0.01
                    }
                )

                // 开始观察
                observer.observe(el)

                // 保存observer,用于组件销毁时清理
                el._lazyLoadObserver = observer
            },

            // 组件销毁时清理observer
            unbind (el) {
                if (el._lazyLoadObserver) {
                    el._lazyLoadObserver.disconnect()
                    delete el._lazyLoadObserver
                }
            }
        })
    }
}

export default LazyLoad
