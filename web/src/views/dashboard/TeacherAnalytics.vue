<template>
  <div class="teacher-analytics">
    <a-card title="教师教学效果分析" :bordered="false">
      <!-- 教师选择和时间范围 -->
      <div class="filter-section">
        <a-form layout="inline">
          <a-form-item label="教师">
            <a-select
              v-model="selectedTeacher"
              style="width: 200px;"
              @change="loadTeacherData"
              allowClear
            >
              <a-select-option value="">全部教师</a-select-option>
              <a-select-option
                v-for="teacher in teacherList"
                :key="teacher.id"
                :value="teacher.id"
              >
                {{ teacher.name }} - {{ teacher.subject }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="时间范围">
            <a-range-picker
              v-model="dateRange"
              @change="loadTeacherData"
              :ranges="{
                '本周': [moment().startOf('week'), moment().endOf('week')],
                '本月': [moment().startOf('month'), moment().endOf('month')],
                '本学期': [moment().subtract(3, 'months'), moment()]
              }"
            />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" @click="loadTeacherData">
              <a-icon type="search" />
              分析
            </a-button>
          </a-form-item>
        </a-form>
      </div>

      <!-- 教学效果概览 -->
      <a-row :gutter="16" class="overview-section">
        <a-col :xs="24" :sm="12" :md="6">
          <a-card class="metric-card">
            <a-statistic
              title="教学班级数"
              :value="teachingMetrics.classCount"
              :value-style="{ color: '#1890ff' }"
            >
              <template #prefix>
                <a-icon type="team" />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="24" :sm="12" :md="6">
          <a-card class="metric-card">
            <a-statistic
              title="学生总数"
              :value="teachingMetrics.studentCount"
              :value-style="{ color: '#52c41a' }"
            >
              <template #prefix>
                <a-icon type="user" />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="24" :sm="12" :md="6">
          <a-card class="metric-card">
            <a-statistic
              title="平均成绩"
              :value="teachingMetrics.avgScore"
              suffix="分"
              :value-style="{ color: '#722ed1' }"
            >
              <template #prefix>
                <a-icon type="trophy" />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :xs="24" :sm="12" :md="6">
          <a-card class="metric-card">
            <a-statistic
              title="学生满意度"
              :value="teachingMetrics.satisfaction"
              suffix="%"
              :value-style="{ color: '#fa8c16' }"
            >
              <template #prefix>
                <a-icon type="heart" />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
      </a-row>

      <!-- 教学效果图表 -->
      <a-row :gutter="16" class="charts-section">
        <!-- 成绩趋势分析 -->
        <a-col :xs="24" :lg="12">
          <a-card title="班级成绩趋势" :bordered="false">
            <div id="scoreTrendChart" style="height: 350px;"></div>
            <div class="chart-summary">
              <a-row :gutter="16">
                <a-col :span="8">
                  <a-statistic
                    title="最高平均分"
                    :value="analysisData.maxAvgScore"
                    suffix="分"
                    :value-style="{ fontSize: '16px' }"
                  />
                </a-col>
                <a-col :span="8">
                  <a-statistic
                    title="最低平均分"
                    :value="analysisData.minAvgScore"
                    suffix="分"
                    :value-style="{ fontSize: '16px' }"
                  />
                </a-col>
                <a-col :span="8">
                  <a-statistic
                    title="成绩提升率"
                    :value="analysisData.improvementRate"
                    suffix="%"
                    :value-style="{ fontSize: '16px', color: '#52c41a' }"
                  />
                </a-col>
              </a-row>
            </div>
          </a-card>
        </a-col>

        <!-- 作业完成情况分析 -->
        <a-col :xs="24" :lg="12">
          <a-card title="作业完成情况" :bordered="false">
            <div id="homeworkCompletionChart" style="height: 350px;"></div>
            <div class="homework-insights">
              <h5>关键指标</h5>
              <a-list size="small">
                <a-list-item>
                  <a-list-item-meta>
                    <template slot="title">平均完成率</template>
                    <template slot="description">
                      {{ analysisData.avgCompletionRate }}%
                      <a-tag color="green" size="small" style="margin-left: 8px;">
                        比上月提升5%
                      </a-tag>
                    </template>
                  </a-list-item-meta>
                </a-list-item>
                <a-list-item>
                  <a-list-item-meta>
                    <template slot="title">及时提交率</template>
                    <template slot="description">
                      {{ analysisData.onTimeRate }}%
                      <a-tag color="blue" size="small" style="margin-left: 8px;">
                        稳定
                      </a-tag>
                    </template>
                  </a-list-item-meta>
                </a-list-item>
                <a-list-item>
                  <a-list-item-meta>
                    <template slot="title">质量评分</template>
                    <template slot="description">
                      {{ analysisData.qualityScore }}分
                      <a-tag color="orange" size="small" style="margin-left: 8px;">
                        待提升
                      </a-tag>
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </a-list>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 学生参与度分析 -->
      <a-row :gutter="16" class="engagement-section">
        <a-col :xs="24" :lg="16">
          <a-card title="学生参与度分析" :bordered="false">
            <div id="engagementRadarChart" style="height: 400px;"></div>
          </a-card>
        </a-col>
        <a-col :xs="24" :lg="8">
          <a-card title="参与度评估" :bordered="false">
            <div class="engagement-metrics">
              <div class="engagement-item">
                <span class="metric-label">课堂互动</span>
                <a-progress
                  :percent="engagementData.classInteraction"
                  :stroke-color="getEngagementColor(engagementData.classInteraction)"
                />
                <span class="metric-value">{{ engagementData.classInteraction }}%</span>
              </div>
              <div class="engagement-item">
                <span class="metric-label">作业参与</span>
                <a-progress
                  :percent="engagementData.homeworkParticipation"
                  :stroke-color="getEngagementColor(engagementData.homeworkParticipation)"
                />
                <span class="metric-value">{{ engagementData.homeworkParticipation }}%</span>
              </div>
              <div class="engagement-item">
                <span class="metric-label">讨论活跃度</span>
                <a-progress
                  :percent="engagementData.discussionActivity"
                  :stroke-color="getEngagementColor(engagementData.discussionActivity)"
                />
                <span class="metric-value">{{ engagementData.discussionActivity }}%</span>
              </div>
              <div class="engagement-item">
                <span class="metric-label">在线时长</span>
                <a-progress
                  :percent="engagementData.onlineTime"
                  :stroke-color="getEngagementColor(engagementData.onlineTime)"
                />
                <span class="metric-value">{{ engagementData.onlineTime }}%</span>
              </div>

              <div class="engagement-summary">
                <h5>参与度评价</h5>
                <a-alert
                  :message="getEngagementAssessment().title"
                  :description="getEngagementAssessment().description"
                  :type="getEngagementAssessment().type"
                  show-icon
                />
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 教学建议和改进方案 -->
      <a-row :gutter="16" class="suggestions-section">
        <a-col :span="24">
          <a-card title="教学建议与改进方案" :bordered="false">
            <a-tabs v-model="activeSuggestionTab">
              <a-tab-pane key="strengths" tab="教学优势">
                <div class="suggestions-content">
                  <a-list
                    :dataSource="teachingSuggestions.strengths"
                    item-layout="horizontal"
                  >
                    <a-list-item slot="renderItem" slot-scope="item">
                      <a-list-item-meta>
                        <template slot="avatar">
                          <a-icon type="check-circle" style="color: #52c41a; font-size: 18px;" />
                        </template>
                        <template slot="title">{{ item.title }}</template>
                        <template slot="description">{{ item.description }}</template>
                      </a-list-item-meta>
                      <template slot="actions">
                        <a-tag color="green">{{ item.impact }}</a-tag>
                      </template>
                    </a-list-item>
                  </a-list>
                </div>
              </a-tab-pane>

              <a-tab-pane key="improvements" tab="改进建议">
                <div class="suggestions-content">
                  <a-list
                    :dataSource="teachingSuggestions.improvements"
                    item-layout="horizontal"
                  >
                    <a-list-item slot="renderItem" slot-scope="item">
                      <a-list-item-meta>
                        <template slot="avatar">
                          <a-icon type="exclamation-circle" style="color: #faad14; font-size: 18px;" />
                        </template>
                        <template slot="title">{{ item.title }}</template>
                        <template slot="description">{{ item.description }}</template>
                      </a-list-item-meta>
                      <template slot="actions">
                        <a-tag :color="getPriorityColor(item.priority)">{{ item.priority }}</a-tag>
                      </template>
                    </a-list-item>
                  </a-list>
                </div>
              </a-tab-pane>

              <a-tab-pane key="resources" tab="推荐资源">
                <div class="resources-content">
                  <a-row :gutter="16">
                    <a-col
                      v-for="resource in recommendedResources"
                      :key="resource.id"
                      :xs="24"
                      :sm="12"
                      :md="8"
                    >
                      <a-card size="small" :title="resource.title" class="resource-card">
                        <template slot="extra">
                          <a-tag :color="resource.type === 'course' ? 'blue' : 'green'">
                            {{ resource.type === 'course' ? '课程' : '工具' }}
                          </a-tag>
                        </template>
                        <p>{{ resource.description }}</p>
                        <div class="resource-meta">
                          <span class="rating">
                            <a-rate :value="resource.rating" disabled size="small" />
                            ({{ resource.rating }})
                          </span>
                          <a-button size="small" type="link" @click="viewResource(resource)">
                            查看详情
                          </a-button>
                        </div>
                      </a-card>
                    </a-col>
                  </a-row>
                </div>
              </a-tab-pane>
            </a-tabs>
          </a-card>
        </a-col>
      </a-row>

      <!-- 教学报告导出 -->
      <a-row :gutter="16" class="export-section">
        <a-col :span="24">
          <a-card title="教学报告导出" :bordered="false">
            <div class="export-options">
              <a-form layout="inline">
                <a-form-item label="报告类型">
                  <a-select v-model="exportConfig.reportType" style="width: 150px;">
                    <a-select-option value="comprehensive">综合教学报告</a-select-option>
                    <a-select-option value="performance">教学效果报告</a-select-option>
                    <a-select-option value="engagement">学生参与度报告</a-select-option>
                    <a-select-option value="improvement">改进建议报告</a-select-option>
                  </a-select>
                </a-form-item>
                <a-form-item label="包含数据">
                  <a-checkbox-group v-model="exportConfig.includeData">
                    <a-checkbox value="scores">成绩数据</a-checkbox>
                    <a-checkbox value="homework">作业数据</a-checkbox>
                    <a-checkbox value="engagement">参与度数据</a-checkbox>
                    <a-checkbox value="feedback">学生反馈</a-checkbox>
                  </a-checkbox-group>
                </a-form-item>
                <a-form-item>
                  <a-button
                    type="primary"
                    @click="exportTeachingReport"
                    :loading="exportLoading"
                    v-permission="{ module: 'data_analysis', action: 'export' }"
                  >
                    <a-icon type="download" />
                    导出报告
                  </a-button>
                </a-form-item>
              </a-form>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </a-card>
  </div>
