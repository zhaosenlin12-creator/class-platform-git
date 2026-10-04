<template>
  <div class="share-work-panel">
    <div class="share-header">
      <h4>分享作品</h4>
      <p>让更多同学看到你的精彩作品</p>
    </div>

    <!-- 作品预览 -->
    <div class="work-preview">
      <div class="preview-image">
        <img v-if="work.thumbnail" :src="work.thumbnail" :alt="work.title" />
        <div v-else class="no-image">
          <a-icon type="file-image" style="font-size: 32px; color: #ccc;" />
        </div>
      </div>
      <div class="preview-info">
        <h5>{{ work.title }}</h5>
        <p>{{ work.description }}</p>
        <div class="work-meta">
          <a-tag :color="getTypeColor(work.type)">{{ getTypeText(work.type) }}</a-tag>
          <span class="author">作者：{{ work.author }}</span>
        </div>
      </div>
    </div>

    <a-divider />

    <!-- 分享方式 -->
    <div class="share-methods">
      <h5>选择分享方式</h5>

      <a-row :gutter="16">
        <!-- 生成分享链接 -->
        <a-col :span="24" style="margin-bottom: 16px;">
          <a-card size="small" hoverable @click="generateShareLink">
            <div class="share-option">
              <a-icon type="link" style="font-size: 20px; color: #1890ff;" />
              <div class="option-content">
                <div class="option-title">生成分享链接</div>
                <div class="option-desc">创建一个链接，其他人可以通过链接查看作品</div>
              </div>
              <a-icon type="right" />
            </div>
          </a-card>
        </a-col>

        <!-- 分享到班级群 -->
        <a-col :span="24" style="margin-bottom: 16px;">
          <a-card size="small" hoverable @click="shareToClass">
            <div class="share-option">
              <a-icon type="team" style="font-size: 20px; color: #52c41a;" />
              <div class="option-content">
                <div class="option-title">分享到班级</div>
                <div class="option-desc">在班级动态中展示你的作品</div>
              </div>
              <a-icon type="right" />
            </div>
          </a-card>
        </a-col>

        <!-- 生成二维码 -->
        <a-col :span="24" style="margin-bottom: 16px;">
          <a-card size="small" hoverable @click="generateQRCode">
            <div class="share-option">
              <a-icon type="qrcode" style="font-size: 20px; color: #722ed1;" />
              <div class="option-content">
                <div class="option-title">生成二维码</div>
                <div class="option-desc">生成二维码，方便用手机扫描查看</div>
              </div>
              <a-icon type="right" />
            </div>
          </a-card>
        </a-col>

        <!-- 导出为图片 -->
        <a-col :span="24" style="margin-bottom: 16px;">
          <a-card size="small" hoverable @click="exportAsImage">
            <div class="share-option">
              <a-icon type="picture" style="font-size: 20px; color: #fa541c;" />
              <div class="option-content">
                <div class="option-title">导出为图片</div>
                <div class="option-desc">将作品信息制作成精美的分享图片</div>
              </div>
              <a-icon type="right" />
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- 分享链接结果 -->
    <div v-if="shareLink" class="share-result">
      <a-divider />
      <h5>分享链接已生成</h5>
      <a-input-group compact>
        <a-input
          :value="shareLink"
          readonly
          style="width: calc(100% - 80px);"
        />
        <a-button type="primary" @click="copyShareLink">
          复制
        </a-button>
      </a-input-group>
      <div class="link-actions">
        <a-space>
          <a-button size="small" @click="previewShare">
            预览效果
          </a-button>
          <a-button size="small" @click="setLinkExpiry">
            设置过期时间
          </a-button>
          <a-button size="small" @click="setAccessPassword">
            设置访问密码
          </a-button>
        </a-space>
      </div>
    </div>

    <!-- 二维码显示 -->
    <div v-if="showQRCode" class="qr-code-section">
      <a-divider />
      <h5>扫描二维码查看作品</h5>
      <div class="qr-code-container">
        <div class="qr-code-placeholder">
          <a-icon type="qrcode" style="font-size: 80px; color: #999;" />
          <p>二维码</p>
        </div>
      </div>
      <div class="qr-actions">
        <a-space>
          <a-button size="small" @click="downloadQRCode">
            下载二维码
          </a-button>
          <a-button size="small" @click="printQRCode">
            打印二维码
          </a-button>
        </a-space>
      </div>
    </div>

    <!-- 分享统计 -->
    <div class="share-stats">
      <a-divider />
      <h5>分享统计</h5>
      <a-row :gutter="16">
        <a-col :span="8">
          <a-statistic title="分享次数" :value="shareCount" />
        </a-col>
        <a-col :span="8">
          <a-statistic title="访问次数" :value="visitCount" />
        </a-col>
        <a-col :span="8">
          <a-statistic title="点赞次数" :value="work.likes" />
        </a-col>
      </a-row>
    </div>

    <!-- 分享设置 -->
    <div class="share-settings">
      <a-divider />
      <h5>分享设置</h5>
      <a-form layout="vertical">
        <a-form-item label="分享权限">
          <a-radio-group v-model="sharePermission">
            <a-radio value="public">所有人可访问</a-radio>
            <a-radio value="class">仅班级同学</a-radio>
            <a-radio value="friends">仅好友可访问</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="允许操作">
          <a-checkbox-group v-model="allowedActions">
            <a-checkbox value="view">允许查看</a-checkbox>
            <a-checkbox value="like">允许点赞</a-checkbox>
            <a-checkbox value="comment">允许评论</a-checkbox>
            <a-checkbox value="download">允许下载</a-checkbox>
            <a-checkbox value="remix">允许重新创作</a-checkbox>
          </a-checkbox-group>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>

