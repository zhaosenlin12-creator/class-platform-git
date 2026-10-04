/**
 * WebSocket服务类 - 基于Socket.io实现实时课堂互动
 * 支持教师-学生实时通信、代码同步、资源同步等功能
 */

import io from 'socket.io-client'
import { getStoredAccessToken, resolveSocketUrl, shouldAttachTokenToUrl } from './trustedApi'

class WebSocketService {
    constructor () {
        this.socket = null
        this.isConnected = false
        this.classroomId = null
        this.userInfo = {}

        // 事件监听器存储
        this.eventListeners = new Map()
    }

    /**
   * 连接Socket.io服务器
   * @param {string} classroomId - 课堂ID
   * @param {object} userInfo - 用户信息 {id, name, role}
   */
    connect (classroomId, userInfo) {
        return new Promise((resolve, reject) => {
            try {
                this.classroomId = classroomId
                this.userInfo = userInfo

                // Socket.io服务器地址（与API同一端口）
                const socketUrl = resolveSocketUrl()

                console.log(`🔌 [WebSocket] 尝试连接: ${socketUrl}`)
                console.log(`📚 [WebSocket] 课堂ID: ${classroomId}`)
                console.log(`👤 [WebSocket] 用户: ${userInfo.name} (${userInfo.role})`)
                const accessToken = getStoredAccessToken()
                const socketToken = shouldAttachTokenToUrl(socketUrl) ? accessToken : ''
                const sendSocketCredentials = shouldAttachTokenToUrl(socketUrl)

                if (accessToken && !socketToken) {
                    console.warn('[WebSocket] Skip token for untrusted socket target:', socketUrl)
                }

                // 创建Socket.io连接
                this.socket = io(socketUrl, {
                    auth: {
                        token: socketToken
                    },
                    withCredentials: sendSocketCredentials,
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 3000,
                    timeout: 10000
                })

                // 连接成功
                this.socket.on('connect', () => {
                    console.log('✅ [WebSocket] 连接成功:', this.socket.id)
                    this.isConnected = true

                    // 加入课堂房间
                    this.socket.emit('join-classroom', {
                        classroomId: this.classroomId,
                        userId: userInfo.id,
                        userName: userInfo.name,
                        userRole: userInfo.role
                    })

                    // 触发open事件
                    this.trigger('open', { socketId: this.socket.id })
                    resolve()
                })

                // 成功加入课堂
                this.socket.on('joined-classroom', (data) => {
                    console.log('✅ [WebSocket] 成功加入课堂:', data)
                })

                // 连接断开
                this.socket.on('disconnect', (reason) => {
                    console.log('⚠️ [WebSocket] 连接断开:', reason)
                    this.isConnected = false
                    this.trigger('close', { reason })
                })

                // 连接错误
                this.socket.on('connect_error', (error) => {
                    console.error('❌ [WebSocket] 连接错误:', error.message)
                    this.trigger('error', error)
                    reject(error)
                })

                // 重连
                this.socket.on('classroom-access-denied', (data) => {
                    console.warn('⚠ [WebSocket] Classroom access denied:', data)
                    this.trigger('classroom-access-denied', data)
                    this.trigger('error', data)
                })

                this.socket.on('classroom-action-denied', (data) => {
                    console.warn('⚠ [WebSocket] Classroom action denied:', data)
                    this.trigger('classroom-action-denied', data)
                })

                this.socket.on('reconnect', (attemptNumber) => {
                    console.log(`🔄 [WebSocket] 重连成功 (尝试${attemptNumber}次)`)
                    this.isConnected = true
                })

                // ========== 课堂事件监听 ==========

                // 学生加入
                this.socket.on('student-joined', (data) => {
                    console.log('👋 [WebSocket] 学生加入:', data.userName)
                    this.trigger('studentJoin', data)
                })

                // 学生离开
                this.socket.on('student-left', (data) => {
                    console.log('👋 [WebSocket] 学生离开:', data.userName)
                    this.trigger('studentLeave', data)
                })

                // 代码更新
                this.socket.on('code-updated', (data) => {
                    console.log('💻 [WebSocket] 收到代码更新')
                    this.trigger('code-sync', data)
                })

                // 聊天消息
                this.socket.on('chat-message', (data) => {
                    console.log('💬 [WebSocket] 收到聊天消息:', data.userName)
                    this.trigger('chat-message', data)
                    this.trigger('chatMessage', data) // 兼容旧版
                })

                // 举手
                this.socket.on('hand-raised', (data) => {
                    console.log('✋ [WebSocket] 学生举手:', data.userName)
                    this.trigger('handUp', data)
                })

                // 资源切换
                this.socket.on('resource-changed', (data) => {
                    console.log('📄 [WebSocket] 资源切换:', data.resourceName)
                    this.trigger('resource-change', data)
                })

                // 资源页码同步
                this.socket.on('resource-page-synced', (data) => {
                    console.log('📖 [WebSocket] 资源页码同步:', data.page)
                    this.trigger('resource-page-sync', data)
                })

                // 屏幕广播
                this.socket.on('broadcast-started', (data) => {
                    console.log('📺 [WebSocket] 开始屏幕广播')
                    this.trigger('broadcast-started', data)
                })

                this.socket.on('broadcast-stopped', (data) => {
                    console.log('📺 [WebSocket] 停止屏幕广播')
                    this.trigger('broadcast-stopped', data)
                })

                // 作品提交
                this.socket.on('work-submitted', (data) => {
                    console.log('📝 [WebSocket] 作品提交:', data.userName)
                    this.trigger('workSubmission', data)
                })

                // 问题回答
                this.socket.on('question-answered', (data) => {
                    console.log('💡 [WebSocket] 问题回答:', data.userName)
                    this.trigger('questionAnswer', data)
                })
            } catch (error) {
                console.error('❌ [WebSocket] 初始化失败:', error)
                reject(error)
            }
        })
    }

