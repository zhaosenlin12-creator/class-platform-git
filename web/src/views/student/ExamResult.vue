<template>
  <div class="exam-result">
    <div class="result-container">
      <!-- 成绩总览 -->
      <a-card class="result-overview" :bordered="false">
        <div class="result-header">
          <div class="result-title">
            <h2>{{ examRecord.paper_name || '考试结果' }}</h2>
            <a-tag :color="getResultColor()" size="large">
              {{ getResultText() }}
            </a-tag>
          </div>
          <div class="result-time">
            提交时间: {{ formatDateTime(examRecord.submit_time) }}
          </div>
        </div>

        <!-- 成绩统计 -->
        <div class="result-stats">
          <a-row :gutter="24">
            <a-col :span="6">
              <div class="stat-item">
                <div class="stat-value" :style="{ color: getScoreColor() }">
                  {{ examRecord.student_score || 0 }}
                </div>
                <div class="stat-label">总分</div>
                <div class="stat-sub">满分 {{ examRecord.total_score || 100 }}</div>
              </div>
            </a-col>
            <a-col :span="6">
              <div class="stat-item">
                <div class="stat-value" :style="{ color: getAccuracyColor() }">
                  {{ (examRecord.accuracy_rate || 0).toFixed(1) }}%
                </div>
                <div class="stat-label">正确率</div>
                <div class="stat-sub">{{ examRecord.correct_count || 0 }}/{{ getTotalQuestions() }}</div>
              </div>
            </a-col>
            <a-col :span="6">
              <div class="stat-item">
                <div class="stat-value" style="color: #1890ff;">
                  {{ examRecord.duration || 0 }}
                </div>
                <div class="stat-label">用时(分钟)</div>
                <div class="stat-sub">{{ getDurationText() }}</div>
              </div>
            </a-col>
            <a-col :span="6">
              <div class="stat-item">
                <div class="stat-value" style="color: #722ed1;">
                  {{ getRanking() }}
                </div>
                <div class="stat-label">班级排名</div>
                <div class="stat-sub">共 {{ getTotalStudents() }} 人</div>
              </div>
            </a-col>
          </a-row>
        </div>

        <!-- 成绩分析 -->
        <div class="result-analysis">
          <a-alert
            :message="getAnalysisTitle()"
            :description="getAnalysisDescription()"
            :type="getAnalysisType()"
            show-icon
          />
        </div>
      </a-card>

      <!-- 答题详情 -->
      <a-card title="答题详情" class="answer-details">
        <div class="detail-filters">
          <a-radio-group v-model="filterType" @change="filterAnswers">
            <a-radio-button value="all">全部题目</a-radio-button>
            <a-radio-button value="correct">答对题目</a-radio-button>
            <a-radio-button value="wrong">答错题目</a-radio-button>
            <a-radio-button value="unanswered">未答题目</a-radio-button>
          </a-radio-group>
        </div>

        <div class="answer-list">
          <div
            v-for="(answer, index) in filteredAnswers"
            :key="answer.question_id"
            class="answer-item"
            :class="{
              'correct': answer.is_correct,
              'wrong': !answer.is_correct && answer.student_answer,
              'unanswered': !answer.student_answer
            }"
          >
            <!-- 题目头部 -->
            <div class="answer-header">
              <div class="answer-number">
                第 {{ getQuestionNumber(answer.question_id) }} 题
              </div>
              <div class="answer-meta">
                <a-tag :color="getDifficultyColor(answer.difficulty)">
                  {{ getDifficultyText(answer.difficulty) }}
                </a-tag>
                <a-tag>{{ getTypeText(answer.question_type) }}</a-tag>
                <span class="answer-score">
                  {{ answer.student_score || 0 }} / {{ answer.question_score || 0 }} 分
                </span>
              </div>
              <div class="answer-status">
                <a-icon
                  v-if="answer.is_correct"
                  type="check-circle"
                  style="color: #52c41a; font-size: 18px;"
                />
                <a-icon
                  v-else-if="answer.student_answer"
                  type="close-circle"
                  style="color: #f5222d; font-size: 18px;"
                />
                <a-icon
                  v-else
                  type="exclamation-circle"
                  style="color: #faad14; font-size: 18px;"
                />
              </div>
            </div>

            <!-- 题目内容 -->
            <div class="answer-content">
              <div class="question-info">
                <h4 class="question-title">{{ answer.title }}</h4>
                <div class="question-body">{{ answer.content }}</div>

                <!-- 选择题选项 -->
                <div v-if="answer.options" class="question-options">
                  <div
                    v-for="(option, key) in answer.options"
                    :key="key"
                    class="option-item"
                    :class="{
                      'student-choice': isStudentChoice(key, answer.student_answer),
                      'correct-answer': isCorrectAnswer(key, answer.correct_answer),
                      'wrong-choice': isStudentChoice(key, answer.student_answer) && !isCorrectAnswer(key, answer.correct_answer)
                    }"
                  >
                    <strong>{{ key }}.</strong> {{ option }}
                  </div>
                </div>
              </div>

              <!-- 答案对比 -->
              <div class="answer-comparison">
                <div class="student-answer">
                  <strong>我的答案：</strong>
                  <span :class="{ 'correct': answer.is_correct, 'wrong': !answer.is_correct && answer.student_answer }">
                    {{ formatStudentAnswer(answer.student_answer) || '未答' }}
                  </span>
                </div>
                <div class="correct-answer">
                  <strong>正确答案：</strong>
                  <span class="correct">{{ formatCorrectAnswer(answer.correct_answer) }}</span>
                </div>
              </div>

              <!-- 答案解析 -->
              <div v-if="answer.explanation" class="answer-explanation">
                <div class="explanation-title">
                  <a-icon type="bulb" /> 答案解析
                </div>
                <div class="explanation-content">{{ answer.explanation }}</div>
              </div>

              <!-- 知识点 -->
              <div v-if="answer.knowledge_point" class="knowledge-point">
                <a-tag color="blue">{{ answer.knowledge_point }}</a-tag>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredAnswers.length === 0" class="empty-state">
          <a-empty :description="`暂无${getFilterDescription()}题目`" />
        </div>
      </a-card>

      <!-- 操作按钮 -->
      <div class="result-actions">
        <a-button size="large" @click="printResult" icon="printer">
          打印成绩单
        </a-button>
        <a-button size="large" @click="downloadReport" icon="download">
          下载详细报告
        </a-button>
        <a-button type="primary" size="large" @click="backToExamList">
          返回考试列表
        </a-button>
      </div>
    </div>
  </div>
