<template>
  <div class="exam-interface">
    <!-- 考试信息头部 -->
    <div class="exam-header">
      <a-card size="small">
        <div class="exam-info">
          <div class="exam-title">
            <h3>{{ safe(examPaper.paper_name) }}</h3>
            <a-tag :color="getExamStatusColor()">{{ getExamStatusText() }}</a-tag>
          </div>
          <div class="exam-meta">
            <a-row :gutter="24">
              <a-col :span="6">
                <a-statistic title="总分" :value="examPaper.total_score" suffix="分" />
              </a-col>
              <a-col :span="6">
                <a-statistic title="题目数量" :value="examPaper.question_count" suffix="题" />
              </a-col>
              <a-col :span="6">
                <a-statistic title="剩余时间" :value="remainingTime" :formatter="formatTime" />
              </a-col>
              <a-col :span="6">
                <a-statistic title="已答题目" :value="answeredCount" :suffix="`/${examPaper.question_count}`" />
              </a-col>
            </a-row>
          </div>
        </div>
      </a-card>
    </div>

    <!-- 主体内容 -->
    <div class="exam-content">
      <a-row :gutter="24">
        <!-- 题目显示区域 -->
        <a-col :span="18">
          <a-card title="答题区域" :bordered="false">
            <div v-if="currentQuestion" class="question-container">
              <!-- 题目导航 -->
              <div class="question-navigation">
                <a-button-group size="small">
                  <a-button @click="previousQuestion" :disabled="currentQuestionIndex === 0" icon="left">
                    上一题
                  </a-button>
                  <a-button @click="nextQuestion" :disabled="currentQuestionIndex === questions.length - 1" icon="right">
                    下一题
                  </a-button>
                </a-button-group>
                <span class="question-counter">
                  第 {{ currentQuestionIndex + 1 }} 题 / 共 {{ questions.length }} 题
                </span>
              </div>

              <!-- 题目内容 -->
              <div class="question-content">
                <div class="question-header">
                  <a-tag :color="getDifficultyColor(currentQuestion.difficulty)">
                    {{ getDifficultyText(currentQuestion.difficulty) }}
                  </a-tag>
                  <a-tag>{{ getTypeText(currentQuestion.question_type) }}</a-tag>
                  <span class="question-score">{{ currentQuestion.question_score }}分</span>
                </div>

                <h4 class="question-title">{{ safe(currentQuestion.title) }}</h4>
                <div class="question-body" v-html="sanitizedQuestionContent"></div>

                <!-- 答题区域 -->
                <div class="answer-area">
                  <!-- 单选题 -->
                  <div v-if="currentQuestion.question_type === 'choice'" class="choice-question">
                    <a-radio-group
                      v-model="currentAnswer"
                      @change="saveAnswer"
                      :disabled="isExamFinished"
                    >
                      <div
                        v-for="(option, key) in currentQuestion.options"
                        :key="key"
                        class="option-item"
                      >
                        <a-radio :value="key">
                          <strong>{{ key }}.</strong> {{ safe(option) }}
                        </a-radio>
                      </div>
                    </a-radio-group>
                  </div>

                  <!-- 多选题 -->
                  <div v-if="currentQuestion.question_type === 'multiple'" class="multiple-question">
                    <a-checkbox-group
                      v-model="currentAnswer"
                      @change="saveAnswer"
                      :disabled="isExamFinished"
                    >
                      <div
                        v-for="(option, key) in currentQuestion.options"
                        :key="key"
                        class="option-item"
                      >
                        <a-checkbox :value="key">
                          <strong>{{ key }}.</strong> {{ safe(option) }}
                        </a-checkbox>
                      </div>
                    </a-checkbox-group>
                  </div>

                  <!-- 填空题 -->
                  <div v-if="currentQuestion.question_type === 'fill'" class="fill-question">
                    <a-input
                      v-model="currentAnswer"
                      @blur="saveAnswer"
                      :disabled="isExamFinished"
                      placeholder="请输入答案"
                      style="width: 100%; margin-top: 16px;"
                    />
                  </div>

                  <!-- 判断题 -->
                  <div v-if="currentQuestion.question_type === 'judge'" class="judge-question">
                    <a-radio-group
                      v-model="currentAnswer"
                      @change="saveAnswer"
                      :disabled="isExamFinished"
                    >
                      <div class="option-item">
                        <a-radio value="true">
                          <strong>✓</strong> 正确
                        </a-radio>
                      </div>
                      <div class="option-item">
                        <a-radio value="false">
                          <strong>✗</strong> 错误
                        </a-radio>
                      </div>
                    </a-radio-group>
                  </div>

                  <!-- 问答题/编程题 -->
                  <div v-if="currentQuestion.question_type === 'essay' || currentQuestion.question_type === 'code'" class="essay-question">
                    <a-textarea
                      v-model="currentAnswer"
                      @blur="saveAnswer"
                      :disabled="isExamFinished"
                      :placeholder="currentQuestion.question_type === 'code' ? '请输入代码' : '请输入答案'"
                      :rows="8"
                      style="margin-top: 16px;"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="no-question">
              <a-empty description="暂无题目" />
            </div>
          </a-card>
        </a-col>

        <!-- 题目导航和操作区域 -->
        <a-col :span="6">
          <a-card title="题目导航" size="small">
            <!-- 题目网格 -->
            <div class="question-grid">
              <div
                v-for="(question, index) in questions"
                :key="question.id"
                class="question-grid-item"
                :class="{
                  'current': index === currentQuestionIndex,
                  'answered': studentAnswers[question.id],
                  'unanswered': !studentAnswers[question.id]
                }"
                @click="goToQuestion(index)"
              >
                {{ index + 1 }}
              </div>
            </div>

            <div class="grid-legend">
              <div class="legend-item">
                <span class="legend-color current"></span>
                <span class="legend-text">当前题目</span>
              </div>
              <div class="legend-item">
                <span class="legend-color answered"></span>
                <span class="legend-text">已答题目</span>
              </div>
              <div class="legend-item">
                <span class="legend-color unanswered"></span>
                <span class="legend-text">未答题目</span>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="exam-actions">
              <a-button
                type="primary"
                size="large"
                block
                @click="submitExam"
                :loading="submitting"
                :disabled="isExamFinished"
                style="margin-top: 16px;"
              >
                提交考试
              </a-button>

              <a-button
                size="large"
                block
                @click="saveProgress"
                :loading="saving"
                :disabled="isExamFinished"
                style="margin-top: 8px;"
              >
                保存答案
              </a-button>
            </div>

            <!-- 考试状态 -->
            <div class="exam-status" style="margin-top: 16px;">
              <a-alert
                v-if="isExamFinished"
                message="考试已结束"
                description="您已提交考试,等待系统评分"
                type="success"
                show-icon
              />
              <a-alert
                v-else-if="remainingTime <= 300000"
                message="时间不足"
                description="考试时间即将结束,请尽快完成答题"
                type="warning"
                show-icon
              />
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { sanitizeHTML, sanitizeInput } from '@/utils/security'

