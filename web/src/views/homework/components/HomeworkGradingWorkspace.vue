<template>
  <div class="homework-grading-workspace">
    <!-- 工作区头部 -->
    <div class="workspace-header">
      <div class="header-info">
        <h3>{{ homework.title }} - 评分工作区</h3>
        <div class="grading-progress">
          <span>评分进度：{{ gradedCount }}/{{ totalSubmissions }}</span>
          <a-progress
            :percent="gradingProgress"
            size="small"
            style="width: 200px; margin-left: 12px;"
          />
        </div>
      </div>
      <div class="header-actions">
        <a-button-group>
          <a-button icon="save" @click="saveProgress">
            保存进度
          </a-button>
          <a-button icon="download" @click="exportGrades">
            导出成绩
          </a-button>
          <a-button icon="setting" @click="showBatchModal = true">
            批量操作
          </a-button>
        </a-button-group>
      </div>
    </div>

    <div class="workspace-content">
      <!-- 左侧：学生列表 -->
      <div class="student-list">
        <div class="list-header">
          <a-input-search
            v-model="studentSearch"
            placeholder="搜索学生"
            size="small"
            @search="filterStudents"
          />
          <a-select
            v-model="filterStatus"
            placeholder="筛选状态"
            size="small"
            style="width: 100px; margin-top: 8px;"
            allow-clear
            @change="filterStudents"
          >
            <a-select-option value="">全部</a-select-option>
            <a-select-option value="pending">待评分</a-select-option>
            <a-select-option value="graded">已评分</a-select-option>
          </a-select>
        </div>

        <div class="student-items">
          <div
            v-for="submission in filteredSubmissions"
            :key="submission.id"
            class="student-item"
            :class="{ active: selectedSubmission && selectedSubmission.id === submission.id }"
            @click="selectSubmission(submission)"
          >
            <div class="student-avatar">
              <a-avatar size="small" :src="submission.avatar">
                {{ submission.studentName[0] }}
              </a-avatar>
            </div>
            <div class="student-info">
              <div class="student-name">{{ submission.studentName }}</div>
              <div class="student-meta">
                <span class="student-id">{{ submission.studentId }}</span>
                <a-tag
                  :color="getSubmissionStatusColor(submission.status)"
                  size="small"
                >
                  {{ getSubmissionStatusText(submission.status) }}
                </a-tag>
              </div>
            </div>
            <div class="student-score">
              <span v-if="submission.score !== null" class="score">
                {{ submission.score }}分
              </span>
              <span v-else class="no-score">未评分</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：评分区域 -->
      <div class="grading-area">
        <div v-if="!selectedSubmission" class="no-selection">
          <a-empty description="请选择一个学生作业进行评分" />
        </div>

        <div v-else class="grading-content">
          <!-- 学生信息 -->
          <div class="student-header">
            <div class="student-basic">
              <a-avatar :src="selectedSubmission.avatar" size="large">
                {{ selectedSubmission.studentName[0] }}
              </a-avatar>
              <div class="basic-info">
                <h4>{{ selectedSubmission.studentName }}</h4>
                <p>学号：{{ selectedSubmission.studentId }} | 班级：{{ selectedSubmission.className }}</p>
                <p>提交时间：{{ formatTime(selectedSubmission.submitTime) }}</p>
              </div>
            </div>
            <div class="submission-actions">
              <a-button-group>
                <a-button icon="eye" @click="previewSubmission">
                  预览作品
                </a-button>
                <a-button icon="download" @click="downloadSubmission">
                  下载文件
                </a-button>
                <a-button icon="message" @click="contactStudent">
                  联系学生
                </a-button>
              </a-button-group>
            </div>
          </div>

          <!-- 标签页内容 -->
          <a-tabs v-model="activeGradingTab" size="large">
            <!-- 作业文件 -->
            <a-tab-pane key="files" tab="提交文件">
              <div class="submission-files">
                <div
                  v-for="file in selectedSubmission.files"
                  :key="file.id"
                  class="file-item"
                >
                  <div class="file-header">
                    <div class="file-info">
                      <a-icon :type="getFileIcon(file.type)" />
                      <span class="file-name">{{ file.name }}</span>
                      <span class="file-size">{{ formatFileSize(file.size) }}</span>
                    </div>
                    <div class="file-actions">
                      <a-button size="small" icon="eye" @click="viewFile(file)">
                        查看
                      </a-button>
                      <a-button size="small" icon="download" @click="downloadFile(file)">
                        下载
                      </a-button>
                    </div>
                  </div>

                  <!-- 文件预览 -->
                  <div v-if="file.preview" class="file-preview">
                    <!-- 代码文件预览 -->
                    <div v-if="file.type === 'code'" class="code-preview">
                      <pre><code>{{ file.content }}</code></pre>
                    </div>

                    <!-- 图片预览 -->
                    <div v-else-if="file.type === 'image'" class="image-preview">
                      <img :src="file.url" :alt="file.name" />
                    </div>

                    <!-- 其他文件 -->
                    <div v-else class="other-preview">
                      <p>{{ file.description || '无法预览此文件类型' }}</p>
                    </div>
                  </div>
                </div>

                <div v-if="selectedSubmission.files.length === 0" class="no-files">
                  <a-empty description="该学生未提交文件" />
                </div>
              </div>
            </a-tab-pane>

            <!-- 在线作品 -->
            <a-tab-pane key="online" tab="在线作品" v-if="selectedSubmission.onlineWork">
              <div class="online-work">
                <!-- Scratch作品运行器 -->
                <div v-if="homework.subject === 'scratch'" class="scratch-player">
                  <div class="player-container">
                    <div class="scratch-stage">
                      <img
                        v-if="selectedSubmission.onlineWork.screenshot"
                        :src="selectedSubmission.onlineWork.screenshot"
                        alt="Scratch截图" />
                      <div v-else class="no-preview">
                        <a-icon type="play-circle" style="font-size: 48px;" />
                        <p>点击运行Scratch程序</p>
                      </div>
                    </div>
                    <div class="player-controls">
                      <a-button type="primary" icon="caret-right" @click="runScratchProject">
                        运行程序
                      </a-button>
                      <a-button icon="stop" @click="stopScratchProject">
                        停止
                      </a-button>
                      <a-button icon="reload" @click="resetScratchProject">
                        重置
                      </a-button>
                    </div>
                  </div>
                </div>

                <!-- Python代码 -->
                <div v-else-if="homework.subject === 'python'" class="python-code">
                  <div class="code-editor">
                    <div class="editor-header">
                      <span>{{ selectedSubmission.onlineWork.fileName || 'main.py' }}</span>
                      <a-button-group size="small">
                        <a-button icon="play-circle" @click="runPythonCode">
                          运行
                        </a-button>
                        <a-button icon="copy" @click="copyCode">
                          复制
                        </a-button>
                      </a-button-group>
                    </div>
                    <div class="code-content">
                      <pre><code>{{ selectedSubmission.onlineWork.code }}</code></pre>
                    </div>
                  </div>

                  <div class="code-output">
                    <div class="output-header">
                      <span>运行结果</span>
                      <a-button size="small" icon="clear" @click="clearOutput">
                        清空
                      </a-button>
                    </div>
                    <div class="output-content">
                      <pre>{{ codeOutput || '点击运行按钮查看结果' }}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </a-tab-pane>

            <!-- 评分表单 -->
            <a-tab-pane key="grading" tab="评分">
              <div class="grading-form">
                <a-form-model
                  ref="gradingForm"
                  :model="gradingData"
                  :rules="gradingRules"
                  :label-col="{ span: 6 }"
                  :wrapper-col="{ span: 16 }"
                >
                  <!-- 分项评分 -->
                  <div class="criteria-grading">
                    <h4>分项评分</h4>
                    <div
                      v-for="(criterion, index) in homework.gradingCriteria"
                      :key="index"
                      class="criterion-item"
                    >
                      <a-form-model-item :label="criterion.name">
                        <div class="criterion-scoring">
                          <a-input-number
                            v-model="gradingData.criteriaScores[index]"
                            :min="0"
                            :max="criterion.score"
                            style="width: 100px;"
                          />
                          <span class="max-score">/ {{ criterion.score }}分</span>
                          <span class="criterion-desc">{{ criterion.description }}</span>
                        </div>
                      </a-form-model-item>
                    </div>
                  </div>

                  <a-divider />

                  <!-- 总分和评语 -->
                  <a-form-model-item label="总分" prop="totalScore">
                    <a-input-number
                      v-model="gradingData.totalScore"
                      :min="0"
                      :max="homework.totalScore"
                      style="width: 120px;"
                    />
                    <span style="margin-left: 8px;">/ {{ homework.totalScore }}分</span>
                    <a-button
                      type="link"
                      size="small"
                      @click="calculateTotalScore"
                    >
                      自动计算
                    </a-button>
                  </a-form-model-item>

                  <a-form-model-item label="评分等级">
                    <a-radio-group v-model="gradingData.grade">
                      <a-radio value="A">优秀 (A)</a-radio>
                      <a-radio value="B">良好 (B)</a-radio>
                      <a-radio value="C">及格 (C)</a-radio>
                      <a-radio value="D">不及格 (D)</a-radio>
                    </a-radio-group>
                  </a-form-model-item>

                  <a-form-model-item label="评语" prop="comment">
                    <a-textarea
                      v-model="gradingData.comment"
                      placeholder="请输入详细的评语和建议"
                      :rows="4"
                      :maxLength="500"
                      show-count
                    />
                  </a-form-model-item>

                  <a-form-model-item label="评分标签">
                    <a-select
                      v-model="gradingData.tags"
                      mode="tags"
                      placeholder="添加评分标签"
                      style="width: 100%"
                    >
                      <a-select-option value="创意">创意</a-select-option>
                      <a-select-option value="规范">代码规范</a-select-option>
                      <a-select-option value="完整">完成度高</a-select-option>
                      <a-select-option value="逻辑">逻辑清晰</a-select-option>
                      <a-select-option value="改进">需要改进</a-select-option>
                    </a-select>
                  </a-form-model-item>

                  <a-form-model-item label="是否推荐">
                    <a-checkbox v-model="gradingData.recommended">
                      推荐为优秀作品
                    </a-checkbox>
                  </a-form-model-item>

                  <!-- 操作按钮 -->
                  <div class="grading-actions">
                    <a-space>
                      <a-button @click="saveDraft">
                        保存草稿
                      </a-button>
                      <a-button type="primary" @click="submitGrading" :loading="submitting">
                        提交评分
                      </a-button>
                      <a-button @click="nextSubmission">
                        下一个
                      </a-button>
                    </a-space>
                  </div>
                </a-form-model>
              </div>
            </a-tab-pane>

            <!-- 评分记录 -->
            <a-tab-pane key="history" tab="评分记录" v-if="gradingHistory.length > 0">
              <div class="grading-history">
                <a-timeline>
                  <a-timeline-item
                    v-for="record in gradingHistory"
                    :key="record.id"
                    :color="record.type === 'submit' ? 'green' : 'blue'"
                  >
                    <div class="history-item">
                      <div class="history-header">
                        <span class="history-action">{{ record.action }}</span>
                        <span class="history-time">{{ formatTime(record.time) }}</span>
                      </div>
                      <div class="history-content">
                        <p v-if="record.score">得分：{{ record.score }}分</p>
                        <p v-if="record.comment">评语：{{ record.comment }}</p>
                      </div>
                    </div>
                  </a-timeline-item>
                </a-timeline>
              </div>
            </a-tab-pane>
          </a-tabs>
        </div>
      </div>
    </div>

    <!-- 批量操作弹窗 -->
    <a-modal
      title="批量操作"
      :visible="showBatchModal"
      :width="600"
      @ok="executeBatchOperation"
      @cancel="showBatchModal = false"
    >
      <a-form layout="vertical">
        <a-form-item label="操作类型">
          <a-radio-group v-model="batchOperation.type">
            <a-radio value="grade">批量评分</a-radio>
            <a-radio value="comment">批量评语</a-radio>
            <a-radio value="tag">批量标签</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item v-if="batchOperation.type === 'grade'" label="统一分数">
          <a-input-number
            v-model="batchOperation.score"
            :min="0"
            :max="homework.totalScore"
            style="width: 120px;"
          />
          <span style="margin-left: 8px;">分</span>
        </a-form-item>

        <a-form-item v-if="batchOperation.type === 'comment'" label="统一评语">
          <a-textarea
            v-model="batchOperation.comment"
            placeholder="输入统一评语"
            :rows="3"
          />
        </a-form-item>

        <a-form-item v-if="batchOperation.type === 'tag'" label="统一标签">
          <a-select
            v-model="batchOperation.tags"
            mode="multiple"
            placeholder="选择标签"
            style="width: 100%"
          >
            <a-select-option value="创意">创意</a-select-option>
            <a-select-option value="规范">代码规范</a-select-option>
            <a-select-option value="完整">完成度高</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="应用范围">
          <a-checkbox-group v-model="batchOperation.scope">
            <a-checkbox value="pending">未评分作业</a-checkbox>
            <a-checkbox value="selected">已选择作业</a-checkbox>
            <a-checkbox value="all">全部作业</a-checkbox>
          </a-checkbox-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { homeworkApi } from '@/api/teaching'