</template>

<script>

export default {
    name: 'ExamResult',

    data () {
        return {
            // 考试记录
            examRecord: {
                id: '',
                paper_name: '',
                student_score: 0,
                total_score: 100,
                correct_count: 0,
                wrong_count: 0,
                accuracy_rate: 0,
                duration: 0,
                submit_time: null,
                exam_status: 3
            },

            // 答题详情
            examAnswers: [],
            filteredAnswers: [],
            filterType: 'all',

            // 加载状态
            loading: false,

            // 统计数据
            classStats: {
                totalStudents: 30,
                averageScore: 75,
                myRanking: 8
            }
        }
    },

    async mounted () {
        const recordId = this.$route.params.recordId || 'record001'
        await this.loadExamResult(recordId)
    },

    methods: {
    // 加载考试结果
        async loadExamResult (recordId) {
            try {
                this.loading = true

                // 模拟考试记录数据
                this.examRecord = {
                    id: recordId,
                    paper_name: 'Python基础测验',
                    student_score: 85,
                    total_score: 100,
                    correct_count: 4,
                    wrong_count: 1,
                    accuracy_rate: 80,
                    duration: 25,
                    submit_time: new Date(),
                    exam_status: 3
                }

                // 模拟答题详情数据（应该从API获取）
                this.examAnswers = [
                    {
                        question_id: 'eq001',
                        title: 'Python基础：变量赋值',
                        content: '下列哪个是Python中正确的变量赋值方式？',
                        question_type: 'choice',
                        difficulty: 1,
                        options: { 'A': 'var x = 10', 'B': 'x = 10', 'C': 'int x = 10', 'D': 'x := 10' },
                        student_answer: 'B',
                        correct_answer: 'B',
                        is_correct: true,
                        question_score: 20,
                        student_score: 20,
                        explanation: 'Python中变量赋值直接使用等号，不需要声明变量类型',
                        knowledge_point: 'Python基础语法'
                    },
                    {
                        question_id: 'eq002',
                        title: 'Scratch编程：循环结构',
                        content: '在Scratch中，哪个积木块用于创建循环？',
                        question_type: 'choice',
                        difficulty: 2,
                        options: { 'A': '移动10步', 'B': '重复10次', 'C': '如果...那么', 'D': '等待1秒' },
                        student_answer: 'B',
                        correct_answer: 'B',
                        is_correct: true,
                        question_score: 20,
                        student_score: 20,
                        explanation: '重复积木块用于创建循环结构，可以重复执行一组指令',
                        knowledge_point: 'Scratch循环'
                    },
                    {
                        question_id: 'eq003',
                        title: '编程思维：算法基础',
                        content: '算法的三个基本特征是什么？',
                        question_type: 'fill',
                        difficulty: 3,
                        options: null,
                        student_answer: '有穷性,确定性,高效性',
                        correct_answer: '有穷性,确定性,可行性',
                        is_correct: false,
                        question_score: 20,
                        student_score: 0,
                        explanation: '算法必须具有有穷性（有限步骤）、确定性（每步都有确切定义）、可行性（能够执行）',
                        knowledge_point: '算法基础'
                    },
                    {
                        question_id: 'eq004',
                        title: '编程概念：变量作用域',
                        content: '以下关于JavaScript变量作用域的描述，哪些是正确的？（多选）',
                        question_type: 'multiple',
                        difficulty: 2,
                        options: {
                            'A': '全局变量在整个程序中都可访问',
                            'B': '局部变量只能在定义它的函数内访问',
                            'C': 'let声明的变量具有块级作用域',
                            'D': 'var声明的变量总是全局变量'
                        },
                        student_answer: 'A,B,C',
                        correct_answer: 'A,B,C',
                        is_correct: true,
                        question_score: 20,
                        student_score: 20,
                        explanation: 'var声明的变量不总是全局变量，在函数内声明的var变量具有函数作用域',
                        knowledge_point: 'JavaScript作用域'
                    },
                    {
                        question_id: 'eq005',
                        title: '逻辑判断：条件表达式',
                        content: '表达式 (5 > 3) && (2 < 4) 的结果是 true。',
                        question_type: 'judge',
                        difficulty: 1,
                        options: null,
                        student_answer: 'true',
                        correct_answer: 'true',
                        is_correct: true,
                        question_score: 20,
                        student_score: 20,
                        explanation: '5 > 3 为true，2 < 4 为true，true && true 结果为 true',
                        knowledge_point: '逻辑运算'
                    }
                ]

                this.filterAnswers()
            } catch (error) {
                console.error('加载考试结果失败:', error)
                this.$message.error('加载考试结果失败')
            } finally {
                this.loading = false
            }
        },

        // 筛选答题结果
        filterAnswers () {
            switch (this.filterType) {
            case 'correct':
                this.filteredAnswers = this.examAnswers.filter(answer => answer.is_correct)
                break
            case 'wrong':
                this.filteredAnswers = this.examAnswers.filter(answer => !answer.is_correct && answer.student_answer)
                break
            case 'unanswered':
                this.filteredAnswers = this.examAnswers.filter(answer => !answer.student_answer)
                break
            default:
                this.filteredAnswers = [...this.examAnswers]
            }
        },

        // 判断学生选择
        isStudentChoice (option, studentAnswer) {
            if (!studentAnswer) return false
            const answers = studentAnswer.split(',')
            return answers.includes(option)
        },

        // 判断正确答案
        isCorrectAnswer (option, correctAnswer) {
            if (!correctAnswer) return false
            const answers = correctAnswer.split(',')
            return answers.includes(option)
        },

        // 格式化学生答案
        formatStudentAnswer (answer) {
            if (!answer) return ''
            if (answer === 'true') return '正确'
            if (answer === 'false') return '错误'
            return answer
        },

        // 格式化正确答案
        formatCorrectAnswer (answer) {
            if (!answer) return ''
            if (answer === 'true') return '正确'
            if (answer === 'false') return '错误'
            return answer
        },

        // 获取题目序号
        getQuestionNumber (questionId) {
            return this.examAnswers.findIndex(answer => answer.question_id === questionId) + 1
        },

        // 获取结果颜色
        getResultColor () {
            const score = this.examRecord.student_score
            const total = this.examRecord.total_score
            const percentage = (score / total) * 100

            if (percentage >= 90) return 'green'
            if (percentage >= 80) return 'blue'
            if (percentage >= 60) return 'orange'
            return 'red'
        },

        // 获取结果文本
        getResultText () {
            const score = this.examRecord.student_score
            const total = this.examRecord.total_score
            const percentage = (score / total) * 100

            if (percentage >= 90) return '优秀'
            if (percentage >= 80) return '良好'
            if (percentage >= 60) return '及格'
            return '不及格'
        },

        // 获取分数颜色
        getScoreColor () {
            const score = this.examRecord.student_score
            const total = this.examRecord.total_score
            const percentage = (score / total) * 100

            if (percentage >= 90) return '#52c41a'
            if (percentage >= 80) return '#1890ff'
            if (percentage >= 60) return '#fa8c16'
            return '#f5222d'
        },

        // 获取正确率颜色
        getAccuracyColor () {
            const accuracy = this.examRecord.accuracy_rate
            if (accuracy >= 90) return '#52c41a'
            if (accuracy >= 80) return '#1890ff'
            if (accuracy >= 60) return '#fa8c16'
            return '#f5222d'
        },

        // 获取总题数
        getTotalQuestions () {
            return this.examAnswers.length
        },

        // 获取用时描述
        getDurationText () {
            const duration = this.examRecord.duration
            if (duration >= 60) {
                return '超时完成'
            } else if (duration >= 45) {
                return '用时较长'
            } else if (duration >= 20) {
                return '用时正常'
            }
            return '用时较短'
        },

        // 获取排名
        getRanking () {
            return `第 ${this.classStats.myRanking} 名`
        },

        // 获取总人数
        getTotalStudents () {
            return this.classStats.totalStudents
        },

        // 获取分析标题
        getAnalysisTitle () {
            const percentage = (this.examRecord.student_score / this.examRecord.total_score) * 100
            if (percentage >= 90) return '表现优秀！'
            if (percentage >= 80) return '表现良好'
            if (percentage >= 60) return '达到及格线'
            return '需要加强学习'
        },

        // 获取分析描述
        getAnalysisDescription () {
            const accuracy = this.examRecord.accuracy_rate
            const avgScore = this.classStats.averageScore
            const myScore = this.examRecord.student_score

            let description = `您的正确率为 ${accuracy}%，`

            if (myScore > avgScore) {
                description += `成绩高于班级平均分(${avgScore}分)。`
            } else {
                description += `成绩低于班级平均分(${avgScore}分)，需要继续努力。`
            }

            if (this.examRecord.wrong_count > 0) {
                description += ` 建议重点复习答错的 ${this.examRecord.wrong_count} 道题目相关知识点。`
            }

            return description
        },

        // 获取分析类型
        getAnalysisType () {
            const percentage = (this.examRecord.student_score / this.examRecord.total_score) * 100
            if (percentage >= 80) return 'success'
            if (percentage >= 60) return 'info'
            return 'warning'
        },

        // 获取筛选描述
        getFilterDescription () {
            const map = {
                'all': '全部',
                'correct': '答对的',
                'wrong': '答错的',
                'unanswered': '未答的'
            }
            return map[this.filterType] || ''
        },

        // 辅助方法
        formatDateTime (date) {
            if (!date) return ''
            return new Date(date).toLocaleString('zh-CN')
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
            const typeMap = {
                'choice': '单选题',
                'multiple': '多选题',
                'fill': '填空题',
                'judge': '判断题',
                'code': '编程题',
                'essay': '问答题'
            }
            return typeMap[type] || type
        },

        // 操作方法
        printResult () {
            window.print()
        },

        downloadReport () {
            this.$message.success('下载功能开发中')
        },

        backToExamList () {
            this.$router.push('/student/homework')
        }
    }
}
</script>

