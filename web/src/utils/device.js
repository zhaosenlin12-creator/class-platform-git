import enquireJs from 'enquire.js'
import { detectDevice } from './mobileOptimization'

const enquireScreen = function (call) {
    // 使用增强的设备检测
    const deviceType = detectDevice()

    // 立即执行回调
    if (deviceType === 'mobile') {
        call && call(1)
    } else if (deviceType === 'tablet') {
        call && call(0)
    } else {
        call && call(-1)
    }

    // tablet breakpoint - 平板和小屏幕桌面
    const handler = {
        match: function () {
            const currentDevice = detectDevice()
            if (currentDevice === 'tablet') {
                call && call(0)
            }
        },
        unmatch: function () {
            const currentDevice = detectDevice()
            if (currentDevice === 'desktop') {
                call && call(-1)
            }
        }
    }

    // mobile breakpoint - 手机
    const handler2 = {
        match: () => {
            const currentDevice = detectDevice()
            if (currentDevice === 'mobile') {
                call && call(1)
            }
        },
        unmatch: () => {
            const currentDevice = detectDevice()
            if (currentDevice !== 'mobile') {
                // 当不是手机时，检查是否是平板
                const device = detectDevice()
                if (device === 'tablet') {
                    call && call(0)
                } else {
                    call && call(-1)
                }
            }
        }
    }

    // 注册媒体查询监听器
    // 平板断点：768px - 1024px
    enquireJs.register('screen and (min-width: 768px) and (max-width: 1087.99px)', handler)
    // 手机断点：< 768px
    enquireJs.register('screen and (max-width: 767.99px)', handler2)

    // 监听方向改变
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            const newDeviceType = detectDevice()
            if (newDeviceType === 'mobile') {
                call && call(1)
            } else if (newDeviceType === 'tablet') {
                call && call(0)
            } else {
                call && call(-1)
            }
        }, 100)
    })
}

export default enquireScreen
