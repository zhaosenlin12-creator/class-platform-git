<template>
  <div class="bundle-analyzer">
    <a-card title="Bundle分析报告" :bordered="false">
      <div class="analyzer-header">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-statistic title="总Bundle大小" :value="bundleStats.totalSize" suffix="KB" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="Gzip后大小" :value="bundleStats.gzipSize" suffix="KB" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="压缩率" :value="bundleStats.compressionRatio" suffix="%" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="Chunk数量" :value="bundleStats.chunkCount" />
          </a-col>
        </a-row>
      </div>

      <a-tabs default-active-key="1" class="analyzer-tabs">
        <a-tab-pane key="1" tab="Bundle组成分析">
          <div class="bundle-composition">
            <div class="chart-container">
              <div ref="bundleChart" class="chart"></div>
            </div>
            <div class="bundle-table">
              <a-table
                :columns="bundleColumns"
                :data-source="bundleData"
                :pagination="false"
                size="small"
              >
                <template slot="size" slot-scope="text">
                  <span>{{ formatSize(text) }}</span>
                </template>
                <template slot="percentage" slot-scope="text">
                  <a-progress :percent="text" size="small" />
                </template>
              </a-table>
            </div>
          </div>
        </a-tab-pane>

        <a-tab-pane key="2" tab="依赖分析">
          <div class="dependency-analysis">
            <div class="dependency-chart">
              <div ref="dependencyChart" class="chart"></div>
            </div>
            <div class="dependency-recommendations">
              <a-list
                header="优化建议"
                :data-source="recommendations"
                size="small"
              >
                <a-list-item slot="renderItem" slot-scope="item">
                  <a-list-item-meta>
                    <template slot="title">
                      <a-icon :type="item.type" />
                      {{ item.title }}
                    </template>
                    <template slot="description">
                      {{ item.description }}
                    </template>
                  </a-list-item-meta>
                  <div slot="actions">
                    <a-tag :color="item.priority === 'high' ? 'red' : item.priority === 'medium' ? 'orange' : 'blue'">
                      {{ item.priority }}
                    </a-tag>
                  </div>
                </a-list-item>
              </a-list>
            </div>
          </div>
        </a-tab-pane>

        <a-tab-pane key="3" tab="加载性能">
          <div class="loading-performance">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-card title="首屏加载时间" size="small">
                  <div ref="loadTimeChart" class="small-chart"></div>
                </a-card>
              </a-col>
              <a-col :span="12">
                <a-card title="Chunk加载顺序" size="small">
                  <div class="chunk-timeline">
                    <a-timeline>
                      <a-timeline-item
                        v-for="chunk in chunkLoadOrder"
                        :key="chunk.name"
                        :color="chunk.critical ? 'red' : 'blue'"
                      >
                        <p>{{ chunk.name }}</p>
                        <p class="timeline-detail">
                          大小: {{ formatSize(chunk.size) }} |
                          耗时: {{ chunk.loadTime }}ms
                        </p>
                      </a-timeline-item>
                    </a-timeline>
                  </div>
                </a-card>
              </a-col>
            </a-row>
          </div>
        </a-tab-pane>

        <a-tab-pane key="4" tab="优化对比">
          <div class="optimization-comparison">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-card title="优化前后对比" size="small">
                  <div ref="comparisonChart" class="chart"></div>
                </a-card>
              </a-col>
              <a-col :span="12">
                <a-card title="性能指标对比" size="small">
                  <a-table
                    :columns="comparisonColumns"
                    :data-source="comparisonData"
                    :pagination="false"
                    size="small"
                  >
                    <template slot="improvement" slot-scope="text">
                      <span :class="text > 0 ? 'improvement-positive' : 'improvement-negative'">
                        {{ text > 0 ? '+' : '' }}{{ text }}%
                      </span>
                    </template>
                  </a-table>
                </a-card>
              </a-col>
            </a-row>
          </div>
        </a-tab-pane>
      </a-tabs>

      <div class="analyzer-actions">
        <a-button type="primary" @click="generateReport">
          <a-icon type="download" />
          生成详细报告
        </a-button>
        <a-button @click="refreshAnalysis">
          <a-icon type="reload" />
          刷新分析
        </a-button>
        <a-button @click="exportData">
          <a-icon type="export" />
          导出数据
        </a-button>
      </div>
    </a-card>
  </div>
