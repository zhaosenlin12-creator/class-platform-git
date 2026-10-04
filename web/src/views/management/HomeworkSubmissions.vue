<template>
  <div class="homework-submissions">
    <a-card>
      <div slot="title">
        <a-icon type="file-text" />
        查看提交
        <span v-if="homework" class="title-extra">- {{ homework.homework_title }}</span>
      </div>
      <div slot="extra">
        <a-button @click="goBack">
          <a-icon type="arrow-left" />
          返回
        </a-button>
      </div>

      <a-spin :spinning="headerLoading">
        <a-descriptions v-if="homework" bordered size="small" :column="3" class="homework-info">
          <a-descriptions-item label="作业类型">{{ homework.homework_type || '-' }}</a-descriptions-item>
          <a-descriptions-item label="截止时间">{{ formatTime(homework.deadline) }}</a-descriptions-item>
          <a-descriptions-item label="允许迟交">{{ homework.allow_late_submit ? '是' : '否' }}</a-descriptions-item>
          <a-descriptions-item label="总分/及格">
            {{ homework.total_score || 0 }} / {{ homework.pass_score || 0 }}
          </a-descriptions-item>
          <a-descriptions-item label="分配班级">{{ homework.classNames || '-' }}</a-descriptions-item>
          <a-descriptions-item label="已提交 / 总人数">
            {{ homework.submitted_count || 0 }} / {{ homework.total_students || 0 }}
          </a-descriptions-item>
        </a-descriptions>
      </a-spin>

      <div class="filter-section">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-select v-model="filters.status" placeholder="提交状态" style="width: 100%" @change="reload">
              <a-select-option value="">全部状态</a-select-option>
              <a-select-option value="submitted">已提交</a-select-option>
              <a-select-option value="graded">已批改</a-select-option>
              <a-select-option value="late">迟交</a-select-option>
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-input-search
              v-model="filters.keyword"
              placeholder="搜索学生"
              enter-button="搜索"
              @search="reload"
              allow-clear
            />
          </a-col>
        </a-row>
      </div>

      <a-table
        :columns="columns"
        :data-source="submissions"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1000 }"
        row-key="id"
        @change="handleTableChange"
      >
        <template slot="status" slot-scope="text">
          <a-tag :color="getStatusColor(text)">{{ getStatusText(text) }}</a-tag>
        </template>

        <template slot="score" slot-scope="text">
          <span :class="['score-text', { pass: text >= ((homework && homework.pass_score) || 60) }]">
            {{ text !== null && text !== undefined ? text : '-' }}
          </span>
        </template>

        <template slot="action" slot-scope="text, record">
          <a-button-group size="small">
            <a-button @click="viewSubmission(record)">
              <a-icon type="eye" /> 查看
            </a-button>
            <a-button v-if="record.status !== 'graded'" type="primary" @click="gradeSubmission(record)">
              <a-icon type="edit" /> 批改
            </a-button>
          </a-button-group>
        </template>
      </a-table>
    </a-card>

    <!-- 查看提交详情模态框 -->
    <a-modal
      title="作业提交详情"
      :visible="viewVisible"
      @cancel="viewVisible = false"
      width="800px"
      footer=""
    >
      <div v-if="currentSubmission">
        <a-descriptions bordered>
          <a-descriptions-item label="学生姓名">
            {{ (currentSubmission.student && currentSubmission.student.realname) || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="提交时间">
            {{ formatTime(currentSubmission.submit_time) }}
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="getStatusColor(currentSubmission.status)">
              {{ getStatusText(currentSubmission.status) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="得分" v-if="currentSubmission.score !== null">
            {{ currentSubmission.score }}分
          </a-descriptions-item>
        </a-descriptions>

        <a-divider>提交内容</a-divider>
        <div class="submission-content">
          <p v-if="currentSubmission && currentSubmission.content" class="text-content">{{ currentSubmission.content }}</p>
          <div v-else class="empty-text">暂无文字说明</div>
        </div>

        <a-divider>附件列表</a-divider>
        <div class="attachment-list" v-if="currentAttachments && currentAttachments.length > 0">
          <div v-for="(file, index) in currentAttachments" :key="index" class="attachment-item">
            <a-icon type="file" />
            <span class="file-name">{{ file.name }}</span>
            <a-button v-if="isPreviewable(file.name)" type="link" size="small" @click="previewAttachment(file)">
              预览
            </a-button>
            <a-button type="link" size="small" icon="download" @click="downloadAttachment(file)">
              下载
            </a-button>
          </div>
        </div>
        <div v-else class="empty-text">无附件</div>

        <div class="modal-actions" style="text-align: center; margin-top: 24px;">
          <a-button @click="viewVisible = false" style="margin-right: 8px;">关闭</a-button>
          <a-button type="primary" @click="openGradeModal(currentSubmission)">去评分</a-button>
        </div>
      </div>
    </a-modal>

    <!-- 评分模态框 -->
    <a-modal
      title="作业评分"
      :visible="gradeVisible"
      @cancel="gradeVisible = false"
      @ok="submitGrade"
      :confirmLoading="grading"
    >
      <a-form-model ref="gradeForm" :model="gradeForm" :rules="gradeRules" :label-col="{ span: 4 }" :wrapper-col="{ span: 18 }">
        <a-form-model-item label="得分" prop="score">
          <a-input-number v-model="gradeForm.score" :min="0" :max="100" style="width: 100%" />
        </a-form-model-item>
        <a-form-model-item label="评语" prop="feedback">
          <a-textarea v-model="gradeForm.feedback" :rows="4" placeholder="请输入评语" />
        </a-form-model-item>
      </a-form-model>
    </a-modal>
  </div>
</template>

<script>
import { getHomeworkSubmissions, reviewHomework } from '@/api/homework'
import { getConfiguredBaseUrl } from '@/utils/runtimeBaseUrl'

export default {
    name: 'HomeworkSubmissions',
    data () {
        return {
            homeworkId: this.$route.query.homeworkId || '',
            homework: null,
            submissions: [],
            loading: false,
            headerLoading: false,

            // 详情和评分相关
            viewVisible: false,
            gradeVisible: false,
            grading: false,
            currentSubmission: null,
            gradeForm: {
                score: 80,
                feedback: ''
            },
            gradeRules: {
                score: [{ required: true, message: '请输入分数', trigger: 'blur' }]
            },

            pagination: {
                current: 1,
                pageSize: 10,
                total: 0
            },
            filters: {
                status: '',
                keyword: ''
            },
            columns: [
                {
                    title: '学生',
                    key: 'student',
                    width: 200,
                    customRender: (text, record) => {
                        if (record && record.student && record.student.realname) {
                            return `${record.student.realname} (${record.student.student_no || '-'})`
                        }
                        return '-'
                    }
                },
                {
                    title: '提交时间',
                    dataIndex: 'submit_time',
                    key: 'submit_time',
                    width: 180
                },
                {
                    title: '状态',
                    dataIndex: 'status',
                    key: 'status',
                    scopedSlots: { customRender: 'status' },
                    width: 120
                },
                {
                    title: '得分',
                    dataIndex: 'score',
                    key: 'score',
                    scopedSlots: { customRender: 'score' },
                    width: 100
                },
                {
                    title: '操作',
                    key: 'action',
                    scopedSlots: { customRender: 'action' },
                    width: 200,
                    fixed: 'right'
                }
            ]
        }
    },
    computed: {
        currentAttachments () {
            if (!this.currentSubmission || !this.currentSubmission.attachments) {
                return []
            }
            try {
                if (typeof this.currentSubmission.attachments === 'string') {
                    const parsed = JSON.parse(this.currentSubmission.attachments)
                    return Array.isArray(parsed) ? parsed : []
                }
                return Array.isArray(this.currentSubmission.attachments) ? this.currentSubmission.attachments : []
            } catch (e) {
                console.error('解析附件失败:', e)
                return []
            }
        }
    },
    mounted () {
        if (!this.homeworkId) {
            this.$message.error('未提供作业ID')
            this.goBack()
            return
        }
        this.loadData()
    },
    methods: {
        async loadData (page = this.pagination.current) {
            this.loading = true
            try {
                const params = {
                    pageNo: page,
                    pageSize: this.pagination.pageSize,
                    status: this.filters.status || undefined,
                    keyword: this.filters.keyword || undefined
                }
                const res = await getHomeworkSubmissions(this.homeworkId, params)
                if (res.success) {
                    // 过滤掉 undefined 或 null 的项
                    const records = res.result.records || []
                    this.submissions = records.filter(item => item && item.id)

                    this.pagination.total = res.result.total || 0
                    this.pagination.current = page
                    this.homework = res.result.homework
                } else {
                    this.$message.error(res.message || '加载提交列表失败')
                }
            } catch (error) {
                this.$message.error(error.message || '加载提交列表失败')
            } finally {
                this.loading = false
            }
        },
        reload () {
            this.pagination.current = 1
            this.loadData(1)
        },
        handleTableChange (pagination) {
            this.pagination.current = pagination.current
            this.pagination.pageSize = pagination.pageSize
            this.loadData(pagination.current)
        },
        goBack () {
            this.$router.push('/admin/homework-assignment')
        },
        getStatusText (status) {
            const map = {
                submitted: '已提交',
                graded: '已批改',
                late: '迟交',
                draft: '草稿'
            }
            return map[status] || '未知'
        },
        getStatusColor (status) {
            const map = {
                submitted: 'blue',
                graded: 'green',
                late: 'orange',
                draft: 'gray'
            }
            return map[status] || 'default'
        },
        formatTime (time) {
            if (!time) return '-'
            return this.$moment ? this.$moment(time).format('YYYY-MM-DD HH:mm') : time
        },
        viewSubmission (record) {
            console.log('========== viewSubmission 开始 ==========')

            // 将 Vue 响应式对象转换为纯 JavaScript 对象
            let plainRecord
            try {
                plainRecord = JSON.parse(JSON.stringify(record))
            } catch (e) {
                console.error('[ERROR] Failed to parse record:', e)
                plainRecord = record
            }

            this.currentSubmission = plainRecord
            this.viewVisible = true
        },
        gradeSubmission (record) {
            this.openGradeModal(record)
        },
        openGradeModal (submission) {
            // 将 Vue 响应式对象转换为纯 JavaScript 对象
            let plainSubmission
            try {
                plainSubmission = JSON.parse(JSON.stringify(submission))
            } catch (e) {
                console.error('[ERROR] Failed to parse submission:', e)
                plainSubmission = submission
            }

            if (!plainSubmission || !plainSubmission.id) {
                this.$message.error('提交信息无效，请刷新页面重试')
                console.error('[ERROR] No valid submission ID found')
                return
            }

            this.currentSubmission = plainSubmission
            this.gradeForm = {
                score: plainSubmission.score !== null && plainSubmission.score !== undefined ? plainSubmission.score : 80,
                feedback: plainSubmission.feedback || ''
            }
            this.viewVisible = false
            this.gradeVisible = true
        },
        async submitGrade () {
            if (!this.currentSubmission || !this.currentSubmission.id) {
                this.$message.error('提交信息丢失，请重新打开')
                this.gradeVisible = false
                return
            }

            this.$refs.gradeForm.validate(async (valid) => {
                if (!valid) return

                this.grading = true
                try {
                    const res = await reviewHomework({
                        submissionId: this.currentSubmission.id,
                        score: this.gradeForm.score,
                        feedback: this.gradeForm.feedback
                    })

                    if (res.success) {
                        this.$message.success('批改成功')
                        this.gradeVisible = false
                        this.loadData()
                    } else {
                        this.$message.error(res.message || '批改失败')
                    }
                } catch (error) {
                    this.$message.error(error.message || '批改失败')
                } finally {
                    this.grading = false
                }
            })
        },
        isPreviewable (filename) {
            if (!filename) return false
            const ext = filename.split('.').pop().toLowerCase()
            const previewableExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'pdf', 'txt', 'html', 'htm', 'css', 'js', 'json', 'xml']
            return previewableExts.includes(ext)
        },
        previewAttachment (file) {
            if (!file.url) {
                this.$message.warning('文件链接不存在')
                return
            }
            // 如果是blob URL，提示用户下载
            if (file.url.startsWith('blob:')) {
                this.$message.warning('请下载文件后查看')
                this.downloadAttachment(file)
                return
            }
            // 在新标签页打开
            window.open(file.url, '_blank')
        },
        downloadAttachment (file) {
            if (!file.url) {
                this.$message.warning('文件链接不存在')
                return
            }

            // 如果是blob URL，无法跨会话访问
            if (file.url.startsWith('blob:')) {
                this.$message.warning('该文件为旧版临时文件，无法下载。请让学生重新提交作业。')
                return
            }

            // 构造完整的下载URL
            let downloadUrl = file.url
            // 如果是相对路径，需要拼接API基础地址
            if (downloadUrl.startsWith('/')) {
                const apiBaseUrl = getConfiguredBaseUrl(window._CONFIG && window._CONFIG.domianURL)
                downloadUrl = apiBaseUrl + downloadUrl
            }

            // 服务器文件，使用 fetch 下载
            this.$message.loading('正在下载...', 0)

            fetch(downloadUrl, {
                method: 'GET',
                headers: {
                    'X-Access-Token': localStorage.getItem('Access-Token') || ''
                }
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`)
                    }
                    return response.blob()
                })
                .then(blob => {
                    // 创建下载链接
                    const blobUrl = window.URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = blobUrl
                    link.download = file.name || 'download'
                    link.style.display = 'none'
                    document.body.appendChild(link)
                    link.click()

                    // 清理
                    setTimeout(() => {
                        document.body.removeChild(link)
                        window.URL.revokeObjectURL(blobUrl)
                    }, 100)

                    this.$message.destroy()
                    this.$message.success(`下载成功: ${file.name}`)
                })
                .catch(err => {
                    console.error('[ERROR] Download failed:', err)
                    this.$message.destroy()

                    // 回退方案：直接打开链接
                    window.open(file.url, '_blank')
                    this.$message.info('已在新窗口打开文件，请右键另存为')
                })
        }
    }
}
</script>

<style scoped lang="less">
.homework-submissions {
  padding: 24px;

  .title-extra {
    font-size: 14px;
    color: #666;
    margin-left: 8px;
  }

  .homework-info {
    margin-bottom: 16px;
  }

  .filter-section {
    margin: 16px 0;
  }

  .student-info {
    .name {
      font-weight: 600;
    }
    .no {
      color: #999;
      font-size: 12px;
    }
  }

  .score-text {
    font-weight: 600;
    &.pass {
      color: #52c41a;
    }
  }

  .submission-content {
    background: #fafafa;
    padding: 16px;
    border-radius: 4px;
    margin-bottom: 16px;
    min-height: 60px;

    .text-content {
      white-space: pre-wrap;
      margin: 0;
    }

    .empty-text {
      color: #999;
      text-align: center;
      font-style: italic;
    }
  }

  .attachment-list {
    .attachment-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border-bottom: 1px solid #f0f0f0;

      &:last-child {
        border-bottom: none;
      }

      .file-name {
        flex: 1;
      }
    }
  }
}
</style>
