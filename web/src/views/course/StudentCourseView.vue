<template>
  <div class="student-course-view">
    <a-card :bordered="false">
      <div class="page-header">
        <h2>课程资源</h2>
        <p>浏览和下载课程学习资料</p>
      </div>

      <!-- 搜索和筛选 -->
      <a-row :gutter="16" style="margin-bottom: 24px;">
        <a-col :span="12">
          <a-input-search
            v-model="searchText"
            placeholder="搜索课程资源"
            @search="handleSearch"
          />
        </a-col>
        <a-col :span="6">
          <a-select
            v-model="selectedChapter"
            placeholder="选择章节"
            style="width: 100%"
            allow-clear
            @change="handleChapterFilter"
          >
            <a-select-option value="">全部章节</a-select-option>
            <a-select-option value="chapter1">第一章：编程基础</a-select-option>
            <a-select-option value="chapter2">第二章：Scratch编程</a-select-option>
            <a-select-option value="chapter3">第三章：Python入门</a-select-option>
            <a-select-option value="chapter4">第四章：算法思维</a-select-option>
            <a-select-option value="chapter5">第五章：项目实践</a-select-option>
          </a-select>
        </a-col>
        <a-col :span="6">
          <a-select
            v-model="selectedType"
            placeholder="资源类型"
            style="width: 100%"
            allow-clear
            @change="handleTypeFilter"
          >
            <a-select-option value="">全部类型</a-select-option>
            <a-select-option value="ppt">PPT课件</a-select-option>
            <a-select-option value="document">文档资料</a-select-option>
            <a-select-option value="video">视频教程</a-select-option>
            <a-select-option value="code">代码示例</a-select-option>
          </a-select>
        </a-col>
      </a-row>

      <!-- 课程进度 -->
      <a-card title="学习进度" size="small" style="margin-bottom: 24px;">
        <div class="progress-info">
          <a-row :gutter="32">
            <a-col :span="8">
              <a-statistic title="已学习资源" :value="studiedCount" :suffix="`/ ${totalCount}`" />
            </a-col>
            <a-col :span="8">
              <a-statistic title="学习进度" :value="progressPercentage" suffix="%" />
            </a-col>
            <a-col :span="8">
              <a-statistic title="本周学习时长" :value="weeklyStudyTime" suffix="小时" />
            </a-col>
          </a-row>
          <div style="margin-top: 16px;">
            <a-progress :percent="progressPercentage" status="active" />
          </div>
        </div>
      </a-card>

      <!-- 资源列表 -->
      <div class="resource-grid">
        <a-row :gutter="[16, 16]">
          <a-col
            :xl="8"
            :lg="12"
            :md="12"
            :sm="24"
            v-for="resource in filteredResources"
            :key="resource.id">
            <a-card
              :hoverable="true"
              class="resource-card"
              @click="viewResource(resource)"
            >
              <div class="card-content">
                <div class="resource-icon">
                  <a-icon :type="getResourceIcon(resource.type)" :style="{ fontSize: '32px', color: getIconColor(resource.type) }" />
                </div>

                <div class="resource-info">
                  <h4 class="resource-title">{{ resource.name }}</h4>
                  <p class="resource-description">{{ resource.description }}</p>

                  <div class="resource-tags">
                    <a-tag v-for="tag in resource.tags" :key="tag" size="small">
                      {{ tag }}
                    </a-tag>
                  </div>

                  <div class="resource-meta">
                    <span class="meta-item">
                      <a-icon type="file" />
                      {{ resource.size }}
                    </span>
                    <span class="meta-item">
                      <a-icon type="eye" />
                      {{ resource.viewCount || 0 }}
                    </span>
                  </div>
                </div>

                <!-- 学习状态标识 -->
                <div class="study-status">
                  <a-badge
                    v-if="isStudied(resource.id)"
                    status="success"
                    text="已学习"
                  />
                  <a-badge
                    v-else-if="isInProgress(resource.id)"
                    status="processing"
                    text="学习中"
                  />
                  <a-badge
                    v-else
                    status="default"
                    text="未开始"
                  />
                </div>
              </div>

              <div class="card-actions">
                <a-button-group size="small">
                  <a-button icon="eye" @click.stop="viewResource(resource)">
                    查看
                  </a-button>
                  <a-button icon="download" @click.stop="downloadResource(resource)">
                    下载
                  </a-button>
                  <a-button icon="star" @click.stop="toggleFavorite(resource)" :type="isFavorite(resource.id) ? 'primary' : 'default'">
                    收藏
                  </a-button>
                </a-button-group>
              </div>
            </a-card>
          </a-col>
        </a-row>
      </div>

      <div v-if="filteredResources.length === 0" class="empty-state">
        <a-empty description="暂无相关资源" />
      </div>
    </a-card>

    <!-- 资源详情弹窗 -->
    <a-modal
      title="资源详情"
      :visible="showDetailModal"
      :width="800"
      :footer="null"
      @cancel="showDetailModal = false"
    >
      <resource-preview
        :resource="selectedResource"
        v-if="selectedResource"
        @study-complete="handleStudyComplete"
      />
    </a-modal>
  </div>
