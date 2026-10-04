<template>
  <div class="course-content-management">
    <a-card :bordered="false">
      <div class="page-header">
        <a-row :gutter="16" type="flex" align="middle">
          <a-col :xs="24" :lg="16">
            <h2>课程内容管理</h2>
            <p>按课程体系、阶段和资源类型管理教学资源，AI 资源包也支持单独归类筛选。</p>
          </a-col>
          <a-col :xs="24" :lg="8" class="header-actions">
            <a-button type="primary" icon="plus" @click="showUploadModal = true">
              上传资源
            </a-button>
          </a-col>
        </a-row>
      </div>

      <div v-if="hasRouteContext" class="route-context-card">
        <div class="route-context-copy">
          <div class="route-context-title">当前正在为课堂整理资源</div>
          <div class="route-context-tags">
            <a-tag v-if="routeContext.classroomName" color="blue">课堂：{{ routeContext.classroomName }}</a-tag>
            <a-tag v-if="routeContext.courseName" color="geekblue">课程：{{ routeContext.courseName }}</a-tag>
            <a-tag v-if="routeContext.lessonName" color="cyan">课节：{{ routeContext.lessonName }}</a-tag>
          </div>
          <p class="route-context-desc">
            资源列表会优先按当前课程或课节收窄，方便直接为课堂绑定资料。
          </p>
        </div>
        <div class="route-context-actions">
          <a-button size="small" @click="returnToClassroomManager">返回课堂管理</a-button>
          <a-button size="small" type="link" @click="clearRouteContext">清除上下文</a-button>
        </div>
      </div>

      <div class="filter-card">
        <a-row :gutter="16">
          <a-col :xs="24" :sm="12" :lg="6">
            <a-form-item label="课程体系/系列">
              <a-select
                v-model="filters.courseSystem"
                placeholder="全部课程体系"
                allow-clear
                @change="handleCourseSystemChange"
              >
                <a-select-option
                  v-for="item in courseSystemOptions"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>

          <a-col :xs="24" :sm="12" :lg="6">
            <a-form-item label="阶段">
              <a-select
                v-model="filters.courseStage"
                placeholder="全部阶段"
                allow-clear
                :disabled="!filters.courseSystem"
                @change="handleFilterChange"
              >
                <a-select-option
                  v-for="item in stageOptions"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>

          <a-col :xs="24" :sm="12" :lg="8">
            <a-form-item label="搜索资源">
              <a-input-search
                v-model="filters.keyword"
                placeholder="按资源名称、课程体系、阶段搜索"
                allow-clear
                @search="handleFilterChange"
              />
            </a-form-item>
          </a-col>

          <a-col :xs="24" :sm="12" :lg="4" class="filter-reset">
            <a-button @click="resetFilters">重置筛选</a-button>
          </a-col>
        </a-row>
      </div>

      <div class="filter-summary">
        <a-tag color="blue">{{ total }} 个资源</a-tag>
        <a-tag v-if="filters.courseSystem" color="geekblue">{{ getCourseSystemLabel(filters.courseSystem) }}</a-tag>
        <a-tag v-if="filters.courseStage" color="cyan">{{ getCourseStageLabel(filters.courseStage) }}</a-tag>
        <a-tag v-if="activeTab !== 'all'" color="purple">{{ getResourceTypeLabel(activeTab) }}</a-tag>
      </div>

      <div v-if="!hasRouteContext" class="stats-overview">
        <a-row :gutter="16">
          <a-col :xs="24" :sm="12" :lg="6">
            <a-card class="stat-card" size="small">
              <a-statistic title="当前筛选资源总数" :value="statistics.total" />
            </a-card>
          </a-col>
          <a-col :xs="24" :sm="12" :lg="6">
            <a-card class="stat-card" size="small">
              <a-statistic title="AI 资源包" :value="statistics.aiPackageCount" />
            </a-card>
          </a-col>
          <a-col :xs="24" :sm="12" :lg="6">
            <a-card class="stat-card" size="small">
              <a-statistic title="未完整分类资源" :value="statistics.uncategorizedCount" />
            </a-card>
          </a-col>
          <a-col :xs="24" :sm="12" :lg="6">
            <a-card class="stat-card" size="small">
              <div class="stat-breakdown">
                <div class="stat-breakdown-title">阶段分布 Top 3</div>
                <div class="stat-breakdown-tags">
                  <a-tag
                    v-for="item in topStageStats"
                    :key="item.stage || 'unassigned'"
                    color="cyan"
                  >
                    {{ getCourseStageLabel(item.stage) }} {{ item.count }}
                  </a-tag>
                  <span v-if="topStageStats.length === 0" class="stat-empty">暂无数据</span>
                </div>
              </div>
            </a-card>
          </a-col>
        </a-row>
      </div>

      <a-tabs v-model="activeTab" type="card" @change="handleTabChange">
        <a-tab-pane
          v-for="item in resourceTypeOptions"
          :key="item.value"
          :tab="item.label"
        >
          <course-resource-list
            :resources="displayResources"
            :loading="loading"
            @view="viewResource"
            @open-ai-classroom="handleOpenAiClassroom"
            @edit="editResource"
            @delete="deleteResource"
          />
        </a-tab-pane>
      </a-tabs>

      <div v-if="total > 0" class="pagination-wrapper">
        <a-pagination
          v-model="pagination.current"
          :total="total"
          :pageSize="pagination.pageSize"
          :showSizeChanger="true"
          :showQuickJumper="true"
          :showTotal="pageTotal => `共 ${pageTotal} 条记录`"
          :pageSizeOptions="['8', '12', '16', '24']"
          @change="handlePageChange"
          @showSizeChange="handleSizeChange"
        />
      </div>
    </a-card>

    <a-modal
      title="上传课程资源"
      :visible="showUploadModal"
      :width="680"
      :destroyOnClose="true"
      :maskClosable="false"
      okText="上传"
      cancelText="取消"
      @ok="handleUpload"
      @cancel="handleCancelUpload"
    >
      <upload-resource-form
        v-if="showUploadModal"
        ref="uploadForm"
        :key="uploadFormKey"
        @upload-success="handleUploadSuccess"
      />
    </a-modal>

    <a-modal
      title="编辑资源信息"
      :visible="showEditModal"
      :width="680"
      :destroyOnClose="true"
      :maskClosable="false"
      okText="保存"
      cancelText="取消"
      @ok="handleUpdateResource"
      @cancel="handleCancelEdit"
    >
      <edit-resource-form
        v-if="showEditModal && editingResource"
        ref="editResourceForm"
        :key="editFormKey"
        :resource="editingResource"
        @update-success="handleUpdateResourceSuccess"
      />
    </a-modal>

    <a-modal
      title="资源预览"
      :visible="showPreviewModal"
      :width="900"
      :footer="null"
      @cancel="showPreviewModal = false"
    >
      <resource-preview
        v-if="selectedResource"
        :resource="selectedResource"
        @import-ai-package="handleImportAiPackage"
        @open-ai-classroom="handleOpenAiClassroom"
      />
    </a-modal>
  </div>
