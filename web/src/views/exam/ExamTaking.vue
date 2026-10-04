<template>
  <div class="exam-taking-container" v-if="!loading">
    <!-- 考试头部信息 -->
    <div class="exam-header">
      <div class="exam-info">
        <h2>{{ examPaper.paperName }}</h2>
        <div class="exam-meta">
          <span>总分：{{ examPaper.totalScore }}分</span>
          <span>题目数：{{ examPaper.questionCount }}题</span>
          <span>考试时长：{{ examPaper.duration }}分钟</span>
        </div>
      </div>

      <!-- 倒计时 -->
      <div class="exam-timer" v-if="examStarted && !examFinished">
        <a-statistic-countdown
          :value="examEndTime"
          format="HH:mm:ss"
          @finish="handleTimeUp"
        />
        <div class="timer-label">剩余时间</div>
      </div>
    </div>

    <!-- 考试状态提示 -->
    <div class="exam-status" v-if="!examStarted">
      <a-card>
        <div style="text-align: center; padding: 40px 0;">
          <a-icon type="clock-circle" style="font-size: 48px; color: #1890ff; margin-bottom: 16px;" />
          <h3>考试准备</h3>
          <p>请仔细阅读考试说明，确认准备就绪后开始考试</p>
          <div class="exam-description" v-if="examPaper.description">
            <p>{{ examPaper.description }}</p>
          </div>
          <div style="margin-top: 24px;">
            <a-button type="primary" size="large" @click="startExam">
              开始考试
            </a-button>
          </div>
        </div>
      </a-card>
    </div>

    <!-- 考试完成提示 -->
    <div class="exam-status" v-else-if="examFinished">
      <a-result
        status="success"
        title="考试已完成"
        sub-title="感谢您的参与，系统正在评分中，请耐心等待结果。"
      >
        <template #extra>
          <a-space>
            <a-button type="primary" @click="viewResult" v-if="examRecord.examStatus === 3">
              查看成绩
            </a-button>
            <a-button @click="backToList">返回列表</a-button>
          </a-space>
        </template>
      </a-result>
    </div>

    <!-- 答题区域 -->
    <div class="exam-content" v-else-if="examStarted">
      <a-row :gutter="16">
        <!-- 题目导航 -->
        <a-col :span="6">
          <a-card size="small" title="答题卡">
            <div class="question-navigator">
              <div
                v-for="(question, index) in questions"
                :key="question.id"
                :class="['nav-item', {
                  'current': currentQuestionIndex === index,
                  'answered': answers[question.id] !== undefined,
                  'unanswered': answers[question.id] === undefined
                }]"
                @click="goToQuestion(index)"
              >
                {{ index + 1 }}
              </div>
            </div>

            <div class="progress-info">
              <p>已答题：{{ Object.keys(answers).length }} / {{ questions.length }}</p>
              <a-progress
                :percent="Math.round((Object.keys(answers).length / questions.length) * 100)"
                size="small"
              />
            </div>

            <div class="submit-section">
              <a-button
                type="primary"
                block
                @click="handleSubmit"
                :loading="submitting"
              >
                提交试卷
              </a-button>
            </div>
          </a-card>
        </a-col>

        <!-- 题目内容 -->
        <a-col :span="18">
          <a-card size="small">
            <div class="question-content" v-if="currentQuestion">
              <!-- 题目标题 -->
              <div class="question-header">
                <span class="question-number">第{{ currentQuestionIndex + 1 }}题</span>
                <a-tag :color="getQuestionTypeColor(currentQuestion.questionType)">
                  {{ getQuestionTypeName(currentQuestion.questionType) }}
                </a-tag>
                <span class="question-score">({{ currentQuestion.score || 5 }}分)</span>
              </div>

              <!-- 题目内容 -->
              <div class="question-body">
                <div class="question-title">{{ currentQuestion.title }}</div>
                <div class="question-description" v-if="currentQuestion.content">
                  {{ currentQuestion.content }}
                </div>
              </div>

              <!-- 答题区域 -->
              <div class="answer-area">
                <!-- 单选题 -->
                <div v-if="currentQuestion.questionType === 'choice'">
                  <a-radio-group
                    v-model="currentAnswer"
                    @change="handleAnswerChange"
                    style="width: 100%;"
                  >
                    <div v-for="(option, key) in parseOptions(currentQuestion.options)" :key="key" class="option-item">
                      <a-radio :value="key">{{ key }}. {{ option }}</a-radio>
                    </div>
                  </a-radio-group>
                </div>

                <!-- 多选题 -->
                <div v-else-if="currentQuestion.questionType === 'multiple'">
                  <a-checkbox-group
                    v-model="currentAnswer"
                    @change="handleAnswerChange"
                    style="width: 100%;"
                  >
                    <div v-for="(option, key) in parseOptions(currentQuestion.options)" :key="key" class="option-item">
                      <a-checkbox :value="key">{{ key }}. {{ option }}</a-checkbox>
                    </div>
                  </a-checkbox-group>
                </div>

                <!-- 判断题 -->
                <div v-else-if="currentQuestion.questionType === 'judge'">
                  <a-radio-group
                    v-model="currentAnswer"
                    @change="handleAnswerChange"
                  >
                    <a-radio value="true">正确</a-radio>
                    <a-radio value="false">错误</a-radio>
                  </a-radio-group>
                </div>

                <!-- 填空题 -->
                <div v-else-if="currentQuestion.questionType === 'fill'">
                  <a-input
                    v-model="currentAnswer"
                    @change="handleAnswerChange"
                    placeholder="请输入答案"
                    style="width: 100%;"
                  />
                </div>

                <!-- 编程题 -->
                <div v-else-if="currentQuestion.questionType === 'code'">
                  <a-textarea
                    v-model="currentAnswer"
                    @change="handleAnswerChange"
                    placeholder="请输入代码"
                    :rows="10"
                    style="font-family: monospace;"
                  />
                </div>

                <!-- 问答题 -->
                <div v-else-if="currentQuestion.questionType === 'essay'">
                  <a-textarea
                    v-model="currentAnswer"
                    @change="handleAnswerChange"
                    placeholder="请输入答案"
                    :rows="6"
                  />
                </div>
              </div>

              <!-- 题目导航按钮 -->
              <div class="question-navigation">
                <a-space>
                  <a-button @click="prevQuestion" :disabled="currentQuestionIndex === 0">
                    <a-icon type="left" />上一题
                  </a-button>
                  <a-button @click="nextQuestion" :disabled="currentQuestionIndex === questions.length - 1">
                    下一题<a-icon type="right" />
                  </a-button>
                </a-space>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- 加载中状态 -->
    <div v-else class="loading-container">
      <a-spin size="large" />
    </div>
  </div>
