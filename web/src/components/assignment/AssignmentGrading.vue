<template>
  <div class="assignment-grading">
    <div class="grading-header">
      <h2>{{ assignment.title }} - 批改作业</h2>
      <div class="header-actions">
        <el-button @click="autoGradeAll" :loading="autoGrading">
          <i class="el-icon-magic-stick"></i> 自动批改
        </el-button>
        <el-button @click="exportGrades">
          <i class="el-icon-download"></i> 导出成绩
        </el-button>
        <el-button @click="batchGrade">
          <i class="el-icon-edit"></i> 批量评分
        </el-button>
      </div>
    </div>

    <div class="grading-stats">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-item">
              <div class="stats-value">{{ submissionStats.total }}</div>
              <div class="stats-label">总提交数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-item">
              <div class="stats-value text-success">{{ submissionStats.graded }}</div>
              <div class="stats-label">已批改</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-item">
              <div class="stats-value text-warning">{{ submissionStats.pending }}</div>
              <div class="stats-label">待批改</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-item">
              <div class="stats-value">{{ averageScore.toFixed(1) }}</div>
              <div class="stats-label">平均分</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="filter-controls">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-select v-model="filter.status" placeholder="批改状态" clearable>
            <el-option label="全部" value=""></el-option>
            <el-option label="已提交" value="submitted"></el-option>
            <el-option label="已批改" value="graded"></el-option>
            <el-option label="需人工批改" value="manual_required"></el-option>
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-select v-model="filter.class" placeholder="班级筛选" clearable>
            <el-option label="全部班级" value=""></el-option>
            <el-option
              v-for="cls in classList"
              :key="cls.id"
              :label="cls.name"
              :value="cls.id"
            ></el-option>
          </el-select>
        </el-col>
        <el-col :span="8">
          <el-input
            v-model="filter.keyword"
            placeholder="搜索学生姓名"
            prefix-icon="el-icon-search"
            clearable
          ></el-input>
        </el-col>
      </el-row>
    </div>

    <el-table
      :data="filteredSubmissions"
      v-loading="loading"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="50"></el-table-column>

      <el-table-column prop="student.name" label="学生姓名" width="120">
        <template slot-scope="scope">
          <div class="student-info">
            <div>{{ scope.row.student.name }}</div>
            <div class="student-id">{{ scope.row.student.studentId }}</div>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="student.class" label="班级" width="100"></el-table-column>

      <el-table-column prop="submitTime" label="提交时间" width="150" sortable>
        <template slot-scope="scope">
          {{ formatTime(scope.row.submitTime) }}
        </template>
      </el-table-column>

      <el-table-column prop="status" label="状态" width="120">
        <template slot-scope="scope">
          <el-tag :type="getStatusTagType(scope.row.status)">
            {{ getStatusName(scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="score" label="得分" width="100">
        <template slot-scope="scope">
          <div v-if="scope.row.score !== null">
            <span :class="getScoreClass(scope.row.score)">
              {{ scope.row.score }} / {{ assignment.totalScore }}
            </span>
          </div>
          <span v-else class="text-muted">未评分</span>
        </template>
      </el-table-column>

      <el-table-column label="进度" width="150">
        <template slot-scope="scope">
          <el-progress
            :percentage="getGradingProgress(scope.row)"
            :status="getProgressStatus(scope.row)"
            :stroke-width="8"
          ></el-progress>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="200" fixed="right">
        <template slot-scope="scope">
          <el-button size="mini" @click="viewSubmission(scope.row)">查看</el-button>
          <el-button size="mini" type="primary" @click="gradeSubmission(scope.row)">
            批改
          </el-button>
          <el-button
            v-if="scope.row.score !== null"
            size="mini"
            type="success"
            @click="returnSubmission(scope.row)"
          >
            返回
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrapper">
      <el-pagination
        @current-change="handlePageChange"
        :current-page="pagination.page"
        :page-size="pagination.size"
        layout="total, prev, pager, next"
        :total="pagination.total"
      ></el-pagination>
    </div>

    <!-- 批改详情对话框 -->
    <el-dialog
      title="批改作业"
      :visible.sync="showGradingDialog"
      width="90%"
      :close-on-click-modal="false"
      custom-class="grading-dialog"
    >
      <div v-if="currentSubmission" class="grading-content">
        <el-row :gutter="20">
          <el-col :span="16">
            <div class="submission-content">
              <div class="student-header">
                <h3>{{ currentSubmission.student.name }} 的作业</h3>
                <div class="submission-info">
                  <span>提交时间: {{ formatTime(currentSubmission.submitTime) }}</span>
                  <span>班级: {{ currentSubmission.student.class }}</span>
                </div>
              </div>

              <!-- 在线答题内容 -->
              <div v-if="assignment.type === 'online' || assignment.type === 'mixed'">
                <h4>答题内容</h4>
                <div
                  v-for="(question, index) in assignment.questions"
                  :key="index"
                  class="question-grading"
                >
                  <div class="question-header">
                    <span class="question-number">{{ index + 1 }}.</span>
                    <span class="question-score">({{ question.score }}分)</span>
                  </div>

                  <div class="question-content">
                    {{ question.content }}
                  </div>

                  <div class="student-answer">
                    <h5>学生答案:</h5>
                    <div class="answer-content">
                      {{ formatStudentAnswer(question, currentSubmission.answers[index]) }}
                    </div>
                  </div>

                  <div class="correct-answer" v-if="showCorrectAnswer">
                    <h5>正确答案:</h5>
                    <div class="answer-content correct">
                      {{ formatCorrectAnswer(question) }}
                    </div>
                  </div>

                  <div class="grading-section">
                    <el-row :gutter="10">
                      <el-col :span="8">
                        <el-input-number
                          v-model="questionScores[index]"
                          :min="0"
                          :max="question.score"
                          :precision="1"
                          size="small"
                          placeholder="得分"
                        ></el-input-number>
                      </el-col>
                      <el-col :span="16">
                        <el-input
                          v-model="questionComments[index]"
                          placeholder="评语（可选）"
                          size="small"
                        ></el-input>
                      </el-col>
                    </el-row>
                  </div>
                </div>
              </div>

              <!-- 文件提交内容 -->
              <div v-if="assignment.type === 'file' || assignment.type === 'mixed'">
                <h4>提交文件</h4>
                <div class="submitted-files">
                  <div
                    v-for="file in currentSubmission.files"
                    :key="file.id"
                    class="file-item"
                  >
                    <div class="file-info">
                      <i class="el-icon-document"></i>
                      <span class="file-name">{{ file.originalName }}</span>
                      <span class="file-size">({{ formatFileSize(file.size) }})</span>
                    </div>
                    <div class="file-actions">
                      <el-button size="mini" @click="downloadFile(file)">下载</el-button>
                      <el-button size="mini" @click="previewFile(file)">预览</el-button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-col>

          <el-col :span="8">
            <el-card class="grading-panel">
              <div slot="header">
                <span>评分面板</span>
              </div>

              <div class="score-section">
                <div class="score-input">
                  <label>总分:</label>
                  <el-input-number
                    v-model="totalScore"
                    :min="0"
                    :max="assignment.totalScore"
                    :precision="1"
                  ></el-input-number>
                  <span>/ {{ assignment.totalScore }}</span>
                </div>

                <div class="auto-score-info" v-if="autoScoreResult">
                  <label>自动评分:</label>
                  <span>{{ autoScoreResult.score }} / {{ assignment.totalScore }}</span>
                  <el-button size="mini" @click="applyAutoScore">采用</el-button>
                </div>
              </div>

              <div class="feedback-section">
                <label>评语:</label>
                <el-input
                  v-model="feedback"
                  type="textarea"
                  :rows="6"
                  placeholder="请输入评语"
                  maxlength="500"
                  show-word-limit
                ></el-input>
              </div>

              <div class="quick-comments">
                <label>快速评语:</label>
                <div class="comment-buttons">
                  <el-button
                    v-for="comment in quickComments"
                    :key="comment"
                    size="mini"
                    @click="addQuickComment(comment)"
                  >
                    {{ comment }}
                  </el-button>
                </div>
              </div>

              <div class="grading-actions">
                <el-button @click="autoGrade" :loading="autoGrading">
                  自动评分
                </el-button>
                <el-button type="primary" @click="saveGrade" :loading="saving">
                  保存评分
                </el-button>
                <el-button type="success" @click="saveAndReturn" :loading="saving">
                  保存并返回
                </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </el-dialog>

    <!-- 批量评分对话框 -->
    <el-dialog
      title="批量评分"
      :visible.sync="showBatchDialog"
      width="500px"
    >
      <div class="batch-grading">
        <p>选中了 {{ selectedSubmissions.length }} 份作业</p>

        <el-form :model="batchGradeData" label-width="80px">
          <el-form-item label="评分方式">
            <el-radio-group v-model="batchGradeData.mode">
              <el-radio label="auto">自动评分</el-radio>
              <el-radio label="fixed">固定分数</el-radio>
              <el-radio label="percentage">按比例给分</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item v-if="batchGradeData.mode === 'fixed'" label="固定分数">
            <el-input-number
              v-model="batchGradeData.fixedScore"
              :min="0"
              :max="assignment.totalScore"
            ></el-input-number>
          </el-form-item>

          <el-form-item v-if="batchGradeData.mode === 'percentage'" label="得分比例">
            <el-input-number
              v-model="batchGradeData.percentage"
              :min="0"
              :max="100"
            ></el-input-number>
            <span>%</span>
          </el-form-item>

          <el-form-item label="批量评语">
            <el-input
              v-model="batchGradeData.feedback"
              type="textarea"
              :rows="3"
              placeholder="可选"
            ></el-input>
          </el-form-item>
        </el-form>
      </div>

      <span slot="footer" class="dialog-footer">
        <el-button @click="showBatchDialog = false">取消</el-button>
        <el-button type="primary" @click="executeBatchGrade" :loading="batchGrading">
          确认批量评分
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
export default {
    name: 'AssignmentGrading',
    props: {
        assignmentId: {
            type: [String, Number],
            required: true
        }
    },
    data () {
        return {
            assignment: {},
            submissions: [],
            classList: [],
            loading: false,
            autoGrading: false,
            saving: false,
            batchGrading: false,
            showGradingDialog: false,
            showBatchDialog: false,
            currentSubmission: null,
            selectedSubmissions: [],
            filter: {
                status: '',
                class: '',
                keyword: ''
            },
            pagination: {
                page: 1,
                size: 10,
                total: 0
            },
            questionScores: {},
            questionComments: {},
            totalScore: 0,
            feedback: '',
            autoScoreResult: null,
            showCorrectAnswer: true,
            batchGradeData: {
                mode: 'auto',
                fixedScore: 0,
                percentage: 100,
                feedback: ''
            },
            quickComments: [
                '作答认真，继续保持',
                '答题思路清晰',
                '需要加强基础练习',
                '计算过程有误',
                '理解有偏差，需重新学习',
                '优秀！',
                '良好',
                '需要改进'
            ]
        }
    },
    computed: {
        submissionStats () {
            const total = this.submissions.length
            const graded = this.submissions.filter(s => s.status === 'graded').length
            const pending = total - graded

            return { total, graded, pending }
        },

        averageScore () {
            const gradedSubmissions = this.submissions.filter(s => s.score !== null)
            if (gradedSubmissions.length === 0) return 0

            const totalScore = gradedSubmissions.reduce((sum, s) => sum + s.score, 0)
            return totalScore / gradedSubmissions.length
        },

        filteredSubmissions () {
            let filtered = [...this.submissions]

            if (this.filter.status) {
                filtered = filtered.filter(s => s.status === this.filter.status)
            }

            if (this.filter.class) {
                filtered = filtered.filter(s => s.student.classId === this.filter.class)
            }

            if (this.filter.keyword) {
                const keyword = this.filter.keyword.toLowerCase()
                filtered = filtered.filter(s =>
                    s.student.name.toLowerCase().includes(keyword) ||
          s.student.studentId.toLowerCase().includes(keyword)
                )
            }

            return filtered
        }
    },
    mounted () {
        this.loadAssignment()
        this.loadSubmissions()
        this.loadClassList()
    },
    methods: {
        async loadAssignment () {
            try {
                const response = await this.$http.get(`/api/assignments/${this.assignmentId}`)
                this.assignment = response.data
            } catch (error) {
                console.error('加载作业失败:', error)
                this.$message.error('加载作业失败')
            }
        },

        async loadSubmissions () {
            this.loading = true
            try {
                const response = await this.$http.get(`/api/assignments/${this.assignmentId}/submissions`, {
                    params: {
                        page: this.pagination.page,
                        size: this.pagination.size
                    }
                })

                this.submissions = response.data.content || []
                this.pagination.total = response.data.totalElements || 0
            } catch (error) {
                console.error('加载提交记录失败:', error)
                this.$message.error('加载提交记录失败')
            } finally {
                this.loading = false
            }
        },

        async loadClassList () {
            try {
                const response = await this.$http.get('/api/classes')
                this.classList = response.data || []
            } catch (error) {
                console.error('加载班级列表失败:', error)
            }
        },

        handleSelectionChange (selection) {
            this.selectedSubmissions = selection
        },

        handlePageChange (page) {
            this.pagination.page = page
            this.loadSubmissions()
        },

        viewSubmission (submission) {
            this.currentSubmission = submission
            this.initializeGrading()
            this.showGradingDialog = true
        },

        gradeSubmission (submission) {
            this.currentSubmission = submission
            this.initializeGrading()
            this.showGradingDialog = true
            this.autoGrade()
        },

        initializeGrading () {
            if (!this.currentSubmission) return

            this.questionScores = {}
            this.questionComments = {}
            this.totalScore = this.currentSubmission.score || 0
            this.feedback = this.currentSubmission.feedback || ''

            if (this.assignment.questions) {
                this.assignment.questions.forEach((question, index) => {
                    this.questionScores[index] = (this.currentSubmission.questionScores && this.currentSubmission.questionScores[index]) || 0
                    this.questionComments[index] = (this.currentSubmission.questionComments && this.currentSubmission.questionComments[index]) || ''
                })
            }
        },

        async autoGrade () {
            this.autoGrading = true
            try {
                const response = await this.$http.post(
                    `/api/assignments/${this.assignmentId}/submissions/${this.currentSubmission.id}/auto-grade`
                )

                this.autoScoreResult = response.data
                this.totalScore = response.data.score

                if (response.data.questionScores) {
                    this.questionScores = { ...response.data.questionScores }
                }

                this.$message.success('自动评分完成')
            } catch (error) {
                console.error('自动评分失败:', error)
                this.$message.error('自动评分失败')
            } finally {
                this.autoGrading = false
            }
        },

        async autoGradeAll () {
            try {
                await this.$confirm('确定要对所有已提交的作业进行自动评分吗？', '确认', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'info'
                })

                this.autoGrading = true
                const response = await this.$http.post(`/api/assignments/${this.assignmentId}/auto-grade-all`)

                this.$message.success(`自动评分完成，共处理 ${response.data.count} 份作业`)
                this.loadSubmissions()
            } catch (error) {
                if (error !== 'cancel') {
                    console.error('批量自动评分失败:', error)
                    this.$message.error('批量自动评分失败')
                }
            } finally {
                this.autoGrading = false
            }
        },

        applyAutoScore () {
            if (this.autoScoreResult) {
                this.totalScore = this.autoScoreResult.score
                if (this.autoScoreResult.questionScores) {
                    this.questionScores = { ...this.autoScoreResult.questionScores }
                }
            }
        },

        addQuickComment (comment) {
            if (this.feedback) {
                this.feedback += '; ' + comment
            } else {
                this.feedback = comment
            }
        },

        async saveGrade () {
            this.saving = true
            try {
                await this.$http.post(
                    `/api/assignments/${this.assignmentId}/submissions/${this.currentSubmission.id}/grade`,
                    {
                        score: this.totalScore,
                        feedback: this.feedback,
                        questionScores: this.questionScores,
                        questionComments: this.questionComments
                    }
                )

                this.$message.success('评分保存成功')
                this.loadSubmissions()
            } catch (error) {
                console.error('保存评分失败:', error)
                this.$message.error('保存评分失败')
            } finally {
                this.saving = false
            }
        },

        async saveAndReturn () {
            try {
                await this.saveGrade()
                await this.returnSubmission(this.currentSubmission)
                this.showGradingDialog = false
            } catch (error) {
                // 错误已在saveGrade中处理
            }
        },

        async returnSubmission (submission) {
            try {
                await this.$http.post(`/api/assignments/${this.assignmentId}/submissions/${submission.id}/return`)
                this.$message.success('作业已返回给学生')
                this.loadSubmissions()
            } catch (error) {
                console.error('返回作业失败:', error)
                this.$message.error('返回作业失败')
            }
        },

        batchGrade () {
            if (this.selectedSubmissions.length === 0) {
                this.$message.warning('请先选择要批量评分的作业')
                return
            }
            this.showBatchDialog = true
        },

        async executeBatchGrade () {
            this.batchGrading = true
            try {
                const submissionIds = this.selectedSubmissions.map(s => s.id)
                await this.$http.post(`/api/assignments/${this.assignmentId}/batch-grade`, {
                    submissionIds,
                    gradeData: this.batchGradeData
                })

                this.$message.success(`批量评分完成，共处理 ${submissionIds.length} 份作业`)
                this.showBatchDialog = false
                this.selectedSubmissions = []
                this.loadSubmissions()
            } catch (error) {
                console.error('批量评分失败:', error)
                this.$message.error('批量评分失败')
            } finally {
                this.batchGrading = false
            }
        },

        async exportGrades () {
            try {
                const response = await this.$http.get(`/api/assignments/${this.assignmentId}/export`, {
                    responseType: 'blob'
                })

                const blob = new Blob([response.data], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                })
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.style.display = 'none'
                link.href = url
                link.download = `${this.assignment.title}_成绩.xlsx`

                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)

                this.$message.success('成绩导出成功')
            } catch (error) {
                console.error('导出成绩失败:', error)
                this.$message.error('导出成绩失败')
            }
        },

        formatStudentAnswer (question, answer) {
            if (!answer) return '未作答'

            switch (question.type) {
            case 'single_choice':
                const option = question.options[answer]
                return option ? `${String.fromCharCode(65 + answer)}. ${option.content}` : '无效选项'
            case 'multiple_choice':
                if (!Array.isArray(answer)) return '无效答案'
                return answer.map(idx => {
                    const opt = question.options[idx]
                    return opt ? `${String.fromCharCode(65 + idx)}. ${opt.content}` : '无效选项'
                }).join('; ')
            case 'true_false':
                return answer ? '正确' : '错误'
            case 'fill_blank':
            case 'essay':
                return answer
            default:
                return answer
            }
        },

        formatCorrectAnswer (question) {
            switch (question.type) {
            case 'single_choice':
                const correctOption = question.options.find(opt => opt.isCorrect)
                return correctOption ? correctOption.content : '未设置正确答案'
            case 'multiple_choice':
                const correctOptions = question.options.filter(opt => opt.isCorrect)
                return correctOptions.map(opt => opt.content).join('; ')
            case 'true_false':
                return question.correctAnswer ? '正确' : '错误'
            case 'fill_blank':
                return question.correctAnswer || '未设置标准答案'
            case 'essay':
                return question.gradingCriteria || '主观题，无标准答案'
            default:
                return '未知题型'
            }
        },

        async downloadFile (file) {
            try {
                const response = await this.$http.get(`/api/files/${file.id}/download`, {
                    responseType: 'blob'
                })

                const blob = new Blob([response.data])
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.style.display = 'none'
                link.href = url
                link.download = file.originalName

                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)
            } catch (error) {
                console.error('下载文件失败:', error)
                this.$message.error('下载文件失败')
            }
        },

        previewFile (file) {
            window.open(`/api/files/${file.id}/preview`, '_blank')
        },

        formatFileSize (size) {
            if (size < 1024) return size + ' B'
            if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
            return (size / (1024 * 1024)).toFixed(1) + ' MB'
        },

        getStatusTagType (status) {
            const types = {
                submitted: 'info',
                graded: 'success',
                returned: 'primary',
                manual_required: 'warning'
            }
            return types[status] || ''
        },

        getStatusName (status) {
            const names = {
                submitted: '已提交',
                graded: '已批改',
                returned: '已返回',
                manual_required: '需人工批改'
            }
            return names[status] || status
        },

        getScoreClass (score) {
            const percentage = (score / this.assignment.totalScore) * 100
            if (percentage >= 90) return 'text-success'
            if (percentage >= 60) return 'text-warning'
            return 'text-danger'
        },

        getGradingProgress (submission) {
            if (submission.status === 'graded') return 100
            if (submission.status === 'submitted') return 50
            return 0
        },

        getProgressStatus (submission) {
            if (submission.status === 'graded') return 'success'
            if (submission.status === 'submitted') return ''
            return 'exception'
        },

        formatTime (time) {
            if (!time) return ''
            return new Date(time).toLocaleString('zh-CN')
        }
    }
}
</script>