export default {
    name: 'HomeworkGradingWorkspace', // 作业评分工作区组件
    props: {
        homework: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            studentSearch: '',
            filterStatus: '',
            selectedSubmission: null,
            activeGradingTab: 'files',
            submitting: false,
            showBatchModal: false,
            codeOutput: '',

            gradingData: {
                criteriaScores: [],
                totalScore: null,
                grade: '',
                comment: '',
                tags: [],
                recommended: false
            },

            gradingRules: {
                totalScore: [
                    { required: true, message: '请输入总分!' }
                ],
                comment: [
                    { required: true, message: '请输入评语!' },
                    { min: 10, message: '评语至少10个字符!' }
                ]
            },

            batchOperation: {
                type: 'grade',
                score: null,
                comment: '',
                tags: [],
                scope: ['pending']
            },

            // 模拟提交数据
            submissions: [
                {
                    id: '1',
                    studentId: 'S001',
                    studentName: '张小明',
                    className: '一年级1班',
                    status: 'submitted',
                    submitTime: '2024-01-24 15:30:00',
                    score: null,
                    avatar: '/images/avatars/student1.jpg',
                    files: [
                        {
                            id: 'f1',
                            name: 'my_animation.sb3',
                            type: 'scratch',
                            size: 1024000,
                            url: '/files/my_animation.sb3',
                            preview: true,
                            content: '// Scratch项目文件'
                        }
                    ],
                    onlineWork: {
                        screenshot: '/images/scratch-screenshot1.png',
                        projectData: '{...}'
                    }
                },
                {
                    id: '2',
                    studentId: 'S002',
                    studentName: '李小红',
                    className: '一年级1班',
                    status: 'submitted',
                    submitTime: '2024-01-24 18:45:00',
                    score: null,
                    avatar: '/images/avatars/student2.jpg',
                    files: [
                        {
                            id: 'f2',
                            name: 'homework.py',
                            type: 'code',
                            size: 2048,
                            url: '/files/homework.py',
                            preview: true,
                            content: `# Python作业
print("Hello, World!")
for i in range(10):
    print(f"数字: {i}")
`
                        }
                    ],
                    onlineWork: {
                        fileName: 'main.py',
                        code: `# Python基础练习
def calculate_sum(n):
    total = 0
    for i in range(1, n + 1):
        total += i
    return total

result = calculate_sum(100)
print(f"1到100的和是: {result}")
`
                    }
                }
            ],

            gradingHistory: [
                {
                    id: '1',
                    action: '保存评分草稿',
                    type: 'draft',
                    score: 85,
                    comment: '作品完成度较好，有创意',
                    time: '2024-01-25 10:30:00'
                },
                {
                    id: '2',
                    action: '提交最终评分',
                    type: 'submit',
                    score: 88,
                    comment: '作品完成度较好，有创意，代码规范性有待提高',
                    time: '2024-01-25 11:00:00'
                }
            ]
        }
    },
    computed: {
        filteredSubmissions () {
            let filtered = this.submissions

            if (this.studentSearch) {
                const searchLower = this.studentSearch.toLowerCase()
                filtered = filtered.filter(submission =>
                    submission.studentName.toLowerCase().includes(searchLower) ||
          submission.studentId.toLowerCase().includes(searchLower)
                )
            }

            if (this.filterStatus === 'pending') {
                filtered = filtered.filter(submission => submission.score === null)
            } else if (this.filterStatus === 'graded') {
                filtered = filtered.filter(submission => submission.score !== null)
            }

            return filtered
        },

        totalSubmissions () {
            return this.submissions.length
        },

        gradedCount () {
            return this.submissions.filter(s => s.score !== null).length
        },

        gradingProgress () {
            if (this.totalSubmissions === 0) return 0
            return Math.round((this.gradedCount / this.totalSubmissions) * 100)
        }
    },
    watch: {
        selectedSubmission: {
            handler (newSubmission) {
                if (newSubmission) {
                    this.loadGradingData(newSubmission)
                }
            },
            immediate: true
        }
    },
    methods: {
        filterStudents () {
            // 筛选逻辑在computed中处理
        },

        selectSubmission (submission) {
            this.selectedSubmission = submission
            this.activeGradingTab = 'files'
        },

        loadGradingData (submission) {
            // 加载评分数据
            this.gradingData = {
                criteriaScores: new Array(this.homework.gradingCriteria.length).fill(0),
                totalScore: submission.score,
                grade: this.getGradeByScore(submission.score),
                comment: submission.comment || '',
                tags: submission.tags || [],
                recommended: submission.recommended || false
            }
        },

        getGradeByScore (score) {
            if (score >= 90) return 'A'
            if (score >= 80) return 'B'
            if (score >= 60) return 'C'
            return 'D'
        },

        calculateTotalScore () {
            const total = this.gradingData.criteriaScores.reduce((sum, score) => sum + (score || 0), 0)
            this.gradingData.totalScore = total
            this.gradingData.grade = this.getGradeByScore(total)
        },

        getSubmissionStatusColor (status) {
            const colorMap = {
                'submitted': 'blue',
                'graded': 'green',
                'late': 'orange'
            }
            return colorMap[status] || 'default'
        },

        getSubmissionStatusText (status) {
            const textMap = {
                'submitted': '已提交',
                'graded': '已评分',
                'late': '迟交'
            }
            return textMap[status] || '未知'
        },

        formatTime (time) {
            return new Date(time).toLocaleString()
        },

        formatFileSize (bytes) {
            if (bytes === 0) return '0 B'
            const k = 1024
            const sizes = ['B', 'KB', 'MB', 'GB']
            const i = Math.floor(Math.log(bytes) / Math.log(k))
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
        },

        getFileIcon (type) {
            const iconMap = {
                'scratch': 'file',
                'code': 'code',
                'image': 'file-image',
                'document': 'file-text'
            }
            return iconMap[type] || 'file'
        },

        viewFile (file) {
            file.preview = !file.preview
        },

        downloadFile (file) {
            this.$message.success(`下载文件：${file.name}`)
        },

        previewSubmission () {
            this.$message.info('打开作品预览')
        },

        downloadSubmission () {
            this.$message.success('下载学生提交的文件')
        },

        contactStudent () {
            this.$message.info('联系学生功能开发中...')
        },

        runScratchProject () {
            this.$message.info('运行Scratch程序')
        },

        stopScratchProject () {
            this.$message.info('停止Scratch程序')
        },

        resetScratchProject () {
            this.$message.info('重置Scratch程序')
        },

        async runPythonCode () {
            try {
                this.codeOutput = '正在执行代码...'
                const response = await homeworkApi.executeCode({
                    language: 'python',
                    code: (this.selectedSubmission.files[0] && this.selectedSubmission.files[0].content) || ''
                })
                if (response.success) {
                    this.codeOutput = response.result.output
                    this.$message.success(`代码运行完成，耗时: ${response.result.executionTime}ms`)
                }
            } catch (error) {
                this.codeOutput = '代码执行出错: ' + error.message
                this.$message.error('代码执行失败')
            }
        },

        copyCode () {
            const code = this.selectedSubmission.onlineWork.code
            navigator.clipboard.writeText(code).then(() => {
                this.$message.success('代码已复制到剪贴板')
            })
        },

        clearOutput () {
            this.codeOutput = ''
        },

        saveDraft () {
            this.$message.success('评分草稿已保存')
            // 保存到本地或服务器
        },

        async submitGrading () {
            this.$refs.gradingForm.validate(async valid => {
                if (valid) {
                    this.submitting = true

                    try {
                        const response = await homeworkApi.gradeHomework(this.selectedSubmission.id, {
                            score: this.gradingData.totalScore,
                            grade: this.gradingData.grade,
                            comment: this.gradingData.comment,
                            tags: this.gradingData.tags,
                            criteriaScores: this.gradingData.criteriaScores
                        })

                        if (response.success) {
                            // 更新提交记录
                            this.selectedSubmission.score = this.gradingData.totalScore
                            this.selectedSubmission.grade = this.gradingData.grade
                            this.selectedSubmission.comment = this.gradingData.comment
                            this.selectedSubmission.tags = this.gradingData.tags
                            this.selectedSubmission.status = 'graded'

                            this.$message.success('评分提交成功')

                            // 自动选择下一个未评分的作业
                            this.nextSubmission()
                        }
                    } catch (error) {
                        this.$message.error('评分提交失败：' + error.message)
                    } finally {
                        this.submitting = false
                    }
                }
            })
        },

        nextSubmission () {
            const currentIndex = this.filteredSubmissions.findIndex(s => s.id === this.selectedSubmission.id)
            const nextIndex = currentIndex + 1

            if (nextIndex < this.filteredSubmissions.length) {
                this.selectedSubmission = this.filteredSubmissions[nextIndex]
            } else {
                this.$message.info('已经是最后一个作业了')
            }
        },

        saveProgress () {
            this.$message.success('评分进度已保存')
        },

        exportGrades () {
            this.$message.success('正在导出成绩单...')
        },

        executeBatchOperation () {
            this.$message.success(`执行批量${this.batchOperation.type}操作`)
            this.showBatchModal = false
        }
    },

    mounted () {
    // 自动选择第一个未评分的作业
        const firstPending = this.submissions.find(s => s.score === null)
        if (firstPending) {
            this.selectedSubmission = firstPending
        }
    }
}
</script>