</template>

<script>
import { getAction } from '@/api/manage'
import { permissionMixin } from '@/directive/permission'
import * as echarts from 'echarts'
import moment from 'moment'

export default {
    name: 'TeacherAnalytics',
    mixins: [permissionMixin],

    data () {
        return {
            loading: false,
            selectedTeacher: '',
            dateRange: [moment().subtract(1, 'month'), moment()],

            // 教师列表
            teacherList: [],

            // 教学指标
            teachingMetrics: {
                classCount: 3,
                studentCount: 78,
                avgScore: 85.6,
                satisfaction: 92
            },

            // 分析数据
            analysisData: {
                maxAvgScore: 94.2,
                minAvgScore: 78.5,
                improvementRate: 15.3,
                avgCompletionRate: 88,
                onTimeRate: 85,
                qualityScore: 82
            },

            // 参与度数据
            engagementData: {
                classInteraction: 85,
                homeworkParticipation: 88,
                discussionActivity: 72,
                onlineTime: 78
            },

            // 教学建议
            teachingSuggestions: {
                strengths: [
                    {
                        title: '课程设计合理',
                        description: '课程内容循序渐进，学生接受度高，作业完成质量较好。',
                        impact: '高影响'
                    },
                    {
                        title: '师生互动良好',
                        description: '课堂互动频繁，学生参与积极性高，学习氛围活跃。',
                        impact: '高影响'
                    },
                    {
                        title: '教学方法多样',
                        description: '采用多种教学方式，满足不同学生的学习需求。',
                        impact: '中等影响'
                    }
                ],
                improvements: [
                    {
                        title: '增加实践项目',
                        description: '建议增加更多实践项目，提高学生动手能力和实际应用技能。',
                        priority: '高优先级'
                    },
                    {
                        title: '优化作业反馈',
                        description: '建议提供更详细的作业反馈，帮助学生更好地理解知识点。',
                        priority: '中等优先级'
                    },
                    {
                        title: '关注学习进度差异',
                        description: '部分学生进度落后，建议提供个性化辅导。',
                        priority: '高优先级'
                    }
                ]
            },

            // 推荐资源
            recommendedResources: [
                {
                    id: '1',
                    title: '编程思维培养课程',
                    description: '帮助学生建立编程思维的系统性课程',
                    type: 'course',
                    rating: 4.8
                },
                {
                    id: '2',
                    title: '代码可视化工具',
                    description: '帮助学生理解代码执行过程的可视化工具',
                    type: 'tool',
                    rating: 4.6
                },
                {
                    id: '3',
                    title: '项目式学习指南',
                    description: '如何设计和实施项目式学习的完整指南',
                    type: 'course',
                    rating: 4.7
                }
            ],

            // 标签页状态
            activeSuggestionTab: 'strengths',

            // 导出配置
            exportConfig: {
                reportType: 'comprehensive',
                includeData: ['scores', 'homework', 'engagement']
            },
            exportLoading: false,

            // 图表实例
            charts: {}
        }
    },

    computed: {
        moment () {
            return moment
        }
    },

    mounted () {
        this.loadTeacherData()
        this.initCharts()
    },

    beforeDestroy () {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.dispose()
            }
        })
    },

    methods: {
    // 加载教师数据
        async loadTeacherData () {
            this.loading = true
            try {
                // 加载教师列表
                const res = await getAction('/sys/user/teacherList', { pageNo: 1, pageSize: 100 })
                if (res.success) {
                    this.teacherList = res.result.records || res.result || []
                    console.log('✅ 加载教师列表成功:', this.teacherList)
                }

                // 模拟数据更新
                this.updateChartsData()
            } catch (error) {
                console.error('加载数据失败:', error)
                this.$message.error('数据加载失败')
            } finally {
                this.loading = false
            }
        },

        // 初始化图表
        initCharts () {
            this.$nextTick(() => {
                this.initScoreTrendChart()
                this.initHomeworkCompletionChart()
                this.initEngagementRadarChart()
            })
        },

        // 成绩趋势图
        initScoreTrendChart () {
            const chartDom = document.getElementById('scoreTrendChart')
            if (!chartDom) return

            this.charts.scoreTrend = echarts.init(chartDom)

            const option = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'cross' }
                },
                legend: {
                    data: ['班级1', '班级2', '班级3']
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
                    min: 60,
                    max: 100
                },
                series: [
                    {
                        name: '班级1',
                        type: 'line',
                        data: [78, 82, 85, 88, 89, 91, 93, 94],
                        smooth: true,
                        lineStyle: { width: 3 }
                    },
                    {
                        name: '班级2',
                        type: 'line',
                        data: [75, 78, 80, 83, 85, 87, 89, 90],
                        smooth: true,
                        lineStyle: { width: 3 }
                    },
                    {
                        name: '班级3',
                        type: 'line',
                        data: [70, 73, 76, 79, 82, 84, 86, 88],
                        smooth: true,
                        lineStyle: { width: 3 }
                    }
                ]
            }

            this.charts.scoreTrend.setOption(option)
        },

        // 作业完成情况图
        initHomeworkCompletionChart () {
            const chartDom = document.getElementById('homeworkCompletionChart')
            if (!chartDom) return

            this.charts.homeworkCompletion = echarts.init(chartDom)

            const option = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' }
                },
                legend: {
                    data: ['完成率', '及时率', '质量分']
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'category',
                    data: ['作业1', '作业2', '作业3', '作业4', '作业5', '作业6']
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
                        name: '质量分',
                        min: 0,
                        max: 100,
                        position: 'right'
                    }
                ],
                series: [
                    {
                        name: '完成率',
                        type: 'bar',
                        data: [95, 88, 92, 90, 87, 93],
                        itemStyle: { color: '#52c41a' }
                    },
                    {
                        name: '及时率',
                        type: 'bar',
                        data: [88, 82, 85, 87, 80, 89],
                        itemStyle: { color: '#1890ff' }
                    },
                    {
                        name: '质量分',
                        type: 'line',
                        yAxisIndex: 1,
                        data: [85, 82, 88, 86, 84, 87],
                        itemStyle: { color: '#fa8c16' },
                        lineStyle: { width: 3 }
                    }
                ]
            }

            this.charts.homeworkCompletion.setOption(option)
        },

        // 参与度雷达图
        initEngagementRadarChart () {
            const chartDom = document.getElementById('engagementRadarChart')
            if (!chartDom) return

            this.charts.engagementRadar = echarts.init(chartDom)

            const option = {
                tooltip: {},
                legend: {
                    data: ['当前表现', '目标水平', '平均水平']
                },
                radar: {
                    indicator: [
                        { name: '课堂互动', max: 100 },
                        { name: '作业参与', max: 100 },
                        { name: '讨论活跃度', max: 100 },
                        { name: '在线时长', max: 100 },
                        { name: '学习主动性', max: 100 },
                        { name: '问题解决能力', max: 100 }
                    ],
                    radius: 80
                },
                series: [{
                    name: '学生参与度',
                    type: 'radar',
                    data: [
                        {
                            value: [85, 88, 72, 78, 80, 75],
                            name: '当前表现',
                            lineStyle: { color: '#1890ff' },
                            areaStyle: { opacity: 0.3, color: '#1890ff' }
                        },
                        {
                            value: [90, 92, 85, 88, 90, 85],
                            name: '目标水平',
                            lineStyle: { color: '#52c41a', type: 'dashed' },
                            areaStyle: { opacity: 0.1, color: '#52c41a' }
                        },
                        {
                            value: [75, 80, 70, 72, 75, 70],
                            name: '平均水平',
                            lineStyle: { color: '#faad14', type: 'dotted' },
                            areaStyle: { opacity: 0.1, color: '#faad14' }
                        }
                    ]
                }]
            }

            this.charts.engagementRadar.setOption(option)
        },

        // 更新图表数据
        updateChartsData () {
            // 根据选择的教师和时间范围更新图表数据
            if (this.charts.scoreTrend) {
                this.charts.scoreTrend.resize()
            }
            if (this.charts.homeworkCompletion) {
                this.charts.homeworkCompletion.resize()
            }
            if (this.charts.engagementRadar) {
                this.charts.engagementRadar.resize()
            }
        },

        // 获取参与度颜色
        getEngagementColor (value) {
            if (value >= 80) return '#52c41a'
            if (value >= 60) return '#faad14'
            return '#f5222d'
        },

        // 获取参与度评估
        getEngagementAssessment () {
            const avgEngagement = (
                this.engagementData.classInteraction +
        this.engagementData.homeworkParticipation +
        this.engagementData.discussionActivity +
        this.engagementData.onlineTime
            ) / 4

            if (avgEngagement >= 85) {
                return {
                    title: '参与度优秀',
                    description: '学生参与度表现优异，学习积极性很高，建议继续保持当前的教学方式。',
                    type: 'success'
                }
            } else if (avgEngagement >= 70) {
                return {
                    title: '参与度良好',
                    description: '学生参与度较好，但在讨论活跃度方面还有提升空间，建议增加互动环节。',
                    type: 'info'
                }
            } else {
                return {
                    title: '参与度需要改善',
                    description: '学生参与度偏低，建议调整教学方法，增加趣味性和互动性。',
                    type: 'warning'
                }
            }
        },

        // 获取优先级颜色
        getPriorityColor (priority) {
            const colorMap = {
                '高优先级': 'red',
                '中等优先级': 'orange',
                '低优先级': 'blue'
            }
            return colorMap[priority] || 'default'
        },

        // 查看资源详情
        viewResource (resource) {
            this.$message.info(`查看资源：${resource.title}`)
        },

        // 导出教学报告
        async exportTeachingReport () {
            this.exportLoading = true
            try {
                // 构建报告数据
                const reportData = {
                    teacher: this.selectedTeacher ? this.teacherList.find(t => t.id === this.selectedTeacher) : null,
                    dateRange: this.dateRange,
                    metrics: this.teachingMetrics,
                    analysisData: this.analysisData,
                    engagementData: this.engagementData,
                    suggestions: this.teachingSuggestions,
                    exportConfig: this.exportConfig,
                    generateTime: moment().format('YYYY-MM-DD HH:mm:ss')
                }

                // 模拟导出过程
                await new Promise(resolve => setTimeout(resolve, 2000))

                // 生成文件名
                const teacherName = reportData.teacher ? reportData.teacher.name : '全体教师'
                const fileName = `教学报告_${teacherName}_${moment().format('YYYY-MM-DD')}.pdf`

                // 创建下载
                this.downloadReport(fileName, reportData)
                this.$message.success('教学报告导出成功')
            } catch (error) {
                console.error('导出失败:', error)
                this.$message.error('报告导出失败')
            } finally {
                this.exportLoading = false
            }
        },

        // 下载报告
        downloadReport (fileName, data) {
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
.teacher-analytics {
  .filter-section {
    margin-bottom: 24px;
    padding: 16px;
    background: #fafafa;
    border-radius: 6px;
  }

  .overview-section {
    margin-bottom: 24px;

    .metric-card {
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s;

      &:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
      }
    }
  }

  .charts-section {
    margin-bottom: 24px;

    .chart-summary {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #f0f0f0;
    }

    .homework-insights {
      padding-left: 16px;

      h5 {
        margin: 16px 0 12px 0;
        color: #1890ff;
      }
    }
  }

  .engagement-section {
    margin-bottom: 24px;

    .engagement-metrics {
      .engagement-item {
        margin-bottom: 20px;

        .metric-label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          color: #666;
        }

        .metric-value {
          float: right;
          font-weight: 500;
          color: #1890ff;
        }
      }

      .engagement-summary {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #f0f0f0;

        h5 {
          margin-bottom: 12px;
          color: #1890ff;
        }
      }
    }
  }

  .suggestions-section {
    margin-bottom: 24px;

    .suggestions-content {
      .ant-list-item-meta-title {
        color: #1890ff;
        font-weight: 500;
      }
    }

    .resources-content {
      .resource-card {
        margin-bottom: 16px;
        border-radius: 6px;

        .resource-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;

          .rating {
            font-size: 12px;
          }
        }
      }
    }
  }

  .export-section {
    .export-options {
      padding: 16px;
      background: #fafafa;
      border-radius: 6px;
    }
  }

  // 响应式优化
  @media (max-width: 768px) {
    .overview-section,
    .charts-section,
    .engagement-section {
      .ant-col {
        margin-bottom: 16px;
      }
    }

    .engagement-metrics {
      .engagement-item {
        .metric-value {
          float: none;
          display: block;
          margin-top: 4px;
        }
      }
    }

    .resources-content {
      .ant-col {
        margin-bottom: 16px;
      }
    }
  }
}
</style>