</template>

<script>
import { getAction, postAction } from '@/api/manage'
import moment from 'moment'

export default {
  name: 'ExamTaking',
  data() {
    return {
      loading: true,
      examStarted: false,
      examFinished: false,
      submitting: false,
      examPaper: {},
      examRecord: {},
      questions: [],
      answers: {},
      currentQuestionIndex: 0,
      examEndTime: null,
      autoSaveTimer: null
    }
  },
  computed: {
    currentQuestion() {
      return this.questions[this.currentQuestionIndex]
    },
    currentAnswer: {
      get() {
        return this.currentQuestion ? this.answers[this.currentQuestion.id] : null
      },
      set(value) {
        if (this.currentQuestion) {
          this.$set(this.answers, this.currentQuestion.id, value)
        }
      }
    }
  },
  created() {
    this.paperId = this.$route.params.paperId
    this.loadExamData()
  },
  beforeDestroy() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
    }
  },
  methods: {
    async loadExamData() {
      try {
        this.loading = true
        const res = await getAction(`/teaching/examPaper/getExamData/${this.paperId}`)
        if (res.success) {
          this.examPaper = res.result.paper
          this.questions = res.result.questions
          this.examRecord = res.result.record || {}

          // 检查是否已经开始考试
          if (this.examRecord.startTime) {
            this.examStarted = true
            this.setupExamTimer()
            this.loadAnswers()
            this.startAutoSave()
          }

          // 检查是否已经完成考试
          if (this.examRecord.examStatus >= 2) {
            this.examFinished = true
          }
        }
      } catch (error) {
        this.$message.error('加载考试数据失败')
        console.error(error)
      } finally {
        this.loading = false
      }
    },

    async startExam() {
      try {
        const res = await postAction('/teaching/examRecord/start', {
          paperId: this.paperId
        })
        if (res.success) {
          this.examRecord = res.result
          this.examStarted = true
          this.setupExamTimer()
          this.startAutoSave()
          this.$message.success('考试已开始，祝您考试顺利！')
        }
      } catch (error) {
        this.$message.error('开始考试失败')
        console.error(error)
      }
    },

    setupExamTimer() {
      if (this.examRecord.startTime && this.examPaper.duration) {
        const startTime = moment(this.examRecord.startTime)
        this.examEndTime = startTime.add(this.examPaper.duration, 'minutes').valueOf()
      }
    },

    loadAnswers() {
      // 加载已保存的答案
      if (this.examRecord.answers) {
        this.answers = JSON.parse(this.examRecord.answers)
      }
    },

    startAutoSave() {
      // 每30秒自动保存答案
      this.autoSaveTimer = setInterval(() => {
        this.saveAnswers(false)
      }, 30000)
    },

    async saveAnswers(showMessage = true) {
      try {
        await postAction('/teaching/examRecord/saveAnswers', {
          recordId: this.examRecord.id,
          answers: JSON.stringify(this.answers)
        })
        if (showMessage) {
          this.$message.success('答案已保存')
        }
      } catch (error) {
        if (showMessage) {
          this.$message.error('保存答案失败')
        }
        console.error(error)
      }
    },

    handleAnswerChange() {
      // 答案变化时的处理
      this.$nextTick(() => {
        this.saveAnswers(false)
      })
    },

    goToQuestion(index) {
      this.currentQuestionIndex = index
    },

    prevQuestion() {
      if (this.currentQuestionIndex > 0) {
        this.currentQuestionIndex--
      }
    },

    nextQuestion() {
      if (this.currentQuestionIndex < this.questions.length - 1) {
        this.currentQuestionIndex++
      }
    },

    async handleSubmit() {
      const unansweredCount = this.questions.length - Object.keys(this.answers).length
      if (unansweredCount > 0) {
        const confirmed = await new Promise(resolve => {
          this.$confirm({
            title: '确认提交',
            content: `还有 ${unansweredCount} 道题未作答，确定要提交吗？`,
            onOk: () => resolve(true),
            onCancel: () => resolve(false)
          })
        })
        if (!confirmed) return
      }

      try {
        this.submitting = true
        const res = await postAction('/teaching/examRecord/submit', {
          recordId: this.examRecord.id,
          answers: JSON.stringify(this.answers)
        })
        if (res.success) {
          this.examFinished = true
          this.examRecord = res.result
          this.$message.success('试卷提交成功！')
          if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer)
          }
        }
      } catch (error) {
        this.$message.error('提交试卷失败')
        console.error(error)
      } finally {
        this.submitting = false
      }
    },

    handleTimeUp() {
      this.$message.warning('考试时间到，系统将自动提交试卷')
      this.handleSubmit()
    },

    viewResult() {
      this.$router.push(`/exam/result/${this.examRecord.id}`)
    },

    backToList() {
      this.$router.push('/exam/list')
    },

    parseOptions(options) {
      try {
        return JSON.parse(options || '{}')
      } catch {
        return {}
      }
    },

    getQuestionTypeName(type) {
      const typeMap = {
        choice: '单选题',
        multiple: '多选题',
        fill: '填空题',
        judge: '判断题',
        code: '编程题',
        essay: '问答题'
      }
      return typeMap[type] || type
    },

    getQuestionTypeColor(type) {
      const colorMap = {
        choice: 'blue',
        multiple: 'cyan',
        fill: 'green',
        judge: 'orange',
        code: 'purple',
        essay: 'red'
      }
      return colorMap[type] || 'default'
    }
  }
}
</script>