export default {
    name: 'ExamInterface',

    data () {
        return {
            // 考试基本信息
            examPaper: {
                id: '',
                paper_name: '',
                total_score: 0,
                question_count: 0,
                duration: 0,
                status: 1
            },

            // 考试记录信息
            examRecord: null,

            // 题目数据
            questions: [],
            currentQuestionIndex: 0,
            currentQuestion: null,
            currentAnswer: null,

            // 答题状态
            studentAnswers: {}, // questionId -> answer
            answeredCount: 0,

            // 考试状态
            isExamStarted: false,
            isExamFinished: false,
            examStartTime: null,
            remainingTime: 0,
            timer: null,

            // 操作状态
            loading: false,
            saving: false,
            submitting: false,

            // 题目类型映射
            questionTypeMap: {
                'choice': '单选题',
                'multiple': '多选题',
                'fill': '填空题',
                'judge': '判断题',
                'code': '编程题',
                'essay': '问答题'
            }
        }
    },

    computed: {
    // 当前题目
        getCurrentQuestion () {
            return this.questions[this.currentQuestionIndex] || null
        },

        // 安全的题目内容(用于v-html显示)
        sanitizedQuestionContent () {
            if (!this.currentQuestion || !this.currentQuestion.content) {
                return ''
            }
            return sanitizeHTML(this.currentQuestion.content)
        }
    },

    watch: {
        currentQuestionIndex (newIndex) {
            this.loadCurrentQuestion()
        }
    },

    async mounted () {
        const examId = this.$route.params.examId || 'paper001'
        await this.initExam(examId)
    },

    beforeDestroy () {
        if (this.timer) {
            clearInterval(this.timer)
        }
    },

    methods: {
    // XSS防护方法
        safe (text) {
            return sanitizeInput(text, { maxLength: 500 })
        },

        // 初始化考试
        async initExam (examId) {
            try {
                this.loading = true

                // 加载试卷信息(模拟数据)
                this.examPaper = {
                    id: 'paper001',
                    paper_name: 'Python基础测验',
                    total_score: 100,
                    question_count: 5,
                    duration: 30,
                    status: 1
                }

                // 加载题目列表(使用考试API)
                const questionsResponse = await axios.get(`http://localhost:3005/api/exam/questions?size=5`)
                if (questionsResponse.data.success) {
                    this.questions = questionsResponse.data.data.list.map((q, index) => ({
                        ...q,
                        question_score: 20 // 每题20分
                    }))
                }

                // 创建考试记录
                this.examRecord = {
                    id: `record_${Date.now()}`,
                    paper_id: examId,
                    student_id: 'student001',
                    start_time: new Date(),
                    status: 1
                }

                // 开始考试
                this.startExam()

                this.loadCurrentQuestion()
            } catch (error) {
                console.error('初始化考试失败:', error)
                this.$message.error('加载考试失败')
            } finally {
                this.loading = false
            }
        },

        // 开始考试
        startExam () {
            this.isExamStarted = true
            this.examStartTime = new Date()
            this.remainingTime = this.examPaper.duration * 60 * 1000 // 转换为毫秒

            // 启动计时器
            this.timer = setInterval(() => {
                this.remainingTime -= 1000
                if (this.remainingTime <= 0) {
                    this.timeUp()
                }
            }, 1000)

            this.$message.success('考试已开始,请认真答题')
        },

        // 时间到
        timeUp () {
            this.remainingTime = 0
            if (this.timer) {
                clearInterval(this.timer)
            }
            this.$message.warning('考试时间结束,正在自动提交答案')
            this.submitExam()
        },

        // 加载当前题目
        loadCurrentQuestion () {
            const question = this.questions[this.currentQuestionIndex]
            if (question) {
                this.currentQuestion = question

                // 加载已保存的答案
                const savedAnswer = this.studentAnswers[question.id]
                if (savedAnswer !== undefined) {
                    this.currentAnswer = savedAnswer
                } else {
                    // 重置答案
                    if (question.question_type === 'multiple') {
                        this.currentAnswer = []
                    } else {
                        this.currentAnswer = ''
                    }
                }
            }
        },

        // 保存答案
        saveAnswer () {
            if (this.currentQuestion) {
                let answer = this.currentAnswer

                // 处理多选题答案格式
                if (this.currentQuestion.question_type === 'multiple' && Array.isArray(answer)) {
                    answer = answer.join(',')
                }

                // 保存到答案对象
                this.studentAnswers[this.currentQuestion.id] = answer
                this.updateAnsweredCount()

                // 自动保存到服务器(可选)
                // this.saveToServer()
            }
        },

        // 更新已答题数量
        updateAnsweredCount () {
            this.answeredCount = Object.keys(this.studentAnswers).filter(
                questionId => {
                    const answer = this.studentAnswers[questionId]
                    return answer !== undefined && answer !== '' && answer !== null
                }
            ).length
        },

        // 保存进度到服务器
        async saveProgress () {
            try {
                this.saving = true

                // 这里应该调用API保存答案
                // const response = await axios.post(`http://localhost:3005/api/exam/records/${this.examRecord.id}/answers`, {
                //   answers: this.studentAnswers
                // })

                this.$message.success('答案已保存')
            } catch (error) {
                console.error('保存答案失败:', error)
                this.$message.error('保存答案失败')
            } finally {
                this.saving = false
            }
        },

        // 提交考试
        async submitExam () {
            this.$confirm({
                title: '确认提交',
                content: `您已答题 ${this.answeredCount} 题,确定要提交考试吗?提交后将无法修改答案。`,
                onOk: async () => {
                    try {
                        this.submitting = true

                        // 停止计时器
                        if (this.timer) {
                            clearInterval(this.timer)
                        }

                        // 提交答案到服务器
                        // const response = await axios.post(`http://localhost:3005/api/exam/records/${this.examRecord.id}/submit`, {
                        //   answers: this.studentAnswers,
                        //   submit_time: new Date()
                        // })

                        // 自动评分
                        // await axios.post(`http://localhost:3005/api/exam/records/${this.examRecord.id}/grade`)

                        this.isExamFinished = true
                        this.$message.success('考试提交成功!正在进行自动评分')

                        // 跳转到成绩页面
                        setTimeout(() => {
                            this.$router.push(`/student/exam-result/${this.examRecord.id}`)
                        }, 2000)
                    } catch (error) {
                        console.error('提交考试失败:', error)
                        this.$message.error('提交考试失败')
                    } finally {
                        this.submitting = false
                    }
                }
            })
        },

        // 导航方法
        previousQuestion () {
            if (this.currentQuestionIndex > 0) {
                this.currentQuestionIndex--
            }
        },

        nextQuestion () {
            if (this.currentQuestionIndex < this.questions.length - 1) {
                this.currentQuestionIndex++
            }
        },

        goToQuestion (index) {
            this.currentQuestionIndex = index
        },

        // 辅助方法
        formatTime (value) {
            const hours = Math.floor(value / 3600000)
            const minutes = Math.floor((value % 3600000) / 60000)
            const seconds = Math.floor((value % 60000) / 1000)

            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            }
            return `${minutes}:${seconds.toString().padStart(2, '0')}`
        },

        getDifficultyColor (difficulty) {
            const colors = { 1: 'green', 2: 'blue', 3: 'orange', 4: 'red', 5: 'purple' }
            return colors[difficulty] || 'default'
        },

        getDifficultyText (difficulty) {
            const texts = { 1: '简单', 2: '中等', 3: '困难', 4: '很难', 5: '极难' }
            return texts[difficulty] || '未知'
        },

        getTypeText (type) {
            return this.questionTypeMap[type] || type
        },

        getExamStatusColor () {
            if (this.isExamFinished) return 'success'
            if (this.isExamStarted) return 'processing'
            return 'default'
        },

        getExamStatusText () {
            if (this.isExamFinished) return '已完成'
            if (this.isExamStarted) return '进行中'
            return '未开始'
        }
    }
}
</script>

