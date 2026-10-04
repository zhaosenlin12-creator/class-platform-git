<template>
  <div class="teacher-homework-review">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="title-section">
        <h2>作业批改</h2>
        <p>查看和批改学生提交的作业</p>
      </div>

      <!-- 统计信息 -->
      <div class="stats-section">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-statistic title="待批改" :value="stats.pending" suffix="份" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="已批改" :value="stats.reviewed" suffix="份" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="平均分" :value="stats.averageScore" suffix="分" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="本周批改" :value="stats.weeklyReviewed" suffix="份" />
          </a-col>
        </a-row>
      </div>
    </div>

    <!-- 过滤和搜索 -->
    <div class="filter-section">
      <a-card>
        <a-row :gutter="16">
          <a-col :span="6">
            <a-select v-model="filters.courseId" placeholder="选择课程" style="width: 100%" @change="loadHomeworkList">
              <a-select-option value="">全部课程</a-select-option>
              <a-select-option v-for="course in courseOptions" :key="course.id" :value="course.id">
                {{ course.courseName }}
              </a-select-option>
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-select v-model="filters.status" placeholder="批改状态" style="width: 100%" @change="loadHomeworkList">
              <a-select-option value="">全部状态</a-select-option>
              <a-select-option value="pending">待批改</a-select-option>
              <a-select-option value="reviewed">已批改</a-select-option>
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-input-search
              v-model="filters.studentName"
              placeholder="搜索学生姓名"
              @search="loadHomeworkList"
            />
          </a-col>
          <a-col :span="6">
            <a-button @click="resetFilters">重置</a-button>
          </a-col>
        </a-row>
      </a-card>
    </div>

    <!-- 作业列表 -->
    <div class="homework-list">
      <a-card>
        <a-table
          :columns="columns"
          :data-source="homeworkList"
          :loading="loading"
          :pagination="pagination"
          @change="handleTableChange"
          row-key="id"
        >
          <!-- 学生信息 -->
          <template #studentInfo="text, record">
            <div class="student-info">
              <a-avatar :src="record.studentAvatar" size="small">
                {{ record.studentName.charAt(0) }}
              </a-avatar>
              <span class="student-name">{{ record.studentName }}</span>
            </div>
          </template>

          <!-- 作业类型 -->
          <template #workType="text">
            <a-tag :color="getWorkTypeColor(text)">
              {{ getWorkTypeText(text) }}
            </a-tag>
          </template>

          <!-- 状态 -->
          <template #status="text">
            <a-tag :color="getStatusColor(text)">
              {{ getStatusText(text) }}
            </a-tag>
          </template>

          <!-- 提交时间 -->
          <template #submitTime="text">
            {{ formatTime(text) }}
          </template>

          <!-- 操作 -->
          <template #action="text, record">
            <a-space>
              <a-button type="primary" size="small" @click="reviewHomework(record)">
                {{ record.reviewStatus === 'pending' ? '批改' : '查看' }}
              </a-button>
              <a-button type="link" size="small" @click="previewWork(record)">
                预览作品
              </a-button>
            </a-space>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- 批改模态框 -->
    <a-modal
      v-model="showReviewModal"
      title="作业批改"
      width="1000px"
      :footer="null"
    >
      <div v-if="currentHomework" class="review-content">
        <!-- 学生信息和作业信息 -->
        <div class="homework-header">
          <div class="student-section">
            <a-avatar :src="currentHomework.studentAvatar" size="large">
              {{ currentHomework.studentName.charAt(0) }}
            </a-avatar>
            <div class="student-details">
              <h3>{{ currentHomework.studentName }}</h3>
              <p>{{ currentHomework.courseName }} - {{ currentHomework.workTitle }}</p>
              <p>提交时间：{{ formatTime(currentHomework.submitTime) }}</p>
            </div>
          </div>

          <div class="score-section">
            <a-input-number
              v-model="reviewForm.score"
              :min="0"
              :max="100"
              placeholder="评分"
              style="width: 80px"
            />
            <span style="margin-left: 8px">分</span>
          </div>
        </div>

        <!-- 作品展示区域 -->
        <div class="work-display">
          <div v-if="currentHomework.workType === 'scratch'" class="scratch-work">
            <iframe
              :src="getScratchPreviewUrl(currentHomework.workFile)"
              width="100%"
              height="400px"
              frameborder="0"
            />
          </div>

          <div v-else-if="currentHomework.workType === 'python'" class="code-work">
            <pre class="code-content">{{ currentHomework.codeContent }}</pre>
          </div>

          <div v-else class="file-work">
            <a-upload
              :file-list="workFiles"
              :show-upload-list="false"
            >
              <a-button icon="download" @click="downloadWork(currentHomework)">
                下载作品文件
              </a-button>
            </a-upload>
          </div>
        </div>

        <!-- 评语区域 -->
        <div class="feedback-section">
          <h4>批改评语</h4>
          <a-textarea
            v-model="reviewForm.feedback"
            placeholder="请输入评语..."
            :rows="4"
          />

          <!-- 快速评语模板 -->
          <div class="quick-feedback">
            <h5>常用评语：</h5>
            <a-tag
              v-for="template in feedbackTemplates"
              :key="template.id"
              @click="addQuickFeedback(template.content)"
              style="margin: 4px; cursor: pointer"
            >
              {{ template.title }}
            </a-tag>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="review-actions">
          <a-space>
            <a-button @click="showReviewModal = false">取消</a-button>
            <a-button type="primary" @click="submitReview" :loading="reviewLoading">
              提交批改
            </a-button>
          </a-space>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script>
