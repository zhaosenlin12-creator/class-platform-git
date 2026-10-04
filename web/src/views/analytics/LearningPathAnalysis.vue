<template>
  <div class="learning-path-analysis">
    <a-card title="学习路径分析" :bordered="false">
      <template slot="extra">
        <a-space>
          <a-select
            v-model="selectedStudent"
            placeholder="选择学生"
            style="width: 200px"
            @change="onStudentChange"
          >
            <a-select-option
              v-for="student in studentList"
              :key="student.id"
              :value="student.id"
            >
              {{ student.name }}
            </a-select-option>
          </a-select>
          <a-select
            v-model="selectedCourse"
            placeholder="选择课程"
            style="width: 200px"
            @change="onCourseChange"
          >
            <a-select-option
              v-for="course in courseList"
              :key="course.id"
              :value="course.id"
            >
              {{ course.courseName }}
            </a-select-option>
          </a-select>
        </a-space>
      </template>

      <a-spin :spinning="loading">
        <div class="path-analysis-content">
          <a-row :gutter="16">
            <!-- 学习进度概览 -->
            <a-col :span="8">
              <a-card title="学习进度" size="small">
                <div class="progress-overview">
                  <a-progress
                    :percent="progressData.completionRate"
                    :stroke-width="8"
                    status="active"
                  />
                  <div class="progress-stats">
                    <a-statistic
                      title="已完成单元"
                      :value="progressData.completedUnits"
                      :total="progressData.totalUnits"
                      suffix="{`/"
                      ${progressData.totalUnits}`}
                    />
                    <a-statistic
                      title="预计完成时间"
                      :value="progressData.estimatedDays"
                      suffix="天后"
                    />
                  </div>
                </div>
              </a-card>
            </a-col>

            <!-- 学习风格分析 -->
            <a-col :span="8">
              <a-card title="学习风格" size="small">
                <div class="learning-style-analysis">
                  <a-tag color="blue" v-if="learningStyle.primary">
                    {{ getLearningStyleName(learningStyle.primary) }}
                  </a-tag>
                  <div class="style-description">
                    {{ getLearningStyleDescription(learningStyle.primary) }}
                  </div>
                </div>
              </a-card>
            </a-col>

            <!-- 难度适应度 -->
            <a-col :span="8">
              <a-card title="难度适应度" size="small">
                <div class="difficulty-adaptation">
                  <a-rate
                    :value="difficultyLevel"
                    disabled
                    style="color: #faad14"
                  />
                  <div class="difficulty-text">
                    {{ getDifficultyText(difficultyLevel) }}
                  </div>
                </div>
              </a-card>
            </a-col>
          </a-row>

          <!-- 学习路径可视化 -->
          <a-row style="margin-top: 16px">
            <a-col :span="24">
              <a-card title="学习路径图" size="small">
                <div ref="pathVisualization" style="height: 400px"></div>
              </a-card>
            </a-col>
          </a-row>

          <!-- 学习节点详情 -->
          <a-row style="margin-top: 16px">
            <a-col :span="24">
              <a-card title="学习节点详情" size="small">
                <a-timeline>
                  <a-timeline-item
                    v-for="(node, index) in pathNodes"
                    :key="index"
                    :color="getNodeColor(node.status)"
                  >
                    <template slot="dot">
                      <a-icon
                        :type="getNodeIcon(node.status)"
                        style="font-size: 16px"
                      />
                    </template>
                    <div class="timeline-content">
                      <div class="node-header">
                        <span class="node-title">{{ node.title }}</span>
                        <a-tag :color="getNodeColor(node.status)" size="small">
                          {{ getNodeStatusText(node.status) }}
                        </a-tag>
                      </div>
                      <div class="node-meta">
                        <span v-if="node.startTime">开始时间: {{ formatTime(node.startTime) }}</span>
                        <span v-if="node.duration" style="margin-left: 16px">
                          学习时长: {{ node.duration }}分钟
                        </span>
                        <span v-if="node.score" style="margin-left: 16px">
                          得分: {{ node.score }}分
                        </span>
                      </div>
                      <div v-if="node.difficulties.length > 0" class="node-difficulties">
                        <a-tag color="red" v-for="difficulty in node.difficulties" :key="difficulty">
                          困难点: {{ difficulty }}
                        </a-tag>
                      </div>
                    </div>
                  </a-timeline-item>
                </a-timeline>
              </a-card>
            </a-col>
          </a-row>

          <!-- 学习建议 -->
          <a-row style="margin-top: 16px">
            <a-col :span="24">
              <a-card title="学习建议" size="small">
                <a-list
                  :data-source="suggestions"
                  size="small"
                >
                  <a-list-item slot="renderItem" slot-scope="item">
                    <a-list-item-meta>
                      <template slot="avatar">
                        <a-icon :type="item.icon" :style="{ color: item.color }" />
                      </template>
                      <template slot="title">
                        {{ item.title }}
                      </template>
                      <template slot="description">
                        {{ item.description }}
                      </template>
                    </a-list-item-meta>
                  </a-list-item>
                </a-list>
              </a-card>
            </a-col>
          </a-row>
        </div>
      </a-spin>
    </a-card>
  </div>
</template>

<script>
import { getAction } from '@/api/manage'
import * as echarts from 'echarts'
import moment from 'moment'

export default {
    name: 'LearningPathAnalysis',
    data () {
        return {
            loading: false,
            selectedStudent: null,
            selectedCourse: null,
            studentList: [],
            courseList: [],
            progressData: {
                completionRate: 0,
                completedUnits: 0,
                totalUnits: 0,
                estimatedDays: 0
            },
            learningStyle: {
                primary: '',
                secondary: ''
            },
            difficultyLevel: 3,
            pathNodes: [],
            suggestions: [],
            pathChart: null
        }
    },
    mounted () {
        this.initChart()
        this.loadStudentList()
        this.loadCourseList()
    },
    methods: {
        async loadStudentList () {
            // 模拟学生列表数据
            this.studentList = [
                { id: '1', name: '张三' },
                { id: '2', name: '李四' },
                { id: '3', name: '王五' }
            ]
        },

        async loadCourseList () {
            try {
                const res = await getAction('/teaching/teachingCourse/mineCourse')
                if (res.success) {
                    this.courseList = res.result || []
                }
            } catch (error) {
                console.error('加载课程列表失败:', error)
            }
        },

        async loadLearningPathData () {
            if (!this.selectedStudent || !this.selectedCourse) return

            this.loading = true
            try {
                const res = await getAction('/teaching/learningAnalytics/learningPath', {
                    userId: this.selectedStudent,
                    courseId: this.selectedCourse
                })

                if (res.success && res.result) {
                    this.processPathData(res.result)
                }
            } catch (error) {
                console.error('加载学习路径数据失败:', error)
                this.$message.error('加载学习路径数据失败')
            } finally {
                this.loading = false
            }
        },

        processPathData (data) {
            // 处理进度数据
            this.progressData = {
                completionRate: (data.completionRate * 100) || 0,
                completedUnits: data.completedUnits || 0,
                totalUnits: data.totalUnits || 0,
                estimatedDays: this.calculateEstimatedDays(data)
            }

            // 处理学习风格
            this.learningStyle = {
                primary: data.learningStyle || 'visual',
                secondary: ''
            }

            // 处理难度等级
            this.difficultyLevel = data.difficultyLevel || 3

            // 处理路径节点
            this.pathNodes = this.generatePathNodes(data.path || [])

            // 生成学习建议
            this.suggestions = this.generateSuggestions(data)

            // 更新路径可视化
            this.updatePathVisualization()
        },

        generatePathNodes (pathData) {
            return pathData.map((node, index) => ({
                title: node.unitName || `单元${index + 1}`,
                status: node.status || 'pending',
                startTime: node.startTime,
                duration: node.duration,
                score: node.score,
                difficulties: node.difficulties || []
            }))
        },

        generateSuggestions (data) {
            const suggestions = []

            if (data.completionRate < 0.3) {
                suggestions.push({
                    icon: 'exclamation-circle',
                    color: '#ff4d4f',
                    title: '学习进度较慢',
                    description: '建议增加学习时间，制定更详细的学习计划'
                })
            }

            if (data.difficultyLevel > 4) {
                suggestions.push({
                    icon: 'arrow-down',
                    color: '#faad14',
                    title: '降低学习难度',
                    description: '当前难度较高，建议先巩固基础知识'
                })
            }

            if (data.learningStyle === 'visual') {
                suggestions.push({
                    icon: 'eye',
                    color: '#52c41a',
                    title: '视觉学习者',
                    description: '多利用图表、视频等视觉材料进行学习'
                })
            }

            return suggestions
        },

        calculateEstimatedDays (data) {
            if (!data.estimatedFinishTime) return 0
            const now = moment()
            const finish = moment(data.estimatedFinishTime)
            return Math.max(0, finish.diff(now, 'days'))
        },

        initChart () {
            this.pathChart = echarts.init(this.$refs.pathVisualization)
        },

        updatePathVisualization () {
            const nodes = this.pathNodes.map((node, index) => ({
                name: node.title,
                x: (index % 5) * 150 + 100,
                y: Math.floor(index / 5) * 100 + 50,
                symbolSize: 30,
                itemStyle: {
                    color: this.getNodeColor(node.status)
                }
            }))

            const links = []
            for (let i = 0; i < nodes.length - 1; i++) {
                links.push({
                    source: i,
                    target: i + 1,
                    lineStyle: {
                        color: '#ccc',
                        width: 2
                    }
                })
            }

            const option = {
                title: {
                    text: '学习路径图',
                    left: 'center',
                    textStyle: { fontSize: 14 }
                },
                tooltip: {
                    formatter: (params) => {
                        if (params.dataType === 'node') {
                            const node = this.pathNodes[params.dataIndex]
                            return `${params.name}<br/>状态: ${this.getNodeStatusText(node.status)}`
                        }
                        return ''
                    }
                },
                series: [{
                    type: 'graph',
                    layout: 'none',
                    roam: true,
                    data: nodes,
                    links: links,
                    label: {
                        show: true,
                        position: 'bottom',
                        fontSize: 12
                    },
                    emphasis: {
                        focus: 'adjacency'
                    }
                }]
            }

            this.pathChart.setOption(option)
        },

        getNodeColor (status) {
            const colorMap = {
                completed: '#52c41a',
                current: '#1890ff',
                pending: '#d9d9d9',
                blocked: '#ff4d4f'
            }
            return colorMap[status] || '#d9d9d9'
        },

        getNodeIcon (status) {
            const iconMap = {
                completed: 'check-circle',
                current: 'play-circle',
                pending: 'clock-circle',
                blocked: 'exclamation-circle'
            }
            return iconMap[status] || 'clock-circle'
        },

        getNodeStatusText (status) {
            const textMap = {
                completed: '已完成',
                current: '进行中',
                pending: '未开始',
                blocked: '受阻'
            }
            return textMap[status] || '未知'
        },

        getLearningStyleName (style) {
            const nameMap = {
                visual: '视觉学习者',
                auditory: '听觉学习者',
                kinesthetic: '动觉学习者',
                reading: '阅读学习者'
            }
            return nameMap[style] || style
        },

        getLearningStyleDescription (style) {
            const descMap = {
                visual: '通过图像、图表和视觉材料学习效果更佳',
                auditory: '通过听讲、讨论和音频材料学习效果更佳',
                kinesthetic: '通过实践操作和体验式学习效果更佳',
                reading: '通过阅读文字材料学习效果更佳'
            }
            return descMap[style] || '个性化学习风格'
        },

        getDifficultyText (level) {
            const textMap = {
                1: '非常简单',
                2: '简单',
                3: '中等',
                4: '困难',
                5: '非常困难'
            }
            return textMap[level] || '中等'
        },

        formatTime (time) {
            return moment(time).format('YYYY-MM-DD HH:mm')
        },

        onStudentChange () {
            this.loadLearningPathData()
        },

        onCourseChange () {
            this.loadLearningPathData()
        }
    }
}
</script>

<style lang="less" scoped>
.learning-path-analysis {
  .path-analysis-content {
    .progress-overview {
      .progress-stats {
        margin-top: 16px;
      }
    }

    .learning-style-analysis {
      .style-description {
        margin-top: 8px;
        color: rgba(0, 0, 0, 0.65);
        font-size: 12px;
      }
    }

    .difficulty-adaptation {
      .difficulty-text {
        margin-top: 8px;
        color: rgba(0, 0, 0, 0.65);
        font-size: 12px;
      }
    }

    .timeline-content {
      .node-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;

        .node-title {
          font-weight: 500;
        }
      }

      .node-meta {
        color: rgba(0, 0, 0, 0.65);
        font-size: 12px;
        margin-bottom: 8px;
      }

      .node-difficulties {
        margin-top: 8px;
      }
    }
  }
}
</style>
