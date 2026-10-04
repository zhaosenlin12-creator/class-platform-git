<template>
  <div class="student-work-gallery">
    <a-card :bordered="false">
      <div class="gallery-header">
        <h2>学生作品展示</h2>
        <p>欣赏和分享同学们的编程作品</p>

        <a-row :gutter="16" style="margin-top: 24px;">
          <a-col :span="8">
            <a-input-search
              v-model="searchText"
              placeholder="搜索作品标题、作者或描述"
              @search="handleSearch"
            />
          </a-col>
          <a-col :span="4">
            <a-select
              v-model="selectedType"
              placeholder="作品类型"
              style="width: 100%"
              allow-clear
              @change="handleFilter"
            >
              <a-select-option value="">全部类型</a-select-option>
              <a-select-option value="scratch">Scratch作品</a-select-option>
              <a-select-option value="python">Python项目</a-select-option>
              <a-select-option value="web">网页项目</a-select-option>
              <a-select-option value="game">游戏作品</a-select-option>
            </a-select>
          </a-col>
          <a-col :span="4">
            <a-select
              v-model="selectedGrade"
              placeholder="年级筛选"
              style="width: 100%"
              allow-clear
              @change="handleFilter"
            >
              <a-select-option value="">全部年级</a-select-option>
              <a-select-option value="grade1">一年级</a-select-option>
              <a-select-option value="grade2">二年级</a-select-option>
              <a-select-option value="grade3">三年级</a-select-option>
              <a-select-option value="grade4">四年级</a-select-option>
              <a-select-option value="grade5">五年级</a-select-option>
              <a-select-option value="grade6">六年级</a-select-option>
            </a-select>
          </a-col>
          <a-col :span="4">
            <a-select
              v-model="sortBy"
              placeholder="排序方式"
              style="width: 100%"
              @change="handleSort"
            >
              <a-select-option value="latest">最新发布</a-select-option>
              <a-select-option value="popular">最受欢迎</a-select-option>
              <a-select-option value="views">浏览最多</a-select-option>
              <a-select-option value="likes">点赞最多</a-select-option>
            </a-select>
          </a-col>
          <a-col :span="4">
            <a-button type="primary" icon="plus" @click="showUploadModal = true">
              上传作品
            </a-button>
          </a-col>
        </a-row>
      </div>

      <!-- 推荐作品轮播 -->
      <div v-if="featuredWorks && featuredWorks.length > 0" class="featured-works" style="margin: 32px 0;">
        <h3>
          <a-icon type="star" style="color: #faad14;" />
          推荐作品
        </h3>
        <a-carousel :autoplay="true" effect="fade">
          <div v-for="work in featuredWorks" :key="work.id" class="featured-slide">
            <div class="featured-content" @click="viewWork(work)">
              <div class="featured-image">
                <img :src="work.thumbnail" :alt="work.title" />
              </div>
              <div class="featured-info">
                <h4>{{ work.title }}</h4>
                <p>{{ work.description }}</p>
                <div class="featured-meta">
                  <span>作者：{{ work.author }}</span>
                  <span>{{ work.likes }} 点赞</span>
                </div>
              </div>
            </div>
          </div>
        </a-carousel>
      </div>

      <!-- 作品网格 -->
      <div class="works-grid">
        <a-row :gutter="[16, 16]">
          <a-col
            :xl="6"
            :lg="8"
            :md="12"
            :sm="12"
            :xs="24"
            v-for="work in filteredWorks"
            :key="work.id"
          >
            <a-card
              :hoverable="true"
              class="work-card"
              :cover="workCover(work)"
              @click="viewWork(work)"
            >
              <template #actions>
                <a-tooltip title="点赞">
                  <a-icon
                    type="heart"
                    :theme="work.isLiked ? 'filled' : 'outlined'"
                    :style="{ color: work.isLiked ? '#f5222d' : '' }"
                    @click.stop="toggleLike(work)"
                  />
                </a-tooltip>
                <a-tooltip title="收藏">
                  <a-icon
                    type="star"
                    :theme="work.isFavorite ? 'filled' : 'outlined'"
                    :style="{ color: work.isFavorite ? '#faad14' : '' }"
                    @click.stop="toggleFavorite(work)"
                  />
                </a-tooltip>
                <a-tooltip title="分享">
                  <a-icon type="share-alt" @click.stop="openShareDialog(work)" />
                </a-tooltip>
                <a-tooltip title="运行">
                  <a-icon type="play-circle" @click.stop="runWork(work)" />
                </a-tooltip>
              </template>

              <a-card-meta>
                <template #title>
                  <div class="work-title">
                    {{ work.title }}
                    <a-tag v-if="work.featured" color="gold" size="small">推荐</a-tag>
                  </div>
                </template>
                <template #description>
                  <div class="work-description">
                    {{ work.description }}
                  </div>
                </template>
              </a-card-meta>

              <div class="work-info">
                <div class="author-info">
                  <a-avatar size="small" :src="work.authorAvatar">
                    {{ work.author[0] }}
                  </a-avatar>
                  <span class="author-name">{{ work.author }}</span>
                  <a-tag v-if="work.grade" size="small" color="blue">{{ getGradeText(work.grade) }}</a-tag>
                </div>

                <div class="work-stats">
                  <span class="stat-item">
                    <a-icon type="eye" />
                    {{ work.views }}
                  </span>
                  <span class="stat-item">
                    <a-icon type="heart" />
                    {{ work.likes }}
                  </span>
                  <span class="stat-item">
                    <a-icon type="message" />
                    {{ work.comments }}
                  </span>
                </div>

                <div class="work-meta">
                  <a-tag :color="getTypeColor(work.type)" size="small">
                    {{ getTypeText(work.type) }}
                  </a-tag>
                  <span class="publish-time">{{ formatTime(work.publishTime) }}</span>
                </div>
              </div>
            </a-card>
          </a-col>
        </a-row>
      </div>

      <!-- 分页载入状态提示 -->
      <div v-if="loading" class="works-loading">
        <a-spin tip="加载中..." />
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && filteredWorks.length === 0" class="empty-state">
        <a-empty :description="total === 0 ? '暂无作品，快来上传第一个作品吧！' : '当前筛选条件下没有匹配的作品'">
          <a-button type="primary" @click="showUploadModal = true">
            上传作品
          </a-button>
        </a-empty>
      </div>

      <!-- 分页组件 -->
      <div class="pagination-wrapper" v-if="total > 0">
        <a-pagination
          v-model="currentPage"
          :total="total"
          :page-size="pageSize"
          :show-size-changer="true"
          :show-quick-jumper="true"
          :show-total="total => `共 ${total} 个作品`"
          :page-size-options="['12', '24', '36', '48']"
          @change="handlePageChange"
          @showSizeChange="handlePageSizeChange"
        />
      </div>
    </a-card>

    <!-- 作品详情弹窗 -->
    <a-modal
      title="作品详情"
      :visible="showDetailModal"
      :width="1200"
      :footer="null"
      @cancel="showDetailModal = false"
    >
      <work-detail-view
        :work="selectedWork"
        v-if="selectedWork"
        @close="showDetailModal = false"
      />
    </a-modal>

    <!-- 上传作品弹窗 -->
    <a-modal
      title="上传作品"
      :visible="showUploadModal"
      :width="800"
      :footer="null"
      @cancel="showUploadModal = false"
    >
      <upload-work-form
        @upload-success="handleUploadSuccess"
        @cancel="showUploadModal = false"
      />
    </a-modal>

    <!-- 分享弹窗 -->
    <a-modal
      title="分享作品"
      :visible="showShareModal"
      :width="500"
      @ok="confirmShare"
      @cancel="showShareModal = false"
    >
      <share-work-panel
        :work="shareWork"
        v-if="shareWork"
      />
    </a-modal>
  </div>
