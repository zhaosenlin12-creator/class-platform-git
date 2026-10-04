<template>
  <a-card :bordered="false">
    <!-- 标题和返回按钮 -->
    <div slot="title" style="display:flex;align-items:center;gap:12px">
      <a-button @click="goBack" icon="arrow-left">返回</a-button>
      <a-icon type="book" />
      <span>课程单元（课节）管理</span>
      <a-tag color="blue">{{ courseInfo.courseName || '未知课程' }}</a-tag>
    </div>

    <!-- 操作按钮 -->
    <div class="table-operator" style="margin-bottom:16px">
      <a-button @click="handleAdd" type="primary" icon="plus">新增课节</a-button>
      <a-button @click="loadData" icon="reload" style="margin-left:8px">刷新</a-button>
    </div>

    <!-- 课节列表 -->
    <a-table
      :loading="loading"
      :columns="columns"
      :dataSource="dataSource"
      :pagination="false"
      rowKey="id"
      bordered>

      <!-- 课节号 -->
      <template slot="unitNo" slot-scope="text">
        <a-tag color="cyan">第{{ text }}课</a-tag>
      </template>

      <!-- 内容类型 -->
      <template slot="contentType" slot-scope="text">
        <a-tag :color="getContentTypeColor(text)">{{ getContentTypeLabel(text) }}</a-tag>
      </template>

      <!-- 时长 -->
      <template slot="duration" slot-scope="text">
        <span>{{ text || 0 }} 分钟</span>
      </template>

      <!-- 操作 -->
      <template slot="action" slot-scope="text, record">
        <a @click="handleEdit(record)">编辑</a>
        <a-divider type="vertical" />
        <a @click="moveUp(record)" :disabled="!canMoveUp(record)">上移</a>
        <a-divider type="vertical" />
        <a @click="moveDown(record)" :disabled="!canMoveDown(record)">下移</a>
        <a-divider type="vertical" />
        <a-popconfirm title="确定删除吗?" @confirm="handleDelete(record.id)">
          <a style="color:red">删除</a>
        </a-popconfirm>
      </template>
    </a-table>

    <!-- 新增/编辑弹窗 -->
    <a-modal
      :title="modalTitle"
      :visible="visible"
      :confirmLoading="confirmLoading"
      @ok="handleSubmit"
      @cancel="handleCancel"
      :width="700">

      <a-form-model ref="form" :model="form" :rules="rules" :label-col="{span:6}" :wrapper-col="{span:16}">
        <a-form-model-item label="课节序号" prop="unitNo">
          <a-input-number v-model="form.unitNo" :min="1" placeholder="请输入课节序号" style="width:100%"/>
        </a-form-model-item>

        <a-form-model-item label="课节名称" prop="unitName">
          <a-input v-model="form.unitName" placeholder="例如：变量和数据类型"/>
        </a-form-model-item>

        <a-form-model-item label="内容类型" prop="contentType">
          <a-select v-model="form.contentType" placeholder="请选择内容类型">
            <a-select-option v-for="option in contentTypeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </a-select-option>
          </a-select>
        </a-form-model-item>

        <a-form-model-item label="时长(分钟)" prop="duration">
          <a-input-number v-model="form.duration" :min="0" placeholder="请输入时长" style="width:100%"/>
        </a-form-model-item>

        <a-form-model-item label="关联资源">
          <a-input
            v-model="form.resourceName"
            placeholder="点击右侧按钮从资源库选择"
            readonly
            style="width: calc(100% - 90px); margin-right: 8px"
          />
          <a-button @click="showResourceSelector" icon="file" type="primary">
            选择资源
          </a-button>
        </a-form-model-item>

        <a-form-model-item label="内容URL" v-if="form.contentUrl">
          <a-input v-model="form.contentUrl" disabled/>
        </a-form-model-item>

        <a-form-model-item label="课节描述">
          <a-textarea v-model="form.description" :rows="4" placeholder="请输入课节描述"/>
        </a-form-model-item>
      </a-form-model>
    </a-modal>

    <!-- 资源选择对话框 -->
    <a-modal
      title="选择资源"
      :visible="resourceSelectorVisible"
      :width="900"
      @ok="handleResourceSelect"
      @cancel="resourceSelectorVisible = false">

      <a-table
        :loading="resourceLoading"
        :columns="resourceColumns"
        :dataSource="resourceList"
        :pagination="resourcePagination"
        @change="handleResourceTableChange"
        rowKey="id"
        :row-selection="{
          type: 'radio',
          selectedRowKeys: selectedResourceKeys,
          onChange: onResourceSelectChange
        }">

        <template slot="resourceType" slot-scope="text">
          <a-tag :color="getContentTypeColor(text)">{{ getContentTypeLabel(text) }}</a-tag>
        </template>

        <template slot="fileSize" slot-scope="text">
          {{ formatFileSize(text) }}
        </template>
      </a-table>
    </a-modal>
  </a-card>
