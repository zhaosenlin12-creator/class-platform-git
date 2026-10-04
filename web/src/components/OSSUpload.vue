<template>
  <div class="oss-upload">
    <!-- 使用 HTML 原生 label+for 关联机制触发文件选择，最可靠的跨浏览器方案 -->
    <label :for="inputId" class="upload-trigger-label" :style="disabled || uploading ? 'pointer-events:none;opacity:0.65;' : 'cursor:pointer;'">
      <slot>
        <a-button :disabled="disabled || uploading" tag="span" style="pointer-events:none;">
          <a-icon :type="uploading ? 'loading' : 'upload'" />
          {{ uploading ? '上传中...' : '选择文件' }}
        </a-button>
      </slot>
    </label>

    <!-- 原生文件选择器，通过 label for 关联，display:none 对 label 触发无影响 -->
    <input
      :id="inputId"
      type="file"
      ref="fileInputNative"
      :accept="accept"
      :disabled="disabled || uploading"
      style="display: none;"
      @change="handleNativeFileChange"
    />

    <!-- 已选文件展示 -->
    <div v-if="currentFile" class="oss-selected-filename">
      <a-icon type="paper-clip" />
      <span class="filename-text">{{ currentFile.name }}</span>
      <a-icon v-if="!uploading" type="close" class="remove-icon" @click.stop="clearFiles" />
    </div>

    <!-- 上传进度 -->
    <div v-if="uploading && progress > 0" class="upload-progress">
      <a-progress :percent="progress" :status="progress === 100 ? 'success' : 'active'" />
      <span class="progress-text">{{ progressText }}</span>
    </div>

    <!-- 上传提示信息 -->
    <div class="upload-tips">
      <div class="tip-item">
        <a-icon type="info-circle" style="color: #1890ff;" />
        <span>文件大小限制: {{ formatFileSize(maxSize) }}</span>
      </div>
      <div class="tip-item">
        <a-icon type="file" style="color: #1890ff;" />
        <span>支持格式: {{ acceptText }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
    name: 'OSSUpload',
    props: {
    // 上传类型: 'resource' 或 'classroom'
        uploadType: {
            type: String,
            required: true,
            validator: (value) => ['resource', 'classroom'].includes(value)
        },
        // 文件大小限制 (字节)
        maxSize: {
            type: Number,
            default: 100 * 1024 * 1024 // 默认100MB
        },
        // 允许的文件扩展名
        accept: {
            type: String,
            default: '.zip,.rar,.7z,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.sb3,.sb2,.py,.js,.html,.css,.json,.mp4,.mp3,.wav,.jpg,.jpeg,.png,.gif,.webp'
        },
        // 是否自动上传
        autoUpload: {
            type: Boolean,
            default: true
        },
        // 是否禁用
        disabled: {
            type: Boolean,
            default: false
        },
        // 课堂ID (uploadType为'classroom'时必需)
        classroomId: {
            type: String,
            default: ''
        },
        // 课程ID (uploadType为'resource'时可选)
        courseId: {
            type: String,
            default: ''
        },
        // 单元ID (uploadType为'resource'时可选)
        unitId: {
            type: String,
            default: ''
        }
    },
    data () {
        return {
            // 唯一ID用于 label for 关联
            inputId: 'oss-upload-input-' + Math.random().toString(36).substr(2, 9),
            fileList: [],
            uploading: false,
            progress: 0,
            currentFile: null,
            uploadToken: null,
            progressText: '',
            pendingMetadata: {}
        }
    },
    computed: {
        acceptText () {
            const extensions = this.accept.split(',')
            if (extensions.length > 10) {
                return extensions.slice(0, 10).join(', ') + ' 等'
            }
            return extensions.join(', ')
        }
    },
    methods: {
        // 处理原生文件选择事件
        handleNativeFileChange (event) {
            const files = event.target.files
            if (!files || files.length === 0) return

            const file = files[0]
            const validation = this.validateFile(file)

            if (!validation.valid) {
                this.$message.error(validation.error)
                // 验证失败，清空 input 值，允许重复选择同一个文件
                this.$refs.fileInputNative.value = ''
                return
            }

            this.currentFile = file
            // Mock file object format for Ant Design if needed by parent
            this.fileList = [{ uid: file.uid || String(Date.now()), name: file.name, status: 'ready', originFileObj: file }]
            this.$emit('file-selected', file)

            if (this.autoUpload) {
                // 如果开启自动上传，直接触发上传核心逻辑
                this.handleCustomRequest({
                    file: this.currentFile,
                    onSuccess: () => {},
                    onError: () => {}
                })
            }
        },

        // 供父组件通过 ref 调用 / @click.capture 触发
        triggerFileDialog () {
            if (this.disabled || this.uploading) return
            // 必须同步调用，不能用 $nextTick 等异步方法
            // 浏览器安全限制：只有直接在用户交互事件中同步调用 .click() 才能弹出文件选择器
            if (this.$refs.fileInputNative) {
                this.$refs.fileInputNative.click()
            }
        },

        /**
     * 验证文件
     */
        validateFile (file) {
            // 1. 文件大小检查
            if (file.size > this.maxSize) {
                return {
                    valid: false,
                    error: '文件大小超过限制(最大100MB),请压缩文件后重新上传'
                }
            }

            // 2. 文件扩展名检查
            const fileName = file.name
            const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
            const allowedExtensions = this.accept.split(',').map(ext => ext.trim().toLowerCase())

            if (!allowedExtensions.includes(fileExt)) {
                return {
                    valid: false,
                    error: '不支持的文件类型,请选择其他文件'
                }
            }

            // 3. 文件名安全检查
            if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
                return {
                    valid: false,
                    error: '文件名包含非法字符'
                }
            }

            return { valid: true }
        },

        /**
     * 自定义上传请求
     */
        async handleCustomRequest (info) {
            const { file, onSuccess, onError } = info

            this.currentFile = file
            this.uploading = true
            this.progress = 0
            this.progressText = '准备上传...'

            // 触发上传开始事件
            this.$emit('upload-start', file)

            try {
                // 步骤1: 请求上传凭证
                this.progressText = '获取上传凭证...'
                this.progress = 10
                const tokenData = await this.requestUploadToken(file.name, file.type, file.size)

                // 步骤2: 上传到OSS
                this.progressText = '上传文件到云存储...'
                this.progress = 20
                await this.uploadToOSS(file, tokenData.uploadUrl)

                // 完成
                this.progress = 100
                this.progressText = '上传完成'

                const fileInfo = {
                    fileKey: tokenData.fileKey,
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type,
                    ...this.pendingMetadata
                }

                // 更新文件列表
                const fileItem = {
                    uid: file.uid,
                    name: file.name,
                    status: 'done',
                    url: tokenData.fileKey
                }
                this.fileList = [fileItem]

                if (typeof onSuccess === 'function') {
                    onSuccess(fileInfo, file)
                }
                this.$emit('upload-success', fileInfo)
                this.$message.success('文件上传成功')
            } catch (error) {
                console.error('[OSSUpload] Upload failed:', error)

                // 失败后清空文件列表，避免用户无法重新选择文件
                this.fileList = []

                if (typeof onError === 'function') {
                    onError(error)
                }
                this.$emit('upload-error', error)

                // 显示友好的错误消息
                let errorMessage = error.message || '文件上传失败,请重试'
                if (errorMessage.includes('405')) {
                    errorMessage = 'OSS上传返回405，请检查OSS CORS与上传域名配置'
                }
                this.$message.error(errorMessage)
            } finally {
                this.uploading = false
                this.currentFile = null
                this.uploadToken = null
                this.pendingMetadata = {}
            }
        },

        /**
     * 手动触发上传（autoUpload=false 时由父组件调用）
     */
        startUpload (metadata = {}) {
            if (this.disabled) {
                this.$message.warning('当前不可上传')
                return
            }
            if (this.uploading) {
                return
            }

            const candidate = this.currentFile || (this.fileList[0] && (this.fileList[0].originFileObj || this.fileList[0]))
            if (!candidate || !candidate.name) {
                this.$message.warning('请先选择文件')
                return
            }

            this.pendingMetadata = metadata || {}
            return this.handleCustomRequest({
                file: candidate,
                onSuccess: () => {},
                onError: () => {}
            })
        },

        /**
     * 请求上传凭证
     */
        async requestUploadToken (fileName, fileType, fileSize = 0) {
            try {
                let endpoint = ''
                let requestData = { fileName, fileType, fileSize }

                if (this.uploadType === 'resource') {
                    endpoint = '/course/resource/upload-token'
                } else if (this.uploadType === 'classroom') {
                    if (!this.classroomId) {
                        throw new Error('课堂ID不能为空')
                    }
                    endpoint = `/classroom/${this.classroomId}/upload-token`
                } else {
                    throw new Error('不支持的上传类型')
                }

                const response = await this.$http.post(endpoint, requestData)

                if (!response || !response.success) {
                    throw new Error((response && response.message) || '获取上传凭证失败,请稍后重试')
                }

                const { uploadUrl, fileKey, expiration } = response.result || response.data || {}

                if (!uploadUrl || !fileKey) {
                    throw new Error('获取上传凭证失败,请稍后重试')
                }

                return { uploadUrl, fileKey, expiration }
            } catch (error) {
                console.error('[OSSUpload] Request upload token failed:', error)
                throw new Error(error.message || '获取上传凭证失败,请稍后重试')
            }
        },

        /**
     * 上传文件到OSS
     */
        async uploadToOSS (file, uploadUrl) {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest()

                // 监听上传进度
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        // 进度范围: 20% - 90%
                        const percentComplete = Math.round((event.loaded / event.total) * 70) + 20
                        this.progress = percentComplete
                        this.$emit('upload-progress', percentComplete)
                    }
                })

                // 监听上传完成
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve()
                    } else {
                        reject(new Error(`OSS上传失败: ${xhr.status}`))
                    }
                })

                // 监听上传错误
                xhr.addEventListener('error', () => {
                    reject(new Error('文件上传失败,请检查网络连接后重试'))
                })

                // 监听上传中止
                xhr.addEventListener('abort', () => {
                    reject(new Error('文件上传已取消'))
                })

                // 发送PUT请求
                xhr.open('PUT', uploadUrl, true)
                xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
                xhr.send(file)
            })
        },

        /**
     * 保存文件元数据
     */
        async saveMetadata (fileInfo) {
            try {
                if (this.uploadType === 'resource') {
                    // 课程资源: 调用后端API保存元数据
                    const endpoint = '/course/resource/metadata'
                    const requestData = {
                        fileKey: fileInfo.fileKey,
                        fileName: fileInfo.fileName,
                        fileSize: fileInfo.fileSize,
                        fileType: fileInfo.fileType,
                        courseId: this.courseId,
                        unitId: this.unitId
                    }

                    const response = await this.$http.post(endpoint, requestData)

                    if (!response || !response.success) {
                        throw new Error((response && response.message) || '文件信息保存失败,请联系管理员')
                    }

                    return response.result || response.data || {}
                } else if (this.uploadType === 'classroom') {
                    // 课堂文件: 通过事件通知父组件,由父组件通过WebSocket发送
                    // 父组件需要监听 upload-success 事件并处理WebSocket消息
                    return {}
                } else {
                    throw new Error('不支持的上传类型')
                }
            } catch (error) {
                console.error('[OSSUpload] Save metadata failed:', error)
                throw new Error(error.message || '文件信息保存失败,请联系管理员')
            }
        },

        /**
     * 清空文件列表
     */
        clearFiles () {
            this.fileList = []
            this.uploading = false
            this.progress = 0
            this.currentFile = null
            this.uploadToken = null
            this.pendingMetadata = {}
            if (this.$refs.fileInputNative) this.$refs.fileInputNative.value = ''
            this.$emit('clear')
        },

        /**
     * 格式化文件大小
     */
        formatFileSize (bytes) {
            if (bytes === 0) return '0 B'
            const k = 1024
            const sizes = ['B', 'KB', 'MB', 'GB']
            const i = Math.floor(Math.log(bytes) / Math.log(k))
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
        }
    }
}
</script>

<style scoped>
.oss-upload {
  display: inline-block;
}

.upload-progress {
  margin-top: 12px;
  margin-bottom: 8px;
}

.progress-text {
  display: block;
  margin-top: 4px;
  color: #666;
  font-size: 12px;
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

<style scoped>
.oss-upload-trigger {
  display: inline-block;
  cursor: pointer;
}

.oss-selected-filename {
  display: flex;
  align-items: center;
  margin-top: 8px;
  font-size: 13px;
  color: #555;
}

.oss-selected-filename .filename-text {
  margin-left: 6px;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.oss-selected-filename .remove-icon {
  margin-left: 8px;
  cursor: pointer;
  color: #999;
}

.oss-selected-filename .remove-icon:hover {
  color: #f5222d;
}
</style>