</template>

<script>
import WorkDetailView from './components/WorkDetailView'
import UploadWorkForm from './components/UploadWorkForm'
import ShareWorkPanel from './components/ShareWorkPanel'
import { studentWorkApi } from '@/api/teaching'

export default {
    name: 'StudentWorkGallery',
    components: {
        WorkDetailView,
        UploadWorkForm,
        ShareWorkPanel
    },
    data () {
        return {
            searchText: '',
            selectedType: '',
            selectedGrade: '',
            sortBy: 'latest',
            showDetailModal: false,
            showUploadModal: false,
            showShareModal: false,
            selectedWork: null,
            shareWork: null,
            loading: false,
            // 分页
            currentPage: 1,
            pageSize: 12,
            total: 0,
            // 当前页作品（从后端加载）
            works: [],
            // 推荐作品（点赞最多的展示）
            featuredWorks: []
        }
    },
    computed: {
        filteredWorks () {
            let result = this.works
            // 年级过滤（客户端，不影响分页）
            if (this.selectedGrade) {
                result = result.filter(w => w.grade === this.selectedGrade)
            }
            // 客户端排序
            return this.sortWorks(result)
        }
    },
    mounted () {
        this.loadWorks()
    },
    methods: {
        // ---- 数据加载 ----
        async loadWorks () {
            this.loading = true
            try {
                const params = {
                    pageNo: this.currentPage,
                    pageSize: this.pageSize
                }
                if (this.searchText) params.searchText = this.searchText
                if (this.selectedType) params.workType = this.selectedType

                const res = await studentWorkApi.getPublicWorks(params)
                if (res && res.success) {
                    const records = (res.result && res.result.records) || []
                    this.total = (res.result && res.result.total) || 0
                    // 展平字段名以匹配模板字段
                    this.works = records.map(w => ({
                        id: w.id,
                        title: w.workName || '未命名作品',
                        description: w.workDescription || '',
                        author: w.studentName || '匿名',
                        authorAvatar: null,
                        grade: '',
                        type: w.workType || 'other',
                        thumbnail: w.workCoverUrl || null,
                        publishTime: w.createTime,
                        views: w.viewCount || 0,
                        likes: w.likeCount || 0,
                        comments: w.commentCount || 0,
                        isLiked: false,
                        isFavorite: false,
                        featured: false
                    }))
                    // 推荐作品：点赞最多的前3个
                    this.featuredWorks = [...this.works]
                        .sort((a, b) => b.likes - a.likes)
                        .slice(0, 3)
                } else {
                    this.works = []
                    this.total = 0
                }
            } catch (error) {
                console.error('[WorkGallery] 加载作品失败:', error)
                this.works = []
                this.total = 0
            } finally {
                this.loading = false
            }
        },

        // ---- 分页事件 ----
        handlePageChange (page) {
            this.currentPage = page
            this.loadWorks()
            this.$nextTick(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' })
            })
        },

        handlePageSizeChange (current, size) {
            this.currentPage = 1
            this.pageSize = size
            this.loadWorks()
        },

        // ---- 搜索 / 筛选 / 排序 ----
        handleSearch () {
            this.currentPage = 1
            this.loadWorks()
        },

        handleFilter () {
            this.currentPage = 1
            if (this.selectedType !== undefined) {
                this.loadWorks()
            }
            // 年级过滤仅客户端，不重新请求
        },

        handleSort () {
            // 排序属客户端对当前页数据排序，无需重新请求
        },

        workCover (work) {
            return work.thumbnail
                ? `<img alt="${work.title}" src="${work.thumbnail}" style="height: 200px; object-fit: cover;" />`
                : `<div style="height:200px;display:flex;align-items:center;justify-content:center;background:#f5f5f5;"><div style="text-align:center;color:#999;"><div style="font-size:48px;">📁</div><div>暂无预览</div></div></div>`
        },

        getTypeColor (type) {
            const colorMap = { scratch: 'orange', python: 'green', web: 'blue', game: 'purple' }
            return colorMap[type] || 'default'
        },

        getTypeText (type) {
            const textMap = { scratch: 'Scratch', python: 'Python', web: '网页', game: '游戏' }
            return textMap[type] || '其他'
        },

        getGradeText (grade) {
            const gradeMap = {
                grade1: '一年级',
                grade2: '二年级',
                grade3: '三年级',
                grade4: '四年级',
                grade5: '五年级',
                grade6: '六年级'
            }
            return gradeMap[grade] || ''
        },

        formatTime (timeStr) {
            if (!timeStr) return ''
            const date = new Date(timeStr)
            const now = new Date()
            const days = Math.floor((now - date) / (1000 * 60 * 60 * 24))
            if (days === 0) return '今天'
            if (days === 1) return '昨天'
            if (days < 7) return `${days}天前`
            return date.toLocaleDateString()
        },

        sortWorks (works) {
            const sorted = [...works]
            switch (this.sortBy) {
            case 'latest': return sorted.sort((a, b) => new Date(b.publishTime) - new Date(a.publishTime))
            case 'popular': return sorted.sort((a, b) => (b.likes + b.views) - (a.likes + a.views))
            case 'views': return sorted.sort((a, b) => b.views - a.views)
            case 'likes': return sorted.sort((a, b) => b.likes - a.likes)
            default: return sorted
            }
        },

        viewWork (work) {
            this.selectedWork = work
            this.showDetailModal = true
            work.views++
        },

        toggleLike (work) {
            work.isLiked = !work.isLiked
            work.likes += work.isLiked ? 1 : -1
            this.$message[work.isLiked ? 'success' : 'info'](work.isLiked ? '点赞成功！' : '取消点赞')
        },

        toggleFavorite (work) {
            work.isFavorite = !work.isFavorite
            this.$message[work.isFavorite ? 'success' : 'info'](work.isFavorite ? '收藏成功！' : '取消收藏')
        },

        openShareDialog (work) {
            this.shareWork = work
            this.showShareModal = true
        },

        runWork (work) {
            this.$message.info(`正在运行作品：${work.title}`)
            if (work.type === 'scratch') this.$router.push('/programming/scratch')
            else if (work.type === 'python') this.$router.push('/programming/python')
        },

        handleUploadSuccess () {
            this.showUploadModal = false
            this.$message.success('作品上传成功！')
            this.currentPage = 1
            this.loadWorks()
        },

        confirmShare () {
            this.$message.success('分享成功！')
            this.showShareModal = false
        }
    }
}
</script>

