<template>
  <div class="analytics-dashboard">
    <a-card>
      <div slot="title">
        <a-icon type="bar-chart" />
        数据分析仪表板
      </div>
      <div slot="extra">
        <a-range-picker
          v-model="dateRange"
          @change="onDateRangeChange"
          style="margin-right: 8px"
        />
        <a-button @click="exportReport" type="primary">
          <a-icon type="download" />
          导出报告
        </a-button>
      </div>

      <!-- 概览统计卡片 -->
      <a-row :gutter="16" style="margin-bottom: 24px">
        <a-col :span="6">
          <a-card class="stat-card">
            <a-statistic
              title="总学员数"
              :value="overviewStats.totalStudents"
              :value-style="{ color: '#3f8600' }"
            >
              <template #prefix>
                <a-icon type="user" />
              </template>
            </a-statistic>
            <div class="stat-trend">
              <span :style="{ color: '#3f8600' }">
                <a-icon type="arrow-up" />
                {{ overviewStats.studentGrowth }}%
              </span>
              <span class="trend-text">较上月</span>
            </div>
          </a-card>
        </a-col>

        <a-col :span="6">
          <a-card class="stat-card">
            <a-statistic
              title="活跃学员"
              :value="overviewStats.activeStudents"
              :value-style="{ color: '#1890ff' }"
            >
              <template #prefix>
                <a-icon type="heart" />
              </template>
            </a-statistic>
            <div class="stat-trend">
              <span :style="{ color: '#1890ff' }">
                <a-icon type="arrow-up" />
                {{ overviewStats.activeGrowth }}%
              </span>
              <span class="trend-text">较上周</span>
            </div>
          </a-card>
        </a-col>

        <a-col :span="6">
          <a-card class="stat-card">
            <a-statistic
              title="完成作业数"
              :value="overviewStats.completedHomework"
              :value-style="{ color: '#722ed1' }"
            >
              <template #prefix>
                <a-icon type="file-done" />
              </template>
            </a-statistic>
            <div class="stat-trend">
              <span :style="{ color: '#722ed1' }">
                <a-icon type="arrow-up" />
                {{ overviewStats.homeworkGrowth }}%
              </span>
              <span class="trend-text">较上周</span>
            </div>
          </a-card>
        </a-col>

        <a-col :span="6">
          <a-card class="stat-card">
            <a-statistic
              title="课程完成率"
              :value="overviewStats.courseCompletionRate"
              suffix="%"
              :value-style="{ color: '#fa8c16' }"
            >
              <template #prefix>
                <a-icon type="trophy" />
              </template>
            </a-statistic>
            <div class="stat-trend">
              <span :style="{ color: '#fa8c16' }">
                <a-icon type="arrow-up" />
                {{ overviewStats.completionGrowth }}%
              </span>
              <span class="trend-text">较上月</span>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 图表区域 -->
      <a-row :gutter="16">
        <!-- 学习活跃度趋势图 -->
        <a-col :span="12">
          <a-card title="学习活跃度趋势" class="chart-card">
            <div class="chart-container">
              <div class="chart-placeholder">
                <div class="chart-info">
                  <h3>学习活跃度</h3>
                  <p>过去30天的学员学习活跃度变化</p>
                  <div class="chart-mock-data">
                    <div class="data-point" v-for="(point, index) in mockActivityData" :key="index">
                      <div class="point-bar" :style="{ height: point.value + 'px', backgroundColor: point.color }"></div>
                      <span class="point-label">{{ point.label }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>

        <!-- 课程完成情况 -->
        <a-col :span="12">
          <a-card title="课程完成情况" class="chart-card">
            <div class="chart-container">
              <div class="course-progress-list">
                <div
                  v-for="course in courseProgressData"
                  :key="course.id"
                  class="course-progress-item"
                >
                  <div class="course-info">
                    <h4>{{ course.name }}</h4>
                    <span class="course-students">{{ course.enrolledStudents }} 人学习</span>
                  </div>
                  <div class="progress-info">
                    <a-progress
                      :percent="course.completionRate"
                      :stroke-color="getProgressColor(course.completionRate)"
                      size="small"
                    />
                    <span class="completion-rate">{{ course.completionRate }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 学员排行榜和作业统计 -->
      <a-row :gutter="16" style="margin-top: 16px">
        <!-- 学员排行榜 -->
        <a-col :span="12">
          <a-card title="学员排行榜" class="rank-card">
            <a-list
              :data-source="studentRankings"
              size="small"
            >
              <a-list-item slot="renderItem" slot-scope="item, index">
                <a-list-item-meta>
                  <div slot="avatar">
                    <a-badge
                      :count="index + 1"
                      :number-style="getRankStyle(index)"
                      style="background-color: transparent"
                    >
                      <a-avatar :src="item.avatar" />
                    </a-badge>
                  </div>
                  <span slot="title">{{ item.name }}</span>
                  <span slot="description">{{ item.className }} | 学习时长: {{ item.studyHours }}小时</span>
                </a-list-item-meta>
                <div>
                  <a-statistic
                    :value="item.score"
                    :precision="1"
                    suffix="分"
                    :value-style="{ fontSize: '16px' }"
                  />
                </div>
              </a-list-item>
            </a-list>
          </a-card>
        </a-col>

        <!-- 作业完成统计 -->
        <a-col :span="12">
          <a-card title="作业完成统计" class="homework-stats">
            <div class="homework-overview">
              <a-row :gutter="16">
                <a-col :span="8">
                  <a-statistic
                    title="总作业数"
                    :value="homeworkStats.total"
                    :value-style="{ color: '#1890ff' }"
                  />
                </a-col>
                <a-col :span="8">
                  <a-statistic
                    title="已完成"
                    :value="homeworkStats.completed"
                    :value-style="{ color: '#52c41a' }"
                  />
                </a-col>
                <a-col :span="8">
                  <a-statistic
                    title="待批改"
                    :value="homeworkStats.pending"
                    :value-style="{ color: '#fa8c16' }"
                  />
                </a-col>
              </a-row>
            </div>

            <a-divider />

            <div class="homework-detail">
              <h4>按科目统计</h4>
              <div class="subject-stats">
                <div
                  v-for="subject in subjectStats"
                  :key="subject.name"
                  class="subject-item"
                >
                  <div class="subject-info">
                    <span class="subject-name">{{ subject.name }}</span>
                    <span class="subject-completion">{{ subject.completionRate }}%</span>
                  </div>
                  <a-progress
                    :percent="subject.completionRate"
                    :stroke-color="subject.color"
                    size="small"
                    :show-info="false"
                  />
                </div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 学习行为分析 -->
      <a-row style="margin-top: 16px">
        <a-col :span="24">
          <a-card title="学习行为分析" class="behavior-analysis">
            <a-tabs>
              <a-tab-pane key="time" tab="学习时间分布">
                <div class="time-distribution">
                  <div class="time-chart">
                    <h4>一周学习时间分布</h4>
                    <div class="weekday-chart">
                      <div
                        v-for="day in weekdayData"
                        :key="day.name"
                        class="weekday-item"
                      >
                        <div class="weekday-bar">
                          <div
                            class="bar-fill"
                            :style="{ height: (day.hours / 8 * 100) + '%' }"
                          ></div>
                        </div>
                        <span class="weekday-label">{{ day.name }}</span>
                        <span class="weekday-hours">{{ day.hours }}h</span>
                      </div>
                    </div>
                  </div>

                  <div class="peak-hours">
                    <h4>学习高峰时段</h4>
                    <div class="hourly-chart">
                      <div
                        v-for="hour in hourlyData"
                        :key="hour.time"
                        class="hour-item"
                        :class="{ 'peak-hour': hour.isPeak }"
                      >
                        <div class="hour-bar" :style="{ height: hour.activity + '%' }"></div>
                        <span class="hour-label">{{ hour.time }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </a-tab-pane>

              <a-tab-pane key="device" tab="设备使用情况">
                <div class="device-usage">
                  <a-row :gutter="24">
                    <a-col :span="12">
                      <h4>设备类型分布</h4>
                      <div class="device-chart">
                        <div
                          v-for="device in deviceData"
                          :key="device.type"
                          class="device-item"
                        >
                          <div class="device-icon">
                            <a-icon :type="device.icon" />
                          </div>
                          <div class="device-info">
                            <span class="device-name">{{ device.type }}</span>
                            <span class="device-percentage">{{ device.percentage }}%</span>
                          </div>
                          <div class="device-bar">
                            <div
                              class="device-fill"
                              :style="{ width: device.percentage + '%', backgroundColor: device.color }"
                            ></div>
                          </div>
                        </div>
                      </div>
                    </a-col>
                    <a-col :span="12">
                      <h4>浏览器使用情况</h4>
                      <a-list
                        :data-source="browserData"
                        size="small"
                      >
                        <a-list-item slot="renderItem" slot-scope="item">
                          <a-list-item-meta>
                            <span slot="title">{{ item.name }}</span>
                            <span slot="description">{{ item.users }} 用户使用</span>
                          </a-list-item-meta>
                          <div>{{ item.percentage }}%</div>
                        </a-list-item>
                      </a-list>
                    </a-col>
                  </a-row>
                </div>
              </a-tab-pane>

              <a-tab-pane key="interaction" tab="互动情况">
                <div class="interaction-stats">
                  <a-row :gutter="16">
                    <a-col :span="6">
                      <a-card>
                        <a-statistic
                          title="总评论数"
                          :value="interactionStats.comments"
                          :value-style="{ color: '#1890ff' }"
                        >
                          <template #prefix>
                            <a-icon type="message" />
                          </template>
                        </a-statistic>
                      </a-card>
                    </a-col>
                    <a-col :span="6">
                      <a-card>
                        <a-statistic
                          title="作品点赞数"
                          :value="interactionStats.likes"
                          :value-style="{ color: '#fa541c' }"
                        >
                          <template #prefix>
                            <a-icon type="heart" />
                          </template>
                        </a-statistic>
                      </a-card>
                    </a-col>
                    <a-col :span="6">
                      <a-card>
                        <a-statistic
                          title="作品分享数"
                          :value="interactionStats.shares"
                          :value-style="{ color: '#52c41a' }"
                        >
                          <template #prefix>
                            <a-icon type="share-alt" />
                          </template>
                        </a-statistic>
                      </a-card>
                    </a-col>
                    <a-col :span="6">
                      <a-card>
                        <a-statistic
                          title="问答次数"
                          :value="interactionStats.questions"
                          :value-style="{ color: '#722ed1' }"
                        >
                          <template #prefix>
                            <a-icon type="question-circle" />
                          </template>
                        </a-statistic>
                      </a-card>
                    </a-col>
                  </a-row>
                </div>
              </a-tab-pane>
            </a-tabs>
          </a-card>
        </a-col>
      </a-row>
    </a-card>
  </div>
</template>

<script>
import moment from 'moment'

export default {
    name: 'Analytics',
    data () {
        return {
            dateRange: [moment().subtract(30, 'days'), moment()],

            overviewStats: {
                totalStudents: 1248,
                studentGrowth: 12.5,
                activeStudents: 892,
                activeGrowth: 8.3,
                completedHomework: 3456,
                homeworkGrowth: 15.2,
                courseCompletionRate: 78.5,
                completionGrowth: 5.7
            },

            mockActivityData: [
                { label: '1周前', value: 45, color: '#1890ff' },
                { label: '6天前', value: 52, color: '#1890ff' },
                { label: '5天前', value: 38, color: '#1890ff' },
                { label: '4天前', value: 65, color: '#1890ff' },
                { label: '3天前', value: 58, color: '#1890ff' },
                { label: '2天前', value: 72, color: '#1890ff' },
                { label: '昨天', value: 68, color: '#52c41a' },
                { label: '今天', value: 75, color: '#fa8c16' }
            ],

            courseProgressData: [
                {
                    id: '1',
                    name: 'Scratch编程入门',
                    enrolledStudents: 156,
                    completionRate: 85
                },
                {
                    id: '2',
                    name: 'Python基础教程',
                    enrolledStudents: 134,
                    completionRate: 72
                },
                {
                    id: '3',
                    name: 'Web前端开发',
                    enrolledStudents: 98,
                    completionRate: 67
                },
                {
                    id: '4',
                    name: 'JavaScript进阶',
                    enrolledStudents: 78,
                    completionRate: 54
                }
            ],

            studentRankings: [
                {
                    id: '1',
                    name: '张小明',
                    className: '编程一班',
                    studyHours: 45.5,
                    score: 95.8,
                    avatar: '/avatars/student1.jpg'
                },
                {
                    id: '2',
                    name: '李小红',
                    className: '编程二班',
                    studyHours: 42.3,
                    score: 93.2,
                    avatar: '/avatars/student2.jpg'
                },
                {
                    id: '3',
                    name: '王小强',
                    className: '编程一班',
                    studyHours: 38.7,
                    score: 91.5,
                    avatar: '/avatars/student3.jpg'
                },
                {
                    id: '4',
                    name: '赵小芳',
                    className: '编程三班',
                    studyHours: 35.2,
                    score: 89.3,
                    avatar: '/avatars/student4.jpg'
                },
                {
                    id: '5',
                    name: '陈小华',
                    className: '编程二班',
                    studyHours: 33.8,
                    score: 87.6,
                    avatar: '/avatars/student5.jpg'
                }
            ],

            homeworkStats: {
                total: 450,
                completed: 378,
                pending: 72
            },

            subjectStats: [
                { name: 'Scratch', completionRate: 85, color: '#52c41a' },
                { name: 'Python', completionRate: 72, color: '#1890ff' },
                { name: 'JavaScript', completionRate: 68, color: '#fa8c16' },
                { name: 'HTML/CSS', completionRate: 91, color: '#722ed1' }
            ],

            weekdayData: [
                { name: '周一', hours: 6.5 },
                { name: '周二', hours: 7.2 },
                { name: '周三', hours: 5.8 },
                { name: '周四', hours: 6.9 },
                { name: '周五', hours: 7.8 },
                { name: '周六', hours: 4.2 },
                { name: '周日', hours: 3.6 }
            ],

            hourlyData: [
                { time: '8:00', activity: 20, isPeak: false },
                { time: '10:00', activity: 45, isPeak: false },
                { time: '14:00', activity: 78, isPeak: true },
                { time: '16:00', activity: 85, isPeak: true },
                { time: '19:00', activity: 92, isPeak: true },
                { time: '21:00', activity: 65, isPeak: false }
            ],

            deviceData: [
                { type: 'PC', percentage: 65, icon: 'desktop', color: '#1890ff' },
                { type: '平板', percentage: 25, icon: 'tablet', color: '#52c41a' },
                { type: '手机', percentage: 10, icon: 'mobile', color: '#fa8c16' }
            ],

            browserData: [
                { name: 'Chrome', users: 456, percentage: 68 },
                { name: 'Firefox', users: 134, percentage: 20 },
                { name: 'Safari', users: 67, percentage: 10 },
                { name: '其他', users: 13, percentage: 2 }
            ],

            interactionStats: {
                comments: 2456,
                likes: 5678,
                shares: 892,
                questions: 1234
            }
        }
    },

    methods: {
        onDateRangeChange (dates) {
            this.dateRange = dates
            // 这里可以根据日期范围重新加载数据
            this.$message.info('日期范围已更新，正在刷新数据...')
        },

        exportReport () {
            this.$message.success('报告导出成功！')
            // 这里可以实现实际的导出功能
        },

        getProgressColor (percent) {
            if (percent >= 80) return '#52c41a'
            if (percent >= 60) return '#1890ff'
            if (percent >= 40) return '#fa8c16'
            return '#ff4d4f'
        },

        getRankStyle (index) {
            const colors = ['#f5222d', '#fa8c16', '#fadb14', '#52c41a', '#1890ff']
            return {
                backgroundColor: colors[index] || '#666',
                color: 'white'
            }
        }
    }
}
</script>

<style scoped lang="less">
.analytics-dashboard {
  padding: 24px;

  .stat-card {
    text-align: center;

    .stat-trend {
      margin-top: 8px;
      font-size: 12px;

      .trend-text {
        color: #666;
        margin-left: 4px;
      }
    }
  }

  .chart-card {
    .chart-container {
      height: 300px;
      position: relative;

      .chart-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        background: #fafafa;
        border-radius: 4px;

        .chart-info {
          text-align: center;

          h3 {
            margin-bottom: 8px;
            color: #333;
          }

          p {
            color: #666;
            margin-bottom: 24px;
          }

          .chart-mock-data {
            display: flex;
            align-items: flex-end;
            gap: 8px;
            height: 120px;

            .data-point {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 4px;

              .point-bar {
                width: 20px;
                min-height: 10px;
                border-radius: 2px;
              }

              .point-label {
                font-size: 10px;
                color: #666;
              }
            }
          }
        }
      }
    }

    .course-progress-list {
      .course-progress-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }

        .course-info {
          h4 {
            margin: 0 0 4px 0;
          }

          .course-students {
            color: #666;
            font-size: 12px;
          }
        }

        .progress-info {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 150px;

          .completion-rate {
            font-weight: 500;
          }
        }
      }
    }
  }

  .rank-card {
    .ant-list-item {
      padding: 12px 0;
    }
  }

  .homework-stats {
    .homework-overview {
      margin-bottom: 16px;
    }

    .subject-stats {
      .subject-item {
        margin-bottom: 12px;

        .subject-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;

          .subject-name {
            font-weight: 500;
          }

          .subject-completion {
            color: #666;
          }
        }
      }
    }
  }

  .behavior-analysis {
    .time-distribution {
      display: flex;
      gap: 48px;

      .time-chart {
        flex: 1;

        .weekday-chart {
          display: flex;
          align-items: flex-end;
          gap: 16px;
          height: 200px;
          padding: 16px 0;

          .weekday-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;

            .weekday-bar {
              width: 40px;
              height: 120px;
              background: #f0f0f0;
              border-radius: 4px;
              position: relative;

              .bar-fill {
                position: absolute;
                bottom: 0;
                width: 100%;
                background: #1890ff;
                border-radius: 4px;
                transition: height 0.3s;
              }
            }

            .weekday-label {
              font-size: 12px;
              color: #666;
            }

            .weekday-hours {
              font-weight: 500;
              color: #333;
            }
          }
        }
      }

      .peak-hours {
        flex: 1;

        .hourly-chart {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          height: 200px;
          padding: 16px 0;

          .hour-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;

            .hour-bar {
              width: 30px;
              height: 100px;
              background: #1890ff;
              border-radius: 2px;
              position: relative;
            }

            &.peak-hour .hour-bar {
              background: #fa8c16;
            }

            .hour-label {
              font-size: 10px;
              color: #666;
            }
          }
        }
      }
    }

    .device-usage {
      .device-chart {
        .device-item {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;

          .device-icon {
            width: 40px;
            display: flex;
            justify-content: center;

            .anticon {
              font-size: 20px;
            }
          }

          .device-info {
            display: flex;
            flex-direction: column;
            min-width: 80px;

            .device-name {
              font-weight: 500;
            }

            .device-percentage {
              color: #666;
              font-size: 12px;
            }
          }

          .device-bar {
            flex: 1;
            height: 8px;
            background: #f0f0f0;
            border-radius: 4px;
            overflow: hidden;

            .device-fill {
              height: 100%;
              border-radius: 4px;
              transition: width 0.3s;
            }
          }
        }
      }
    }
  }
}
</style>
