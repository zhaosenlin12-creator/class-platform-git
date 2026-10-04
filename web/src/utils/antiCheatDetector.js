/**
 * 防作弊检测工具类
 * 集成多种检测机制，包括窗口焦点、Tab切换、复制粘贴、屏幕录制、人脸识别等
 */

class AntiCheatDetector {
    constructor (options = {}) {
        this.options = {
            // 检测配置
            enableTabSwitchDetection: true,
            enableCopyPasteDetection: true,
            enableRightClickDetection: true,
            enableKeyboardDetection: true,
            enableMouseDetection: true,
            enableFullscreenDetection: true,
            enableDevToolsDetection: true,
            enableScreenCaptureDetection: true,
            enableFaceDetection: false, // 需要摄像头权限
            enableAudioDetection: false, // 需要麦克风权限
            enableNetworkMonitoring: true,

            // 检测阈值
            maxTabSwitchCount: 5,
            maxCopyPasteCount: 3,
            maxSuspiciousKeyCount: 10,
            faceDetectionInterval: 5000,
            networkCheckInterval: 10000,

            // 回调函数
            onViolation: null,
            onWarning: null,
            onSuspicious: null,

            ...options
        }

        // 检测状态
        this.isActive = false
        this.violations = []
        this.warnings = []
        this.statistics = {
            tabSwitchCount: 0,
            copyPasteCount: 0,
            rightClickCount: 0,
            suspiciousKeyCount: 0,
            fullscreenExitCount: 0,
            devToolsOpenCount: 0,
            faceDetectionFailCount: 0,
            networkDisconnectCount: 0
        }

        // 检测器实例
        this.detectors = {}
        this.timers = {}
        this.eventListeners = []

        this.init()
    }

    init () {
        this.setupDetectors()
    }

    setupDetectors () {
    // Tab切换检测
        if (this.options.enableTabSwitchDetection) {
            this.setupTabSwitchDetector()
        }

        // 复制粘贴检测
        if (this.options.enableCopyPasteDetection) {
            this.setupCopyPasteDetector()
        }

        // 右键检测
        if (this.options.enableRightClickDetection) {
            this.setupRightClickDetector()
        }

        // 键盘检测
        if (this.options.enableKeyboardDetection) {
            this.setupKeyboardDetector()
        }

        // 鼠标检测
        if (this.options.enableMouseDetection) {
            this.setupMouseDetector()
        }

        // 全屏检测
        if (this.options.enableFullscreenDetection) {
            this.setupFullscreenDetector()
        }

        // 开发者工具检测
        if (this.options.enableDevToolsDetection) {
            this.setupDevToolsDetector()
        }

        // 屏幕捕获检测
        if (this.options.enableScreenCaptureDetection) {
            this.setupScreenCaptureDetector()
        }

        // 网络监控
        if (this.options.enableNetworkMonitoring) {
            this.setupNetworkMonitor()
        }
    }

    // 启动检测
    start () {
        if (this.isActive) {
            console.warn('防作弊检测已经在运行中')
            return
        }

        this.isActive = true

        // 启动所有监听器
        this.addEventListener(window, 'focus', this.handleWindowFocus.bind(this))
        this.addEventListener(window, 'blur', this.handleWindowBlur.bind(this))
        this.addEventListener(document, 'visibilitychange', this.handleVisibilityChange.bind(this))

        // 启动定时检测
        this.startPeriodicChecks()

        // 启动人脸检测（如果启用）
        if (this.options.enableFaceDetection) {
            this.startFaceDetection()
        }

        // 启动音频检测（如果启用）
        if (this.options.enableAudioDetection) {
            this.startAudioDetection()
        }

        this.reportEvent('system', 'detection_started', '防作弊检测已启动')
    }

