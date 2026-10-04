<template>
  <div class="exam-analysis-container">
    <a-card :bordered="false">
      <!-- 页面标题 -->
      <div slot="title" class="card-title">
        <a-icon type="bar-chart" />
        考试分析 - {{ paperInfo.paperName }}
      </div>

      <div slot="extra">
        <a-space>
          <a-button icon="download" @click="handleExportAnalysis">
            导出分析报告
          </a-button>
          <a-button @click="goBack">
            返回
          </a-button>
        </a-space>
      </div>

      <!-- 基本信息 -->
      <a-row :gutter="16" class="paper-info-row">
        <a-col :span="6">
          <a-statistic
            title="参考人数"
            :value="statistics.participantCount"
            suffix="人"
            :value-style="{ color: '#3f8600' }"
          />
        </a-col>
        <a-col :span="6">
          <a-statistic
            title="平均分"
            :value="statistics.averageScore"
            :precision="1"
            suffix="分"
            :value-style="{ color: '#1890ff' }"
          />
        </a-col>
        <a-col :span="6">
          <a-statistic
            title="最高分"
            :value="statistics.maxScore"
            suffix="分"
            :value-style="{ color: '#cf1322' }"
          />
        </a-col>
        <a-col :span="6">
          <a-statistic
            title="及格率"
            :value="statistics.passRate"
            :precision="1"
            suffix="%"
            :value-style="{ color: '#52c41a' }"
          />
        </a-col>
      </a-row>

      <!-- 图表分析 -->
      <a-row :gutter="16" class="charts-row">
        <!-- 分数分布图 -->
        <a-col :span="12">
          <a-card title="分数分布" size="small">
            <div id="scoreDistributionChart" style="height: 300px;"></div>
          </a-card>
        </a-col>

        <!-- 题目正确率图 -->
        <a-col :span="12">
          <a-card title="题目正确率" size="small">
            <div id="questionAccuracyChart" style="height: 300px;"></div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 详细分析 -->
      <a-row :gutter="16" class="analysis-row">
        <!-- 题目分析表格 -->
        <a-col :span="24">
          <a-card title="题目详细分析" size="small">
            <a-table
              :columns="questionColumns"
              :dataSource="questionAnalysis"
              :pagination="{ pageSize: 10 }"
              size="middle"
              bordered
            >
              <span slot="difficultySlot" slot-scope="text">
                <a-rate :value="text" disabled style="font-size: 12px" />
              </span>

              <span slot="accuracySlot" slot-scope="text">
                <a-progress
                  :percent="text"
                  size="small"
                  :status="text >= 80 ? 'success' : text >= 60 ? 'active' : 'exception'"
                />
              </span>

              <span slot="typeSlot" slot-scope="text">
                <a-tag :color="getQuestionTypeColor(text)">
                  {{ getQuestionTypeName(text) }}
                </a-tag>
              </span>
            </a-table>
          </a-card>
        </a-col>
      </a-row>

      <!-- 学生成绩列表 -->
      <a-row :gutter="16" class="student-results-row">
        <a-col :span="24">
          <a-card title="学生成绩详情" size="small">
            <div class="search-bar">
              <a-input-search
                v-model="studentSearchKeyword"
                placeholder="搜索学生姓名或学号"
                enter-button
                @search="handleStudentSearch"
                style="width: 300px"
              />
            </div>

            <a-table
              :columns="studentColumns"
              :dataSource="filteredStudentResults"
              :pagination="{ pageSize: 10 }"
              size="middle"
              bordered
            >
              <span slot="scoreSlot" slot-scope="text, record">
                <span :style="{ color: getScoreColor(text, record.totalScore) }">
                  {{ text }} / {{ record.totalScore }}
                </span>
              </span>

              <span slot="durationSlot" slot-scope="text">
                {{ formatDuration(text) }}
              </span>

              <span slot="statusSlot" slot-scope="text">
                <a-tag :color="getStatusColor(text)">
                  {{ getStatusText(text) }}
                </a-tag>
              </span>

              <span slot="action" slot-scope="text, record">
                <a @click="handleViewStudentDetail(record)">查看详情</a>
              </span>
            </a-table>
          </a-card>
        </a-col>
      </a-row>
    </a-card>

    <!-- 学生答题详情弹窗 -->
    <student-detail-modal
      ref="studentDetailModal"
    />
  </div>
</template>

<script>
import { getAction } from '@/api/manage'
import StudentDetailModal from './modules/StudentDetailModal'
import * as echarts from 'echarts'

