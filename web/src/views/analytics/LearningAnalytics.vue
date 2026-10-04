<template>
  <div class="learning-analytics-container">
    <a-card :bordered="false">
      <!-- 页面标题 -->
      <div slot="title" class="card-title">
        <a-icon type="bar-chart" />
        学习分析中心
      </div>

      <div slot="extra">
        <a-space>
          <a-select
            v-model="selectedCourse"
            placeholder="选择课程"
            style="width: 200px;"
            @change="handleCourseChange"
          >
            <a-select-option
              v-for="course in courses"
              :key="course.id"
              :value="course.id"
            >
              {{ course.courseName }}
            </a-select-option>
          </a-select>
          <a-button icon="reload" @click="refreshData">
            刷新数据
          </a-button>
          <a-button icon="download" @click="exportReport">
            导出报告
          </a-button>
        </a-space>
      </div>

      <!-- 概览统计 -->
      <a-row :gutter="16" class="overview-stats">
        <a-col :span="6">
          <a-statistic
            title="班级总数"
            :value="overviewData.totalClasses"
            :value-style="{ color: '#3f8600' }"
            suffix="个"
          />
        </a-col>
        <a-col :span="6">
          <a-statistic
            title="学生总数"
            :value="overviewData.totalStudents"
            :value-style="{ color: '#1890ff' }"
            suffix="人"
          />
        </a-col>
        <a-col :span="6">
          <a-statistic
            title="平均进度"
            :value="overviewData.averageProgress"
            :precision="1"
            :value-style="{ color: '#722ed1' }"
            suffix="%"
          />
        </a-col>
        <a-col :span="6">
          <a-statistic
            title="活跃度评分"
            :value="overviewData.activityScore"
            :precision="1"
            :value-style="{ color: '#eb2f96' }"
            suffix="分"
          />
        </a-col>
      </a-row>

      <!-- 图表分析 -->
      <a-row :gutter="16" class="charts-section">
        <!-- 学习进度分布 -->
        <a-col :span="12">
          <a-card title="学习进度分布" size="small">
            <div id="progressDistributionChart" style="height: 300px;"></div>
          </a-card>
        </a-col>

        <!-- 学习时长排行 -->
        <a-col :span="12">
          <a-card title="学习时长排行 TOP10" size="small">
            <div id="studyTimeRankingChart" style="height: 300px;"></div>
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="16" class="charts-section">
        <!-- 学习活跃度分析 -->
        <a-col :span="12">
          <a-card title="学生活跃度分析" size="small">
            <div id="activityAnalysisChart" style="height: 300px;"></div>
          </a-card>
        </a-col>

        <!-- 学习趋势图 -->
        <a-col :span="12">
          <a-card title="整体学习趋势" size="small">
            <div id="learningTrendChart" style="height: 300px;"></div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 需要关注的学生 -->
      <a-row :gutter="16" class="attention-section">
        <a-col :span="24">
          <a-card title="需要关注的学生" size="small">
            <a-table
              :columns="attentionColumns"
              :dataSource="studentsNeedingAttention"
              :pagination="false"
              size="small"
              :rowKey="record => record.studentId"
            >
              <template slot="progress" slot-scope="text">
                <a-progress
                  :percent="text"
                  size="small"
                  :status="text < 30 ? 'exception' : text < 60 ? 'normal' : 'success'"
                />
              </template>

              <template slot="lastStudyTime" slot-scope="text">
                <span :style="{ color: getDaysAgo(text) > 7 ? '#ff4d4f' : '#666' }">
                  {{ formatLastStudyTime(text) }}
                </span>
              </template>

              <template slot="action" slot-scope="text, record">
                <a-space>
                  <a-button
                    type="link"
                    size="small"
                    @click="viewStudentDetail(record)"
                  >
                    查看详情
                  </a-button>
                  <a-button
                    type="link"
                    size="small"
                    @click="markAttention(record)"
                  >
                    {{ record.needsAttention ? '取消关注' : '标记关注' }}
                  </a-button>
                  <a-button
                    type="link"
                    size="small"
                    @click="sendReminder(record)"
                  >
                    发送提醒
                  </a-button>
                </a-space>
              </template>
            </a-table>
          </a-card>
        </a-col>
      </a-row>

      <!-- 学生详情模态框 -->
      <a-modal
        title="学生学习详情"
        :visible="studentDetailVisible"
        @cancel="studentDetailVisible = false"
        width="800px"
        :footer="null"
      >
        <div v-if="currentStudentDetail">
          <!-- 学生基本信息 -->
          <a-descriptions title="基本信息" size="small" :column="2">
            <a-descriptions-item label="姓名">
              {{ currentStudentDetail.studentName }}
            </a-descriptions-item>
            <a-descriptions-item label="学号">
              {{ currentStudentDetail.studentCode }}
            </a-descriptions-item>
            <a-descriptions-item label="班级">
              {{ currentStudentDetail.className }}
            </a-descriptions-item>
            <a-descriptions-item label="学习进度">
              <a-progress :percent="currentStudentDetail.progressPercent" size="small" />
            </a-descriptions-item>
            <a-descriptions-item label="学习时长">
              {{ currentStudentDetail.studyDuration }}分钟
            </a-descriptions-item>
            <a-descriptions-item label="最后学习时间">
              {{ formatTime(currentStudentDetail.lastStudyTime) }}
            </a-descriptions-item>
          </a-descriptions>

          <!-- 学习趋势图 -->
          <div class="student-trend-chart">
            <h4>最近30天学习趋势</h4>
            <div id="studentTrendChart" style="height: 250px;"></div>
          </div>

          <!-- 学习建议 -->
          <div class="learning-suggestions" v-if="currentStudentDetail.suggestions">
            <h4>学习建议</h4>
            <ul>
              <li v-for="(suggestion, index) in currentStudentDetail.suggestions" :key="index">
                {{ suggestion }}
              </li>
            </ul>
          </div>
        </div>
      </a-modal>
    </a-card>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import { getAction, postAction } from '@/api/manage'

