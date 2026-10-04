<template>
  <div class="student-homework">
    <a-card>
      <div slot="title">
        <a-icon type="file-text" />
        作业中心
      </div>
      <div slot="extra">
        <debounced-search
          placeholder="搜索作业"
          v-model="searchText"
          @search="handleSearch"
          style="width: 200px;"
        />
      </div>

      <a-tabs v-model="activeTab">
        <a-tab-pane key="pending" tab="待完成">
          <a-list item-layout="horizontal" :data-source="filteredPendingHomework">
            <a-list-item slot="renderItem" slot-scope="item">
              <a-list-item-meta>
                <div slot="title">
                  {{ safe(item.homeworkTitle) }}
                  <a-tag v-if="isDeadlineNear(item.deadline)" color="red">即将截止</a-tag>
                </div>
                <div slot="description">
                  <p><a-icon type="book" /> 课程：{{ safe(item.courseName) }}</p>
                  <p><a-icon type="clock-circle" /> 截止时间：{{ item.deadline }}</p>
                  <p><a-icon type="info-circle" /> {{ item.description }}</p>
                  <p><a-icon type="file" /> 要求：{{ item.requirements }}</p>
                </div>
              </a-list-item-meta>
              <template slot="actions">
                <a-button type="primary" @click="startHomework(item)">开始完成</a-button>
                <a-button @click="viewHomeworkDetail(item)">查看详情</a-button>
              </template>
            </a-list-item>
          </a-list>
        </a-tab-pane>

        <a-tab-pane key="completed" tab="已完成">
          <a-list item-layout="horizontal" :data-source="filteredCompletedHomework">
            <a-list-item slot="renderItem" slot-scope="item">
              <a-list-item-meta>
                <div slot="title">
                  {{ safe(item.homeworkTitle) }}
                  <a-tag v-if="item.score >= 90" color="green">优秀</a-tag>
                  <a-tag v-else-if="item.score >= 70" color="blue">良好</a-tag>
                  <a-tag v-else-if="item.score >= 60" color="orange">及格</a-tag>
                  <a-tag v-else color="red">不及格</a-tag>
                </div>
                <div slot="description">
                  <p><a-icon type="book" /> 课程：{{ safe(item.courseName) }}</p>
                  <p><a-icon type="calendar" /> 提交时间：{{ item.submitTime }}</p>
                  <p><a-icon type="star" /> 得分：{{ item.score }}/100</p>
                  <p v-if="item.feedback"><a-icon type="message" /> 反馈：{{ safe(item.feedback || '暂无反馈') }}</p>
                </div>
              </a-list-item-meta>
              <template slot="actions">
                <a-button type="primary" @click="viewHomeworkResult(item)">查看详情</a-button>
                <a-button @click="downloadSubmission(item)">下载作品</a-button>
              </template>
            </a-list-item>
          </a-list>
        </a-tab-pane>

        <a-tab-pane key="submitted" tab="已提交待批改">
          <a-list item-layout="horizontal" :data-source="submittedHomework">
            <a-list-item slot="renderItem" slot-scope="item">
              <a-list-item-meta>
                <div slot="title">
                  {{ safe(item.homeworkTitle) }}
                  <a-tag color="blue">批改中</a-tag>
                </div>
                <div slot="description">
                  <p><a-icon type="book" /> 课程：{{ safe(item.courseName) }}</p>
                  <p><a-icon type="calendar" /> 提交时间：{{ item.submitTime }}</p>
                  <p><a-icon type="file" /> 文件：{{ item.fileName }}</p>
                </div>
              </a-list-item-meta>
              <template slot="actions">
                <a-button @click="viewSubmittedHomework(item)">查看提交内容</a-button>
              </template>
            </a-list-item>
          </a-list>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- 作业详情模态框 -->
    <a-modal
      title="作业详情"
      :visible="detailVisible"
      @cancel="detailVisible = false"
      width="800px"
      footer=""
    >
      <div v-if="selectedHomework">
        <h3>{{ selectedHomework.homeworkTitle }}</h3>
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="课程名称">{{ selectedHomework.courseName }}</a-descriptions-item>
          <a-descriptions-item label="截止时间">{{ selectedHomework.deadline }}</a-descriptions-item>
          <a-descriptions-item label="作业类型">{{ selectedHomework.type }}</a-descriptions-item>
          <a-descriptions-item label="满分">{{ selectedHomework.totalScore || 100 }}分</a-descriptions-item>
        </a-descriptions>
        <a-divider>作业要求</a-divider>
        <div v-html="sanitizedRequirements"></div>
        <a-divider>参考资料</a-divider>
        <ul v-if="selectedHomework.resources">
          <li v-for="resource in selectedHomework.resources" :key="resource.id">
            <a :href="resource.url" target="_blank">{{ safe(resource.name) }}</a>
          </li>
        </ul>
        <div style="text-align: center; margin-top: 20px;">
          <a-button type="primary" size="large" @click="startHomeworkFromDetail">开始完成作业</a-button>
        </div>
      </div>
    </a-modal>

    <!-- 作业提交模态框 -->
    <a-modal
      title="提交作业"
      :visible="submitVisible"
      @cancel="submitVisible = false"
      @ok="submitHomework"
      width="600px"
    >
      <a-form layout="vertical">
        <a-form-item label="作业标题">
          <a-input :value="currentHomework ? currentHomework.homeworkTitle : ''" disabled />
        </a-form-item>
        <a-form-item label="提交说明">
          <a-textarea v-model="submitForm.description" placeholder="请描述您的作业完成情况" :rows="3" />
        </a-form-item>
        <a-form-item label="作业文件">
          <secure-upload
            v-model="submitForm.fileList"
            :max-size="50 * 1024 * 1024"
            :allowed-extensions="['sb3', 'sb2', 'py', 'txt', 'html', 'css', 'zip']"
            :max-count="10"
            :multiple="true"
            button-text="选择文件"
            :show-tips="true"
          >
            <a-button>
              <a-icon type="upload" />
              选择文件
            </a-button>
          </secure-upload>
        </a-form-item>
        <a-form-item label="作业链接">
          <a-input v-model="submitForm.url" placeholder="如果是在线作品，请填写链接" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 查看已提交作业内容模态框 -->
    <a-modal
      title="查看提交内容"
      :visible="submittedVisible"
      @cancel="submittedVisible = false"
      width="800px"
      footer=""
    >
      <div v-if="selectedSubmitted">
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="作业标题">{{ selectedSubmitted.homeworkTitle }}</a-descriptions-item>
          <a-descriptions-item label="提交时间">{{ selectedSubmitted.submitTime }}</a-descriptions-item>
          <a-descriptions-item label="状态" :span="2">
            <a-tag color="blue">等待批改</a-tag>
          </a-descriptions-item>
        </a-descriptions>
        <a-divider>已提交内容</a-divider>
        <div class="submission-content">
          <p v-if="selectedSubmitted.content" class="text-content">{{ selectedSubmitted.content }}</p>
          <div v-else class="empty-text">暂无文字说明</div>
        </div>
        <a-divider>附件列表</a-divider>
        <div class="attachment-list" v-if="submittedAttachments && submittedAttachments.length > 0">
          <div v-for="(file, index) in submittedAttachments" :key="index" class="attachment-item">
            <a-icon type="file" />
            <span class="file-name">{{ file.name }}</span>
            <a-button v-if="isPreviewable(file.name)" type="link" size="small" @click="previewFile(file)">
              预览
            </a-button>
            <a-button type="link" size="small" @click="downloadFile(file)">
              下载
            </a-button>
          </div>
        </div>
        <div v-else class="empty-text">无附件</div>
      </div>
    </a-modal>

    <!-- 作业结果查看模态框 -->
    <a-modal
      title="作业批改结果"
      :visible="resultVisible"
      @cancel="resultVisible = false"
      width="800px"
      footer=""
    >
      <div v-if="selectedResult">
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="作业标题">{{ selectedResult.homeworkTitle }}</a-descriptions-item>
          <a-descriptions-item label="得分">
            <span :style="{ color: getScoreColor(selectedResult.score), fontSize: '18px', fontWeight: 'bold' }">
              {{ selectedResult.score }}/100
            </span>
          </a-descriptions-item>
          <a-descriptions-item label="提交时间">{{ selectedResult.submitTime }}</a-descriptions-item>
          <a-descriptions-item label="批改时间">{{ selectedResult.gradeTime }}</a-descriptions-item>
        </a-descriptions>
        <a-divider>教师反馈</a-divider>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
          {{ safe(selectedResult.feedback || '暂无反馈') }}
        </div>
        <a-divider>提交内容</a-divider>
        <p><strong>说明：</strong>{{ selectedResult.description }}</p>
        <p v-if="selectedResult.url"><strong>链接：</strong><a :href="selectedResult.url" target="_blank">{{ selectedResult.url }}</a></p>
        <p v-if="selectedResult.files && selectedResult.files.length > 0"><strong>文件：</strong></p>
        <ul v-if="selectedResult.files">
          <li v-for="file in selectedResult.files" :key="file.id">
            <a-icon type="file" /> {{ file.name }}
            <a-button size="small" @click="downloadFile(file)">下载</a-button>
          </li>
        </ul>
      </div>
    </a-modal>
  </div>
