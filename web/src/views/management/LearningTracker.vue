<template>
  <div class="learning-tracker">
    <a-card>
      <div slot="title">
        <a-icon type="bar-chart" />
        学习跟踪系统
      </div>
      <div slot="extra">
        <a-button-group>
          <a-button @click="exportReport">
            <a-icon type="download" />
            导出报告
          </a-button>
          <a-button @click="refreshData">
            <a-icon type="reload" />
            刷新数据
          </a-button>
        </a-button-group>
      </div>

      <!-- 筛选条件 -->
      <div class="filter-section">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-select v-model="filters.classId" placeholder="选择班级" style="width: 100%" @change="loadStudentProgress">
              <a-select-option value="">所有班级</a-select-option>
              <a-select-option v-for="cls in classList" :key="cls.id" :value="cls.id">
                {{ cls.name }}
              </a-select-option>
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-select v-model="filters.courseId" placeholder="选择课程" style="width: 100%" @change="loadStudentProgress">
              <a-select-option value="">所有课程</a-select-option>
              <a-select-option v-for="course in courseList" :key="course.id" :value="course.id">
                {{ course.name }}
              </a-select-option>
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-range-picker v-model="filters.dateRange" @change="loadStudentProgress" style="width: 100%" />
          </a-col>
          <a-col :span="6">
            <a-input-search
              v-model="filters.keyword"
              placeholder="搜索学员姓名"
              @search="loadStudentProgress"
              style="width: 100%"
            />
          </a-col>
        </a-row>
      </div>

      <a-divider />

      <!-- 统计概览 -->
      <div class="overview-section">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-card size="small">
              <a-statistic
                title="总学员数"
                :value="statistics.totalStudents"
                :value-style="{ color: '#1890ff' }"
              >
                <template #prefix>
                  <a-icon type="user" />
                </template>
              </a-statistic>
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card size="small">
              <a-statistic
                title="平均出勤率"
                :value="statistics.avgAttendance"
                suffix="%"
                :precision="1"
                :value-style="{ color: '#52c41a' }"
              >
                <template #prefix>
                  <a-icon type="calendar" />
                </template>
              </a-statistic>
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card size="small">
              <a-statistic
                title="平均成绩"
                :value="statistics.avgScore"
                :precision="1"
                :value-style="{ color: '#722ed1' }"
              >
                <template #prefix>
                  <a-icon type="trophy" />
                </template>
              </a-statistic>
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card size="small">
              <a-statistic
                title="作业完成率"
                :value="statistics.homeworkRate"
                suffix="%"
                :precision="1"
                :value-style="{ color: '#fa8c16' }"
              >
                <template #prefix>
                  <a-icon type="file-done" />
                </template>
              </a-statistic>
            </a-card>
          </a-col>
        </a-row>
      </div>

      <a-divider />

      <!-- 学员进度表格 -->
      <div class="progress-table-section">
        <a-table
          :columns="progressColumns"
          :data-source="studentProgress"
          :loading="loading"
          :pagination="pagination"
          @change="handleTableChange"
          row-key="studentId"
        >
          <template #studentInfo="{ text, record }">
            <div class="student-info">
              <a-avatar :src="record.avatar" :alt="record.realname" />
              <div class="info">
                <div class="name">{{ record.realname }}</div>
                <div class="number">{{ record.studentNo }}</div>
              </div>
            </div>
          </template>

          <template #attendance="{ text }">
            <a-progress
              :percent="text * 100"
              :stroke-color="getAttendanceColor(text)"
              size="small"
            />
            <span>{{ (text * 100).toFixed(1) }}%</span>
          </template>

          <template #score="{ text }">
            <a-tag :color="getScoreColor(text)">{{ text.toFixed(1) }}</a-tag>
          </template>

          <template #progress="{ text, record }">
            <div class="progress-detail">
              <a-progress
                :percent="(record.completedLessons / record.totalLessons) * 100"
                size="small"
                :stroke-color="getProgressColor(record.completedLessons / record.totalLessons)"
              />
              <div class="progress-text">
                {{ record.completedLessons }}/{{ record.totalLessons }} 课时
              </div>
            </div>
          </template>

          <template #homework="{ text, record }">
            <div class="homework-stats">
              <div>已提交: {{ record.submittedHomework }}</div>
              <div>总数: {{ record.totalHomework }}</div>
              <a-progress
                :percent="(record.submittedHomework / record.totalHomework) * 100"
                size="small"
                :stroke-color="getHomeworkColor(record.submittedHomework / record.totalHomework)"
              />
            </div>
          </template>

          <template #action="{ record }">
            <a-button-group size="small">
              <a-button @click="viewStudentDetail(record)" type="link">
                <a-icon type="eye" />
                详情
              </a-button>
              <a-button @click="viewLearningPath(record)" type="link">
                <a-icon type="project" />
                学习路径
              </a-button>
              <a-button @click="sendReminder(record)" type="link">
                <a-icon type="bell" />
                提醒
              </a-button>
            </a-button-group>
          </template>
        </a-table>
      </div>
    </a-card>

    <!-- 学员详情模态框 -->
    <a-modal
      title="学员学习详情"
      :visible="detailVisible"
      @cancel="detailVisible = false"
      width="1200px"
      :footer="null"
    >
      <div v-if="selectedStudent" class="student-detail">
        <!-- 学员基本信息 -->
        <a-card size="small" title="基本信息" class="info-card">
          <a-row :gutter="16">
            <a-col :span="6">
              <div class="avatar-section">
                <a-avatar :size="64" :src="selectedStudent.avatar" />
                <div class="student-name">{{ selectedStudent.realname }}</div>
                <div class="student-number">{{ selectedStudent.studentNo }}</div>
              </div>
            </a-col>
            <a-col :span="18">
              <a-descriptions :column="3" size="small">
                <a-descriptions-item label="班级">{{ selectedStudent.className }}</a-descriptions-item>
                <a-descriptions-item label="入学时间">{{ selectedStudent.enrollDate }}</a-descriptions-item>
                <a-descriptions-item label="学习状态">
                  <a-tag :color="selectedStudent.status === 'active' ? 'green' : 'red'">
                    {{ selectedStudent.status === 'active' ? '在读' : '休学' }}
                  </a-tag>
                </a-descriptions-item>
                <a-descriptions-item label="出勤率">{{ (selectedStudent.attendance * 100).toFixed(1) }}%</a-descriptions-item>
                <a-descriptions-item label="平均成绩">{{ selectedStudent.averageScore.toFixed(1) }}</a-descriptions-item>
                <a-descriptions-item label="学习时长">{{ selectedStudent.studyHours }}小时</a-descriptions-item>
              </a-descriptions>
            </a-col>
          </a-row>
        </a-card>

        <!-- 学习进度图表 -->
        <a-card size="small" title="学习进度趋势" class="chart-card">
          <div id="progressChart" style="height: 300px;"></div>
        </a-card>

        <!-- 成绩分析 -->
        <a-card size="small" title="成绩分析" class="chart-card">
          <div id="scoreChart" style="height: 300px;"></div>
        </a-card>

        <!-- 最近作业记录 -->
        <a-card size="small" title="最近作业记录" class="homework-card">
          <a-table
            :columns="homeworkColumns"
            :data-source="selectedStudent.recentHomework"
            :pagination="false"
            size="small"
          >
            <template #status="{ text }">
              <a-tag :color="text === 'submitted' ? 'green' : text === 'late' ? 'orange' : 'red'">
                {{ text === 'submitted' ? '已提交' : text === 'late' ? '迟交' : '未提交' }}
              </a-tag>
            </template>
            <template #score="{ text }">
              <span v-if="text">{{ text }}/100</span>
              <span v-else style="color: #999">未评分</span>
            </template>
          </a-table>
        </a-card>

        <!-- 学习建议 -->
        <a-card size="small" title="学习建议" class="suggestion-card">
          <a-list
            :data-source="selectedStudent.suggestions"
            size="small"
          >
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta>
                  <template #avatar>
                    <a-icon
                      :type="item.type === 'warning' ? 'warning' : 'bulb'"
                      :style="{ color: item.type === 'warning' ? '#fa8c16' : '#52c41a' }" />
                  </template>
                  <template #title>
                    {{ item.title }}
                  </template>
                  <template #description>
                    {{ item.description }}
                  </template>
                </a-list-item-meta>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </div>
    </a-modal>

    <!-- 学习路径模态框 -->
    <a-modal
      title="学习路径"
      :visible="pathVisible"
      @cancel="pathVisible = false"
      width="900px"
      :footer="null"
    >
      <div v-if="selectedStudent" class="learning-path">
        <a-steps direction="vertical" :current="selectedStudent.currentStep || 0">
          <a-step
            v-for="(step, index) in learningSteps"
            :key="index"
            :title="step.title"
            :description="step.description"
            :status="step.status"
          >
            <template #icon>
              <a-icon :type="step.icon" />
            </template>
            <div slot="description">
              <div>{{ step.description }}</div>
              <div class="step-progress">
                <a-progress
                  :percent="step.progress"
                  size="small"
                  :status="step.status === 'error' ? 'exception' : 'normal'"
                />
              </div>
              <div class="step-time">
                预计完成时间: {{ step.estimatedTime }}
              </div>
            </div>
          </a-step>
        </a-steps>
      </div>
    </a-modal>

    <!-- 发送提醒模态框 -->
    <a-modal
      title="发送学习提醒"
      :visible="reminderVisible"
      @cancel="reminderVisible = false"
      @ok="sendReminderMessage"
      width="500px"
    >
      <a-form layout="vertical">
        <a-form-item label="提醒类型">
          <a-select v-model="reminderForm.type" placeholder="选择提醒类型">
            <a-select-option value="attendance">出勤提醒</a-select-option>
            <a-select-option value="homework">作业提醒</a-select-option>
            <a-select-option value="progress">进度提醒</a-select-option>
            <a-select-option value="encouragement">鼓励消息</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="提醒内容">
          <a-textarea
            v-model="reminderForm.message"
            placeholder="请输入提醒内容"
            :rows="4"
          />
        </a-form-item>
        <a-form-item label="发送方式">
          <a-checkbox-group v-model="reminderForm.methods">
            <a-checkbox value="system">系统消息</a-checkbox>
            <a-checkbox value="email">邮箱</a-checkbox>
            <a-checkbox value="sms">短信</a-checkbox>
            <a-checkbox value="wechat">微信</a-checkbox>
          </a-checkbox-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