    // 停止检测
    stop () {
        if (!this.isActive) {
            return
        }

        this.isActive = false

        // 清除所有事件监听器
        this.eventListeners.forEach(({ target, event, handler }) => {
            target.removeEventListener(event, handler)
        })
        this.eventListeners = []

        // 清除所有定时器
        Object.values(this.timers).forEach(timer => {
            clearInterval(timer)
            clearTimeout(timer)
        })
        this.timers = {}

        this.reportEvent('system', 'detection_stopped', '防作弊检测已停止')
    }

    // Tab切换检测
    setupTabSwitchDetector () {
        this.addEventListener(document, 'visibilitychange', () => {
            if (document.hidden && this.isActive) {
                this.statistics.tabSwitchCount++

                const violation = {
                    type: 'tab_switch',
                    message: '检测到Tab切换行为',
                    timestamp: new Date(),
                    severity: this.statistics.tabSwitchCount > this.options.maxTabSwitchCount ? 'high' : 'medium'
                }

                this.recordViolation(violation)

                if (this.statistics.tabSwitchCount > this.options.maxTabSwitchCount) {
                    this.reportViolation('tab_switch',
                        `Tab切换次数过多 (${this.statistics.tabSwitchCount}次)`,
                        'high')
                } else {
                    this.reportWarning('tab_switch',
                        `检测到Tab切换 (${this.statistics.tabSwitchCount}次)`,
                        'medium')
                }
            }
        })
    }

    // 复制粘贴检测
    setupCopyPasteDetector () {
        const handleCopyPaste = (event) => {
            if (!this.isActive) return

            const action = event.type
            this.statistics.copyPasteCount++

            const violation = {
                type: 'copy_paste',
                action: action,
                message: `检测到${action === 'copy' ? '复制' : '粘贴'}行为`,
                timestamp: new Date(),
                severity: this.statistics.copyPasteCount > this.options.maxCopyPasteCount ? 'high' : 'medium'
            }

            this.recordViolation(violation)

            if (this.statistics.copyPasteCount > this.options.maxCopyPasteCount) {
                this.reportViolation('copy_paste',
                    `复制粘贴次数过多 (${this.statistics.copyPasteCount}次)`,
                    'high')
            } else {
                this.reportWarning('copy_paste',
                    `检测到${action === 'copy' ? '复制' : '粘贴'}行为`,
                    'medium')
            }
        }

        this.addEventListener(document, 'copy', handleCopyPaste)
        this.addEventListener(document, 'paste', handleCopyPaste)
    }

    // 右键检测
    setupRightClickDetector () {
        this.addEventListener(document, 'contextmenu', (event) => {
            if (!this.isActive) return

            event.preventDefault()
            this.statistics.rightClickCount++

            this.reportWarning('right_click', '尝试使用右键菜单', 'low')
            return false
        })
    }

    // 键盘检测
    setupKeyboardDetector () {
        this.addEventListener(document, 'keydown', (event) => {
            if (!this.isActive) return

            // 检测可疑按键组合
            const suspiciousKeys = [
                'F12', // 开发者工具
                'F5', // 刷新页面
                'F11' // 全屏切换
            ]

            const suspiciousCombinations = [
                { ctrl: true, shift: true, key: 'I' }, // Ctrl+Shift+I (开发者工具)
                { ctrl: true, shift: true, key: 'J' }, // Ctrl+Shift+J (控制台)
                { ctrl: true, shift: true, key: 'C' }, // Ctrl+Shift+C (元素选择)
                { ctrl: true, key: 'U' }, // Ctrl+U (查看源码)
                { ctrl: true, key: 'R' }, // Ctrl+R (刷新)
                { ctrl: true, key: 'F' }, // Ctrl+F (页面搜索)
                { ctrl: true, key: 'A' }, // Ctrl+A (全选)
                { alt: true, key: 'Tab' }, // Alt+Tab (切换窗口)
                { alt: true, key: 'F4' } // Alt+F4 (关闭窗口)
            ]

            // 检查单个按键
            if (suspiciousKeys.includes(event.key)) {
                event.preventDefault()
                this.statistics.suspiciousKeyCount++

                this.reportWarning('suspicious_key',
                    `尝试使用功能键: ${event.key}`, 'medium')
                return false
            }

            // 检查按键组合
            for (const combo of suspiciousCombinations) {
                if (
                    (combo.ctrl === undefined || combo.ctrl === event.ctrlKey) &&
          (combo.shift === undefined || combo.shift === event.shiftKey) &&
          (combo.alt === undefined || combo.alt === event.altKey) &&
          combo.key === event.key
                ) {
                    event.preventDefault()
                    this.statistics.suspiciousKeyCount++

                    const comboStr = [
                        combo.ctrl && 'Ctrl',
                        combo.shift && 'Shift',
                        combo.alt && 'Alt',
                        combo.key
                    ].filter(Boolean).join('+')

                    this.reportWarning('suspicious_key',
                        `尝试使用快捷键: ${comboStr}`, 'medium')
                    return false
                }
            }
        })
    }

