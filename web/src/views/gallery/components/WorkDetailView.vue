<template>
  <div class="work-detail-view">
    <!-- 作品信息头部 -->
    <div class="detail-header">
      <div class="work-basic-info">
        <div class="work-thumbnail">
          <img v-if="work.thumbnail" :src="work.thumbnail" :alt="work.title" />
          <div v-else class="no-thumbnail">
            <a-icon type="file-image" style="font-size: 48px; color: #ccc;" />
          </div>
        </div>

        <div class="work-meta-info">
          <h2 class="work-title">
            {{ work.title }}
            <a-tag v-if="work.featured" color="gold">推荐作品</a-tag>
          </h2>

          <div class="work-description">
            {{ work.description }}
          </div>

          <div class="work-tags" v-if="work.tags && work.tags.length > 0">
            <a-tag v-for="tag in work.tags" :key="tag" color="blue">
              {{ tag }}
            </a-tag>
          </div>

          <div class="author-section">
            <a-avatar :src="work.authorAvatar" size="large">
              {{ work.author[0] }}
            </a-avatar>
            <div class="author-details">
              <div class="author-name">{{ work.author }}</div>
              <div class="author-grade">{{ getGradeText(work.grade) }}</div>
            </div>
          </div>

          <div class="work-stats">
            <div class="stat-group">
              <div class="stat-item">
                <a-icon type="eye" />
                <span>{{ work.views }} 浏览</span>
              </div>
              <div class="stat-item">
                <a-icon type="heart" :theme="work.isLiked ? 'filled' : 'outlined'" />
                <span>{{ work.likes }} 点赞</span>
              </div>
              <div class="stat-item">
                <a-icon type="message" />
                <span>{{ work.comments }} 评论</span>
              </div>
            </div>
            <div class="publish-info">
              <a-tag :color="getTypeColor(work.type)">{{ getTypeText(work.type) }}</a-tag>
              <span class="publish-time">发布于 {{ formatTime(work.publishTime) }}</span>
            </div>
          </div>

          <div class="action-buttons">
            <a-button-group>
              <a-button
                type="primary"
                icon="play-circle"
                @click="runWork"
              >
                运行作品
              </a-button>
              <a-button
                icon="heart"
                :type="work.isLiked ? 'danger' : 'default'"
                @click="toggleLike"
              >
                {{ work.isLiked ? '取消点赞' : '点赞' }}
              </a-button>
              <a-button icon="star" @click="toggleFavorite">
                {{ work.isFavorite ? '取消收藏' : '收藏' }}
              </a-button>
              <a-button icon="share-alt" @click="shareWork">
                分享
              </a-button>
            </a-button-group>
          </div>
        </div>
      </div>
    </div>

    <a-divider />

    <!-- 作品预览区域 -->
    <div class="work-preview-section">
      <a-tabs v-model="activeTab" size="large">
        <a-tab-pane key="preview" tab="作品预览">
          <div class="preview-container">
            <!-- Scratch作品预览 -->
            <div v-if="work.type === 'scratch'" class="scratch-preview">
              <div class="scratch-stage">
                <img v-if="work.previewImage" :src="work.previewImage" alt="Scratch预览" />
                <div v-else class="preview-placeholder">
                  <a-icon type="play-circle" style="font-size: 64px; color: #ff6b35;" />
                  <h3>Scratch作品</h3>
                  <p>点击运行按钮查看作品效果</p>
                </div>
              </div>
              <div class="scratch-controls">
                <a-button type="primary" icon="play-circle" size="large" @click="runWork">
                  运行Scratch程序
                </a-button>
              </div>
            </div>

            <!-- Python作品预览 -->
            <div v-else-if="work.type === 'python'" class="python-preview">
              <div class="code-preview">
                <div class="code-header">
                  <span class="file-name">{{ work.fileName || 'main.py' }}</span>
                  <a-button size="small" icon="copy" @click="copyCode">
                    复制代码
                  </a-button>
                </div>
                <div class="code-content">
                  <pre><code>{{ samplePythonCode }}</code></pre>
                </div>
              </div>
              <div class="python-controls">
                <a-button type="primary" icon="play-circle" size="large" @click="runWork">
                  运行Python程序
                </a-button>
                <a-button icon="download" @click="downloadCode">
                  下载源码
                </a-button>
              </div>
            </div>

            <!-- 网页作品预览 -->
            <div v-else-if="work.type === 'web'" class="web-preview">
              <div class="web-frame">
                <iframe v-if="work.webUrl" :src="work.webUrl" frameborder="0"></iframe>
                <div v-else class="preview-placeholder">
                  <a-icon type="global" style="font-size: 64px; color: #1890ff;" />
                  <h3>网页作品</h3>
                  <p>点击查看按钮打开网页</p>
                </div>
              </div>
              <div class="web-controls">
                <a-button type="primary" icon="global" size="large" @click="openWebsite">
                  打开网页
                </a-button>
                <a-button icon="code" @click="viewSource">
                  查看源码
                </a-button>
              </div>
            </div>

            <!-- 游戏作品预览 -->
            <div v-else-if="work.type === 'game'" class="game-preview">
              <div class="game-screen">
                <img v-if="work.gameScreenshot" :src="work.gameScreenshot" alt="游戏截图" />
                <div v-else class="preview-placeholder">
                  <a-icon type="thunderbolt" style="font-size: 64px; color: #722ed1;" />
                  <h3>游戏作品</h3>
                  <p>点击开始按钮进入游戏</p>
                </div>
              </div>
              <div class="game-controls">
                <a-button type="primary" icon="thunderbolt" size="large" @click="startGame">
                  开始游戏
                </a-button>
              </div>
            </div>

            <!-- 默认预览 -->
            <div v-else class="default-preview">
              <div class="preview-placeholder">
                <a-icon type="file" style="font-size: 64px; color: #999;" />
                <h3>{{ work.title }}</h3>
                <p>{{ work.description }}</p>
              </div>
            </div>
          </div>
        </a-tab-pane>

        <a-tab-pane key="code" tab="源代码" v-if="work.type !== 'web'">
          <div class="source-code-section">
            <div class="code-toolbar">
              <span class="code-language">{{ getCodeLanguage(work.type) }}</span>
              <a-button-group size="small">
                <a-button icon="copy" @click="copyCode">复制</a-button>
                <a-button icon="download" @click="downloadCode">下载</a-button>
                <a-button icon="fullscreen" @click="fullscreenCode">全屏</a-button>
              </a-button-group>
            </div>
            <div class="source-code-content">
              <pre><code>{{ getSourceCode(work.type) }}</code></pre>
            </div>
          </div>
        </a-tab-pane>

        <a-tab-pane key="comments" :tab="`评论 (${work.comments || 0})`">
          <comment-section
            :work-id="work.id"
            :comments="workComments"
            @add-comment="addComment"
            @reply-comment="replyComment"
          />
        </a-tab-pane>

        <a-tab-pane key="similar" tab="相似作品">
          <similar-works
            :work="work"
            :similar-works="similarWorks"
            @view-work="$emit('view-work', $event)"
          />
        </a-tab-pane>
      </a-tabs>
    </div>
  </div>
