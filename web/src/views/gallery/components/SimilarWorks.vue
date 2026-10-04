<template>
  <div class="similar-works">
    <div class="section-header">
      <h4>相似作品推荐</h4>
      <p>基于当前作品的类型、标签为你推荐其他优秀作品</p>
    </div>

    <a-row :gutter="[16, 16]">
      <a-col
        :xl="8"
        :lg="12"
        :md="12"
        :sm="24"
        v-for="similarWork in similarWorks"
        :key="similarWork.id"
      >
        <a-card
          :hoverable="true"
          class="similar-work-card"
          :cover="workCover(similarWork)"
          @click="viewWork(similarWork)"
        >
          <template #actions>
            <a-tooltip title="查看">
              <a-icon type="eye" @click.stop="viewWork(similarWork)" />
            </a-tooltip>
            <a-tooltip title="点赞">
              <a-icon type="heart" @click.stop="likeWork(similarWork)" />
            </a-tooltip>
            <a-tooltip title="收藏">
              <a-icon type="star" @click.stop="favoriteWork(similarWork)" />
            </a-tooltip>
          </template>

          <a-card-meta>
            <template #title>
              <div class="work-title">
                {{ similarWork.title }}
              </div>
            </template>
            <template #description>
              <div class="work-meta">
                <div class="author-info">
                  <a-avatar size="small" :src="similarWork.authorAvatar">
                    {{ similarWork.author[0] }}
                  </a-avatar>
                  <span class="author-name">{{ similarWork.author }}</span>
                </div>

                <div class="work-stats">
                  <span class="stat-item">
                    <a-icon type="heart" />
                    {{ similarWork.likes }}
                  </span>
                  <span class="stat-item">
                    <a-icon type="eye" />
                    {{ similarWork.views || 0 }}
                  </span>
                </div>

                <a-tag :color="getTypeColor(similarWork.type)" size="small">
                  {{ getTypeText(similarWork.type) }}
                </a-tag>
              </div>
            </template>
          </a-card-meta>
        </a-card>
      </a-col>
    </a-row>

    <!-- 加载更多推荐 -->
    <div class="load-more-section">
      <a-button type="dashed" block @click="loadMoreSimilar">
        <a-icon type="reload" />
        换一批推荐
      </a-button>
    </div>

    <!-- 推荐算法说明 -->
    <div class="recommendation-info">
      <a-alert
        message="推荐算法"
        description="我们根据作品类型、标签、创作者年级等因素为你推荐相似的优秀作品，帮助你发现更多有趣的创意！"
        type="info"
        show-icon
        closable
      />
    </div>
  </div>
</template>

<script>
export default {
    name: 'SimilarWorks',
    props: {
        work: {
            type: Object,
            required: true
        },
        similarWorks: {
            type: Array,
            default: () => []
        }
    },
    methods: {
        workCover (work) {
            return work.thumbnail ? (
                `<img alt="${work.title}" src="${work.thumbnail}" style="height: 160px; object-fit: cover;" />`
            ) : (
                `<div style="height: 160px; display: flex; align-items: center; justify-content: center; background: #f5f5f5;">
          <div style="text-align: center; color: #999;">
            <div style="font-size: 32px;">📁</div>
            <div style="font-size: 12px;">暂无预览</div>
          </div>
        </div>`
            )
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

        viewWork (work) {
            this.$emit('view-work', work)
        },

        likeWork (work) {
            work.likes = (work.likes || 0) + 1
            this.$message.success(`为《${work.title}》点赞成功！`)
        },

        favoriteWork (work) {
            this.$message.success(`收藏《${work.title}》成功！`)
        },

        loadMoreSimilar () {
            this.$message.info('正在为你寻找更多相似作品...')
            // 这里可以调用API获取更多推荐
        }
    }
}
</script>

<style scoped>
.similar-works {
  padding: 16px 0;
}

.section-header {
  margin-bottom: 24px;
}

.section-header h4 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 16px;
}

.section-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.similar-work-card {
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;
}

.similar-work-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.work-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.author-name {
  font-size: 12px;
  color: #666;
}

.work-stats {
  display: flex;
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #999;
}

.load-more-section {
  margin-top: 24px;
  text-align: center;
}

.recommendation-info {
  margin-top: 24px;
}
</style>
