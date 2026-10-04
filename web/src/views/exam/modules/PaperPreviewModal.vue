<template>
  <a-modal
    title="试卷预览"
    :width="900"
    :visible="visible"
    @cancel="handleCancel"
    :footer="null"
  >
    <div class="paper-preview" v-if="paperData">
      <!-- 试卷基本信息 -->
      <div class="paper-header">
        <div class="paper-title">
          <h2>{{ paperData.paperName }}</h2>
          <div class="paper-meta">
            <a-tag :color="getExamTypeColor(paperData.examType)">
              {{ getExamTypeName(paperData.examType) }}
            </a-tag>
            <a-tag color="blue">{{ paperData.duration }}分钟</a-tag>
            <a-tag color="green">总分：{{ paperData.totalScore }}分</a-tag>
            <a-tag color="purple">{{ paperData.questionCount }}题</a-tag>
          </div>
        </div>

        <div class="paper-info">
          <a-descriptions :column="2" size="small">
            <a-descriptions-item label="考试时间">
              {{ formatTime(paperData.startTime) }} - {{ formatTime(paperData.endTime) }}
            </a-descriptions-item>
            <a-descriptions-item label="考试时长">
              {{ paperData.duration }}分钟
            </a-descriptions-item>
            <a-descriptions-item label="试卷状态" :span="2">
              <a-badge :status="getStatusBadge(paperData.status).status" :text="getStatusBadge(paperData.status).text" />
            </a-descriptions-item>
          </a-descriptions>
        </div>

        <div v-if="paperData.description" class="paper-description">
          <h4>考试说明：</h4>
          <p>{{ paperData.description }}</p>
        </div>
      </div>

      <a-divider />

      <!-- 题目列表 -->
      <div class="questions-section" v-if="questions.length > 0">
        <div class="section-header">
          <h3>题目预览</h3>
          <a-space>
            <a-switch
              v-model="showAnswers"
              checked-children="显示答案"
              un-checked-children="隐藏答案"
            />
            <a-button size="small" @click="printPaper">
              <a-icon type="printer" />
              打印试卷
            </a-button>
          </a-space>
        </div>

        <div class="questions-list">
          <div
            v-for="(question, index) in questions"
            :key="question.id"
            class="question-item"
          >
            <!-- 题目标题 -->
            <div class="question-header">
              <div class="question-number">
                第{{ index + 1 }}题
                <a-tag :color="getQuestionTypeColor(question.questionType)" size="small">
                  {{ getQuestionTypeName(question.questionType) }}
                </a-tag>
                <span class="question-score">（{{ question.score }}分）</span>
              </div>
              <div class="question-difficulty">
                <a-rate :value="question.difficulty" disabled style="font-size: 12px" />
              </div>
            </div>

            <!-- 题目内容 -->
            <div class="question-title">
              <h4>{{ question.title }}</h4>
            </div>

            <div class="question-content" v-if="question.content">
              <div v-html="formatContent(question.content)"></div>
            </div>

            <!-- 选择题选项 -->
            <div v-if="['choice', 'multiple'].includes(question.questionType)" class="question-options">
              <div
                v-for="(option, optIndex) in getQuestionOptions(question)"
                :key="optIndex"
                class="option-item"
                :class="{ 'correct-option': showAnswers && isCorrectOption(question, optIndex) }"
              >
                <span class="option-label">{{ String.fromCharCode(65 + optIndex) }}.</span>
                <span class="option-text">{{ option.text }}</span>
                <a-icon v-if="showAnswers && isCorrectOption(question, optIndex)" type="check-circle" class="correct-icon" />
              </div>
            </div>

            <!-- 填空题 -->
            <div v-if="question.questionType === 'fill'" class="fill-question">
              <div class="answer-space">
                _______________
              </div>
              <div v-if="showAnswers" class="standard-answer">
                <strong>标准答案：</strong>
                <a-tag v-for="(answer, idx) in getStandardAnswers(question.answer)" :key="idx" color="green">
                  {{ answer }}
                </a-tag>
              </div>
            </div>

            <!-- 判断题 -->
            <div v-if="question.questionType === 'judge'" class="judge-question">
              <a-radio-group disabled>
                <a-radio value="true" :checked="showAnswers && question.answer === 'true'">正确</a-radio>
                <a-radio value="false" :checked="showAnswers && question.answer === 'false'">错误</a-radio>
              </a-radio-group>
              <div v-if="showAnswers" class="correct-answer">
                <a-icon type="check-circle" style="color: #52c41a; margin-right: 4px" />
                正确答案：{{ question.answer === 'true' ? '正确' : '错误' }}
              </div>
            </div>

            <!-- 编程题和问答题 -->
            <div v-if="['code', 'essay'].includes(question.questionType)" class="text-question">
              <div class="answer-area">
                <a-textarea
                  placeholder="答题区域..."
                  :rows="question.questionType === 'code' ? 8 : 4"
                  disabled
                />
              </div>
              <div v-if="showAnswers" class="reference-answer">
                <strong>参考答案：</strong>
                <div class="answer-content" :class="{ 'code-answer': question.questionType === 'code' }">
                  <pre v-if="question.questionType === 'code'"><code>{{ question.answer }}</code></pre>
                  <p v-else>{{ question.answer }}</p>
                </div>
              </div>
            </div>

            <!-- 答案解析 -->
            <div v-if="showAnswers && question.explanation" class="question-explanation">
              <strong>答案解析：</strong>
              <p>{{ question.explanation }}</p>
            </div>

            <!-- 题目信息 -->
            <div class="question-meta">
              <span v-if="question.knowledgePoint" class="knowledge-point">
                知识点：{{ question.knowledgePoint }}
              </span>
              <span class="question-stats">
                使用{{ question.useCount || 0 }}次 |
                正确率{{ formatCorrectRate(question.correctRate) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-else-if="loading" class="loading-section">
        <a-spin size="large">
          <div style="height: 200px; display: flex; align-items: center; justify-content: center;">
            正在加载题目...
          </div>
        </a-spin>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-section">
        <a-empty description="暂无题目" />
      </div>
    </div>
  </a-modal>
</template>

<script>
import { getAction } from '@/api/manage'

export default {
    name: 'PaperPreviewModal',
    data () {
        return {
            visible: false,
            paperData: null,
            questions: [],
            loading: false,
            showAnswers: false
        }
    },
    methods: {
        async show (record) {
            this.paperData = record
            this.visible = true
            this.questions = []
            this.showAnswers = false
            await this.loadQuestions()
        },

        handleCancel () {
            this.visible = false
            this.paperData = null
            this.questions = []
            this.showAnswers = false
        },

        async loadQuestions () {
            if (!this.paperData || !this.paperData.id) return

            this.loading = true
            try {
                const res = await getAction('/teaching/examPaper/questions', {
                    paperId: this.paperData.id,
                    includeAnswer: true
                })
                if (res.success) {
                    this.questions = res.result || []
                }
            } catch (error) {
                this.$message.error('加载题目失败')
                console.error(error)
            } finally {
                this.loading = false
            }
        },

        getExamTypeName (type) {
            const typeMap = {
                quiz: '随堂测验',
                midterm: '期中考试',
                final: '期末考试',
                assignment: '作业'
            }
            return typeMap[type] || type
        },

        getExamTypeColor (type) {
            const colorMap = {
                quiz: 'blue',
                midterm: 'orange',
                final: 'red',
                assignment: 'green'
            }
            return colorMap[type] || 'default'
        },

        getStatusBadge (status) {
            const statusMap = {
                draft: { status: 'default', text: '草稿' },
                published: { status: 'processing', text: '进行中' },
                closed: { status: 'success', text: '已结束' }
            }
            return statusMap[status] || { status: 'default', text: status }
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

        getQuestionOptions (question) {
            if (!question.options) return []
            try {
                return JSON.parse(question.options)
            } catch (e) {
                return []
            }
        },

        isCorrectOption (question, index) {
            const correctAnswer = question.answer
            const optionLabel = String.fromCharCode(65 + index)

            if (question.questionType === 'multiple') {
                const answers = correctAnswer ? correctAnswer.split(',') : []
                return answers.includes(optionLabel)
            } else {
                return correctAnswer === optionLabel
            }
        },

        getStandardAnswers (answer) {
            if (!answer) return []
            return answer.split('|').map(ans => ans.trim()).filter(ans => ans)
        },

        formatContent (content) {
            if (!content) return ''
            return content.replace(/\n/g, '<br/>')
        },

        formatTime (time) {
            if (!time) return '-'
            return this.$moment(time).format('YYYY-MM-DD HH:mm')
        },

        formatCorrectRate (rate) {
            if (rate === null || rate === undefined) return '-'
            return `${(rate * 100).toFixed(1)}%`
        },

        printPaper () {
            // 简单的打印功能
            window.print()
        }
    }
}
</script>

<style lang="less" scoped>
.paper-preview {
  .paper-header {
    margin-bottom: 24px;

    .paper-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;

      h2 {
        margin: 0;
        flex: 1;
      }

      .paper-meta {
        display: flex;
        gap: 8px;
      }
    }

    .paper-description {
      margin-top: 16px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 4px;

      h4 {
        margin-bottom: 8px;
      }

      p {
        margin: 0;
        color: #666;
      }
    }
  }

  .questions-section {
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;

      h3 {
        margin: 0;
      }
    }

    .question-item {
      margin-bottom: 32px;
      padding: 16px;
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      background: #fafafa;

      .question-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;

        .question-number {
          font-weight: bold;
          font-size: 16px;

          .question-score {
            color: #1890ff;
            margin-left: 8px;
          }
        }
      }

      .question-title {
        margin-bottom: 12px;

        h4 {
          margin: 0;
          font-weight: 500;
        }
      }

      .question-content {
        margin-bottom: 16px;
        padding: 12px;
        background: white;
        border-radius: 4px;
        line-height: 1.6;
      }

      .question-options {
        margin-bottom: 16px;

        .option-item {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          margin-bottom: 8px;
          background: white;
          border: 1px solid #d9d9d9;
          border-radius: 4px;

          &.correct-option {
            background: #f6ffed;
            border-color: #52c41a;
            color: #52c41a;
            font-weight: 500;
          }

          .option-label {
            font-weight: bold;
            margin-right: 8px;
            min-width: 20px;
          }

          .option-text {
            flex: 1;
          }

          .correct-icon {
            color: #52c41a;
            margin-left: 8px;
          }
        }
      }

      .fill-question {
        margin-bottom: 16px;

        .answer-space {
          font-size: 16px;
          text-align: center;
          margin: 16px 0;
        }

        .standard-answer {
          margin-top: 12px;
          padding: 8px;
          background: #e6f7ff;
          border-radius: 4px;
        }
      }

      .judge-question {
        margin-bottom: 16px;

        .correct-answer {
          margin-top: 12px;
          color: #52c41a;
          font-weight: 500;
        }
      }

      .text-question {
        margin-bottom: 16px;

        .reference-answer {
          margin-top: 12px;
          padding: 12px;
          background: #e6f7ff;
          border-radius: 4px;

          .answer-content {
            margin-top: 8px;

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
      }

      .question-explanation {
        margin-bottom: 12px;
        padding: 12px;
        background: #fff7e6;
        border-radius: 4px;

        p {
          margin: 8px 0 0 0;
          color: #666;
          line-height: 1.6;
        }
      }

      .question-meta {
        display: flex;
        justify-content: space-between;
        color: #999;
        font-size: 12px;

        .knowledge-point {
          color: #666;
        }
      }
    }
  }

  .loading-section,
  .empty-section {
    text-align: center;
    padding: 40px 0;
  }
}

// 打印样式
@media print {
  .ant-modal-mask,
  .ant-modal-wrap {
    display: none !important;
  }

  .paper-preview {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;

    .section-header .ant-space {
      display: none;
    }
  }
}
</style>