</template>

<script>
import CommentSection from './CommentSection'
import SimilarWorks from './SimilarWorks'

export default {
    name: 'WorkDetailView',
    components: {
        CommentSection,
        SimilarWorks
    },
    props: {
        work: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            activeTab: 'preview',
            samplePythonCode: `# ${this.work.title}
# 作者：${this.work.author}

import pygame
import random
import sys

# 初始化pygame
pygame.init()

# 设置屏幕尺寸
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("${this.work.title}")

# 颜色定义
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLUE = (0, 0, 255)

# 游戏主循环
def main():
    clock = pygame.time.Clock()
    running = True

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        # 清屏
        screen.fill(WHITE)

        # 游戏逻辑
        # ... 在这里添加你的游戏代码 ...

        # 更新显示
        pygame.display.flip()
        clock.tick(60)

    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    main()`,

            workComments: [
                {
                    id: 1,
                    author: '小张',
                    avatar: '/images/avatars/user7.jpg',
                    content: '这个作品太棒了！我也想学会制作这样的程序。',
                    time: '2024-01-15 14:30:00',
                    likes: 5,
                    replies: [
                        {
                            id: 11,
                            author: '小李',
                            avatar: '/images/avatars/user8.jpg',
                            content: '同感！作者能分享一下制作思路吗？',
                            time: '2024-01-15 15:00:00',
                            likes: 2
                        }
                    ]
                },
                {
                    id: 2,
                    author: '小王',
                    avatar: '/images/avatars/user9.jpg',
                    content: '代码写得很清晰，学到了很多！',
                    time: '2024-01-15 16:20:00',
                    likes: 3,
                    replies: []
                }
            ],

            similarWorks: [
                {
                    id: 's1',
                    title: '跳跃的小球',
                    author: '小明',
                    thumbnail: '/images/works/bouncing-ball.png',
                    type: 'scratch',
                    likes: 15
                },
                {
                    id: 's2',
                    title: '简单动画',
                    author: '小红',
                    thumbnail: '/images/works/simple-animation.png',
                    type: 'scratch',
                    likes: 12
                },
                {
                    id: 's3',
                    title: '彩色图案',
                    author: '小华',
                    thumbnail: '/images/works/colorful-pattern.png',
                    type: 'scratch',
                    likes: 18
                }
            ]
        }
    },
    methods: {
        getGradeText (grade) {
            const gradeMap = {
                'grade1': '一年级',
                'grade2': '二年级',
                'grade3': '三年级',
                'grade4': '四年级',
                'grade5': '五年级',
                'grade6': '六年级'
            }
            return gradeMap[grade] || '未知年级'
        },

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

        getCodeLanguage (type) {
            const langMap = {
                'scratch': 'Scratch Blocks',
                'python': 'Python',
                'web': 'HTML/CSS/JS',
                'game': 'Python/Pygame'
            }
            return langMap[type] || 'Code'
        },

        getSourceCode (type) {
            if (type === 'python' || type === 'game') {
                return this.samplePythonCode
            } else if (type === 'scratch') {
                return `当小猫被点击时：
  重复 10 次：
    移动 10 步
    转动 36 度
  结束重复
  说 "我完成了一个圆！" 持续 2 秒

当按下空格键时：
  播放声音 "喵"
  改变颜色特效 25
  等待 0.5 秒
  清除图形特效

当绿旗被点击时：
  显示
  移到 x: 0 y: 0
  面向 90 度
  说 "你好，我是小猫！" 持续 2 秒`
            }
            return '// 源代码暂时不可用'
        },

        formatTime (timeStr) {
            const date = new Date(timeStr)
            return date.toLocaleString()
        },

        toggleLike () {
            this.work.isLiked = !this.work.isLiked
            if (this.work.isLiked) {
                this.work.likes++
                this.$message.success('点赞成功！')
            } else {
                this.work.likes--
                this.$message.info('取消点赞')
            }
        },

        toggleFavorite () {
            this.work.isFavorite = !this.work.isFavorite
            if (this.work.isFavorite) {
                this.$message.success('收藏成功！')
            } else {
                this.$message.info('取消收藏')
            }
        },

        shareWork () {
            this.$message.info('分享功能开发中...')
        },

        runWork () {
            this.$message.info(`正在运行作品：${this.work.title}`)
            // 根据作品类型跳转到相应环境
            if (this.work.type === 'scratch') {
                this.$router.push('/programming/scratch')
            } else if (this.work.type === 'python') {
                this.$router.push('/programming/python')
            }
        },

        copyCode () {
            const code = this.getSourceCode(this.work.type)
            navigator.clipboard.writeText(code).then(() => {
                this.$message.success('代码已复制到剪贴板')
            }).catch(() => {
                this.$message.error('复制失败，请手动复制')
            })
        },

        downloadCode () {
            const code = this.getSourceCode(this.work.type)
            const blob = new Blob([code], { type: 'text/plain' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${this.work.title}.${this.work.type === 'python' ? 'py' : 'txt'}`
            link.click()
            URL.revokeObjectURL(url)
            this.$message.success('代码下载成功')
        },

        fullscreenCode () {
            this.$message.info('全屏代码查看功能开发中...')
        },

        openWebsite () {
            this.$message.info('正在打开网页...')
        },

        viewSource () {
            this.activeTab = 'code'
        },

        startGame () {
            this.$message.info('正在启动游戏...')
        },

        addComment (comment) {
            this.workComments.push({
                id: Date.now(),
                author: '当前用户',
                avatar: '/images/avatars/current-user.jpg',
                content: comment,
                time: new Date().toLocaleString(),
                likes: 0,
                replies: []
            })
            this.work.comments++
            this.$message.success('评论发布成功')
        },

        replyComment (commentId, reply) {
            const comment = this.workComments.find(c => c.id === commentId)
            if (comment) {
                comment.replies.push({
                    id: Date.now(),
                    author: '当前用户',
                    avatar: '/images/avatars/current-user.jpg',
                    content: reply,
                    time: new Date().toLocaleString(),
                    likes: 0
                })
                this.$message.success('回复发布成功')
            }
        }
    }
}
</script>

<style scoped>
.work-detail-view {
  padding: 0;
}

.detail-header {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 32px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.work-basic-info {
  display: flex;
  gap: 24px;
}

.work-thumbnail {
  width: 200px;
  height: 150px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f5f5f5;
}

.work-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-thumbnail {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9f9f9;
}

.work-meta-info {
  flex: 1;
}

.work-title {
  margin: 0 0 16px 0;
  font-size: 28px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 12px;
}

.work-description {
  margin-bottom: 16px;
  font-size: 16px;
  line-height: 1.6;
  color: #666;
}

.work-tags {
  margin-bottom: 20px;
}

.author-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
}

.author-details {
  flex: 1;
}

.author-name {
  font-weight: 500;
  font-size: 16px;
  color: #333;
}

.author-grade {
  font-size: 14px;
  color: #666;
  margin-top: 2px;
}

.work-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
}

.stat-group {
  display: flex;
  gap: 24px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #666;
}

.publish-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.publish-time {
  font-size: 14px;
  color: #999;
}

.action-buttons {
  margin-top: 8px;
}

.work-preview-section {
  margin-top: 24px;
}

.preview-container {
  min-height: 400px;
}

.scratch-preview,
.python-preview,
.web-preview,
.game-preview {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.scratch-stage,
.game-screen {
  width: 100%;
  height: 360px;
  border: 2px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9f9f9;
}

.scratch-stage img,
.game-screen img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.web-frame {
  width: 100%;
  height: 500px;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.web-frame iframe {
  width: 100%;
  height: 100%;
}

.preview-placeholder {
  text-align: center;
  color: #999;
}

.preview-placeholder h3 {
  margin: 16px 0 8px 0;
  color: #666;
}

.preview-placeholder p {
  margin: 0;
  color: #999;
}

.scratch-controls,
.python-controls,
.web-controls,
.game-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.code-preview {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 16px;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #d9d9d9;
}

.file-name {
  font-weight: 500;
  color: #333;
}

.code-content {
  padding: 16px;
  background: #fafafa;
  overflow-x: auto;
  max-height: 300px;
}

.code-content pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #333;
}

.source-code-section {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
}

.code-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f8f8;
  border-bottom: 1px solid #d9d9d9;
}

.code-language {
  font-weight: 500;
  color: #333;
}

.source-code-content {
  padding: 20px;
  background: #fafafa;
  overflow-x: auto;
  max-height: 500px;
}

.source-code-content pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}

.default-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
}
</style>
