<template>
  <div class="student-assignment">
    <div class="assignment-header">
      <h2>{{ assignment.title }}</h2>
      <div class="assignment-meta">
        <el-tag :type="getStatusTagType(assignment.status)">
          {{ getStatusName(assignment.status) }}
        </el-tag>
        <span class="subject-tag">
          <el-tag :type="getSubjectTagType(assignment.subject)">
            {{ getSubjectName(assignment.subject) }}
          </el-tag>
        </span>
        <span class="time-info">
          截止时间: {{ formatTime(assignment.dueTime) }}
        </span>
      </div>
    </div>

    <div class="assignment-content">
      <el-row :gutter="20">
        <el-col :span="16">
          <el-card>
            <div slot="header">
              <span>作业内容</span>
            </div>

            <div class="assignment-description">
              <p>{{ assignment.description }}</p>
            </div>

            <!-- 在线答题部分 -->
            <div v-if="assignment.type === 'online' || assignment.type === 'mixed'">
              <el-divider>在线答题</el-divider>

              <div class="questions-container">
                <div
                  v-for="(question, index) in assignment.questions"
                  :key="index"
                  class="question-item"
                >
                  <div class="question-header">
                    <span class="question-number">{{ index + 1 }}.</span>
                    <span class="question-score">({{ question.score }}分)</span>
                  </div>

                  <div class="question-content">
                    {{ question.content }}
                  </div>

                  <div class="question-answer">
                    <!-- 单选题 -->
                    <div v-if="question.type === 'single_choice'">
                      <el-radio-group v-model="answers[index]">
                        <el-radio
                          v-for="(option, optionIndex) in question.options"
                          :key="optionIndex"
                          :label="optionIndex"
                          class="option-radio"
                        >
                          {{ String.fromCharCode(65 + optionIndex) }}. {{ option.content }}
                        </el-radio>
                      </el-radio-group>
                    </div>

                    <!-- 多选题 -->
                    <div v-if="question.type === 'multiple_choice'">
                      <el-checkbox-group v-model="answers[index]">
                        <el-checkbox
                          v-for="(option, optionIndex) in question.options"
                          :key="optionIndex"
                          :label="optionIndex"
                          class="option-checkbox"
                        >
                          {{ String.fromCharCode(65 + optionIndex) }}. {{ option.content }}
                        </el-checkbox>
                      </el-checkbox-group>
                    </div>

                    <!-- 判断题 -->
                    <div v-if="question.type === 'true_false'">
                      <el-radio-group v-model="answers[index]">
                        <el-radio :label="true">正确</el-radio>
                        <el-radio :label="false">错误</el-radio>
                      </el-radio-group>
                    </div>

                    <!-- 填空题 -->
                    <div v-if="question.type === 'fill_blank'">
                      <el-input
                        v-model="answers[index]"
                        placeholder="请输入答案"
                        maxlength="200"
                      ></el-input>
                    </div>

                    <!-- 简答题 -->
                    <div v-if="question.type === 'essay'">
                      <el-input
                        v-model="answers[index]"
                        type="textarea"
                        :rows="6"
                        placeholder="请输入答案"
                        maxlength="2000"
                        show-word-limit
                      ></el-input>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 文件提交部分 -->
            <div v-if="assignment.type === 'file' || assignment.type === 'mixed'">
              <el-divider>文件提交</el-divider>

              <div class="file-upload-section">
                <div v-if="assignment.fileRequirement" class="file-requirement">
                  <h4>文件要求:</h4>
                  <p>{{ assignment.fileRequirement }}</p>
                </div>

                <el-upload
                  ref="fileUpload"
                  :action="uploadUrl"
                  :headers="uploadHeaders"
                  :data="uploadData"
                  :file-list="fileList"
                  :before-upload="beforeUpload"
                  :on-success="handleUploadSuccess"
                  :on-error="handleUploadError"
                  :on-remove="handleRemoveFile"
                  :limit="5"
                  multiple
                  drag
                >
                  <i class="el-icon-upload"></i>
                  <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
                  <div class="el-upload__tip" slot="tip">
                    支持格式: {{ getAllowedFileTypesText() }}，
                    单个文件不超过 {{ assignment.maxFileSize || 100 }}MB
                  </div>
                </el-upload>
              </div>
            </div>

            <div class="submission-actions">
              <el-button @click="saveProgress" :loading="saving">保存进度</el-button>
              <el-button
                type="primary"
                @click="submitAssignment"
                :loading="submitting"
                :disabled="!canSubmit"
              >
                提交作业
              </el-button>
            </div>
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card>
            <div slot="header">
              <span>作业信息</span>
            </div>

            <div class="assignment-info">
              <div class="info-item">
                <label>总分:</label>
                <span>{{ assignment.totalScore }}分</span>
              </div>
              <div class="info-item">
                <label>开始时间:</label>
                <span>{{ formatTime(assignment.startTime) }}</span>
              </div>
              <div class="info-item">
                <label>截止时间:</label>
                <span :class="{ 'text-danger': isOverdue() }">
                  {{ formatTime(assignment.dueTime) }}
                </span>
              </div>
              <div class="info-item">
                <label>剩余时间:</label>
                <span :class="{ 'text-danger': isOverdue() }">
                  {{ getTimeRemaining() }}
                </span>
              </div>
            </div>

            <el-divider></el-divider>

            <div class="progress-info">
              <h4>答题进度</h4>
              <el-progress
                :percentage="getProgressPercentage()"
                :status="getProgressStatus()"
                :stroke-width="10"
              ></el-progress>
              <p class="progress-text">
                已完成 {{ getAnsweredCount() }} / {{ getTotalQuestions() }} 题
              </p>
            </div>

            <div v-if="submission" class="submission-info">
              <el-divider></el-divider>
              <h4>提交记录</h4>
              <div class="info-item">
                <label>提交状态:</label>
                <el-tag :type="getSubmissionStatusType(submission.status)">
                  {{ getSubmissionStatusName(submission.status) }}
                </el-tag>
              </div>
              <div class="info-item">
                <label>提交时间:</label>
                <span>{{ formatTime(submission.submitTime) }}</span>
              </div>
              <div v-if="submission.score !== null" class="info-item">
                <label>得分:</label>
                <span class="score">{{ submission.score }} / {{ assignment.totalScore }}</span>
              </div>
              <div v-if="submission.feedback" class="feedback">
                <label>教师评语:</label>
                <p>{{ submission.feedback }}</p>
              </div>
            </div>
          </el-card>

          <!-- 自动保存提示 -->
          <el-card v-if="autoSaveEnabled" style="margin-top: 20px">
            <div class="auto-save-info">
              <i class="el-icon-time"></i>
              <span>自动保存已开启</span>
              <div class="last-save-time">
                上次保存: {{ lastSaveTime ? formatTime(lastSaveTime) : '未保存' }}
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 提交确认对话框 -->
    <el-dialog
      title="确认提交"
      :visible.sync="showSubmitDialog"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="submit-confirm">
        <p><i class="el-icon-warning" style="color: #e6a23c;"></i> 确定要提交作业吗？</p>
        <p>提交后将无法再修改答案，请确认所有题目都已完成。</p>

        <div class="submit-summary">
          <p>答题完成度: {{ getProgressPercentage() }}%</p>
          <p v-if="getUnAnsweredQuestions().length > 0" style="color: #f56c6c;">
            未完成题目: {{ getUnAnsweredQuestions().join(', ') }}
          </p>
        </div>
      </div>

      <span slot="footer" class="dialog-footer">
        <el-button @click="showSubmitDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmSubmit">确认提交</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
    name: 'StudentAssignment',
    props: {
        assignmentId: {
            type: [String, Number],
            required: true
        }
    },
    data () {
        return {
            assignment: {},
            submission: null,
            answers: {},
            fileList: [],
            saving: false,
            submitting: false,
            showSubmitDialog: false,
            autoSaveEnabled: true,
            lastSaveTime: null,
            autoSaveTimer: null
        }
    },
    computed: {
        uploadUrl () {
            return `/api/assignments/${this.assignmentId}/submit/file`
        },
        uploadHeaders () {
            return {
                'Authorization': `Bearer ${this.$store.getters.token}`
            }
        },
        uploadData () {
            return {
                assignmentId: this.assignmentId,
                studentId: this.$store.getters.currentUser.id
            }
        },
        canSubmit () {
            if (this.isOverdue() && !(this.assignment.settings && this.assignment.settings.includes('allowLateSubmission'))) {
                return false
            }
            return this.getProgressPercentage() > 0
        }
    },
    mounted () {
        this.loadAssignment()
        this.loadSubmission()
        this.startAutoSave()
    },
    beforeDestroy () {
        this.stopAutoSave()
    },
    methods: {
        async loadAssignment () {
            try {
                const response = await this.$http.get(`/api/assignments/${this.assignmentId}`)
                this.assignment = response.data

                this.initializeAnswers()
            } catch (error) {
                console.error('加载作业失败:', error)
                this.$message.error('加载作业失败')
            }
        },

        async loadSubmission () {
            try {
                const response = await this.$http.get(`/api/assignments/${this.assignmentId}/submission`)
                this.submission = response.data

                if (this.submission && this.submission.answers) {
                    this.answers = { ...this.submission.answers }
                }

                if (this.submission && this.submission.files) {
                    this.fileList = this.submission.files.map(file => ({
                        name: file.originalName,
                        url: file.url,
                        response: { fileId: file.id }
                    }))
                }
            } catch (error) {
                if (error.response && error.response.status !== 404) {
                    console.error('加载提交记录失败:', error)
                }
            }
        },

        initializeAnswers () {
            if (!this.assignment.questions) return

            this.assignment.questions.forEach((question, index) => {
                if (this.answers[index] === undefined) {
                    if (question.type === 'multiple_choice') {
                        this.answers[index] = []
                    } else {
                        this.answers[index] = null
                    }
                }
            })
        },

        async saveProgress () {
            this.saving = true
            try {
                await this.$http.post(`/api/assignments/${this.assignmentId}/save`, {
                    answers: this.answers,
                    files: this.fileList.map(file => file.response && file.response.fileId).filter(Boolean)
                })

                this.lastSaveTime = new Date()
                this.$message.success('保存成功')
            } catch (error) {
                console.error('保存失败:', error)
                this.$message.error('保存失败')
            } finally {
                this.saving = false
            }
        },

        submitAssignment () {
            if (!this.canSubmit) {
                this.$message.warning('无法提交作业')
                return
            }

            this.showSubmitDialog = true
        },

        async confirmSubmit () {
            this.submitting = true
            this.showSubmitDialog = false

            try {
                await this.$http.post(`/api/assignments/${this.assignmentId}/submit`, {
                    answers: this.answers,
                    files: this.fileList.map(file => file.response && file.response.fileId).filter(Boolean)
                })

                this.$message.success('作业提交成功')
                this.loadSubmission()
                this.stopAutoSave()
            } catch (error) {
                console.error('提交失败:', error)
                this.$message.error('提交失败')
            } finally {
                this.submitting = false
            }
        },

        startAutoSave () {
            if (this.autoSaveEnabled) {
                this.autoSaveTimer = setInterval(() => {
                    if (this.getProgressPercentage() > 0) {
                        this.saveProgress()
                    }
                }, 30000) // 每30秒自动保存
            }
        },

        stopAutoSave () {
            if (this.autoSaveTimer) {
                clearInterval(this.autoSaveTimer)
                this.autoSaveTimer = null
            }
        },

        beforeUpload (file) {
            const maxSize = (this.assignment.maxFileSize || 100) * 1024 * 1024 // MB to bytes
            if (file.size > maxSize) {
                this.$message.error('文件大小超过限制（最大' + (this.assignment.maxFileSize || 100) + 'MB），请压缩文件后重新上传')
                return false
            }

            const allowedTypes = this.assignment.allowedFileTypes
            if (allowedTypes && allowedTypes.length > 0) {
                const fileExt = file.name.split('.').pop().toLowerCase()
                const isAllowed = this.checkFileType(fileExt, allowedTypes)

                if (!isAllowed) {
                    this.$message.error('文件类型不支持')
                    return false
                }
            }

            return true
        },

        checkFileType (ext, allowedTypes) {
            const typeMap = {
                docx: ['doc', 'docx'],
                pdf: ['pdf'],
                image: ['jpg', 'jpeg', 'png', 'gif'],
                archive: ['zip', 'rar', '7z'],
                txt: ['txt']
            }

            return allowedTypes.some(type => {
                return typeMap[type] && typeMap[type].includes(ext)
            })
        },

        handleUploadSuccess (response, file) {
            this.$message.success('文件上传成功')
        },

        handleUploadError (error) {
            console.error('上传失败:', error)
            this.$message.error('文件上传失败')
        },

        handleRemoveFile (file) {
            // 如果需要删除服务器上的文件，可以在这里调用API
        },

        getAllowedFileTypesText () {
            const typeNames = {
                docx: 'Word文档',
                pdf: 'PDF文档',
                image: '图片',
                archive: '压缩包',
                txt: '文本文件'
            }

            return (this.assignment.allowedFileTypes || [])
                .map(type => typeNames[type] || type)
                .join(', ') || '所有格式'
        },

        getTotalQuestions () {
            return this.assignment.questions ? this.assignment.questions.length : 0
        },

        getAnsweredCount () {
            if (!this.assignment.questions) return 0

            return this.assignment.questions.filter((question, index) => {
                const answer = this.answers[index]
                if (question.type === 'multiple_choice') {
                    return answer && answer.length > 0
                }
                return answer !== null && answer !== '' && answer !== undefined
            }).length
        },

        getProgressPercentage () {
            const total = this.getTotalQuestions()
            if (total === 0) return 100

            const answered = this.getAnsweredCount()
            return Math.round((answered / total) * 100)
        },

        getProgressStatus () {
            const percentage = this.getProgressPercentage()
            if (percentage === 100) return 'success'
            if (percentage >= 50) return ''
            return 'exception'
        },

        getUnAnsweredQuestions () {
            if (!this.assignment.questions) return []

            return this.assignment.questions
                .map((question, index) => {
                    const answer = this.answers[index]
                    const isAnswered = question.type === 'multiple_choice'
                        ? answer && answer.length > 0
                        : answer !== null && answer !== '' && answer !== undefined

                    return isAnswered ? null : index + 1
                })
                .filter(num => num !== null)
        },

        isOverdue () {
            if (!this.assignment.dueTime) return false
            return new Date() > new Date(this.assignment.dueTime)
        },

        getTimeRemaining () {
            if (!this.assignment.dueTime) return '无限制'

            const now = new Date()
            const due = new Date(this.assignment.dueTime)
            const diff = due - now

            if (diff <= 0) return '已截止'

            const days = Math.floor(diff / (1000 * 60 * 60 * 24))
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

            if (days > 0) return `${days}天${hours}小时`
            if (hours > 0) return `${hours}小时${minutes}分钟`
            return `${minutes}分钟`
        },

        getStatusTagType (status) {
            const types = { draft: 'info', active: 'success', closed: 'danger' }
            return types[status] || ''
        },

        getStatusName (status) {
            const names = { draft: '未发布', active: '进行中', closed: '已截止' }
            return names[status] || status
        },

        getSubjectTagType (subject) {
            const types = { math: 'primary', chinese: 'success', english: 'info', physics: 'warning', chemistry: 'danger' }
            return types[subject] || ''
        },

        getSubjectName (subject) {
            const names = { math: '数学', chinese: '语文', english: '英语', physics: '物理', chemistry: '化学' }
            return names[subject] || subject
        },

        getSubmissionStatusType (status) {
            const types = { submitted: 'success', graded: 'primary', returned: 'warning' }
            return types[status] || ''
        },

        getSubmissionStatusName (status) {
            const names = { submitted: '已提交', graded: '已批改', returned: '已返回' }
            return names[status] || status
        },

        formatTime (time) {
            if (!time) return ''
            return new Date(time).toLocaleString('zh-CN')
        }
    }
}
</script>

