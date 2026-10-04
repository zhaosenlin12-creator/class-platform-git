import { handleApiError, showSuccess, showError, showWarning, showInfo } from '@/utils/errorHandler'
import loadingManager from '@/utils/loadingManager'

const GlobalHandlers = {
    install (Vue) {
        Vue.prototype.$handleApiError = handleApiError
        Vue.prototype.$showSuccess = showSuccess
        Vue.prototype.$showError = showError
        Vue.prototype.$showWarning = showWarning
        Vue.prototype.$showInfo = showInfo
        Vue.prototype.$loadingManager = loadingManager

        Vue.prototype.$asyncWithLoading = function (asyncFn, loadingText = '处理中...') {
            const loadingKey = Date.now().toString()
            return loadingManager.withLoading(loadingKey, asyncFn, loadingText)
        }

        Vue.prototype.$safeAsync = function (asyncFn, errorContext = null) {
            return async (...args) => {
                try {
                    return await asyncFn.apply(this, args)
                } catch (error) {
                    handleApiError(error, errorContext)
                    throw error
                }
            }
        }

        Vue.mixin({
            data () {
                return {
                    requestLoading: false
                }
            },

            methods: {
                async $safeRequest (requestFn, options = {}) {
                    const {
                        loading = true,
                        loadingText = '加载中...',
                        successMessage = null,
                        errorMessage = null,
                        showSuccess: showSuccessMsg = false
                    } = options

                    let loadingHandle = null
                    if (loading) {
                        this.requestLoading = true
                        loadingHandle = loadingManager.startLoading('request', loadingText)
                    }

                    try {
                        const response = await requestFn()

                        if (response.success) {
                            if (showSuccessMsg && successMessage) {
                                showSuccess('操作成功', successMessage)
                            }
                        } else if (errorMessage !== false) {
                            showError('请求失败', errorMessage || response.message || '操作失败')
                        }

                        return response
                    } catch (error) {
                        if (errorMessage !== false) {
                            handleApiError(error, errorMessage)
                        }
                        throw error
                    } finally {
                        if (loading && loadingHandle) {
                            this.requestLoading = false
                            loadingManager.stopLoading(loadingHandle)
                        }
                    }
                },

                $confirmAction (message, title = '确认操作') {
                    return new Promise((resolve, reject) => {
                        this.$confirm({
                            title,
                            content: message,
                            onOk: resolve,
                            onCancel: reject
                        })
                    })
                }
            }
        })

        Vue.config.errorHandler = (err, vm, info) => {
            console.error('Vue Error:', err, info)
            if (err.response) {
                handleApiError(err, `组件错误: ${info}`)
            } else {
                showError('系统错误', '页面出现异常，请刷新后重试')
            }
        }
    }
}

export default GlobalHandlers