</template>

<script>
export default {
    name: 'BundleAnalyzer',
    data () {
        return {
            bundleStats: {
                totalSize: 1245,
                gzipSize: 423,
                compressionRatio: 66,
                chunkCount: 12
            },
            bundleData: [
                {
                    key: '1',
                    name: 'chunk-vendors',
                    size: 456789,
                    percentage: 36.7,
                    type: 'vendor'
                },
                {
                    key: '2',
                    name: 'chunk-antd',
                    size: 234567,
                    percentage: 18.8,
                    type: 'vendor'
                },
                {
                    key: '3',
                    name: 'chunk-echarts',
                    size: 189234,
                    percentage: 15.2,
                    type: 'vendor'
                },
                {
                    key: '4',
                    name: 'app',
                    size: 156789,
                    percentage: 12.6,
                    type: 'app'
                },
                {
                    key: '5',
                    name: 'chunk-common',
                    size: 98765,
                    percentage: 7.9,
                    type: 'common'
                }
            ],
            bundleColumns: [
                {
                    title: 'Chunk名称',
                    dataIndex: 'name',
                    key: 'name'
                },
                {
                    title: '大小',
                    dataIndex: 'size',
                    key: 'size',
                    scopedSlots: { customRender: 'size' }
                },
                {
                    title: '占比',
                    dataIndex: 'percentage',
                    key: 'percentage',
                    scopedSlots: { customRender: 'percentage' }
                },
                {
                    title: '类型',
                    dataIndex: 'type',
                    key: 'type'
                }
            ],
            recommendations: [
                {
                    type: 'warning',
                    title: 'ECharts库过大',
                    description: '建议使用按需加载，只导入需要的图表类型',
                    priority: 'high'
                },
                {
                    type: 'info',
                    title: 'Moment.js替换',
                    description: '建议使用Day.js替换Moment.js以减少Bundle大小',
                    priority: 'medium'
                },
                {
                    type: 'check-circle',
                    title: 'Tree Shaking正常',
                    description: '未使用的代码已被正确移除',
                    priority: 'low'
                }
            ],
            chunkLoadOrder: [
                {
                    name: 'chunk-vendors',
                    size: 456789,
                    loadTime: 234,
                    critical: true
                },
                {
                    name: 'app',
                    size: 156789,
                    loadTime: 98,
                    critical: true
                },
                {
                    name: 'chunk-antd',
                    size: 234567,
                    loadTime: 145,
                    critical: false
                }
            ],
            comparisonData: [
                {
                    key: '1',
                    metric: '首屏加载时间',
                    before: '2.3s',
                    after: '1.6s',
                    improvement: 30.4
                },
                {
                    key: '2',
                    metric: 'Bundle总大小',
                    before: '1680KB',
                    after: '1245KB',
                    improvement: 25.9
                },
                {
                    key: '3',
                    metric: 'Gzip后大小',
                    before: '587KB',
                    after: '423KB',
                    improvement: 27.9
                }
            ],
            comparisonColumns: [
                {
                    title: '指标',
                    dataIndex: 'metric',
                    key: 'metric'
                },
                {
                    title: '优化前',
                    dataIndex: 'before',
                    key: 'before'
                },
                {
                    title: '优化后',
                    dataIndex: 'after',
                    key: 'after'
                },
                {
                    title: '改进',
                    dataIndex: 'improvement',
                    key: 'improvement',
                    scopedSlots: { customRender: 'improvement' }
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
            await this.initBundleChart(echarts)
            await this.initDependencyChart(echarts)
            await this.initLoadTimeChart(echarts)
            await this.initComparisonChart(echarts)
        },

        async initBundleChart (echarts) {
            const chart = echarts.init(this.$refs.bundleChart)
            const option = {
                title: {
                    text: 'Bundle组成',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'item',
                    formatter: '{a} <br/>{b}: {c}KB ({d}%)'
                },
                series: [
                    {
                        name: 'Bundle',
                        type: 'pie',
                        radius: ['40%', '70%'],
                        data: this.bundleData.map(item => ({
                            value: Math.round(item.size / 1024),
                            name: item.name
                        }))
                    }
                ]
            }
            chart.setOption(option)
        },

        async initDependencyChart (echarts) {
            const chart = echarts.init(this.$refs.dependencyChart)
            const option = {
                title: {
                    text: '依赖关系图',
                    left: 'center'
                },
                tooltip: {},
                series: [
                    {
                        type: 'graph',
                        layout: 'force',
                        data: [
                            { name: 'app', value: 100, category: 0 },
                            { name: 'vue', value: 80, category: 1 },
                            { name: 'ant-design-vue', value: 60, category: 1 },
                            { name: 'echarts', value: 50, category: 1 },
                            { name: 'axios', value: 30, category: 1 }
                        ],
                        links: [
                            { source: 'app', target: 'vue' },
                            { source: 'app', target: 'ant-design-vue' },
                            { source: 'app', target: 'echarts' },
                            { source: 'app', target: 'axios' }
                        ],
                        categories: [
                            { name: '应用代码' },
                            { name: '第三方库' }
                        ],
                        force: {
                            repulsion: 100
                        }
                    }
                ]
            }
            chart.setOption(option)
        },

        async initLoadTimeChart (echarts) {
            const chart = echarts.init(this.$refs.loadTimeChart)
            const option = {
                title: {
                    text: '加载时间',
                    textStyle: {
                        fontSize: 14
                    }
                },
                tooltip: {
                    trigger: 'axis'
                },
                xAxis: {
                    type: 'category',
                    data: ['0ms', '100ms', '200ms', '300ms', '400ms']
                },
                yAxis: {
                    type: 'value'
                },
                series: [
                    {
                        data: [0, 45, 78, 85, 100],
                        type: 'line',
                        smooth: true
                    }
                ]
            }
            chart.setOption(option)
        },

        async initComparisonChart (echarts) {
            const chart = echarts.init(this.$refs.comparisonChart)
            const option = {
                title: {
                    text: '优化效果对比',
                    textStyle: {
                        fontSize: 14
                    }
                },
                tooltip: {
                    trigger: 'axis'
                },
                legend: {
                    data: ['优化前', '优化后']
                },
                xAxis: {
                    type: 'category',
                    data: ['Bundle大小', '加载时间', 'FCP', 'LCP']
                },
                yAxis: {
                    type: 'value'
                },
                series: [
                    {
                        name: '优化前',
                        type: 'bar',
                        data: [1680, 2300, 1800, 3200]
                    },
                    {
                        name: '优化后',
                        type: 'bar',
                        data: [1245, 1600, 1200, 2100]
                    }
                ]
            }
            chart.setOption(option)
        },

        formatSize (bytes) {
            return Math.round(bytes / 1024) + 'KB'
        },

        generateReport () {
            this.$message.info('正在生成详细报告...')
            // 实际项目中会调用API生成报告
        },

        refreshAnalysis () {
            this.$message.info('正在刷新分析数据...')
            // 重新获取Bundle分析数据
        },

        exportData () {
            const data = {
                bundleStats: this.bundleStats,
                bundleData: this.bundleData,
                recommendations: this.recommendations
            }
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'bundle-analysis.json'
            a.click()
            URL.revokeObjectURL(url)
        }
    }
}
</script>

<style scoped>
.bundle-analyzer {
  padding: 20px;
}

.analyzer-header {
  margin-bottom: 24px;
}

.analyzer-tabs {
  min-height: 500px;
}

.bundle-composition {
  display: flex;
  gap: 20px;
}

.chart-container {
  flex: 1;
}

.chart {
  height: 400px;
  width: 100%;
}

.small-chart {
  height: 250px;
  width: 100%;
}

.bundle-table {
  flex: 1;
}

.dependency-analysis {
  display: flex;
  gap: 20px;
}

.dependency-chart {
  flex: 2;
}

.dependency-recommendations {
  flex: 1;
}

.chunk-timeline {
  max-height: 300px;
  overflow-y: auto;
}

.timeline-detail {
  font-size: 12px;
  color: #666;
  margin: 0;
}

.analyzer-actions {
  margin-top: 24px;
  text-align: center;
}

.analyzer-actions .ant-btn {
  margin: 0 8px;
}

.improvement-positive {
  color: #52c41a;
}

.improvement-negative {
  color: #f5222d;
}
</style>
