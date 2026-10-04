<template>
  <div class="homework-template-manager">
    <a-card>
      <div slot="title">
        <a-icon type="file-text" />
        作业模板管理
      </div>
      <div slot="extra">
        <a-button type="primary" @click="showCreateModal">
          <a-icon type="plus" />
          创建模板
        </a-button>
      </div>

      <!-- 筛选条件 -->
      <div class="filter-section">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-select v-model="filters.homeworkType" placeholder="作业类型" style="width: 100%" @change="loadTemplateList">
              <a-select-option value="">所有类型</a-select-option>
              <a-select-option value="编程作业">编程作业</a-select-option>
              <a-select-option value="理论作业">理论作业</a-select-option>
              <a-select-option value="实践作业">实践作业</a-select-option>
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-select v-model="filters.difficulty" placeholder="难度等级" style="width: 100%" @change="loadTemplateList">
              <a-select-option value="">所有难度</a-select-option>
              <a-select-option :value="1">简单</a-select-option>
              <a-select-option :value="2">较简单</a-select-option>
              <a-select-option :value="3">中等</a-select-option>
              <a-select-option :value="4">较难</a-select-option>
              <a-select-option :value="5">困难</a-select-option>
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-input-search
              v-model="filters.keyword"
              placeholder="搜索模板"
              @search="loadTemplateList"
              style="width: 100%"
            />
          </a-col>
        </a-row>
      </div>

      <a-divider />

      <!-- 模板列表 -->
      <a-table
        :columns="columns"
        :data-source="templateList"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
      >
        <template slot="difficulty" slot-scope="text">
          <a-tag :color="getDifficultyColor(text)">
            {{ getDifficultyText(text) }}
          </a-tag>
        </template>

        <template slot="score" slot-scope="text, record">
          <span>总分: {{ record.total_score }} / 及格: {{ record.pass_score }}</span>
        </template>

        <template slot="action" slot-scope="text, record">
          <a-button-group size="small">
            <a-button @click="editTemplate(record)">
              <a-icon type="edit" />
              编辑
            </a-button>
            <a-button @click="assignTemplate(record)" type="primary">
              <a-icon type="deployment-unit" />
              分配
            </a-button>
            <a-button @click="deleteTemplate(record)" type="danger">
              <a-icon type="delete" />
              删除
            </a-button>
          </a-button-group>
        </template>
      </a-table>
    </a-card>

    <!-- 创建/编辑模板弹窗 -->
    <a-modal
      :title="modalTitle"
      :visible="modalVisible"
      :width="800"
      @ok="handleSubmit"
      @cancel="handleCancel"
      :confirmLoading="submitting"
    >
      <a-form-model
        ref="templateForm"
        :model="formData"
        :rules="rules"
        :label-col="{ span: 4 }"
        :wrapper-col="{ span: 20 }"
      >
        <a-form-model-item label="作业标题" prop="homeworkTitle">
          <a-input v-model="formData.homeworkTitle" placeholder="请输入作业标题" />
        </a-form-model-item>

        <a-form-model-item label="作业类型" prop="homeworkType">
          <a-select v-model="formData.homeworkType" placeholder="请选择作业类型">
            <a-select-option value="编程作业">编程作业</a-select-option>
            <a-select-option value="理论作业">理论作业</a-select-option>
            <a-select-option value="实践作业">实践作业</a-select-option>
          </a-select>
        </a-form-model-item>

        <a-form-model-item label="难度等级" prop="difficulty">
          <a-select v-model="formData.difficulty" placeholder="请选择难度等级">
            <a-select-option :value="1">简单</a-select-option>
            <a-select-option :value="2">较简单</a-select-option>
            <a-select-option :value="3">中等</a-select-option>
            <a-select-option :value="4">较难</a-select-option>
            <a-select-option :value="5">困难</a-select-option>
          </a-select>
        </a-form-model-item>

        <a-form-model-item label="作业描述" prop="description">
          <a-textarea v-model="formData.description" :rows="4" placeholder="请输入作业描述" />
        </a-form-model-item>

        <a-form-model-item label="作业要求" prop="requirements">
          <a-textarea v-model="formData.requirements" :rows="4" placeholder="请输入作业要求" />
        </a-form-model-item>

        <a-form-model-item label="总分" prop="totalScore">
          <a-input-number v-model="formData.totalScore" :min="1" :max="1000" style="width: 100%" />
        </a-form-model-item>

        <a-form-model-item label="及格分" prop="passScore">
          <a-input-number v-model="formData.passScore" :min="1" :max="1000" style="width: 100%" />
        </a-form-model-item>

        <a-form-model-item label="作业资源">
          <div class="resource-upload-section">
            <a-button
              type="primary"
              icon="upload"
              @click="triggerFileInput"
              :disabled="uploading"
            >
              上传文件
            </a-button>
            <input
              ref="fileInput"
              type="file"
              style="display: none;"
              accept=".ppt,.pptx,.doc,.docx,.pdf,.mp4,.avi,.mov,.py,.js,.html,.css,.jpg,.jpeg,.png,.gif,.zip,.rar"
              @change="handleFileSelect"
              multiple
            />
            <div class="upload-hint">
              支持的文件类型: PPT, Word, PDF, 视频, 代码, 图片, 压缩包等（单个文件最大100MB）
            </div>
          </div>

          <!-- 已上传的资源列表 -->
          <div v-if="formData.resources && formData.resources.length > 0" class="resource-list">
            <div v-for="(resource, index) in formData.resources" :key="index" class="resource-item">
              <a-icon :type="getFileIcon(resource.name)" />
              <span class="resource-name">{{ resource.name }}</span>
              <span class="resource-size">({{ formatFileSize(resource.size) }})</span>
              <a-button
                type="link"
                size="small"
                icon="delete"
                @click="removeResource(index)"
              >
                删除
              </a-button>
            </div>
          </div>
        </a-form-model-item>
      </a-form-model>
    </a-modal>
  </div>