<style lang="less" scoped>
.exam-interface {
  min-height: 100vh;
  background: #f0f2f5;
  padding: 16px;

  .exam-header {
    margin-bottom: 16px;

    .exam-info {
      .exam-title {
        display: flex;
        align-items: center;
        margin-bottom: 16px;

        h3 {
          margin: 0;
          margin-right: 12px;
        }
      }

      .exam-meta {
        .ant-statistic {
          text-align: center;

          .ant-statistic-content {
            font-size: 16px;
          }
        }
      }
    }
  }

  .exam-content {
    .question-container {
      .question-navigation {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid #f0f0f0;

        .question-counter {
          font-size: 14px;
          color: #666;
        }
      }

      .question-content {
        .question-header {
          display: flex;
          align-items: center;
          margin-bottom: 16px;

          .ant-tag {
            margin-right: 8px;
          }

          .question-score {
            margin-left: auto;
            font-weight: bold;
            color: #1890ff;
          }
        }

        .question-title {
          font-size: 18px;
          color: #1890ff;
          margin-bottom: 12px;
          font-weight: 500;
        }

        .question-body {
          margin-bottom: 24px;
          line-height: 1.6;
          color: #333;
        }

        .answer-area {
          .option-item {
            margin: 12px 0;
            padding: 8px 12px;
            background: #fafafa;
            border-radius: 4px;
            border: 1px solid #e8e8e8;
            transition: all 0.3s;

            &:hover {
              border-color: #1890ff;
              background: #f6f8ff;
            }

            strong {
              color: #1890ff;
              margin-right: 8px;
            }
          }
        }
      }
    }

    .no-question {
      text-align: center;
      padding: 60px 0;
    }

    .question-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 16px;

      .question-grid-item {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
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

          &:hover {
            border-color: #1890ff;
            color: #1890ff;
          }
        }
      }
    }

    .grid-legend {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;

      .legend-item {
        display: flex;
        align-items: center;
        font-size: 12px;

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          margin-right: 8px;

          &.current {
            background: #1890ff;
          }

          &.answered {
            background: #52c41a;
          }

          &.unanswered {
            background: white;
            border: 1px solid #d9d9d9;
          }
        }

        .legend-text {
          color: #666;
        }
      }
    }

    .exam-actions {
      .ant-btn {
        font-weight: 500;
      }
    }

    .exam-status {
      .ant-alert {
        .ant-alert-message {
          font-size: 12px;
        }

        .ant-alert-description {
          font-size: 11px;
        }
      }
    }
  }

  // 响应式设计
  @media (max-width: 1200px) {
    .exam-content {
      .ant-col:first-child {
        margin-bottom: 16px;
      }
    }
  }

  @media (max-width: 768px) {
    padding: 8px;

    .exam-header {
      .exam-meta {
        .ant-col {
          margin-bottom: 12px;
        }
      }
    }

    .exam-content {
      .question-navigation {
        flex-direction: column;
        gap: 12px;
      }

      .question-grid {
        grid-template-columns: repeat(4, 1fr);

        .question-grid-item {
          width: 35px;
          height: 35px;
          font-size: 12px;
        }
      }
    }
  }
}
</style>