</template>

<script>
import CourseResourceList from './components/CourseResourceList'
import UploadResourceForm from './components/UploadResourceForm'
import EditResourceForm from './components/EditResourceForm'
import ResourcePreview from './components/ResourcePreview'
import { courseResourceApi } from '@/api/teaching'
import { resolveTeachingAccess } from '@/utils/teachingAccess'
import {
    courseSystemOptions,
    getCourseStageLabel,
    getCourseSystemLabel,
    getResourceTypeLabel,
    resourceTypeOptions,
    stageOptions
} from './resourceMeta'

function createEmptyStatistics () {
    return {
        total: 0,
        aiPackageCount: 0,
        uncategorizedCount: 0,
        byType: [],
        bySystem: [],
        byStage: []
    }
}

const AI_CLASSROOM_BASE_URL = 'https://ai.codebn.cn'

export default {
    name: 'CourseContentManagement',
    components: {
        CourseResourceList,
        UploadResourceForm,
        EditResourceForm,
        ResourcePreview
    },
    data () {
        return {
            activeTab: 'all',
            showUploadModal: false,
            showEditModal: false,
            showPreviewModal: false,
            selectedResource: null,
            editingResource: null,
            resources: [],
            loading: false,
            uploadFormKey: 0,
            editFormKey: 0,
            total: 0,
            statistics: createEmptyStatistics(),
            filters: {
                keyword: '',
                courseSystem: undefined,
                courseStage: undefined
            },
            pagination: {
                current: 1,
                pageSize: 12
            },
            courseSystemOptions,
            resourceTypeOptions,
            pendingPreviewResourceId: '',
            routeContext: {
                source: '',
                classroomId: '',
                classroomName: '',
                courseId: '',
                courseName: '',
                lessonId: '',
                lessonName: ''
            }
        }
    },
    computed: {
        displayResources () {
            return this.resources
        },
        hasRouteContext () {
            return Boolean(
                this.routeContext.classroomId ||
                this.routeContext.classroomName ||
                this.routeContext.courseId ||
                this.routeContext.lessonId
            )
        },
        stageOptions () {
            return stageOptions
        },
        topStageStats () {
            return [...this.statistics.byStage]
                .sort((left, right) => (right.count || 0) - (left.count || 0))
                .slice(0, 3)
        }
    },
    created () {
        this.applyRouteContext()
        this.loadResourceList()
    },
    methods: {
        getCourseSystemLabel,
        getCourseStageLabel,
        getResourceTypeLabel,
        applyRouteContext () {
            const query = this.$route.query || {}
            this.routeContext = {
                source: String(query.source || '').trim(),
                classroomId: String(query.classroomId || '').trim(),
                classroomName: String(query.classroomName || '').trim(),
                courseId: String(query.courseId || '').trim(),
                courseName: String(query.courseName || '').trim(),
                lessonId: String(query.lessonId || '').trim(),
                lessonName: String(query.lessonName || '').trim()
            }

            if (query.courseSystem) {
                this.filters.courseSystem = query.courseSystem
            }
            if (query.courseStage) {
                this.filters.courseStage = query.courseStage
            }

            const previewResourceId = String(query.previewResourceId || query.resourceId || '').trim()
            if (previewResourceId) {
                this.pendingPreviewResourceId = previewResourceId
            }
        },
        consumeRouteContext () {
            const query = { ...(this.$route.query || {}) }
            delete query.previewResourceId
            delete query.resourceId
            this.$router.replace({ path: this.$route.path, query }).catch(() => {})
        },
        clearRouteContext () {
            this.routeContext = {
                source: '',
                classroomId: '',
                classroomName: '',
                courseId: '',
                courseName: '',
                lessonId: '',
                lessonName: ''
            }

            const query = { ...(this.$route.query || {}) }
            delete query.previewResourceId
            delete query.resourceId
            delete query.source
            delete query.classroomId
            delete query.classroomName
            delete query.courseId
            delete query.courseName
            delete query.lessonId
            delete query.lessonName

            this.$router.replace({ path: this.$route.path, query }).catch(() => {})
            this.pagination.current = 1
            this.loadResourceList()
        },
        resolveClassroomPath () {
            const access = resolveTeachingAccess({
                userInfo: this.$store.getters.userInfo || {},
                userRole: this.$store.getters.userRole || [],
                userType: this.$store.getters.userType || ''
            })
            return access.classroomPath || '/admin/classroom-manager'
        },
        returnToClassroomManager () {
            this.$router.push({ path: this.resolveClassroomPath() }).catch(() => {})
        },
        buildQueryParams () {
            const params = {
                pageNo: this.pagination.current,
                pageSize: this.pagination.pageSize,
                keyword: this.filters.keyword || undefined,
                courseSystem: this.filters.courseSystem || undefined,
                courseStage: this.filters.courseStage || undefined
            }

            if (this.activeTab !== 'all') {
                params.type = this.activeTab
            }

            if (this.routeContext.lessonId) {
                params.lessonId = this.routeContext.lessonId
            } else if (this.routeContext.courseId) {
                params.courseId = this.routeContext.courseId
            }

            return params
        },
        buildStatisticsParams () {
            const params = {
                keyword: this.filters.keyword || undefined,
                courseSystem: this.filters.courseSystem || undefined,
                courseStage: this.filters.courseStage || undefined
            }

            if (this.activeTab !== 'all') {
                params.type = this.activeTab
            }

            return params
        },
        async loadResourceList () {
            this.loading = true
            try {
                const listParams = this.buildQueryParams()
                const statisticsPromise = this.hasRouteContext
                    ? Promise.resolve(null)
                    : courseResourceApi.getResourceStatistics(this.buildStatisticsParams())

                const [listResponse, statisticsResponse] = await Promise.all([
                    courseResourceApi.getResourceList(listParams),
                    statisticsPromise
                ])

                if (listResponse && listResponse.success) {
                    const result = listResponse.result || {}
                    this.resources = result.records || result.data || listResponse.data || []
                    this.total = result.total || listResponse.total || this.resources.length
                } else {
                    this.resources = []
                    this.total = 0
                }

                if (!this.hasRouteContext && statisticsResponse && statisticsResponse.success) {
                    this.statistics = {
                        total: statisticsResponse.result.total || 0,
                        aiPackageCount: statisticsResponse.result.aiPackageCount || 0,
                        uncategorizedCount: statisticsResponse.result.uncategorizedCount || 0,
                        byType: statisticsResponse.result.byType || [],
                        bySystem: statisticsResponse.result.bySystem || [],
                        byStage: statisticsResponse.result.byStage || []
                    }
                } else {
                    this.statistics = createEmptyStatistics()
                }

                if (this.pendingPreviewResourceId) {
                    const resourceId = this.pendingPreviewResourceId
                    this.pendingPreviewResourceId = ''
                    await this.viewResource({ id: resourceId })
                    this.consumeRouteContext()
                }
            } catch (error) {
                this.$message.error('加载资源列表失败，请稍后重试')
                this.resources = []
                this.total = 0
                this.statistics = createEmptyStatistics()
            } finally {
                this.loading = false
            }
        },
        handleTabChange (tab) {
            this.activeTab = tab
            this.pagination.current = 1
            this.loadResourceList()
        },
        handleCourseSystemChange () {
            this.filters.courseStage = undefined
            this.handleFilterChange()
        },
        handleFilterChange () {
            this.pagination.current = 1
            this.loadResourceList()
        },
        resetFilters () {
            this.filters = {
                keyword: '',
                courseSystem: undefined,
                courseStage: undefined
            }
            this.activeTab = 'all'
            this.pagination.current = 1
            this.loadResourceList()
        },
        handlePageChange (page) {
            this.pagination.current = page
            this.loadResourceList()
        },
        handleSizeChange (current, pageSize) {
            this.pagination.current = 1
            this.pagination.pageSize = pageSize
            this.loadResourceList()
        },
        async viewResource (resource) {
            try {
                const response = await courseResourceApi.getResourceDetails(resource.id)
                this.selectedResource = response && response.success
                    ? {
                        ...resource,
                        ...response.result
                    }
                    : resource
            } catch (error) {
                this.selectedResource = resource
            }
            this.showPreviewModal = true
        },
        async editResource (resource) {
            try {
                const response = await courseResourceApi.getResourceDetails(resource.id)
                this.editingResource = response && response.success ? response.result : resource
                this.editFormKey += 1
                this.showEditModal = true
            } catch (error) {
                this.$message.error('加载资源信息失败，请稍后重试')
            }
        },
        deleteResource (resource) {
            this.$confirm({
                title: '确认删除',
                content: `确定要删除资源“${resource.name}”吗？`,
                onOk: async () => {
                    try {
                        const response = await courseResourceApi.deleteResource(resource.id)
                        if (response && response.success) {
                            this.$message.success('资源已删除')
                            if (this.selectedResource && this.selectedResource.id === resource.id) {
                                this.showPreviewModal = false
                                this.selectedResource = null
                            }
                            await this.loadResourceList()
                        }
                    } catch (error) {
                        this.$message.error('删除资源失败，请稍后重试')
                    }
                }
            })
        },
        handleUpload () {
            if (!this.$refs.uploadForm) {
                this.$message.warning('上传表单未初始化，请稍后重试')
                return
            }
            this.$refs.uploadForm.submit()
        },
        handleCancelUpload () {
            this.showUploadModal = false
            this.uploadFormKey += 1
        },
        async handleUploadSuccess () {
            this.showUploadModal = false
            this.uploadFormKey += 1
            this.$message.success('资源上传成功')
            await this.loadResourceList()
        },
        handleUpdateResource () {
            if (!this.$refs.editResourceForm) {
                this.$message.warning('编辑表单未初始化，请稍后重试')
                return
            }
            this.$refs.editResourceForm.submit()
        },
        handleCancelEdit () {
            this.showEditModal = false
            this.editingResource = null
            this.editFormKey += 1
        },
        async handleUpdateResourceSuccess (resource) {
            this.showEditModal = false
            this.editingResource = null
            this.editFormKey += 1
            this.$message.success('资源信息更新成功')

            if (this.selectedResource && this.selectedResource.id === resource.id) {
                this.selectedResource = {
                    ...this.selectedResource,
                    ...resource
                }
            }

            await this.loadResourceList()
        },
        normalizeExternalUrl (value) {
            const normalized = String(value || '').trim()
            if (!normalized) {
                return AI_CLASSROOM_BASE_URL
            }
            if (/^https?:\/\//i.test(normalized)) {
                return normalized.replace(/\/+$/, '')
            }
            return `https://${normalized.replace(/^\/+/, '').replace(/\/+$/, '')}`
        },
        buildAiClassroomLaunchUrl (baseUrl, options = {}) {
            const url = new URL(this.normalizeExternalUrl(baseUrl))
            const importUrl = String(options.importUrl || '').trim()
            const resourceName = String(options.resourceName || '').trim()

            if (importUrl) {
                url.searchParams.set('importUrl', importUrl)
                url.searchParams.set('autoOpen', '1')
                url.searchParams.set('source', 'course-resource')
                if (resourceName) {
                    url.searchParams.set('resourceName', resourceName)
                }
            }

            return url.toString()
        },
        openExternalWindow (url, popup) {
            if (popup && !popup.closed) {
                popup.location.replace(url)
                return popup
            }
            return window.open(url, '_blank', 'noopener,noreferrer')
        },
        async handleOpenAiClassroom (resource) {
            const resourceId = resource && resource.id
            const resourceName = resource && (resource.name || resource.resource_name || 'AI资源包')
            const loadingPopup = window.open('', '_blank')

            if (loadingPopup) {
                loadingPopup.opener = null
                loadingPopup.document.title = '正在打开 AI 互动课堂'
                loadingPopup.document.body.innerHTML = '<p style="font-family:Arial,sans-serif;padding:24px;color:#1f2937;">正在打开 AI 互动课堂，请稍候...</p>'
            }

            let shareData = {}
            try {
                const response = await courseResourceApi.getShareLink(resourceId, { expireDays: 7 })
                if (response && response.success) {
                    shareData = response.result || {}
                }
            } catch (error) {
            }

            const baseUrl = this.normalizeExternalUrl(shareData.openMaicHomeUrl)
            const importUrl = shareData.aiPackageDownloadUrl || shareData.downloadUrl || shareData.shareUrl || ''
            const launchUrl = this.buildAiClassroomLaunchUrl(baseUrl, {
                importUrl,
                resourceName
            })

            const popup = this.openExternalWindow(launchUrl, loadingPopup)
            if (!popup) {
                this.$message.warning('浏览器拦截了新窗口，请允许弹窗后重试')
                return
            }

            if (importUrl) {
                this.$message.success('正在打开 AI 互动课堂，并自动导入当前资源包')
            } else {
                this.$message.info('未获取到资源包直链，已为你打开 AI 互动课堂首页')
            }
        },
        handleImportAiPackage (resource) {
            this.showPreviewModal = false
            this.$router.push({
                path: this.resolveClassroomPath(),
                query: {
                    aiPackageId: resource.id,
                    aiPackageName: resource.name || '',
                    courseSystem: resource.courseSystem || '',
                    courseStage: resource.courseStage || ''
                }
            })
        }
    }
}
</script>