<style scoped>
.assignment-grading {
  padding: 20px;
}

.grading-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.grading-header h2 {
  margin: 0;
  color: #333;
}

.grading-stats {
  margin-bottom: 20px;
}

.stats-card {
  text-align: center;
}

.stats-item {
  padding: 10px 0;
}

.stats-value {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.stats-value.text-success {
  color: #67c23a;
}

.stats-value.text-warning {
  color: #e6a23c;
}

.stats-label {
  color: #909399;
  font-size: 14px;
}

.filter-controls {
  margin-bottom: 20px;
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: right;
}

.student-info {
  line-height: 1.2;
}

.student-id {
  font-size: 12px;
  color: #909399;
}

.text-success {
  color: #67c23a;
}

.text-warning {
  color: #e6a23c;
}

.text-danger {
  color: #f56c6c;
}

.text-muted {
  color: #909399;
}

.grading-dialog {
  .grading-content {
    max-height: 70vh;
    overflow-y: auto;
  }
}

.student-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e6ebf5;
}

.student-header h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.submission-info {
  color: #909399;
  font-size: 14px;
}

.submission-info span {
  margin-right: 20px;
}

.question-grading {
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

.student-answer,
.correct-answer {
  margin-bottom: 15px;
}

.student-answer h5,
.correct-answer h5 {
  margin: 0 0 8px 0;
  color: #606266;
  font-size: 14px;
}

.answer-content {
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
  min-height: 40px;
}

.answer-content.correct {
  background: #f0f9ff;
  border: 1px solid #b3d8ff;
}

.grading-section {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #e6ebf5;
}

.submitted-files {
  border: 1px solid #e6ebf5;
  border-radius: 4px;
  padding: 15px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.file-item:last-child {
  border-bottom: none;
}

.file-info {
  display: flex;
  align-items: center;
}

.file-info i {
  margin-right: 8px;
  color: #409eff;
}

.file-name {
  margin-right: 10px;
}

.file-size {
  color: #909399;
  font-size: 12px;
}

.grading-panel {
  position: sticky;
  top: 20px;
}

.score-section {
  margin-bottom: 20px;
}

.score-input {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.auto-score-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #606266;
}

.feedback-section {
  margin-bottom: 20px;
}

.feedback-section label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #606266;
}

.quick-comments {
  margin-bottom: 20px;
}

.quick-comments label {
  display: block;
  margin-bottom: 10px;
  font-weight: bold;
  color: #606266;
}

.comment-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.grading-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.batch-grading {
  text-align: center;
}

.batch-grading p {
  margin-bottom: 20px;
  color: #409eff;
  font-weight: bold;
}
</style>