<script>
export default {
    name: 'ShareWorkPanel',
    props: {
        work: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            shareLink: '',
            showQRCode: false,
            shareCount: 15,
            visitCount: 68,
            sharePermission: 'public',
            allowedActions: ['view', 'like', 'comment']
        }
    },
    methods: {
        getTypeColor (type) {
            const colorMap = {
                'scratch': 'orange',
                'python': 'green',
                'web': 'blue',
                'game': 'purple'
            }
            return colorMap[type] || 'default'
        },

        getTypeText (type) {
            const textMap = {
                'scratch': 'Scratch',
                'python': 'Python',
                'web': '网页',
                'game': '游戏'
            }
            return textMap[type] || '其他'
        },

        generateShareLink () {
            // 模拟生成分享链接
            const baseUrl = window.location.origin
            const shareId = Math.random().toString(36).substr(2, 9)
            this.shareLink = `${baseUrl}/share/work/${shareId}`
            this.shareCount++
            this.$message.success('分享链接生成成功！')
        },

        copyShareLink () {
            navigator.clipboard.writeText(this.shareLink).then(() => {
                this.$message.success('分享链接已复制到剪贴板')
            }).catch(() => {
                this.$message.error('复制失败，请手动复制')
            })
        },

        shareToClass () {
            this.$message.success('作品已分享到班级动态！')
            this.shareCount++
        },

        generateQRCode () {
            this.showQRCode = true
            if (!this.shareLink) {
                this.generateShareLink()
            }
            this.$message.success('二维码生成成功！')
        },

        exportAsImage () {
            this.$message.info('正在生成分享图片...')
            // 这里可以实现将作品信息导出为图片的功能
            setTimeout(() => {
                this.$message.success('分享图片生成完成！')
            }, 2000)
        },

        downloadQRCode () {
            this.$message.success('二维码下载成功！')
        },

        printQRCode () {
            this.$message.info('准备打印二维码...')
        },

        previewShare () {
            if (this.shareLink) {
                window.open(this.shareLink, '_blank')
            }
        },

        setLinkExpiry () {
            this.$message.info('链接过期时间设置功能开发中...')
        },

        setAccessPassword () {
            this.$message.info('访问密码设置功能开发中...')
        }
    }
}
</script>

<style scoped>
.share-work-panel {
  padding: 16px 0;
}

.share-header h4 {
  margin: 0 0 8px 0;
  color: #333;
}

.share-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.work-preview {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  margin: 16px 0;
}

.preview-image {
  width: 80px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.preview-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
}

.preview-info {
  flex: 1;
}

.preview-info h5 {
  margin: 0 0 8px 0;
  font-weight: 500;
  color: #333;
}

.preview-info p {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #666;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.work-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author {
  font-size: 12px;
  color: #999;
}

.share-methods h5 {
  margin: 0 0 16px 0;
  color: #333;
}

.share-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.option-content {
  flex: 1;
}

.option-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.option-desc {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

.share-result {
  margin-top: 16px;
}

.share-result h5 {
  margin: 0 0 12px 0;
  color: #333;
}

.link-actions {
  margin-top: 12px;
}

.qr-code-section {
  margin-top: 16px;
}

.qr-code-section h5 {
  margin: 0 0 16px 0;
  color: #333;
  text-align: center;
}

.qr-code-container {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.qr-code-placeholder {
  width: 200px;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  background: #fafafa;
}

.qr-code-placeholder p {
  margin: 8px 0 0 0;
  color: #999;
}

.qr-actions {
  text-align: center;
}

.share-stats h5,
.share-settings h5 {
  margin: 0 0 16px 0;
  color: #333;
}

.share-settings .ant-radio {
  display: block;
  height: 30px;
  line-height: 30px;
}

.share-settings .ant-checkbox-wrapper {
  margin-left: 0;
  margin-bottom: 8px;
}
</style>