<style scoped>
.student-work-gallery {
  padding: 24px;
}

.gallery-header h2 {
  margin: 0;
  color: #1890ff;
  font-size: 24px;
}

.gallery-header p {
  margin: 8px 0 0 0;
  color: #666;
}

.featured-works {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 24px;
  color: white;
}

.featured-works h3 {
  color: white;
  margin: 0 0 16px 0;
  font-size: 18px;
}

.featured-slide {
  height: 200px;
}

.featured-content {
  display: flex;
  height: 100%;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;
}

.featured-content:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.featured-image {
  width: 300px;
  height: 100%;
  flex-shrink: 0;
}

.featured-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.featured-info {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.featured-info h4 {
  margin: 0 0 8px 0;
  color: white;
  font-size: 20px;
}

.featured-info p {
  margin: 0 0 16px 0;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
}

.featured-meta {
  display: flex;
  gap: 24px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.works-grid {
  margin-top: 24px;
}

.work-card {
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s;
  cursor: pointer;
}

.work-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.work-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.work-description {
  color: #666;
  font-size: 13px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.work-info {
  margin-top: 12px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.author-name {
  font-weight: 500;
  color: #333;
  font-size: 13px;
}

.work-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #666;
  font-size: 12px;
}

.work-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.publish-time {
  font-size: 12px;
  color: #999;
}

.works-loading {
  text-align: center;
  padding: 24px 0;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
  padding: 16px 0;
}

.empty-state {
  text-align: center;
  padding: 64px 0;
}
</style>