</template>

<script>
import DebouncedSearch from '@/components/DebouncedSearch'
import SecureUpload from '@/components/SecureUpload'
import { sanitizeHTML, sanitizeInput } from '@/utils/security'
import { getStudentHomework } from '@/api/homework'
import { getConfiguredBaseUrl } from '@/utils/runtimeBaseUrl'

export default {
    name: 'StudentHomework',
    components: {
        DebouncedSearch,
        SecureUpload
    },
    data () {
        return {
            activeTab: 'pending',
            searchText: '',
            detailVisible: false,
            submitVisible: false,
            resultVisible: false,
            submittedVisible: false,
            selectedHomework: null,
            selectedResult: null,
            selectedSubmitted: null,
            currentHomework: null,
            submitForm: {
                description: '',
                fileList: [],
                url: ''
            },
            pendingHomework: [],
            completedHomework: [],
            submittedHomework: [],
            listLoading: false
        }
    },
    mounted () {
        this.loadHomework()
    },
    computed: {
        sanitizedRequirements () {
            if (!this.selectedHomework || !this.selectedHomework.requirements) return ''
            return sanitizeHTML(this.selectedHomework.requirements)
        },
        // 解析已提交作业的附件列表
        submittedAttachments () {
            if (!this.selectedSubmitted || !this.selectedSubmitted.attachments) {
                return []
            }
            try {
                let attachments = this.selectedSubmitted.attachments
                if (typeof attachments === 'string') {
                    attachments = JSON.parse(attachments)
                }
                return Array.isArray(attachments) ? attachments : []
            } catch (e) {
                console.error('解析附件失败:', e)
                return []
            }
        },
        filteredPendingHomework () {
            if (!this.searchText) {
                return this.pendingHomework
            }
            return this.pendingHomework.filter(homework =>
                homework.homeworkTitle.includes(this.searchText) ||
        homework.courseName.includes(this.searchText)
            )
        },
        filteredCompletedHomework () {
            if (!this.searchText) {
                return this.completedHomework
            }
            return this.completedHomework.filter(homework =>
                homework.homeworkTitle.includes(this.searchText) ||
        homework.courseName.includes(this.searchText)
            )
        }
    },
    methods: {
        async loadHomework () {
            this.listLoading = true
            try {
                const res = await getStudentHomework()
                if (res.success && res.result) {
                    const records = (res.result.records || []).map(this.normalizeHomework)
                    this.pendingHomework = records.filter(item => item.submissionStatus === 'not_submitted')
                    this.submittedHomework = records.filter(item => item.submissionStatus === 'submitted')
                    this.completedHomework = records.filter(item => item.submissionStatus === 'graded')
                } else {
                    this.$message.warning(res.message || '获取作业列表失败')
                }
            } catch (error) {
                this.$message.error(error.message || '加载作业列表失败，请稍后重试')
            } finally {
                this.listLoading = false
            }
        },
        normalizeHomework (item) {
            // 解析附件
            let attachments = []
            if (item.attachments) {
                try {
                    attachments = typeof item.attachments === 'string' ? JSON.parse(item.attachments) : item.attachments
                } catch (e) {
                    console.error('解析附件失败:', e, 'raw:', item.attachments)
                }
            }

            // 确保attachments是数组
            if (!Array.isArray(attachments)) {
                attachments = []
            }

            return {
                id: item.id,
                homeworkTitle: item.homework_title,
                courseName: item.course_name || '未分配课程',
                deadline: item.deadline,
                description: item.description,
                requirements: item.requirements,
                type: item.homework_type,
                totalScore: item.total_score,
                passScore: item.pass_score,
                submissionStatus: item.submission_status || 'not_submitted',
                submitTime: item.submitted_time,
                score: item.score,
                submissionId: item.submission_id,
                allowLate: !!item.allow_late_submit,
                content: item.content,
                attachments: attachments,
                feedback: item.feedback
            }
        },
        safe (text) {
            return sanitizeInput(text, { maxLength: 200 })
        },
        handleSearch () {
            // 搜索功能在computed中已实现
        },
        isDeadlineNear (deadline) {
            const today = new Date()
            const deadlineDate = new Date(deadline)
            const diffTime = deadlineDate - today
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            return diffDays <= 3 && diffDays >= 0
        },
        startHomework (homework) {
            this.currentHomework = homework
            this.submitVisible = true
        },
        viewHomeworkDetail (homework) {
            this.selectedHomework = homework
            this.detailVisible = true
        },
        startHomeworkFromDetail () {
            this.detailVisible = false
            this.currentHomework = this.selectedHomework
            this.submitVisible = true
        },
        viewHomeworkResult (homework) {
            this.selectedResult = homework
            this.resultVisible = true
        },
        viewSubmittedHomework (homework) {
            this.selectedSubmitted = homework
            this.submittedVisible = true
        },
        downloadSubmission (homework) {
            this.$message.success(`下载作品：${homework.homeworkTitle}`)
        },
        isPreviewable (filename) {
            if (!filename) return false
            const ext = filename.split('.').pop().toLowerCase()
            const previewableExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'pdf', 'txt', 'html', 'htm', 'css', 'js', 'json', 'xml']
            return previewableExts.includes(ext)
        },
        previewFile (file) {
            if (!file.url) {
                this.$message.warning('文件链接不存在')
                return
            }
            // 如果是blob URL，提示用户下载
            if (file.url.startsWith('blob:')) {
                this.$message.warning('请下载文件后查看')
                this.downloadFile(file)
                return
            }
            // 在新标签页打开
            window.open(file.url, '_blank')
        },
        downloadFile (file) {
            if (!file.url) {
                this.$message.warning('文件链接不存在')
                return
            }

            // 如果是blob URL，说明文件没有正确上传到服务器
            if (file.url.startsWith('blob:')) {
                this.$message.error('该文件为临时文件，无法下载。请重新提交作业上传文件。')
                return
            }

            // 构造完整的下载URL
            let downloadUrl = file.url

            // 如果是相对路径，需要拼接API基础地址
            if (downloadUrl.startsWith('/')) {
                const apiBaseUrl = getConfiguredBaseUrl(window._CONFIG && window._CONFIG.domianURL)
                downloadUrl = apiBaseUrl + downloadUrl
            }

            // 显示下载中提示
            const hideLoading = this.$message.loading('正在下载...', 0)

            // 使用 fetch 下载文件
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
                    hideLoading()

                    // 创建 blob URL
                    const blobUrl = window.URL.createObjectURL(blob)

                    // 创建隐藏的 a 标签并触发下载
                    const link = document.createElement('a')
                    link.style.display = 'none'
                    link.href = blobUrl
                    link.download = file.name || 'download'

                    // 添加到 body
                    document.body.appendChild(link)

                    // 触发点击
                    link.click()

                    // 延迟清理
                    setTimeout(() => {
                        document.body.removeChild(link)
                        window.URL.revokeObjectURL(blobUrl)
                    }, 200)

                    this.$message.success(`下载成功: ${file.name}`)
                })
                .catch(err => {
                    hideLoading()
                    console.error('[ERROR] Download failed:', err)

                    // 回退方案：直接在新窗口打开
                    this.$message.warning('下载失败，尝试在新窗口打开')
                    window.open(downloadUrl, '_blank')
                })
        },
        submitHomework () {
            // 添加输入清理
            const cleanedDesc = sanitizeInput(this.submitForm.description, { maxLength: 1000, allowSpaces: true })
            this.submitForm.description = cleanedDesc

            if (this.submitForm.fileList.length === 0 && !this.submitForm.url) {
                this.$message.error('请上传作业文件或填写作业链接')
                return
            }

            // 检查是否有文件上传失败（blob URL）
            const hasBlobUrl = this.submitForm.fileList.some(f => {
                const url = f.url || ''
                return url.startsWith('blob:')
            })

            if (hasBlobUrl) {
                this.$message.error('部分文件上传失败，请删除后重新上传')
                return
            }

            // 构造提交数据
            const submissionData = {
                homeworkId: this.currentHomework.id,
                content: this.submitForm.description,
                attachments: this.submitForm.fileList.map(f => {
                    let fileUrl = f.url
                    // 确保使用服务器URL
                    if (!fileUrl || fileUrl.startsWith('blob:')) {
                        console.error('[ERROR] Invalid file URL:', fileUrl)
                        return null
                    }

                    return {
                        name: f.name,
                        url: fileUrl,
                        size: f.size,
                        type: f.type
                    }
                }).filter(Boolean),
                // 兼容编辑器字段
                workName: this.currentHomework.homeworkTitle,
                workFile: '',
                workType: 1
            }

            // 设置workFile
            if (this.submitForm.fileList.length > 0) {
                const firstFile = this.submitForm.fileList[0]
                let firstFileUrl = firstFile.url
                if (!firstFileUrl && firstFile.response) {
                    if (firstFile.response.result && firstFile.response.result.fullUrl) {
                        firstFileUrl = firstFile.response.result.fullUrl
                    } else {
                        firstFileUrl = firstFile.response.message
                    }
                }
                submissionData.workFile = firstFileUrl
            }

            // 如果有链接，添加到attachments中
            if (this.submitForm.url) {
                submissionData.attachments.push({
                    name: '作业链接',
                    url: this.submitForm.url,
                    type: 'link'
                })
            }

      // 调用提交API
      import('@/api/homework').then(({ submitHomework }) => {
          submitHomework(submissionData).then(res => {
              if (res.success) {
                  this.$message.success('作业提交成功！')
                  this.submitVisible = false

                  // 重新加载列表
                  this.loadHomework()

                  // 重置表单
                  this.submitForm = {
                      description: '',
                      fileList: [],
                      url: ''
                  }
              } else {
                  this.$message.error(res.message || '提交失败')
              }
          }).catch(err => {
              this.$message.error('提交失败：' + (err.message || '未知错误'))
          })
      })
        },
        getScoreColor (score) {
            if (score >= 90) return '#52c41a'
            if (score >= 70) return '#1890ff'
            if (score >= 60) return '#fa8c16'
            return '#f5222d'
        }
    }
}
</script>

<style scoped lang="less">
.student-homework {
  padding: 24px;

  .ant-list-item {
    transition: all 0.3s;

    &:hover {
      background: #f5f5f5;
      border-radius: 4px;
    }
  }

  .ant-tag {
    margin-left: 8px;
  }

  .ant-descriptions {
    margin-bottom: 16px;
  }

  .ant-modal {
    .ant-descriptions-item-content {
      word-break: break-all;
    }
  }

  .submission-content {
    background: #f5f5f5;
    padding: 15px;
    border-radius: 5px;
    min-height: 60px;

    .text-content {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .empty-text {
      color: #999;
      text-align: center;
      padding: 20px 0;
    }
  }

  .attachment-list {
    .attachment-item {
      display: flex;
      align-items: center;
      padding: 10px;
      margin-bottom: 8px;
      background: #fafafa;
      border-radius: 4px;
      border: 1px solid #e8e8e8;

      .anticon {
        margin-right: 8px;
        color: #1890ff;
      }

      .file-name {
        flex: 1;
        margin-right: 12px;
      }
    }
  }

  .empty-text {
    color: #999;
    text-align: center;
    padding: 20px 0;
  }
}
</style>
