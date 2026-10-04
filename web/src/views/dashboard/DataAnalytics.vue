<template>
  <div class="data-analytics">
    <!-- 概览统计卡片 -->
    <a-row :gutter="16" class="overview-cards">
      <a-col :xs="24" :sm="12" :md="6">
        <a-card class="stat-card">
          <a-statistic
            title="总学生数"
            :value="statistics.totalStudents"
            :value-style="{ color: '#3f8600' }"
          >
            <template #prefix>
              <a-icon type="user" />
            </template>
            <template #suffix>
              <span class="trend-up">
                <a-icon type="arrow-up" />
                +{{ statistics.newStudents }}
              </span>
            </template>
          </a-statistic>
        </a-card>
      </a-col>

      <a-col :xs="24" :sm="12" :md="6">
        <a-card class="stat-card">
          <a-statistic
            title="活跃教师"
            :value="statistics.activeTeachers"
            :value-style="{ color: '#1890ff' }"
          >
            <template #prefix>
              <a-icon type="team" />
            </template>
            <template #suffix>
              <span class="trend-up">
                <a-icon type="arrow-up" />
                +{{ statistics.newTeachers }}
              </span>
            </template>
          </a-statistic>
        </a-card>
      </a-col>

      <a-col :xs="24" :sm="12" :md="6">
        <a-card class="stat-card">
          <a-statistic
            title="本月作业"
            :value="statistics.monthlyHomework"
            :value-style="{ color: '#722ed1' }"
          >
            <template #prefix>
              <a-icon type="file-text" />
            </template>
            <template #suffix>
              <span class="trend-up">
                <a-icon type="arrow-up" />
                +{{ statistics.homeworkGrowth }}%
              </span>
            </template>
          </a-statistic>
        </a-card>
      </a-col>

      <a-col :xs="24" :sm="12" :md="6">
        <a-card class="stat-card">
          <a-statistic
            title="完成率"
            :value="statistics.completionRate"
            suffix="%"
            :value-style="{ color: '#cf1322' }"
          >
            <template #prefix>
              <a-icon type="check-circle" />
            </template>
            <template #suffix>
              <span class="trend-down">
                <a-icon type="arrow-down" />
                -{{ statistics.completionDrop }}%
              </span>
            </template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <!-- 图表区域 -->
    <a-row :gutter="16" class="chart-section">
      <!-- 学习趋势图 -->
      <a-col :xs="24" :lg="12">
        <a-card title="学习活动趋势" :bordered="false">
          <div class="chart-container">
            <div id="learningTrendChart" style="height: 300px;"></div>
          </div>
          <div class="chart-controls">
            <a-radio-group
              v-model="trendTimeRange"
              @change="updateLearningTrend"
              size="small"
            >
              <a-radio-button value="7days">近7天</a-radio-button>
              <a-radio-button value="30days">近30天</a-radio-button>
              <a-radio-button value="3months">近3个月</a-radio-button>
            </a-radio-group>
          </div>
        </a-card>
      </a-col>

      <!-- 成绩分布图 -->
      <a-col :xs="24" :lg="12">
        <a-card title="成绩分布统计" :bordered="false">
          <div class="chart-container">
            <div id="gradeDistributionChart" style="height: 300px;"></div>
          </div>
          <div class="chart-controls">
            <a-select
              v-model="selectedSubject"
              @change="updateGradeDistribution"
              style="width: 120px;"
              size="small"
            >
              <a-select-option value="all">全部课程</a-select-option>
              <a-select-option value="scratch">Scratch编程</a-select-option>
              <a-select-option value="python">Python编程</a-select-option>
              <a-select-option value="web">Web开发</a-select-option>
            </a-select>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 详细统计表格 -->
    <a-row :gutter="16" class="table-section">
      <!-- 课程统计 -->
      <a-col :xs="24" :lg="12">
        <a-card title="课程统计" :bordered="false">
          <a-table
            :columns="courseColumns"
            :dataSource="courseStats"
            :pagination="false"
            size="small"
            :scroll="{ y: 240 }"
          >
            <template slot="progress" slot-scope="text">
              <a-progress :percent="text" size="small" />
            </template>
            <template slot="status" slot-scope="text">
              <a-badge
                :status="text === 'active' ? 'processing' : 'default'"
                :text="text === 'active' ? '进行中' : '已结束'"
              />
            </template>
          </a-table>
        </a-card>
      </a-col>

      <!-- 学生排行榜 -->
      <a-col :xs="24" :lg="12">
        <a-card title="学生学习排行" :bordered="false">
          <a-table
            :columns="studentColumns"
            :dataSource="topStudents"
            :pagination="false"
            size="small"
            :scroll="{ y: 240 }"
          >
            <template slot="rank" slot-scope="text, record, index">
              <a-tag
                :color="getRankColor(index + 1)"
                style="border-radius: 50%; width: 24px; text-align: center;"
              >
                {{ index + 1 }}
              </a-tag>
            </template>
            <template slot="score" slot-scope="text">
              <span style="font-weight: bold; color: #1890ff;">{{ text }}</span>
            </template>
            <template slot="trend" slot-scope="text">
              <a-icon
                :type="text > 0 ? 'arrow-up' : 'arrow-down'"
                :style="{ color: text > 0 ? '#52c41a' : '#f5222d' }"
              />
              {{ Math.abs(text) }}
            </template>
          </a-table>
        </a-card>
      </a-col>
    </a-row>

    <!-- 教学质量分析 -->
    <a-row :gutter="16" class="analysis-section">
      <a-col :span="24">
        <a-card title="教学质量分析" :bordered="false">
          <a-tabs v-model="activeAnalysisTab" @change="handleAnalysisTabChange">
            <a-tab-pane key="homework" tab="作业分析">
              <div class="analysis-content">
                <a-row :gutter="16">
                  <a-col :xs="24" :md="12">
                    <div id="homeworkAnalysisChart" style="height: 350px;"></div>
                  </a-col>
                  <a-col :xs="24" :md="12">
                    <div class="analysis-summary">
                      <h4>作业完成情况分析</h4>
                      <a-list size="small">
                        <a-list-item>
                          <a-list-item-meta title="平均完成时间">
                            <template slot="description">
                              {{ analysisData.homework.avgCompletionTime }}分钟
                              <a-tag color="green" size="small" style="margin-left: 8px;">
                                较上月减少15%
                              </a-tag>
                            </template>
                          </a-list-item-meta>
                        </a-list-item>
                        <a-list-item>
                          <a-list-item-meta title="及时提交率">
                            <template slot="description">
                              {{ analysisData.homework.onTimeRate }}%
                              <a-tag color="blue" size="small" style="margin-left: 8px;">
                                较上月提升8%
                              </a-tag>
                            </template>
                          </a-list-item-meta>
                        </a-list-item>
                        <a-list-item>
                          <a-list-item-meta title="平均分数">
                            <template slot="description">
                              {{ analysisData.homework.avgScore }}分
                              <a-tag color="orange" size="small" style="margin-left: 8px;">
                                较上月提升3分
                              </a-tag>
                            </template>
                          </a-list-item-meta>
                        </a-list-item>
                        <a-list-item>
                          <a-list-item-meta title="难点分析">
                            <template slot="description">
                              循环结构理解(32%学生错误)、函数参数使用(28%学生错误)
                            </template>
                          </a-list-item-meta>
                        </a-list-item>
                      </a-list>
                    </div>
                  </a-col>
                </a-row>
              </div>
            </a-tab-pane>

            <a-tab-pane key="engagement" tab="学习参与度">
              <div class="analysis-content">
                <a-row :gutter="16">
                  <a-col :xs="24" :md="12">
                    <div id="engagementChart" style="height: 350px;"></div>
                  </a-col>
                  <a-col :xs="24" :md="12">
                    <div class="engagement-metrics">
                      <h4>参与度指标</h4>
                      <div class="metric-item">
                        <span class="metric-label">课堂活跃度</span>
                        <a-progress
                          :percent="analysisData.engagement.classActivity"
                          status="active"
                          stroke-color="#52c41a"
                        />
                      </div>
                      <div class="metric-item">
                        <span class="metric-label">作业参与度</span>
                        <a-progress
                          :percent="analysisData.engagement.homeworkParticipation"
                          status="active"
                          stroke-color="#1890ff"
                        />
                      </div>
                      <div class="metric-item">
                        <span class="metric-label">讨论参与度</span>
                        <a-progress
                          :percent="analysisData.engagement.discussionParticipation"
                          status="active"
                          stroke-color="#722ed1"
                        />
                      </div>
                      <div class="metric-item">
                        <span class="metric-label">在线时长</span>
                        <a-progress
                          :percent="analysisData.engagement.onlineTime"
                          status="active"
                          stroke-color="#faad14"
                        />
                      </div>
                    </div>
                  </a-col>
                </a-row>
              </div>
            </a-tab-pane>

            <a-tab-pane key="progress" tab="学习进度">
              <div class="analysis-content">
                <div id="progressChart" style="height: 400px;"></div>
              </div>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </a-col>
    </a-row>

    <!-- 报表导出 -->
    <a-row :gutter="16" class="export-section">
      <a-col :span="24">
        <a-card title="报表导出" :bordered="false">
          <div class="export-controls">
            <a-form layout="inline">
              <a-form-item label="报表类型">
                <a-select v-model="exportConfig.type" style="width: 150px;">
                  <a-select-option value="comprehensive">综合报表</a-select-option>
                  <a-select-option value="homework">作业分析报表</a-select-option>
                  <a-select-option value="student">学生学习报表</a-select-option>
                  <a-select-option value="teacher">教师教学报表</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="时间范围">
                <a-range-picker
                  v-model="exportConfig.dateRange"
                  style="width: 250px;"
                />
              </a-form-item>
              <a-form-item label="格式">
                <a-select v-model="exportConfig.format" style="width: 100px;">
                  <a-select-option value="excel">Excel</a-select-option>
                  <a-select-option value="pdf">PDF</a-select-option>
                  <a-select-option value="csv">CSV</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item>
                <a-button
                  type="primary"
                  @click="exportReport"
                  :loading="exportLoading"
                  v-permission="{ module: 'data_analysis', action: 'export' }"
                >
                  <a-icon type="download" />
                  导出报表
                </a-button>
              </a-form-item>
            </a-form>
          </div>

          <div class="quick-export">
            <h4>快速导出</h4>
            <a-button-group>
              <a-button @click="quickExport('daily')" size="small">
                <a-icon type="calendar" />
                今日报表
              </a-button>
              <a-button @click="quickExport('weekly')" size="small">
                <a-icon type="bar-chart" />
                周报
              </a-button>
              <a-button @click="quickExport('monthly')" size="small">
                <a-icon type="pie-chart" />
                月报
              </a-button>
              <a-button @click="quickExport('semester')" size="small">
                <a-icon type="line-chart" />
                学期报表
              </a-button>
            </a-button-group>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script>

