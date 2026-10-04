<template>
  <div class="teacher-student-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-section">
          <h2>学生管理</h2>
          <p>管理学生信息、学习进度和学习标记</p>
        </div>
        <div class="action-section">
          <a-button-group>
            <a-button icon="reload" @click="refreshData" :loading="loading">
              刷新数据
            </a-button>
            <a-button icon="download" @click="exportStudentData">
              导出数据
            </a-button>
          </a-button-group>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <a-row :gutter="16">
        <a-col :xs="24" :sm="8">
          <a-card class="stat-card">
            <a-statistic
              title="学生总数"
              :value="statistics.totalStudents"
              prefix="👥"
              :loading="loading"
            />
          </a-card>
        </a-col>
        <a-col :xs="24" :sm="8">
          <a-card class="stat-card">
            <a-statistic
              title="活跃学生"
              :value="statistics.activeStudents"
              prefix="📈"
              :loading="loading"
            />
          </a-card>
        </a-col>
        <a-col :xs="24" :sm="8">
          <a-card class="stat-card">
            <a-statistic
              title="需要关注"
              :value="statistics.needAttentionCount"
              prefix="⚠️"
              :loading="loading"
            />
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- 筛选和搜索 -->
    <a-card class="filter-card">
      <a-row :gutter="16" align="middle">
        <a-col :xs="24" :sm="6">
          <a-select
            v-model="filters.classId"
            placeholder="选择班级"
            allowClear
            style="width: 100%"
            @change="loadStudentList"
          >
            <a-select-option
              v-for="class_ in classList"
              :key="class_.id"
              :value="class_.id"
            >
              {{ safe(class_.name) }}
            </a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="6">
          <a-select
            v-model="filters.status"
            placeholder="学习状态"
            allowClear
            style="width: 100%"
            @change="loadStudentList"
          >
            <a-select-option value="active">活跃</a-select-option>
            <a-select-option value="inactive">不活跃</a-select-option>
            <a-select-option value="need_attention">需要关注</a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="24" :sm="8">
          <debounced-search
            v-model="filters.keyword"
            placeholder="搜索学生姓名或学号"
            :delay="300"
            :sanitize="true"
            :sanitize-s-q-l="true"
            :max-length="100"
            @search="loadStudentList"
            style="width: 100%"
          />
        </a-col>
        <a-col :xs="24" :sm="4">
          <a-button type="primary" @click="loadStudentList" :loading="loading">
            查询
          </a-button>
        </a-col>
      </a-row>
    </a-card>

    <!-- 学生列表 -->
    <a-card class="student-list-card">
      <a-table
        :columns="columns"
        :data-source="studentList"
        :pagination="pagination"
        :loading="loading"
        row-key="id"
        @change="handleTableChange"
      >
        <!-- 学生头像 -->
        <template slot="avatar" slot-scope="text, record">
          <a-avatar :src="getSafeAvatar(record.avatar)" :alt="safe(record.name)">
            {{ record.name ? safe(record.name).charAt(0) : 'S' }}
          </a-avatar>
        </template>

        <!-- 学生基本信息 -->
        <template slot="studentInfo" slot-scope="text, record">
          <div class="student-info">
            <div class="student-name">{{ safe(record.name) }}</div>
            <div class="student-number">学号: {{ safe(record.studentNumber) }}</div>
            <div class="student-class">班级: {{ safe(record.className) }}</div>
          </div>
        </template>

        <!-- 学习状态 -->
        <template slot="status" slot-scope="text, record">
          <a-tag
            :color="getStatusColor(record.status)"
            class="status-tag"
          >
            {{ getStatusText(record.status) }}
          </a-tag>
        </template>

        <!-- 学习进度 -->
        <template slot="progress" slot-scope="text, record">
          <div class="progress-info">
            <a-progress
              :percent="record.completionRate"
              :size="'small'"
              :show-info="false"
            />
            <div class="progress-text">
              {{ record.completedCourses }}/{{ record.totalCourses }} 课程
            </div>
          </div>
        </template>

        <!-- 最近活动 -->
        <template slot="lastActivity" slot-scope="text, record">
          <div class="activity-info">
            <div class="activity-time">{{ formatTime(record.lastActivityTime) }}</div>
            <div class="activity-desc">{{ safe(record.lastActivity) }}</div>
          </div>
        </template>

        <!-- 操作按钮 -->
        <template slot="actions" slot-scope="text, record">
          <a-button-group size="small">
            <a-button @click="viewStudentDetail(record)">
              详情
            </a-button>
            <a-button @click="viewStudentProgress(record)">
              进度
            </a-button>
            <a-button @click="showLearningMarkModal(record)">
              标记
            </a-button>
          </a-button-group>
        </template>
      </a-table>
    </a-card>

    <!-- 学习标记模态框 -->
    <a-modal
      title="添加学习标记"
      :visible="learningMarkModalVisible"
      @ok="handleLearningMarkSubmit"
      @cancel="learningMarkModalVisible = false"
      :confirm-loading="submitting"
    >
      <a-form :form="learningMarkForm" layout="vertical">
        <a-form-item label="标记类型">
          <a-select
            v-decorator="['markType', { rules: [{ required: true, message: '请选择标记类型' }] }]"
            placeholder="请选择标记类型"
          >
            <a-select-option value="excellent">优秀表现</a-select-option>
            <a-select-option value="need_help">需要帮助</a-select-option>
            <a-select-option value="progress">学习进步</a-select-option>
            <a-select-option value="participation">积极参与</a-select-option>
            <a-select-option value="other">其他</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="备注说明">
          <a-textarea
            v-decorator="['notes', { rules: [{ required: true, message: '请填写备注说明' }] }]"
            :rows="4"
            placeholder="请详细描述这次标记的具体情况..."
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 学生详情模态框 -->
    <a-modal
      title="学生详细信息"
      :visible="studentDetailModalVisible"
      @cancel="studentDetailModalVisible = false"
      :footer="null"
      width="800px"
    >
      <div v-if="selectedStudent" class="student-detail">
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="姓名">{{ safe(selectedStudent.name) }}</a-descriptions-item>
          <a-descriptions-item label="学号">{{ safe(selectedStudent.studentNumber) }}</a-descriptions-item>
          <a-descriptions-item label="班级">{{ safe(selectedStudent.className) }}</a-descriptions-item>
          <a-descriptions-item label="邮箱">{{ safe(selectedStudent.email) }}</a-descriptions-item>
          <a-descriptions-item label="注册时间">{{ formatTime(selectedStudent.registerTime) }}</a-descriptions-item>
          <a-descriptions-item label="最后登录">{{ formatTime(selectedStudent.lastLoginTime) }}</a-descriptions-item>
          <a-descriptions-item label="学习状态" :span="2">
            <a-tag :color="getStatusColor(selectedStudent.status)">
              {{ getStatusText(selectedStudent.status) }}
            </a-tag>
          </a-descriptions-item>
        </a-descriptions>

        <div class="detail-section">
          <h4>学习统计</h4>
          <a-row :gutter="16">
            <a-col span="8">
              <a-statistic title="完成课程" :value="selectedStudent.completedCourses" suffix="个" />
            </a-col>
            <a-col span="8">
              <a-statistic title="学习时长" :value="selectedStudent.totalStudyTime" suffix="小时" />
            </a-col>
            <a-col span="8">
              <a-statistic title="作业完成率" :value="selectedStudent.homeworkCompletionRate" suffix="%" />
            </a-col>
          </a-row>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { studentApi } from '@/api/teaching'