</template>

<script>
import ResourcePreview from './components/ResourcePreview'

export default {
    name: 'StudentCourseView',
    components: {
        ResourcePreview
    },
    data () {
        return {
            searchText: '',
            selectedChapter: '',
            selectedType: '',
            showDetailModal: false,
            selectedResource: null,
            studiedResources: ['1', '2'], // 已学习的资源ID
            inProgressResources: ['3'], // 学习中的资源ID
            favoriteResources: ['1'], // 收藏的资源ID
            weeklyStudyTime: 12.5,
            resources: [
                {
                    id: '1',
                    name: '第一章：编程基础概念',
                    type: 'ppt',
                    size: '2.5MB',
                    uploadTime: '2024-01-15 10:30:00',
                    description: '介绍编程的基本概念和思维方式',
                    downloadCount: 25,
                    viewCount: 45,
                    chapter: 'chapter1',
                    tags: ['基础', '理论'],
                    fileUrl: '/resources/chapter1-basic-concepts.pptx'
                },
                {
                    id: '2',
                    name: 'Scratch编程入门教程',
                    type: 'document',
                    size: '1.8MB',
                    uploadTime: '2024-01-16 14:20:00',
                    description: 'Scratch图形化编程的详细教程',
                    downloadCount: 18,
                    viewCount: 32,
                    chapter: 'chapter2',
                    tags: ['基础', 'Scratch'],
                    fileUrl: '/resources/scratch-tutorial.pdf'
                },
                {
                    id: '3',
                    name: 'Python基础语法',
                    type: 'video',
                    size: '125MB',
                    uploadTime: '2024-01-17 09:15:00',
                    description: 'Python编程语言基础语法讲解视频',
                    downloadCount: 42,
                    viewCount: 78,
                    chapter: 'chapter3',
                    tags: ['Python', '语法'],
                    fileUrl: '/resources/python-basics.mp4'
                },
                {
                    id: '4',
                    name: '循环结构示例代码',
                    type: 'code',
                    size: '15KB',
                    uploadTime: '2024-01-18 16:45:00',
                    description: '各种循环结构的Python代码示例',
                    downloadCount: 31,
                    viewCount: 56,
                    chapter: 'chapter3',
                    tags: ['Python', '循环', '实践'],
                    fileUrl: '/resources/loop-examples.py'
                },
                {
                    id: '5',
                    name: '算法思维导图',
                    type: 'image',
                    size: '850KB',
                    uploadTime: '2024-01-19 11:30:00',
                    description: '算法思维和解题方法思维导图',
                    downloadCount: 28,
                    viewCount: 41,
                    chapter: 'chapter4',
                    tags: ['算法', '思维'],
                    fileUrl: '/resources/algorithm-mindmap.png'
                }
            ]
        }
    },
    computed: {
        filteredResources () {
            let filtered = this.resources

            // 搜索过滤
            if (this.searchText) {
                const searchLower = this.searchText.toLowerCase()
                filtered = filtered.filter(resource =>
                    resource.name.toLowerCase().includes(searchLower) ||
          resource.description.toLowerCase().includes(searchLower)
                )
            }

            // 章节过滤
            if (this.selectedChapter) {
                filtered = filtered.filter(resource => resource.chapter === this.selectedChapter)
            }

            // 类型过滤
            if (this.selectedType) {
                filtered = filtered.filter(resource => resource.type === this.selectedType)
            }

            return filtered
        },

        totalCount () {
            return this.resources.length
        },

        studiedCount () {
            return this.studiedResources.length
        },

        progressPercentage () {
            return Math.round((this.studiedCount / this.totalCount) * 100)
        }
    },
    methods: {
        getResourceIcon (type) {
            const iconMap = {
                'ppt': 'file-ppt',
                'document': 'file-pdf',
                'video': 'video-camera',
                'code': 'code',
                'image': 'file-image'
            }
            return iconMap[type] || 'file'
        },

        getIconColor (type) {
            const colorMap = {
                'ppt': '#ff7a00',
                'document': '#f5222d',
                'video': '#52c41a',
                'code': '#722ed1',
                'image': '#1890ff'
            }
            return colorMap[type] || '#999'
        },

        isStudied (resourceId) {
            return this.studiedResources.includes(resourceId)
        },

        isInProgress (resourceId) {
            return this.inProgressResources.includes(resourceId)
        },

        isFavorite (resourceId) {
            return this.favoriteResources.includes(resourceId)
        },

        handleSearch () {
            // 搜索逻辑在computed中处理
        },

        handleChapterFilter () {
            // 筛选逻辑在computed中处理
        },

        handleTypeFilter () {
            // 筛选逻辑在computed中处理
        },

        viewResource (resource) {
            this.selectedResource = resource
            this.showDetailModal = true

            // 记录查看次数
            resource.viewCount = (resource.viewCount || 0) + 1

            // 如果未开始学习，标记为学习中
            if (!this.isStudied(resource.id) && !this.isInProgress(resource.id)) {
                this.inProgressResources.push(resource.id)
            }
        },

        downloadResource (resource) {
            this.$message.success(`开始下载：${resource.name}`)
            resource.downloadCount++
        },

        toggleFavorite (resource) {
            const index = this.favoriteResources.indexOf(resource.id)
            if (index > -1) {
                this.favoriteResources.splice(index, 1)
                this.$message.success('取消收藏')
            } else {
                this.favoriteResources.push(resource.id)
                this.$message.success('收藏成功')
            }
        },

        handleStudyComplete (resource) {
            // 标记为已学习
            if (!this.isStudied(resource.id)) {
                this.studiedResources.push(resource.id)
            }

            // 从学习中移除
            const progressIndex = this.inProgressResources.indexOf(resource.id)
            if (progressIndex > -1) {
                this.inProgressResources.splice(progressIndex, 1)
            }

            this.$message.success('学习完成！')
        }
    }
}
</script>

<style scoped>
.student-course-view {
  padding: 24px;
}

.page-header h2 {
  margin: 0;
  color: #1890ff;
}

.page-header p {
  margin: 8px 0 24px 0;
  color: #666;
}

.progress-info {
  background: #fafafa;
  padding: 16px;
  border-radius: 6px;
}

.resource-grid {
  margin-top: 16px;
}

.resource-card {
  height: 240px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.resource-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.card-content {
  height: 160px;
  display: flex;
  flex-direction: column;
}

.resource-icon {
  text-align: center;
  margin-bottom: 12px;
}

.resource-info {
  flex: 1;
}

.resource-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-description {
  margin: 0 0 8px 0;
  color: #666;
  font-size: 12px;
  line-height: 1.4;
  height: 32px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.resource-tags {
  margin-bottom: 8px;
}

.resource-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
}

.meta-item {
  display: flex;
  align-items: center;
}

.meta-item .anticon {
  margin-right: 4px;
}

.study-status {
  position: absolute;
  top: 8px;
  right: 8px;
}

.card-actions {
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  opacity: 0;
  transition: opacity 0.3s;
}

.resource-card:hover .card-actions {
  opacity: 1;
}

.empty-state {
  text-align: center;
  padding: 64px 0;
}
</style>