import { permissionMixin } from '@/directive/permission'
import * as echarts from 'echarts'
import moment from 'moment'

export default {
    name: 'DataAnalytics',
    mixins: [permissionMixin],

    data () {
        return {
            loading: false,

            // 统计数据
            statistics: {
                totalStudents: 1248,
                newStudents: 32,
                activeTeachers: 56,
                newTeachers: 3,
                monthlyHomework: 189,
                homeworkGrowth: 12,
                completionRate: 87.5,
                completionDrop: 2.3
            },

            // 趋势图配置
            trendTimeRange: '30days',
            selectedSubject: 'all',

            // 表格数据
            courseColumns: [
                { title: '课程名称', dataIndex: 'name', key: 'name', width: 120 },
                { title: '学生数', dataIndex: 'students', key: 'students', width: 80, align: 'center' },
                { title: '完成率', dataIndex: 'progress', key: 'progress', width: 100, scopedSlots: { customRender: 'progress' } },
                { title: '状态', dataIndex: 'status', key: 'status', width: 80, scopedSlots: { customRender: 'status' } }
            ],

            courseStats: [
                { key: '1', name: 'Scratch入门', students: 45, progress: 92, status: 'active' },
                { key: '2', name: 'Python基础', students: 38, progress: 78, status: 'active' },
                { key: '3', name: 'Web开发', students: 29, progress: 65, status: 'active' },
                { key: '4', name: '算法思维', students: 52, progress: 88, status: 'active' },
                { key: '5', name: '项目实战', students: 33, progress: 45, status: 'active' }
            ],

            studentColumns: [
                { title: '排名', key: 'rank', width: 60, scopedSlots: { customRender: 'rank' } },
                { title: '学生姓名', dataIndex: 'name', key: 'name', width: 100 },
                { title: '总分', dataIndex: 'score', key: 'score', width: 80, scopedSlots: { customRender: 'score' } },
                { title: '完成作业', dataIndex: 'homework', key: 'homework', width: 80, align: 'center' },
                { title: '趋势', dataIndex: 'trend', key: 'trend', width: 60, scopedSlots: { customRender: 'trend' } }
            ],

            topStudents: [
                { key: '1', name: '张小明', score: 95.8, homework: 28, trend: 3 },
                { key: '2', name: '李小红', score: 94.2, homework: 27, trend: 1 },
                { key: '3', name: '王小刚', score: 92.5, homework: 26, trend: -1 },
                { key: '4', name: '赵小美', score: 91.3, homework: 25, trend: 2 },
                { key: '5', name: '陈小华', score: 90.7, homework: 24, trend: 0 }
            ],

            // 分析数据
            activeAnalysisTab: 'homework',
            analysisData: {
                homework: {
                    avgCompletionTime: 45,
                    onTimeRate: 82,
                    avgScore: 85.3
                },
                engagement: {
                    classActivity: 78,
                    homeworkParticipation: 85,
                    discussionParticipation: 65,
                    onlineTime: 72
                }
            },

            // 导出配置
            exportConfig: {
                type: 'comprehensive',
                dateRange: [],
                format: 'excel'
            },
            exportLoading: false,

            // 图表实例
            charts: {}
        }
    },

    mounted () {
        this.initializeCharts()
        // this.initializeCharts() // 暂时禁用图表
        this.loadData()
    },

    beforeDestroy () {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.dispose()
            }
        })
    // 销毁图表实例
    // Object.values(this.charts).forEach(chart => {
    //   if (chart) {
    //     chart.dispose()
    //   }
    // })
    },

    methods: {
    // 初始化图表
        initializeCharts () {
            this.$nextTick(() => {
                this.initLearningTrendChart()
                this.initGradeDistributionChart()
                this.initHomeworkAnalysisChart()
                this.initEngagementChart()
                this.initProgressChart()
            })
        },

        // 学习趋势图
        initLearningTrendChart () {
            const chartDom = document.getElementById('learningTrendChart')
            if (!chartDom) return

            this.charts.learningTrend = echarts.init(chartDom)

            const option = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'cross' }
                },
                legend: {
                    data: ['作业提交', '课程学习', '在线时长']
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    boundaryGap: false,
                    data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月']
                },
                yAxis: {
                    type: 'value'
                },
                series: [
                    {
                        name: '作业提交',
                        type: 'line',
                        stack: 'Total',
                        smooth: true,
                        lineStyle: { width: 3 },
                        areaStyle: { opacity: 0.3 },
                        data: [120, 132, 101, 134, 90, 230, 210]
                    },
                    {
                        name: '课程学习',
                        type: 'line',
                        stack: 'Total',
                        smooth: true,
                        lineStyle: { width: 3 },
                        areaStyle: { opacity: 0.3 },
                        data: [220, 182, 191, 234, 290, 330, 310]
                    },
                    {
                        name: '在线时长',
                        type: 'line',
                        stack: 'Total',
                        smooth: true,
                        lineStyle: { width: 3 },
                        areaStyle: { opacity: 0.3 },
                        data: [150, 232, 201, 154, 190, 330, 410]
                    }
                ]
            }

            this.charts.learningTrend.setOption(option)
        },

        // 成绩分布图
        initGradeDistributionChart () {
            const chartDom = document.getElementById('gradeDistributionChart')
            if (!chartDom) return

            this.charts.gradeDistribution = echarts.init(chartDom)

            const option = {
                tooltip: {
                    trigger: 'item',
                    formatter: '{a} <br/>{b}: {c} ({d}%)'
                },
                legend: {
                    orient: 'vertical',
                    left: 10,
                    data: ['优秀(90-100)', '良好(80-89)', '中等(70-79)', '及格(60-69)', '不及格(<60)']
                },
                series: [
                    {
                        name: '成绩分布',
                        type: 'pie',
                        radius: ['50%', '70%'],
                        avoidLabelOverlap: false,
                        label: {
                            show: false,
                            position: 'center'
                        },
                        emphasis: {
                            label: {
                                show: true,
                                fontSize: '30',
                                fontWeight: 'bold'
                            }
                        },
                        labelLine: {
                            show: false
                        },
                        data: [
                            { value: 335, name: '优秀(90-100)' },
                            { value: 310, name: '良好(80-89)' },
                            { value: 234, name: '中等(70-79)' },
                            { value: 135, name: '及格(60-69)' },
                            { value: 48, name: '不及格(<60)' }
                        ]
                    }
                ]
            }

            this.charts.gradeDistribution.setOption(option)
        },

        // 作业分析图
        initHomeworkAnalysisChart () {
            const chartDom = document.getElementById('homeworkAnalysisChart')
            if (!chartDom) return

            this.charts.homeworkAnalysis = echarts.init(chartDom)

            const option = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' }
                },
                legend: {
                    data: ['提交率', '平均分', '及时率']
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: ['Week1', 'Week2', 'Week3', 'Week4', 'Week5', 'Week6']
                },
                yAxis: [
                    {
                        type: 'value',
                        name: '百分比(%)',
                        min: 0,
                        max: 100,
                        position: 'left'
                    },
                    {
                        type: 'value',
                        name: '平均分',
                        min: 0,
                        max: 100,
                        position: 'right'
                    }
                ],
                series: [
                    {
                        name: '提交率',
                        type: 'bar',
                        data: [85, 92, 88, 94, 89, 91]
                    },
                    {
                        name: '及时率',
                        type: 'bar',
                        data: [78, 85, 82, 88, 84, 87]
                    },
                    {
                        name: '平均分',
                        type: 'line',
                        yAxisIndex: 1,
                        data: [82, 86, 84, 88, 85, 89]
                    }
                ]
            }

            this.charts.homeworkAnalysis.setOption(option)
        },

        // 参与度雷达图
        initEngagementChart () {
            const chartDom = document.getElementById('engagementChart')
            if (!chartDom) return

            this.charts.engagement = echarts.init(chartDom)

            const option = {
                tooltip: {},
                legend: {
                    data: ['平均水平', '当前班级']
                },
                radar: {
                    indicator: [
                        { name: '课堂活跃度', max: 100 },
                        { name: '作业完成度', max: 100 },
                        { name: '讨论参与度', max: 100 },
                        { name: '在线学习时长', max: 100 },
                        { name: '作业质量', max: 100 },
                        { name: '学习进度', max: 100 }
                    ]
                },
                series: [{
                    name: '学习参与度',
                    type: 'radar',
                    data: [
                        {
                            value: [75, 80, 70, 85, 78, 82],
                            name: '平均水平'
                        },
                        {
                            value: [85, 88, 75, 92, 85, 89],
                            name: '当前班级'
                        }
                    ]
                }]
            }

            this.charts.engagement.setOption(option)
        },

        // 学习进度图
        initProgressChart () {
            const chartDom = document.getElementById('progressChart')
            if (!chartDom) return

            this.charts.progress = echarts.init(chartDom)

            const option = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'cross' }
                },
                legend: {
                    data: ['计划进度', '实际进度', '作业完成度']
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: ['第1周', '第2周', '第3周', '第4周', '第5周', '第6周', '第7周', '第8周']
                },
                yAxis: {
                    type: 'value',
                    max: 100,
                    axisLabel: { formatter: '{value}%' }
                },
                series: [
                    {
                        name: '计划进度',
                        type: 'line',
                        data: [12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100],
                        lineStyle: { type: 'dashed', width: 2 }
                    },
                    {
                        name: '实际进度',
                        type: 'line',
                        data: [15, 28, 35, 48, 65, 78, 85, 95],
                        lineStyle: { width: 3 },
                        areaStyle: { opacity: 0.2 }
                    },
                    {
                        name: '作业完成度',
                        type: 'bar',
                        data: [92, 85, 88, 94, 87, 91, 89, 93],
                        barMaxWidth: 30
                    }
                ]
            }

            this.charts.progress.setOption(option)
        },

        // 加载数据
        async loadData () {
            this.loading = true
            try {
                // 这里可以调用API获取实际数据
            } catch (error) {
                console.error('加载数据失败:', error)
                this.$message.error('数据加载失败')
            } finally {
                this.loading = false
            }
        },

        // 更新学习趋势
        updateLearningTrend () {
            // 根据时间范围更新数据
        },

        // 更新成绩分布
        updateGradeDistribution () {
            // 根据选择的课程更新数据
        },

        // 分析标签页切换
        handleAnalysisTabChange (activeKey) {
            this.activeAnalysisTab = activeKey
            const chartKeyMap = {
                homework: 'homeworkAnalysis',
                engagement: 'engagement',
                progress: 'progress'
            }
            // 重新渲染对应图表
            this.$nextTick(() => {
                const chart = this.charts[chartKeyMap[activeKey]]
                if (chart) {
                    chart.resize()
                }
            })
        },

        // 获取排名颜色
        getRankColor (rank) {
            const colors = ['#f50', '#faad14', '#52c41a', '#1890ff', '#722ed1']
            return colors[rank - 1] || '#d9d9d9'
        },

        // 导出报表
        async exportReport () {
            if (!this.exportConfig.dateRange || this.exportConfig.dateRange.length !== 2) {
                this.$message.warning('请选择时间范围')
                return
            }

            this.exportLoading = true
            try {
                // 构建导出数据
                const exportData = {
                    type: this.exportConfig.type,
                    startDate: this.exportConfig.dateRange[0].format('YYYY-MM-DD'),
                    endDate: this.exportConfig.dateRange[1].format('YYYY-MM-DD'),
                    format: this.exportConfig.format
                }

                // 模拟导出
                await new Promise(resolve => setTimeout(resolve, 2000))

                // 创建下载链接
                const fileName = `${this.getReportTypeName()}_${exportData.startDate}_to_${exportData.endDate}.${exportData.format}`
                this.downloadFile(fileName, exportData)

                this.$message.success('报表导出成功')
            } catch (error) {
                console.error('导出失败:', error)
                this.$message.error('导出失败，请重试')
            } finally {
                this.exportLoading = false
            }
        },

        // 快速导出
        async quickExport (period) {
            const periodNames = {
                daily: '日报',
                weekly: '周报',
                monthly: '月报',
                semester: '学期报表'
            }

            try {
                this.$message.loading(`正在生成${periodNames[period]}...`, 2)

                // 模拟导出
                await new Promise(resolve => setTimeout(resolve, 1500))

                const fileName = `${periodNames[period]}_${moment().format('YYYY-MM-DD')}.xlsx`
                this.downloadFile(fileName, { period })

                this.$message.success(`${periodNames[period]}导出成功`)
            } catch (error) {
                console.error('快速导出失败:', error)
                this.$message.error('导出失败')
            }
        },

        // 获取报表类型名称
        getReportTypeName () {
            const types = {
                comprehensive: '综合报表',
                homework: '作业分析报表',
                student: '学生学习报表',
                teacher: '教师教学报表'
            }
            return types[this.exportConfig.type] || '数据报表'
        },

        // 下载文件
        downloadFile (fileName, data) {
            // 创建虚拟下载（实际项目中这里会处理真实的文件下载）
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = fileName
            link.click()
            window.URL.revokeObjectURL(url)
        }
    }
}
</script>

