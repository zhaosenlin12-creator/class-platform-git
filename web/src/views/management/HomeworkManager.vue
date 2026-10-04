<template>
  <div class="homework-manager">
    <a-card>
      <div slot="title">
        <a-icon type="file-text" />
        作业管理系统
      </div>
      <div slot="extra">
        <a-button-group>
          <a-button type="primary" @click="createHomework">
            <a-icon type="plus" />
            创建作业
          </a-button>
          <a-button @click="batchGrade">
            <a-icon type="check-circle" />
            批量评分
          </a-button>
          <a-button @click="exportGrades">
            <a-icon type="download" />
            导出成绩
          </a-button>
        </a-button-group>
      </div>

      <!-- 筛选条件 -->
      <div class="filter-section">
        <a-row :gutter="16">
          <a-col :span="5">
            <a-select v-model="filters.classId" placeholder="选择班级" style="width: 100%" @change="loadHomeworkList">
              <a-select-option value="">所有班级</a-select-option>
              <a-select-option v-for="cls in classList" :key="cls.id" :value="cls.id">
                {{ cls.name }}
              </a-select-option>
            </a-select>
          </a-col>
          <a-col :span="5">
            <a-select v-model="filters.status" placeholder="作业状态" style="width: 100%" @change="loadHomeworkList">
              <a-select-option value="">所有状态</a-select-option>
              <a-select-option value="draft">草稿</a-select-option>
              <a-select-option value="published">已发布</a-select-option>
              <a-select-option value="closed">已截止</a-select-option>
            </a-select>
          </a-col>
          <a-col :span="5">
            <a-select v-model="filters.type" placeholder="作业类型" style="width: 100%" @change="loadHomeworkList">
              <a-select-option value="">所有类型</a-select-option>
              <a-select-option value="scratch">Scratch</a-select-option>
              <a-select-option value="python">Python</a-select-option>
              <a-select-option value="javascript">JavaScript</a-select-option>
              <a-select-option value="theory">理论题</a-select-option>
            </a-select>
          </a-col>
          <a-col :span="5">
            <a-range-picker v-model="filters.dateRange" @change="loadHomeworkList" style="width: 100%" />
          </a-col>
          <a-col :span="4">
            <a-input-search
              v-model="filters.keyword"
              placeholder="搜索作业"
              @search="loadHomeworkList"
              style="width: 100%"
            />
          </a-col>
        </a-row>
      </div>

      <a-divider />

      <!-- 作业列表表格 -->
      <a-table
        :columns="homeworkColumns"
        :data-source="homeworkList"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
        :title="null"
      >
        <template slot="title" slot-scope="text, record">
          <div v-if="record" class="homework-title">
            <a-icon v-if="record.type" :type="getHomeworkIcon(record.type)" />
            <span>{{ text }}</span>
            <a-tag v-if="record.type" :color="getTypeColor(record.type)" size="small">{{ record.type }}</a-tag>
          </div>
          <div v-else>{{ text }}</div>
        </template>

        <template slot="status" slot-scope="text">
          <a-tag :color="getStatusColor(text)">
            {{ getStatusText(text) }}
          </a-tag>
        </template>

        <template slot="progress" slot-scope="text, record">
          <div v-if="record" class="submission-progress">
            <a-progress
              :percent="(record.submittedCount / record.totalStudents) * 100"
              size="small"
              :stroke-color="getProgressColor(record.submittedCount / record.totalStudents)"
            />
            <div class="progress-text">
              {{ record.submittedCount }}/{{ record.totalStudents }} 已提交
            </div>
          </div>
        </template>

        <template slot="deadline" slot-scope="text, record">
          <div v-if="record" :class="['deadline', { 'overdue': isOverdue(text) }]">
            {{ text }}
            <a-icon v-if="isOverdue(text)" type="clock-circle" style="color: #ff4d4f; margin-left: 4px" />
          </div>
          <div v-else>{{ text }}</div>
        </template>

        <template slot="action" slot-scope="text, record">
          <a-button-group v-if="record" size="small">
            <a-button @click="viewSubmissions(record)" type="link">
              <a-icon type="eye" />
              查看提交
            </a-button>
            <a-button @click="editHomework(record)" type="link">
              <a-icon type="edit" />
              编辑
            </a-button>
            <a-dropdown>
              <a-button type="link">
                更多 <a-icon type="down" />
              </a-button>
              <a-menu slot="overlay" @click="handleMoreAction($event, record)">
                <a-menu-item key="duplicate">复制作业</a-menu-item>
                <a-menu-item key="template">保存为模板</a-menu-item>
                <a-menu-item key="statistics">统计分析</a-menu-item>
                <a-menu-item key="delete">删除</a-menu-item>
              </a-menu>
            </a-dropdown>
          </a-button-group>
        </template>
      </a-table>
    </a-card>

    <!-- 创建/编辑作业模态框 -->
    <a-modal
      :title="editingHomework ? '编辑作业' : '创建作业'"
      :visible="homeworkModalVisible"
      @cancel="homeworkModalVisible = false"
      @ok="saveHomework"
      width="800px"
      :confirmLoading="saving"
    >
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="作业标题" required>
              <a-input v-model="homeworkForm.title" placeholder="请输入作业标题" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="作业类型" required>
              <a-select v-model="homeworkForm.type" placeholder="选择作业类型">
                <a-select-option value="scratch">Scratch编程</a-select-option>
                <a-select-option value="python">Python编程</a-select-option>
                <a-select-option value="javascript">JavaScript编程</a-select-option>
                <a-select-option value="theory">理论题</a-select-option>
                <a-select-option value="project">项目作业</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="目标班级" required>
              <a-select v-model="homeworkForm.classIds" mode="multiple" placeholder="选择班级">
                <a-select-option v-for="cls in classList" :key="cls.id" :value="cls.id">
                  {{ cls.name }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="难度等级">
              <a-select v-model="homeworkForm.difficulty" placeholder="选择难度">
                <a-select-option value="easy">简单</a-select-option>
                <a-select-option value="medium">中等</a-select-option>
                <a-select-option value="hard">困难</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="作业描述" required>
          <a-textarea
            v-model="homeworkForm.description"
            placeholder="请输入详细的作业要求和说明"
            :rows="4"
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="发布时间">
              <a-date-picker
                v-model="homeworkForm.publishTime"
                show-time
                format="YYYY-MM-DD HH:mm"
                placeholder="选择发布时间"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="截止时间" required>
              <a-date-picker
                v-model="homeworkForm.deadline"
                show-time
                format="YYYY-MM-DD HH:mm"
                placeholder="选择截止时间"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="评分标准">
          <a-textarea
            v-model="homeworkForm.gradingCriteria"
            placeholder="请输入评分标准和评分要点"
            :rows="3"
          />
        </a-form-item>

        <a-form-item label="参考资料">
          <a-upload
            v-model="homeworkForm.attachments"
            :file-list="homeworkForm.attachments"
            :before-upload="beforeUpload"
            @remove="removeAttachment"
            multiple
          >
            <a-button>
              <a-icon type="upload" />
              上传附件
            </a-button>
          </a-upload>
        </a-form-item>

        <a-form-item label="提交设置">
          <a-checkbox-group v-model="homeworkForm.submissionSettings">
            <a-checkbox value="allow_late">允许迟交</a-checkbox>
            <a-checkbox value="allow_resubmit">允许重新提交</a-checkbox>
            <a-checkbox value="auto_grade">启用自动评分</a-checkbox>
            <a-checkbox value="peer_review">启用同伴评审</a-checkbox>
          </a-checkbox-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 查看提交模态框 -->
    <a-modal
      title="作业提交情况"
      :visible="submissionsVisible"
      @cancel="submissionsVisible = false"
      width="1200px"
      :footer="null"
    >
      <div v-if="selectedHomework" class="submissions-content">
        <!-- 提交统计 -->
        <div class="submission-stats">
          <a-row :gutter="16">
            <a-col :span="6">
              <a-statistic title="总学员数" :value="selectedHomework.totalStudents" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="已提交" :value="selectedHomework.submittedCount" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="未提交" :value="selectedHomework.totalStudents - selectedHomework.submittedCount" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="平均分" :value="selectedHomework.averageScore" :precision="1" />
            </a-col>
          </a-row>
        </div>

        <a-divider />

        <!-- 提交列表 -->
        <a-table
          :columns="submissionColumns"
          :data-source="submissions"
          :pagination="false"
          row-key="id"
        >
          <template slot="student" slot-scope="text, record">
            <div v-if="record" class="student-info">
              <a-avatar :src="record.avatar" size="small" />
              <span style="margin-left: 8px">{{ record.studentName }}</span>
            </div>
          </template>

          <template slot="status" slot-scope="text">
            <a-tag :color="getSubmissionStatusColor(text)">
              {{ getSubmissionStatusText(text) }}
            </a-tag>
          </template>

          <template slot="score" slot-scope="text, record">
            <div v-if="record && (record.status === 'submitted' || record.status === 'graded')">
              <a-input-number
                v-if="record.grading"
                v-model="record.score"
                :min="0"
                :max="100"
                size="small"
                @blur="saveScore(record)"
              />
              <span v-else @click="record.grading = true" class="score-display">
                {{ text || '未评分' }}
              </span>
            </div>
            <span v-else style="color: #999">-</span>
          </template>

          <template slot="feedback" slot-scope="text, record">
            <div v-if="record && (record.status === 'submitted' || record.status === 'graded')">
              <a-input
                v-if="record.feedbackEditing"
                v-model="record.feedback"
                size="small"
                @blur="saveFeedback(record)"
                @pressEnter="saveFeedback(record)"
              />
              <span v-else @click="record.feedbackEditing = true" class="feedback-display">
                {{ record.feedback || '点击添加反馈' }}
              </span>
            </div>
          </template>

          <template slot="action" slot-scope="text, record">
            <a-button-group v-if="record" size="small">
              <a-button @click="viewSubmission(record)" type="link">
                <a-icon type="eye" />
                查看
              </a-button>
              <a-button @click="downloadSubmission(record)" type="link">
                <a-icon type="download" />
                下载
              </a-button>
              <a-button @click="giveDetailedFeedback(record)" type="link">
                <a-icon type="message" />
                详细反馈
              </a-button>
            </a-button-group>
          </template>
        </a-table>
      </div>
    </a-modal>

    <!-- 批量评分模态框 -->
    <a-modal
      title="批量评分"
      :visible="batchGradeVisible"
      @cancel="batchGradeVisible = false"
      @ok="confirmBatchGrade"
      width="600px"
    >
      <a-form layout="vertical">
        <a-form-item label="选择作业">
          <a-select v-model="batchGradeForm.homeworkId" placeholder="选择要批量评分的作业">
            <a-select-option v-for="hw in homeworkList" :key="hw.id" :value="hw.id">
              {{ hw.title }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="评分规则">
          <a-radio-group v-model="batchGradeForm.rule">
            <a-radio value="auto">自动评分（基于预设标准）</a-radio>
            <a-radio value="uniform">统一分数</a-radio>
            <a-radio value="random">随机分数范围</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="batchGradeForm.rule === 'uniform'" label="统一分数">
          <a-input-number v-model="batchGradeForm.uniformScore" :min="0" :max="100" />
        </a-form-item>
        <a-form-item v-if="batchGradeForm.rule === 'random'" label="分数范围">
          <a-slider
            v-model="batchGradeForm.scoreRange"
            range
            :min="0"
            :max="100"
            :marks="{ 0: '0分', 60: '60分', 80: '80分', 100: '100分' }"
          />
        </a-form-item>
        <a-form-item label="批量反馈">
          <a-textarea
            v-model="batchGradeForm.feedback"
            placeholder="输入统一的评价反馈"
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import moment from 'moment'

export default {
    name: 'HomeworkManager',
    data () {
        return {
            loading: false,
            saving: false,
            homeworkModalVisible: false,
            submissionsVisible: false,
            batchGradeVisible: false,
            editingHomework: null,
            selectedHomework: null,

            filters: {
                classId: '',
                status: '',
                type: '',
                dateRange: [],
                keyword: ''
            },

            classList: [],
            homeworkList: [],
            submissions: [],

            pagination: {
                current: 1,
                pageSize: 10,
                total: 0,
                showSizeChanger: true,
                showQuickJumper: true
            },

            homeworkColumns: [
                {
                    title: '作业标题',
                    dataIndex: 'title',
                    key: 'title',
                    width: 250,
                    scopedSlots: { customRender: 'title' }
                },
                {
                    title: '目标班级',
                    dataIndex: 'className',
                    key: 'className',
                    width: 150
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
                    dataIndex: 'progress',
                    key: 'progress',
                    width: 150,
                    scopedSlots: { customRender: 'progress' }
                },
                {
                    title: '截止时间',
                    dataIndex: 'deadline',
                    key: 'deadline',
                    width: 120,
                    scopedSlots: { customRender: 'deadline' }
                },
                {
                    title: '创建时间',
                    dataIndex: 'createTime',
                    key: 'createTime',
                    width: 100
                },
                {
                    title: '操作',
                    key: 'action',
                    width: 200,
                    scopedSlots: { customRender: 'action' }
                }
            ],

            submissionColumns: [
                {
                    title: '学员',
                    dataIndex: 'student',
                    key: 'student',
                    scopedSlots: { customRender: 'student' }
                },
                {
                    title: '提交状态',
                    dataIndex: 'status',
                    key: 'status',
                    scopedSlots: { customRender: 'status' }
                },
                {
                    title: '提交时间',
                    dataIndex: 'submitTime',
                    key: 'submitTime'
                },
                {
                    title: '评分',
                    dataIndex: 'score',
                    key: 'score',
                    scopedSlots: { customRender: 'score' }
                },
                {
                    title: '反馈',
                    dataIndex: 'feedback',
                    key: 'feedback',
                    scopedSlots: { customRender: 'feedback' }
                },
                {
                    title: '操作',
                    key: 'action',
                    scopedSlots: { customRender: 'action' }
                }
            ],

            homeworkForm: {
                title: '',
                type: '',
                classIds: [],
                difficulty: '',
                description: '',
                publishTime: null,
                deadline: null,
                gradingCriteria: '',
                attachments: [],
                submissionSettings: []
            },

            batchGradeForm: {
                homeworkId: '',
                rule: 'auto',
                uniformScore: 80,
                scoreRange: [70, 90],
                feedback: ''
            }
        }
    },

    mounted () {
        this.loadClassList()
        this.loadHomeworkList()
    },

    methods: {
        async loadClassList () {
            try {
                const response = await this.$http.get('/class/list')
                if (response && response.success) {
                    this.classList = response.result.records || []
                }
            } catch (error) {
                // 加载失败，忽略
            }
        },

        async loadHomeworkList () {
            this.loading = true
            try {
                const params = {
                    pageNo: this.pagination.current,
                    pageSize: this.pagination.pageSize,
                    ...this.filters
                }

                const response = await this.$http.get('/homework/list', { params })

                const data = response.data || response

                if (data && (data.success || Number(data.code) === 200)) {
                    const result = data.result || {}
                    let records = result.records || result || []

                    // 转换字段名以匹配前端显示
                    this.homeworkList = Array.isArray(records) ? records.map(hw => ({
                        id: hw.id,
                        title: hw.homework_title || hw.title,
                        type: hw.homework_type || hw.type,
                        className: hw.classNames || hw.class_name || hw.className || '未分配班级',
                        status: hw.status || 'published',
                        submittedCount: hw.submitted_count || 0,
                        totalStudents: hw.total_students || 0,
                        averageScore: hw.average_score || 0,
                        deadline: hw.deadline,
                        createTime: hw.create_time || hw.createTime
                    })).filter(item => item && item.id) : []

                    this.pagination.total = result.total || this.homeworkList.length
                } else {
                    this.homeworkList = []
                    this.pagination.total = 0
                }
            } catch (error) {
                this.$message.error('加载作业列表失败: ' + (error.message || '未知错误'))
                this.homeworkList = []
                this.pagination.total = 0
            } finally {
                this.loading = false
            }
        },

        getMockHomeworkData () {
            return [
                {
                    id: 'hw_001',
                    title: '制作小猫追球游戏',
                    type: 'scratch',
                    className: '2024春季JavaScript班',
                    status: 'published',
                    submittedCount: 18,
                    totalStudents: 25,
                    averageScore: 85.5,
                    deadline: '2024-01-25 23:59',
                    createTime: '2024-01-15'
                },
                {
                    id: 'hw_002',
                    title: 'Python变量和运算',
                    type: 'python',
                    className: '2024春季JavaScript班',
                    status: 'published',
                    submittedCount: 22,
                    totalStudents: 25,
                    averageScore: 88.2,
                    deadline: '2024-01-30 23:59',
                    createTime: '2024-01-20'
                }
            ]
        },

        handleTableChange (pagination, filters, sorter) {
            this.pagination.current = pagination.current
            this.pagination.pageSize = pagination.pageSize
            this.loadHomeworkList()
        },

        createHomework () {
            this.editingHomework = null
            this.homeworkForm = {
                title: '',
                type: '',
                classIds: [],
                difficulty: '',
                description: '',
                publishTime: null,
                deadline: null,
                gradingCriteria: '',
                attachments: [],
                submissionSettings: []
            }
            this.homeworkModalVisible = true
        },

        editHomework (homework) {
            this.editingHomework = homework
            this.homeworkForm = {
                ...homework,
                publishTime: homework.publishTime ? moment(homework.publishTime) : null,
                deadline: homework.deadline ? moment(homework.deadline) : null
            }
            this.homeworkModalVisible = true
        },

        async saveHomework () {
            if (!this.homeworkForm.title || !this.homeworkForm.type || !this.homeworkForm.classIds.length) {
                this.$message.error('请填写必填字段：标题、类型、班级')
                return
            }

            this.saving = true
            try {
                // 转换前端字段名到后端字段名
                // 难度映射：easy->1, medium->2, hard->3
                let difficultyValue = 1
                if (this.homeworkForm.difficulty) {
                    const diffMap = { 'easy': 1, 'medium': 2, 'hard': 3 }
                    difficultyValue = diffMap[this.homeworkForm.difficulty] || parseInt(this.homeworkForm.difficulty) || 1
                }

                const formattedData = {
                    homeworkTitle: this.homeworkForm.title,
                    homeworkType: this.homeworkForm.type,
                    difficulty: difficultyValue,
                    classIds: this.homeworkForm.classIds,
                    description: this.homeworkForm.description,
                    requirements: this.homeworkForm.gradingCriteria,
                    attachments: this.homeworkForm.attachments,
                    totalScore: parseInt(this.homeworkForm.totalScore) || 100,
                    passScore: parseInt(this.homeworkForm.passScore) || 60,
                    publishTime: this.homeworkForm.publishTime && this.homeworkForm.publishTime.format
                        ? this.homeworkForm.publishTime.format('YYYY-MM-DD HH:mm:ss')
                        : null,
                    deadline: this.homeworkForm.deadline && this.homeworkForm.deadline.format
                        ? this.homeworkForm.deadline.format('YYYY-MM-DD HH:mm:ss')
                        : this.homeworkForm.deadline || null,
                    allowLateSubmit: this.homeworkForm.allowLateSubmit ? 1 : 0
                }

                // 编辑时需要包含作业ID
                if (this.editingHomework) {
                    formattedData.id = this.editingHomework.id
                }

                const url = this.editingHomework ? `/homework/update` : '/homework/create'
                const method = 'post'

                const response = await this.$http[method](url, formattedData)

                if (response.success || Number(response.code) === 200) {
                    this.$message.success(this.editingHomework ? '作业更新成功' : '作业创建成功')
                    this.homeworkModalVisible = false
                    this.saving = false

                    // 强制刷新列表
                    await this.loadHomeworkList()
                } else {
                    throw new Error(response.message || '保存失败')
                }
            } catch (error) {
                this.$message.error('保存失败: ' + (error.message || error.toString()))
                this.saving = false
            }
        },

        viewSubmissions (homework) {
            this.selectedHomework = homework
            this.loadSubmissions(homework.id)
            this.submissionsVisible = true
        },

        async loadSubmissions (homeworkId) {
            try {
                const response = await this.$http.get(`/homework/${homeworkId}/submissions`)
                if (response && response.success) {
                    const result = response.result || []
                    // 确保result是数组
                    const submissionList = Array.isArray(result) ? result : (result.records || result.list || [])
                    this.submissions = submissionList.filter(item => item && item.id)
                } else {
                    this.submissions = this.getMockSubmissions()
                }
            } catch (error) {
                this.submissions = this.getMockSubmissions()
            }
        },

        getMockSubmissions () {
            return [
                {
                    id: 'sub_001',
                    studentName: '张小明',
                    avatar: '/avatars/student001.jpg',
                    status: 'graded',
                    submitTime: '2024-01-24 15:30',
                    score: 92,
                    feedback: '程序逻辑清晰，UI设计美观',
                    grading: false,
                    feedbackEditing: false
                },
                {
                    id: 'sub_002',
                    studentName: '李小红',
                    avatar: '/avatars/student002.jpg',
                    status: 'submitted',
                    submitTime: '2024-01-25 10:15',
                    score: null,
                    feedback: '',
                    grading: false,
                    feedbackEditing: false
                }
            ]
        },

        async saveScore (record) {
            record.grading = false
            try {
                await this.$http.put(`/homework/submission/${record.id}/score`, {
                    score: record.score
                })
                this.$message.success('评分已保存')
            } catch (error) {
                this.$message.error('保存评分失败')
            }
        },

        async saveFeedback (record) {
            record.feedbackEditing = false
            try {
                await this.$http.put(`/homework/submission/${record.id}/feedback`, {
                    feedback: record.feedback
                })
                this.$message.success('反馈已保存')
            } catch (error) {
                this.$message.error('保存反馈失败')
            }
        },

        viewSubmission (record) {
            this.$message.info(`查看 ${record.studentName} 的提交`)
        },

        downloadSubmission (record) {
            this.$message.info(`下载 ${record.studentName} 的作业文件`)
        },

        giveDetailedFeedback (record) {
            this.$message.info(`为 ${record.studentName} 提供详细反馈`)
        },

        batchGrade () {
            this.batchGradeVisible = true
        },

        async confirmBatchGrade () {
            if (!this.batchGradeForm.homeworkId) {
                this.$message.error('请选择作业')
                return
            }

            try {
                await this.$http.post('/homework/batch-grade', this.batchGradeForm)
                this.$message.success('批量评分完成')
                this.batchGradeVisible = false
                this.loadSubmissions(this.batchGradeForm.homeworkId)
            } catch (error) {
                this.$message.error('批量评分失败')
            }
        },

        exportGrades () {
            this.$message.info('导出成绩功能开发中...')
        },

        handleMoreAction (e, record) {
            const action = e.key
            switch (action) {
            case 'duplicate':
                this.duplicateHomework(record)
                break
            case 'template':
                this.saveAsTemplate(record)
                break
            case 'statistics':
                this.viewStatistics(record)
                break
            case 'delete':
                this.deleteHomework(record)
                break
            }
        },

        duplicateHomework (homework) {
            this.$message.info(`复制作业: ${homework.title}`)
        },

        saveAsTemplate (homework) {
            this.$message.info(`保存为模板: ${homework.title}`)
        },

        viewStatistics (homework) {
            this.$message.info(`查看统计: ${homework.title}`)
        },

        deleteHomework (homework) {
            this.$confirm({
                title: '确认删除',
                content: `确定要删除作业"${homework.title}"吗？`,
                onOk: async () => {
                    try {
                        await this.$http.delete(`/homework/${homework.id}`)
                        this.$message.success('作业删除成功')
                        this.loadHomeworkList()
                    } catch (error) {
                        this.$message.error('删除失败')
                    }
                }
            })
        },

        async beforeUpload (file) {
            // 立即上传文件
            const formData = new FormData()
            formData.append('file', file)

            try {
                const response = await this.$http.post('/teaching/course/resources/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                })

                if (response.success || Number(response.code) === 200) {
                    const uploadedFile = response.result || response.data

                    // 将上传成功的文件信息添加到attachments
                    this.homeworkForm.attachments.push({
                        uid: file.uid,
                        name: file.name,
                        url: uploadedFile.url || uploadedFile.path,
                        fileId: uploadedFile.id,
                        status: 'done'
                    })

                    this.$message.success(`${file.name} 上传成功`)
                } else {
                    throw new Error(response.message || '上传失败')
                }
            } catch (error) {
                this.$message.error(`${file.name} 上传失败: ${error.message}`)
            }

            return false // 阻止a-upload组件的默认上传行为
        },

        removeAttachment (file) {
            this.homeworkForm.attachments = this.homeworkForm.attachments.filter(f => f.uid !== file.uid)
        },

        getHomeworkIcon (type) {
            const icons = {
                scratch: 'build',
                python: 'code',
                javascript: 'thunderbolt',
                theory: 'book',
                project: 'project'
            }
            return icons[type] || 'file'
        },

        getTypeColor (type) {
            const colors = {
                scratch: 'orange',
                python: 'blue',
                javascript: 'gold',
                theory: 'green',
                project: 'purple'
            }
            return colors[type] || 'default'
        },

        getStatusColor (status) {
            const colors = {
                draft: 'default',
                published: 'blue',
                closed: 'red'
            }
            return colors[status] || 'default'
        },

        getStatusText (status) {
            const texts = {
                draft: '草稿',
                published: '已发布',
                closed: '已截止'
            }
            return texts[status] || status
        },

        getProgressColor (rate) {
            if (rate >= 0.8) return '#52c41a'
            if (rate >= 0.6) return '#1890ff'
            if (rate >= 0.4) return '#fa8c16'
            return '#ff4d4f'
        },

        getSubmissionStatusColor (status) {
            const colors = {
                submitted: 'blue',
                graded: 'green',
                late: 'orange',
                missing: 'red'
            }
            return colors[status] || 'default'
        },

        getSubmissionStatusText (status) {
            const texts = {
                submitted: '已提交',
                graded: '已评分',
                late: '迟交',
                missing: '未提交'
            }
            return texts[status] || status
        },

        isOverdue (deadline) {
            return new Date(deadline) < new Date()
        }
    }
}
</script>

<style scoped lang="less">
.homework-manager {
  /* 强制隐藏表格标题区域（防止JSON显示） */
  ::v-deep .ant-table-title {
    display: none !important;
  }

  .filter-section {
    margin-bottom: 24px;
  }

  .homework-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .submission-progress {
    .progress-text {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
  }

  .deadline {
    &.overdue {
      color: #ff4d4f;
    }
  }

  .submissions-content {
    .submission-stats {
      background: #fafafa;
      padding: 16px;
      border-radius: 4px;
      margin-bottom: 16px;
    }

    .student-info {
      display: flex;
      align-items: center;
    }

    .score-display,
    .feedback-display {
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      background: #f5f5f5;

      &:hover {
        background: #e6f7ff;
      }
    }

    .feedback-display {
      color: #666;
      font-style: italic;
    }
  }
}
</style>
