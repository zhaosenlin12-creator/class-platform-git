<template>
  <div class="teacher-dashboard">
    <!-- 页面头部 -->
    <div class="dashboard-header">
      <div class="welcome-section">
        <h2>欢迎回来,{{ safeTeacherName }}老师!</h2>
        <p class="current-time">{{ currentDateTime }}</p>
      </div>
      <div class="quick-actions">
        <a-button type="primary" icon="plus" @click="$router.push('/teacher/course-management')">
          创建新课程
        </a-button>
        <a-button icon="video-camera" @click="startLiveClass">
          开始直播课
        </a-button>
        <a-button icon="file-text" @click="$router.push('/teacher/homework-review')">
          批改作业
        </a-button>
      </div>
    </div>

    <!-- 数据统计卡片 -->
    <div class="stats-section">
      <a-row :gutter="16">
        <a-col :xs="24" :sm="12" :lg="6">
          <a-card class="stat-card">
            <a-statistic
              title="我的课程"
              :value="dashboardData.totalCourses"
              prefix="📚"
              :loading="loading"
            />
            <div class="stat-trend">
              <a-icon type="arrow-up" style="color: #3f8600" />
              <span>本月新增 {{ dashboardData.newCourses }}</span>
            </div>
          </a-card>
        </a-col>

        <a-col :xs="24" :sm="12" :lg="6">
          <a-card class="stat-card">
            <a-statistic
              title="学生总数"
              :value="dashboardData.totalStudents"
              prefix="👥"
              :loading="loading"
            />
            <div class="stat-trend">
              <a-icon type="arrow-up" style="color: #3f8600" />
              <span>活跃学生 {{ dashboardData.activeStudents }}</span>
            </div>
          </a-card>
        </a-col>

        <a-col :xs="24" :sm="12" :lg="6">
          <a-card class="stat-card">
            <a-statistic
              title="待批改作业"
              :value="dashboardData.pendingHomework"
              prefix="📝"
              suffix="份"
              :loading="loading"
              :value-style="dashboardData.pendingHomework > 10 ? { color: '#cf1322' } : { color: '#3f8600' }"
            />
            <div class="stat-action">
              <a @click="$router.push('/teacher/homework-review')">立即处理</a>
            </div>
          </a-card>
        </a-col>

        <a-col :xs="24" :sm="12" :lg="6">
          <a-card class="stat-card">
            <a-statistic
              title="本周活跃度"
              :value="dashboardData.weeklyActivities"
              prefix="📊"
              :loading="loading"
            />
            <div class="stat-trend">
              <a-icon type="arrow-up" style="color: #3f8600" />
              <span>较上周 +{{ dashboardData.activityGrowth }}%</span>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- 主要内容区域 -->
    <a-row :gutter="16" style="margin-top: 16px">
      <!-- 左侧内容 -->
      <a-col :xs="24" :lg="16">
        <!-- 最近活动 -->
        <a-card title="最近活动" class="recent-activities" :loading="loading">
          <template #extra>
            <a-button type="link" size="small" @click="viewAllActivities">
              查看全部
            </a-button>
          </template>

          <div v-if="!loading && recentActivities.length === 0" class="empty-state">
            <a-empty description="暂无活动记录" />
          </div>

          <a-timeline v-else>
            <a-timeline-item
              v-for="activity in recentActivities"
              :key="activity.id"
              :color="getActivityColor(activity.type)"
            >
              <div class="activity-item">
                <div class="activity-header">
                  <span class="activity-type">{{ getActivityTypeText(activity.type) }}</span>
                  <span class="activity-time">{{ formatTime(activity.time) }}</span>
                </div>
                <div class="activity-content">
                  <strong>{{ safe(activity.studentName) }}</strong>
                  {{ safe(activity.content) }}
                </div>
                <div class="activity-course">
                  课程:{{ safe(activity.courseName) }}
                </div>
              </div>
            </a-timeline-item>
          </a-timeline>
        </a-card>

        <!-- 课程完成情况 -->
        <a-card title="课程完成情况" style="margin-top: 16px" :loading="loading">
          <template #extra>
            <a-button type="link" size="small" @click="$router.push('/teacher/student-analytics')">
              详细分析
            </a-button>
          </template>

          <div v-if="!loading">
            <div
              v-for="course in courseCompletionData"
              :key="course.courseId"
              class="course-completion-item"
            >
              <div class="course-info">
                <h4>{{ safe(course.courseName) }}</h4>
                <p>学生:{{ course.completedStudents }}/{{ course.totalStudents }}</p>
              </div>
              <div class="completion-progress">
                <a-progress
                  :percent="course.completionRate"
                  :stroke-color="getProgressColor(course.completionRate)"
                  :show-info="true"
                />
              </div>
            </div>
          </div>
        </a-card>

        <!-- 本周教学数据图表 -->
        <a-card title="本周教学数据" style="margin-top: 16px" :loading="loading">
          <template #extra>
            <a-radio-group v-model="chartTimeRange" size="small" @change="loadWeeklyData">
              <a-radio-button value="week">本周</a-radio-button>
              <a-radio-button value="month">本月</a-radio-button>
            </a-radio-group>
          </template>

          <div v-if="!loading" class="chart-placeholder">
            <div class="chart-message">图表功能开发中...</div>
          </div>
        </a-card>

        <!-- 学生学习进度分布 -->
        <a-card title="学生学习进度分布" style="margin-top: 16px" :loading="loading">
          <div v-if="!loading" class="chart-placeholder">
            <div class="chart-message">图表功能开发中...</div>
          </div>
        </a-card>
      </a-col>

      <!-- 右侧侧边栏 -->
      <a-col :xs="24" :lg="8">
        <!-- 快速操作 -->
        <a-card title="快速操作" class="quick-operations">
          <div class="operation-grid">
            <div class="operation-item" @click="$router.push('/teacher/course-management')">
              <a-icon type="book" class="operation-icon" />
              <span>课程管理</span>
            </div>
            <div class="operation-item" @click="$router.push('/teacher/exam-management')">
              <a-icon type="file-text" class="operation-icon" />
              <span>考试管理</span>
            </div>
            <div class="operation-item" @click="$router.push('/teacher/resource-library')">
              <a-icon type="cloud-server" class="operation-icon" />
              <span>资源库</span>
            </div>
            <div class="operation-item" @click="showScheduleModal = true">
              <a-icon type="calendar" class="operation-icon" />
              <span>课程表</span>
            </div>
          </div>
        </a-card>

        <!-- 学习数据概览 -->
        <a-card title="学习数据概览" style="margin-top: 16px" :loading="loading">
          <div v-if="!loading">
            <div class="data-overview-item">
              <span class="label">本周学习时长</span>
              <span class="value">{{ dashboardData.weeklyStudyTime }} 小时</span>
            </div>
            <div class="data-overview-item">
              <span class="label">平均完成率</span>
              <span class="value">{{ dashboardData.avgCompletionRate }}%</span>
            </div>
            <div class="data-overview-item">
              <span class="label">作业提交率</span>
              <span class="value">{{ dashboardData.homeworkSubmissionRate }}%</span>
            </div>
          </div>
        </a-card>

        <!-- 系统通知 -->
        <a-card title="系统通知" style="margin-top: 16px">
          <template #extra>
            <a-badge :count="unreadNotifications.length">
              <a-button type="link" size="small">
                全部通知
              </a-button>
            </a-badge>
          </template>

          <div v-if="unreadNotifications.length === 0" class="empty-state">
            <a-empty :image="false" description="暂无新通知" />
          </div>

          <div v-else>
            <div
              v-for="notification in unreadNotifications.slice(0, 3)"
              :key="notification.id"
              class="notification-item"
            >
              <div class="notification-title">{{ safe(notification.title) }}</div>
              <div class="notification-content">{{ safe(notification.content) }}</div>
              <div class="notification-time">{{ formatTime(notification.time) }}</div>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 课程表模态框 -->
    <a-modal
      v-model="showScheduleModal"
      title="我的课程表"
      width="800px"
      :footer="null"
    >
      <div class="schedule-content">
        <a-calendar
          v-model="selectedDate"
          :fullscreen="false"
          @select="onDateSelect"
        >
          <template #dateCellRender="{ current }">
            <div v-if="getScheduleForDate(current).length > 0" class="schedule-cell">
              <div class="schedule-dot"></div>
            </div>
          </template>
        </a-calendar>

        <div v-if="selectedDateSchedule.length > 0" class="selected-date-schedule">
          <h4>{{ selectedDate.format('YYYY年MM月DD日') }} 的课程安排:</h4>
          <a-list
            :data-source="selectedDateSchedule"
            size="small"
          >
            <a-list-item slot="renderItem" slot-scope="item">
              <div class="schedule-item">
                <span class="schedule-time">{{ safe(item.time) }}</span>
                <span class="schedule-course">{{ safe(item.courseName) }}</span>
                <span class="schedule-students">{{ item.students }} 人</span>
              </div>
            </a-list-item>
          </a-list>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script>
