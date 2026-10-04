<template>
  <div class="resource-viewer">
    <a-card :bordered="false" size="small">
      <div slot="title">
        <a-icon type="file-text" />
        课程资源
        <a-tag v-if="currentResource" color="blue" style="margin-left: 8px">
          {{ resourceTypeText }}
        </a-tag>
      </div>
      <div slot="extra">
        <a-button-group size="small">
          <a-button @click="previousPage" :disabled="currentPage <= 1 || !canNavigate">
            <a-icon type="left" />
          </a-button>
          <a-button @click="nextPage" :disabled="currentPage >= totalPages || !canNavigate">
            <a-icon type="right" />
          </a-button>
          <a-button @click="toggleFullscreen">
            <a-icon :type="isFullscreen ? 'fullscreen-exit' : 'fullscreen'" />
          </a-button>
          <a-button @click="downloadResource" v-if="currentResource">
            <a-icon type="download" />
          </a-button>
        </a-button-group>
      </div>

      <!-- 资源展示区 -->
      <div class="resource-display" :class="{ 'fullscreen': isFullscreen }" ref="resourceDisplay">
        <!-- PPT/PDF 展示 (使用Office Online Viewer) -->
        <div v-if="currentResource && isPptOrPdf" class="document-viewer">
          <iframe
            :src="officeViewerUrl"
            frameborder="0"
            width="100%"
            height="100%"
            @error="handleIframeError"
          />
        </div>

        <!-- 视频展示 -->
        <div v-else-if="currentResource && isVideo" class="video-viewer">
          <video
            :src="resourceUrl"
            controls
            controlsList="nodownload"
            style="width: 100%; max-height: 100%;"
            @play="handleVideoPlay"
            @pause="handleVideoPause"
          />
        </div>

        <!-- 图片展示 -->
        <div v-else-if="currentResource && isImage" class="image-viewer">
          <img
            :src="resourceUrl"
            :alt="currentResource.name"
            style="max-width: 100%; max-height: 100%; object-fit: contain;"
          />
        </div>

        <!-- 代码文件展示 -->
        <div v-else-if="currentResource && isCode" class="code-viewer">
          <a-textarea
            :value="codeContent"
            :auto-size="{ minRows: 20, maxRows: 30 }"
            readonly
            style="font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 13px;"
          />
        </div>

        <div v-else-if="currentResource && isAiPackage" class="ai-package-viewer">
          <a-empty description="当前资源为 AI 资源包，暂不支持在此窗口直接预览。">
            <a-button type="primary" @click="downloadResource">
              下载资源包
            </a-button>
          </a-empty>
        </div>

        <!-- 无资源状态 -->
        <a-empty v-else description="暂无课程资源" style="margin-top: 60px;">
          <a-button type="primary" @click="$emit('select-resource')">
            选择资源
          </a-button>
        </a-empty>
      </div>

      <!-- 页码指示器 -->
      <div class="page-indicator" v-if="totalPages > 1">
        <a-input-number
          v-model="currentPage"
          :min="1"
          :max="totalPages"
          size="small"
          @change="handlePageChange"
          style="width: 80px;"
        />
        <span style="margin: 0 8px;">/</span>
        <span>{{ totalPages }}</span>
      </div>

      <!-- 资源信息 -->
      <div class="resource-info" v-if="currentResource">
        <a-descriptions size="small" :column="2">
          <a-descriptions-item label="资源名称">
            {{ currentResource.name || currentResource.title }}
          </a-descriptions-item>
          <a-descriptions-item label="文件大小">
            {{ currentResource.sizeText || formatFileSize(currentResource.size) }}
          </a-descriptions-item>
        </a-descriptions>
      </div>
    </a-card>
  </div>
</template>

<script>
import { courseResourceApi } from '@/api/teaching'
import { getResourceTypeLabel } from '@/views/course/resourceMeta'
import { getConfiguredBaseUrl } from '@/utils/runtimeBaseUrl'