<style lang="less" scoped>
.data-analytics {
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;

  .overview-cards {
    margin-bottom: 24px;

    .stat-card {
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s;

      &:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
      }

      .trend-up, .trend-down {
        font-size: 12px;
        margin-left: 8px;
      }

      .trend-up {
        color: #52c41a;
      }

      .trend-down {
        color: #f5222d;
      }
    }
  }

  .chart-section, .table-section, .analysis-section, .export-section {
    margin-bottom: 24px;

    .ant-card {
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }

  .chart-container {
    position: relative;
  }

  .chart-controls {
    margin-top: 16px;
    text-align: center;
    padding-top: 16px;
    border-top: 1px solid #f0f0f0;
  }

  .analysis-content {
    .analysis-summary {
      padding-left: 24px;

      h4 {
        margin-bottom: 16px;
        color: #1890ff;
      }
    }

    .engagement-metrics {
      padding-left: 24px;

      h4 {
        margin-bottom: 20px;
        color: #1890ff;
      }

      .metric-item {
        margin-bottom: 16px;

        .metric-label {
          display: inline-block;
          width: 100px;
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }
      }
    }
  }

  .export-section {
    .export-controls {
      margin-bottom: 24px;
    }

    .quick-export {
      h4 {
        margin-bottom: 12px;
        color: #1890ff;
      }
    }
  }

  // 响应式优化
  @media (max-width: 768px) {
    padding: 16px;

    .overview-cards {
      .ant-col {
        margin-bottom: 16px;
      }
    }

    .chart-section, .table-section {
      .ant-col {
        margin-bottom: 16px;
      }
    }

    .analysis-content {
      .analysis-summary, .engagement-metrics {
        padding-left: 0;
        margin-top: 16px;
      }
    }
  }
}

// 全局图表样式
.ant-card-head-title {
  font-weight: 600;
  color: #1890ff;
}

.ant-statistic-title {
  font-size: 14px;
  color: #666;
}

.ant-statistic-content {
  font-size: 24px;
  font-weight: 600;
}
</style>
