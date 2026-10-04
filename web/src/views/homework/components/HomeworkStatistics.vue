<template>
  <div class="homework-statistics">
    <!-- 统计概览 -->
    <div class="stats-overview">
      <a-row :gutter="16">
        <a-col :span="6">
          <a-card size="small" class="stat-card">
            <a-statistic
              title="提交率"
              :value="submissionRate"
              suffix="%"
              :value-style="{ color: submissionRate >= 80 ? '#3f8600' : '#cf1322' }"
            >
              <template #prefix>
                <a-icon type="upload" />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card size="small" class="stat-card">
            <a-statistic
              title="平均分"
              :value="averageScore"
              suffix="分"
              :precision="1"
              :value-style="{ color: '#1890ff' }"
            >
              <template #prefix>
                <a-icon type="bar-chart" />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card size="small" class="stat-card">
            <a-statistic
              title="及格率"
              :value="passRate"
              suffix="%"
              :value-style="{ color: passRate >= 70 ? '#3f8600' : '#cf1322' }"
            >
              <template #prefix>
                <a-icon type="check-circle" />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
        <a-col :span="6">
          <a-card size="small" class="stat-card">
            <a-statistic
              title="优秀率"
              :value="excellentRate"
              suffix="%"
              :value-style="{ color: '#722ed1' }"
            >
              <template #prefix>
                <a-icon type="star" />
              </template>
            </a-statistic>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- 图表分析 -->
    <div class="charts-section">
      <a-row :gutter="16">
        <!-- 成绩分布图 -->
        <a-col :span="12">
          <a-card title="成绩分布" size="small">
            <div class="chart-container">
              <div class="score-distribution">
                <div class="distribution-bars">
                  <div
                    v-for="(item, index) in scoreDistribution"
                    :key="index"
                    class="bar-item"
                  >
                    <div class="bar-label">{{ item.range }}</div>
                    <div class="bar-container">
                      <div
                        class="bar"
                        :style="{
                          height: `${(item.count / maxCount) * 100}%`,
                          backgroundColor: item.color
                        }"
                      ></div>
                    </div>
                    <div class="bar-count">{{ item.count }}</div>
                  </div>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>

        <!-- 班级对比图 -->
        <a-col :span="12">
          <a-card title="班级对比" size="small">
            <div class="chart-container">
              <div class="class-comparison">
                <div
                  v-for="classData in classStats"
                  :key="classData.className"
                  class="class-item"
                >
                  <div class="class-info">
                    <div class="class-name">{{ classData.className }}</div>
                    <div class="class-score">{{ classData.average.toFixed(1) }}分</div>
                  </div>
                  <div class="class-progress">
                    <a-progress
                      :percent="classData.average"
                      :stroke-color="getProgressColor(classData.average)"
                      size="small"
                    />
                  </div>
                  <div class="class-stats">
                    <span>提交: {{ classData.submitted }}/{{ classData.total }}</span>
                    <span>及格: {{ classData.passRate.toFixed(1) }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="16" style="margin-top: 16px;">
        <!-- 提交时间分布 -->
        <a-col :span="12">
          <a-card title="提交时间分布" size="small">
            <div class="chart-container">
              <div class="submission-timeline">
                <div
                  v-for="(day, index) in submissionTimeline"
                  :key="index"
                  class="timeline-item"
                >
                  <div class="timeline-date">{{ day.date }}</div>
                  <div class="timeline-bar">
                    <div
                      class="timeline-fill"
                      :style="{
                        width: `${(day.count / maxDailySubmissions) * 100}%`
                      }"
                    ></div>
                  </div>
                  <div class="timeline-count">{{ day.count }}</div>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>

        <!-- 评分项目分析 -->
        <a-col :span="12">
          <a-card title="评分项目分析" size="small">
            <div class="chart-container">
              <div class="criteria-analysis">
                <div
                  v-for="(criterion, index) in criteriaStats"
                  :key="index"
                  class="criterion-item"
                >
                  <div class="criterion-header">
                    <span class="criterion-name">{{ criterion.name }}</span>
                    <span class="criterion-average">{{ criterion.average.toFixed(1) }}分</span>
                  </div>
                  <div class="criterion-progress">
                    <a-progress
                      :percent="(criterion.average / criterion.maxScore) * 100"
                      :stroke-color="getCriterionColor(criterion.average, criterion.maxScore)"
                      size="small"
                    />
                  </div>
                  <div class="criterion-stats">
                    <span>满分人数: {{ criterion.perfectCount }}</span>
                    <span>平均得分率: {{ ((criterion.average / criterion.maxScore) * 100).toFixed(1) }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- 详细数据表格 -->
    <div class="detailed-data">
      <a-card title="详细统计数据" size="small">
        <a-tabs>
          <!-- 学生成绩明细 -->
          <a-tab-pane key="students" tab="学生成绩">
            <div class="table-toolbar">
              <a-row :gutter="16">
                <a-col :span="8">
                  <a-input-search
                    v-model="studentSearch"
                    placeholder="搜索学生"
                    @search="filterStudentData"
                  />
                </a-col>
                <a-col :span="6">
                  <a-select
                    v-model="scoreFilter"
                    placeholder="成绩筛选"
                    style="width: 100%"
                    allow-clear
                    @change="filterStudentData"
                  >
                    <a-select-option value="">全部成绩</a-select-option>
                    <a-select-option value="excellent">优秀(90+)</a-select-option>
                    <a-select-option value="good">良好(80-89)</a-select-option>
                    <a-select-option value="pass">及格(60-79)</a-select-option>
                    <a-select-option value="fail">不及格(60以下)</a-select-option>
                  </a-select>
                </a-col>
                <a-col :span="6">
                  <a-select
                    v-model="classFilter"
                    placeholder="班级筛选"
                    style="width: 100%"
                    allow-clear
                    @change="filterStudentData"
                  >
                    <a-select-option value="">全部班级</a-select-option>
                    <a-select-option value="一年级1班">一年级1班</a-select-option>
                    <a-select-option value="一年级2班">一年级2班</a-select-option>
                  </a-select>
                </a-col>
                <a-col :span="4">
                  <a-button type="primary" icon="download" @click="exportStudentData">
                    导出数据
                  </a-button>
                </a-col>
              </a-row>
            </div>

            <a-table
              :columns="studentColumns"
              :data-source="filteredStudentData"
              :pagination="studentPagination"
              size="small"
              row-key="id"
            >
              <template #score="text, record">
                <span :class="getScoreClass(record.score)">
                  {{ record.score !== null ? record.score + '分' : '未评分' }}
                </span>
              </template>

              <template #grade="text">
                <a-tag :color="getGradeColor(text)">{{ text }}</a-tag>
              </template>

              <template #submitTime="text">
                {{ text ? formatTime(text) : '未提交' }}
              </template>

              <template #status="text">
                <a-tag :color="getStatusColor(text)">
                  {{ getStatusText(text) }}
                </a-tag>
              </template>
            </a-table>
          </a-tab-pane>

          <!-- 班级统计 -->
          <a-tab-pane key="classes" tab="班级统计">
            <a-table
              :columns="classColumns"
              :data-source="classStats"
              :pagination="false"
              size="small"
            >
              <template #average="text">
                <span :class="getScoreClass(text)">{{ text.toFixed(1) }}分</span>
              </template>

              <template #submitRate="text">
                <span :style="{ color: text >= 80 ? '#3f8600' : '#cf1322' }">
                  {{ text.toFixed(1) }}%
                </span>
              </template>

              <template #passRate="text">
                <span :style="{ color: text >= 70 ? '#3f8600' : '#cf1322' }">
                  {{ text.toFixed(1) }}%
                </span>
              </template>

              <template #excellentRate="text">
                <span style="color: #722ed1;">{{ text.toFixed(1) }}%</span>
              </template>
            </a-table>
          </a-tab-pane>

          <!-- 评分统计 -->
          <a-tab-pane key="criteria" tab="评分统计">
            <a-table
              :columns="criteriaColumns"
              :data-source="criteriaStats"
              :pagination="false"
              size="small"
            >
              <template #average="text, record">
                <span :class="getScoreClass((text / record.maxScore) * 100)">
                  {{ text.toFixed(1) }}/{{ record.maxScore }}分
                </span>
              </template>

              <template #scoreRate="text">
                <span>{{ text.toFixed(1) }}%</span>
              </template>
            </a-table>
          </a-tab-pane>
        </a-tabs>
      </a-card>
    </div>

    <!-- 趋势分析 -->
    <div class="trend-analysis">
      <a-card title="趋势分析" size="small">
        <a-row :gutter="16">
          <a-col :span="8">
            <div class="trend-item">
              <div class="trend-title">提交趋势</div>
              <div class="trend-chart">
                <div class="mini-chart">
                  <div
                    v-for="(value, index) in submissionTrend"
                    :key="index"
                    class="chart-bar"
                    :style="{ height: `${value}%` }"
                  ></div>
                </div>
              </div>
              <div class="trend-description">
                {{ getTrendDescription('submission') }}
              </div>
            </div>
          </a-col>

          <a-col :span="8">
            <div class="trend-item">
              <div class="trend-title">成绩趋势</div>
              <div class="trend-chart">
                <div class="mini-chart">
                  <div
                    v-for="(value, index) in scoreTrend"
                    :key="index"
                    class="chart-bar"
                    :style="{ height: `${value}%` }"
                  ></div>
                </div>
              </div>
              <div class="trend-description">
                {{ getTrendDescription('score') }}
              </div>
            </div>
          </a-col>

          <a-col :span="8">
            <div class="trend-item">
              <div class="trend-title">质量趋势</div>
              <div class="trend-chart">
                <div class="mini-chart">
                  <div
                    v-for="(value, index) in qualityTrend"
                    :key="index"
                    class="chart-bar"
                    :style="{ height: `${value}%` }"
                  ></div>
                </div>
              </div>
              <div class="trend-description">
                {{ getTrendDescription('quality') }}
              </div>
            </div>
          </a-col>
        </a-row>
      </a-card>
    </div>
  </div>
</template>

<script>
export default {
    name: 'HomeworkStatistics',
    props: {
        homework: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            studentSearch: '',
            scoreFilter: '',
            classFilter: '',

            studentPagination: {
                current: 1,
                pageSize: 10,
                total: 0,
                showTotal: total => `共 ${total} 名学生`
            },

            studentColumns: [
                { title: '学号', dataIndex: 'studentId', key: 'studentId' },
                { title: '姓名', dataIndex: 'studentName', key: 'studentName' },
                { title: '班级', dataIndex: 'className', key: 'className' },
                {
                    title: '成绩',
                    dataIndex: 'score',
                    key: 'score',
                    scopedSlots: { customRender: 'score' },
                    sorter: (a, b) => (a.score || 0) - (b.score || 0)
                },
                {
                    title: '等级',
                    dataIndex: 'grade',
                    key: 'grade',
                    scopedSlots: { customRender: 'grade' }
                },
                {
                    title: '提交时间',
                    dataIndex: 'submitTime',
                    key: 'submitTime',
                    scopedSlots: { customRender: 'submitTime' }
                },
                {
                    title: '状态',
                    dataIndex: 'status',
                    key: 'status',
                    scopedSlots: { customRender: 'status' }
                }
            ],

            classColumns: [
                { title: '班级', dataIndex: 'className', key: 'className' },
                { title: '总人数', dataIndex: 'total', key: 'total' },
                { title: '提交人数', dataIndex: 'submitted', key: 'submitted' },
                {
                    title: '提交率',
                    dataIndex: 'submitRate',
                    key: 'submitRate',
                    scopedSlots: { customRender: 'submitRate' }
                },
                {
                    title: '平均分',
                    dataIndex: 'average',
                    key: 'average',
                    scopedSlots: { customRender: 'average' }
                },
                {
                    title: '及格率',
                    dataIndex: 'passRate',
                    key: 'passRate',
                    scopedSlots: { customRender: 'passRate' }
                },
                {
                    title: '优秀率',
                    dataIndex: 'excellentRate',
                    key: 'excellentRate',
                    scopedSlots: { customRender: 'excellentRate' }
                }
            ],

            criteriaColumns: [
                { title: '评分项目', dataIndex: 'name', key: 'name' },
                { title: '满分', dataIndex: 'maxScore', key: 'maxScore' },
                {
                    title: '平均分',
                    dataIndex: 'average',
                    key: 'average',
                    scopedSlots: { customRender: 'average' }
                },
                {
                    title: '得分率',
                    dataIndex: 'scoreRate',
                    key: 'scoreRate',
                    scopedSlots: { customRender: 'scoreRate' }
                },
                { title: '满分人数', dataIndex: 'perfectCount', key: 'perfectCount' },
                { title: '零分人数', dataIndex: 'zeroCount', key: 'zeroCount' }
            ],

            // 模拟数据
            studentData: [
                {
                    id: '1',
                    studentId: 'S001',
                    studentName: '张小明',
                    className: '一年级1班',
                    score: 88,
                    grade: 'B',
                    submitTime: '2024-01-24 15:30:00',
                    status: 'graded'
                },
                {
                    id: '2',
                    studentId: 'S002',
                    studentName: '李小红',
                    className: '一年级1班',
                    score: 92,
                    grade: 'A',
                    submitTime: '2024-01-24 18:45:00',
                    status: 'graded'
                },
                {
                    id: '3',
                    studentId: 'S003',
                    studentName: '王小华',
                    className: '一年级2班',
                    score: 75,
                    grade: 'C',
                    submitTime: '2024-01-25 09:15:00',
                    status: 'graded'
                },
                {
                    id: '4',
                    studentId: 'S004',
                    studentName: '陈小美',
                    className: '一年级2班',
                    score: null,
                    grade: '',
                    submitTime: null,
                    status: 'not_submitted'
                }
            ],

            classStats: [
                {
                    className: '一年级1班',
                    total: 30,
                    submitted: 28,
                    submitRate: 93.3,
                    average: 85.2,
                    passRate: 92.9,
                    excellentRate: 35.7
                },
                {
                    className: '一年级2班',
                    total: 32,
                    submitted: 29,
                    submitRate: 90.6,
                    average: 82.1,
                    passRate: 89.7,
                    excellentRate: 27.6
                }
            ],

            criteriaStats: [
                {
                    name: '完成度',
                    maxScore: 40,
                    average: 34.5,
                    scoreRate: 86.25,
                    perfectCount: 12,
                    zeroCount: 0
                },
                {
                    name: '代码质量',
                    maxScore: 30,
                    average: 25.8,
                    scoreRate: 86.0,
                    perfectCount: 8,
                    zeroCount: 1
                },
                {
                    name: '创意性',
                    maxScore: 20,
                    average: 16.2,
                    scoreRate: 81.0,
                    perfectCount: 5,
                    zeroCount: 2
                },
                {
                    name: '文档说明',
                    maxScore: 10,
                    average: 7.8,
                    scoreRate: 78.0,
                    perfectCount: 15,
                    zeroCount: 3
                }
            ],

            scoreDistribution: [
                { range: '0-59', count: 3, color: '#ff4d4f' },
                { range: '60-69', count: 5, color: '#faad14' },
                { range: '70-79', count: 8, color: '#1890ff' },
                { range: '80-89', count: 12, color: '#52c41a' },
                { range: '90-100', count: 7, color: '#722ed1' }
            ],

            submissionTimeline: [
                { date: '01-20', count: 2 },
                { date: '01-21', count: 5 },
                { date: '01-22', count: 8 },
                { date: '01-23', count: 12 },
                { date: '01-24', count: 15 },
                { date: '01-25', count: 8 },
                { date: '01-26', count: 3 }
            ],

            submissionTrend: [20, 40, 60, 80, 100, 60, 30],
            scoreTrend: [75, 78, 80, 85, 88, 86, 87],
            qualityTrend: [70, 75, 80, 82, 85, 87, 88]
        }
    },
    computed: {
        filteredStudentData () {
            let filtered = this.studentData

            if (this.studentSearch) {
                const searchLower = this.studentSearch.toLowerCase()
                filtered = filtered.filter(student =>
                    student.studentName.toLowerCase().includes(searchLower) ||
          student.studentId.toLowerCase().includes(searchLower)
                )
            }

            if (this.scoreFilter) {
                filtered = filtered.filter(student => {
                    if (!student.score) return this.scoreFilter === 'fail'
                    if (this.scoreFilter === 'excellent') return student.score >= 90
                    if (this.scoreFilter === 'good') return student.score >= 80 && student.score < 90
                    if (this.scoreFilter === 'pass') return student.score >= 60 && student.score < 80
                    if (this.scoreFilter === 'fail') return student.score < 60
                    return true
                })
            }

            if (this.classFilter) {
                filtered = filtered.filter(student => student.className === this.classFilter)
            }

            return filtered
        },

        submissionRate () {
            const total = this.studentData.length
            const submitted = this.studentData.filter(s => s.status !== 'not_submitted').length
            return total > 0 ? Math.round((submitted / total) * 100) : 0
        },

        averageScore () {
            const graded = this.studentData.filter(s => s.score !== null)
            if (graded.length === 0) return 0
            const total = graded.reduce((sum, s) => sum + s.score, 0)
            return total / graded.length
        },

        passRate () {
            const graded = this.studentData.filter(s => s.score !== null)
            if (graded.length === 0) return 0
            const passed = graded.filter(s => s.score >= 60).length
            return Math.round((passed / graded.length) * 100)
        },

        excellentRate () {
            const graded = this.studentData.filter(s => s.score !== null)
            if (graded.length === 0) return 0
            const excellent = graded.filter(s => s.score >= 90).length
            return Math.round((excellent / graded.length) * 100)
        },

        maxCount () {
            return Math.max(...this.scoreDistribution.map(item => item.count))
        },

        maxDailySubmissions () {
            return Math.max(...this.submissionTimeline.map(day => day.count))
        }
    },
    methods: {
        getProgressColor (score) {
            if (score >= 90) return '#722ed1'
            if (score >= 80) return '#52c41a'
            if (score >= 60) return '#faad14'
            return '#ff4d4f'
        },

        getCriterionColor (average, maxScore) {
            const rate = (average / maxScore) * 100
            if (rate >= 85) return '#52c41a'
            if (rate >= 70) return '#1890ff'
            if (rate >= 60) return '#faad14'
            return '#ff4d4f'
        },

        getScoreClass (score) {
            if (score >= 90) return 'score-excellent'
            if (score >= 80) return 'score-good'
            if (score >= 60) return 'score-pass'
            return 'score-fail'
        },

        getGradeColor (grade) {
            const colorMap = {
                'A': 'purple',
                'B': 'green',
                'C': 'blue',
                'D': 'red'
            }
            return colorMap[grade] || 'default'
        },

        getStatusColor (status) {
            const colorMap = {
                'graded': 'green',
                'submitted': 'blue',
                'not_submitted': 'red',
                'late': 'orange'
            }
            return colorMap[status] || 'default'
        },

        getStatusText (status) {
            const textMap = {
                'graded': '已评分',
                'submitted': '已提交',
                'not_submitted': '未提交',
                'late': '迟交'
            }
            return textMap[status] || '未知'
        },

        formatTime (time) {
            return new Date(time).toLocaleString()
        },

        getTrendDescription (type) {
            const descriptions = {
                'submission': '提交活跃度呈上升趋势',
                'score': '整体成绩稳步提升',
                'quality': '作品质量持续改善'
            }
            return descriptions[type] || ''
        },

        filterStudentData () {
            // 筛选逻辑在computed中处理
        },

        exportStudentData () {
            this.$message.success('正在导出学生成绩数据...')
        }
    }
}
</script>

