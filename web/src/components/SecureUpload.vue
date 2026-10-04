<template>
  <div class="secure-upload">
    <a-upload
      :file-list="fileList"
      :before-upload="handleBeforeUpload"
      :customRequest="handleCustomRequest"
      :on-remove="handleRemove"
      :accept="computedAccept"
      :multiple="multiple"
      :disabled="disabled"
      :show-upload-list="showUploadList"
      v-bind="$attrs"
    >
      <slot>
        <a-button :disabled="disabled || (fileList.length >= maxCount && maxCount > 0)">
          <a-icon type="upload" />
          {{ buttonText }}
        </a-button>
      </slot>
    </a-upload>

    <!-- 上传提示信息 -->
    <div v-if="showTips" class="upload-tips">
      <div class="tip-item">
        <a-icon type="info-circle" style="color: #1890ff;" />
        <span>文件大小限制: {{ formatFileSize(maxSize) }}</span>
      </div>
      <div v-if="allowedTypes.length > 0" class="tip-item">
        <a-icon type="file" style="color: #1890ff;" />
        <span>支持格式: {{ allowedTypesText }}</span>
      </div>
      <div v-if="maxCount > 0" class="tip-item">
        <a-icon type="number" style="color: #1890ff;" />
        <span>最多上传: {{ maxCount }} 个文件</span>
      </div>
    </div>
  </div>
</template>

<script>
import {
    validateFilename,
    validateFileMimeType,
    validateFileSize,
    formatFileSize
} from '@/utils/security'