<style lang="less" scoped>
.exam-result {
  min-height: 100vh;
  background: #f0f2f5;
  padding: 24px;

  .result-container {
    max-width: 1200px;
    margin: 0 auto;

    .result-overview {
      margin-bottom: 24px;

      .result-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 24px;

        .result-title {
          display: flex;
          align-items: center;
          gap: 16px;

          h2 {
            margin: 0;
            color: #1890ff;
          }
        }

        .result-time {
          color: #666;
          font-size: 14px;
        }
      }

      .result-stats {
        margin-bottom: 24px;

        .stat-item {
          text-align: center;
          padding: 16px;
          background: #fafafa;
          border-radius: 8px;
          border: 1px solid #f0f0f0;

          .stat-value {
            font-size: 32px;
            font-weight: bold;
            line-height: 1.2;
            margin-bottom: 8px;
          }

          .stat-label {
            font-size: 16px;
            color: #333;
            margin-bottom: 4px;
          }

          .stat-sub {
            font-size: 12px;
            color: #999;
          }
        }
      }

      .result-analysis {
        .ant-alert {
          border-radius: 8px;
        }
      }
    }

    .answer-details {
      margin-bottom: 24px;

      .detail-filters {
        margin-bottom: 16px;
        text-align: center;
      }

      .answer-list {
        .answer-item {
          margin-bottom: 24px;
          border: 2px solid #f0f0f0;
          border-radius: 8px;
          transition: all 0.3s;

          &.correct {
            border-color: #b7eb8f;
            background: #f6ffed;
          }

          &.wrong {
            border-color: #ffccc7;
            background: #fff2f0;
          }

          &.unanswered {
            border-color: #ffd591;
            background: #fff7e6;
          }

          .answer-header {
            display: flex;
            align-items: center;
            padding: 16px;
            border-bottom: 1px solid #f0f0f0;
            background: white;

            .answer-number {
              font-size: 16px;
              font-weight: bold;
              color: #1890ff;
              margin-right: 16px;
            }

            .answer-meta {
              flex: 1;
              display: flex;
              align-items: center;
              gap: 8px;

              .answer-score {
                margin-left: auto;
                font-weight: bold;
                color: #333;
              }
            }

            .answer-status {
              margin-left: 16px;
            }
          }

          .answer-content {
            padding: 16px;

            .question-info {
              margin-bottom: 16px;

              .question-title {
                font-size: 16px;
                color: #1890ff;
                margin-bottom: 8px;
              }

              .question-body {
                margin-bottom: 12px;
                line-height: 1.6;
                color: #333;
              }

              .question-options {
                .option-item {
                  padding: 8px 12px;
                  margin: 4px 0;
                  border-radius: 4px;
                  border: 1px solid transparent;

                  &.student-choice {
                    background: #e6f7ff;
                    border-color: #91d5ff;
                  }

                  &.correct-answer {
                    background: #f6ffed;
                    border-color: #b7eb8f;
                  }

                  &.wrong-choice {
                    background: #fff2f0;
                    border-color: #ffccc7;
                  }

                  strong {
                    color: #1890ff;
                    margin-right: 8px;
                  }
                }
              }
            }

            .answer-comparison {
              display: flex;
              gap: 24px;
              margin-bottom: 16px;
              padding: 12px;
              background: #fafafa;
              border-radius: 4px;

              .student-answer,
              .correct-answer {
                flex: 1;

                strong {
                  color: #333;
                }

                .correct {
                  color: #52c41a;
                  font-weight: 500;
                }

                .wrong {
                  color: #f5222d;
                  font-weight: 500;
                }
              }
            }

            .answer-explanation {
              margin-bottom: 16px;
              padding: 12px;
              background: #fff7e6;
              border: 1px solid #ffd591;
              border-radius: 4px;

              .explanation-title {
                font-weight: bold;
                color: #d4380d;
                margin-bottom: 8px;
              }

              .explanation-content {
                color: #d46b08;
                line-height: 1.6;
              }
            }

            .knowledge-point {
              text-align: right;
            }
          }
        }
      }

      .empty-state {
        text-align: center;
        padding: 60px 0;
      }
    }

    .result-actions {
      text-align: center;
      padding: 24px;

      .ant-btn {
        margin: 0 8px;
      }
    }
  }

  // 响应式设计
  @media (max-width: 768px) {
    padding: 12px;

    .result-container {
      .result-overview {
        .result-header {
          flex-direction: column;
          gap: 12px;

          .result-title {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }

        .result-stats {
          .ant-col {
            margin-bottom: 12px;
          }
        }
      }

      .answer-details {
        .answer-item {
          .answer-header {
            flex-wrap: wrap;
            gap: 8px;
          }

          .answer-content {
            .answer-comparison {
              flex-direction: column;
              gap: 12px;
            }
          }
        }
      }

      .result-actions {
        .ant-btn {
          margin: 4px;
          width: 100%;
        }
      }
    }
  }

  // 打印样式
  @media print {
    background: white !important;
    color: black !important;

    .result-actions {
      display: none;
    }

    .ant-card {
      border: 1px solid #ddd !important;
      box-shadow: none !important;
    }
  }
}
</style>