    /**
   * 断开连接
   */
    disconnect () {
        if (this.socket) {
            // 离开课堂房间
            if (this.classroomId) {
                this.socket.emit('leave-classroom', {
                    classroomId: this.classroomId,
                    userId: this.userInfo.id,
                    userName: this.userInfo.name
                })
            }

            this.socket.disconnect()
            this.socket = null
            this.isConnected = false
            console.log('👋 [WebSocket] 已断开连接')
        }
    }

    /**
   * 发送事件
   * @param {string} event - 事件名称
   * @param {object} data - 数据
   */
    emit (event, data) {
        if (!this.socket || !this.isConnected) {
            console.warn('⚠️ [WebSocket] 未连接，无法发送事件:', event)
            return false
        }

        // 根据事件类型映射到后端事件名
        const eventMap = {
            'code-sync': 'code-sync',
            'chat-message': 'chat-message',
            'raise-hand': 'raise-hand',
            'resource-change': 'resource-change',
            'resource-page-sync': 'resource-page-sync',
            'broadcast-screen': 'broadcast-screen',
            'stop-broadcast': 'stop-broadcast'
        }

        const backendEvent = eventMap[event] || event

        // 添加课堂ID到数据中
        const payload = {
            ...data,
            classroomId: this.classroomId,
            userId: this.userInfo.id,
            userName: this.userInfo.name,
            userRole: this.userInfo.role
        }

        console.log(`📤 [WebSocket] 发送事件: ${backendEvent}`, payload)
        this.socket.emit(backendEvent, payload)
        return true
    }

    /**
   * 监听事件
   * @param {string} event - 事件名称
   * @param {function} callback - 回调函数
   */
    on (event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, [])
        }
        this.eventListeners.get(event).push(callback)
    }

    /**
   * 取消监听事件
   * @param {string} event - 事件名称
   * @param {function} callback - 回调函数
   */
    off (event, callback) {
        if (!this.eventListeners.has(event)) return

        const listeners = this.eventListeners.get(event)
        const index = listeners.indexOf(callback)
        if (index > -1) {
            listeners.splice(index, 1)
        }
    }

    /**
   * 触发事件（内部使用）
   */
    trigger (event, data) {
        if (!this.eventListeners.has(event)) return

        const listeners = this.eventListeners.get(event)
        listeners.forEach(callback => {
            try {
                callback(data)
            } catch (error) {
                console.error(`❌ [WebSocket] 事件处理器错误 (${event}):`, error)
            }
        })
    }

    /**
   * 获取连接状态
   */
    getConnectionStatus () {
        return {
            isConnected: this.isConnected,
            socketId: this.socket ? this.socket.id : null
        }
    }

    /**
   * 同步代码到学生端
   */
    syncCodeToStudents (code, language) {
        return this.emit('code-sync', { code, language })
    }

    /**
   * 发送聊天消息
   */
    sendChatMessage (message) {
        return this.emit('chat-message', { message })
    }

    /**
   * 学生举手
   */
    raiseHand () {
        return this.emit('raise-hand', {})
    }

    /**
   * 切换资源
   */
    changeResource (resource) {
        return this.emit('resource-change', { resource })
    }

    /**
   * 同步资源页码
   */
    syncResourcePage (resourceId, page) {
        return this.emit('resource-page-sync', { resourceId, page })
    }
}

// 创建单例
const webSocketService = new WebSocketService()

export default webSocketService
