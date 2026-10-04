import { handleApiError, showSuccess } from '@/utils/errorHandler'
import loadingManager from '@/utils/loadingManager'

export function createApiWrapper (api, options = {}) {
    const {
        showSuccessMessage = false,
        showLoadingMessage = false,
        loadingText = '加载中...',
        successMessage = '操作成功',
        errorContext = null
    } = options

    return async (...args) => {
        let loadingHandle = null

        try {
            if (showLoadingMessage) {
                const loadingKey = Date.now().toString()
                loadingHandle = loadingManager.startLoading(loadingKey, loadingText)
            }

            const response = await api(...args)

            if (showSuccessMessage && response.success) {
                showSuccess('操作成功', successMessage)
            }

            return response
        } catch (error) {
            handleApiError(error, errorContext)
            throw error
        } finally {
            if (loadingHandle) {
                loadingManager.stopLoading(loadingHandle)
            }
        }
    }
}

export function withErrorHandler (asyncFn, context = null) {
    return async (...args) => {
        try {
            return await asyncFn(...args)
        } catch (error) {
            handleApiError(error, context)
            throw error
        }
    }
}

export function withLoading (asyncFn, loadingText = '处理中...') {
    return async (...args) => {
        const loadingKey = Date.now().toString()
        let loadingHandle = null
        try {
            loadingHandle = loadingManager.startLoading(loadingKey, loadingText)
            return await asyncFn(...args)
        } finally {
            if (loadingHandle) {
                loadingManager.stopLoading(loadingHandle)
            }
        }
    }
}

export function withSuccess (asyncFn, successMessage = '操作成功') {
    return async (...args) => {
        const result = await asyncFn(...args)
        if (result.success) {
            showSuccess('操作成功', successMessage)
        }
        return result
    }
}