import moment from 'moment'
import DebouncedSearch from '@/components/DebouncedSearch'
import { sanitizeInput } from '@/utils/security'

export default {
    name: 'TeacherStudentManagement',
    components: {
        DebouncedSearch
    },
    data () {
        return {
            loading: false,
            submitting: false,

            // 统计数据
            statistics: {
                totalStudents: 0,
                activeStudents: 0,
                needAttentionCount: 0
            },

            // 筛选条件
            filters: {
                classId: undefined,
                status: undefined,
                keyword: ''
            },

            // 班级列表
            classList: [],

            // 学生列表
            studentList: [],

            // 分页
            pagination: {
                current: 1,
                pageSize: 10,
                total: 0,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`
            },

            // 表格列定义
            columns: [
                {
                    title: '头像',
                    dataIndex: 'avatar',
                    key: 'avatar',
                    width: 80,
                    scopedSlots: { customRender: 'avatar' }
                },
                {
                    title: '学生信息',
                    dataIndex: 'studentInfo',
                    key: 'studentInfo',
                    width: 200,
                    scopedSlots: { customRender: 'studentInfo' }
                },
                {
                    title: '状态',
                    dataIndex: 'status',
                    key: 'status',
                    width: 100,
                    scopedSlots: { customRender: 'status' }
                },
                {
                    title: '学习进度',
                    dataIndex: 'progress',
                    key: 'progress',
                    width: 150,
                    scopedSlots: { customRender: 'progress' }
                },
                {
                    title: '最近活动',
                    dataIndex: 'lastActivity',
                    key: 'lastActivity',
                    width: 160,
                    scopedSlots: { customRender: 'lastActivity' }
                },
                {
                    title: '操作',
                    key: 'actions',
                    width: 160,
                    scopedSlots: { customRender: 'actions' }
                }
            ],

            // 学习标记模态框
            learningMarkModalVisible: false,
            learningMarkForm: this.$form.createForm(this),
            selectedStudentForMark: null,

            // 学生详情模态框
            studentDetailModalVisible: false,
            selectedStudent: null
        }
    },

    async mounted () {
        await this.initializeData()
    },

    methods: {
    /**
     * 清理用户输入文本 - 防止XSS攻击
     */
        safe (text) {
            if (!text) return ''
            return sanitizeInput(text, { maxLength: 200 })
        },

        /**
     * 获取安全的头像URL
     */
        getSafeAvatar (url) {
            if (!url) return ''
            const normalizedUrl = String(url).trim()
            if (normalizedUrl.startsWith('/')) {
                return normalizedUrl
            }
            if (/^https?:\/\/.+/i.test(normalizedUrl)) {
                return normalizedUrl
            }
            return ''
        },

        /**
     * 初始化数据
     */
        async initializeData () {
            this.loading = true
            try {
                await Promise.all([
                    this.loadStatistics(),
                    this.loadClassList(),
                    this.loadStudentList()
                ])
            } catch (error) {
                console.error('初始化数据失败:', error)
                this.$message.error('数据加载失败')
            } finally {
                this.loading = false
            }
        },

        /**
     * 加载统计数据
     */
        async loadStatistics () {
            try {
                const response = await studentApi.getStudentStatistics()
                if (response.success) {
                    this.statistics = response.result
                }
            } catch (error) {
                console.error('加载统计数据失败:', error)
            }
        },

        /**
     * 加载班级列表
     */
        async loadClassList () {
            try {
                const response = await studentApi.getClassList()
                if (response.success) {
                    this.classList = response.result
                }
            } catch (error) {
                console.error('加载班级列表失败:', error)
            }
        },

        /**
     * 加载学生列表
     */
        async loadStudentList () {
            this.loading = true
            try {
                const params = {
                    ...this.filters,
                    pageNo: this.pagination.current,
                    pageSize: this.pagination.pageSize
                }

                const response = await studentApi.getStudentList(params)
                if (response.success) {
                    this.studentList = response.result.records
                    this.pagination.total = response.result.total
                }
            } catch (error) {
                console.error('加载学生列表失败:', error)
                this.$message.error('加载学生列表失败')
            } finally {
                this.loading = false
            }
        },

        /**
     * 刷新数据
     */
        async refreshData () {
            await this.initializeData()
            this.$message.success('数据刷新成功')
        },

        /**
     * 导出学生数据
     */
        async exportStudentData () {
            try {
                const params = { ...this.filters }
                const response = await studentApi.exportStudentData(params)

                // 创建下载链接
                const blob = new Blob([response], { type: 'application/vnd.ms-excel' })
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `学生数据_${moment().format('YYYY-MM-DD')}.xlsx`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)

                this.$message.success('数据导出成功')
            } catch (error) {
                console.error('导出数据失败:', error)
                this.$message.error('导出数据失败')
            }
        },

        /**
     * 表格变化处理
     */
        handleTableChange (pagination) {
            this.pagination.current = pagination.current
            this.pagination.pageSize = pagination.pageSize
            this.loadStudentList()
        },

        /**
     * 查看学生详情
     */
        async viewStudentDetail (student) {
            try {
                const response = await studentApi.getStudentDetails(student.id)
                if (response.success) {
                    this.selectedStudent = response.result
                    this.studentDetailModalVisible = true
                }
            } catch (error) {
                console.error('获取学生详情失败:', error)
                this.$message.error('获取学生详情失败')
            }
        },

        /**
     * 查看学生进度
     */
        async viewStudentProgress (student) {
            // 跳转到学生进度详情页面或打开进度模态框
            try {
                const [detailResponse, progressResponse] = await Promise.all([
                    studentApi.getStudentDetails(student.id),
                    studentApi.getStudentProgress(student.id)
                ])

                if (detailResponse.success) {
                    const detail = detailResponse.result || {}
                    const progress = progressResponse.success ? (progressResponse.result || {}) : {}
                    const courseList = Array.isArray(progress.courses) ? progress.courses : []
                    const completedCourses = courseList.filter(item => Number(item.progress || 0) >= 1).length
                    const progressPercent = Math.round(Number(progress.totalProgress || 0) * 100)

                    this.selectedStudent = {
                        ...detail,
                        completedCourses: detail.completedCourses || completedCourses,
                        totalStudyTime: detail.totalStudyTime || progress.totalStudyHours || 0,
                        homeworkCompletionRate: detail.homeworkCompletionRate || progressPercent
                    }
                    this.studentDetailModalVisible = true
                    return
                }
            } catch (error) {
                console.error('加载学生进度失败:', error)
                this.$message.error('加载学生进度失败')
                return
            }

            this.$router.push(`/teacher/student-progress/${student.id}`)
        },

        /**
     * 显示学习标记模态框
     */
        showLearningMarkModal (student) {
            this.selectedStudentForMark = student
            this.learningMarkModalVisible = true
            this.learningMarkForm.resetFields()
        },

        /**
     * 提交学习标记
     */
        handleLearningMarkSubmit () {
            this.learningMarkForm.validateFields(async (err, values) => {
                if (!err) {
                    this.submitting = true
                    try {
                        // 清理备注说明输入
                        const cleanedNotes = sanitizeInput(values.notes, {
                            maxLength: 500,
                            allowSpaces: true
                        })

                        const data = {
                            studentId: this.selectedStudentForMark.id,
                            markType: values.markType,
                            notes: cleanedNotes
                        }

                        const response = await studentApi.createLearningMark(data)
                        if (response.success) {
                            this.$message.success('学习标记添加成功')
                            this.learningMarkModalVisible = false
                            await this.loadStudentList()
                        }
                    } catch (error) {
                        console.error('添加学习标记失败:', error)
                        this.$message.error('添加学习标记失败')
                    } finally {
                        this.submitting = false
                    }
                }
            })
        },

        /**
     * 获取状态颜色
     */
        getStatusColor (status) {
            const colorMap = {
                'active': 'green',
                'inactive': 'orange',
                'need_attention': 'red'
            }
            return colorMap[status] || 'default'
        },

        /**
     * 获取状态文本
     */
        getStatusText (status) {
            const textMap = {
                'active': '活跃',
                'inactive': '不活跃',
                'need_attention': '需要关注'
            }
            return textMap[status] || '未知'
        },

        /**
     * 格式化时间
     */
        formatTime (time) {
            return time ? moment(time).format('YYYY-MM-DD HH:mm') : '-'
        }
    }
}
</script>

<style lang="less" scoped>
.teacher-student-management {
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;

  .page-header {
    margin-bottom: 24px;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .title-section {
        h2 {
          margin: 0;
          color: #262626;
        }

        p {
          margin: 4px 0 0;
          color: #8c8c8c;
        }
      }
    }
  }

  .stats-section {
    margin-bottom: 24px;

    .stat-card {
      text-align: center;

      .ant-statistic-content {
        color: #1890ff;
      }
    }
  }

  .filter-card {
    margin-bottom: 24px;
  }

  .student-list-card {
    .student-info {
      .student-name {
        font-weight: 500;
        color: #262626;
        margin-bottom: 4px;
      }

      .student-number,
      .student-class {
        font-size: 12px;
        color: #8c8c8c;
        margin-bottom: 2px;
      }
    }

    .status-tag {
      border-radius: 10px;
    }

    .progress-info {
      .progress-text {
        font-size: 12px;
        color: #8c8c8c;
        margin-top: 4px;
      }
    }

    .activity-info {
      .activity-time {
        font-size: 12px;
        color: #8c8c8c;
        margin-bottom: 2px;
      }

      .activity-desc {
        font-size: 12px;
        color: #595959;
      }
    }
  }

  .student-detail {
    .detail-section {
      margin-top: 24px;

      h4 {
        margin-bottom: 16px;
        color: #262626;
      }
    }
  }
}
</style>