<style lang="less" scoped>
.exam-taking-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;

  .exam-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding: 16px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);

    .exam-info {
      h2 {
        margin: 0 0 8px 0;
        font-size: 20px;
      }

      .exam-meta {
        color: #666;
        span {
          margin-right: 24px;
        }
      }
    }

    .exam-timer {
      text-align: center;
      .timer-label {
        margin-top: 8px;
        color: #666;
        font-size: 12px;
      }
    }
  }

  .exam-status {
    margin: 40px 0;
  }

  .exam-content {
    .question-navigator {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;

      .nav-item {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.3s;

        &.current {
          background: #1890ff;
          color: white;
          border-color: #1890ff;
        }

        &.answered {
          background: #52c41a;
          color: white;
          border-color: #52c41a;
        }

        &.unanswered {
          background: white;
          color: #666;
        }

        &:hover {
          border-color: #1890ff;
        }
      }
    }

    .progress-info {
      margin-bottom: 16px;
      p {
        margin-bottom: 8px;
        font-size: 14px;
        color: #666;
      }
    }

    .submit-section {
      margin-top: 16px;
    }

    .question-content {
      .question-header {
        display: flex;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e8e8e8;

        .question-number {
          font-weight: 500;
          margin-right: 12px;
        }

        .question-score {
          margin-left: auto;
          color: #666;
          font-size: 14px;
        }
      }

      .question-body {
        margin-bottom: 24px;

        .question-title {
          font-size: 16px;
          font-weight: 500;
          line-height: 1.5;
          margin-bottom: 8px;
        }

        .question-description {
          color: #666;
          line-height: 1.6;
        }
      }

      .answer-area {
        margin-bottom: 32px;

        .option-item {
          margin-bottom: 12px;
          padding: 8px;
          border-radius: 4px;
          transition: background-color 0.3s;

          &:hover {
            background-color: #f5f5f5;
          }
        }
      }

      .question-navigation {
        display: flex;
        justify-content: center;
        padding-top: 16px;
        border-top: 1px solid #e8e8e8;
      }
    }
  }

  .loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 400px;
  }
}
</style>