export default {
    name: 'ResourceViewer',
    props: {
        lessonId: {
            type: String,
            default: ''
        },
        resourceId: {
            type: String,
            default: ''
        },
        // 是否是教师端（教师端可以翻页，学生端跟随）
        isTeacher: {
            type: Boolean,
            default: false
        }
    },
    data () {
        return {
            currentResource: null,
            currentPage: 1,
            totalPages: 1,
            isFullscreen: false,
            loading: false,
            codeContent: '',
            iframeError: false
        }
    },
    computed: {
        normalizedResourceType () {
            if (!this.currentResource) return ''
            return String(this.currentResource.type || this.currentResource.resourceType || '').trim().toLowerCase()
        },
        resourceUrl () {
            if (!this.currentResource) return ''
            const baseUrl = getConfiguredBaseUrl(process.env.VUE_APP_API_BASE_URL)
            return `${baseUrl}/api/teaching/course/resources/preview/${this.currentResource.id}`
        },
        officeViewerUrl () {
            if (!this.currentResource) return ''
            // 使用微软Office Online Viewer
            const encodedUrl = encodeURIComponent(this.resourceUrl)
            return `https://view.officeapps.live.com/op/view.aspx?src=${encodedUrl}`
        },
        isPptOrPdf () {
            if (!this.currentResource) return false
            const type = this.normalizedResourceType
            const ext = this.currentResource.format || this.currentResource.fileExtension
            return ['ppt', 'pdf', 'document'].includes(type) ||
             ['ppt', 'pptx', 'pdf', 'doc', 'docx'].includes(ext)
        },
        isVideo () {
            if (!this.currentResource) return false
            const type = this.normalizedResourceType
            return type === 'video' || ['mp4', 'avi', 'mov', 'wmv'].includes(this.currentResource.format)
        },
        isImage () {
            if (!this.currentResource) return false
            const type = this.normalizedResourceType
            return type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(this.currentResource.format)
        },
        isCode () {
            if (!this.currentResource) return false
            const type = this.normalizedResourceType
            return type === 'code' || ['py', 'js', 'html', 'css', 'java'].includes(this.currentResource.format)
        },
        isAiPackage () {
            return this.normalizedResourceType === 'ai_package'
        },
        resourceTypeText () {
            if (!this.currentResource) return ''
            if (this.isPptOrPdf) return 'PPT/文档'
            if (this.isVideo) return '视频'
            if (this.isImage) return '图片'
            if (this.isCode) return '代码'
            return getResourceTypeLabel(this.normalizedResourceType)
        },
        canNavigate () {
            // 只有教师端可以翻页
            return this.isTeacher
        }
    },
    watch: {
        lessonId: {
            immediate: true,
            handler (val) {
                if (val) {
                    this.loadResourceByLesson()
                }
            }
        },
        resourceId: {
            immediate: true,
            handler (val) {
                if (val) {
                    this.loadResourceById()
                }
            }
        }
    },
    mounted () {
    // 监听学生端页码同步事件
        if (!this.isTeacher && this.$socket) {
            this.$socket.on('sync-resource-page', this.handlePageSync)
        }
    },
    beforeDestroy () {
        if (!this.isTeacher && this.$socket) {
            this.$socket.off('sync-resource-page', this.handlePageSync)
        }
    },
    methods: {
        async loadResourceByLesson () {
            if (!this.lessonId) return

            this.loading = true
            try {
                // 根据课节ID获取关联的资源
                const response = await courseResourceApi.getResourceList({ lessonId: this.lessonId })
                if (response.success && response.result && response.result.records && response.result.records.length > 0) {
                    this.currentResource = response.result.records[0]
                    await this.loadResourceContent()
                } else {
                    console.warn('该课节没有关联资源')
                }
            } catch (error) {
                console.error('加载资源失败:', error)
                this.$message.error('加载资源失败')
            } finally {
                this.loading = false
            }
        },

        async loadResourceById () {
            if (!this.resourceId) return

            this.loading = true
            try {
                const response = await courseResourceApi.getResourceDetails(this.resourceId)
                if (response.success && response.result) {
                    this.currentResource = response.result
                    await this.loadResourceContent()
                }
            } catch (error) {
                console.error('加载资源失败:', error)
                this.$message.error('加载资源失败')
            } finally {
                this.loading = false
            }
        },

        async loadResourceContent () {
            // 如果是代码文件，加载内容
            if (this.isCode) {
                try {
                    const response = await fetch(this.resourceUrl)
                    this.codeContent = await response.text()
                } catch (error) {
                    console.error('加载代码内容失败:', error)
                }
            }
        },

        previousPage () {
            if (this.currentPage > 1 && this.canNavigate) {
                this.currentPage--
                this.syncPageToStudents()
                this.$emit('page-change', this.currentPage)
            }
        },

        nextPage () {
            if (this.currentPage < this.totalPages && this.canNavigate) {
                this.currentPage++
                this.syncPageToStudents()
                this.$emit('page-change', this.currentPage)
            }
        },

        handlePageChange (page) {
            if (this.canNavigate) {
                this.currentPage = page
                this.syncPageToStudents()
                this.$emit('page-change', this.currentPage)
            }
        },

        toggleFullscreen () {
            this.isFullscreen = !this.isFullscreen
            if (this.isFullscreen) {
                if (this.$refs.resourceDisplay && this.$refs.resourceDisplay.requestFullscreen) {
                    this.$refs.resourceDisplay.requestFullscreen()
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen()
                }
            }
        },

        downloadResource () {
            if (!this.currentResource) return
            const baseUrl = getConfiguredBaseUrl(process.env.VUE_APP_API_BASE_URL)
            const downloadUrl = `${baseUrl}/api/teaching/course/resources/download/${this.currentResource.id}`
            window.open(downloadUrl, '_blank')
        },

        syncPageToStudents () {
            // 通过Socket.IO同步当前页码到学生端
            if (this.isTeacher && this.$socket) {
                this.$socket.emit('sync-resource-page', {
                    lessonId: this.lessonId,
                    resourceId: this.currentResource ? this.currentResource.id : null,
                    currentPage: this.currentPage
                })
            }
        },

        handlePageSync (data) {
            // 学生端接收页码同步
            if (!this.isTeacher && this.currentResource && data.resourceId === this.currentResource.id) {
                this.currentPage = data.currentPage
            }
        },

        handleVideoPlay () {
            if (this.isTeacher && this.$socket) {
                this.$socket.emit('sync-video-action', {
                    resourceId: this.currentResource.id,
                    action: 'play'
                })
            }
        },

        handleVideoPause () {
            if (this.isTeacher && this.$socket) {
                this.$socket.emit('sync-video-action', {
                    resourceId: this.currentResource.id,
                    action: 'pause'
                })
            }
        },

        handleIframeError () {
            this.iframeError = true
            this.$message.warning('无法加载Office预览，请尝试下载查看')
        },

        formatFileSize (bytes) {
            if (!bytes) return '0 B'
            const k = 1024
            const sizes = ['B', 'KB', 'MB', 'GB']
            const i = Math.floor(Math.log(bytes) / Math.log(k))
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
        }
    }
}
</script>

<style scoped lang="less">
.resource-viewer {
  height: 100%;
  display: flex;
  flex-direction: column;

  .resource-display {
    min-height: 500px;
    max-height: 600px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f5f5f5;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    padding: 16px;
    position: relative;

    &.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw !important;
      height: 100vh !important;
      max-height: none;
      z-index: 9999;
      padding: 0;
      border-radius: 0;
    }

    .document-viewer,
    .video-viewer,
    .image-viewer,
    .code-viewer,
    .ai-package-viewer {
      width: 100%;
      height: 100%;
    }

    iframe {
      width: 100%;
      height: 100%;
      min-height: 500px;
    }
  }

  .page-indicator {
    margin-top: 16px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
  }

  .resource-info {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #f0f0f0;
  }
}
</style>