export default {
    name: 'LearningAnalytics',
    data () {
        return {
            selectedCourse: null,
            courses: [],
            overviewData: {
                totalClasses: 0,
                totalStudents: 0,
                averageProgress: 0,
                activityScore: 0
            },
            studentsNeedingAttention: [],
            studentDetailVisible: false,
            currentStudentDetail: null,

            // 图表实例
            charts: {
                progressDistribution: null,
                studyTimeRanking: null,
                activityAnalysis: null,
                learningTrend: null,
                studentTrend: null
            },

            // 表格列定义
            attentionColumns: [
                {
                    title: '学生姓名',
                    dataIndex: 'studentName',
                    key: 'studentName',
                    width: 120
                },
                {
                    title: '学号',
                    dataIndex: 'studentCode',
                    key: 'studentCode',
                    width: 120
                },
                {
                    title: '班级',
                    dataIndex: 'className',
                    key: 'className',
                    width: 120
                },
                {
                    title: '学习进度',
                    dataIndex: 'progressPercent',
                    key: 'progressPercent',
                    scopedSlots: { customRender: 'progress' },
                    width: 150
                },
                {
                    title: '学习时长',
                    dataIndex: 'studyDuration',
                    key: 'studyDuration',
                    render: (text) => `${text || 0}分钟`,
                    width: 120
                },
                {
                    title: '最后学习时间',
                    dataIndex: 'lastStudyTime',
                    key: 'lastStudyTime',
                    scopedSlots: { customRender: 'lastStudyTime' },
                    width: 150
                },
                {
                    title: '操作',
                    key: 'action',
                    scopedSlots: { customRender: 'action' },
                    width: 200
                }
            ]
        }
    },

    mounted () {
        this.loadCourses()
        this.initCharts()
    },

    beforeDestroy () {
    // 销毁图表实例
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.dispose()
            }
        })
    },

    methods: {
        async loadCourses () {
            try {
                const response = await getAction('/teaching/course/list')
                if (response.success) {
                    this.courses = response.result.records || []
                    if (this.courses.length > 0) {
                        this.selectedCourse = this.courses[0].id
                        this.handleCourseChange(this.selectedCourse)
                    }
                }
            } catch (error) {
                this.$message.error('加载课程列表失败')
            }
        },

        async handleCourseChange (courseId) {
            if (courseId) {
                await Promise.all([
                    this.loadOverviewData(),
                    this.loadProgressDistribution(),
                    this.loadStudyTimeRanking(),
                    this.loadActivityAnalysis(),
                    this.loadLearningTrend(),
                    this.loadStudentsNeedingAttention()
                ])
            }
        },

        async loadOverviewData () {
            try {
                // 这里可以调用多个API获取概览数据
                const [classStats, activityData] = await Promise.all([
                    getAction(`/teaching/studentProgress/classStatistics?courseId=${this.selectedCourse}&departId=`),
                    getAction(`/teaching/studentProgress/activityAnalysis?courseId=${this.selectedCourse}`)
                ])

                this.overviewData = {
                    totalClasses: 5, // 示例数据
                    totalStudents: (classStats.result && classStats.result.totalStudents) || 0,
                    averageProgress: (classStats.result && classStats.result.averageProgress) || 0,
                    activityScore: (activityData.result && activityData.result.activityScore) || 0
                }
            } catch (error) {
                console.error('加载概览数据失败:', error)
            }
        },

        async loadProgressDistribution () {
            try {
                const response = await getAction(`/teaching/studentProgress/classStatistics?courseId=${this.selectedCourse}&departId=`)
                if (response.success && response.result.details) {
                    this.renderProgressDistribution(response.result.details)
                }
            } catch (error) {
                console.error('加载进度分布失败:', error)
            }
        },

        async loadStudyTimeRanking () {
            try {
                const response = await getAction(`/teaching/studentProgress/studyTimeRanking?courseId=${this.selectedCourse}&limit=10`)
                if (response.success) {
                    this.renderStudyTimeRanking(response.result)
                }
            } catch (error) {
                console.error('加载学习时长排行失败:', error)
            }
        },

        async loadActivityAnalysis () {
            try {
                const response = await getAction(`/teaching/studentProgress/activityAnalysis?courseId=${this.selectedCourse}`)
                if (response.success) {
                    this.renderActivityAnalysis(response.result)
                }
            } catch (error) {
                console.error('加载活跃度分析失败:', error)
            }
        },

        async loadLearningTrend () {
            // 这里可以实现整体学习趋势的加载逻辑
            try {
                // 示例数据
                const trendData = [
                    { date: '2025-09-01', avgProgress: 20 },
                    { date: '2025-09-08', avgProgress: 35 },
                    { date: '2025-09-15', avgProgress: 50 },
                    { date: '2025-09-22', avgProgress: 68 },
                    { date: '2025-09-26', avgProgress: 75 }
                ]
                this.renderLearningTrend(trendData)
            } catch (error) {
                console.error('加载学习趋势失败:', error)
            }
        },

        async loadStudentsNeedingAttention () {
            try {
                const response = await getAction(`/teaching/studentProgress/needingAttention?departId=`)
                if (response.success) {
                    this.studentsNeedingAttention = response.result || []
                }
            } catch (error) {
                console.error('加载需要关注的学生失败:', error)
            }
        },

        initCharts () {
            this.$nextTick(() => {
                // 初始化所有图表
                this.charts.progressDistribution = echarts.init(document.getElementById('progressDistributionChart'))
                this.charts.studyTimeRanking = echarts.init(document.getElementById('studyTimeRankingChart'))
                this.charts.activityAnalysis = echarts.init(document.getElementById('activityAnalysisChart'))
                this.charts.learningTrend = echarts.init(document.getElementById('learningTrendChart'))
            })
        },

        renderProgressDistribution (data) {
            if (!this.charts.progressDistribution) return

            const progressRanges = ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%']
            const counts = new Array(5).fill(0)

            data.forEach(student => {
                const progress = student.progress_percent || 0
                if (progress <= 20) counts[0]++
                else if (progress <= 40) counts[1]++
                else if (progress <= 60) counts[2]++
                else if (progress <= 80) counts[3]++
                else counts[4]++
            })

            const option = {
                title: { text: '学习进度分布', left: 'center' },
                tooltip: { trigger: 'item' },
                series: [{
                    type: 'pie',
                    radius: '60%',
                    data: progressRanges.map((range, index) => ({
                        name: range,
                        value: counts[index]
                    }))
                }]
            }

            this.charts.progressDistribution.setOption(option)
        },

        renderStudyTimeRanking (data) {
            if (!this.charts.studyTimeRanking || !data.length) return

            const names = data.map(item => item.student_name || item.studentName)
            const times = data.map(item => item.study_duration || item.studyDuration)

            const option = {
                title: { text: '学习时长排行', left: 'center' },
                tooltip: { trigger: 'axis' },
                xAxis: {
                    type: 'category',
                    data: names,
                    axisLabel: {
                        rotate: 45
                    }
                },
                yAxis: {
                    type: 'value',
                    name: '时长(分钟)'
                },
                series: [{
                    type: 'bar',
                    data: times,
                    itemStyle: {
                        color: '#1890ff'
                    }
                }]
            }

            this.charts.studyTimeRanking.setOption(option)
        },

        renderActivityAnalysis (data) {
            if (!this.charts.activityAnalysis || !data.activityLevels) return

            const levels = data.activityLevels
            const option = {
                title: { text: '学生活跃度分析', left: 'center' },
                tooltip: { trigger: 'item' },
                series: [{
                    type: 'doughnut',
                    radius: ['40%', '70%'],
                    data: [
                        { name: '高活跃', value: levels.high, itemStyle: { color: '#52c41a' } },
                        { name: '中活跃', value: levels.medium, itemStyle: { color: '#1890ff' } },
                        { name: '低活跃', value: levels.low, itemStyle: { color: '#faad14' } },
                        { name: '不活跃', value: levels.inactive, itemStyle: { color: '#ff4d4f' } }
                    ]
                }]
            }

            this.charts.activityAnalysis.setOption(option)
        },

        renderLearningTrend (data) {
            if (!this.charts.learningTrend || !data.length) return

            const dates = data.map(item => item.date)
            const progress = data.map(item => item.avgProgress)

            const option = {
                title: { text: '整体学习趋势', left: 'center' },
                tooltip: { trigger: 'axis' },
                xAxis: {
                    type: 'category',
                    data: dates
                },
                yAxis: {
                    type: 'value',
                    name: '平均进度(%)',
                    max: 100
                },
                series: [{
                    type: 'line',
                    data: progress,
                    smooth: true,
                    itemStyle: {
                        color: '#722ed1'
                    },
                    areaStyle: {
                        opacity: 0.3
                    }
                }]
            }

            this.charts.learningTrend.setOption(option)
        },

        async viewStudentDetail (student) {
            try {
                const response = await getAction(`/teaching/studentProgress/generateReport?studentId=${student.studentId}&courseId=${this.selectedCourse}`)
                if (response.success) {
                    this.currentStudentDetail = {
                        ...student,
                        ...response.result
                    }
                    this.studentDetailVisible = true

                    // 渲染学生趋势图
                    this.$nextTick(() => {
                        this.renderStudentTrend(response.result.learningTrend || [])
                    })
                }
            } catch (error) {
                this.$message.error('获取学生详情失败')
            }
        },

        renderStudentTrend (trendData) {
            const chartDom = document.getElementById('studentTrendChart')
            if (!chartDom || !trendData.length) return

            if (this.charts.studentTrend) {
                this.charts.studentTrend.dispose()
            }

            this.charts.studentTrend = echarts.init(chartDom)

            const dates = trendData.map(item => item.study_date)
            const duration = trendData.map(item => item.study_duration)

            const option = {
                tooltip: { trigger: 'axis' },
                xAxis: {
                    type: 'category',
                    data: dates
                },
                yAxis: {
                    type: 'value',
                    name: '学习时长(分钟)'
                },
                series: [{
                    type: 'line',
                    data: duration,
                    smooth: true,
                    itemStyle: {
                        color: '#1890ff'
                    }
                }]
            }

            this.charts.studentTrend.setOption(option)
        },

        async markAttention (student) {
            try {
                const needsAttention = student.needsAttention ? 0 : 1
                const response = await postAction(
                    `/teaching/studentProgress/markAttention?needsAttention=${needsAttention}`,
                    [student.studentId]
                )

                if (response.success) {
                    this.$message.success('操作成功')
                    student.needsAttention = needsAttention
                }
            } catch (error) {
                this.$message.error('操作失败')
            }
        },

        sendReminder (student) {
            // 发送学习提醒的逻辑
            this.$message.info(`已向 ${student.studentName} 发送学习提醒`)
        },

        refreshData () {
            if (this.selectedCourse) {
                this.handleCourseChange(this.selectedCourse)
                this.$message.success('数据已刷新')
            }
        },

        exportReport () {
            this.$message.info('正在生成报告，请稍候...')
            // 导出分析报告的逻辑
        },

        formatTime (timestamp) {
            if (!timestamp) return '未知'
            return new Date(timestamp).toLocaleString('zh-CN')
        },

        formatLastStudyTime (timestamp) {
            if (!timestamp) return '从未学习'
            const days = this.getDaysAgo(timestamp)
            if (days === 0) return '今天'
            if (days === 1) return '昨天'
            return `${days}天前`
        },

        getDaysAgo (timestamp) {
            if (!timestamp) return Infinity
            const now = new Date()
            const lastTime = new Date(timestamp)
            return Math.floor((now - lastTime) / (1000 * 60 * 60 * 24))
        }
    }
}
</script>

<style scoped>
.learning-analytics-container {
  padding: 20px;
}

.card-title {
  font-size: 16px;
  font-weight: 500;
}

.overview-stats {
  margin-bottom: 24px;
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
}

.charts-section {
  margin-bottom: 24px;
}

.attention-section {
  margin-bottom: 24px;
}

.student-trend-chart {
  margin: 16px 0;
}

.learning-suggestions {
  margin: 16px 0;
}

.learning-suggestions ul {
  list-style-type: disc;
  margin-left: 20px;
}

.learning-suggestions li {
  margin: 8px 0;
  line-height: 1.5;
}
</style>