export default {
    name: 'LearningTracker',
    data () {
        return {
            loading: false,
            detailVisible: false,
            pathVisible: false,
            reminderVisible: false,
            selectedStudent: null,

            filters: {
                classId: '',
                courseId: '',
                dateRange: [],
                keyword: ''
            },

            statistics: {
                totalStudents: 0,
                avgAttendance: 0,
                avgScore: 0,
                homeworkRate: 0
            },

            classList: [],
            courseList: [],
            studentProgress: [],

            pagination: {
                current: 1,
                pageSize: 10,
                total: 0,
                showSizeChanger: true,
                showQuickJumper: true
            },

            progressColumns: [
                {
                    title: '学员信息',
                    dataIndex: 'studentInfo',
                    key: 'studentInfo',
                    width: 200,
                    slots: { customRender: 'studentInfo' }
                },
                {
                    title: '班级',
                    dataIndex: 'className',
                    key: 'className',
                    width: 120
                },
                {
                    title: '出勤率',
                    dataIndex: 'attendance',
                    key: 'attendance',
                    width: 120,
                    slots: { customRender: 'attendance' },
                    sorter: (a, b) => a.attendance - b.attendance
                },
                {
                    title: '平均成绩',
                    dataIndex: 'averageScore',
                    key: 'averageScore',
                    width: 100,
                    slots: { customRender: 'score' },
                    sorter: (a, b) => a.averageScore - b.averageScore
                },
                {
                    title: '学习进度',
                    dataIndex: 'progress',
                    key: 'progress',
                    width: 150,
                    slots: { customRender: 'progress' }
                },
                {
                    title: '作业情况',
                    dataIndex: 'homework',
                    key: 'homework',
                    width: 130,
                    slots: { customRender: 'homework' }
                },
                {
                    title: '最后活跃',
                    dataIndex: 'lastActive',
                    key: 'lastActive',
                    width: 120
                },
                {
                    title: '操作',
                    key: 'action',
                    width: 180,
                    slots: { customRender: 'action' }
                }
            ],

            homeworkColumns: [
                {
                    title: '作业名称',
                    dataIndex: 'title',
                    key: 'title'
                },
                {
                    title: '截止时间',
                    dataIndex: 'deadline',
                    key: 'deadline'
                },
                {
                    title: '提交状态',
                    dataIndex: 'status',
                    key: 'status',
                    slots: { customRender: 'status' }
                },
                {
                    title: '成绩',
                    dataIndex: 'score',
                    key: 'score',
                    slots: { customRender: 'score' }
                }
            ],

            learningSteps: [
                {
                    title: 'Scratch基础',
                    description: '学习图形化编程基础概念',
                    icon: 'build',
                    status: 'finish',
                    progress: 100,
                    estimatedTime: '2周'
                },
                {
                    title: 'Scratch进阶',
                    description: '制作复杂的互动程序',
                    icon: 'rocket',
                    status: 'process',
                    progress: 60,
                    estimatedTime: '3周'
                },
                {
                    title: 'Python入门',
                    description: '学习文本编程语言',
                    icon: 'code',
                    status: 'wait',
                    progress: 0,
                    estimatedTime: '4周'
                },
                {
                    title: 'Web开发',
                    description: '制作网页和Web应用',
                    icon: 'global',
                    status: 'wait',
                    progress: 0,
                    estimatedTime: '6周'
                }
            ],

            reminderForm: {
                type: '',
                message: '',
                methods: []
            }
        }
    },

    mounted () {
        this.loadClassList()
        this.loadCourseList()
        this.loadStudentProgress()
        this.loadStatistics()
    },

    methods: {
        async loadClassList () {
            try {
                const response = await this.$http.get('/class/list')
                if (response && response.success) {
                    this.classList = response.result.records || []
                }
            } catch (error) {
                console.error('加载班级列表失败:', error)
            }
        },

        async loadCourseList () {
            try {
                const response = await this.$http.get('/course/list')
                if (response && response.success) {
                    this.courseList = response.result.records || []
                }
            } catch (error) {
                console.error('加载课程列表失败:', error)
            }
        },

        async loadStudentProgress () {
            this.loading = true
            try {
                const params = {
                    pageNo: this.pagination.current,
                    pageSize: this.pagination.pageSize,
                    ...this.filters
                }

                const response = await this.$http.get('/learning/progress', { params })
                if (response && response.success) {
                    this.studentProgress = response.result.records || this.getMockProgressData()
                    this.pagination.total = response.result.total || this.studentProgress.length
                } else {
                    this.studentProgress = this.getMockProgressData()
                    this.pagination.total = this.studentProgress.length
                }
            } catch (error) {
                console.error('加载学习进度失败:', error)
                this.studentProgress = this.getMockProgressData()
                this.pagination.total = this.studentProgress.length
            } finally {
                this.loading = false
            }
        },

        async loadStatistics () {
            try {
                const response = await this.$http.get('/learning/statistics', {
                    params: this.filters
                })
                if (response && response.success) {
                    this.statistics = response.result
                } else {
                    this.statistics = this.getMockStatistics()
                }
            } catch (error) {
                console.error('加载统计数据失败:', error)
                this.statistics = this.getMockStatistics()
            }
        },

        getMockProgressData () {
            return [
                {
                    studentId: 'student_001',
                    realname: '张小明',
                    studentNo: 'STU202400001',
                    avatar: '/avatars/student001.jpg',
                    className: '2024春季JavaScript班',
                    attendance: 0.95,
                    averageScore: 88.5,
                    completedLessons: 45,
                    totalLessons: 60,
                    submittedHomework: 15,
                    totalHomework: 18,
                    lastActive: '2天前',
                    currentStep: 1,
                    studyHours: 120,
                    enrollDate: '2024-02-20',
                    status: 'active',
                    recentHomework: [
                        {
                            title: '制作小猫追球游戏',
                            deadline: '2024-01-20',
                            status: 'submitted',
                            score: 92
                        },
                        {
                            title: 'Python变量练习',
                            deadline: '2024-01-25',
                            status: 'late',
                            score: 85
                        }
                    ],
                    suggestions: [
                        {
                            type: 'success',
                            title: '学习进度良好',
                            description: '保持当前的学习节奏，继续加油！'
                        },
                        {
                            type: 'warning',
                            title: '注意出勤',
                            description: '最近两次课程有迟到，建议提前安排时间'
                        }
                    ]
                },
                {
                    studentId: 'student_002',
                    realname: '李小红',
                    studentNo: 'STU202400002',
                    avatar: '/avatars/student002.jpg',
                    className: '2024春季JavaScript班',
                    attendance: 0.90,
                    averageScore: 92.0,
                    completedLessons: 50,
                    totalLessons: 60,
                    submittedHomework: 18,
                    totalHomework: 18,
                    lastActive: '1天前',
                    currentStep: 2,
                    studyHours: 135,
                    enrollDate: '2024-02-21',
                    status: 'active',
                    recentHomework: [
                        {
                            title: '制作小猫追球游戏',
                            deadline: '2024-01-20',
                            status: 'submitted',
                            score: 95
                        },
                        {
                            title: 'Python变量练习',
                            deadline: '2024-01-25',
                            status: 'submitted',
                            score: 98
                        }
                    ],
                    suggestions: [
                        {
                            type: 'success',
                            title: '优秀学员',
                            description: '学习表现优异，可以尝试更有挑战性的项目'
                        }
                    ]
                }
            ]
        },

        getMockStatistics () {
            return {
                totalStudents: 156,
                avgAttendance: 88.5,
                avgScore: 85.2,
                homeworkRate: 92.3
            }
        },

        handleTableChange (pagination, filters, sorter) {
            this.pagination.current = pagination.current
            this.pagination.pageSize = pagination.pageSize
            this.loadStudentProgress()
        },

        viewStudentDetail (student) {
            this.selectedStudent = student
            this.detailVisible = true
            this.$nextTick(() => {
                this.renderCharts()
            })
        },

        viewLearningPath (student) {
            this.selectedStudent = student
            this.pathVisible = true
        },

        sendReminder (student) {
            this.selectedStudent = student
            this.reminderVisible = true
            this.reminderForm = {
                type: '',
                message: '',
                methods: []
            }
        },

        async sendReminderMessage () {
            if (!this.reminderForm.type || !this.reminderForm.message) {
                this.$message.error('请填写完整的提醒信息')
                return
            }

            try {
                const response = await this.$http.post('/learning/reminder', {
                    studentId: this.selectedStudent.studentId,
                    ...this.reminderForm
                })

                this.$message.success('提醒已发送')
                this.reminderVisible = false
            } catch (error) {
                this.$message.error('发送提醒失败')
            }
        },

        refreshData () {
            this.loadStudentProgress()
            this.loadStatistics()
            this.$message.success('数据已刷新')
        },

        exportReport () {
            this.$message.info('导出功能开发中...')
        },

        renderCharts () {
            // 模拟图表渲染
            // 实际项目中需要使用ECharts或其他图表库
            this.$message.info('图表渲染完成')
        },

        getAttendanceColor (rate) {
            if (rate >= 0.9) return '#52c41a'
            if (rate >= 0.8) return '#fa8c16'
            return '#ff4d4f'
        },

        getScoreColor (score) {
            if (score >= 90) return 'green'
            if (score >= 80) return 'blue'
            if (score >= 70) return 'orange'
            return 'red'
        },

        getProgressColor (rate) {
            if (rate >= 0.8) return '#52c41a'
            if (rate >= 0.6) return '#1890ff'
            if (rate >= 0.4) return '#fa8c16'
            return '#ff4d4f'
        },

        getHomeworkColor (rate) {
            if (rate >= 0.9) return '#52c41a'
            if (rate >= 0.7) return '#fa8c16'
            return '#ff4d4f'
        }
    }
}
</script>

