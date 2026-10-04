<template>
  <div class="course-resource-list">
    <a-spin :spinning="loading">
      <a-empty v-if="!resources || resources.length === 0" description="暂无资源" />

      <a-list
        v-else
        :data-source="resources"
        :grid="{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 4, xxl: 4 }"
      >
        <a-list-item slot="renderItem" slot-scope="item">
          <a-card :hoverable="true" class="resource-card">
            <div class="resource-card-header">
              <div class="resource-icon">
                <a-icon
                  :type="getResourceIcon(resolveResourceType(item))"
                  :style="{ fontSize: '40px', color: getResourceColor(resolveResourceType(item)) }"
                />
              </div>
              <div class="resource-badges">
                <a-tag color="geekblue">{{ getCourseSystemLabel(item.courseSystem) }}</a-tag>
                <a-tag color="cyan">{{ getCourseStageLabel(item.courseStage) }}</a-tag>
                <a-tag color="purple">{{ getResourceTypeLabel(resolveResourceType(item)) }}</a-tag>
              </div>
            </div>

            <a-card-meta>
              <template slot="title">
                <a-tooltip :title="item.name">
                  <span class="resource-name">{{ item.name }}</span>
                </a-tooltip>
              </template>

              <template slot="description">
                <div class="resource-info">
                  <div v-if="item.courseName" class="resource-course">
                    <a-icon type="book" />
                    <span>{{ item.courseName }}</span>
                  </div>
                  <div class="resource-meta">
                    <span>
                      <a-icon type="file" />
                      {{ item.sizeText || item.size || '-' }}
                    </span>
                    <span>
                      <a-icon type="clock-circle" />
                      {{ formatUploadTime(item) }}
                    </span>
                  </div>
                  <div class="resource-desc">{{ item.description || '暂无说明' }}</div>
                </div>
              </template>
            </a-card-meta>

            <template slot="actions">
              <a-button
                v-if="isAiPackage(item)"
                type="link"
                size="small"
                @click="handleOpenAiClassroom(item)"
              >
                <a-icon type="rocket" />
                AI课堂
              </a-button>
              <a-button type="link" size="small" @click="handleView(item)">
                <a-icon type="eye" />
                查看
              </a-button>
              <a-button type="link" size="small" @click="handleEdit(item)">
                <a-icon type="edit" />
                编辑
              </a-button>
              <a-popconfirm
                title="确定要删除这个资源吗？"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleDelete(item)"
              >
                <a-button type="link" size="small" danger>
                  <a-icon type="delete" />
                  删除
                </a-button>
              </a-popconfirm>
            </template>
          </a-card>
        </a-list-item>
      </a-list>
    </a-spin>
  </div>
</template>

<script>
import {
    getCourseStageLabel,
    getCourseSystemLabel,
    getResourceTypeLabel
} from '../resourceMeta'

export default {
    name: 'CourseResourceList',
    props: {
        resources: {
            type: Array,
            default: () => []
        },
        loading: {
            type: Boolean,
            default: false
        }
    },
    methods: {
        getCourseStageLabel,
        getCourseSystemLabel,
        getResourceTypeLabel,
        resolveResourceType (resource) {
            return resource && (resource.type || resource.resource_type) || 'other'
        },
        isAiPackage (resource) {
            return this.resolveResourceType(resource) === 'ai_package'
        },
        getResourceIcon (type) {
            const iconMap = {
                ppt: 'file-ppt',
                document: 'file-word',
                video: 'video-camera',
                code: 'code',
                pdf: 'file-pdf',
                image: 'file-image',
                audio: 'sound',
                ai_package: 'inbox'
            }
            return iconMap[type] || 'file'
        },
        getResourceColor (type) {
            const colorMap = {
                ppt: '#fa8c16',
                document: '#1890ff',
                video: '#52c41a',
                code: '#13c2c2',
                pdf: '#f5222d',
                image: '#722ed1',
                audio: '#eb2f96',
                ai_package: '#2f54eb'
            }
            return colorMap[type] || '#8c8c8c'
        },
        formatUploadTime (resource) {
            const rawTime = resource && (resource.uploadTime || resource.createTime || resource.create_time)
            if (!rawTime) {
                return '-'
            }

            const parsed = new Date(rawTime)
            if (Number.isNaN(parsed.getTime())) {
                return rawTime
            }

            const date = [
                parsed.getFullYear(),
                String(parsed.getMonth() + 1).padStart(2, '0'),
                String(parsed.getDate()).padStart(2, '0')
            ]
            const time = [
                String(parsed.getHours()).padStart(2, '0'),
                String(parsed.getMinutes()).padStart(2, '0')
            ]

            return `${date.join('-')} ${time.join(':')}`
        },
        handleView (resource) {
            this.$emit('view', resource)
        },
        handleOpenAiClassroom (resource) {
            this.$emit('open-ai-classroom', resource)
        },
        handleEdit (resource) {
            this.$emit('edit', resource)
        },
        handleDelete (resource) {
            this.$emit('delete', resource)
        }
    }
}
</script>

<style scoped lang="less">
.course-resource-list {
  padding: 16px 0;
}

.resource-card {
  height: 100%;
  border-radius: 12px;
}

.resource-card:hover {
  box-shadow: 0 16px 32px rgba(31, 45, 61, 0.12);
}

.resource-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}

.resource-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: #f5f7fa;
  flex-shrink: 0;
}

.resource-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.resource-name {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
}

.resource-info {
  min-height: 88px;
}

.resource-course {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  color: #4b5563;
}

.resource-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 12px;
  color: #8c8c8c;
}

.resource-meta span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.resource-desc {
  color: #4b5563;
  font-size: 12px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
