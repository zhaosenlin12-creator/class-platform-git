<template>
  <div class="assignment-statistics">
    <div class="stats-header">
      <h3>{{ assignment.title }} - 统计分析</h3>
      <div class="header-actions">
        <el-button @click="refreshData" :loading="loading">
          <i class="el-icon-refresh"></i> 刷新
        </el-button>
        <el-button @click="exportReport">
          <i class="el-icon-download"></i> 导出报告
        </el-button>
      </div>
    </div>

    <el-row :gutter="20" v-loading="loading">
      <!-- 基础统计 -->
      <el-col :span="24">
        <el-card class="stats-overview">
          <div slot="header">
            <span>基础统计</span>
          </div>

          <el-row :gutter="20">
            <el-col :span="4">
              <div class="stat-item">
                <div class="stat-value">{{ basicStats.totalStudents }}</div>
                <div class="stat-label">总人数</div>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="stat-item">
                <div class="stat-value text-success">{{ basicStats.submitted }}</div>
                <div class="stat-label">已提交</div>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="stat-item">
                <div class="stat-value text-warning">{{ basicStats.notSubmitted }}</div>
                <div class="stat-label">未提交</div>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="stat-item">
                <div class="stat-value">{{ basicStats.submissionRate }}%</div>
                <div class="stat-label">提交率</div>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="stat-item">
                <div class="stat-value">{{ basicStats.averageScore.toFixed(1) }}</div>
                <div class="stat-label">平均分</div>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="stat-item">
                <div class="stat-value">{{ basicStats.passRate }}%</div>
                <div class="stat-label">及格率</div>
              </div>
            </el-col>
          </el-row>
        </el-card>
      </el-col>

      <!-- 分数分布图表 -->
      <el-col :span="12">
        <el-card>
          <div slot="header">
            <span>分数分布</span>
          </div>
          <div ref="scoreChart" style="height: 300px;"></div>
        </el-card>
      </el-col>

      <!-- 提交时间分析 -->
      <el-col :span="12">
        <el-card>
          <div slot="header">
            <span>提交时间分析</span>
          </div>
          <div ref="timeChart" style="height: 300px;"></div>
        </el-card>
      </el-col>

      <!-- 题目分析 -->
      <el-col :span="24" v-if="assignment.questions && assignment.questions.length > 0">
        <el-card>
          <div slot="header">
            <span>题目分析</span>
          </div>

          <el-table :data="questionStats" style="width: 100%">
            <el-table-column prop="questionNumber" label="题号" width="80"></el-table-column>
            <el-table-column prop="content" label="题目内容" min-width="200">
              <template slot-scope="scope">
                <div class="question-content">
                  {{ scope.row.content.length > 50 ? scope.row.content.substring(0, 50) + '...' : scope.row.content }}
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="type" label="题型" width="100">
              <template slot-scope="scope">
                {{ getQuestionTypeName(scope.row.type) }}
              </template>
            </el-table-column>
            <el-table-column prop="totalScore" label="总分" width="80"></el-table-column>
            <el-table-column prop="averageScore" label="平均分" width="100">
              <template slot-scope="scope">
                {{ scope.row.averageScore.toFixed(1) }}
              </template>
            </el-table-column>
            <el-table-column prop="correctRate" label="正确率" width="100">
              <template slot-scope="scope">
                <span :class="getCorrectRateClass(scope.row.correctRate)">
                  {{ scope.row.correctRate.toFixed(1) }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="difficulty" label="难度" width="100">
              <template slot-scope="scope">
                <el-tag :type="getDifficultyTagType(scope.row.difficulty)">
                  {{ getDifficultyName(scope.row.difficulty) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template slot-scope="scope">
                <el-button size="mini" @click="viewQuestionDetail(scope.row)">
                  详细分析
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <!-- 班级对比 -->
      <el-col :span="12">
        <el-card>
          <div slot="header">
            <span>班级对比</span>
          </div>
          <div ref="classChart" style="height: 300px;"></div>
        </el-card>
      </el-col>

      <!-- 成绩排名 -->
      <el-col :span="12">
        <el-card>
          <div slot="header">
            <span>成绩排名（前10名）</span>
          </div>

          <div class="ranking-list">
            <div
              v-for="(student, index) in topStudents"
              :key="student.id"
              class="ranking-item"
            >
              <div class="rank-number">
                <i :class="getRankIcon(index)" :style="getRankStyle(index)"></i>
                {{ index + 1 }}
              </div>
              <div class="student-info">
                <div class="student-name">{{ student.name }}</div>
                <div class="student-class">{{ student.className }}</div>
              </div>
              <div class="student-score">
                <span class="score">{{ student.score }}</span>
                <span class="total">/ {{ assignment.totalScore }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 错误分析 -->
      <el-col :span="24" v-if="errorAnalysis.length > 0">
        <el-card>
          <div slot="header">
            <span>错误分析</span>
          </div>

          <div class="error-analysis">
            <div
              v-for="error in errorAnalysis"
              :key="error.questionId"
              class="error-item"
            >
              <div class="error-header">
                <h4>题目 {{ error.questionNumber }}: {{ error.questionContent }}</h4>
                <span class="error-rate">错误率: {{ error.errorRate }}%</span>
              </div>

              <div class="error-options" v-if="error.options">
                <div
                  v-for="option in error.options"
                  :key="option.index"
                  class="option-analysis"
                >
                  <div class="option-content">
                    {{ String.fromCharCode(65 + option.index) }}. {{ option.content }}
                  </div>
                  <div class="option-stats">
                    <div class="selection-rate">
                      <el-progress
                        :percentage="option.selectionRate"
                        :status="option.isCorrect ? 'success' : ''"
                        :stroke-width="8"
                      ></el-progress>
                      <span>{{ option.selectionRate }}%</span>
                    </div>
                    <div class="option-label">
                      <el-tag v-if="option.isCorrect" type="success" size="mini">正确答案</el-tag>
                    </div>
                  </div>
                </div>
              </div>

              <div class="common-errors" v-if="error.commonErrors">
                <h5>常见错误:</h5>
                <ul>
                  <li v-for="commonError in error.commonErrors" :key="commonError">
                    {{ commonError }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 题目详细分析对话框 -->
    <el-dialog
      title="题目详细分析"
      :visible.sync="showQuestionDialog"
      width="80%"
    >
      <div v-if="selectedQuestion" class="question-detail">
        <div class="question-info">
          <h4>{{ selectedQuestion.content }}</h4>
          <div class="question-meta">
            <span>题型: {{ getQuestionTypeName(selectedQuestion.type) }}</span>
            <span>分值: {{ selectedQuestion.totalScore }}分</span>
            <span>平均分: {{ selectedQuestion.averageScore.toFixed(1) }}分</span>
            <span>正确率: {{ selectedQuestion.correctRate.toFixed(1) }}%</span>
          </div>
        </div>

        <div ref="questionDetailChart" style="height: 400px; margin: 20px 0;"></div>

        <div class="answer-distribution">
          <h5>答案分布:</h5>
          <el-table :data="selectedQuestion.answerDistribution" style="width: 100%">
            <el-table-column prop="answer" label="答案" width="200"></el-table-column>
            <el-table-column prop="count" label="人数" width="100"></el-table-column>
            <el-table-column prop="percentage" label="占比" width="100">
              <template slot-scope="scope">
                {{ scope.row.percentage }}%
              </template>
            </el-table-column>
            <el-table-column prop="score" label="平均得分" width="100">
              <template slot-scope="scope">
                {{ scope.row.score.toFixed(1) }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import * as echarts from 'echarts'

export default {
    name: 'AssignmentStatistics',
    props: {
        assignment: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            loading: false,
            basicStats: {
                totalStudents: 0,
                submitted: 0,
                notSubmitted: 0,
                submissionRate: 0,
                averageScore: 0,
                passRate: 0
            },
            questionStats: [],
            classStats: [],
            topStudents: [],
            errorAnalysis: [],
            scoreDistribution: [],
            submissionTimeData: [],
            showQuestionDialog: false,
            selectedQuestion: null,
            charts: {}
        }
    },
    mounted () {
        this.loadStatistics()
    },
    beforeDestroy () {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.dispose()
            }
        })
    },
    methods: {
        async loadStatistics () {
            this.loading = true
            try {
                const response = await this.$http.get(`/api/assignments/${this.assignment.id}/statistics`)
                const data = response.data

                this.basicStats = data.basicStats || this.basicStats
                this.questionStats = data.questionStats || []
                this.classStats = data.classStats || []
                this.topStudents = data.topStudents || []
                this.errorAnalysis = data.errorAnalysis || []
                this.scoreDistribution = data.scoreDistribution || []
                this.submissionTimeData = data.submissionTimeData || []

                this.$nextTick(() => {
                    this.initCharts()
                })
            } catch (error) {
                console.error('加载统计数据失败:', error)
                this.$message.error('加载统计数据失败')
            } finally {
                this.loading = false
            }
        },

        initCharts () {
            this.initScoreChart()
            this.initTimeChart()
            this.initClassChart()
        },

        initScoreChart () {
            if (this.charts.scoreChart) {
                this.charts.scoreChart.dispose()
            }

            const chart = echarts.init(this.$refs.scoreChart)
            this.charts.scoreChart = chart

            const option = {
                title: {
                    text: '分数分布',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow'
                    }
                },
                xAxis: {
                    type: 'category',
                    data: this.scoreDistribution.map(item => item.range)
                },
                yAxis: {
                    type: 'value',
                    name: '人数'
                },
                series: [
                    {
                        name: '人数',
                        type: 'bar',
                        data: this.scoreDistribution.map(item => item.count),
                        itemStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: '#409EFF' },
                                { offset: 1, color: '#89CDF1' }
                            ])
                        }
                    }
                ]
            }

            chart.setOption(option)
        },

        initTimeChart () {
            if (this.charts.timeChart) {
                this.charts.timeChart.dispose()
            }

            const chart = echarts.init(this.$refs.timeChart)
            this.charts.timeChart = chart

            const option = {
                title: {
                    text: '提交时间分布',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'axis'
                },
                xAxis: {
                    type: 'category',
                    data: this.submissionTimeData.map(item => item.time)
                },
                yAxis: {
                    type: 'value',
                    name: '提交人数'
                },
                series: [
                    {
                        name: '提交人数',
                        type: 'line',
                        data: this.submissionTimeData.map(item => item.count),
                        smooth: true,
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(64, 158, 255, 0.5)' },
                                { offset: 1, color: 'rgba(64, 158, 255, 0.1)' }
                            ])
                        }
                    }
                ]
            }

            chart.setOption(option)
        },

        initClassChart () {
            if (this.charts.classChart) {
                this.charts.classChart.dispose()
            }

            const chart = echarts.init(this.$refs.classChart)
            this.charts.classChart = chart

            const option = {
                title: {
                    text: '班级平均分对比',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow'
                    }
                },
                xAxis: {
                    type: 'category',
                    data: this.classStats.map(item => item.className),
                    axisLabel: {
                        rotate: 45
                    }
                },
                yAxis: {
                    type: 'value',
                    name: '平均分',
                    min: 0,
                    max: this.assignment.totalScore
                },
                series: [
                    {
                        name: '平均分',
                        type: 'bar',
                        data: this.classStats.map(item => item.averageScore),
                        itemStyle: {
                            color: (params) => {
                                const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C']
                                return colors[params.dataIndex % colors.length]
                            }
                        }
                    }
                ]
            }

            chart.setOption(option)
        },

        initQuestionDetailChart (questionData) {
            if (this.charts.questionDetailChart) {
                this.charts.questionDetailChart.dispose()
            }

            const chart = echarts.init(this.$refs.questionDetailChart)
            this.charts.questionDetailChart = chart

            let option = {}

            if (questionData.type === 'single_choice' || questionData.type === 'multiple_choice') {
                option = {
                    title: {
                        text: '选项选择分布',
                        left: 'center'
                    },
                    tooltip: {
                        trigger: 'item',
                        formatter: '{a} <br/>{b}: {c} ({d}%)'
                    },
                    series: [
                        {
                            name: '选择人数',
                            type: 'pie',
                            radius: '50%',
                            data: questionData.answerDistribution.map(item => ({
                                value: item.count,
                                name: item.answer
                            })),
                            emphasis: {
                                itemStyle: {
                                    shadowBlur: 10,
                                    shadowOffsetX: 0,
                                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                                }
                            }
                        }
                    ]
                }
            } else {
                option = {
                    title: {
                        text: '得分分布',
                        left: 'center'
                    },
                    tooltip: {
                        trigger: 'axis',
                        axisPointer: {
                            type: 'shadow'
                        }
                    },
                    xAxis: {
                        type: 'category',
                        data: questionData.answerDistribution.map(item => item.answer)
                    },
                    yAxis: {
                        type: 'value',
                        name: '人数'
                    },
                    series: [
                        {
                            name: '人数',
                            type: 'bar',
                            data: questionData.answerDistribution.map(item => item.count)
                        }
                    ]
                }
            }

            chart.setOption(option)
        },

        async viewQuestionDetail (question) {
            try {
                const response = await this.$http.get(
                    `/api/assignments/${this.assignment.id}/questions/${question.questionNumber}/analysis`
                )

                this.selectedQuestion = {
                    ...question,
                    answerDistribution: response.data.answerDistribution || []
                }

                this.showQuestionDialog = true

                this.$nextTick(() => {
                    this.initQuestionDetailChart(this.selectedQuestion)
                })
            } catch (error) {
                console.error('加载题目详细分析失败:', error)
                this.$message.error('加载题目详细分析失败')
            }
        },

        refreshData () {
            this.loadStatistics()
        },

        async exportReport () {
            try {
                const response = await this.$http.get(`/api/assignments/${this.assignment.id}/export-report`, {
                    responseType: 'blob'
                })

                const blob = new Blob([response.data], {
                    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                })
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.style.display = 'none'
                link.href = url
                link.download = `${this.assignment.title}_统计报告.docx`

                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)

                this.$message.success('统计报告导出成功')
            } catch (error) {
                console.error('导出统计报告失败:', error)
                this.$message.error('导出统计报告失败')
            }
        },

        getQuestionTypeName (type) {
            const names = {
                single_choice: '单选题',
                multiple_choice: '多选题',
                true_false: '判断题',
                fill_blank: '填空题',
                essay: '简答题'
            }
            return names[type] || type
        },

        getCorrectRateClass (rate) {
            if (rate >= 80) return 'text-success'
            if (rate >= 60) return 'text-warning'
            return 'text-danger'
        },

        getDifficultyTagType (difficulty) {
            const types = {
                easy: 'success',
                medium: 'warning',
                hard: 'danger'
            }
            return types[difficulty] || 'info'
        },

        getDifficultyName (difficulty) {
            const names = {
                easy: '简单',
                medium: '中等',
                hard: '困难'
            }
            return names[difficulty] || difficulty
        },

        getRankIcon (index) {
            if (index === 0) return 'el-icon-trophy'
            if (index === 1) return 'el-icon-medal'
            if (index === 2) return 'el-icon-medal'
            return 'el-icon-user'
        },

        getRankStyle (index) {
            const colors = ['#FFD700', '#C0C0C0', '#CD7F32']
            return {
                color: colors[index] || '#909399'
            }
        }
    }
}
</script>

