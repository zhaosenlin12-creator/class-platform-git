<template>
  <div class="optimization-report">
    <a-card title="性能优化报告" :bordered="false">
      <!-- 总览统计 -->
      <div class="overview-stats">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-statistic
              title="总体性能提升"
              :value="overallImprovement"
              suffix="%"
              :value-style="{ color: '#3f8600' }"
            />
          </a-col>
          <a-col :span="6">
            <a-statistic
              title="Bundle大小减少"
              :value="bundleSizeReduction"
              suffix="KB"
              :value-style="{ color: '#52c41a' }"
            />
          </a-col>
          <a-col :span="6">
            <a-statistic
              title="首屏加载改善"
              :value="loadTimeImprovement"
              suffix="ms"
              :value-style="{ color: '#1890ff' }"
            />
          </a-col>
          <a-col :span="6">
            <a-statistic
              title="优化项目数"
              :value="optimizationCount"
              :value-style="{ color: '#722ed1' }"
            />
          </a-col>
        </a-row>
      </div>

      <a-tabs default-active-key="1" class="report-tabs">
        <!-- 性能指标对比 -->
        <a-tab-pane key="1" tab="性能指标对比">
          <div class="performance-comparison">
            <div class="chart-section">
              <div ref="performanceChart" class="chart"></div>
            </div>
            <div class="metrics-table">
              <a-table
                :columns="metricsColumns"
                :data-source="performanceMetrics"
                :pagination="false"
                size="small"
              >
                <template slot="improvement" slot-scope="text, record">
                  <span :class="getImprovementClass(text)">
                    <a-icon :type="text > 0 ? 'arrow-up' : 'arrow-down'" />
                    {{ Math.abs(text) }}%
                  </span>
                </template>
                <template slot="status" slot-scope="text">
                  <a-tag :color="getStatusColor(text)">{{ text }}</a-tag>
                </template>
              </a-table>
            </div>
          </div>
        </a-tab-pane>

        <!-- 优化历程 -->
        <a-tab-pane key="2" tab="优化历程">
          <div class="optimization-timeline">
            <a-timeline mode="left">
              <a-timeline-item
                v-for="(item, index) in optimizationTimeline"
                :key="index"
                :color="item.type === 'completed' ? 'green' : 'blue'"
              >
                <template slot="dot">
                  <a-icon :type="item.icon" style="font-size: 16px;" />
                </template>
                <div class="timeline-content">
                  <h4>{{ item.title }}</h4>
                  <p>{{ item.description }}</p>
                  <div class="timeline-metrics">
                    <a-tag color="blue">{{ item.improvement }}</a-tag>
                    <span class="timeline-date">{{ item.date }}</span>
                  </div>
                </div>
              </a-timeline-item>
            </a-timeline>
          </div>
        </a-tab-pane>

        <!-- Bundle分析 -->
        <a-tab-pane key="3" tab="Bundle分析">
          <div class="bundle-analysis">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-card title="Bundle大小变化" size="small">
                  <div ref="bundleSizeChart" class="small-chart"></div>
                </a-card>
              </a-col>
              <a-col :span="12">
                <a-card title="Chunk分布" size="small">
                  <div ref="chunkDistributionChart" class="small-chart"></div>
                </a-card>
              </a-col>
            </a-row>
            <div class="bundle-details">
              <a-table
                :columns="bundleColumns"
                :data-source="bundleAnalysisData"
                :pagination="false"
                size="small"
              >
                <template slot="size" slot-scope="text">
                  {{ formatSize(text) }}
                </template>
                <template slot="change" slot-scope="text">
                  <span :class="text < 0 ? 'reduction' : 'increase'">
                    {{ text > 0 ? '+' : '' }}{{ text }}%
                  </span>
                </template>
              </a-table>
            </div>
          </div>
        </a-tab-pane>

        <!-- 性能建议 -->
        <a-tab-pane key="4" tab="性能建议">
          <div class="performance-recommendations">
            <a-list
              :data-source="recommendations"
              size="large"
            >
              <a-list-item slot="renderItem" slot-scope="item">
                <a-list-item-meta>
                  <template slot="avatar">
                    <a-avatar :style="{ backgroundColor: item.color }">
                      <a-icon :type="item.icon" />
                    </a-avatar>
                  </template>
                  <template slot="title">
                    <span>{{ item.title }}</span>
                    <a-tag :color="getPriorityColor(item.priority)" style="margin-left: 8px">
                      {{ item.priority }}
                    </a-tag>
                  </template>
                  <template slot="description">
                    <p>{{ item.description }}</p>
                    <div class="recommendation-actions">
                      <a-tag
                        v-for="action in item.actions"
                        :key="action"
                        color="processing"
                      >
                        {{ action }}
                      </a-tag>
                    </div>
                  </template>
                </a-list-item-meta>
                <div slot="actions">
                  <a-button size="small" @click="implementRecommendation(item)">
                    实施建议
                  </a-button>
                </div>
              </a-list-item>
            </a-list>
          </div>
        </a-tab-pane>

        <!-- 监控报警 -->
        <a-tab-pane key="5" tab="监控报警">
          <div class="monitoring-alerts">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-card title="性能阈值监控" size="small">
                  <div class="threshold-monitoring">
                    <div
                      v-for="threshold in performanceThresholds"
                      :key="threshold.name"
                      class="threshold-item"
                    >
                      <div class="threshold-header">
                        <span>{{ threshold.name }}</span>
                        <a-tag :color="threshold.status === 'good' ? 'green' : threshold.status === 'warning' ? 'orange' : 'red'">
                          {{ threshold.status }}
                        </a-tag>
                      </div>
                      <a-progress
                        :percent="threshold.percentage"
                        :status="threshold.status === 'error' ? 'exception' : 'normal'"
                        :stroke-color="getProgressColor(threshold.status)"
                      />
                      <div class="threshold-value">
                        当前值: {{ threshold.currentValue }} / 目标: {{ threshold.targetValue }}
                      </div>
                    </div>
                  </div>
                </a-card>
              </a-col>
              <a-col :span="12">
                <a-card title="实时告警" size="small">
                  <a-list
                    :data-source="alerts"
                    size="small"
                  >
                    <a-list-item slot="renderItem" slot-scope="alert">
                      <a-list-item-meta>
                        <template slot="avatar">
                          <a-icon
                            :type="alert.level === 'error' ? 'exclamation-circle' : 'warning'"
                            :style="{ color: alert.level === 'error' ? '#f5222d' : '#faad14' }"
                          />
                        </template>
                        <template slot="title">{{ alert.title }}</template>
                        <template slot="description">
                          {{ alert.message }}
                          <div class="alert-time">{{ alert.time }}</div>
                        </template>
                      </a-list-item-meta>
                    </a-list-item>
                  </a-list>
                </a-card>
              </a-col>
            </a-row>
          </div>
        </a-tab-pane>
      </a-tabs>

      <!-- 操作按钮 -->
      <div class="report-actions">
        <a-button type="primary" @click="exportReport">
          <a-icon type="download" />
          导出报告
        </a-button>
        <a-button @click="refreshReport">
          <a-icon type="reload" />
          刷新数据
        </a-button>
        <a-button @click="scheduleReport">
          <a-icon type="clock-circle" />
          定时报告
        </a-button>
      </div>
    </a-card>
  </div>
