import { notification, message } from 'ant-design-vue'
import store from '@/store'

class MessageCenter {
    constructor () {
        this.messageQueue = []
        this.isProcessing = false
        this.maxRetries = 3
        this.retryDelay = 1000
    }

    // 添加消息到队列
    addMessage (type, config) {
        const messageItem = {
            id: Date.now() + Math.random(),
            type,
            config,
            retries: 0,
            timestamp: Date.now()
        }

        this.messageQueue.push(messageItem)
        this.processQueue()
    }

    // 处理消息队列
    async processQueue () {
        if (this.isProcessing || this.messageQueue.length === 0) {
            return
        }

        this.isProcessing = true

        while (this.messageQueue.length > 0) {
            const messageItem = this.messageQueue.shift()

            try {
                await this.showMessage(messageItem)
            } catch (error) {
                console.error('消息显示失败:', error)

                // 重试逻辑
                if (messageItem.retries < this.maxRetries) {
                    messageItem.retries++

                    setTimeout(() => {
                        this.messageQueue.unshift(messageItem)
                        this.processQueue()
                    }, this.retryDelay * messageItem.retries)
                }
            }
        }

        this.isProcessing = false
    }

    // 显示单个消息
    showMessage (messageItem) {
        return new Promise((resolve, reject) => {
            try {
                const { type, config } = messageItem

                switch (type) {
                case 'notification':
                    notification[config.level || 'info']({
                        ...config,
                        onClose: resolve,
                        key: messageItem.id
                    })
                    break

                case 'message':
                    const hideMessage = message[config.level || 'info'](config.content)
                    setTimeout(() => {
                        if (hideMessage) hideMessage()
                        resolve()
                    }, config.duration || 3000)
                    break

                default:
                    resolve()
                }

                // 记录到store
                store.commit('ADD_NOTIFICATION', {
                    ...messageItem,
                    displayed: true
                })
            } catch (error) {
                reject(error)
            }
        })
    }

    // 清除所有通知
    clearAll () {
        notification.destroy()
        message.destroy()
        this.messageQueue = []
    }

    // 清除特定类型的通知
    clearByType (type) {
        this.messageQueue = this.messageQueue.filter(item => item.type !== type)
    }

    // 显示成功消息
    success (title, description = '', options = {}) {
        this.addMessage('notification', {
            level: 'success',
            message: title,
            description,
            duration: 3,
            placement: 'topRight',
            ...options
        })
    }

    // 显示错误消息
    error (title, description = '', options = {}) {
        this.addMessage('notification', {
            level: 'error',
            message: title,
            description,
            duration: 4,
            placement: 'topRight',
            ...options
        })
    }

    // 显示警告消息
    warning (title, description = '', options = {}) {
        this.addMessage('notification', {
            level: 'warning',
            message: title,
            description,
            duration: 4,
            placement: 'topRight',
            ...options
        })
    }

    // 显示信息消息
    info (title, description = '', options = {}) {
        this.addMessage('notification', {
            level: 'info',
            message: title,
            description,
            duration: 3,
            placement: 'topRight',
            ...options
        })
    }

    // 显示简单消息
    showSimpleMessage (level, content, duration = 3) {
        this.addMessage('message', {
            level,
            content,
            duration: duration * 1000
        })
    }

    // 显示加载消息
    loading (content = '加载中...', duration = 0) {
        return message.loading(content, duration)
    }

    // 批量显示消息
    batch (messages) {
        messages.forEach(msg => {
            this.addMessage(msg.type || 'notification', msg.config)
        })
    }
}

// 创建单例实例
const messageCenter = new MessageCenter()

export default messageCenter
export { MessageCenter }