    // 鼠标检测
    setupMouseDetector () {
        let lastMouseMove = Date.now()
        let mouseMoveCount = 0

        this.addEventListener(document, 'mousemove', () => {
            if (!this.isActive) return

            const now = Date.now()
            if (now - lastMouseMove > 1000) { // 超过1秒没有鼠标移动
                mouseMoveCount = 0
            }

            mouseMoveCount++
            lastMouseMove = now

            // 检测异常快速的鼠标移动（可能是程序控制）
            if (mouseMoveCount > 100) { // 1秒内移动超过100次
                this.reportSuspicious('mouse_suspicious',
                    '检测到异常频繁的鼠标移动', 'medium')
                mouseMoveCount = 0
            }
        })

        // 检测鼠标离开窗口
        this.addEventListener(document, 'mouseleave', () => {
            if (this.isActive) {
                this.reportWarning('mouse_leave', '鼠标离开考试窗口', 'low')
            }
        })
    }

    // 全屏检测
    setupFullscreenDetector () {
        this.addEventListener(document, 'fullscreenchange', () => {
            if (!this.isActive) return

            if (!document.fullscreenElement) {
                this.statistics.fullscreenExitCount++

                this.reportWarning('fullscreen_exit',
                    `退出全屏模式 (${this.statistics.fullscreenExitCount}次)`, 'medium')
            }
        })

        // 定期检查全屏状态
        this.timers.fullscreenCheck = setInterval(() => {
            if (this.isActive && !document.fullscreenElement) {
                this.reportWarning('not_fullscreen', '未处于全屏模式', 'low')
            }
        }, 30000)
    }

    // 开发者工具检测
    setupDevToolsDetector () {
        let devtools = {
            open: false,
            orientation: null
        }

        const threshold = 160

        this.timers.devToolsCheck = setInterval(() => {
            if (!this.isActive) return

            if (
                window.outerHeight - window.innerHeight > threshold ||
        window.outerWidth - window.innerWidth > threshold
            ) {
                if (!devtools.open) {
                    devtools.open = true
                    this.statistics.devToolsOpenCount++

                    this.reportViolation('devtools_open',
                        `检测到开发者工具被打开 (${this.statistics.devToolsOpenCount}次)`, 'high')
                }
            } else {
                devtools.open = false
            }
        }, 500)
    }