</template>

<script>
export default {
    name: 'OptimizationReport',
    data () {
        return {
            overallImprovement: 45.2,
            bundleSizeReduction: 432,
            loadTimeImprovement: 1200,
            optimizationCount: 15,

            performanceMetrics: [
                {
                    key: '1',
                    metric: '首屏加载时间(FCP)',
                    before: '2.3s',
                    after: '1.1s',
                    improvement: 52.2,
                    status: '优秀'
                },
                {
                    key: '2',
                    metric: '最大内容绘制(LCP)',
                    before: '3.8s',
                    after: '2.1s',
                    improvement: 44.7,
                    status: '良好'
                },
                {
                    key: '3',
                    metric: 'Bundle总大小',
                    before: '1680KB',
                    after: '1248KB',
                    improvement: 25.7,
                    status: '优秀'
                },
                {
                    key: '4',
                    metric: 'JavaScript执行时间',
                    before: '890ms',
                    after: '456ms',
                    improvement: 48.8,
                    status: '优秀'
                }
            ],

            metricsColumns: [
                { title: '性能指标', dataIndex: 'metric', key: 'metric' },
                { title: '优化前', dataIndex: 'before', key: 'before' },
                { title: '优化后', dataIndex: 'after', key: 'after' },
                { title: '改善程度', dataIndex: 'improvement', key: 'improvement', scopedSlots: { customRender: 'improvement' } },
                { title: '状态', dataIndex: 'status', key: 'status', scopedSlots: { customRender: 'status' } }
            ],

            optimizationTimeline: [
                {
                    title: '深度缓存优化',
                    description: '实现了Redis多层缓存、布隆过滤器防穿透和缓存预热机制',
                    improvement: '缓存命中率提升85%',
                    date: '2024-01-15',
                    icon: 'database',
                    type: 'completed'
                },
                {
                    title: '数据库性能优化',
                    description: '添加关键索引，解决N+1查询问题，优化复杂查询语句',
                    improvement: '查询速度提升60%',
                    date: '2024-01-16',
                    icon: 'table',
                    type: 'completed'
                },
                {
                    title: '虚拟滚动实现',
                    description: '大列表组件集成VirtualList，支持万级数据渲染',
                    improvement: '渲染性能提升90%',
                    date: '2024-01-17',
                    icon: 'ordered-list',
                    type: 'completed'
                },
                {
                    title: 'Bundle分析优化',
                    description: '代码分割、Tree Shaking、懒加载策略实施',
                    improvement: '包体积减少30%',
                    date: '2024-01-18',
                    icon: 'deployment-unit',
                    type: 'completed'
                }
            ],

            bundleAnalysisData: [
                {
                    key: '1',
                    name: 'chunk-vendors',
                    sizeBefore: 567890,
                    sizeAfter: 456789,
                    change: -19.6
                },
                {
                    key: '2',
                    name: 'chunk-antd',
                    sizeBefore: 289456,
                    sizeAfter: 234567,
                    change: -19.0
                },
                {
                    key: '3',
                    name: 'app',
                    sizeBefore: 189234,
                    sizeAfter: 156789,
                    change: -17.1
                }
            ],

            bundleColumns: [
                { title: 'Chunk名称', dataIndex: 'name', key: 'name' },
                { title: '优化前大小', dataIndex: 'sizeBefore', key: 'sizeBefore', scopedSlots: { customRender: 'size' } },
                { title: '优化后大小', dataIndex: 'sizeAfter', key: 'sizeAfter', scopedSlots: { customRender: 'size' } },
                { title: '变化', dataIndex: 'change', key: 'change', scopedSlots: { customRender: 'change' } }
            ],

            recommendations: [
                {
                    title: '进一步压缩图片资源',
                    description: '建议使用WebP格式图片和图片懒加载，可减少50%的图片传输大小',
                    priority: 'high',
                    icon: 'picture',
                    color: '#f56a00',
                    actions: ['WebP转换', '图片懒加载', '响应式图片']
                },
                {
                    title: '实施Service Worker缓存',
                    description: '添加Service Worker提供离线缓存能力，提升重复访问性能',
                    priority: 'medium',
                    icon: 'cloud',
                    color: '#722ed1',
                    actions: ['SW注册', '缓存策略', '离线页面']
                },
                {
                    title: '优化字体加载策略',
                    description: '使用font-display: swap和字体子集化减少字体阻塞渲染时间',
                    priority: 'low',
                    icon: 'font-size',
                    color: '#13c2c2',
                    actions: ['字体优化', '预加载', 'fallback字体']
                }
            ],

            performanceThresholds: [
                {
                    name: '首屏加载时间',
                    currentValue: '1.1s',
                    targetValue: '1.5s',
                    percentage: 73,
                    status: 'good'
                },
                {
                    name: 'Bundle大小',
                    currentValue: '1248KB',
                    targetValue: '1200KB',
                    percentage: 96,
                    status: 'warning'
                },
                {
                    name: '缓存命中率',
                    currentValue: '94%',
                    targetValue: '90%',
                    percentage: 104,
                    status: 'good'
                }
            ],

            alerts: [
                {
                    level: 'warning',
                    title: 'Bundle大小接近阈值',
                    message: '当前Bundle大小1248KB，接近1200KB阈值',
                    time: '5分钟前'
                },
                {
                    level: 'error',
                    title: '页面加载超时',
                    message: '检测到移动端页面加载时间超过3秒',
                    time: '15分钟前'
                }
            ]
        }
    },

    mounted () {
        this.$nextTick(() => {
            this.initCharts()
        })
    },

    methods: {
        async initCharts () {
            const echarts = await import('echarts/core')
            await this.initPerformanceChart(echarts)
            await this.initBundleSizeChart(echarts)
            await this.initChunkDistributionChart(echarts)
        },

        async initPerformanceChart (echarts) {
            const chart = echarts.init(this.$refs.performanceChart)
            const option = {
                title: {
                    text: '性能指标对比',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'axis'
                },
                legend: {
                    data: ['优化前', '优化后'],
                    top: 30
                },
                radar: {
                    indicator: [
                        { name: '首屏加载', max: 100 },
                        { name: 'Bundle大小', max: 100 },
                        { name: '执行时间', max: 100 },
                        { name: '内存使用', max: 100 },
                        { name: '缓存效率', max: 100 }
                    ]
                },
                series: [{
                    name: '性能对比',
                    type: 'radar',
                    data: [
                        {
                            value: [43, 39, 33, 45, 25],
                            name: '优化前'
                        },
                        {
                            value: [91, 87, 82, 78, 95],
                            name: '优化后'
                        }
                    ]
                }]
            }
            chart.setOption(option)
        },

        async initBundleSizeChart (echarts) {
            const chart = echarts.init(this.$refs.bundleSizeChart)
            const option = {
                title: {
                    text: 'Bundle大小变化',
                    textStyle: { fontSize: 14 }
                },
                tooltip: {
                    trigger: 'axis'
                },
                xAxis: {
                    type: 'category',
                    data: ['初始', '代码分割', 'Tree Shaking', '压缩优化', '最终']
                },
                yAxis: {
                    type: 'value',
                    name: 'KB'
                },
                series: [{
                    data: [1680, 1520, 1380, 1290, 1248],
                    type: 'line',
                    smooth: true,
                    markPoint: {
                        data: [
                            { type: 'max', name: '最大值' },
                            { type: 'min', name: '最小值' }
                        ]
                    }
                }]
            }
            chart.setOption(option)
        },

        async initChunkDistributionChart (echarts) {
            const chart = echarts.init(this.$refs.chunkDistributionChart)
            const option = {
                title: {
                    text: 'Chunk分布',
                    textStyle: { fontSize: 14 }
                },
                tooltip: {
                    trigger: 'item'
                },
                series: [{
                    name: 'Chunk大小',
                    type: 'pie',
                    radius: '70%',
                    data: [
                        { value: 456, name: 'vendors' },
                        { value: 234, name: 'antd' },
                        { value: 189, name: 'echarts' },
                        { value: 157, name: 'app' },
                        { value: 98, name: 'common' }
                    ]
                }]
            }
            chart.setOption(option)
        },

        getImprovementClass (value) {
            return value > 0 ? 'improvement-positive' : 'improvement-negative'
        },

        getStatusColor (status) {
            const colors = {
                '优秀': 'green',
                '良好': 'blue',
                '一般': 'orange',
                '较差': 'red'
            }
            return colors[status] || 'default'
        },

        getPriorityColor (priority) {
            const colors = {
                'high': 'red',
                'medium': 'orange',
                'low': 'blue'
            }
            return colors[priority] || 'default'
        },

        getProgressColor (status) {
            const colors = {
                'good': '#52c41a',
                'warning': '#faad14',
                'error': '#f5222d'
            }
            return colors[status] || '#1890ff'
        },

        formatSize (bytes) {
            return Math.round(bytes / 1024) + 'KB'
        },

        implementRecommendation (item) {
            this.$message.info(`开始实施: ${item.title}`)
            // 实际项目中会触发具体的优化操作
        },

        exportReport () {
            this.$message.info('正在导出性能优化报告...')
            // 生成PDF或Excel报告
        },

        refreshReport () {
            this.$message.info('正在刷新报告数据...')
            // 重新获取最新的性能数据
        },

        scheduleReport () {
            this.$message.info('设置定时报告...')
            // 打开定时报告配置对话框
        }
    }
}
</script>

