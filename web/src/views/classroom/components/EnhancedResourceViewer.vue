<template>
  <div class="enhanced-resource-viewer">
    <div v-if="currentResource">
      <!-- PPT/Office文档预览 -->
      <div v-if="isOfficeDoc" class="office-viewer">
        <div class="office-toolbar">
          <a-alert
            :message="`正在预览: ${currentResource.name}`"
            type="info"
            show-icon
            style="margin-bottom: 8px;"
          />
          <a-button-group size="small">
            <a-button @click="downloadResource">
              <a-icon type="download" /> 下载文件
            </a-button>
            <a-button @click="openInNewTab">
              <a-icon type="export" /> 新窗口打开
            </a-button>
          </a-button-group>
        </div>

        <!-- PPT预览区域 -->
        <div class="office-preview-placeholder">
          <a-result
            status="info"
            :title="isOSSUrl ? 'PPT在线预览' : 'PPT文件预览'"
            :sub-title="isOSSUrl ? '点击下方按钮在新窗口中预览PPT' : '本地文件无法在线预览，请下载后使用Office或WPS查看'"
          >
            <template #icon>
              <a-icon type="file-ppt" style="color: #d04a02; font-size: 72px;" />
            </template>
            <template #extra>
              <a-space>
                <a-button v-if="isOSSUrl" type="primary" size="large" @click="openOfficePreview">
                  <a-icon type="eye" /> 在线预览
                </a-button>
                <a-button type="default" size="large" @click="downloadResource">
                  <a-icon type="download" /> 下载文件
                </a-button>
              </a-space>
            </template>
          </a-result>
        </div>
      </div>

      <!-- PDF 真实渲染（使用pdf.js） -->
      <div v-else-if="isPDF" class="pdf-viewer">
        <div class="pdf-toolbar">
          <a-button-group size="small">
            <a-button @click="previousPage" :disabled="currentPage <= 1">
              <a-icon type="left" /> 上一页
            </a-button>
            <a-input-number
              v-model="currentPage"
              :min="1"
              :max="totalPages"
              size="small"
              @change="renderPage"
              style="width: 80px; margin: 0 8px;"
            />
            <span style="line-height: 24px;">/ {{ totalPages }}</span>
            <a-button @click="nextPage" :disabled="currentPage >= totalPages" style="margin-left: 8px;">
              下一页 <a-icon type="right" />
            </a-button>
          </a-button-group>

          <a-button-group size="small" style="margin-left: 16px;">
            <a-button @click="zoomOut" :disabled="scale <= 0.5">
              <a-icon type="zoom-out" />
            </a-button>
            <span style="padding: 0 12px; line-height: 24px;">{{ Math.round(scale * 100) }}%</span>
            <a-button @click="zoomIn" :disabled="scale >= 2">
              <a-icon type="zoom-in" />
            </a-button>
            <a-button @click="resetZoom">
              <a-icon type="sync" />
            </a-button>
          </a-button-group>

          <a-button size="small" @click="downloadResource" style="margin-left: 16px;">
            <a-icon type="download" /> 下载
          </a-button>
        </div>

        <div class="pdf-canvas-container" v-loading="loading">
          <canvas ref="pdfCanvas" class="pdf-canvas"></canvas>
        </div>

        <div v-if="loadError" class="load-error">
          <a-alert
            type="error"
            :message="loadError"
            description="无法加载文件，请尝试下载后查看"
            show-icon
          />
        </div>
      </div>

      <!-- 视频播放器 -->
      <div v-else-if="isVideo" class="video-viewer">
        <video
          ref="videoPlayer"
          :src="resourceUrl"
          controls
          style="width: 100%; max-height: 600px;"
          @play="handleVideoPlay"
          @pause="handleVideoPause"
          @timeupdate="handleTimeUpdate"
        />
      </div>

      <!-- 图片查看器 -->
      <div v-else-if="isImage" class="image-viewer">
        <img :src="resourceUrl" :alt="currentResource.name" style="max-width: 100%;" />
      </div>

      <!-- 代码展示 -->
      <div v-else-if="isCode" class="code-viewer">
        <pre><code>{{ codeContent }}</code></pre>
      </div>

      <!-- 其他文件类型 -->
      <div v-else class="other-viewer">
        <a-empty description="不支持预览该文件类型">
          <a-button type="primary" @click="downloadResource">
            <a-icon type="download" /> 下载文件
          </a-button>
        </a-empty>
      </div>
    </div>

    <a-empty v-else description="暂无资源" />
  </div>