export default {
    name: 'SecureUpload',
    props: {
        value: {
            type: Array,
            default: () => []
        },
        // 文件大小限制 (字节)
        maxSize: {
            type: Number,
            default: 100 * 1024 * 1024 // 默认100MB
        },
        // 允许的MIME类型
        allowedTypes: {
            type: Array,
            default: () => []
        },
        // 允许的文件扩展名
        allowedExtensions: {
            type: Array,
            default: () => []
        },
        // 最大文件数量
        maxCount: {
            type: Number,
            default: 0 // 0表示不限制
        },
        // 是否允许多选
        multiple: {
            type: Boolean,
            default: false
        },
        // 是否禁用
        disabled: {
            type: Boolean,
            default: false
        },
        // 按钮文字
        buttonText: {
            type: String,
            default: '选择文件'
        },
        // 是否显示上传列表
        showUploadList: {
            type: Boolean,
            default: true
        },
        // 是否显示提示信息
        showTips: {
            type: Boolean,
            default: true
        },
        // 自定义上传函数
        customUpload: {
            type: Function,
            default: null
        }
    },
    data () {
        return {
            fileList: this.value || []
        }
    },
    computed: {
    /**
     * 计算accept属性
     */
        computedAccept () {
            if (this.allowedExtensions.length > 0) {
                return this.allowedExtensions.map(ext => `.${ext}`).join(',')
            }
            if (this.allowedTypes.length > 0) {
                return this.allowedTypes.join(',')
            }
            return '*'
        },

        /**
     * 允许类型的文本显示
     */
        allowedTypesText () {
            if (this.allowedExtensions.length > 0) {
                return this.allowedExtensions.map(ext => `.${ext}`).join(', ')
            }
            if (this.allowedTypes.length > 0) {
                return this.allowedTypes.map(type => {
                    // 简化MIME类型显示
                    const parts = type.split('/')
                    return parts.length > 1 ? parts[1] : type
                }).join(', ')
            }
            return '所有类型'
        }
    },
    watch: {
        value (newVal) {
            this.fileList = newVal || []
        },
        fileList: {
            handler (newVal) {
                this.$emit('input', newVal)
                this.$emit('change', newVal)
            },
            deep: true
        }
    },
    methods: {
    /**
     * 上传前验证
     */
        handleBeforeUpload (file) {
            // 1. 数量限制检查
            if (this.maxCount > 0 && this.fileList.length >= this.maxCount) {
                this.$message.error(`最多只能上传${this.maxCount}个文件!`)
                return false
            }

            // 2. 文件名安全检查
            const filenameValidation = validateFilename(file.name)
            if (!filenameValidation.valid) {
                this.$message.error(`文件名不合法: ${filenameValidation.error}`)
                return false
            }

            // 3. 文件大小检查
            const sizeValidation = validateFileSize(file, this.maxSize)
            if (!sizeValidation.valid) {
                this.$message.error(sizeValidation.error)
                return false
            }

            // 4. 文件扩展名检查
            if (this.allowedExtensions.length > 0) {
                const extension = file.name.split('.').pop().toLowerCase()
                if (!this.allowedExtensions.includes(extension)) {
                    this.$message.error(
                        `不支持的文件格式: .${extension}\n` +
            `允许的格式: ${this.allowedExtensions.map(ext => `.${ext}`).join(', ')}`
                    )
                    return false
                }
            }

            // 5. MIME类型检查
            if (this.allowedTypes.length > 0) {
                const mimeValidation = validateFileMimeType(file, this.allowedTypes)
                if (!mimeValidation.valid) {
                    this.$message.error(mimeValidation.error)
                    return false
                }
            }

            // 6. 防止路径遍历攻击
            if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
                this.$message.error('文件名包含非法路径字符!')
                return false
            }

            // 7. 触发验证成功事件
            this.$emit('validate-success', file)

            return true
        },

        /**
     * 自定义上传请求
     */
        async handleCustomRequest (info) {
            const { file, onSuccess, onError, onProgress } = info

            // 如果提供了自定义上传函数,使用它
            if (this.customUpload) {
                this.customUpload({
                    file,
                    onSuccess,
                    onError,
                    onProgress
                })
                return
            }

            // 默认行为: 上传到服务器
            try {
                // 创建 FormData
                const formData = new FormData()
                formData.append('file', file)

                // 显示上传进度
                onProgress({ percent: 30 })

                // 调用上传接口
                const response = await fetch('/sys/common/upload', {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Access-Token': localStorage.getItem('Access-Token') || ''
                    }
                })

                onProgress({ percent: 80 })

                const rawText = await response.text()
                let result = null
                try {
                    result = rawText ? JSON.parse(rawText) : null
                } catch (e) {
                    result = null
                }

                if (!response.ok) {
                    const friendly = this.getFriendlyUploadError(response.status, result && result.message)
                    throw new Error(friendly)
                }

                if (result && result.success && result.result) {
                    // 上传成功，使用服务器返回的完整URL
                    const serverUrl = result.result.fullUrl || result.result.url || result.result.path
                    console.log('[SecureUpload] Upload success, server URL:', serverUrl)
                    const fileItem = {
                        uid: file.uid,
                        name: file.name,
                        status: 'done',
                        file: file,
                        url: serverUrl
                    }

                    this.fileList.push(fileItem)
                    onSuccess(fileItem, file)
                    onProgress({ percent: 100 })

                    this.$emit('upload-success', fileItem)
                } else {
                    throw new Error((result && result.message) || '上传失败')
                }
            } catch (error) {
                console.error('[SecureUpload] Upload failed:', error)

                // 解析错误信息
                let errorMessage = '文件上传失败'
                if (error.message) {
                    if (error.message.includes('OSS')) {
                        errorMessage = '文件存储服务异常，请稍后再试'
                    } else if (error.message.includes('大小超过限制') || error.message.includes('too large')) {
                        errorMessage = '文件大小超过限制（最大100MB），请压缩文件后重新上传'
                    } else if (error.message.includes('不支持的文件类型')) {
                        errorMessage = '不支持的文件类型，请上传支持的格式（图片、文档、视频、音频、压缩包等）'
                    } else if (error.message.includes('上传接口不可用')) {
                        errorMessage = '上传接口不可用，请联系管理员'
                    } else if (error.message.includes('无权限')) {
                        errorMessage = '无权限上传，请重新登录或联系管理员'
                    } else {
                        errorMessage = error.message
                    }
                }

                const fileItem = {
                    uid: file.uid,
                    name: file.name,
                    status: 'error',
                    file: file,
                    url: '',
                    isLocal: false
                }

                this.fileList.push(fileItem)
                onError(error)

                this.$message.error(errorMessage)
                this.$emit('upload-success', fileItem)
            }
        },

        getFriendlyUploadError (status, serverMessage) {
            if (serverMessage) return serverMessage
            if (status === 401 || status === 403) return '无权限上传，请重新登录或联系管理员'
            if (status === 404) return '上传接口不可用，请联系管理员'
            if (status === 413) return '文件过大，超过上传限制'
            if (status === 500) return '文件存储服务异常，请稍后再试'
            return '上传失败，请稍后重试'
        },

        /**
     * 移除文件
     */
        handleRemove (file) {
            const index = this.fileList.indexOf(file)
            if (index > -1) {
                // 释放URL对象,防止内存泄漏
                if (file.url && file.url.startsWith('blob:')) {
                    URL.revokeObjectURL(file.url)
                }

                this.fileList.splice(index, 1)
                this.$emit('remove', file)
            }
        },

        /**
     * 清空文件列表
     */
        clearFiles () {
            // 释放所有URL对象
            this.fileList.forEach(file => {
                if (file.url && file.url.startsWith('blob:')) {
                    URL.revokeObjectURL(file.url)
                }
            })
            this.fileList = []
            this.$emit('clear')
        },

        /**
     * 格式化文件大小
     */
        formatFileSize
    },
    beforeDestroy () {
    // 组件销毁时清理URL对象
        this.fileList.forEach(file => {
            if (file.url && file.url.startsWith('blob:')) {
                URL.revokeObjectURL(file.url)
            }
        })
    }
}
</script>

<style scoped>
.secure-upload {
  display: inline-block;
}

.upload-tips {
  margin-top: 8px;
  color: #666;
  font-size: 12px;
}

.tip-item {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.tip-item span {
  margin-left: 4px;
}
</style>
