<template>
  <div class="resource-preview">
    <div class="preview-header">
      <h3>{{ resourceTitle }}</h3>
      <div class="resource-meta">
        <a-tag :color="getTypeColor(resourceType)">{{ getTypeText(resourceType) }}</a-tag>
        <span class="meta-info">
          <a-icon type="file" />
          {{ resourceSizeText }}
        </span>
        <span class="meta-info">
          <a-icon type="download" />
          {{ downloadCount }} 次下载
        </span>
        <span class="meta-info">
          <a-icon type="clock-circle" />
          {{ uploadTimeText }}
        </span>
      </div>
    </div>

    <a-divider />

    <div class="preview-content">
      <div v-if="resourceType === 'ppt'" class="ppt-preview">
        <div class="preview-placeholder">
          <a-icon type="file-ppt" style="font-size: 64px; color: #ff7a00;" />
          <h4>PPT 课件预览</h4>
          <p v-if="canPreviewPpt">点击下方按钮可以在线预览 PPT。</p>
          <p v-else>{{ resourceDescription || '当前资源不支持直接在线预览，请先下载后查看。' }}</p>
          <a-space>
            <a-button v-if="canPreviewPpt" type="primary" icon="eye" @click="openOnlinePreview">
              在线预览
            </a-button>
            <a-button icon="download" @click="downloadResource">下载文件</a-button>
          </a-space>
        </div>
      </div>

      <div v-else-if="resourceType === 'document' || resourceType === 'pdf'" class="document-preview">
        <div class="preview-placeholder">
          <a-icon type="file-pdf" style="font-size: 64px; color: #f40;" />
          <h4>文档资料预览</h4>
          <p>{{ resourceDescription || '点击下方按钮打开文档预览。' }}</p>
          <a-space>
            <a-button type="primary" icon="eye" @click="viewDocument">在线预览</a-button>
            <a-button icon="download" @click="downloadResource">下载文档</a-button>
          </a-space>
        </div>
      </div>

      <div v-else-if="resourceType === 'video'" class="video-preview">
        <div class="video-container">
          <video v-if="resource.fileUrl" controls style="width: 100%; max-height: 400px;">
            <source :src="resource.fileUrl" type="video/mp4">
            当前浏览器不支持视频播放。
          </video>
          <div v-else class="preview-placeholder">
            <a-icon type="video-camera" style="font-size: 64px; color: #52c41a;" />
            <h4>视频教程</h4>
            <p>{{ resourceDescription || '请下载后播放视频内容。' }}</p>
          </div>
        </div>
      </div>

      <div v-else-if="resourceType === 'code'" class="code-preview">
        <div class="code-header">
          <span class="file-name">{{ resourceTitle }}</span>
          <a-button v-if="supportsCodePreview" size="small" icon="copy" @click="copyCode">
            复制代码
          </a-button>
        </div>
        <div v-if="supportsCodePreview" class="code-content">
          <pre><code>{{ previewCodeContent }}</code></pre>
        </div>
        <div v-else class="preview-placeholder code-empty-state">
          <a-icon type="code" style="font-size: 48px; color: #999;" />
          <h4>当前资源暂不支持在线预览</h4>
          <p>请下载资源后在本地或对应教学工具中打开。</p>
        </div>
      </div>

      <div v-else-if="resourceType === 'ai_package'" class="ai-package-preview">
        <div class="preview-placeholder">
          <a-icon type="inbox" style="font-size: 64px; color: #2f54eb;" />
          <h4>AI 资源包</h4>
          <p>{{ resourceDescription || '可用于当前系统课堂配置，也可一键打开 AI 互动课堂继续导入使用。' }}</p>
          <div class="resource-taxonomy">
            <a-tag color="geekblue">{{ resource.courseSystemLabel || resource.courseSystem || '未分类' }}</a-tag>
            <a-tag color="cyan">{{ resource.courseStageLabel || resource.courseStage || '未分阶段' }}</a-tag>
          </div>
          <a-space>
            <a-button type="primary" icon="rocket" @click="importToClassroom">
              导入当前系统课堂
            </a-button>
            <a-button icon="link" @click="openAiClassroom">打开AI互动课堂</a-button>
            <a-button icon="download" @click="downloadResource">下载资源包</a-button>
          </a-space>
        </div>
      </div>

      <div v-else-if="resourceType === 'image'" class="image-preview">
        <div class="image-container">
          <img
            v-if="resource.fileUrl"
            :src="resource.fileUrl"
            alt="资源预览"
            style="max-width: 100%; max-height: 400px;"
          >
          <div v-else class="preview-placeholder">
            <a-icon type="file-image" style="font-size: 64px; color: #722ed1;" />
            <h4>图片资源</h4>
            <p>{{ resourceDescription || '当前资源暂无可直接展示的图片地址。' }}</p>
          </div>
        </div>
      </div>

      <div v-else class="default-preview">
        <div class="preview-placeholder">
          <a-icon type="file" style="font-size: 64px; color: #999;" />
          <h4>{{ resourceTitle }}</h4>
          <p>{{ resourceDescription || '该资源支持下载后查看。' }}</p>
          <a-button type="primary" icon="download" @click="downloadResource">下载文件</a-button>
        </div>
      </div>
    </div>

    <a-divider />

    <div class="preview-description">
      <h4>资源说明</h4>
      <p>{{ resourceDescription || '暂无详细说明' }}</p>

      <div class="resource-extended-meta">
        <div class="meta-row">
          <span class="meta-label">课程体系</span>
          <span>{{ resource.courseSystemLabel || resource.courseSystem || '-' }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">课程阶段</span>
          <span>{{ resource.courseStageLabel || resource.courseStage || '-' }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">文件名称</span>
          <span class="meta-break">{{ resource.fileName || resource.file_name || resourceTitle }}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">文件格式</span>
          <span>{{ normalizedFormat || '-' }}</span>
        </div>
      </div>

      <div v-if="displayTags.length > 0" style="margin-top: 16px;">
        <h4>标签</h4>
        <a-tag v-for="tag in displayTags" :key="tag" color="blue">{{ tag }}</a-tag>
      </div>
    </div>

    <div class="preview-actions">
      <a-space>
        <a-button type="primary" icon="download" @click="downloadResource">下载资源</a-button>
        <a-button icon="share-alt" @click="shareResource">分享</a-button>
        <a-button v-if="favoriteAvailable" icon="heart" @click="toggleFavorite">
          {{ isFavorite ? '取消收藏' : '收藏' }}
        </a-button>
      </a-space>
    </div>
  </div>
</template>

<script>
import { courseResourceApi } from '@/api/teaching'

export default {
    name: 'ResourcePreview',
    props: {
        resource: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            isFavorite: false
        }
    },
    computed: {
        resourceType () {
            return this.resource.type || this.resource.resource_type || 'other'
        },
        resourceTitle () {
            return this.resource.name || this.resource.title || this.resource.resource_name || '未命名资源'
        },
        resourceDescription () {
            return this.resource.description || ''
        },
        resourceSizeText () {
            return this.resource.sizeText || this.resource.size || this.resource.file_size || '-'
        },
        normalizedFormat () {
            return String(this.resource.format || this.resource.file_extension || '').trim().toLowerCase()
        },
        downloadCount () {
            return this.resource.downloadCount || this.resource.download_count || this.resource.downloads || 0
        },
        uploadTimeText () {
            return this.resource.uploadTime || this.resource.create_time || '-'
        },
        displayTags () {
            if (Array.isArray(this.resource.tags)) {
                return this.resource.tags.filter(Boolean)
            }
            if (typeof this.resource.tags === 'string') {
                return this.resource.tags.split(/[，,]/).map(item => item.trim()).filter(Boolean)
            }
            return []
        },
        isOSSUrl () {
            const url = this.directPreviewSourceUrl
            if (!url) {
                return false
            }
            return /^https?:\/\//i.test(url) && (
                url.includes('aliyuncs.com') ||
                url.includes('oss-cn-') ||
                !url.startsWith(window.location.origin)
            )
        },
        directPreviewSourceUrl () {
            return this.toAbsoluteUrl(this.resource.fileUrl || this.resource.previewUrl || this.resource.downloadUrl || '')
        },
        officeViewerUrl () {
            if (!this.directPreviewSourceUrl || !this.supportsOfficePreview || !this.isOSSUrl) {
                return ''
            }
            return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(this.directPreviewSourceUrl)}`
        },
        canPreviewPpt () {
            return Boolean(this.officeViewerUrl)
        },
        supportsOfficePreview () {
            return ['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'].includes(this.normalizedFormat)
        },
        supportsDirectBrowserPreview () {
            return ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'mp4', 'mp3', 'wav'].includes(this.normalizedFormat)
        },
        previewCodeContent () {
            return String(
                this.resource.codeContent ||
                this.resource.code_content ||
                this.resource.demoContent ||
                this.resource.demo_content ||
                this.resource.content ||
                ''
            ).trim()
        },
        supportsCodePreview () {
            return this.resourceType === 'code' && Boolean(this.previewCodeContent)
        },
        favoriteAvailable () {
            return false
        }
    },
    methods: {
        getTypeColor (type) {
            const colorMap = {
                ppt: 'orange',
                document: 'red',
                video: 'green',
                code: 'purple',
                image: 'cyan',
                ai_package: 'blue'
            }
            return colorMap[type] || 'default'
        },
        getTypeText (type) {
            const textMap = {
                ppt: 'PPT课件',
                document: '文档资料',
                video: '视频教程',
                code: '代码示例',
                image: '图片资源',
                ai_package: 'AI资源包'
            }
            return textMap[type] || '其他文件'
        },
        importToClassroom () {
            this.$emit('import-ai-package', this.resource)
        },
        openAiClassroom () {
            this.$emit('open-ai-classroom', this.resource)
        },
        toAbsoluteUrl (url) {
            const normalizedUrl = String(url || '').trim()
            if (!normalizedUrl) {
                return ''
            }
            if (/^https?:\/\//i.test(normalizedUrl)) {
                return normalizedUrl
            }
            if (normalizedUrl.startsWith('//')) {
                return `${window.location.protocol}${normalizedUrl}`
            }
            if (normalizedUrl.startsWith('/')) {
                return `${window.location.origin}${normalizedUrl}`
            }
            return normalizedUrl
        },
        async copyText (text, successMessage) {
            if (!text) {
                return
            }

            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text)
                if (successMessage) {
                    this.$message.success(successMessage)
                }
                return
            }

            const input = document.createElement('input')
            input.value = text
            document.body.appendChild(input)
            input.select()
            document.execCommand('copy')
            document.body.removeChild(input)
            if (successMessage) {
                this.$message.success(successMessage)
            }
        },
        async downloadResource () {
            try {
                const response = await courseResourceApi.getResourceDownloadUrl(this.resource.id)
                const downloadUrl = response && response.result && response.result.downloadUrl
                if (!downloadUrl) {
                    throw new Error('missing download url')
                }

                window.open(downloadUrl, '_blank')
                this.$message.success(`已开始下载：${this.resourceTitle}`)
            } catch (error) {
                this.$message.error('下载失败，请稍后重试')
            }
        },
        async viewDocument () {
            try {
                let previewUrl = ''

                if (this.supportsOfficePreview && this.officeViewerUrl) {
                    previewUrl = this.officeViewerUrl
                } else if (this.supportsOfficePreview) {
                    throw new Error('office preview unavailable')
                } else if (this.supportsDirectBrowserPreview && this.directPreviewSourceUrl) {
                    previewUrl = this.directPreviewSourceUrl
                } else if (this.resource.previewUrl) {
                    previewUrl = this.resource.previewUrl
                } else {
                    const response = await courseResourceApi.getShareLink(this.resource.id, { expireDays: 7 })
                    previewUrl = response && response.result && (response.result.previewUrl || response.result.shareUrl)
                }

                if (!previewUrl) {
                    throw new Error('missing preview url')
                }

                window.open(previewUrl, '_blank')
                this.$message.success('正在打开资源预览...')
            } catch (error) {
                this.$message.error('当前资源暂不支持直接在线预览，请下载后查看')
            }
        },
        async copyCode () {
            if (!this.supportsCodePreview) {
                this.$message.info('当前资源暂不支持在线复制代码')
                return
            }

            try {
                await this.copyText(this.previewCodeContent, '代码已复制到剪贴板')
            } catch (error) {
                this.$message.error('复制失败，请手动复制')
            }
        },
        async shareResource () {
            try {
                const response = await courseResourceApi.getShareLink(this.resource.id, { expireDays: 7 })
                const shareUrl = response && response.result && response.result.shareUrl
                if (!shareUrl) {
                    throw new Error('missing share url')
                }

                await this.copyText(shareUrl, '分享链接已复制到剪贴板')
            } catch (error) {
                this.$message.error('分享链接生成失败，请稍后重试')
            }
        },
        toggleFavorite () {
            this.$message.info('当前资源暂不支持收藏')
        },
        openOnlinePreview () {
            if (this.officeViewerUrl) {
                window.open(this.officeViewerUrl, '_blank')
                return
            }
            if (this.directPreviewSourceUrl) {
                window.open(this.directPreviewSourceUrl, '_blank')
                return
            }
            this.$message.info('当前资源暂不支持在线预览')
        }
    }
}
</script>

<style scoped>
.resource-preview {
  padding: 16px;
}

.preview-header h3 {
  margin: 0 0 16px 0;
  color: #1f2937;
}

.resource-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.meta-info {
  display: flex;
  align-items: center;
  color: #666;
  font-size: 14px;
}

.meta-info .anticon {
  margin-right: 4px;
}

.preview-content {
  min-height: 240px;
  margin: 16px 0;
}

.preview-placeholder {
  text-align: center;
  padding: 48px 0;
}

.preview-placeholder h4 {
  margin: 16px 0 8px 0;
  color: #1f2937;
}

.preview-placeholder p {
  color: #666;
  margin-bottom: 24px;
}

.video-container,
.image-container {
  text-align: center;
}

.code-preview {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #d9d9d9;
}

.file-name {
  font-weight: 500;
  color: #1f2937;
}

.code-content {
  padding: 16px;
  background: #fafafa;
  overflow-x: auto;
}

.code-content pre {
  margin: 0;
  font-family: Monaco, Menlo, Ubuntu Mono, monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #333;
}

.code-empty-state {
  min-height: 220px;
}

.resource-taxonomy {
  margin-bottom: 20px;
}

.preview-description h4 {
  margin: 16px 0 8px 0;
  color: #1f2937;
}

.preview-actions {
  margin-top: 20px;
}

.resource-extended-meta {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 20px;
}

.meta-row {
  display: flex;
  gap: 8px;
  color: #4b5563;
}

.meta-label {
  min-width: 70px;
  color: #8c8c8c;
}

.meta-break {
  word-break: break-all;
}
</style>