<style scoped>
.student-assignment {
  padding: 20px;
}

.assignment-header {
  margin-bottom: 20px;
}

.assignment-header h2 {
  margin: 0 0 10px 0;
  color: #333;
}

.assignment-meta {
  display: flex;
  align-items: center;
  gap: 15px;
}

.subject-tag,
.time-info {
  display: flex;
  align-items: center;
}

.assignment-description {
  margin-bottom: 20px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 4px;
}

.questions-container {
  margin-top: 20px;
}

.question-item {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e6ebf5;
  border-radius: 4px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.question-number {
  font-weight: bold;
  color: #409eff;
}

.question-score {
  color: #909399;
  font-size: 14px;
}

.question-content {
  margin-bottom: 15px;
  font-size: 16px;
  line-height: 1.5;
}

.question-answer {
  margin-left: 20px;
}

.option-radio,
.option-checkbox {
  display: block;
  margin-bottom: 10px;
}

.file-upload-section {
  margin-top: 20px;
}

.file-requirement {
  margin-bottom: 15px;
  padding: 10px;
  background: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 4px;
}

.file-requirement h4 {
  margin: 0 0 5px 0;
  color: #409eff;
}

.submission-actions {
  margin-top: 30px;
  text-align: right;
  padding-top: 20px;
  border-top: 1px solid #e6ebf5;
}

.assignment-info .info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.assignment-info label {
  font-weight: bold;
  color: #606266;
}

.text-danger {
  color: #f56c6c;
}

.progress-info {
  margin-top: 20px;
}

.progress-info h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.progress-text {
  text-align: center;
  margin-top: 10px;
  color: #909399;
  font-size: 14px;
}

.submission-info .info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.score {
  font-weight: bold;
  color: #67c23a;
}

.feedback {
  margin-top: 15px;
}

.feedback label {
  display: block;
  margin-bottom: 5px;
}

.feedback p {
  margin: 0;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}

.auto-save-info {
  text-align: center;
  color: #909399;
}

.auto-save-info i {
  margin-right: 5px;
  color: #409eff;
}

.last-save-time {
  font-size: 12px;
  margin-top: 5px;
}

.submit-confirm {
  text-align: center;
}

.submit-summary {
  margin-top: 15px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
}
</style>