<style scoped lang="less">
.course-content-management {
  padding: 8px;
}

.page-header h2 {
  margin-bottom: 8px;
  color: #1f2937;
}

.page-header p {
  margin-bottom: 0;
  color: #6b7280;
}

.header-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.route-context-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  margin: 24px 0 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, #eff6ff 0%, #f8fbff 100%);
  border: 1px solid #dbeafe;
}

.route-context-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
}

.route-context-tags {
  margin-bottom: 10px;
}

.route-context-desc {
  margin: 0;
  color: #4b5563;
}

.route-context-actions {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-shrink: 0;
}

.filter-card {
  padding: 20px 20px 4px;
  margin: 16px 0;
  background: #fafafa;
  border-radius: 14px;
}

.filter-reset {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  margin-bottom: 24px;
}

.filter-summary {
  margin-bottom: 16px;
}

.stats-overview {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 12px;
}

.stat-breakdown-title {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 10px;
}

.stat-breakdown-tags {
  min-height: 28px;
}

.stat-empty {
  color: #8c8c8c;
  font-size: 12px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

@media (max-width: 991px) {
  .header-actions {
    justify-content: flex-start;
  }

  .route-context-card {
    flex-direction: column;
  }

  .route-context-actions {
    align-items: center;
    justify-content: flex-start;
  }

  .filter-reset {
    justify-content: flex-start;
  }
}
</style>