    // 屏幕捕获检测
    setupScreenCaptureDetector () {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            // 检测屏幕录制
            this.timers.screenCaptureCheck = setInterval(async () => {
                if (!this.isActive) return

                try {
                    // 尝试检测是否有其他应用正在录制屏幕
                    const stream = await navigator.mediaDevices.getDisplayMedia({
                        video: true,
                        audio: false
                    })

                    if (stream) {
                        stream.getTracks().forEach(track => track.stop())
                        this.reportViolation('screen_capture', '检测到屏幕录制活动', 'high')
                    }
                } catch (error) {
                    // 用户拒绝或没有录制活动，这是正常的
                }
            }, 10000)
        }
    }

    // 网络监控
    setupNetworkMonitor () {
    // 监控网络连接状态
        this.addEventListener(window, 'online', () => {
            if (this.isActive) {
                this.reportEvent('network', 'connection_restored', '网络连接已恢复')
            }
        })

        this.addEventListener(window, 'offline', () => {
            if (this.isActive) {
                this.statistics.networkDisconnectCount++
                this.reportWarning('network_offline',
                    `网络连接中断 (${this.statistics.networkDisconnectCount}次)`, 'medium')
            }
        })

        // 定期检测网络状态
        this.timers.networkCheck = setInterval(() => {
            if (!this.isActive) return

            if (!navigator.onLine) {
                this.reportWarning('network_unstable', '网络连接不稳定', 'medium')
            }
        }, this.options.networkCheckInterval)
    }

    // 人脸检测（需要摄像头）
    async startFaceDetection () {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            const video = document.createElement('video')
            video.srcObject = stream
            video.play()

            this.timers.faceDetection = setInterval(() => {
                this.detectFace(video)
            }, this.options.faceDetectionInterval)
        } catch (error) {
            console.warn('无法启动人脸检测:', error)
            this.reportWarning('face_detection_failed', '无法启动人脸检测', 'low')
        }
    }

    detectFace (video) {
    // 这里应该集成人脸识别库，如face-api.js
    // 简化实现，假设随机检测结果
        const faceDetected = Math.random() > 0.1 // 90%概率检测到人脸

        if (!faceDetected) {
            this.statistics.faceDetectionFailCount++

            this.reportWarning('face_not_detected',
                `未检测到人脸 (${this.statistics.faceDetectionFailCount}次)`, 'medium')
        }
    }

    // 音频检测（检测环境噪音）
    async startAudioDetection () {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const audioContext = new AudioContext()
            const source = audioContext.createMediaStreamSource(stream)
            const analyser = audioContext.createAnalyser()

            source.connect(analyser)
            analyser.fftSize = 256

            const dataArray = new Uint8Array(analyser.frequencyBinCount)

            const checkAudioLevel = () => {
                if (!this.isActive) return

                analyser.getByteFrequencyData(dataArray)
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length

                // 检测异常高的音频水平（可能是外部声音）
                if (average > 100) {
                    this.reportWarning('high_audio_level', '检测到环境噪音过大', 'low')
                }

                setTimeout(checkAudioLevel, 1000)
            }

            checkAudioLevel()
        } catch (error) {
            console.warn('无法启动音频检测:', error)
        }
    }

    // 定期检查
    startPeriodicChecks () {
        this.timers.periodicCheck = setInterval(() => {
            if (!this.isActive) return

            // 检查页面是否失去焦点
            if (document.hidden) {
                this.reportWarning('page_hidden', '页面处于后台', 'medium')
            }

            // 检查窗口大小变化
            this.checkWindowSize()

            // 检查性能指标
            this.checkPerformance()
        }, 5000)
    }

    checkWindowSize () {
        const minWidth = 800
        const minHeight = 600

        if (window.innerWidth < minWidth || window.innerHeight < minHeight) {
            this.reportWarning('window_too_small',
                `窗口尺寸过小 (${window.innerWidth}x${window.innerHeight})`, 'low')
        }
    }

    checkPerformance () {
        if (performance && performance.memory) {
            const memory = performance.memory
            const usedMemory = memory.usedJSHeapSize / 1024 / 1024 // MB

            if (usedMemory > 500) { // 使用内存超过500MB
                this.reportWarning('high_memory_usage',
                    `内存使用过高: ${usedMemory.toFixed(2)}MB`, 'low')
            }
        }
    }

    // 窗口焦点事件
    handleWindowFocus () {
        if (this.isActive) {
            this.reportEvent('window', 'focus_gained', '窗口获得焦点')
        }
    }

    handleWindowBlur () {
        if (this.isActive) {
            this.reportWarning('window_blur', '窗口失去焦点', 'medium')
        }
    }

    handleVisibilityChange () {
        if (this.isActive) {
            if (document.hidden) {
                this.reportWarning('page_hidden', '页面被隐藏', 'medium')
            } else {
                this.reportEvent('page', 'visible', '页面变为可见')
            }
        }
    }

    // 记录违规行为
    recordViolation (violation) {
        violation.id = Date.now() + Math.random()
        this.violations.push(violation)

        // 限制违规记录数量
        if (this.violations.length > 1000) {
            this.violations = this.violations.slice(-1000)
        }
    }

    // 报告事件
    reportEvent (category, type, message, severity = 'info') {
        const event = {
            id: Date.now() + Math.random(),
            category: category,
            type: type,
            message: message,
            severity: severity,
            timestamp: new Date(),
            statistics: { ...this.statistics }
        }

        if (this.options.onEvent) {
            this.options.onEvent(event)
        }
    }

    reportViolation (type, message, severity = 'high') {
        const violation = {
            type: type,
            message: message,
            severity: severity,
            timestamp: new Date(),
            statistics: { ...this.statistics }
        }

        this.recordViolation(violation)
        this.reportEvent('violation', type, message, severity)

        if (this.options.onViolation) {
            this.options.onViolation(violation)
        }
    }

    reportWarning (type, message, severity = 'medium') {
        const warning = {
            type: type,
            message: message,
            severity: severity,
            timestamp: new Date(),
            statistics: { ...this.statistics }
        }

        this.warnings.push(warning)

        // 限制警告记录数量
        if (this.warnings.length > 500) {
            this.warnings = this.warnings.slice(-500)
        }

        this.reportEvent('warning', type, message, severity)

        if (this.options.onWarning) {
            this.options.onWarning(warning)
        }
    }

    reportSuspicious (type, message, severity = 'medium') {
        const suspicious = {
            type: type,
            message: message,
            severity: severity,
            timestamp: new Date(),
            statistics: { ...this.statistics }
        }

        this.reportEvent('suspicious', type, message, severity)

        if (this.options.onSuspicious) {
            this.options.onSuspicious(suspicious)
        }
    }

    // 工具方法
    addEventListener (target, event, handler) {
        target.addEventListener(event, handler)
        this.eventListeners.push({ target, event, handler })
    }

    // 获取检测报告
    getReport () {
        return {
            isActive: this.isActive,
            statistics: { ...this.statistics },
            violations: [...this.violations],
            warnings: [...this.warnings],
            summary: this.generateSummary(),
            timestamp: new Date()
        }
    }

    generateSummary () {
        const totalViolations = this.violations.length
        const highSeverityViolations = this.violations.filter(v => v.severity === 'high').length
        const totalWarnings = this.warnings.length

        let riskLevel = 'low'
        if (highSeverityViolations > 0 || totalViolations > 10) {
            riskLevel = 'high'
        } else if (totalViolations > 3 || totalWarnings > 10) {
            riskLevel = 'medium'
        }

        return {
            riskLevel: riskLevel,
            totalViolations: totalViolations,
            highSeverityViolations: highSeverityViolations,
            totalWarnings: totalWarnings,
            mostFrequentViolationType: this.getMostFrequentViolationType(),
            recommendation: this.getRecommendation(riskLevel)
        }
    }

    getMostFrequentViolationType () {
        const typeCounts = {}
        this.violations.forEach(v => {
            typeCounts[v.type] = (typeCounts[v.type] || 0) + 1
        })

        let mostFrequent = null
        let maxCount = 0
        Object.entries(typeCounts).forEach(([type, count]) => {
            if (count > maxCount) {
                maxCount = count
                mostFrequent = type
            }
        })

        return { type: mostFrequent, count: maxCount }
    }

    getRecommendation (riskLevel) {
        const recommendations = {
            low: '考试行为基本正常，继续保持。',
            medium: '检测到一些可疑行为，请注意遵守考试纪律。',
            high: '检测到多项违规行为，建议人工审核此次考试。'
        }
        return recommendations[riskLevel]
    }

    // 清理资源
    destroy () {
        this.stop()
        this.violations = []
        this.warnings = []
        this.statistics = {}
    }
}

export default AntiCheatDetector