<style scoped>
.homework-grading-workspace {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.workspace-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.header-info h3 {
  margin: 0;
  color: #333;
}

.grading-progress {
  display: flex;
  align-items: center;
  margin-top: 8px;
  color: #666;
  font-size: 14px;
}

.workspace-content {
  flex: 1;
  display: flex;
  height: calc(100vh - 80px);
}

.student-list {
  width: 300px;
  border-right: 1px solid #f0f0f0;
  background: #fafafa;
  display: flex;
  flex-direction: column;
}

.list-header {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.student-items {
  flex: 1;
  overflow-y: auto;
}

.student-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.student-item:hover {
  background: rgba(24, 144, 255, 0.1);
}

.student-item.active {
  background: #e6f7ff;
  border-right: 3px solid #1890ff;
}

.student-avatar {
  margin-right: 12px;
}

.student-info {
  flex: 1;
}

.student-name {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.student-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.student-id {
  font-size: 12px;
  color: #999;
}

.student-score {
  text-align: right;
}

.score {
  color: #52c41a;
  font-weight: 500;
}

.no-score {
  color: #999;
  font-size: 12px;
}

.grading-area {
  flex: 1;
  background: #fff;
  overflow-y: auto;
}

.no-selection {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.grading-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.student-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.student-basic {
  display: flex;
  align-items: center;
  gap: 16px;
}

.basic-info h4 {
  margin: 0;
  color: white;
  font-size: 18px;
}

.basic-info p {
  margin: 4px 0 0 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.submission-files {
  padding: 16px;
}

.file-item {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  margin-bottom: 16px;
  overflow: hidden;
}

.file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #d9d9d9;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-name {
  font-weight: 500;
  color: #333;
}

.file-size {
  color: #999;
  font-size: 12px;
}

.file-preview {
  padding: 16px;
}

.code-preview pre {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.image-preview img {
  max-width: 100%;
  max-height: 400px;
  border-radius: 4px;
}

.no-files {
  padding: 48px;
  text-align: center;
}

.online-work {
  padding: 16px;
}

.scratch-stage {
  width: 100%;
  height: 300px;
  border: 2px solid #ddd;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9f9f9;
  margin-bottom: 16px;
}

.scratch-stage img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.no-preview {
  text-align: center;
  color: #999;
}

.no-preview p {
  margin: 8px 0 0 0;
}

.player-controls {
  text-align: center;
}

.code-editor {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 16px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #d9d9d9;
}

.code-content {
  padding: 16px;
  background: #fafafa;
  overflow-x: auto;
  max-height: 300px;
}

.code-content pre {
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.code-output {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #d9d9d9;
}

.output-content {
  padding: 16px;
  background: #000;
  color: #0f0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  min-height: 120px;
  max-height: 200px;
  overflow-y: auto;
}

.output-content pre {
  margin: 0;
  white-space: pre-wrap;
}

.grading-form {
  padding: 24px;
}

.criteria-grading {
  margin-bottom: 24px;
}

.criteria-grading h4 {
  margin: 0 0 16px 0;
  color: #333;
}

.criterion-item {
  margin-bottom: 12px;
}

.criterion-scoring {
  display: flex;
  align-items: center;
  gap: 8px;
}

.max-score {
  color: #666;
  font-size: 14px;
}

.criterion-desc {
  color: #999;
  font-size: 12px;
}

.grading-actions {
  text-align: center;
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.grading-history {
  padding: 24px;
}

.history-item {
  margin-bottom: 12px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.history-action {
  font-weight: 500;
  color: #333;
}

.history-time {
  color: #999;
  font-size: 12px;
}

.history-content {
  color: #666;
  font-size: 13px;
}

.history-content p {
  margin: 4px 0;
}
</style>
