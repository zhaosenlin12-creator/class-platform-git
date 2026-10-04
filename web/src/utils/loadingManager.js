import { message } from 'ant-design-vue'

class LoadingManager {
    constructor () {
        this.loadingStates = new Map()
        this.activeLoaders = new Map()
        this.loadingCounter = 0 // 用于生成唯一的loading ID
    }

    startLoading (key = 'default', text = '加载中...') {
    // 如果key已存在，不关闭旧的，而是创建一个新的唯一key
        let actualKey = key
        if (this.activeLoaders.has(key)) {
            actualKey = `${key}_${++this.loadingCounter}_${Date.now()}`
            console.log(`[LoadingManager] Key ${key} already exists, using ${actualKey}`)
        }

        const loader = message.loading(text, 0)
        this.activeLoaders.set(actualKey, loader)
        this.loadingStates.set(actualKey, true)

        return { loader, actualKey }
    }

    stopLoading (key) {
    // 支持传入对象或字符串
        const actualKey = typeof key === 'object' && key.actualKey ? key.actualKey : key

        const loader = this.activeLoaders.get(actualKey)
        if (loader && typeof loader === 'function') {
            loader()
        }

        this.activeLoaders.delete(actualKey)
        this.loadingStates.set(actualKey, false)
    }

    isLoading (key = 'default') {
        return this.loadingStates.get(key) || false
    }

    clearAll () {
        this.activeLoaders.forEach((loader, key) => {
            this.stopLoading(key)
        })
    }

    async withLoading (key, asyncFunction, loadingText = '处理中...') {
        let loadingHandle = null
        try {
            loadingHandle = this.startLoading(key, loadingText)
            const result = await asyncFunction()
            return result
        } finally {
            if (loadingHandle) {
                this.stopLoading(loadingHandle)
            }
        }
    }
}

export default new LoadingManager()