import moment from 'moment'
import { teacherStatsApi, scheduleApi, classroomApi } from '@/api/teaching'
import { sanitizeInput } from '@/utils/security'
// ECharts charts temporarily disabled for compatibility

export default {
    name: 'TeacherDashboard',
    components: {
    },
    data () {
        return {
            loading: true,
            teacherName: '',
            currentDateTime: '',
            showScheduleModal: false,
            selectedDate: moment(),
            selectedDateSchedule: [],

            // 仪表板数据
            dashboardData: {
                totalCourses: 0,
                newCourses: 0,
                totalStudents: 0,
                activeStudents: 0,
                pendingHomework: 0,
                weeklyActivities: 0,
                activityGrowth: 0,
                weeklyStudyTime: 0,
                avgCompletionRate: 0,
                homeworkSubmissionRate: 0
            },

            // 最近活动
            recentActivities: [],

            // 课程完成情况
            courseCompletionData: [],

            // 未读通知
            unreadNotifications: [],

            // 课程表数据
            scheduleData: [],

            // 图表相关数据
            chartTimeRange: 'week',
            weeklyDataChart: {},
            progressDistributionChart: {},

            // 定时器
            timeTimer: null
        }
    },

    computed: {
        currentUserInfo () {
            return this.$store.getters.userInfo || {}
        },
        safeTeacherName () {
            const displayName = this.teacherName ||
                this.currentUserInfo.realname ||
                this.currentUserInfo.realName ||
                this.currentUserInfo.username ||
                '教师'
            return sanitizeInput(displayName, { maxLength: 50 })
        }
    },

    mounted () {
        this.initializeDashboard()
        this.startTimeTimer()
    },

    beforeDestroy () {
        if (this.timeTimer) {
            clearInterval(this.timeTimer)
        }
    },

    methods: {
    /**
     * 清理用户输入文本 - 防止XSS攻击
     */
        safe (text) {
            if (!text) return ''
            return sanitizeInput(text, { maxLength: 200 })
        },

        /**
     * 初始化仪表板
     */
        async initializeDashboard () {
            this.loading = true
            try {
                // 获取教师基本信息
                await this.loadTeacherInfo()

                // 并行加载所有数据,使用allSettled确保所有请求都完成
                await Promise.allSettled([
                    this.loadDashboardData(),
                    this.loadRecentActivities(),
                    this.loadCourseCompletionData(),
                    this.loadNotifications(),
                    this.loadScheduleData(),
                    this.loadWeeklyData(),
                    this.loadProgressDistribution()
                ])
            } catch (error) {
                console.error('初始化仪表板失败:', error)
            } finally {
                // 确保loading状态被重置
                this.loading = false
            }
        },

        /**
     * 加载教师信息
     */
        async loadTeacherInfo () {
            try {
                const cachedName = this.currentUserInfo.realname ||
                    this.currentUserInfo.realName ||
                    this.currentUserInfo.username

                if (cachedName) {
                    this.teacherName = cachedName
                }

                const response = await this.$http.get('/api/user/current')
                if (response.success) {
                    this.teacherName = response.result.realname || response.result.username
                }
            } catch (error) {
                console.error('获取教师信息失败:', error)
                this.teacherName = '教师'
            }
        },

        /**
     * 加载仪表板统计数据
     */
        async loadDashboardData () {
            try {
                const response = await teacherStatsApi.getDashboardStats()
                if (response.success) {
                    this.dashboardData = { ...this.dashboardData, ...response.result }
                }
            } catch (error) {
                console.warn('加载仪表板数据失败:', error.message)
                // 使用空数据
                this.dashboardData = {
                    totalCourses: 0,
                    newCourses: 0,
                    totalStudents: 0,
                    activeStudents: 0,
                    pendingHomework: 0,
                    weeklyActivities: 0,
                    activityGrowth: 0,
                    weeklyStudyTime: 0,
                    avgCompletionRate: 0,
                    homeworkSubmissionRate: 0
                }
            }
        },

        /**
     * 加载最近活动
     */
        async loadRecentActivities () {
            try {
                const response = await teacherStatsApi.getTeachingActivities()
                if (response.success) {
                    this.recentActivities = response.result
                }
            } catch (error) {
                console.warn('加载活动数据失败:', error.message)
                this.recentActivities = []
            }
        },

        /**
     * 加载课程完成情况
     */
        async loadCourseCompletionData () {
            try {
                const response = await teacherStatsApi.getCourseCompletion()
                if (response.success) {
                    this.courseCompletionData = response.result
                }
            } catch (error) {
                console.error('加载课程完成情况失败:', error)
                this.courseCompletionData = []
            }
        },

        /**
     * 加载通知
     */
        async loadNotifications () {
            try {
                const response = await this.$http.get('/api/notifications/unread')
                const data = response.data || response
                const notifications = Array.isArray(data.result)
                    ? data.result
                    : (data.result && Array.isArray(data.result.notifications) ? data.result.notifications : [])

                if (data.success) {
                    this.unreadNotifications = notifications
                } else {
                    this.unreadNotifications = []
                }
            } catch (error) {
                console.error('加载通知失败:', error)
                this.unreadNotifications = []
            }
        },

        /**
     * 加载课程表数据
     */
        async loadScheduleData () {
            try {
                const response = await scheduleApi.getTodaySchedule()
                if (response.success) {
                    this.scheduleData = Array.isArray(response.result) ? response.result : []
                    this.selectedDateSchedule = this.getScheduleForDate(this.selectedDate)
                }
            } catch (error) {
                console.error('加载课程表失败:', error)
                this.scheduleData = []
                this.selectedDateSchedule = []
            }
        },

        /**
     * 开始直播课
     */
        async startLiveClass () {
            try {
                const response = await classroomApi.createClassroom({
                    title: '临时直播课堂',
                    courseName: '直播课堂',
                    description: '教师从教学首页快速发起的直播课堂',
                    type: 'live',
                    autoStart: true,
                    status: 'active',
                    selectedLanguage: 'python'
                })

                if (response.success) {
                    const classroomId = response.result.id
                    this.$router.push({
                        path: `/classroom/online/${classroomId}`,
                        query: {
                            role: 'teacher'
                        }
                    })
                }
            } catch (error) {
                console.error('创建直播课堂失败:', error)
                this.$message.error('创建直播课堂失败,请稍后重试')
            }
        },

        /**
     * 查看所有活动
     */
        viewAllActivities () {
            this.$router.push('/teacher/student-analytics?tab=activities')
        },

        /**
     * 开始时间定时器
     */
        startTimeTimer () {
            this.updateCurrentTime()
            this.timeTimer = setInterval(() => {
                this.updateCurrentTime()
            }, 1000)
        },

        /**
     * 更新当前时间
     */
        updateCurrentTime () {
            this.currentDateTime = moment().format('YYYY年MM月DD日 dddd HH:mm:ss')
        },

        /**
     * 获取活动类型文本
     */
        getActivityTypeText (type) {
            const typeMap = {
                homework_submit: '作业提交',
                course_complete: '课程完成',
                question_ask: '提出问题',
                exam_finish: '考试完成',
                login: '登录学习'
            }
            return typeMap[type] || '其他活动'
        },

        /**
     * 获取活动颜色
     */
        getActivityColor (type) {
            const colorMap = {
                homework_submit: 'blue',
                course_complete: 'green',
                question_ask: 'orange',
                exam_finish: 'purple',
                login: 'gray'
            }
            return colorMap[type] || 'gray'
        },

        /**
     * 获取进度条颜色
     */
        getProgressColor (rate) {
            if (rate >= 90) return '#52c41a'
            if (rate >= 70) return '#1890ff'
            if (rate >= 50) return '#faad14'
            return '#ff4d4f'
        },

        /**
     * 格式化时间
     */
        formatTime (time) {
            return moment(time).fromNow()
        },

        /**
     * 选择日期
     */
        onDateSelect (date) {
            this.selectedDate = date
            this.selectedDateSchedule = this.getScheduleForDate(date) || []
        },

        /**
     * 获取指定日期的课程安排
     */
        getScheduleForDate (date) {
            const dateString = date.format('YYYY-MM-DD')
            return this.scheduleData.filter(item =>
                moment(item.date).format('YYYY-MM-DD') === dateString
            )
        },

        /**
     * 加载本周教学数据
     */
        async loadWeeklyData () {
            try {
                const response = await teacherStatsApi.getDashboardStats()
                if (response.success && response.result.weeklyStats) {
                    const weeklyStats = response.result.weeklyStats
                    this.weeklyDataChart = {
                        title: {
                            text: this.chartTimeRange === 'week' ? '本周教学数据' : '本月教学数据',
                            left: 'center',
                            textStyle: {
                                fontSize: 16,
                                fontWeight: 'normal'
                            }
                        },
                        tooltip: {
                            trigger: 'axis',
                            axisPointer: {
                                type: 'cross'
                            }
                        },
                        legend: {
                            data: ['课程数', '学生数'],
                            bottom: 10
                        },
                        xAxis: {
                            type: 'category',
                            data: weeklyStats.map(item => item.day),
                            axisTick: {
                                alignWithLabel: true
                            }
                        },
                        yAxis: [
                            {
                                type: 'value',
                                name: '课程数',
                                position: 'left'
                            },
                            {
                                type: 'value',
                                name: '学生数',
                                position: 'right'
                            }
                        ],
                        series: [
                            {
                                name: '课程数',
                                type: 'bar',
                                data: weeklyStats.map(item => item.lessons),
                                itemStyle: {
                                    color: '#1890ff'
                                }
                            },
                            {
                                name: '学生数',
                                type: 'line',
                                yAxisIndex: 1,
                                data: weeklyStats.map(item => item.students),
                                itemStyle: {
                                    color: '#52c41a'
                                }
                            }
                        ]
                    }
                }
            } catch (error) {
                console.error('加载周度数据失败:', error)
                // 使用模拟数据
                this.generateMockWeeklyChart()
            }
        },

        /**
     * 加载学习进度分布
     */
        async loadProgressDistribution () {
            try {
                const response = await teacherStatsApi.getStudentAnalysis()
                if (response.success && response.result.performanceDistribution) {
                    const distribution = response.result.performanceDistribution
                    this.progressDistributionChart = {
                        title: {
                            text: '学生学习进度分布',
                            left: 'center',
                            textStyle: {
                                fontSize: 16,
                                fontWeight: 'normal'
                            }
                        },
                        tooltip: {
                            trigger: 'item',
                            formatter: '{a} <br/>{b}: {c} ({d}%)'
                        },
                        legend: {
                            bottom: 10,
                            data: distribution.map(item => item.grade)
                        },
                        series: [
                            {
                                name: '学习进度',
                                type: 'pie',
                                radius: ['40%', '70%'],
                                center: ['50%', '45%'],
                                data: distribution.map(item => ({
                                    value: item.count,
                                    name: item.grade
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
                }
            } catch (error) {
                console.error('加载进度分布失败:', error)
                // 使用模拟数据
                this.generateMockProgressChart()
            }
        },

        /**
     * 生成模拟的周度图表
     */
        generateMockWeeklyChart () {
            const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
            const lessons = [3, 4, 2, 5, 3, 2, 1]
            const students = [45, 58, 32, 72, 48, 28, 15]

            this.weeklyDataChart = {
                title: {
                    text: '本周教学数据',
                    left: 'center',
                    textStyle: {
                        fontSize: 16,
                        fontWeight: 'normal'
                    }
                },
                tooltip: {
                    trigger: 'axis',
                    axisPointer: {
                        type: 'cross'
                    }
                },
                legend: {
                    data: ['课程数', '学生数'],
                    bottom: 10
                },
                xAxis: {
                    type: 'category',
                    data: days,
                    axisTick: {
                        alignWithLabel: true
                    }
                },
                yAxis: [
                    {
                        type: 'value',
                        name: '课程数',
                        position: 'left'
                    },
                    {
                        type: 'value',
                        name: '学生数',
                        position: 'right'
                    }
                ],
                series: [
                    {
                        name: '课程数',
                        type: 'bar',
                        data: lessons,
                        itemStyle: {
                            color: '#1890ff'
                        }
                    },
                    {
                        name: '学生数',
                        type: 'line',
                        yAxisIndex: 1,
                        data: students,
                        itemStyle: {
                            color: '#52c41a'
                        }
                    }
                ]
            }
        },

        /**
     * 生成模拟的进度分布图表
     */
        generateMockProgressChart () {
            this.progressDistributionChart = {
                title: {
                    text: '学生学习进度分布',
                    left: 'center',
                    textStyle: {
                        fontSize: 16,
                        fontWeight: 'normal'
                    }
                },
                tooltip: {
                    trigger: 'item',
                    formatter: '{a} <br/>{b}: {c} ({d}%)'
                },
                legend: {
                    bottom: 10,
                    data: ['优秀(90-100)', '良好(80-89)', '及格(60-79)', '不及格(<60)']
                },
                series: [
                    {
                        name: '学习进度',
                        type: 'pie',
                        radius: ['40%', '70%'],
                        center: ['50%', '45%'],
                        data: [
                            { value: 45, name: '优秀(90-100)' },
                            { value: 68, name: '良好(80-89)' },
                            { value: 32, name: '及格(60-79)' },
                            { value: 11, name: '不及格(<60)' }
                        ],
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
        }
    }
}
</script>

<style lang="less" scoped>
.teacher-dashboard {
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;

  .dashboard-header {
    background: white;
    padding: 24px;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .welcome-section {
      h2 {
        margin: 0 0 8px 0;
        color: #262626;
        font-size: 24px;
      }

      .current-time {
        margin: 0;
        color: #8c8c8c;
        font-size: 14px;
      }
    }

    .quick-actions {
      .ant-btn {
        margin-left: 8px;
      }
    }
  }

  .stats-section {
    margin-bottom: 16px;

    .stat-card {
      text-align: center;

      .stat-trend {
        margin-top: 8px;
        font-size: 12px;
        color: #8c8c8c;
      }

      .stat-action {
        margin-top: 8px;
        font-size: 12px;

        a {
          color: #1890ff;
        }
      }
    }
  }

  .recent-activities {
    .activity-item {
      .activity-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;

        .activity-type {
          background: #f0f0f0;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          color: #666;
        }

        .activity-time {
          font-size: 12px;
          color: #999;
        }
      }

      .activity-content {
        margin-bottom: 4px;
        font-size: 14px;
      }

      .activity-course {
        font-size: 12px;
        color: #666;
      }
    }
  }

  .course-completion-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    .course-info {
      flex: 1;

      h4 {
        margin: 0 0 4px 0;
        font-size: 14px;
      }

      p {
        margin: 0;
        font-size: 12px;
        color: #666;
      }
    }

    .completion-progress {
      width: 120px;
    }
  }

  .quick-operations {
    .operation-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;

      .operation-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 16px;
        border: 1px solid #f0f0f0;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s;

        &:hover {
          border-color: #1890ff;
          background: #f6ffed;
        }

        .operation-icon {
          font-size: 24px;
          color: #1890ff;
          margin-bottom: 8px;
        }

        span {
          font-size: 12px;
          color: #666;
        }
      }
    }
  }

  .data-overview-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    .label {
      color: #666;
      font-size: 14px;
    }

    .value {
      font-weight: 500;
      color: #262626;
    }
  }

  .notification-item {
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    .notification-title {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
    }

    .notification-content {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }

    .notification-time {
      font-size: 11px;
      color: #999;
    }
  }

  .empty-state {
    text-align: center;
    padding: 24px 0;
  }
}

.schedule-content {
  .schedule-cell {
    position: relative;

    .schedule-dot {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 6px;
      height: 6px;
      background: #1890ff;
      border-radius: 50%;
    }
  }

  .selected-date-schedule {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #f0f0f0;

    .schedule-item {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .schedule-time {
        font-weight: 500;
        color: #1890ff;
      }

      .schedule-course {
        flex: 1;
        margin: 0 12px;
      }

      .schedule-students {
        color: #666;
        font-size: 12px;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .teacher-dashboard {
    padding: 16px;

    .dashboard-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;

      .quick-actions {
        width: 100%;

        .ant-btn {
          margin: 0 4px 8px 0;
        }
      }
    }

    .stats-section {
      .ant-col {
        margin-bottom: 16px;
      }
    }
  }
}

.chart-placeholder {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.chart-message {
  color: #999;
  font-size: 14px;
}
</style>