<style scoped>
.optimization-report {
  padding: 20px;
}

.overview-stats {
  margin-bottom: 24px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.report-tabs {
  min-height: 600px;
}

.performance-comparison {
  display: flex;
  gap: 20px;
}

.chart-section {
  flex: 2;
}

.chart {
  height: 400px;
  width: 100%;
}

.small-chart {
  height: 250px;
  width: 100%;
}

.metrics-table {
  flex: 1;
}

.optimization-timeline {
  padding: 20px;
}

.timeline-content h4 {
  margin: 0 0 8px 0;
  color: #262626;
}

.timeline-content p {
  margin: 0 0 8px 0;
  color: #595959;
}

.timeline-metrics {
  display: flex;
  align-items: center;
  gap: 12px;
}

.timeline-date {
  font-size: 12px;
  color: #8c8c8c;
}

.bundle-analysis {
  padding: 20px;
}

.bundle-details {
  margin-top: 20px;
}

.reduction {
  color: #52c41a;
}

.increase {
  color: #f5222d;
}

.performance-recommendations {
  padding: 20px;
}

.recommendation-actions {
  margin-top: 8px;
}

.monitoring-alerts {
  padding: 20px;
}

.threshold-monitoring {
  padding: 16px;
}

.threshold-item {
  margin-bottom: 20px;
}

.threshold-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.threshold-value {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
}

.alert-time {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
}

.report-actions {
  margin-top: 24px;
  text-align: center;
}

.report-actions .ant-btn {
  margin: 0 8px;
}

.improvement-positive {
  color: #52c41a;
}

.improvement-negative {
  color: #f5222d;
}
</style>
