<template>
  <a-modal
    title="学生答题详情"
    :width="900"
    :visible="visible"
    @cancel="handleCancel"
    :footer="null"
  >
    <div class="student-detail-container" v-if="studentData && examData">
      <!-- 学生基本信息 -->
      <div class="student-info-section">
        <a-card size="small" title="学生信息">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-statistic title="学号" :value="studentData.studentNo" />
            </a-col>
            <a-col :span="8">
              <a-statistic title="姓名" :value="studentData.studentName" />
            </a-col>
            <a-col :span="8">
              <a-statistic title="班级" :value="studentData.className" />
            </a-col>
          </a-row>
        </a-card>
      </div>

      <!-- 考试基本信息 -->
      <div class="exam-info-section">
        <a-card size="small" title="考试信息">
          <a-row :gutter="16">
            <a-col :span="6">
              <a-statistic
                title="得分"
                :value="examData.score || 0"
                :suffix="`/ ${examData.totalScore}`"
                :value-style="{ color: getScoreColor(examData.score, examData.totalScore) }"
              />
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="用时"
                :value="formatDuration(examData.duration)"
              />
            </a-col>
            <a-col :span="6">
              <a-statistic title="状态">
                <template #formatter>
                  <a-tag :color="getStatusColor(examData.status)">
                    {{ getStatusText(examData.status) }}
                  </a-tag>
                </template>
              </a-statistic>
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="正确率"
                :value="calculateAccuracy()"
                suffix="%"
                :precision="1"
              />
            </a-col>
          </a-row>
          <a-row :gutter="16" style="margin-top: 16px">
            <a-col :span="12">
              <p><strong>开始时间：</strong>{{ examData.startTime }}</p>
            </a-col>
            <a-col :span="12">
              <p><strong>提交时间：</strong>{{ examData.submitTime || '-' }}</p>
            </a-col>
          </a-row>
        </a-card>
      </div>

      <!-- 答题详情 -->
      <div class="answers-section">
        <a-card size="small" title="答题详情">
          <div class="questions-nav">
            <a-radio-group
              v-model="currentQuestionIndex"
              button-style="solid"
              size="small"
            >
              <a-radio-button
                v-for="(question, index) in questions"
                :key="index"
                :value="index"
                :class="getQuestionStatus(question, index)"
              >
                {{ index + 1 }}
              </a-radio-button>
            </a-radio-group>
          </div>

          <div v-if="currentQuestion" class="question-detail">
            <div class="question-header">
              <div class="question-title">
                <h4>第{{ currentQuestionIndex + 1 }}题</h4>
                <a-tag :color="getQuestionTypeColor(currentQuestion.questionType)">
                  {{ getQuestionTypeName(currentQuestion.questionType) }}
                </a-tag>
                <span class="question-score">（{{ currentQuestion.score }}分）</span>
              </div>
              <div class="question-result">
                <a-tag :color="isQuestionCorrect(currentQuestion) ? 'success' : 'error'">
                  {{ isQuestionCorrect(currentQuestion) ? '正确' : '错误' }}
                </a-tag>
                <span class="earned-score">
                  得分：{{ getCurrentQuestionScore() }}分
                </span>
              </div>
            </div>

            <div class="question-content">
              <h5>{{ currentQuestion.title }}</h5>
              <div v-if="currentQuestion.content" class="content-text">
                <div v-html="formatContent(currentQuestion.content)"></div>
              </div>
            </div>

            <!-- 选择题 -->
            <div v-if="['choice', 'multiple'].includes(currentQuestion.questionType)" class="choice-section">
              <div class="options-list">
                <div
                  v-for="(option, optIndex) in getQuestionOptions(currentQuestion)"
                  :key="optIndex"
                  class="option-item"
                  :class="{
                    'student-selected': isStudentSelected(optIndex),
                    'correct-option': isCorrectOption(optIndex),
                    'wrong-selection': isStudentSelected(optIndex) && !isCorrectOption(optIndex)
                  }"
                >
                  <span class="option-label">{{ String.fromCharCode(65 + optIndex) }}.</span>
                  <span class="option-text">{{ option.text }}</span>
                  <div class="option-indicators">
                    <a-icon
                      v-if="isStudentSelected(optIndex)"
                      type="check"
                      class="student-icon"
                      title="学生选择"
                    />
                    <a-icon
                      v-if="isCorrectOption(optIndex)"
                      type="check-circle"
                      class="correct-icon"
                      title="正确答案"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- 填空题 -->
            <div v-else-if="currentQuestion.questionType === 'fill'" class="fill-section">
              <div class="student-answer">
                <h6>学生答案：</h6>
                <div class="answer-content">
                  {{ getStudentAnswer() || '未作答' }}
                </div>
              </div>
              <div class="standard-answer">
                <h6>标准答案：</h6>
                <div class="answer-content">
                  <a-tag
                    v-for="(answer, idx) in getStandardAnswers(currentQuestion.answer)"
                    :key="idx"
                    color="green"
                  >
                    {{ answer }}
                  </a-tag>
                </div>
              </div>
            </div>

            <!-- 判断题 -->
            <div v-else-if="currentQuestion.questionType === 'judge'" class="judge-section">
              <div class="judge-options">
                <div class="judge-item" :class="{ 'selected': getStudentAnswer() === 'true', 'correct': currentQuestion.answer === 'true' }">
                  <a-icon type="check" v-if="getStudentAnswer() === 'true'" />
                  正确
                </div>
                <div class="judge-item" :class="{ 'selected': getStudentAnswer() === 'false', 'correct': currentQuestion.answer === 'false' }">
                  <a-icon type="check" v-if="getStudentAnswer() === 'false'" />
                  错误
                </div>
              </div>
            </div>

            <!-- 编程题和问答题 -->
            <div v-else-if="['code', 'essay'].includes(currentQuestion.questionType)" class="text-section">
              <div class="student-answer">
                <h6>学生答案：</h6>
                <div class="answer-content" :class="{ 'code-answer': currentQuestion.questionType === 'code' }">
                  <pre v-if="currentQuestion.questionType === 'code'"><code>{{ getStudentAnswer() || '未作答' }}</code></pre>
                  <p v-else>{{ getStudentAnswer() || '未作答' }}</p>
                </div>
              </div>
              <div class="reference-answer">
                <h6>参考答案：</h6>
                <div class="answer-content" :class="{ 'code-answer': currentQuestion.questionType === 'code' }">
                  <pre v-if="currentQuestion.questionType === 'code'"><code>{{ currentQuestion.answer }}</code></pre>
                  <p v-else>{{ currentQuestion.answer }}</p>
                </div>
              </div>
            </div>

            <!-- 答案解析 -->
            <div v-if="currentQuestion.explanation" class="explanation-section">
              <h6>答案解析：</h6>
              <div class="explanation-content">
                {{ currentQuestion.explanation }}
              </div>
            </div>
          </div>

          <!-- 导航按钮 -->
          <div class="question-navigation">
            <a-button
              :disabled="currentQuestionIndex === 0"
              @click="currentQuestionIndex--"
            >
              上一题
            </a-button>
            <a-button
              :disabled="currentQuestionIndex === questions.length - 1"
              @click="currentQuestionIndex++"
              type="primary"
              style="margin-left: 8px"
            >
              下一题
            </a-button>
          </div>
        </a-card>
      </div>
    </div>
  </a-modal>