</template>

<script>
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
import pdfjsWorker from 'pdfjs-dist/legacy/build/pdf.worker.entry'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

export default {
    name: 'EnhancedResourceViewer',
    props: {
        resource: {
            type: Object,
            default: null
        },
        isTeacher: {
            type: Boolean,
            default: false
        },
        lessonId: {
            type: String,
            default: null
        }
    },

    data () {
        return {
            currentResource: null,
            currentPage: 1,
            totalPages: 1,
            scale: 1.0,
            loading: false,
            loadError: null,
            pdfDoc: null,
            codeContent: '',
            showFallback: true,

            // 视频同步
            videoSyncEnabled: true
        }
    },

    computed: {
        isPDF () {
            return this.currentResource && (
                this.currentResource.type === 'document' ||
        this.currentResource.format === 'pdf' ||
        (this.currentResource.name && this.currentResource.name.toLowerCase().endsWith('.pdf'))
            )
        },

        isPPT () {
            return this.currentResource && (
                this.currentResource.type === 'ppt' ||
        this.currentResource.format === 'pptx' ||
        this.currentResource.format === 'ppt' ||
        (this.currentResource.name && this.currentResource.name.toLowerCase().match(/\.(ppt|pptx)$/))
            )
        },

        // 是否是Office文档（PPT/Word）
        isOfficeDoc () {
            return this.isPPT || (this.currentResource && (
                this.currentResource.format === 'doc' ||
        this.currentResource.format === 'docx'
            ))
        },

        isVideo () {
            return this.currentResource && this.currentResource.type === 'video'
        },

        isImage () {
            return this.currentResource && this.currentResource.type === 'image'
        },

        isCode () {
            return this.currentResource && this.currentResource.type === 'code'
        },

        resourceUrl () {
            if (!this.currentResource) return ''
            return this.currentResource.fileUrl || this.currentResource.downloadUrl
        },

        // 判断是否是OSS URL（公网可访问）
        isOSSUrl () {
            const url = this.resourceUrl
            if (!url) return false
            // OSS URL通常包含 aliyuncs.com 或以 http 开头
            return url.includes('aliyuncs.com') ||
             url.includes('oss-cn-') ||
             (url.startsWith('http') && !url.includes(window.location.host))
        },

        // Office文档预览URL
        officeViewerUrl () {
            if (!this.currentResource) return ''
            let fileUrl = this.currentResource.fileUrl || this.currentResource.downloadUrl

            // 确保是完整URL
            if (fileUrl && !fileUrl.startsWith('http')) {
                fileUrl = window.location.origin + fileUrl
            }

            // 使用Office Web Viewer
            return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`
        }
    },

    watch: {
        resource: {
            immediate: true,
            async handler (newVal) {
                if (newVal) {
                    this.currentResource = newVal
                    await this.loadResource()
                }
            }
        }
    },

    methods: {
        async loadResource () {
            this.loadError = null
            this.currentPage = 1

            if (this.isPDF || this.isPPT) {
                await this.loadPDF()
            } else if (this.isCode) {
                await this.loadCodeContent()
            }
        },

        async loadPDF () {
            this.loading = true
            this.loadError = null

            try {
                const url = this.resourceUrl

                // 加载PDF文档
                const loadingTask = pdfjsLib.getDocument(url)
                this.pdfDoc = await loadingTask.promise

                this.totalPages = this.pdfDoc.numPages
                this.currentPage = 1

                await this.renderPage()

                this.$message.success('文档加载成功')
            } catch (error) {
                console.error('PDF加载失败:', error)
                this.loadError = 'PDF加载失败: ' + error.message
                this.$message.error('文档加载失败')
            } finally {
                this.loading = false
            }
        },

        async renderPage () {
            if (!this.pdfDoc || !this.$refs.pdfCanvas) return

            try {
                const page = await this.pdfDoc.getPage(this.currentPage)
                const canvas = this.$refs.pdfCanvas
                const context = canvas.getContext('2d')

                const viewport = page.getViewport({ scale: this.scale * 1.5 })

                canvas.height = viewport.height
                canvas.width = viewport.width

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                }

                await page.render(renderContext).promise

                // 同步页码到学生端
                if (this.isTeacher) {
                    this.syncPageToStudents()
                }

                this.$emit('page-change', this.currentPage)
            } catch (error) {
                console.error('页面渲染失败:', error)
                this.$message.error('页面渲染失败')
            }
        },

        previousPage () {
            if (this.currentPage > 1) {
                this.currentPage--
                this.renderPage()
            }
        },

        nextPage () {
            if (this.currentPage < this.totalPages) {
                this.currentPage++
                this.renderPage()
            }
        },

        zoomIn () {
            if (this.scale < 2) {
                this.scale += 0.1
                this.renderPage()
            }
        },

        zoomOut () {
            if (this.scale > 0.5) {
                this.scale -= 0.1
                this.renderPage()
            }
        },

        resetZoom () {
            this.scale = 1.0
            this.renderPage()
        },

        async loadCodeContent () {
            try {
                const response = await this.$http.get(this.resourceUrl, {
                    responseType: 'text'
                })
                this.codeContent = response.data
            } catch (error) {
                console.error('代码加载失败:', error)
                this.codeContent = '// 代码加载失败'
            }
        },

        downloadResource () {
            if (this.currentResource) {
                const url = this.currentResource.downloadUrl || this.resourceUrl
                window.open(url, '_blank')
            }
        },

        // 在新窗口打开
        openInNewTab () {
            if (this.resourceUrl) {
                window.open(this.resourceUrl, '_blank')
            }
        },

        // 在新窗口打开Office预览
        openOfficePreview () {
            if (this.currentResource) {
                const fileUrl = this.currentResource.fileUrl || this.currentResource.downloadUrl
                if (fileUrl) {
                    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`
                    window.open(viewerUrl, '_blank')
                }
            }
        },

        // 格式化文件大小
        formatFileSize (bytes) {
            if (!bytes) return '未知'
            if (bytes < 1024) return bytes + ' B'
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
            return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
        },

        // 视频同步控制
        handleVideoPlay () {
            if (this.isTeacher && this.$socket) {
                this.$socket.emit('video-action', {
                    lessonId: this.lessonId,
                    action: 'play',
                    time: (this.$refs.videoPlayer && this.$refs.videoPlayer.currentTime) || 0
                })
            }
        },

        handleVideoPause () {
            if (this.isTeacher && this.$socket) {
                this.$socket.emit('video-action', {
                    lessonId: this.lessonId,
                    action: 'pause',
                    time: (this.$refs.videoPlayer && this.$refs.videoPlayer.currentTime) || 0
                })
            }
        },

        handleTimeUpdate () {
            // 定期同步视频时间（每5秒）
            if (this.isTeacher && this.$refs.videoPlayer) {
                const time = this.$refs.videoPlayer.currentTime
                if (Math.floor(time) % 5 === 0) {
                    this.syncVideoTime(time)
                }
            }
        },

        syncVideoTime (time) {
            if (this.$socket) {
                this.$socket.emit('video-sync', {
                    lessonId: this.lessonId,
                    time: time
                })
            }
        },

        syncPageToStudents () {
            if (this.$socket && this.isTeacher) {
                this.$socket.emit('resource-page-sync', {
                    lessonId: this.lessonId,
                    resourceId: this.currentResource ? this.currentResource.id : null,
                    page: this.currentPage
                })
            }
        }
    },

    beforeDestroy () {
        if (this.pdfDoc) {
            this.pdfDoc.destroy()
        }
    }
}
</script>

<style scoped>
.enhanced-resource-viewer {
  width: 100%;
  min-height: 400px;
}

/* Office文档预览 */
.office-viewer {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
}

.office-toolbar {
  margin-bottom: 12px;
}

.office-iframe-container {
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.office-iframe-container iframe {
  display: block;
  width: 100%;
  min-height: 600px;
  border: none;
}

/* PDF预览 */
.pdf-viewer {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
}

.pdf-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.pdf-canvas-container {
  background: white;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow: auto;
  max-height: 700px;
  display: flex;
  justify-content: center;
}

.pdf-canvas {
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.load-error {
  margin-top: 20px;
}

.video-viewer,
.image-viewer,
.code-viewer,
.other-viewer {
  padding: 20px;
  background: white;
  border-radius: 4px;
}

.code-viewer pre {
  background: #f6f8fa;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
}
</style>