</template>

<script>
import { getAction, postAction, deleteAction, putAction } from '@/api/manage'
import { courseResourceApi } from '@/api/teaching'
import { getResourceTypeLabel } from './resourceMeta'

const CONTENT_TYPE_META = Object.freeze({
    programming: { label: '编程练习', color: 'blue' },
    quiz: { label: '测验', color: 'purple' },
    video: { label: '视频课程', color: 'green' },
    document: { label: '文档资料', color: 'gold' },
    ppt: { label: 'PPT课件', color: 'orange' },
    pdf: { label: 'PDF文档', color: 'cyan' },
    code: { label: '代码示例', color: 'geekblue' },
    image: { label: '图片资源', color: 'magenta' },
    audio: { label: '音频资源', color: 'lime' },
    ai_package: { label: 'AI资源包', color: 'volcano' }
})

const CONTENT_TYPE_OPTIONS = [
    { value: 'programming', label: '编程练习' },
    { value: 'ppt', label: 'PPT课件' },
    { value: 'document', label: '文档资料' },
    { value: 'video', label: '视频课程' },
    { value: 'pdf', label: 'PDF文档' },
    { value: 'code', label: '代码示例' },
    { value: 'image', label: '图片资源' },
    { value: 'audio', label: '音频资源' },
    { value: 'ai_package', label: 'AI资源包' },
    { value: 'quiz', label: '测验' }
]