</template>

<script>
import { getAction } from '@/api/manage'

export default {
    name: 'StudentDetailModal',
    data () {
        return {
            visible: false,
            loading: false,
            studentData: null,
            examData: null,
            questions: [],
            studentAnswers: [],
            currentQuestionIndex: 0
        }
    },
    computed: {
        currentQuestion () {
            return this.questions[this.currentQuestionIndex]
        }
    },
    methods: {
        async show (studentRecord, paperId) {
            this.studentData = studentRecord
            this.visible = true
            this.currentQuestionIndex = 0
            await this.loadExamDetail(studentRecord.id, paperId)
        },

        handleCancel () {
            this.visible = false
            this.studentData = null
            this.examData = null
            this.questions = []
            this.studentAnswers = []
            this.currentQuestionIndex = 0
        },

        async loadExamDetail (recordId, paperId) {
            this.loading = true
            try {
                const res = await getAction('/teaching/examRecord/detail', {
                    recordId,
                    paperId
                })
                if (res.success) {
                    this.examData = res.result.examData
                    this.questions = res.result.questions
                    this.studentAnswers = res.result.answers
                }
            } catch (error) {
                this.$message.error('加载答题详情失败')
                console.error(error)
            } finally {
                this.loading = false
            }
        },

        getQuestionStatus (question, index) {
            const isCorrect = this.isQuestionCorrect(question)
            const hasAnswer = this.hasStudentAnswer(index)

            if (!hasAnswer) return 'unanswered'
            return isCorrect ? 'correct' : 'incorrect'
        },

        isQuestionCorrect (question) {
            const studentAnswer = this.getStudentAnswer(question.id)

            if (question.questionType === 'choice') {
                return studentAnswer === question.answer
            } else if (question.questionType === 'multiple') {
                const correctAnswers = question.answer ? question.answer.split(',').sort() : []
                const studentAnswers = studentAnswer ? studentAnswer.split(',').sort() : []
                return JSON.stringify(correctAnswers) === JSON.stringify(studentAnswers)
            } else if (question.questionType === 'judge') {
                return studentAnswer === question.answer
            } else if (question.questionType === 'fill') {
                const standardAnswers = question.answer ? question.answer.split('|') : []
                return standardAnswers.some(ans =>
                    ans.trim().toLowerCase() === (studentAnswer || '').trim().toLowerCase()
                )
            }

            // 编程题和问答题需要人工评分，这里简单判断是否有答案
            return !!studentAnswer
        },

        hasStudentAnswer (questionIndex) {
            const question = this.questions[questionIndex]
            const answer = this.getStudentAnswer(question.id)
            return !!answer
        },

        getStudentAnswer (questionId = null) {
            const qId = questionId || (this.currentQuestion ? this.currentQuestion.id : null)
            if (!qId) return null

            const answerRecord = this.studentAnswers.find(ans => ans.questionId === qId)
            return answerRecord ? answerRecord.studentAnswer : null
        },

        getCurrentQuestionScore () {
            if (!this.currentQuestion) return 0
            const answerRecord = this.studentAnswers.find(ans =>
                ans.questionId === this.currentQuestion.id
            )
            return answerRecord ? answerRecord.score : 0
        },

        calculateAccuracy () {
            if (this.questions.length === 0) return 0
            const correctCount = this.questions.filter(q => this.isQuestionCorrect(q)).length
            return (correctCount / this.questions.length) * 100
        },

        getQuestionOptions (question) {
            if (!question.options) return []
            try {
                return JSON.parse(question.options)
            } catch (e) {
                return []
            }
        },

        isStudentSelected (optionIndex) {
            const studentAnswer = this.getStudentAnswer()
            if (!studentAnswer) return false

            const optionLabel = String.fromCharCode(65 + optionIndex)
            if (this.currentQuestion.questionType === 'multiple') {
                const answers = studentAnswer.split(',')
                return answers.includes(optionLabel)
            }
            return studentAnswer === optionLabel
        },

        isCorrectOption (optionIndex) {
            const correctAnswer = this.currentQuestion.answer
            const optionLabel = String.fromCharCode(65 + optionIndex)

            if (this.currentQuestion.questionType === 'multiple') {
                const answers = correctAnswer ? correctAnswer.split(',') : []
                return answers.includes(optionLabel)
            }
            return correctAnswer === optionLabel
        },

        getStandardAnswers (answer) {
            if (!answer) return []
            return answer.split('|').map(ans => ans.trim()).filter(ans => ans)
        },

        formatContent (content) {
            if (!content) return ''
            return content.replace(/\n/g, '<br/>')
        },

        formatDuration (minutes) {
            if (!minutes) return '-'
            const hours = Math.floor(minutes / 60)
            const mins = minutes % 60
            if (hours > 0) {
                return `${hours}小时${mins}分钟`
            }
            return `${mins}分钟`
        },

        getQuestionTypeName (type) {
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

        getQuestionTypeColor (type) {
            const colorMap = {
                choice: 'blue',
                multiple: 'cyan',
                fill: 'green',
                judge: 'orange',
                code: 'purple',
                essay: 'red'
            }
            return colorMap[type] || 'default'
        },

        getStatusColor (status) {
            const colorMap = {
                completed: 'success',
                in_progress: 'processing',
                not_started: 'default',
                timeout: 'warning',
                cheating: 'error'
            }
            return colorMap[status] || 'default'
        },

        getStatusText (status) {
            const textMap = {
                completed: '已完成',
                in_progress: '进行中',
                not_started: '未开始',
                timeout: '超时',
                cheating: '异常'
            }
            return textMap[status] || status
        },

        getScoreColor (score, totalScore) {
            const rate = score / totalScore
            if (rate >= 0.9) return '#52c41a'
            if (rate >= 0.8) return '#1890ff'
            if (rate >= 0.6) return '#faad14'
            return '#ff4d4f'
        }
    }
}
</script>

<style lang="less" scoped>
.student-detail-container {
  .student-info-section,
  .exam-info-section {
    margin-bottom: 16px;
  }

  .answers-section {
    .questions-nav {
      margin-bottom: 16px;

      .ant-radio-button-wrapper {
        &.correct::before {
          background: #52c41a;
        }
        &.incorrect::before {
          background: #ff4d4f;
        }
        &.unanswered::before {
          background: #d9d9d9;
        }
      }
    }

    .question-detail {
      .question-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding: 12px;
        background: #f5f5f5;
        border-radius: 4px;

        .question-title {
          display: flex;
          align-items: center;
          gap: 8px;

          h4 {
            margin: 0;
          }

          .question-score {
            color: #1890ff;
            font-weight: 500;
          }
        }

        .question-result {
          display: flex;
          align-items: center;
          gap: 8px;

          .earned-score {
            font-weight: 500;
            color: #666;
          }
        }
      }

      .question-content {
        margin-bottom: 16px;
        padding: 12px;
        background: white;
        border: 1px solid #f0f0f0;
        border-radius: 4px;

        h5 {
          margin-bottom: 8px;
          font-weight: 500;
        }

        .content-text {
          line-height: 1.6;
          color: #666;
        }
      }

      .choice-section {
        .options-list {
          .option-item {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            margin-bottom: 8px;
            border: 1px solid #d9d9d9;
            border-radius: 4px;
            background: white;

            &.student-selected {
              background: #e6f7ff;
              border-color: #1890ff;
            }

            &.correct-option {
              background: #f6ffed;
              border-color: #52c41a;
            }

            &.wrong-selection {
              background: #fff2f0;
              border-color: #ff4d4f;
            }

            .option-label {
              font-weight: bold;
              margin-right: 8px;
              min-width: 20px;
            }

            .option-text {
              flex: 1;
            }

            .option-indicators {
              display: flex;
              gap: 4px;

              .student-icon {
                color: #1890ff;
              }

              .correct-icon {
                color: #52c41a;
              }
            }
          }
        }
      }

      .fill-section,
      .text-section {
        .student-answer,
        .reference-answer,
        .standard-answer {
          margin-bottom: 12px;

          h6 {
            margin-bottom: 8px;
            font-weight: 500;
          }

          .answer-content {
            padding: 8px 12px;
            border-radius: 4px;

            &:not(.code-answer) {
              background: #f5f5f5;
              border: 1px solid #d9d9d9;
            }

            &.code-answer {
              pre {
                background: #f5f5f5;
                padding: 12px;
                border-radius: 4px;
                margin: 0;
                border: 1px solid #d9d9d9;

                code {
                  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                  font-size: 13px;
                  line-height: 1.4;
                }
              }
            }
          }
        }

        .reference-answer .answer-content {
          background: #e6f7ff;
        }
      }

      .judge-section {
        .judge-options {
          display: flex;
          gap: 16px;

          .judge-item {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 8px 16px;
            border: 1px solid #d9d9d9;
            border-radius: 4px;
            background: white;

            &.selected {
              background: #e6f7ff;
              border-color: #1890ff;
            }

            &.correct {
              background: #f6ffed;
              border-color: #52c41a;
            }
          }
        }
      }

      .explanation-section {
        margin-top: 16px;
        padding: 12px;
        background: #fff7e6;
        border-radius: 4px;

        h6 {
          margin-bottom: 8px;
          font-weight: 500;
        }

        .explanation-content {
          line-height: 1.6;
          color: #666;
        }
      }
    }

    .question-navigation {
      text-align: center;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #f0f0f0;
    }
  }
}
</style>