import moment from 'moment'
import { homeworkApi, courseApi } from '@/api/teaching'

function normalizeAttachments (attachments) {
    if (!attachments) {
        return []
    }

    if (Array.isArray(attachments)) {
        return attachments
    }

    if (typeof attachments === 'string') {
        try {
            const parsed = JSON.parse(attachments)
            return Array.isArray(parsed) ? parsed : []
        } catch (error) {
            return []
        }
    }

    return []
}

export default {
    name: 'TeacherHomeworkReview',
    data () {
        return {
            loading: false,
            reviewLoading: false,

            // 统计数据
            stats: {
                pending: 0,
                reviewed: 0,
                averageScore: 0,
                weeklyReviewed: 0
            },

            // 过滤条件
            filters: {
                courseId: '',
                status: '',
                studentName: ''
            },

            // 课程选项
            courseOptions: [],

            // 作业列表
            homeworkList: [],
            pagination: {
                current: 1,
                pageSize: 10,
                total: 0,
                showSizeChanger: true
            },

            // 表格列
            columns: [
                {
                    title: '学生',
                    key: 'studentInfo',
                    scopedSlots: { customRender: 'studentInfo' }
                },
                {
                    title: '课程',
                    dataIndex: 'courseName',
                    key: 'courseName'
                },
                {
                    title: '作业标题',
                    dataIndex: 'workTitle',
                    key: 'workTitle'
                },
                {
                    title: '类型',
                    dataIndex: 'workType',
                    key: 'workType',
                    scopedSlots: { customRender: 'workType' }
                },
                {
                    title: '状态',
                    dataIndex: 'reviewStatus',
                    key: 'reviewStatus',
                    scopedSlots: { customRender: 'status' }
                },
                {
                    title: '提交时间',
                    dataIndex: 'submitTime',
                    key: 'submitTime',
                    scopedSlots: { customRender: 'submitTime' }
                },
                {
                    title: '操作',
                    key: 'action',
                    scopedSlots: { customRender: 'action' }
                }
            ],

            // 批改相关
            showReviewModal: false,
            currentHomework: null,
            reviewForm: {
                score: null,
                feedback: ''
            },
            workFiles: [],

            // 快速评语模板
            feedbackTemplates: [
                { id: 1, title: '很棒！', content: '作业完成得很好，逻辑清晰，代码规范！' },
                { id: 2, title: '继续努力', content: '基本完成了要求，但还有改进空间，继续加油！' },
                { id: 3, title: '需要完善', content: '作业基本框架正确，但细节需要进一步完善。' },
                { id: 4, title: '创意不错', content: '很有创意的想法，继续发挥你的创造力！' }
            ]
        }
    },

    mounted () {
        this.initializePage()
    },

    methods: {
        async initializePage () {
            await Promise.all([
                this.loadCourseOptions(),
                this.loadHomeworkList(),
                this.loadStats()
            ])
        },

        buildFilterParams () {
            return {
                courseId: this.filters.courseId || undefined,
                status: this.filters.status || undefined,
                studentName: this.filters.studentName || undefined
            }
        },

        normalizeReviewRecord (record) {
            const attachments = normalizeAttachments(record.attachments)
            const score = record.score !== null && record.score !== undefined && record.score !== ''
                ? Number(record.score)
                : null

            return {
                ...record,
                id: record.submissionId || record.id,
                submissionId: record.submissionId || record.id,
                studentName: record.studentName || '未命名学生',
                studentAvatar: record.studentAvatar || '',
                courseName: record.courseName || '未关联课程',
                workTitle: record.workTitle || '未命名作业',
                workType: record.workType || 'other',
                reviewStatus: record.reviewStatus || (record.submissionStatus === 'graded' ? 'reviewed' : 'pending'),
                submitTime: record.submitTime || record.submit_time || null,
                score,
                feedback: record.feedback || '',
                codeContent: record.codeContent || record.content || '',
                attachments,
                workFile: record.workFile || (attachments[0] && (attachments[0].url || attachments[0].fileUrl || attachments[0].path)) || ''
            }
        },

        async loadCourseOptions () {
            try {
                const response = await courseApi.getCourseList({ pageSize: 100 })
                if (response.success) {
                    this.courseOptions = response.result.records || []
                }
            } catch (error) {
                console.error('加载课程选项失败:', error)
                // 使用模拟数据
                this.courseOptions = [
                    { id: '1', courseName: 'Python基础编程' },
                    { id: '2', courseName: 'Scratch创意编程' },
                    { id: '3', courseName: 'JavaScript入门' }
                ]
            }
        },

        async loadStats () {
            try {
                const response = await homeworkApi.getReviewStats(this.buildFilterParams())
                if (response.success) {
                    this.stats = {
                        pending: response.result.pending || 0,
                        reviewed: response.result.reviewed || 0,
                        averageScore: response.result.averageScore || 0,
                        weeklyReviewed: response.result.weeklyReviewed || 0
                    }
                }
            } catch (error) {
                console.error('加载统计数据失败:', error)
                // 使用模拟数据
                this.stats = {
                    pending: 0,
                    reviewed: 0,
                    averageScore: 0,
                    weeklyReviewed: 0
                }
                return
                this.stats = {
                    pending: 15,
                    reviewed: 28,
                    averageScore: 85,
                    weeklyReviewed: 12
                }
            }
        },

        async loadHomeworkList () {
            this.loading = true
            try {
                const params = {
                    pageNo: this.pagination.current,
                    pageSize: this.pagination.pageSize,
                    ...this.buildFilterParams()
                }

                const response = await homeworkApi.getReviewList(params)
                if (response.success) {
                    this.homeworkList = (response.result.records || []).map(item => this.normalizeReviewRecord(item))
                    this.pagination.total = response.result.total || 0
                }
                await this.loadStats()
            } catch (error) {
                console.error('加载作业列表失败:', error)
                // 使用模拟数据
                this.homeworkList = []
                this.pagination.total = 0
                this.$message.error('作业评阅列表加载失败')
                return
                this.homeworkList = [
                    {
                        id: '1',
                        studentName: '张小明',
                        studentAvatar: '',
                        courseName: 'Python基础编程',
                        workTitle: '循环练习题',
                        workType: 'python',
                        reviewStatus: 'pending',
                        submitTime: new Date(),
                        score: null
                    }
                ]
            } finally {
                this.loading = false
            }
        },

        resetFilters () {
            this.filters = {
                courseId: '',
                status: '',
                studentName: ''
            }
            this.pagination.current = 1
            this.loadHomeworkList()
            this.loadStats()
        },

        handleTableChange (pagination) {
            this.pagination.current = pagination.current
            this.pagination.pageSize = pagination.pageSize
            this.loadHomeworkList()
        },

        reviewHomework (homework) {
            const normalized = this.normalizeReviewRecord(homework)
            this.currentHomework = normalized
            this.reviewForm = {
                score: normalized.score,
                feedback: normalized.feedback || ''
            }
            this.workFiles = normalized.attachments.map((item, index) => ({
                uid: item.uid || item.id || `${normalized.id}-${index}`,
                name: item.name || item.fileName || `attachment-${index + 1}`,
                url: item.url || item.fileUrl || item.path || '',
                status: 'done'
            }))
            this.showReviewModal = true
        },

        previewWork (homework) {
            const normalized = this.normalizeReviewRecord(homework)

            if (normalized.workType === 'scratch' && normalized.workFile) {
                window.open(this.getScratchPreviewUrl(normalized.workFile), '_blank')
                return
            }

            if (normalized.attachments.length > 0) {
                const firstAttachment = normalized.attachments[0]
                const previewUrl = firstAttachment.url || firstAttachment.fileUrl || firstAttachment.path
                if (previewUrl) {
                    window.open(previewUrl, '_blank')
                    return
                }
            }

            if (normalized.codeContent) {
                this.reviewHomework(normalized)
                return
            }

            this.$message.info('当前提交没有可预览内容')
            return
            if (homework.workType === 'scratch') {
                const previewUrl = this.getScratchPreviewUrl(homework.workFile)
                window.open(previewUrl, '_blank')
            } else {
                this.$message.info('预览功能开发中')
            }
        },

        addQuickFeedback (content) {
            if (this.reviewForm.feedback) {
                this.reviewForm.feedback += '\n' + content
            } else {
                this.reviewForm.feedback = content
            }
        },

        async submitReview () {
            if (!this.currentHomework || !this.currentHomework.submissionId) {
                this.$message.error('提交记录不存在')
                return
            }

            if (this.reviewForm.score === null || this.reviewForm.score === undefined) {
                this.$message.error('请输入评分')
                return
            }

            this.reviewLoading = true
            try {
                const response = await homeworkApi.gradeHomework(this.currentHomework.submissionId, {
                    submissionId: this.currentHomework.submissionId,
                    score: this.reviewForm.score,
                    feedback: this.reviewForm.feedback
                })

                if (response.success) {
                    this.showReviewModal = false
                    await Promise.all([this.loadHomeworkList(), this.loadStats()])
                }
            } catch (error) {
                console.error('submitReview failed:', error)
                this.$message.error('提交批改失败')
            } finally {
                this.reviewLoading = false
            }
            return
            if (!this.reviewForm.score) {
                this.$message.error('请输入评分')
            }

            this.reviewLoading = true
            try {
                const data = {
                    homeworkId: this.currentHomework.id,
                    score: this.reviewForm.score,
                    feedback: this.reviewForm.feedback
                }

                const response = await homeworkApi.gradeHomework(this.currentHomework.id, {
                    score: this.reviewForm.score,
                    feedback: this.reviewForm.feedback
                })
                if (response.success) {
                    this.showReviewModal = false
                    this.loadHomeworkList()
                    this.loadStats()
                }
            } catch (error) {
                console.error('提交批改失败:', error)
            } finally {
                this.reviewLoading = false
            }
        },

        getScratchPreviewUrl (workFile) {
            return `/api/scratch/preview?file=${encodeURIComponent(workFile)}`
        },

        downloadWork (homework) {
            const normalized = this.normalizeReviewRecord(homework)
            const firstAttachment = normalized.attachments[0]

            if (firstAttachment) {
                const url = firstAttachment.url || firstAttachment.fileUrl || firstAttachment.path
                if (url) {
                    const link = document.createElement('a')
                    link.href = url
                    link.download = firstAttachment.name || `${normalized.workTitle}.zip`
                    link.target = '_blank'
                    link.rel = 'noopener'
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    return
                }
            }

            if (normalized.workFile) {
                const link = document.createElement('a')
                link.href = normalized.workFile
                link.download = `${normalized.workTitle}.zip`
                link.target = '_blank'
                link.rel = 'noopener'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                return
            }

            this.$message.warning('未找到可下载的作业文件')
            return
            const link = document.createElement('a')
            link.href = `/api/teaching/work/download/${homework.id}`
            link.download = `${homework.workTitle}_${homework.studentName}.zip`
            link.click()
        },

        getWorkTypeText (type) {
            const typeMap = {
                scratch: 'Scratch',
                python: 'Python',
                javascript: 'JavaScript',
                other: '其他'
            }
            return typeMap[type] || '未知'
        },

        getWorkTypeColor (type) {
            const colorMap = {
                scratch: 'orange',
                python: 'blue',
                javascript: 'green',
                other: 'gray'
            }
            return colorMap[type] || 'default'
        },

        getStatusText (status) {
            const statusMap = {
                pending: '待批改',
                reviewed: '已批改'
            }
            return statusMap[status] || '未知'
        },

        getStatusColor (status) {
            const colorMap = {
                pending: 'orange',
                reviewed: 'green'
            }
            return colorMap[status] || 'default'
        },

        formatTime (time) {
            if (!time) {
                return '-'
            }
            return moment(time).format('MM-DD HH:mm')
        }
    }
}
</script>