export default {
    name: 'ExamAnalysis',
    components: {
        StudentDetailModal
    },
    data () {
        return {
            paperId: '',
            paperInfo: {
                paperName: '',
                totalScore: 100,
                questionCount: 0
            },
            statistics: {
                participantCount: 0,
                averageScore: 0,
                maxScore: 0,
                minScore: 0,
                passRate: 0
            },
            questionAnalysis: [],
            studentResults: [],
            filteredStudentResults: [],
            studentSearchKeyword: '',
            loading: false,
            questionColumns: [
                {
                    title: '题目序号',
                    dataIndex: 'questionOrder',
                    width: 80,
                    align: 'center'
                },
                {
                    title: '题目标题',
                    dataIndex: 'questionTitle',
                    width: 200,
                    ellipsis: true
                },
                {
                    title: '题目类型',
                    dataIndex: 'questionType',
                    width: 100,
                    align: 'center',
                    scopedSlots: { customRender: 'typeSlot' }
                },
                {
                    title: '难度',
                    dataIndex: 'difficulty',
                    width: 120,
                    align: 'center',
                    scopedSlots: { customRender: 'difficultySlot' }
                },
                {
                    title: '分值',
                    dataIndex: 'score',
                    width: 80,
                    align: 'center'
                },
                {
                    title: '正确率',
                    dataIndex: 'accuracy',
                    width: 120,
                    align: 'center',
                    scopedSlots: { customRender: 'accuracySlot' }
                },
                {
                    title: '平均得分',
                    dataIndex: 'averageScore',
                    width: 100,
                    align: 'center'
                },
                {
                    title: '答对人数',
                    dataIndex: 'correctCount',
                    width: 100,
                    align: 'center'
                }
            ],
            studentColumns: [
                {
                    title: '排名',
                    dataIndex: 'rank',
                    width: 60,
                    align: 'center'
                },
                {
                    title: '学号',
                    dataIndex: 'studentNo',
                    width: 120
                },
                {
                    title: '姓名',
                    dataIndex: 'studentName',
                    width: 100
                },
                {
                    title: '得分',
                    dataIndex: 'score',
                    width: 100,
                    align: 'center',
                    scopedSlots: { customRender: 'scoreSlot' }
                },
                {
                    title: '用时',
                    dataIndex: 'duration',
                    width: 100,
                    align: 'center',
                    scopedSlots: { customRender: 'durationSlot' }
                },
                {
                    title: '提交时间',
                    dataIndex: 'submitTime',
                    width: 150
                },
                {
                    title: '状态',
                    dataIndex: 'status',
                    width: 80,
                    align: 'center',
                    scopedSlots: { customRender: 'statusSlot' }
                },
                {
                    title: '操作',
                    dataIndex: 'action',
                    width: 80,
                    align: 'center',
                    scopedSlots: { customRender: 'action' }
                }
            ]
        }
    },
    mounted () {
        this.paperId = this.$route.query.paperId
        if (this.paperId) {
            this.loadAnalysisData()
        }
    },
    methods: {
        async loadAnalysisData () {
            this.loading = true
            try {
                // 加载试卷基本信息
                await this.loadPaperInfo()
                // 加载统计数据
                await this.loadStatistics()
                // 加载题目分析
                await this.loadQuestionAnalysis()
                // 加载学生成绩
                await this.loadStudentResults()
                // 渲染图表
                this.renderCharts()
            } catch (error) {
                this.$message.error('加载分析数据失败')
                console.error(error)
            } finally {
                this.loading = false
            }
        },

        async loadPaperInfo () {
            const res = await getAction('/teaching/examPaper/queryById', { id: this.paperId })
            if (res.success) {
                this.paperInfo = res.result
            }
        },

        async loadStatistics () {
            const res = await getAction('/teaching/examPaper/statistics', { paperId: this.paperId })
            if (res.success) {
                this.statistics = res.result
            }
        },

        async loadQuestionAnalysis () {
            const res = await getAction('/teaching/examPaper/questionAnalysis', { paperId: this.paperId })
            if (res.success) {
                this.questionAnalysis = res.result
            }
        },

        async loadStudentResults () {
            const res = await getAction('/teaching/examPaper/studentResults', { paperId: this.paperId })
            if (res.success) {
                this.studentResults = res.result.map((item, index) => ({
                    ...item,
                    rank: index + 1
                }))
                this.filteredStudentResults = [...this.studentResults]
            }
        },

        renderCharts () {
            this.$nextTick(() => {
                this.renderScoreDistributionChart()
                this.renderQuestionAccuracyChart()
            })
        },

        renderScoreDistributionChart () {
            const chart = echarts.init(document.getElementById('scoreDistributionChart'))
            const scoreRanges = ['0-20', '21-40', '41-60', '61-80', '81-100']
            const data = this.getScoreDistributionData()

            const option = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'shadow'
                    }
                },
                xAxis: {
                    type: 'category',
                    data: scoreRanges
                },
                yAxis: {
                    type: 'value',
                    name: '人数'
                },
                series: [{
                    data: data,
                    type: 'bar',
                    itemStyle: {
                        color: '#1890ff'
                    }
                }]
            }

            chart.setOption(option)
        },

        renderQuestionAccuracyChart () {
            const chart = echarts.init(document.getElementById('questionAccuracyChart'))
            const questions = this.questionAnalysis.map(q => `题目${q.questionOrder}`)
            const accuracies = this.questionAnalysis.map(q => q.accuracy)

            const option = {
                tooltip: {
                    trigger: 'axis'
                },
                xAxis: {
                    type: 'category',
                    data: questions,
                    axisLabel: {
                        rotate: 45
                    }
                },
                yAxis: {
                    type: 'value',
                    name: '正确率(%)',
                    max: 100
                },
                series: [{
                    data: accuracies,
                    type: 'line',
                    smooth: true,
                    itemStyle: {
                        color: '#52c41a'
                    }
                }]
            }

            chart.setOption(option)
        },

        getScoreDistributionData () {
            const ranges = [
                { min: 0, max: 20 },
                { min: 21, max: 40 },
                { min: 41, max: 60 },
                { min: 61, max: 80 },
                { min: 81, max: 100 }
            ]

            return ranges.map(range => {
                return this.studentResults.filter(student => {
                    const score = student.score
                    return score >= range.min && score <= range.max
                }).length
            })
        },

        handleStudentSearch () {
            if (this.studentSearchKeyword.trim()) {
                this.filteredStudentResults = this.studentResults.filter(student => {
                    return student.studentName.includes(this.studentSearchKeyword) ||
                 student.studentNo.includes(this.studentSearchKeyword)
                })
            } else {
                this.filteredStudentResults = [...this.studentResults]
            }
        },

        handleViewStudentDetail (record) {
            this.$refs.studentDetailModal.show(record, this.paperId)
        },

        handleExportAnalysis () {
            this.$message.loading('正在生成分析报告...', 0)
            getAction('/teaching/examPaper/exportAnalysis', { paperId: this.paperId }).then(res => {
                this.$message.destroy()
                if (res.success) {
                    // 下载文件逻辑
                    const blob = new Blob([res.result], { type: 'application/pdf' })
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${this.paperInfo.paperName}-分析报告.pdf`
                    a.click()
                    window.URL.revokeObjectURL(url)
                    this.$message.success('导出成功！')
                } else {
                    this.$message.error(res.message || '导出失败')
                }
            }).catch(() => {
                this.$message.destroy()
                this.$message.error('导出失败')
            })
        },

        goBack () {
            this.$router.go(-1)
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

        getScoreColor (score, totalScore) {
            const rate = score / totalScore
            if (rate >= 0.9) return '#52c41a'
            if (rate >= 0.8) return '#1890ff'
            if (rate >= 0.6) return '#faad14'
            return '#ff4d4f'
        },

        getStatusColor (status) {
            const colorMap = {
                submitted: 'success',
                timeout: 'warning',
                cheating: 'error'
            }
            return colorMap[status] || 'default'
        },

        getStatusText (status) {
            const textMap = {
                submitted: '已提交',
                timeout: '超时',
                cheating: '异常'
            }
            return textMap[status] || status
        },

        formatDuration (minutes) {
            if (!minutes) return '-'
            const hours = Math.floor(minutes / 60)
            const mins = minutes % 60
            if (hours > 0) {
                return `${hours}小时${mins}分钟`
            }
            return `${mins}分钟`
        }
    }
}
</script>

<style lang="less" scoped>
.exam-analysis-container {
  .card-title {
    font-size: 16px;
    font-weight: 500;
  }

  .paper-info-row {
    margin-bottom: 24px;
    padding: 16px;
    background: #f5f5f5;
    border-radius: 6px;
  }

  .charts-row {
    margin-bottom: 24px;
  }

  .analysis-row {
    margin-bottom: 24px;
  }

  .student-results-row {
    .search-bar {
      margin-bottom: 16px;
    }
  }

  .ant-statistic {
    text-align: center;
  }
}
</style>
