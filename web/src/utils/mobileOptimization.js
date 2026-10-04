/**
 * 移动端优化工具类
 * 包含触摸优化、虚拟键盘适配、手势操作支持等
 */

export class MobileOptimization {
    constructor () {
        this.isTouch = 'ontouchstart' in window
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
        this.isAndroid = /Android/.test(navigator.userAgent)
        this.keyboardVisible = false
        this.originalViewportHeight = window.innerHeight

        this.init()
    }

    init () {
        this.setupViewportHandler()
        this.setupTouchOptimization()
        this.setupVirtualKeyboardAdaptation()
        this.setupGestureSupport()
    }

    // 视口处理
    setupViewportHandler () {
    // 禁用双击缩放
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault()
            }
        }, { passive: false })

        let lastTouchEnd = 0
        document.addEventListener('touchend', (e) => {
            const now = Date.now()
            if (now - lastTouchEnd <= 300) {
                e.preventDefault()
            }
            lastTouchEnd = now
        }, false)

        // 禁用长按选择
        document.addEventListener('selectstart', (e) => {
            if (this.isTouch) {
                e.preventDefault()
            }
        })
    }

    // 触摸优化
    setupTouchOptimization () {
    // 增加触摸目标大小
        const style = document.createElement('style')
        style.textContent = `
      @media (max-width: 768px) {
        .ant-btn {
          min-height: 44px !important;
          padding: 8px 16px !important;
        }

        .ant-input {
          min-height: 44px !important;
          padding: 8px 12px !important;
        }

        .ant-menu-item,
        .ant-menu-submenu-title {
          min-height: 48px !important;
          line-height: 48px !important;
        }

        .ant-table-thead > tr > th,
        .ant-table-tbody > tr > td {
          padding: 12px 8px !important;
        }

        .touch-target {
          min-height: 44px;
          min-width: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }
    `
        document.head.appendChild(style)
    }

    // 虚拟键盘适配
    setupVirtualKeyboardAdaptation () {
        let initialViewportHeight = window.innerHeight

        const handleResize = () => {
            const currentHeight = window.innerHeight
            const heightDifference = initialViewportHeight - currentHeight

            // 键盘可能显示的阈值（通常大于150px）
            if (heightDifference > 150) {
                this.keyboardVisible = true
                this.onKeyboardShow(heightDifference)
            } else {
                if (this.keyboardVisible) {
                    this.keyboardVisible = false
                    this.onKeyboardHide()
                }
            }
        }

        window.addEventListener('resize', handleResize)
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                initialViewportHeight = window.innerHeight
                handleResize()
            }, 500)
        })

        // iOS Safari 特殊处理
        if (this.isIOS) {
            this.setupIOSKeyboardFix()
        }
    }

    onKeyboardShow (keyboardHeight) {
        document.body.classList.add('keyboard-visible')

        // 调整固定定位元素
        const fixedElements = document.querySelectorAll('.ant-layout-footer, .floating-button')
        fixedElements.forEach(el => {
            el.style.bottom = `${keyboardHeight}px`
        })

        // 滚动到焦点输入框
        const activeElement = document.activeElement
        if (activeElement && activeElement.tagName === 'INPUT') {
            setTimeout(() => {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 300)
        }
    }

    onKeyboardHide () {
        document.body.classList.remove('keyboard-visible')

        // 恢复固定定位元素
        const fixedElements = document.querySelectorAll('.ant-layout-footer, .floating-button')
        fixedElements.forEach(el => {
            el.style.bottom = '0'
        })
    }

    setupIOSKeyboardFix () {
    // iOS Safari 虚拟键盘修复
        const inputs = document.querySelectorAll('input, textarea, select')

        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                setTimeout(() => {
                    window.scrollTo(0, 0)
                    document.body.scrollTop = 0
                }, 0)
            })

            input.addEventListener('blur', () => {
                setTimeout(() => {
                    window.scrollTo(0, 0)
                    document.body.scrollTop = 0
                }, 0)
            })
        })
    }

    // 手势操作支持
    setupGestureSupport () {
        let startX, startY, startTime
        let isScrolling

        document.addEventListener('touchstart', (e) => {
            const touch = e.touches[0]
            startX = touch.clientX
            startY = touch.clientY
            startTime = Date.now()
            isScrolling = undefined
        }, { passive: true })

        document.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) return

            const touch = e.touches[0]
            const deltaX = touch.clientX - startX
            const deltaY = touch.clientY - startY

            if (isScrolling === undefined) {
                isScrolling = Math.abs(deltaX) < Math.abs(deltaY)
            }

            // 水平滑动手势检测
            if (!isScrolling && Math.abs(deltaX) > 50) {
                this.handleSwipeGesture(deltaX > 0 ? 'right' : 'left', Math.abs(deltaX))
            }
        }, { passive: true })

        document.addEventListener('touchend', (e) => {
            if (!startTime) return

            const duration = Date.now() - startTime
            const touch = e.changedTouches[0]
            const deltaX = touch.clientX - startX
            const deltaY = touch.clientY - startY
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

            // 快速滑动检测
            if (duration < 300 && distance > 30) {
                const direction = Math.abs(deltaX) > Math.abs(deltaY)
                    ? (deltaX > 0 ? 'right' : 'left')
                    : (deltaY > 0 ? 'down' : 'up')

                this.handleSwipeGesture(direction, distance)
            }
        }, { passive: true })
    }

    handleSwipeGesture (direction, distance) {
    // 发送自定义事件供组件监听
        const event = new CustomEvent('swipegesture', {
            detail: { direction, distance }
        })
        document.dispatchEvent(event)

        // 侧边栏滑动操作
        if (direction === 'right' && distance > 100) {
            this.openSidebar()
        } else if (direction === 'left' && distance > 100) {
            this.closeSidebar()
        }
    }

    openSidebar () {
        const event = new CustomEvent('mobile:openSidebar')
        document.dispatchEvent(event)
    }

    closeSidebar () {
        const event = new CustomEvent('mobile:closeSidebar')
        document.dispatchEvent(event)
    }

    // 获取安全区域信息（iOS刘海屏等）
    getSafeAreaInsets () {
        const style = getComputedStyle(document.documentElement)
        return {
            top: parseInt(style.getPropertyValue('--sat') || '0'),
            right: parseInt(style.getPropertyValue('--sar') || '0'),
            bottom: parseInt(style.getPropertyValue('--sab') || '0'),
            left: parseInt(style.getPropertyValue('--sal') || '0')
        }
    }

    // 添加安全区域CSS变量
    setupSafeArea () {
        if (this.isIOS) {
            const style = document.createElement('style')
            style.textContent = `
        :root {
          --sat: env(safe-area-inset-top);
          --sar: env(safe-area-inset-right);
          --sab: env(safe-area-inset-bottom);
          --sal: env(safe-area-inset-left);
        }
      `
            document.head.appendChild(style)
        }
    }

    // 性能优化：减少重绘重排
    optimizePerformance () {
    // 启用硬件加速
        const style = document.createElement('style')
        style.textContent = `
      @media (max-width: 768px) {
        .ant-layout,
        .ant-layout-sider,
        .ant-layout-content {
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
        }

        .ant-drawer-content-wrapper {
          will-change: transform;
        }

        .page-transition-container {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
      }
    `
        document.head.appendChild(style)
    }

    // 禁用选择和拖拽（在某些场景下）
    disableSelection () {
        document.addEventListener('selectstart', (e) => e.preventDefault())
        document.addEventListener('dragstart', (e) => e.preventDefault())
    }

    // 启用选择和拖拽
    enableSelection () {
        document.removeEventListener('selectstart', (e) => e.preventDefault())
        document.removeEventListener('dragstart', (e) => e.preventDefault())
    }
}

