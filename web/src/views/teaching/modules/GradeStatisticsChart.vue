<template>
  <div class="grade-statistics-chart">
    <a-card title="成绩统计分析" :bordered="false">
      <a-row :gutter="16">
        <a-col :span="12">
          <div id="gradeDistributionChart" style="height: 300px;"></div>
        </a-col>
        <a-col :span="12">
          <div id="gradeTrendChart" style="height: 300px;"></div>
        </a-col>
      </a-row>

      <a-divider />

      <a-row :gutter="16">
        <a-col :span="8">
          <a-statistic title="平均分" :value="statistics.averageScore" :precision="2" />
        </a-col>
        <a-col :span="8">
          <a-statistic title="及格率" :value="statistics.passRate" suffix="%" />
        </a-col>
        <a-col :span="8">
          <a-statistic title="优秀率" :value="statistics.excellentRate" suffix="%" />
        </a-col>
      </a-row>
    </a-card>
  </div>
</template>

<script>
export default {
    name: 'GradeStatisticsChart',
    props: {
        submissions: {
            type: Array,
            default: function () {
                return []
            }
        }
    },
    data () {
        return {
            statistics: {
                averageScore: 0,
                passRate: 0,
                excellentRate: 0
            }
        }
    },
    watch: {
        submissions: {
            handler: function () {
                this.updateStatistics()
                this.$nextTick(function () {
                    this.initCharts()
                })
            },
            immediate: true
        }
    },
    methods: {
        updateStatistics: function () {
            if (!this.submissions.length) {
                return
            }

            var scores = this.submissions
                .filter(function (s) { return s.finalScore !== null && s.finalScore !== undefined })
                .map(function (s) { return s.finalScore })

            if (scores.length === 0) {
                return
            }

            var total = scores.reduce(function (sum, score) { return sum + score }, 0)
            var average = total / scores.length

            var passCount = scores.filter(function (score) { return score >= 60 }).length
            var excellentCount = scores.filter(function (score) { return score >= 90 }).length

            this.statistics = {
                averageScore: average,
                passRate: Math.round((passCount / scores.length) * 100),
                excellentRate: Math.round((excellentCount / scores.length) * 100)
            }
        },

        initCharts: function () {
            this.initGradeDistributionChart()
            this.initGradeTrendChart()
        },

        initGradeDistributionChart: function () {
            var container = document.getElementById('gradeDistributionChart')
            if (!container || !window.echarts) {
                return
            }

            var chart = window.echarts.init(container)

            var scores = this.submissions
                .filter(function (s) { return s.finalScore !== null && s.finalScore !== undefined })
                .map(function (s) { return s.finalScore })

            var ranges = ['0-59', '60-69', '70-79', '80-89', '90-100']
            var data = [
                scores.filter(function (s) { return s < 60 }).length,
                scores.filter(function (s) { return s >= 60 && s < 70 }).length,
                scores.filter(function (s) { return s >= 70 && s < 80 }).length,
                scores.filter(function (s) { return s >= 80 && s < 90 }).length,
                scores.filter(function (s) { return s >= 90 }).length
            ]

            var option = {
                title: {
                    text: '成绩分布',
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
                    data: ranges
                },
                yAxis: {
                    type: 'value'
                },
                series: [{
                    name: '人数',
                    type: 'bar',
                    data: data,
                    itemStyle: {
                        color: '#1890ff'
                    }
                }]
            }

            chart.setOption(option)
        },

        initGradeTrendChart: function () {
            var container = document.getElementById('gradeTrendChart')
            if (!container || !window.echarts) {
                return
            }

            var chart = window.echarts.init(container)

            var option = {
                title: {
                    text: '评分趋势',
                    left: 'center'
                },
                tooltip: {
                    trigger: 'axis'
                },
                xAxis: {
                    type: 'category',
                    data: ['自动评分', '手动评分', '最终成绩']
                },
                yAxis: {
                    type: 'value',
                    max: 100
                },
                series: [{
                    name: '平均分',
                    type: 'line',
                    data: [
                        this.getAverageAutoScore(),
                        this.getAverageManualScore(),
                        this.statistics.averageScore
                    ],
                    itemStyle: {
                        color: '#52c41a'
                    }
                }]
            }

            chart.setOption(option)
        },

        getAverageAutoScore: function () {
            var scores = this.submissions
                .filter(function (s) { return s.autoScore !== null && s.autoScore !== undefined })
                .map(function (s) { return s.autoScore })

            if (scores.length === 0) return 0

            var total = scores.reduce(function (sum, score) { return sum + score }, 0)
            return Math.round((total / scores.length) * 100) / 100
        },

        getAverageManualScore: function () {
            var scores = this.submissions
                .filter(function (s) { return s.manualScore !== null && s.manualScore !== undefined })
                .map(function (s) { return s.manualScore })

            if (scores.length === 0) return 0

            var total = scores.reduce(function (sum, score) { return sum + score }, 0)
            return Math.round((total / scores.length) * 100) / 100
        }
    }
}
</script>

<style scoped>
.grade-statistics-chart {
  margin-top: 16px;
}
</style>
