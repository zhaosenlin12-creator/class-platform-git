<template>
  <div class="learning-analytics-dashboard">
    <div class="dashboard-header">
      <a-page-header
        title="学习分析仪表板"
        sub-title="Learning Analytics Dashboard"
      >
        <template slot="extra">
          <a-range-picker
            v-model="dateRange"
            @change="onDateRangeChange"
            :locale="locale"
            format="YYYY-MM-DD"
          />
          <a-button
            type="primary"
            icon="reload"
            @click="refreshData"
            style="margin-left: 8px"
          >
            刷新数据
          </a-button>
        </template>
      </a-page-header>
    </div>

    <a-spin :spinning="loading">
      <div class="dashboard-content">
        <!-- 概览卡片 -->
        <a-row :gutter="16" style="margin-bottom: 16px">
          <a-col :span="6">
            <a-card>
              <a-statistic
                title="总学习时长"
                :value="overviewData.totalStudyTime"
                suffix="小时"
                :value-style="{ color: '#3f8600' }"
              >
                <template #prefix>
                  <a-icon type="clock-circle" />
                </template>
              </a-statistic>
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card>
              <a-statistic
                title="活跃学生数"
                :value="overviewData.activeStudents"
                suffix="人"
                :value-style="{ color: '#1890ff' }"
              >
                <template #prefix>
                  <a-icon type="user" />
                </template>
              </a-statistic>
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card>
              <a-statistic
                title="课程完成率"
                :value="overviewData.completionRate"
                suffix="%"
                :precision="1"
                :value-style="{ color: '#722ed1' }"
              >
                <template #prefix>
                  <a-icon type="check-circle" />
                </template>
              </a-statistic>
            </a-card>
          </a-col>
          <a-col :span="6">
            <a-card>
              <a-statistic
                title="平均成绩"
                :value="overviewData.averageScore"
                suffix="分"
                :precision="1"
                :value-style="{ color: '#cf1322' }"
              >
                <template #prefix>
                  <a-icon type="trophy" />
                </template>
              </a-statistic>
            </a-card>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <!-- 学习趋势图 -->
          <a-col :span="12">
            <a-card title="学习趋势" :bordered="false">
              <div ref="learningTrendChart" style="height: 300px"></div>
            </a-card>
          </a-col>

          <!-- 学习行为分布 -->
          <a-col :span="12">
            <a-card title="学习行为分布" :bordered="false">
              <div ref="behaviorDistributionChart" style="height: 300px"></div>
            </a-card>
          </a-col>
        </a-row>

        <a-row :gutter="16" style="margin-top: 16px">
          <!-- 学习热力图 -->
          <a-col :span="16">
            <a-card title="学习热力图" :bordered="false">
              <div ref="learningHeatmapChart" style="height: 400px"></div>
            </a-card>
          </a-col>

          <!-- 活跃度排行 -->
          <a-col :span="8">
            <a-card title="学习活跃度排行" :bordered="false">
              <a-list
                :data-source="activityRanking"
                size="small"
              >
                <a-list-item slot="renderItem" slot-scope="item, index">
                  <a-list-item-meta>
                    <template slot="avatar">
                      <a-badge
                        :count="index + 1"
                        :number-style="{ backgroundColor: getRankColor(index) }"
                      />
                    </template>
                    <template slot="title">
                      {{ item.studentName }}
                    </template>
                    <template slot="description">
                      学习时长: {{ item.studyTime }}分钟
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </a-list>
            </a-card>
          </a-col>
        </a-row>

        <!-- 预警信息 -->
        <a-row :gutter="16" style="margin-top: 16px">
          <a-col :span="24">
            <a-card title="学习预警" :bordered="false">
              <a-alert
                v-for="warning in warnings"
                :key="warning.id"
                :message="warning.title"
                :description="warning.message"
                :type="getWarningType(warning.level)"
                show-icon
                style="margin-bottom: 8px"
              />
              <a-empty v-if="warnings.length === 0" description="暂无预警信息" />
            </a-card>
          </a-col>
        </a-row>
      </div>
    </a-spin>
  </div>
</template>

