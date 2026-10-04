<template>
  <div class="homework-assignment">
    <a-card>
      <div slot="title">
        <a-icon type="deployment-unit" />
        作业分配
      </div>
      <div slot="extra">
        <a-button type="primary" @click="showAssignModal">
          <a-icon type="plus" />
          新建分配
        </a-button>
      </div>

      <!-- 筛选条件 -->
      <div class="filter-section">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-select v-model="filters.status" placeholder="作业状态" style="width: 100%" @change="loadAssignmentList">
              <a-select-option value="">所有状态</a-select-option>
              <a-select-option value="pending">待发布</a-select-option>
              <a-select-option value="ongoing">进行中</a-select-option>
              <a-select-option value="closed">已截止</a-select-option>
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-input-search
              v-model="filters.keyword"
              placeholder="搜索作业"
              @search="loadAssignmentList"
              style="width: 100%"
            />
          </a-col>
        </a-row>
      </div>

      <a-divider />

      <!-- 已分配作业列表 -->
      <a-table
        :columns="columns"
        :data-source="assignmentList"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
      >
        <template slot="status" slot-scope="text">
          <a-tag :color="getStatusColor(text)">
            {{ getStatusText(text) }}
          </a-tag>
        </template>

        <template slot="progress" slot-scope="text, record">
          <div>
            <a-progress
              :percent="getProgressPercent(record)"
              :status="getProgressStatus(record)"
              size="small"
            />
            <span style="margin-left: 8px;">
              {{ record.submitted_count || 0 }} / {{ record.total_students || 0 }}
            </span>
          </div>
        </template>

        <template slot="action" slot-scope="text, record">
          <a-button-group size="small">
            <a-button @click="viewSubmissions(record)">
              <a-icon type="file-text" />
              查看提交
            </a-button>
            <a-button @click="viewStatistics(record)">
              <a-icon type="bar-chart" />
              统计
            </a-button>
            <a-button @click="cancelAssignment(record)" :disabled="record.status === 'closed'" type="danger">
              <a-icon :type="record.status === 'closed' ? 'stop' : 'delete'" />
              {{ record.status === 'closed' ? '已关闭' : '取消分配' }}
            </a-button>
          </a-button-group>
        </template>
      </a-table>
    </a-card>

    <!-- 分配作业弹窗 -->
    <a-modal
      title="分配作业"
      :visible="assignModalVisible"
      :width="700"
      @ok="handleAssign"
      @cancel="handleCancelAssign"
      :confirmLoading="submitting"
    >
      <a-form-model
        ref="assignForm"
        :model="assignFormData"
        :rules="assignRules"
        :label-col="{ span: 5 }"
        :wrapper-col="{ span: 19 }"
      >
        <a-form-model-item label="选择模板" prop="templateId">
          <a-select
            v-model="assignFormData.templateId"
            placeholder="请选择作业模板"
            @change="handleTemplateChange"
            show-search
            :filter-option="filterTemplate"
          >
            <a-select-option v-for="template in templateList" :key="template.id" :value="template.id">
              {{ template.homework_title }} ({{ template.homework_type }})
            </a-select-option>
          </a-select>
        </a-form-model-item>

        <a-form-model-item label="选择班级" prop="classIds">
          <a-select
            v-model="assignFormData.classIds"
            mode="multiple"
            placeholder="请选择班级"
            style="width: 100%"
          >
            <a-select-option v-for="cls in classList" :key="cls.id" :value="cls.id">
              {{ cls.name || cls.class_name }}
            </a-select-option>
          </a-select>
        </a-form-model-item>

        <a-form-model-item label="发布时间" prop="publishTime">
          <a-date-picker
            v-model="assignFormData.publishTime"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="选择发布时间"
            style="width: 100%"
          />
        </a-form-model-item>

        <a-form-model-item label="截止时间" prop="deadline">
          <a-date-picker
            v-model="assignFormData.deadline"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="选择截止时间"
            style="width: 100%"
          />
        </a-form-model-item>

        <a-form-model-item label="允许迟交" prop="allowLateSubmit">
          <a-switch v-model="assignFormData.allowLateSubmit" />
        </a-form-model-item>

        <!-- 模板预览 -->
        <a-form-model-item label="模板预览" v-if="selectedTemplate">
          <a-card size="small">
            <p><strong>标题：</strong>{{ selectedTemplate.homework_title }}</p>
            <p><strong>类型：</strong>{{ selectedTemplate.homework_type }}</p>
            <p><strong>难度：</strong>{{ getDifficultyText(selectedTemplate.difficulty) }}</p>
            <p><strong>总分：</strong>{{ selectedTemplate.total_score }} / 及格：{{ selectedTemplate.pass_score }}</p>
            <p><strong>描述：</strong>{{ selectedTemplate.description }}</p>
          </a-card>
        </a-form-model-item>
      </a-form-model>
    </a-modal>
  </div>