<style scoped lang="less">
.learning-tracker {
  .filter-section {
    margin-bottom: 24px;
  }

  .overview-section {
    margin-bottom: 24px;
  }

  .progress-table-section {
    .student-info {
      display: flex;
      align-items: center;

      .info {
        margin-left: 12px;

        .name {
          font-weight: 600;
          margin-bottom: 2px;
        }

        .number {
          font-size: 12px;
          color: #666;
        }
      }
    }

    .progress-detail {
      .progress-text {
        font-size: 12px;
        color: #666;
        margin-top: 4px;
      }
    }

    .homework-stats {
      font-size: 12px;

      div {
        margin-bottom: 2px;
      }
    }
  }

  .student-detail {
    .info-card {
      margin-bottom: 16px;

      .avatar-section {
        text-align: center;

        .student-name {
          margin-top: 8px;
          font-weight: 600;
          font-size: 16px;
        }

        .student-number {
          color: #666;
          font-size: 12px;
        }
      }
    }

    .chart-card {
      margin-bottom: 16px;
    }

    .homework-card {
      margin-bottom: 16px;
    }

    .suggestion-card {
      .ant-list-item-meta-description {
        color: #666;
      }
    }
  }

  .learning-path {
    .step-progress {
      margin: 8px 0;
    }

    .step-time {
      font-size: 12px;
      color: #999;
    }
  }
}
</style>