</template>

<script>
import { getTemplateList, createTemplate, updateTemplate, deleteTemplate } from '@/api/homework'

export default {
    name: 'HomeworkTemplateManager',
    data () {
        return {
            loading: false,
            submitting: false,
            templateList: [],
            filters: {
                homeworkType: '',
                difficulty: '',
                keyword: ''
            },
            pagination: {
                current: 1,
                pageSize: 10,
                total: 0
            },
            columns: [
                {
                    title: '作业标题',
                    dataIndex: 'homework_title',
                    key: 'homework_title',
                    width: 200
                },
                {
                    title: '作业类型',
                    dataIndex: 'homework_type',
                    key: 'homework_type',
                    width: 120
                },
                {
                    title: '难度',
                    dataIndex: 'difficulty',
                    key: 'difficulty',
                    width: 100,
                    scopedSlots: { customRender: 'difficulty' }
                },
                {
                    title: '分数',
                    key: 'score',
                    width: 150,
                    scopedSlots: { customRender: 'score' }
                },
                {
                    title: '创建时间',
                    dataIndex: 'create_time',
                    key: 'create_time',
                    width: 180
                },
                {
                    title: '操作',
                    key: 'action',
                    width: 300,
                    scopedSlots: { customRender: 'action' }
                }
            ],
            modalVisible: false,
            modalTitle: '创建模板',
            isEdit: false,
            formData: {
                id: null,
                homeworkTitle: '',
                homeworkType: '',
                difficulty: 3,
                description: '',
                requirements: '',
                totalScore: 100,
                passScore: 60,
                resources: []
            },
            uploading: false,
            rules: {
                homeworkTitle: [{ required: true, message: '请输入作业标题', trigger: 'blur' }],
                homeworkType: [{ required: true, message: '请选择作业类型', trigger: 'change' }],
                difficulty: [{ required: true, message: '请选择难度等级', trigger: 'change' }]
            }
        }
    },
    mounted () {
        this.loadTemplateList()
    },
    methods: {
        async loadTemplateList () {
            this.loading = true
            try {
                const params = {
                    pageNo: this.pagination.current,
                    pageSize: this.pagination.pageSize,
                    ...this.filters
                }
                console.log('[模板列表] 请求参数:', params)
                const response = await getTemplateList(params)
                console.log('[模板列表] 响应数据:', response)
                if (response && response.success) {
                    this.templateList = response.result.records || []
                    this.pagination.total = response.result.total || 0
                    console.log('[模板列表] 加载成功，数量:', this.templateList.length)
                } else {
                    console.error('[模板列表] 响应失败:', response)
                    this.$message.error((response && response.message) || '加载失败')
                }
            } catch (error) {
                console.error('[模板列表] 请求异常:', error)
                this.$message.error('加载模板列表失败: ' + (error.message || '未知错误'))
            } finally {
                this.loading = false
            }
        },

        handleTableChange (pagination) {
            this.pagination.current = pagination.current
            this.pagination.pageSize = pagination.pageSize
            this.loadTemplateList()
        },

        showCreateModal () {
            this.modalTitle = '创建模板'
            this.isEdit = false
            this.formData = {
                id: null,
                homeworkTitle: '',
                homeworkType: '',
                difficulty: 3,
                description: '',
                requirements: '',
                totalScore: 100,
                passScore: 60,
                resources: []
            }
            this.modalVisible = true
        },

        editTemplate (record) {
            this.modalTitle = '编辑模板'
            this.isEdit = true
            this.formData = {
                id: record.id,
                homeworkTitle: record.homework_title,
                homeworkType: record.homework_type,
                difficulty: record.difficulty,
                description: record.description,
                requirements: record.requirements,
                totalScore: record.total_score,
                passScore: record.pass_score,
                resources: record.resources ? (typeof record.resources === 'string' ? JSON.parse(record.resources) : record.resources) : []
            }
            this.modalVisible = true
        },

        assignTemplate (record) {
            this.$router.push({
                path: '/admin/homework-assignment',
                query: { templateId: record.id }
            })
        },

        async deleteTemplate (record) {
            this.$confirm({
                title: '确认删除',
                content: `确定要删除模板"${record.homework_title}"吗？`,
                onOk: async () => {
                    try {
                        const response = await deleteTemplate(record.id)
                        if (response.success) {
                            this.$message.success('删除成功')
                            this.loadTemplateList()
                        }
                    } catch (error) {
                        this.$message.error('删除失败')
                    }
                }
            })
        },

        async handleSubmit () {
            this.$refs.templateForm.validate(async valid => {
                if (valid) {
                    this.submitting = true
                    try {
                        // 清理resources数组，移除originFileObj（File对象无法序列化）
                        const cleanedData = {
                            ...this.formData,
                            resources: this.formData.resources.map(r => ({
                                uid: r.uid,
                                name: r.name,
                                size: r.size,
                                status: r.status || 'done'
                            }))
                        }

                        console.log('[模板提交] 数据:', cleanedData)

                        let response
                        if (this.isEdit) {
                            response = await updateTemplate(this.formData.id, cleanedData)
                        } else {
                            response = await createTemplate(cleanedData)
                        }

                        console.log('[模板提交] 响应:', response)

                        if (response.success) {
                            this.$message.success(this.isEdit ? '更新成功' : '创建成功')
                            this.modalVisible = false
                            this.loadTemplateList()
                        } else {
                            this.$message.error(response.message || (this.isEdit ? '更新失败' : '创建失败'))
                        }
                    } catch (error) {
                        console.error('[模板提交] 错误:', error)
                        this.$message.error(error.message || (this.isEdit ? '更新失败' : '创建失败'))
                    } finally {
                        this.submitting = false
                    }
                }
            })
        },

        handleCancel () {
            this.modalVisible = false
        },

        getDifficultyColor (difficulty) {
            const colors = ['', 'green', 'cyan', 'blue', 'orange', 'red']
            return colors[difficulty] || 'default'
        },

        getDifficultyText (difficulty) {
            const texts = ['', '简单', '较简单', '中等', '较难', '困难']
            return texts[difficulty] || '未知'
        },

        // 触发文件选择
        triggerFileInput () {
            if (this.$refs.fileInput) {
                this.$refs.fileInput.click()
            }
        },

        // 处理文件选择
        handleFileSelect (event) {
            const files = event.target.files
            if (!files || files.length === 0) {
                return
            }

            for (let i = 0; i < files.length; i++) {
                const file = files[i]
                const isLt100M = file.size / 1024 / 1024 < 100
                if (!isLt100M) {
                    this.$message.error(`文件 ${file.name} 大小超过100MB`)
                    continue
                }

                this.formData.resources.push({
                    uid: Date.now() + i,
                    name: file.name,
                    size: file.size,
                    status: 'done',
                    originFileObj: file
                })
            }

            this.$message.success(`已选择 ${files.length} 个文件`)
            // 清空input以便重复选择同一文件
            event.target.value = ''
        },

        // 移除资源
        removeResource (index) {
            this.formData.resources.splice(index, 1)
        },

        // 格式化文件大小
        formatFileSize (bytes) {
            if (bytes === 0) return '0 B'
            const k = 1024
            const sizes = ['B', 'KB', 'MB', 'GB']
            const i = Math.floor(Math.log(bytes) / Math.log(k))
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
        },

        // 获取文件图标
        getFileIcon (filename) {
            const ext = filename.split('.').pop().toLowerCase()
            const iconMap = {
                'pdf': 'file-pdf',
                'doc': 'file-word',
                'docx': 'file-word',
                'ppt': 'file-ppt',
                'pptx': 'file-ppt',
                'xls': 'file-excel',
                'xlsx': 'file-excel',
                'zip': 'file-zip',
                'rar': 'file-zip',
                'jpg': 'file-image',
                'jpeg': 'file-image',
                'png': 'file-image',
                'gif': 'file-image',
                'mp4': 'video-camera',
                'avi': 'video-camera',
                'mov': 'video-camera',
                'py': 'code',
                'js': 'code',
                'html': 'code',
                'css': 'code'
            }
            return iconMap[ext] || 'file'
        }
    }
}
</script>

<style scoped lang="less">
.homework-template-manager {
  .filter-section {
    margin-bottom: 16px;
  }
}

.resource-upload-section {
  .upload-hint {
    margin-top: 8px;
    font-size: 12px;
    color: #999;
  }
}

.resource-list {
  margin-top: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 8px;
  max-height: 200px;
  overflow-y: auto;

  .resource-item {
    display: flex;
    align-items: center;
    padding: 8px;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    .anticon {
      margin-right: 8px;
      font-size: 16px;
      color: #1890ff;
    }

    .resource-name {
      flex: 1;
      margin-right: 8px;
    }

    .resource-size {
      color: #999;
      font-size: 12px;
      margin-right: 8px;
    }
  }
}
</style>