// 单例模式
let mobileOptimization = null

export function initMobileOptimization () {
    if (!mobileOptimization) {
        mobileOptimization = new MobileOptimization()
    }
    return mobileOptimization
}

export function getMobileOptimization () {
    return mobileOptimization
}

// 检测设备类型的增强函数
export function detectDevice () {
    const userAgent = navigator.userAgent
    const isTablet = /iPad/.test(userAgent) ||
    (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1) ||
    /Android.*Tablet|Android.*Tab/.test(userAgent)

    const isMobile = /iPhone|iPod|Android.*Mobile/.test(userAgent) && !isTablet

    const screenWidth = window.innerWidth

    // 更精确的设备类型检测
    if (isMobile || screenWidth < 768) {
        return 'mobile'
    } else if (isTablet || (screenWidth >= 768 && screenWidth < 1024)) {
        return 'tablet'
    } else {
        return 'desktop'
    }
}

// Vue mixin for mobile optimization
export const mobileOptimizationMixin = {
    mounted () {
        if (this.isMobile()) {
            initMobileOptimization()
        }
    },
    methods: {
        isMobile () {
            return detectDevice() === 'mobile'
        },
        isTablet () {
            return detectDevice() === 'tablet'
        },
        isTouchDevice () {
            return 'ontouchstart' in window
        }
    }
}
