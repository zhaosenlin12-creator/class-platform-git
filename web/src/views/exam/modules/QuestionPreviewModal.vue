<template>
  <a-modal
    title="题目预览"
    :width="700"
    :visible="visible"
    @cancel="handleCancel"
    :footer="null"
  >
    <div class="question-preview" v-if="questionData">
      <!-- 题目基本信息 -->
      <div class="question-header">
        <a-row>
          <a-col :span="12">
            <a-tag :color="getQuestionTypeColor(questionData.questionType)">
              {{ getQuestionTypeName(questionData.questionType) }}
            </a-tag>
            <a-tag color="blue">{{ questionData.score }}分</a-tag>
          </a-col>
          <a-col :span="12" style="text-align: right">
            <a-rate :value="questionData.difficulty" disabled style="font-size: 14px" />
          </a-col>
        </a-row>
      </div>

      <!-- 题目标题 -->
      <div class="question-title">
        <h3>{{ questionData.title }}</h3>
      </div>

      <!-- 题目内容 -->
      <div class="question-content">
        <div v-html="formatContent(questionData.content)"></div>
      </div>

      <!-- 选择题选项 -->
      <div v-if="['choice', 'multiple'].includes(questionData.questionType)" class="question-options">
        <div
          v-for="(option, index) in getOptions()"
          :key="index"
          class="option-item"
          :class="{ 'correct-option': isCorrectOption(index) }"
        >
          <span class="option-label">{{ String.fromCharCode(65 + index) }}.</span>
          <span class="option-text">{{ option.text }}</span>
          <a-icon v-if="isCorrectOption(index)" type="check-circle" class="correct-icon" />
        </div>
      </div>

      <!-- 填空题答案 -->
      <div v-if="questionData.questionType === 'fill'" class="question-answer">
        <p><strong>标准答案：</strong></p>
        <div class="answer-content">
          <a-tag
            v-for="(answer, index) in getStandardAnswers()"
            :key="index"
            color="green"
          >
            {{ answer }}
          </a-tag>
        </div>
      </div>

      <!-- 判断题答案 -->
      <div v-if="questionData.questionType === 'judge'" class="question-answer">
        <p><strong>正确答案：</strong></p>
        <div class="answer-content">
          <a-tag :color="questionData.answer === 'true' ? 'green' : 'red'">
            {{ questionData.answer === 'true' ? '正确' : '错误' }}
          </a-tag>
        </div>
      </div>

      <!-- 编程题答案 -->
      <div v-if="questionData.questionType === 'code'" class="question-answer">
        <p><strong>参考答案：</strong></p>
        <div class="code-answer">
          <pre><code>{{ questionData.answer }}</code></pre>
        </div>
      </div>

      <!-- 问答题答案 -->
      <div v-if="questionData.questionType === 'essay'" class="question-answer">
        <p><strong>参考答案：</strong></p>
        <div class="answer-content">
          {{ questionData.answer }}
        </div>
      </div>

      <!-- 答案解析 -->
      <div v-if="questionData.explanation" class="question-explanation">
        <p><strong>答案解析：</strong></p>
        <div class="explanation-content">
          {{ questionData.explanation }}
        </div>
      </div>

      <!-- 题目信息 -->
      <div class="question-info">
        <a-divider />
        <a-row :gutter="16">
          <a-col :span="8">
            <p><strong>知识点：</strong>{{ questionData.knowledgePoint || '-' }}</p>
          </a-col>
          <a-col :span="8">
            <p><strong>使用次数：</strong>{{ questionData.useCount || 0 }}次</p>
          </a-col>
          <a-col :span="8">
            <p><strong>正确率：</strong>{{ formatCorrectRate(questionData.correctRate) }}</p>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <p><strong>创建时间：</strong>{{ questionData.createTime }}</p>
          </a-col>
          <a-col :span="12">
            <p><strong>更新时间：</strong>{{ questionData.updateTime || '-' }}</p>
          </a-col>
        </a-row>
        <div v-if="getTags().length > 0">
          <p><strong>标签：</strong></p>
          <a-tag v-for="tag in getTags()" :key="tag" color="purple">{{ tag }}</a-tag>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script>
export default {
    name: 'QuestionPreviewModal',
    data () {
        return {
            visible: false,
            questionData: null
        }
    },
    methods: {
        show (record) {
            this.questionData = record
            this.visible = true
        },

        handleCancel () {
            this.visible = false
            this.questionData = null
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

        getOptions () {
            if (!this.questionData.options) return []
            try {
                return JSON.parse(this.questionData.options)
            } catch (e) {
                return []
            }
        },

        isCorrectOption (index) {
            const correctAnswer = this.questionData.answer
            const optionLabel = String.fromCharCode(65 + index)

            if (this.questionData.questionType === 'multiple') {
                // 多选题答案可能是逗号分隔的字符串
                const answers = correctAnswer ? correctAnswer.split(',') : []
                return answers.includes(optionLabel)
            } else {
                // 单选题
                return correctAnswer === optionLabel
            }
        },

        getStandardAnswers () {
            if (!this.questionData.answer) return []
            return this.questionData.answer.split('|').map(ans => ans.trim()).filter(ans => ans)
        },

        getTags () {
            if (!this.questionData.tags) return []
            return this.questionData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        },

        formatContent (content) {
            if (!content) return ''
            // 简单的换行处理
            return content.replace(/\n/g, '<br/>')
        },

        formatCorrectRate (rate) {
            if (rate === null || rate === undefined) return '-'
            return `${(rate * 100).toFixed(1)}%`
        }
    }
}
</script>

<style lang="less" scoped>
.question-preview {
  .question-header {
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f0f0f0;
  }

  .question-title {
    margin-bottom: 16px;

    h3 {
      margin: 0;
      color: #333;
    }
  }

  .question-content {
    margin-bottom: 16px;
    padding: 12px;
    background: #fafafa;
    border-radius: 4px;
    line-height: 1.6;
  }

  .question-options {
    margin-bottom: 16px;

    .option-item {
      display: flex;
      align-items: center;
      padding: 8px;
      margin-bottom: 8px;
      border-radius: 4px;
      border: 1px solid #d9d9d9;

      &.correct-option {
        background: #f6ffed;
        border-color: #52c41a;
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

  .question-answer {
    margin-bottom: 16px;

    .answer-content {
      padding: 12px;
      background: #e6f7ff;
      border-radius: 4px;
      margin-top: 8px;
    }

    .code-answer {
      margin-top: 8px;

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

  .question-explanation {
    margin-bottom: 16px;

    .explanation-content {
      padding: 12px;
      background: #fff7e6;
      border-radius: 4px;
      margin-top: 8px;
      line-height: 1.6;
    }
  }

  .question-info {
    p {
      margin-bottom: 8px;
      color: #666;

      strong {
        color: #333;
      }
    }
  }
}
</style>