<style scoped>
.assignment-statistics {
  padding: 20px;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.stats-header h3 {
  margin: 0;
  color: #333;
}

.stats-overview {
  margin-bottom: 20px;
}

.stat-item {
  text-align: center;
  padding: 10px 0;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.stat-value.text-success {
  color: #67c23a;
}

.stat-value.text-warning {
  color: #e6a23c;
}

.stat-value.text-danger {
  color: #f56c6c;
}

.stat-label {
  color: #909399;
  font-size: 14px;
}

.question-content {
  line-height: 1.4;
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

.ranking-list {
  max-height: 300px;
  overflow-y: auto;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.ranking-item:last-child {
  border-bottom: none;
}

.rank-number {
  width: 40px;
  text-align: center;
  font-weight: bold;
  color: #409eff;
}

.student-info {
  flex: 1;
  margin-left: 15px;
}

.student-name {
  font-weight: bold;
  color: #333;
}

.student-class {
  font-size: 12px;
  color: #909399;
}

.student-score {
  text-align: right;
}

.score {
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
}

.total {
  color: #909399;
  font-size: 14px;
}

.error-analysis {
  max-height: 500px;
  overflow-y: auto;
}

.error-item {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e6ebf5;
  border-radius: 4px;
}

.error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.error-header h4 {
  margin: 0;
  color: #333;
}

.error-rate {
  color: #f56c6c;
  font-weight: bold;
}

.error-options {
  margin-bottom: 15px;
}

.option-analysis {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.option-content {
  width: 200px;
  margin-right: 20px;
}

.option-stats {
  flex: 1;
  display: flex;
  align-items: center;
}

.selection-rate {
  flex: 1;
  display: flex;
  align-items: center;
  margin-right: 10px;
}

.selection-rate span {
  margin-left: 10px;
  min-width: 40px;
}

.common-errors h5 {
  margin: 10px 0 5px 0;
  color: #606266;
}

.common-errors ul {
  margin: 0;
  padding-left: 20px;
}

.common-errors li {
  margin-bottom: 5px;
  color: #909399;
}

.question-detail {
  padding: 20px;
}

.question-info {
  margin-bottom: 20px;
}

.question-info h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.question-meta {
  color: #909399;
  font-size: 14px;
}

.question-meta span {
  margin-right: 20px;
}

.answer-distribution h5 {
  margin: 20px 0 10px 0;
  color: #606266;
}
</style>