<script>
import { getAction } from '@/api/manage'
import * as echarts from 'echarts'
import moment from 'moment'

export default {
    name: 'LearningAnalyticsDashboard',
    data () {
        return {
            loading: false,
            dateRange: [moment().subtract(30, 'days'), moment()],
            locale: {
                lang: {
                    placeholder: '请选择日期',
                    rangePlaceholder: ['开始日期', '结束日期']
                }
            },
            overviewData: {
                totalStudyTime: 0,
                activeStudents: 0,
                completionRate: 0,
                averageScore: 0
            },
            learningTrendData: [],
            behaviorDistributionData: [],
            heatmapData: [],
            activityRanking: [],
            warnings: [],
            courseId: null
        }
    },
    mounted () {
        this.courseId = this.$route.query.courseId
        this.initCharts()
        this.loadDashboardData()
    },
    methods: {
        async loadDashboardData () {
            this.loading = true
            try {
                await Promise.all([
                    this.loadOverviewData(),
                    this.loadLearningTrend(),
                    this.loadBehaviorDistribution(),
                    this.loadHeatmapData(),
                    this.loadActivityRanking(),
                    this.loadWarnings()
                ])
                this.updateCharts()
            } catch (error) {
                console.error('加载仪表板数据失败:', error)
                this.$message.error('加载数据失败')
            } finally {
                this.loading = false
            }
        },

        async loadOverviewData () {
            if (!this.courseId) return
            const startDate = this.dateRange[0].format('YYYY-MM-DD')
            const endDate = this.dateRange[1].format('YYYY-MM-DD')

            const res = await getAction('/teaching/learningAnalytics/courseAnalytics', {
                courseId: this.courseId,
                startDate,
                endDate
            })

            if (res.success && res.result.overallStats) {
                const stats = res.result.overallStats
                this.overviewData = {
                    totalStudyTime: Math.round((stats.totalStudyTime || 0) / 60),
                    activeStudents: stats.activeStudentCount || 0,
                    completionRate: ((stats.completionRate || 0) * 100),
                    averageScore: stats.avgScore || 0
                }
            }
        },

        async loadLearningTrend () {
            if (!this.courseId) return
            const days = this.dateRange[1].diff(this.dateRange[0], 'days')

            const res = await getAction('/teaching/learningAnalytics/learningTrend', {
                userId: this.$store.getters.userInfo.id,
                courseId: this.courseId,
                days
            })

            if (res.success && res.result.trend) {
                this.learningTrendData = res.result.trend
            }
        },

        async loadBehaviorDistribution () {
            if (!this.courseId) return
            const startDate = this.dateRange[0].format('YYYY-MM-DD')
            const endDate = this.dateRange[1].format('YYYY-MM-DD')

            const res = await getAction('/teaching/learningAnalytics/courseAnalytics', {
                courseId: this.courseId,
                startDate,
                endDate
            })

            if (res.success && res.result.behaviorDistribution) {
                this.behaviorDistributionData = res.result.behaviorDistribution
            }
        },

        async loadHeatmapData () {
            if (!this.courseId) return
            const startDate = this.dateRange[0].format('YYYY-MM-DD')
            const endDate = this.dateRange[1].format('YYYY-MM-DD')

            const res = await getAction('/teaching/learningAnalytics/heatmap', {
                courseId: this.courseId,
                startDate,
                endDate
            })

            if (res.success) {
                this.heatmapData = res.result || []
            }
        },

        async loadActivityRanking () {
            if (!this.courseId) return
            const res = await getAction('/teaching/learningAnalytics/activityRanking', {
                courseId: this.courseId,
                limit: 10
            })

            if (res.success) {
                this.activityRanking = res.result || []
            }
        },

        async loadWarnings () {
            const res = await getAction('/teaching/learningAnalytics/warnings', {
                userId: this.$store.getters.userInfo.id,
                courseId: this.courseId
            })

            if (res.success) {
                this.warnings = res.result || []
            }
        },

        initCharts () {
            this.learningTrendChart = echarts.init(this.$refs.learningTrendChart)
            this.behaviorDistributionChart = echarts.init(this.$refs.behaviorDistributionChart)
            this.learningHeatmapChart = echarts.init(this.$refs.learningHeatmapChart)
        },

        updateCharts () {
            this.updateLearningTrendChart()
            this.updateBehaviorDistributionChart()
            this.updateHeatmapChart()
        },

        updateLearningTrendChart () {
            const option = {
                title: {
                    text: '学习时长趋势',
                    textStyle: { fontSize: 14 }
                },
                tooltip: {
                    trigger: 'axis',
                    formatter: '{b}<br/>{a}: {c}分钟'
                },
                xAxis: {
                    type: 'category',
                    data: this.learningTrendData.map(item => moment(item.statDate).format('MM-DD'))
                },
                yAxis: {
                    type: 'value',
                    name: '分钟'
                },
                series: [{
                    name: '学习时长',
                    data: this.learningTrendData.map(item => item.studyTime || 0),
                    type: 'line',
                    smooth: true,
                    areaStyle: {}
                }]
            }
            this.learningTrendChart.setOption(option)
        },

        updateBehaviorDistributionChart () {
            const option = {
                title: {
                    text: '学习行为分布',
                    textStyle: { fontSize: 14 }
                },
                tooltip: {
                    trigger: 'item',
                    formatter: '{b}: {c} ({d}%)'
                },
                series: [{
                    type: 'pie',
                    radius: '60%',
                    data: this.behaviorDistributionData.map(item => ({
                        name: this.getBehaviorTypeName(item.behaviorType),
                        value: item.count
                    })),
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }]
            }
            this.behaviorDistributionChart.setOption(option)
        },

        updateHeatmapChart () {
            const hours = Array.from({ length: 24 }, (_, i) => i + '')
            const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

            const option = {
                title: {
                    text: '学习活动热力图',
                    textStyle: { fontSize: 14 }
                },
                tooltip: {
                    position: 'top',
                    formatter: function (params) {
                        return `${days[params.data[1]]} ${params.data[0]}:00<br/>活跃度: ${params.data[2]}`
                    }
                },
                grid: {
                    height: '50%',
                    top: '10%'
                },
                xAxis: {
                    type: 'category',
                    data: hours,
                    splitArea: {
                        show: true
                    }
                },
                yAxis: {
                    type: 'category',
                    data: days,
                    splitArea: {
                        show: true
                    }
                },
                visualMap: {
                    min: 0,
                    max: 10,
                    calculable: true,
                    inRange: {
                        color: ['#50a3ba', '#eac736', '#d94e5d']
                    }
                },
                series: [{
                    name: '活跃度',
                    type: 'heatmap',
                    data: this.heatmapData,
                    label: {
                        show: false
                    },
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }]
            }
            this.learningHeatmapChart.setOption(option)
        },

        getBehaviorTypeName (type) {
            const typeMap = {
                study: '学习',
                work: '作业',
                exam: '考试',
                login: '登录',
                logout: '登出'
            }
            return typeMap[type] || type
        },

        getRankColor (index) {
            const colors = ['#f50', '#2db7f5', '#87d068']
            return colors[index] || '#108ee9'
        },

        getWarningType (level) {
            const typeMap = {
                1: 'info',
                2: 'warning',
                3: 'error'
            }
            return typeMap[level] || 'info'
        },

        onDateRangeChange () {
            this.loadDashboardData()
        },

        refreshData () {
            this.loadDashboardData()
        }
    }
}
</script>

<style lang="less" scoped>
.learning-analytics-dashboard {
  .dashboard-header {
    margin-bottom: 16px;
  }

  .dashboard-content {
    .ant-card {
      .ant-card-head-title {
        font-size: 16px;
        font-weight: 500;
      }
    }

    .ant-statistic {
      .ant-statistic-title {
        font-size: 14px;
        color: rgba(0, 0, 0, 0.65);
      }

      .ant-statistic-content {
        font-size: 24px;
        font-weight: 600;
      }
    }

    .ant-list-item-meta-title {
      font-size: 14px;
      margin-bottom: 4px;
    }

    .ant-list-item-meta-description {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.45);
    }

    .ant-alert {
      border-radius: 6px;
    }
  }
}
</style>