<style scoped>
.homework-statistics {
  padding: 16px 0;
}

.stats-overview {
  margin-bottom: 24px;
}

.stat-card {
  text-align: center;
}

.charts-section {
  margin-bottom: 24px;
}

.chart-container {
  height: 280px;
  padding: 16px;
}

.score-distribution {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.distribution-bars {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  height: 200px;
}

.bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.bar-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.bar-container {
  flex: 1;
  width: 40px;
  display: flex;
  align-items: flex-end;
  margin-bottom: 8px;
}

.bar {
  width: 100%;
  min-height: 4px;
  border-radius: 2px;
  transition: height 0.3s;
}

.bar-count {
  font-size: 12px;
  font-weight: 500;
  color: #333;
}

.class-comparison {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}

.class-item {
  flex: 1;
}

.class-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.class-name {
  font-weight: 500;
  color: #333;
}

.class-score {
  font-weight: 500;
  color: #1890ff;
}

.class-progress {
  margin-bottom: 8px;
}

.class-stats {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.submission-timeline {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 0;
}

.timeline-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.timeline-date {
  width: 60px;
  font-size: 12px;
  color: #666;
}

.timeline-bar {
  flex: 1;
  height: 20px;
  background: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
}

.timeline-fill {
  height: 100%;
  background: linear-gradient(90deg, #1890ff, #40a9ff);
  transition: width 0.3s;
}

.timeline-count {
  width: 30px;
  text-align: right;
  font-size: 12px;
  font-weight: 500;
  color: #333;
}

.criteria-analysis {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}

.criterion-item {
  flex: 1;
}

.criterion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.criterion-name {
  font-weight: 500;
  color: #333;
}

.criterion-average {
  font-weight: 500;
  color: #1890ff;
}

.criterion-progress {
  margin-bottom: 8px;
}

.criterion-stats {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.detailed-data {
  margin-bottom: 24px;
}

.table-toolbar {
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
}

.score-excellent {
  color: #722ed1;
  font-weight: 500;
}

.score-good {
  color: #52c41a;
  font-weight: 500;
}

.score-pass {
  color: #1890ff;
  font-weight: 500;
}

.score-fail {
  color: #ff4d4f;
  font-weight: 500;
}

.trend-analysis .ant-card {
  margin-bottom: 0;
}

.trend-item {
  text-align: center;
  padding: 16px;
}

.trend-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 16px;
}

.trend-chart {
  margin-bottom: 16px;
}

.mini-chart {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 4px;
  height: 60px;
}

.chart-bar {
  width: 8px;
  background: linear-gradient(180deg, #1890ff, #40a9ff);
  border-radius: 4px;
  min-height: 4px;
  transition: height 0.3s;
}

.trend-description {
  font-size: 14px;
  color: #666;
}
</style>