export default {
    name: 'CourseUnitManager',
    data () {
        return {
            courseId: '',
            courseInfo: {},
            loading: false,
            dataSource: [],
            visible: false,
            confirmLoading: false,
            modalTitle: '',
            form: {
                unitNo: 1,
                unitName: '',
                contentType: 'programming',
                duration: 45,
                contentUrl: '',
                resourceId: '',
                resourceName: '',
                description: ''
            },
            contentTypeOptions: CONTENT_TYPE_OPTIONS,
            // 资源选择相关
            resourceSelectorVisible: false,
            resourceLoading: false,
            resourceList: [],
            selectedResourceKeys: [],
            selectedResource: null,
            resourcePagination: {
                current: 1,
                pageSize: 10,
                total: 0
            },
            resourceColumns: [
                {
                    title: '资源名称',
                    dataIndex: 'title',
                    ellipsis: true,
                    customRender: (text, record) => text || record.name || '--'
                },
                {
                    title: '类型',
                    dataIndex: 'type',
                    width: 100,
                    scopedSlots: { customRender: 'resourceType' }
                },
                {
                    title: '文件大小',
                    dataIndex: 'size',
                    width: 120,
                    scopedSlots: { customRender: 'fileSize' }
                }
            ],
            rules: {
                unitNo: [{ required: true, message: '请输入课节序号' }],
                unitName: [{ required: true, message: '请输入课节名称' }],
                contentType: [{ required: true, message: '请选择内容类型' }]
            },
            columns: [
                {
                    title: '序号',
                    dataIndex: 'sortNo',
                    width: 80,
                    align: 'center',
                    customRender: (text, record, index) => index + 1
                },
                {
                    title: '课节号',
                    dataIndex: 'unitNo',
                    width: 100,
                    align: 'center',
                    scopedSlots: { customRender: 'unitNo' }
                },
                {
                    title: '课节名称',
                    dataIndex: 'unitName',
                    ellipsis: true
                },
                {
                    title: '内容类型',
                    dataIndex: 'contentType',
                    width: 120,
                    align: 'center',
                    scopedSlots: { customRender: 'contentType' }
                },
                {
                    title: '时长',
                    dataIndex: 'duration',
                    width: 100,
                    align: 'center',
                    scopedSlots: { customRender: 'duration' }
                },
                {
                    title: '操作',
                    width: 240,
                    align: 'center',
                    scopedSlots: { customRender: 'action' }
                }
            ]
        }
    },
    created () {
        this.courseId = this.$route.query.courseId
        if (this.courseId) {
            this.loadCourseInfo()
            this.loadData()
        } else {
            this.$message.error('缺少课程ID参数')
        }
    },
    methods: {
        getContentTypeMeta (value) {
            const normalizedValue = String(value || '').trim().toLowerCase()
            if (!normalizedValue) {
                return {
                    label: '未设置',
                    color: 'default'
                }
            }

            const matchedMeta = CONTENT_TYPE_META[normalizedValue]
            if (matchedMeta) {
                return matchedMeta
            }

            return {
                label: getResourceTypeLabel(normalizedValue),
                color: 'default'
            }
        },
        getContentTypeLabel (value) {
            return this.getContentTypeMeta(value).label
        },
        getContentTypeColor (value) {
            return this.getContentTypeMeta(value).color
        },
        async loadCourseInfo () {
            try {
                const res = await getAction('/course/' + this.courseId)
                if (res.success) {
                    this.courseInfo = res.result
                }
            } catch (e) {
                console.error('加载课程信息失败:', e)
            }
        },

        async loadData () {
            this.loading = true
            try {
                const res = await getAction('/teaching/teachingCourseUnit/list', {
                    courseId: this.courseId
                })
                if (res.success) {
                    this.dataSource = res.result || []
                } else {
                    this.$message.error(res.message || '加载失败')
                }
            } catch (e) {
                console.error('加载课节列表失败:', e)
                this.$message.error('加载课节列表失败')
            } finally {
                this.loading = false
            }
        },

        handleAdd () {
            this.modalTitle = '新增课节'
            this.form = {
                unitNo: this.dataSource.length + 1,
                unitName: '',
                contentType: 'programming',
                duration: 45,
                contentUrl: '',
                resourceId: '',
                resourceName: '',
                description: ''
            }
            this.visible = true
        },

        handleEdit (record) {
            this.modalTitle = '编辑课节'
            this.form = {
                id: record.id,
                unitNo: record.unitNo,
                unitName: record.unitName,
                contentType: record.contentType,
                duration: record.duration || 45,
                contentUrl: record.contentUrl || '',
                resourceId: record.resourceId || '',
                resourceName: record.resourceName || '',
                description: record.description || ''
            }
            this.visible = true
        },

        // 显示资源选择器
        async showResourceSelector () {
            this.resourceSelectorVisible = true
            this.selectedResourceKeys = this.form.resourceId ? [this.form.resourceId] : []
            await this.loadResourceList()
        },

        // 加载资源列表
        async loadResourceList (page = 1) {
            this.resourceLoading = true
            try {
                const params = {
                    pageNo: page,
                    pageSize: this.resourcePagination.pageSize
                    // 移除 courseId 过滤，显示所有资源库中的资源
                }
                const res = await courseResourceApi.getResourceList(params)
                if (res.success) {
                    this.resourceList = res.result.records || res.result || []
                    this.resourcePagination.total = res.result.total || this.resourceList.length
                    this.resourcePagination.current = page
                }
            } catch (e) {
                console.error('加载资源列表失败:', e)
                this.$message.error('加载资源列表失败')
            } finally {
                this.resourceLoading = false
            }
        },

        // 资源表格分页变化
        handleResourceTableChange (pagination) {
            this.loadResourceList(pagination.current)
        },

        // 资源选择变化
        onResourceSelectChange (selectedRowKeys, selectedRows) {
            this.selectedResourceKeys = selectedRowKeys
            this.selectedResource = selectedRows[0] || null
        },

        // 确认选择资源
        handleResourceSelect () {
            if (!this.selectedResource) {
                this.$message.warning('请选择一个资源')
                return
            }

            this.form.resourceId = this.selectedResource.id
            this.form.resourceName = this.selectedResource.title || this.selectedResource.name || ''
            this.form.contentType = this.selectedResource.type || this.form.contentType || 'lesson'

            const previewUrl = this.selectedResource.previewUrl || this.selectedResource.preview_url
            const downloadUrl = this.selectedResource.downloadUrl || this.selectedResource.file_url
            this.form.contentUrl = previewUrl || downloadUrl || `/api/resource/download/${this.selectedResource.id}`

            if (!this.form.resourceUrl && previewUrl) {
                this.form.resourceUrl = previewUrl
            }

            this.resourceSelectorVisible = false
            this.$message.success('资源选择成功')
        },

        // 格式化文件大小
        formatFileSize (bytes) {
            if (!bytes || bytes === 0) return '0 B'
            if (typeof bytes === 'string') {
                const parsed = parseFloat(bytes)
                if (!isNaN(parsed)) {
                    bytes = parsed
                }
            }
            const k = 1024
            const sizes = ['B', 'KB', 'MB', 'GB']
            const i = Math.floor(Math.log(bytes) / Math.log(k))
            return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
        },

        handleSubmit () {
            this.$refs.form.validate(async valid => {
                if (!valid) return

                this.confirmLoading = true
                try {
                    const params = {
                        ...this.form,
                        courseId: this.courseId
                    }

                    let res
                    if (this.form.id) {
                        res = await putAction('/teaching/teachingCourseUnit/edit', params)
                    } else {
                        res = await postAction('/teaching/teachingCourseUnit/add', params)
                    }

                    if (res.success) {
                        this.$message.success(this.form.id ? '编辑成功' : '新增成功')
                        this.handleCancel()
                        this.loadData()
                    } else {
                        this.$message.error(res.message || '操作失败')
                    }
                } catch (e) {
                    console.error('提交失败:', e)
                    this.$message.error('提交失败')
                } finally {
                    this.confirmLoading = false
                }
            })
        },

        handleCancel () {
            this.visible = false
            this.form = {
                unitNo: 1,
                unitName: '',
                contentType: 'programming',
                duration: 45,
                contentUrl: '',
                resourceId: '',
                resourceName: '',
                description: ''
            }
            this.selectedResourceKeys = []
            this.selectedResource = null
        },

        async handleDelete (id) {
            try {
                const res = await deleteAction('/teaching/teachingCourseUnit/delete', { id })
                if (res.success) {
                    this.$message.success('删除成功')
                    this.loadData()
                } else {
                    this.$message.error(res.message || '删除失败')
                }
            } catch (e) {
                console.error('删除失败:', e)
                this.$message.error('删除失败')
            }
        },

        canMoveUp (record) {
            const index = this.dataSource.findIndex(item => item.id === record.id)
            return index > 0
        },

        canMoveDown (record) {
            const index = this.dataSource.findIndex(item => item.id === record.id)
            return index < this.dataSource.length - 1
        },

        async moveUp (_record) {
            // TODO: 实现上移逻辑
            this.$message.info('排序功能开发中')
        },

        async moveDown (_record) {
            // TODO: 实现下移逻辑
            this.$message.info('排序功能开发中')
        },

        goBack () {
            this.$router.go(-1)
        }
    }
}
</script>

<style scoped>
</style>