<style lang="less" scoped>
.teacher-homework-review {
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;

  .page-header {
    background: white;
    padding: 24px;
    border-radius: 8px;
    margin-bottom: 16px;

    .title-section {
      margin-bottom: 24px;

      h2 {
        margin: 0 0 8px 0;
        color: #262626;
      }

      p {
        margin: 0;
        color: #8c8c8c;
      }
    }
  }

  .filter-section {
    margin-bottom: 16px;
  }

  .homework-list {
    .student-info {
      display: flex;
      align-items: center;

      .student-name {
        margin-left: 8px;
      }
    }
  }

  .review-content {
    .homework-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 16px;
      border-bottom: 1px solid #f0f0f0;
      margin-bottom: 24px;

      .student-section {
        display: flex;
        align-items: center;

        .student-details {
          margin-left: 16px;

          h3 {
            margin: 0 0 8px 0;
          }

          p {
            margin: 0 0 4px 0;
            color: #666;
            font-size: 14px;
          }
        }
      }

      .score-section {
        display: flex;
        align-items: center;
        font-size: 16px;
      }
    }

    .work-display {
      margin-bottom: 24px;
      border: 1px solid #f0f0f0;
      border-radius: 4px;
      overflow: hidden;

      .code-content {
        padding: 16px;
        background: #f8f8f8;
        font-family: 'Monaco', 'Consolas', monospace;
        font-size: 14px;
        line-height: 1.5;
        margin: 0;
        white-space: pre-wrap;
      }

      .file-work {
        padding: 24px;
        text-align: center;
      }
    }

    .feedback-section {
      margin-bottom: 24px;

      h4 {
        margin-bottom: 12px;
      }

      .quick-feedback {
        margin-top: 16px;

        h5 {
          margin-bottom: 8px;
          font-size: 14px;
        }
      }
    }

    .review-actions {
      text-align: right;
      padding-top: 16px;
      border-top: 1px solid #f0f0f0;
    }
  }
}
</style>