</template>

<script>
import { getAssignmentList, assignHomework, cancelAssignment, getTemplateList, getClassList } from '@/api/homework'

export default {
    name: 'HomeworkAssignment',
    data () {
        return {
            loading: false,
            submitting: false,
            assignmentList: [],
            templateList: [],
            classList: [],
            filters: {
                status: '',
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
                    title: '分配班级',
                    dataIndex: 'classNames',
                    key: 'classNames',
                    width: 200
                },
                {
                    title: '状态',
                    dataIndex: 'status',
                    key: 'status',
                    width: 100,
                    scopedSlots: { customRender: 'status' }
                },
                {
                    title: '提交进度',
                    key: 'progress',
                    width: 200,
                    scopedSlots: { customRender: 'progress' }
                },
                {
                    title: '截止时间',
                    dataIndex: 'deadline',
                    key: 'deadline',
                    width: 180
                },
                {
                    title: '操作',
                    key: 'action',
                    width: 280,
                    scopedSlots: { customRender: 'action' }
                }
            ],
            assignModalVisible: false,
            assignFormData: {
                templateId: undefined,
                classIds: [],
                publishTime: null,
                deadline: null,
                allowLateSubmit: false
            },
            assignRules: {
                templateId: [{ required: true, message: '请选择作业模板', trigger: 'change' }],
                classIds: [{ required: true, message: '请选择至少一个班级', trigger: 'change' }],
                deadline: [{ required: true, message: '请选择截止时间', trigger: 'change' }]
            },
            selectedTemplate: null
        }
    },
    mounted () {
        this.loadAssignmentList()
        this.loadTemplateList()
        this.loadClassList()

        // 如果从模板管理页面跳转过来，自动打开分配弹窗
        if (this.$route.query.templateId) {
            this.assignFormData.templateId = this.$route.query.templateId
            this.showAssignModal()
        }
    },
    methods: {
        async loadAssignmentList () {
            this.loading = true
            try {
                const params = {
                    pageNo: this.pagination.current,
                    pageSize: this.pagination.pageSize,
                    ...this.filters
                }
                const response = await getAssignmentList(params)
                if (response.success) {
                    this.assignmentList = response.result.records
                    this.pagination.total = response.result.total
                }
            } catch (error) {
                this.$message.error('加载作业列表失败')
            } finally {
                this.loading = false
            }
        },

        async loadTemplateList () {
            try {
                console.log('[作业分配-模板] 开始加载')
                const response = await getTemplateList({ pageNo: 1, pageSize: 100 })
                console.log('[作业分配-模板] 响应:', response)
                if (response && response.success) {
                    this.templateList = response.result.records || []
                    console.log('[作业分配-模板] 加载成功，数量:', this.templateList.length)
                }
            } catch (error) {
                console.error('[作业分配-模板] 加载失败:', error)
            }
        },

        async loadClassList () {
            try {
                console.log('[作业分配-班级] 开始加载')
                const response = await getClassList({ pageNo: 1, pageSize: 100 })
                console.log('[作业分配-班级] 响应:', response)
                if (response && response.success) {
                    this.classList = response.result.records || []
                    console.log('[作业分配-班级] 加载成功，数量:', this.classList.length)
                }
            } catch (error) {
                console.error('[作业分配-班级] 加载失败:', error)
            }
        },

        handleTableChange (pagination) {
            this.pagination.current = pagination.current
            this.pagination.pageSize = pagination.pageSize
            this.loadAssignmentList()
        },

        showAssignModal () {
            this.assignModalVisible = true
            if (this.assignFormData.templateId) {
                this.handleTemplateChange(this.assignFormData.templateId)
            }
        },

        handleTemplateChange (templateId) {
            this.selectedTemplate = this.templateList.find(t => t.id === templateId)
        },

        filterTemplate (input, option) {
            return option.componentOptions.children[0].text.toLowerCase().indexOf(input.toLowerCase()) >= 0
        },

        async handleAssign () {
            console.log('[作业分配] 开始验证表单')
            this.$refs.assignForm.validate(async valid => {
                console.log('[作业分配] 表单验证结果:', valid)
                if (valid) {
                    this.submitting = true
                    try {
                        const data = {
                            ...this.assignFormData,
                            publishTime: this.assignFormData.publishTime ? this.assignFormData.publishTime.format('YYYY-MM-DD HH:mm:ss') : null,
                            deadline: this.assignFormData.deadline ? this.assignFormData.deadline.format('YYYY-MM-DD HH:mm:ss') : null,
                            allowLateSubmit: this.assignFormData.allowLateSubmit ? 1 : 0
                        }
                        console.log('[作业分配] 提交数据:', data)
                        console.log('[作业分配] 模板ID:', data.templateId)
                        console.log('[作业分配] 班级IDs:', data.classIds)

                        const response = await assignHomework(data)
                        console.log('[作业分配] 响应结果:', response)

                        if (response && response.success) {
                            this.$message.success('作业分配成功')
                            this.assignModalVisible = false
                            this.loadAssignmentList()
                            this.resetAssignForm()
                        } else {
                            const errorMsg = (response && response.message) || '作业分配失败'
                            console.error('[作业分配] 失败:', errorMsg)
                            this.$message.error(errorMsg)
                        }
                    } catch (error) {
                        console.error('[作业分配] 异常:', error)
                        this.$message.error(error.message || '作业分配失败')
                    } finally {
                        this.submitting = false
                    }
                } else {
                    console.error('[作业分配] 表单验证失败')
                }
            })
        },

        handleCancelAssign () {
            this.assignModalVisible = false
            this.resetAssignForm()
        },

        resetAssignForm () {
            this.assignFormData = {
                templateId: undefined,
                classIds: [],
                publishTime: null,
                deadline: null,
                allowLateSubmit: false
            }
            this.selectedTemplate = null
        },

        viewSubmissions (record) {
            this.$router.push({
                path: '/admin/homework-submissions',
                query: { homeworkId: record.id }
            })
        },

        viewStatistics (record) {
            this.$router.push({
                path: '/admin/homework-statistics',
                query: { homeworkId: record.id }
            })
        },

        async cancelAssignment (record) {
            this.$confirm({
                title: '确认取消',
                content: `确定要取消作业"${record.homework_title}"的分配吗？`,
                onOk: async () => {
                    try {
                        const response = await cancelAssignment(record.id)
                        if (response.success) {
                            this.$message.success('取消成功')
                            this.loadAssignmentList()
                        }
                    } catch (error) {
                        this.$message.error(error.message || '取消失败')
                    }
                }
            })
        },

        getStatusColor (status) {
            const colors = {
                pending: 'orange',
                ongoing: 'blue',
                closed: 'default'
            }
            return colors[status] || 'default'
        },

        getStatusText (status) {
            const texts = {
                pending: '待发布',
                ongoing: '进行中',
                closed: '已截止'
            }
            return texts[status] || '未知'
        },

        getProgressPercent (record) {
            if (!record.total_students || record.total_students === 0) return 0
            return Math.round((record.submitted_count / record.total_students) * 100)
        },

        getProgressStatus (record) {
            const percent = this.getProgressPercent(record)
            if (percent === 100) return 'success'
            if (percent >= 80) return 'active'
            return 'normal'
        },

        getDifficultyText (difficulty) {
            const texts = ['', '简单', '较简单', '中等', '较难', '困难']
            return texts[difficulty] || '未知'
        }
    }
}
</script>

<style scoped lang="less">
.homework-assignment {
  .filter-section {
    margin-bottom: 16px;
  }
}
</style>
