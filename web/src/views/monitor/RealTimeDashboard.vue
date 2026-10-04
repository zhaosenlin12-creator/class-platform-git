<template>
  <div class="real-time-dashboard">
    <!-- 页面标题 -->
    <div class="dashboard-header">
      <h1>实时监控大屏</h1>
      <div class="header-info">
        <span class="current-time">{{ currentTime }}</span>
        <a-button
          type="primary"
          :loading="refreshing"
          @click="refreshAll"
          icon="reload"
        >
          刷新数据
        </a-button>
      </div>
    </div>

    <!-- 关键指标卡片 -->
    <a-row :gutter="16" class="metrics-cards">
      <a-col :span="6">
        <div class="metric-card cpu">
          <div class="metric-icon">
            <a-icon type="dashboard" />
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ (systemMetrics.cpuUsage && systemMetrics.cpuUsage.toFixed(1)) || 0 }}%</div>
            <div class="metric-label">CPU使用率</div>
            <div class="metric-trend" :class="getCpuTrendClass()">
              <a-icon :type="getCpuTrendIcon()" />
              {{ getCpuTrendText() }}
            </div>
          </div>
        </div>
      </a-col>

      <a-col :span="6">
        <div class="metric-card memory">
          <div class="metric-icon">
            <a-icon type="pie-chart" />
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ (systemMetrics.memoryUsage && systemMetrics.memoryUsage.toFixed(1)) || 0 }}%</div>
            <div class="metric-label">内存使用率</div>
            <div class="metric-detail">
              {{ formatBytes(systemMetrics.memoryUsed) }} / {{ formatBytes(systemMetrics.memoryTotal) }}
            </div>
          </div>
        </div>
      </a-col>

      <a-col :span="6">
        <div class="metric-card disk">
          <div class="metric-icon">
            <a-icon type="hdd" />
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ (systemMetrics.diskUsage && systemMetrics.diskUsage.toFixed(1)) || 0 }}%</div>
            <div class="metric-label">磁盘使用率</div>
            <div class="metric-detail">
              {{ systemMetrics.diskUsed }}GB / {{ systemMetrics.diskTotal }}GB
            </div>
          </div>
        </div>
      </a-col>

      <a-col :span="6">
        <div class="metric-card network">
          <div class="metric-icon">
            <a-icon type="wifi" />
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ onlineUsers.totalOnlineUsers || 0 }}</div>
            <div class="metric-label">在线用户</div>
            <div class="metric-detail">
              活跃: {{ onlineUsers.activeUsers || 0 }} | 空闲: {{ onlineUsers.idleUsers || 0 }}
            </div>
          </div>
        </div>
      </a-col>
    </a-row>

    <!-- 图表区域 -->
    <a-row :gutter="16" class="charts-section">
      <!-- 系统性能趋势图 -->
      <a-col :span="12">
        <a-card title="系统性能趋势" class="chart-card">
          <div ref="systemTrendChart" class="chart-container"></div>
        </a-card>
      </a-col>

      <!-- 应用性能统计 -->
      <a-col :span="12">
        <a-card title="应用性能统计" class="chart-card">
          <div class="performance-stats">
            <div class="stat-item">
              <span class="stat-label">总请求数</span>
              <span class="stat-value">{{ performanceStats.totalRequests || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">成功率</span>
              <span class="stat-value success">
                {{ ((performanceStats.successRequests / performanceStats.totalRequests) * 100).toFixed(2) || 0 }}%
              </span>
            </div>
            <div class="stat-item">
              <span class="stat-label">平均响应时间</span>
              <span class="stat-value">{{ (performanceStats.averageResponseTime && performanceStats.averageResponseTime.toFixed(0)) || 0 }}ms</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">QPS</span>
              <span class="stat-value">{{ (performanceStats.qps && performanceStats.qps.toFixed(1)) || 0 }}</span>
            </div>
          </div>
          <div ref="performanceChart" class="chart-container"></div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 第二行图表 -->
    <a-row :gutter="16" class="charts-section">
      <!-- JVM监控 -->
      <a-col :span="8">
        <a-card title="JVM监控" class="chart-card">
          <div class="jvm-metrics">
            <div class="jvm-item">
              <span class="jvm-label">堆内存</span>
              <a-progress
                :percent="getJvmHeapUsagePercent()"
                :status="getJvmHeapStatus()"
              />
              <span class="jvm-detail">
                {{ formatBytes(jvmMetrics.heapMemory && jvmMetrics.heapMemory.used) }} /
                {{ formatBytes(jvmMetrics.heapMemory && jvmMetrics.heapMemory.max) }}
              </span>
            </div>
            <div class="jvm-item">
              <span class="jvm-label">非堆内存</span>
              <a-progress
                :percent="getJvmNonHeapUsagePercent()"
                :status="getJvmNonHeapStatus()"
              />
            </div>
            <div class="jvm-item">
              <span class="jvm-label">线程数</span>
              <span class="jvm-value">{{ (jvmMetrics.threads && jvmMetrics.threads.threadCount) || 0 }}</span>
            </div>
            <div class="jvm-item">
              <span class="jvm-label">GC次数</span>
              <span class="jvm-value">{{ getTotalGcCount() }}</span>
            </div>
          </div>
        </a-card>
      </a-col>

      <!-- 数据库状态 -->
      <a-col :span="8">
        <a-card title="数据库状态" class="chart-card">
          <div class="database-status">
            <div class="status-header">
              <a-badge
                :status="dbStatus.status === 'healthy' ? 'success' : 'error'"
                :text="dbStatus.status === 'healthy' ? '连接正常' : '连接异常'"
              />
              <span class="response-time">响应时间: {{ dbStatus.responseTime || 0 }}ms</span>
            </div>
            <div class="db-metrics">
              <div class="db-item">
                <span class="db-label">活跃连接</span>
                <span class="db-value">{{ dbStatus.activeConnections || 0 }}</span>
              </div>
              <div class="db-item">
                <span class="db-label">最大连接</span>
                <span class="db-value">{{ dbStatus.maxConnections || 0 }}</span>
              </div>
              <div class="db-item">
                <span class="db-label">慢查询</span>
                <span class="db-value warning">{{ dbStatus.slowQueries || 0 }}</span>
              </div>
              <div class="db-item">
                <span class="db-label">缓存命中率</span>
                <span class="db-value">{{ (dbStatus.queryCacheHitRate && dbStatus.queryCacheHitRate.toFixed(1)) || 0 }}%</span>
              </div>
            </div>
          </div>
        </a-card>
      </a-col>

      <!-- Redis状态 -->
      <a-col :span="8">
        <a-card title="Redis状态" class="chart-card">
          <div class="redis-status">
            <div class="status-header">
              <a-badge
                :status="redisStatus.status === 'healthy' ? 'success' : 'error'"
                :text="redisStatus.status === 'healthy' ? '连接正常' : '连接异常'"
              />
              <span class="response-time">响应时间: {{ redisStatus.responseTime || 0 }}ms</span>
            </div>
            <div class="redis-metrics">
              <div class="redis-item">
                <span class="redis-label">版本</span>
                <span class="redis-value">{{ redisStatus.version || 'Unknown' }}</span>
              </div>
              <div class="redis-item">
                <span class="redis-label">连接数</span>
                <span class="redis-value">{{ redisStatus.connectedClients || 0 }}</span>
              </div>
              <div class="redis-item">
                <span class="redis-label">内存使用</span>
                <span class="redis-value">{{ redisStatus.usedMemory || '0B' }}</span>
              </div>
              <div class="redis-item">
                <span class="redis-label">内存使用率</span>
                <span class="redis-value">{{ (redisStatus.memoryUsage && redisStatus.memoryUsage.toFixed(1)) || 0 }}%</span>
              </div>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 日志和告警区域 -->
    <a-row :gutter="16" class="logs-section">
      <a-col :span="12">
        <a-card title="最近错误日志" class="chart-card">
          <div class="error-logs">
            <div class="error-summary">
              <div class="error-count critical">严重: {{ errorLogs.criticalErrors || 0 }}</div>
              <div class="error-count warning">警告: {{ errorLogs.warningErrors || 0 }}</div>
              <div class="error-count info">信息: {{ errorLogs.infoErrors || 0 }}</div>
            </div>
            <div class="error-chart">
              <div ref="errorChart" class="chart-container"></div>
            </div>
          </div>
        </a-card>
      </a-col>

      <a-col :span="12">
        <a-card title="系统健康检查" class="chart-card">
          <div class="health-checks">
            <div
              v-for="check in healthChecks"
              :key="check.name"
              class="health-item"
              :class="check.status"
            >
              <div class="health-icon">
                <a-icon
                  :type="getHealthIcon(check.status)"
                  :class="check.status"
                />
              </div>
              <div class="health-content">
                <div class="health-name">{{ check.name }}</div>
                <div class="health-message">{{ check.message }}</div>
                <div v-if="check.responseTime" class="health-time">
                  响应时间: {{ check.responseTime }}ms
                </div>
              </div>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import * as echarts from 'echarts'

export default {
    name: 'RealTimeDashboard',
    data () {
        return {
            currentTime: '',
            refreshing: false,

            // 监控数据
            systemMetrics: {},
            jvmMetrics: {},
            performanceStats: {},
            dbStatus: {},
            redisStatus: {},
            onlineUsers: {},
            errorLogs: {},
            healthChecks: [],

            // 图表实例
            systemTrendChart: null,
            performanceChart: null,
            errorChart: null,

            // 历史数据用于趋势分析
            cpuHistory: [],
            memoryHistory: [],
            diskHistory: [],

            // 定时器
            refreshTimer: null,
            timeTimer: null
        }
    },

    mounted () {
        this.initDashboard()
    },

    beforeDestroy () {
        this.cleanup()
    },

    methods: {
        async initDashboard () {
            // 初始化时间显示
            this.updateCurrentTime()
            this.timeTimer = setInterval(this.updateCurrentTime, 1000)

            // 初始化图表
            this.$nextTick(() => {
                this.initCharts()
            })

            // 加载初始数据
            await this.loadAllData()

            // 设置定时刷新
            this.refreshTimer = setInterval(this.loadAllData, 30000) // 30秒刷新一次
        },

        initCharts () {
            // 初始化系统趋势图
            this.systemTrendChart = echarts.init(this.$refs.systemTrendChart)
            this.updateSystemTrendChart()

            // 初始化性能图表
            this.performanceChart = echarts.init(this.$refs.performanceChart)
            this.updatePerformanceChart()

            // 初始化错误日志图表
            this.errorChart = echarts.init(this.$refs.errorChart)
            this.updateErrorChart()

            // 响应式调整
            window.addEventListener('resize', this.resizeCharts)
        },

        async loadAllData () {
            try {
                this.refreshing = true

                // 并行加载所有监控数据
                const [
                    systemMetrics,
                    jvmMetrics,
                    performanceStats,
                    dbStatus,
                    redisStatus,
                    onlineUsers,
                    errorLogs,
                    healthStatus
                ] = await Promise.all([
                    this.loadSystemMetrics(),
                    this.loadJvmMetrics(),
                    this.loadPerformanceStats(),
                    this.loadDatabaseStatus(),
                    this.loadRedisStatus(),
                    this.loadOnlineUsers(),
                    this.loadErrorLogs(),
                    this.loadHealthStatus()
                ])

                // 更新数据
                this.systemMetrics = systemMetrics
                this.jvmMetrics = jvmMetrics
                this.performanceStats = performanceStats
                this.dbStatus = dbStatus
                this.redisStatus = redisStatus
                this.onlineUsers = onlineUsers
                this.errorLogs = errorLogs
                this.healthChecks = healthStatus.checks || []

                // 更新历史数据
                this.updateHistoryData()

                // 更新图表
                this.updateAllCharts()
            } catch (error) {
                console.error('加载监控数据失败:', error)
                this.$message.error('加载监控数据失败')
            } finally {
                this.refreshing = false
            }
        },

        async loadSystemMetrics () {
            const response = await this.$http.get('/api/monitor/system/metrics')
            return response.data.result || {}
        },

        async loadJvmMetrics () {
            const response = await this.$http.get('/api/monitor/jvm/metrics')
            return response.data.result || {}
        },

        async loadPerformanceStats () {
            const response = await this.$http.get('/api/monitor/performance/stats?hours=1')
            return response.data.result || {}
        },

        async loadDatabaseStatus () {
            const response = await this.$http.get('/api/monitor/database/pool')
            return response.data.result || {}
        },

        async loadRedisStatus () {
            const response = await this.$http.get('/api/monitor/redis/status')
            return response.data.result || {}
        },

        async loadOnlineUsers () {
            const response = await this.$http.get('/api/monitor/users/online')
            return response.data.result || {}
        },

        async loadErrorLogs () {
            const response = await this.$http.get('/api/monitor/logs/errors?hours=24&limit=10')
            return response.data.result || {}
        },

        async loadHealthStatus () {
            const response = await this.$http.get('/api/monitor/health')
            return response.data.result || {}
        },

        updateHistoryData () {
            const now = Date.now()

            // 更新CPU历史数据
            this.cpuHistory.push({
                time: now,
                value: this.systemMetrics.cpuUsage || 0
            })

            // 更新内存历史数据
            this.memoryHistory.push({
                time: now,
                value: this.systemMetrics.memoryUsage || 0
            })

            // 更新磁盘历史数据
            this.diskHistory.push({
                time: now,
                value: this.systemMetrics.diskUsage || 0
            })

            // 保持最近30个数据点
            const maxPoints = 30
            if (this.cpuHistory.length > maxPoints) {
                this.cpuHistory = this.cpuHistory.slice(-maxPoints)
            }
            if (this.memoryHistory.length > maxPoints) {
                this.memoryHistory = this.memoryHistory.slice(-maxPoints)
            }
            if (this.diskHistory.length > maxPoints) {
                this.diskHistory = this.diskHistory.slice(-maxPoints)
            }
        },

        updateAllCharts () {
            this.updateSystemTrendChart()
            this.updatePerformanceChart()
            this.updateErrorChart()
        },

        updateSystemTrendChart () {
            if (!this.systemTrendChart) return

            const option = {
                title: {
                    text: '系统资源使用趋势',
                    textStyle: { fontSize: 14 }
                },
                tooltip: {
                    trigger: 'axis',
                    formatter: (params) => {
                        let result = `${new Date(params[0].axisValue).toLocaleTimeString()}<br/>`
                        params.forEach(param => {
                            result += `${param.seriesName}: ${param.value.toFixed(1)}%<br/>`
                        })
                        return result
                    }
                },
                legend: {
                    data: ['CPU', '内存', '磁盘']
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'time',
                    boundaryGap: false,
                    axisLabel: {
                        formatter: (value) => new Date(value).toLocaleTimeString()
                    }
                },
                yAxis: {
                    type: 'value',
                    max: 100,
                    axisLabel: {
                        formatter: '{value}%'
                    }
                },
                series: [
                    {
                        name: 'CPU',
                        type: 'line',
                        smooth: true,
                        data: this.cpuHistory.map(item => [item.time, item.value]),
                        itemStyle: { color: '#ff7875' }
                    },
                    {
                        name: '内存',
                        type: 'line',
                        smooth: true,
                        data: this.memoryHistory.map(item => [item.time, item.value]),
                        itemStyle: { color: '#40a9ff' }
                    },
                    {
                        name: '磁盘',
                        type: 'line',
                        smooth: true,
                        data: this.diskHistory.map(item => [item.time, item.value]),
                        itemStyle: { color: '#73d13d' }
                    }
                ]
            }

            this.systemTrendChart.setOption(option)
        },

        updatePerformanceChart () {
            if (!this.performanceChart || !this.performanceStats.timeSlotStats) return

            const timeSlotStats = this.performanceStats.timeSlotStats
            const times = timeSlotStats.map(stat => new Date(stat.timestamp))
            const qpsData = timeSlotStats.map(stat => stat.qps || 0)
            const responseTimeData = timeSlotStats.map(stat => stat.avgResponseTime || 0)

            const option = {
                title: {
                    text: '应用性能趋势',
                    textStyle: { fontSize: 14 }
                },
                tooltip: {
                    trigger: 'axis'
                },
                legend: {
                    data: ['QPS', '平均响应时间(ms)']
                },
                grid: {
                    left: '3%',
                    right: '4%',
                    bottom: '3%',
                    containLabel: true
                },
                xAxis: {
                    type: 'time',
                    data: times
                },
                yAxis: [
                    {
                        type: 'value',
                        name: 'QPS',
                        position: 'left'
                    },
                    {
                        type: 'value',
                        name: '响应时间(ms)',
                        position: 'right'
                    }
                ],
                series: [
                    {
                        name: 'QPS',
                        type: 'line',
                        data: qpsData,
                        itemStyle: { color: '#1890ff' }
                    },
                    {
                        name: '平均响应时间(ms)',
                        type: 'line',
                        yAxisIndex: 1,
                        data: responseTimeData,
                        itemStyle: { color: '#f5222d' }
                    }
                ]
            }

            this.performanceChart.setOption(option)
        },

        updateErrorChart () {
            if (!this.errorChart || !this.errorLogs.errorTypes) return

            const errorTypes = Object.entries(this.errorLogs.errorTypes)

            const option = {
                title: {
                    text: '错误类型分布',
                    textStyle: { fontSize: 14 }
                },
                tooltip: {
                    trigger: 'item',
                    formatter: '{a} <br/>{b}: {c} ({d}%)'
                },
                series: [
                    {
                        name: '错误类型',
                        type: 'pie',
                        radius: ['40%', '70%'],
                        data: errorTypes.map(([name, value]) => ({
                            name,
                            value
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

            this.errorChart.setOption(option)
        },

        resizeCharts () {
            if (this.systemTrendChart) this.systemTrendChart.resize()
            if (this.performanceChart) this.performanceChart.resize()
            if (this.errorChart) this.errorChart.resize()
        },

        updateCurrentTime () {
            this.currentTime = new Date().toLocaleString()
        },

        async refreshAll () {
            await this.loadAllData()
            this.$message.success('数据刷新成功')
        },

        // 工具方法
        formatBytes (bytes) {
            if (!bytes) return '0 B'
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
            const i = Math.floor(Math.log(bytes) / Math.log(1024))
            return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
        },

        getCpuTrendClass () {
            const usage = this.systemMetrics.cpuUsage || 0
            if (usage > 80) return 'trend-high'
            if (usage > 60) return 'trend-medium'
            return 'trend-low'
        },

        getCpuTrendIcon () {
            const usage = this.systemMetrics.cpuUsage || 0
            if (usage > 80) return 'arrow-up'
            if (usage > 60) return 'minus'
            return 'arrow-down'
        },

        getCpuTrendText () {
            const usage = this.systemMetrics.cpuUsage || 0
            if (usage > 80) return '偏高'
            if (usage > 60) return '正常'
            return '良好'
        },

        getJvmHeapUsagePercent () {
            const heap = this.jvmMetrics.heapMemory
            if (!heap) return 0
            return (heap.used / heap.max * 100).toFixed(1)
        },

        getJvmHeapStatus () {
            const percent = this.getJvmHeapUsagePercent()
            if (percent > 90) return 'exception'
            if (percent > 80) return 'active'
            return 'success'
        },

        getJvmNonHeapUsagePercent () {
            const nonHeap = this.jvmMetrics.nonHeapMemory
            if (!nonHeap || nonHeap.max === -1) return 0
            return (nonHeap.used / nonHeap.max * 100).toFixed(1)
        },

        getJvmNonHeapStatus () {
            const percent = this.getJvmNonHeapUsagePercent()
            if (percent > 90) return 'exception'
            if (percent > 80) return 'active'
            return 'success'
        },

        getTotalGcCount () {
            if (!this.jvmMetrics.garbageCollectors) return 0
            return this.jvmMetrics.garbageCollectors.reduce((total, gc) => {
                return total + (gc.collectionCount || 0)
            }, 0)
        },

        getHealthIcon (status) {
            switch (status) {
            case 'healthy': return 'check-circle'
            case 'warning': return 'exclamation-circle'
            case 'critical': return 'close-circle'
            case 'error': return 'close-circle'
            default: return 'question-circle'
            }
        },

        cleanup () {
            if (this.refreshTimer) {
                clearInterval(this.refreshTimer)
            }
            if (this.timeTimer) {
                clearInterval(this.timeTimer)
            }
            if (this.systemTrendChart) {
                this.systemTrendChart.dispose()
            }
            if (this.performanceChart) {
                this.performanceChart.dispose()
            }
            if (this.errorChart) {
                this.errorChart.dispose()
            }
            window.removeEventListener('resize', this.resizeCharts)
        }
    }
}
</script>

<style lang="less" scoped>
.real-time-dashboard {
  padding: 16px;
  background: #f0f2f5;
  min-height: 100vh;

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding: 16px 24px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    h1 {
      margin: 0;
      color: #1890ff;
      font-size: 24px;
    }

    .header-info {
      display: flex;
      align-items: center;
      gap: 16px;

      .current-time {
        color: #666;
        font-weight: 500;
      }
    }
  }

  .metrics-cards {
    margin-bottom: 24px;

    .metric-card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      height: 120px;
      display: flex;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      position: relative;
      overflow: hidden;

      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
      }

      &.cpu::before { background: #ff7875; }
      &.memory::before { background: #40a9ff; }
      &.disk::before { background: #73d13d; }
      &.network::before { background: #b37feb; }

      .metric-icon {
        font-size: 40px;
        margin-right: 16px;
        opacity: 0.8;

        .cpu & { color: #ff7875; }
        .memory & { color: #40a9ff; }
        .disk & { color: #73d13d; }
        .network & { color: #b37feb; }
      }

      .metric-content {
        flex: 1;

        .metric-value {
          font-size: 32px;
          font-weight: bold;
          line-height: 1;
          margin-bottom: 4px;
        }

        .metric-label {
          color: #666;
          font-size: 14px;
          margin-bottom: 8px;
        }

        .metric-trend {
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;

          &.trend-high { color: #f5222d; }
          &.trend-medium { color: #fa8c16; }
          &.trend-low { color: #52c41a; }
        }

        .metric-detail {
          color: #999;
          font-size: 12px;
        }
      }
    }
  }

  .charts-section {
    margin-bottom: 24px;

    .chart-card {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      .chart-container {
        height: 300px;
      }
    }

    .performance-stats {
      display: flex;
      justify-content: space-around;
      margin-bottom: 16px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 6px;

      .stat-item {
        text-align: center;

        .stat-label {
          display: block;
          color: #666;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .stat-value {
          font-size: 18px;
          font-weight: bold;

          &.success { color: #52c41a; }
        }
      }
    }

    .jvm-metrics {
      .jvm-item {
        margin-bottom: 16px;

        .jvm-label {
          display: block;
          margin-bottom: 8px;
          color: #666;
          font-size: 14px;
        }

        .jvm-value {
          font-size: 16px;
          font-weight: bold;
          color: #1890ff;
        }

        .jvm-detail {
          font-size: 12px;
          color: #999;
          margin-top: 4px;
        }
      }
    }

    .database-status,
    .redis-status {
      .status-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid #f0f0f0;

        .response-time {
          font-size: 12px;
          color: #666;
        }
      }

      .db-metrics,
      .redis-metrics {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;

        .db-item,
        .redis-item {
          display: flex;
          justify-content: space-between;

          .db-label,
          .redis-label {
            color: #666;
            font-size: 14px;
          }

          .db-value,
          .redis-value {
            font-weight: bold;

            &.warning { color: #fa8c16; }
          }
        }
      }
    }
  }

  .logs-section {
    .error-logs {
      .error-summary {
        display: flex;
        justify-content: space-around;
        margin-bottom: 16px;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 6px;

        .error-count {
          text-align: center;
          font-weight: bold;

          &.critical { color: #f5222d; }
          &.warning { color: #fa8c16; }
          &.info { color: #1890ff; }
        }
      }

      .error-chart {
        .chart-container {
          height: 200px;
        }
      }
    }

    .health-checks {
      .health-item {
        display: flex;
        align-items: center;
        padding: 12px;
        margin-bottom: 8px;
        border-radius: 6px;
        border-left: 4px solid;

        &.healthy {
          background: #f6ffed;
          border-color: #52c41a;
        }

        &.warning {
          background: #fff7e6;
          border-color: #fa8c16;
        }

        &.critical,
        &.error {
          background: #fff2f0;
          border-color: #f5222d;
        }

        .health-icon {
          font-size: 20px;
          margin-right: 12px;

          .anticon {
            &.healthy { color: #52c41a; }
            &.warning { color: #fa8c16; }
            &.critical,
            &.error { color: #f5222d; }
          }
        }

        .health-content {
          flex: 1;

          .health-name {
            font-weight: bold;
            margin-bottom: 4px;
          }

          .health-message {
            font-size: 14px;
            color: #666;
          }

          .health-time {
            font-size: 12px;
            color: #999;
            margin-top: 4px;
          }
        }
      }
    }
  }
}

@media (max-width: 1200px) {
  .real-time-dashboard {
    .metrics-cards {
      .ant-col {
        margin-bottom: 16px;
      }
    }

    .charts-section {
      .ant-col {
        margin-bottom: 16px;
      }
    }
  }
}
</style>
