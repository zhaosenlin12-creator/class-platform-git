<template>
  <div class="student-works">
    <a-card :bordered="false">
      <div class="page-header">
        <h2>作品资源库</h2>
      </div>

      <div v-if="activeTab === 'my'" class="works-toolbar">
        <a-button type="primary" @click="openUploadModal">
          上传资源
        </a-button>
        <div class="works-filter-group">
          <span class="works-filter-label">显示范围</span>
          <a-radio-group v-model="visibilityFilter" button-style="solid" @change="handleVisibilityChange">
            <a-radio-button value="all">
              全部
            </a-radio-button>
            <a-radio-button value="public">
              公开
            </a-radio-button>
            <a-radio-button value="private">
              私有
            </a-radio-button>
          </a-radio-group>
        </div>
      </div>

      <a-tabs :activeKey="activeTab" @change="handleTabChange">
        <a-tab-pane key="all" tab="全部作品" />
        <a-tab-pane key="my" tab="我的作品" />
      </a-tabs>

      <a-table
        :columns="columns"
        :dataSource="dataSource"
        :loading="loading"
        :pagination="pagination"
        rowKey="id"
        @change="handleTableChange"
      >
        <template slot="resourceName" slot-scope="text, record">
          <div class="resource-name">
            <div class="resource-title">{{ record.workName || '-' }}</div>
            <div class="resource-desc">{{ record.workDescription || '暂无说明' }}</div>
          </div>
        </template>

        <template slot="author" slot-scope="text, record">
          {{ record.realname || record.username || '-' }}
        </template>

        <template slot="resourceType" slot-scope="text, record">
          <a-tag color="blue">
            {{ record.workType_dictText || record.rawWorkType || '-' }}
          </a-tag>
        </template>

        <template slot="file" slot-scope="text, record">
          <div class="file-name">{{ record.workFileName || '-' }}</div>
          <div class="file-meta">{{ formatFileMeta(record) }}</div>
        </template>

        <template slot="tags" slot-scope="text, record">
          <div v-if="record.workTags.length > 0" class="tag-list">
            <a-tag
              v-for="tag in record.workTags.slice(0, 3)"
              :key="`${record.id}-${tag}`"
            >
              {{ tag }}
            </a-tag>
          </div>
          <span v-else class="placeholder-text">-</span>
        </template>

        <template slot="visibility" slot-scope="text, record">
          {{ record.is_public === 1 || record.isPublic ? '公开' : '私有' }}
        </template>

        <template slot="createTime" slot-scope="text, record">
          {{ formatDateTime(record.createTime) }}
        </template>

        <template slot="action" slot-scope="text, record">
          <a @click="handleView(record)">查看</a>
          <a-divider type="vertical" />
          <a @click="handleDownload(record)">下载</a>
          <template v-if="activeTab === 'my'">
            <a-divider type="vertical" />
            <a @click="openEditModal(record)">编辑</a>
            <a-divider type="vertical" />
            <a-popconfirm title="确定删除吗?" @confirm="confirmDelete(record)">
              <a>删除</a>
            </a-popconfirm>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      :title="editMode === 'create' ? '上传资源' : '编辑资源'"
      :visible="editorVisible"
      :confirmLoading="editorSaving"
      width="720px"
      @ok="submitEditor"
      @cancel="closeEditor"
    >
      <a-form-model
        ref="editorForm"
        :model="editorForm"
        :rules="editorRules"
        :label-col="{ span: 5 }"
        :wrapper-col="{ span: 17 }"
      >
        <a-form-model-item label="资源名称" prop="workName">
          <a-input
            v-model.trim="editorForm.workName"
            :maxLength="80"
            placeholder="请输入资源名称"
          />
        </a-form-model-item>

        <a-form-model-item label="资源描述" prop="workDescription">
          <a-textarea
            v-model.trim="editorForm.workDescription"
            :rows="3"
            :maxLength="200"
            placeholder="请输入资源描述"
          />
        </a-form-model-item>

        <a-form-model-item v-if="editMode === 'create'" label="资源文件" prop="workFileUrl">
          <j-upload
            v-model="editorForm.workFileUrl"
            :number="1"
            :maxFileSize="500"
            @change="handleUploadChange"
          />
        </a-form-model-item>

        <a-form-model-item v-else label="资源文件">
          <div class="current-file">
            <div>{{ editorForm.workFileName || '-' }}</div>
            <div class="file-meta">{{ editorForm.fileMeta || '-' }}</div>
          </div>
        </a-form-model-item>

        <a-form-model-item label="资源分类" prop="workType">
          <a-select v-model="editorForm.workType" placeholder="请选择资源分类">
            <a-select-option
              v-for="option in workTypeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-form-model-item>

        <a-form-model-item label="标签">
          <a-select
            v-model="editorForm.workTags"
            mode="tags"
            :maxTagCount="4"
            placeholder="输入标签后回车确认"
            style="width: 100%"
          />
        </a-form-model-item>

        <a-form-model-item label="可见范围" prop="isPublic">
          <a-radio-group v-model="editorForm.isPublic">
            <a-radio :value="true">
              公开
            </a-radio>
            <a-radio :value="false">
              私有
            </a-radio>
          </a-radio-group>
        </a-form-model-item>
      </a-form-model>
    </a-modal>

    <a-modal
      title="作品详情"
      :visible="detailVisible"
      :confirmLoading="detailLoading"
      width="760px"
      okText="预览/运行"
      cancelText="关闭"
      @ok="handlePreviewFromDetail"
      @cancel="closeDetail"
    >
      <div v-if="detailRecord" class="work-detail">
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="作品名称" :span="2">
            {{ detailRecord.workName || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="作品分类">
            {{ detailRecord.workTypeLabel || detailRecord.workType_dictText || detailRecord.rawWorkType || detailRecord.workType || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="可见范围">
            {{ detailRecord.isPublic || detailRecord.is_public === 1 ? '公开' : '私有' }}
          </a-descriptions-item>
          <a-descriptions-item label="作者">
            {{ detailRecord.studentName || detailRecord.realname || detailRecord.username || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="作品状态">
            {{ detailRecord.workStatusText || detailRecord.workStatus_dictText || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="上传时间">
            {{ formatDateTime(detailRecord.createTime) }}
          </a-descriptions-item>
          <a-descriptions-item label="文件名">
            <span class="detail-break">{{ detailRecord.workFileName || '-' }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="文件信息">
            {{ formatFileMeta(detailRecord) }}
          </a-descriptions-item>
          <a-descriptions-item label="标签" :span="2">
            <div v-if="detailTags.length > 0" class="tag-list">
              <a-tag v-for="tag in detailTags" :key="`detail-${tag}`">
                {{ tag }}
              </a-tag>
            </div>
            <span v-else class="placeholder-text">-</span>
          </a-descriptions-item>
          <a-descriptions-item label="作品描述" :span="2">
            <div class="detail-break">{{ detailRecord.workDescription || '-' }}</div>
          </a-descriptions-item>
        </a-descriptions>

        <div class="detail-actions">
          <a-space>
            <a-button type="primary" icon="eye" :disabled="!canPreviewDetailRecord" @click="handlePreviewFromDetail">
              预览/运行
            </a-button>
            <a-button icon="download" @click="handleDownload(detailRecord)">
              下载作品
            </a-button>
          </a-space>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script>
import moment from 'moment'
import JUpload from '@/components/jeecg/JUpload'
import { deleteAction, getAction, postAction, putAction } from '@/api/manage'

const WORK_TYPE_OPTIONS = [
    { value: 'resource_pack', label: '资源包' },
    { value: 'ai_resource', label: 'AI资源包' },
    { value: 'document', label: '文档课件' },
    { value: 'media', label: '音视频素材' },
    { value: 'image', label: '图片素材' },
    { value: 'code_file', label: '代码文件' },
    { value: 'scratch', label: 'Scratch' },
    { value: 'scratchjr', label: 'ScratchJr' },
    { value: 'python', label: 'Python' },
    { value: 'blockly', label: 'Blockly' },
    { value: 'other', label: '其他文件' }
]

const STUDENT_WORK_API_BASE = '/teaching/student/works'

function parseWorkTags (record) {
    if (Array.isArray(record.workTags)) {
        return record.workTags
            .map(item => String(item || '').trim())
            .filter(Boolean)
    }

    if (typeof record.workTag === 'string' && record.workTag.trim()) {
        return record.workTag
            .split(',')
            .map(item => item.trim())
            .filter(Boolean)
    }

    return []
}

function normalizeWorkRecord (record) {
    return {
        ...record,
        workTags: parseWorkTags(record)
    }
}

function emptyEditorForm () {
    return {
        id: '',
        workName: '',
        workDescription: '',
        workType: 'resource_pack',
        workTags: [],
        isPublic: true,
        workFileUrl: '',
        workFileName: '',
        workFileExtension: '',
        workFileSize: 0,
        fileMeta: ''
    }
}

export default {
    name: 'StudentWorks',
    components: {
        JUpload
    },
    data () {
        return {
            activeTab: 'all',
            visibilityFilter: 'all',
            loading: false,
            dataSource: [],
            editorVisible: false,
            editorSaving: false,
            detailVisible: false,
            detailLoading: false,
            detailRecord: null,
            editMode: 'create',
            editorForm: emptyEditorForm(),
            workTypeOptions: WORK_TYPE_OPTIONS,
            pagination: {
                current: 1,
                pageSize: 10,
                total: 0,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: total => `共 ${total} 条`
            },
            editorRules: {
                workName: [
                    { required: true, message: '请输入资源名称', trigger: 'blur' }
                ],
                workDescription: [
                    { required: false }
                ],
                workFileUrl: [
                    {
                        validator: (rule, value, callback) => {
                            if (this.editMode === 'create' && !value) {
                                callback(new Error('请上传资源文件'))
                                return
                            }
                            callback()
                        },
                        trigger: 'change'
                    }
                ],
                workType: [
                    { required: true, message: '请选择资源分类', trigger: 'change' }
                ],
                isPublic: [
                    { required: true, type: 'boolean', message: '请选择可见范围', trigger: 'change' }
                ]
            }
        }
    },
    computed: {
        detailTags () {
            return this.detailRecord ? parseWorkTags(this.detailRecord) : []
        },
        canPreviewDetailRecord () {
            return this.supportsWorkPreview(this.detailRecord)
        },
        columns () {
            const baseColumns = [
                {
                    title: '资源名称',
                    key: 'resourceName',
                    scopedSlots: { customRender: 'resourceName' }
                },
                {
                    title: '作者',
                    key: 'author',
                    width: 120,
                    scopedSlots: { customRender: 'author' }
                },
                {
                    title: '资源分类',
                    key: 'resourceType',
                    width: 140,
                    scopedSlots: { customRender: 'resourceType' }
                },
                {
                    title: '文件',
                    key: 'file',
                    width: 240,
                    scopedSlots: { customRender: 'file' }
                },
                {
                    title: '标签',
                    key: 'tags',
                    width: 180,
                    scopedSlots: { customRender: 'tags' }
                }
            ]

            if (this.activeTab === 'my') {
                baseColumns.push({
                    title: '可见范围',
                    key: 'visibility',
                    width: 120,
                    scopedSlots: { customRender: 'visibility' }
                })
            }

            baseColumns.push(
                {
                    title: '上传时间',
                    key: 'createTime',
                    width: 180,
                    scopedSlots: { customRender: 'createTime' }
                },
                {
                    title: '操作',
                    key: 'action',
                    width: this.activeTab === 'my' ? 220 : 140,
                    scopedSlots: { customRender: 'action' }
                }
            )

            return baseColumns
        }
    },
    watch: {
        '$route.query.tab': {
            immediate: true,
            handler (value) {
                const nextTab = this.normalizeTab(value)
                if (this.activeTab !== nextTab) {
                    this.activeTab = nextTab
                }
                this.pagination.current = 1
                this.syncTitle()
                this.loadWorks()
            }
        }
    },
    created () {
        this.syncTitle()
    },
    methods: {
        normalizeTab (value) {
            return value === 'my' ? 'my' : 'all'
        },
        syncTitle () {
            if (this.$route.meta) {
                this.$route.meta.title = '作品资源库'
            }
            document.title = '作品资源库 · 乐启享'
        },
        getCurrentEndpoint () {
            return this.activeTab === 'my'
                ? '/teaching/teachingWork/mine'
                : '/teaching/teachingWork/leaderboard'
        },
        buildQueryParams () {
            const params = {
                pageNo: this.pagination.current,
                pageSize: this.pagination.pageSize
            }

            if (this.activeTab === 'my') {
                if (this.visibilityFilter === 'public') {
                    params.isPublic = 1
                } else if (this.visibilityFilter === 'private') {
                    params.isPublic = 0
                }
            }

            return params
        },
        async loadWorks () {
            this.loading = true
            try {
                const response = await getAction(this.getCurrentEndpoint(), this.buildQueryParams())

                if (response && response.success) {
                    const result = response.result || {}
                    this.dataSource = (result.records || []).map(normalizeWorkRecord)
                    this.pagination.total = result.total || 0
                } else {
                    this.dataSource = []
                    this.pagination.total = 0
                    this.$message.error((response && response.message) || '加载作品失败')
                }
            } catch (error) {
                this.dataSource = []
                this.pagination.total = 0
                this.$message.error(error.message || '加载作品失败')
            } finally {
                this.loading = false
            }
        },
        handleTabChange (tab) {
            const nextTab = this.normalizeTab(tab)
            this.activeTab = nextTab
            this.pagination.current = 1
            if (nextTab !== 'my') {
                this.visibilityFilter = 'all'
            }
            this.$router.replace({
                path: '/student/works',
                query: {
                    ...this.$route.query,
                    tab: nextTab
                }
            })
        },
        handleVisibilityChange () {
            this.pagination.current = 1
            this.loadWorks()
        },
        handleTableChange (pagination) {
            this.pagination = {
                ...this.pagination,
                current: pagination.current,
                pageSize: pagination.pageSize
            }
            this.loadWorks()
        },
        formatDateTime (value) {
            if (!value) {
                return '-'
            }

            const momentValue = moment(value)
            if (!momentValue.isValid()) {
                return String(value)
            }

            return momentValue.format('YYYY-MM-DD HH:mm')
        },
        formatFileMeta (record) {
            const extension = String(record.workFileExtension || '').trim().toUpperCase()
            const size = this.formatFileSize(record.workFileSize)
            const parts = [extension, size].filter(Boolean)
            return parts.length > 0 ? parts.join(' · ') : '-'
        },
        formatFileSize (value) {
            const size = Number(value)
            if (!Number.isFinite(size) || size <= 0) {
                return ''
            }

            if (size >= 1024 * 1024 * 1024) {
                return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
            }

            if (size >= 1024 * 1024) {
                return `${(size / (1024 * 1024)).toFixed(1)} MB`
            }

            if (size >= 1024) {
                return `${(size / 1024).toFixed(1)} KB`
            }

            return `${size} B`
        },
        normalizeWorkTypeForView (record) {
            if (!record) {
                return ''
            }
            const rawType = String(record.workType || record.rawWorkType || '').trim()
            if (rawType === '1' || rawType === '2' || rawType === '3' || rawType === '4' || rawType === '10') {
                return rawType
            }

            switch (rawType) {
            case 'scratch':
            case 'scratch3':
                return '1'
            case 'scratchjr':
                return '3'
            case 'python':
            case 'turtle':
                return '4'
            case 'blockly':
                return '10'
            default:
                return rawType
            }
        },
        supportsWorkPreview (record) {
            if (!record) {
                return false
            }

            const workType = this.normalizeWorkTypeForView(record)
            if (['1', '2', '3', '4', '10'].includes(workType)) {
                return true
            }

            const extension = String(record.workFileExtension || '').trim().toLowerCase()
            return !['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(extension) && Boolean(record.workFileKey_url || record.workFileUrl)
        },
        resolveWorkPreviewUrl (record) {
            const workType = this.normalizeWorkTypeForView(record)

            switch (workType) {
            case '1':
            case '2':
                return `/scratch3/index.html?workId=${record.id}`
            case '3':
                return `/scratchjr/editor.html?mode=edit&workId=${record.id}&workFile=${encodeURIComponent(record.workFileKey_url || record.workFileUrl || '')}`
            case '4':
                return `/python/index.html?workId=${record.id}`
            case '10':
                return `/blockly/index.html?lang=zh-hans&workId=${record.id}`
            default:
                return record.workFileKey_url || record.workFileUrl || ''
            }
        },
        async handleView (record) {
            this.detailLoading = true
            try {
                const response = await getAction(`${STUDENT_WORK_API_BASE}/${record.id}`)
                const result = response && response.success && response.result ? response.result : record
                this.detailRecord = normalizeWorkRecord({
                    ...record,
                    ...result
                })
                this.detailVisible = true
            } catch (error) {
                this.detailRecord = normalizeWorkRecord(record)
                this.detailVisible = true
                this.$message.warning(error.message || '作品详情加载失败，已展示基础信息')
            } finally {
                this.detailLoading = false
            }
        },
        handlePreviewFromDetail () {
            if (!this.detailRecord) {
                return
            }

            if (!this.supportsWorkPreview(this.detailRecord)) {
                this.$message.info('当前作品暂不支持直接预览，请使用下载查看')
                return
            }

            const previewUrl = this.resolveWorkPreviewUrl(this.detailRecord)
            if (!previewUrl) {
                this.$message.info('当前作品暂不支持在线预览，请直接下载查看')
                return
            }

            window.open(previewUrl, '_blank')
        },
        closeDetail () {
            this.detailVisible = false
            this.detailLoading = false
            this.detailRecord = null
        },
        handleDownload (record) {
            window.open(`/api${STUDENT_WORK_API_BASE}/download/${record.id}?redirect=1`, '_blank')
        },
        openUploadModal () {
            this.editMode = 'create'
            this.editorForm = emptyEditorForm()
            this.editorVisible = true
            this.$nextTick(() => {
                if (this.$refs.editorForm) {
                    this.$refs.editorForm.clearValidate()
                }
            })
        },
        openEditModal (record) {
            this.editMode = 'edit'
            this.editorForm = {
                id: record.id,
                workName: record.workName || '',
                workDescription: record.workDescription || '',
                workType: record.rawWorkType || record.workType || 'resource_pack',
                workTags: parseWorkTags(record),
                isPublic: record.is_public === 1 || record.isPublic === true,
                workFileUrl: record.workFileUrl || '',
                workFileName: record.workFileName || '',
                workFileExtension: record.workFileExtension || '',
                workFileSize: record.workFileSize || 0,
                fileMeta: this.formatFileMeta(record)
            }
            this.editorVisible = true
            this.$nextTick(() => {
                if (this.$refs.editorForm) {
                    this.$refs.editorForm.clearValidate()
                }
            })
        },
        closeEditor () {
            this.editorVisible = false
            this.editorSaving = false
            this.editorForm = emptyEditorForm()
        },
        handleUploadChange (value) {
            this.editorForm.workFileUrl = value
            const filePath = String(value || '').trim()
            const fileName = filePath ? filePath.split('/').pop() : ''
            const extension = fileName.includes('.') ? fileName.split('.').pop() : ''
            this.editorForm.workFileName = decodeURIComponent(fileName || '')
            this.editorForm.workFileExtension = extension
        },
        async submitEditor () {
            if (!this.$refs.editorForm) {
                return
            }

            try {
                await this.$refs.editorForm.validate()
            } catch (validationError) {
                return
            }

            this.editorSaving = true
            try {
                if (this.editMode === 'create') {
                    const payload = {
                        workName: this.editorForm.workName,
                        workDescription: this.editorForm.workDescription,
                        workType: this.editorForm.workType,
                        workFileUrl: this.editorForm.workFileUrl,
                        workFileName: this.editorForm.workFileName,
                        workFileExtension: this.editorForm.workFileExtension,
                        workTags: this.editorForm.workTags,
                        isPublic: this.editorForm.isPublic
                    }
                    const response = await postAction(`${STUDENT_WORK_API_BASE}/upload`, payload)
                    if (!response || !response.success) {
                        throw new Error((response && response.message) || '上传资源失败')
                    }
                    this.$message.success('资源上传成功')
                } else {
                    const response = await putAction(`${STUDENT_WORK_API_BASE}/${this.editorForm.id}`, {
                        workName: this.editorForm.workName,
                        workDescription: this.editorForm.workDescription,
                        workTags: this.editorForm.workTags,
                        isPublic: this.editorForm.isPublic
                    })
                    if (!response || !response.success) {
                        throw new Error((response && response.message) || '更新资源失败')
                    }
                    this.$message.success('资源更新成功')
                }

                this.closeEditor()
                this.pagination.current = 1
                await this.loadWorks()
            } catch (error) {
                this.$message.error(error.message || '保存资源失败')
            } finally {
                this.editorSaving = false
            }
        },
        async confirmDelete (record) {
            try {
                const response = await deleteAction(`${STUDENT_WORK_API_BASE}/${record.id}`)
                if (!response || !response.success) {
                    throw new Error((response && response.message) || '删除资源失败')
                }
                this.$message.success('资源删除成功')
                if (this.dataSource.length === 1 && this.pagination.current > 1) {
                    this.pagination.current -= 1
                }
                await this.loadWorks()
            } catch (error) {
                this.$message.error(error.message || '删除资源失败')
            }
        }
    }
}
</script>

<style scoped>
.student-works {
  padding: 24px;
}

.page-header {
  margin-bottom: 8px;
}

.page-header h2 {
  margin-bottom: 0;
}

.works-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
  flex-wrap: wrap;
}

.works-filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.works-filter-label {
  color: rgba(0, 0, 0, 0.65);
  font-size: 14px;
}

.resource-name {
  min-width: 0;
}

.resource-title {
  color: rgba(0, 0, 0, 0.85);
  font-weight: 500;
  line-height: 1.5;
}

.resource-desc {
  margin-top: 4px;
  color: #8c8c8c;
  font-size: 12px;
  line-height: 1.5;
}

.file-name {
  color: rgba(0, 0, 0, 0.85);
  word-break: break-all;
}

.file-meta {
  margin-top: 4px;
  color: #8c8c8c;
  font-size: 12px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.placeholder-text {
  color: #999;
}

.current-file {
  line-height: 1.6;
}

.work-detail {
  padding-top: 8px;
}

.detail-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.detail-break {
  word-break: break-all;
  white-space: pre-wrap;
}
</style>
