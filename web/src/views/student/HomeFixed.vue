<template>
  <div class="student-home">
    <!-- 欢迎区域 -->
    <a-row :gutter="16" class="welcome-section">
      <a-col :span="24">
        <a-card>
          <div class="welcome-header">
            <a-avatar
              size="large"
              :src="userInfo && userInfo.avatar ? userInfo.avatar : '/logo.png'"
              icon="user"
            />
            <div class="welcome-info">
              <h2>欢迎回来，{{ getUserName() }}！</h2>
              <p>今天也要努力学习编程哦 🎓</p>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 当前课程状态 -->
    <a-row :gutter="16" style="margin-bottom: 16px">
      <a-col :span="24">
        <a-card title="📚 当前课程状态" :bordered="false">
          <div v-if="currentLesson.isActive" class="current-lesson">
            <a-alert
              type="success"
              show-icon
              :message="getLessonMessage()"
              style="margin-bottom: 16px"
            />

            <a-row :gutter="16">
              <a-col :span="12">
                <p><strong>📖 课程内容：</strong>{{ getLessonTitle() }}</p>
                <p><strong>⏰ 开始时间：</strong>{{ formatTime(currentLesson.startTime) }}</p>
              </a-col>
              <a-col :span="12" style="text-align: right;">
                <a-button
                  type="primary"
                  size="large"
                  @click="joinClassroom"
                  :loading="joiningClassroom"
                >
                  <a-icon type="video-camera" />
                  进入课堂
                </a-button>
              </a-col>
            </a-row>

            <!-- 推送内容提醒 -->
            <div v-if="pushedContent" class="pushed-content">
              <a-divider />
              <a-alert
                type="info"
                show-icon
                message="老师推送了新内容"
                style="margin-bottom: 8px"
              />
              <div class="content-preview">
                <p><strong>内容类型：</strong>{{ getContentTypeName(pushedContent.type) }}</p>
                <p><strong>推送时间：</strong>{{ formatTime(pushedContent.timestamp) }}</p>
                <a-button @click="viewPushedContent">查看详情</a-button>
              </div>
            </div>
          </div>

          <div v-else class="no-lesson">
            <a-icon type="calendar" style="font-size: 48px; color: #ccc;" />
            <p style="margin-top: 16px; color: #999;">当前没有进行中的课程</p>
            <p style="color: #999;">请关注课程安排，准时参加上课</p>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 统计数据 -->
    <a-row :gutter="16" class="stats-section">
      <a-col :span="6">
        <a-card>
          <a-statistic title="已学课程" :value="stats.completedCourses" suffix="门">
            <template slot="prefix">
              <a-icon type="book" style="color: #52c41a" />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="进行中课程" :value="stats.activeCourses" suffix="门">
            <template slot="prefix">
              <a-icon type="play-circle" style="color: #1890ff" />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="待提交作业" :value="stats.pendingHomework" suffix="个">
            <template slot="prefix">
              <a-icon type="file-text" style="color: #fa8c16" />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="学习时长" :value="stats.studyHours" suffix="小时">
            <template slot="prefix">
              <a-icon type="clock-circle" style="color: #722ed1" />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <!-- 学习进度 -->
    <a-row :gutter="16" style="margin-top: 16px">
      <a-col :span="12">
        <a-card title="📈 学习进度" :bordered="false">
          <div class="progress-item" v-for="course in learningProgress" :key="course.id">
            <div class="progress-header">
              <span>{{ course.name }}</span>
              <span class="progress-text">{{ course.completed }}/{{ course.total }}</span>
            </div>
            <a-progress
              :percent="Math.round((course.completed / course.total) * 100)"
              :stroke-color="getProgressColor(course.completed / course.total)"
            />
          </div>
        </a-card>
      </a-col>

      <a-col :span="12">
        <a-card title="📋 最近作业" :bordered="false">
          <a-list
            :data-source="recentHomework"
            size="small"
          >
            <template slot="renderItem" slot-scope="item">
              <a-list-item>
                <a-list-item-meta>
                  <template slot="title">
                    <span>{{ item.title }}</span>
                    <a-tag :color="getHomeworkStatusColor(item.status)" style="margin-left: 8px">
                      {{ getHomeworkStatusText(item.status) }}
                    </a-tag>
                  </template>
                  <template slot="description">
                    截止时间：{{ formatTime(item.deadline) }}
                  </template>
                </a-list-item-meta>
                <template slot="actions">
                  <a @click="viewHomework(item)">查看</a>
                </template>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
    </a-row>

    <!-- 推送内容详情模态框 -->
    <a-modal
      title="老师推送的内容"
      :visible="contentModalVisible"
      @cancel="contentModalVisible = false"
      :footer="null"
      width="800px"
    >
      <div v-if="pushedContent">
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="内容类型">
            {{ getContentTypeName(pushedContent.type) }}
          </a-descriptions-item>
          <a-descriptions-item label="推送时间">
            {{ formatTime(pushedContent.timestamp) }}
          </a-descriptions-item>
        </a-descriptions>

        <div style="margin-top: 16px;">
          <h4>内容详情：</h4>
          <div class="content-display">
            <pre v-if="pushedContent.type === 'code'">{{ pushedContent.data }}</pre>
            <div v-else-if="pushedContent.type === 'exercise'">
              <p><strong>练习题目：</strong>{{ getExerciseTitle() }}</p>
              <p><strong>描述：</strong>{{ getExerciseDescription() }}</p>
            </div>
            <div v-else>
              {{ pushedContent.data }}
            </div>
          </div>
        </div>

        <div style="margin-top: 16px; text-align: right;">
          <a-button @click="contentModalVisible = false" style="margin-right: 8px">关闭</a-button>
          <a-button type="primary" @click="applyPushedContent">应用到编程环境</a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import moment from 'moment'
import { getAction, postAction } from '@/api/manage'

export default {
    name: 'StudentHomeFixed',
    data () {
        return {
            currentLesson: {
                isActive: false
            },
            pushedContent: null,
            contentModalVisible: false,
            joiningClassroom: false,
            stats: {
                completedCourses: 5,
                activeCourses: 2,
                pendingHomework: 3,
                studyHours: 48
            },
            learningProgress: [
                {
                    id: 1,
                    name: 'Scratch基础编程',
                    completed: 8,
                    total: 12
                },
                {
                    id: 2,
                    name: 'Python入门',
                    completed: 15,
                    total: 20
                }
            ],
            recentHomework: [
                {
                    id: 1,
                    title: '绘制彩色图案',
                    status: 'pending',
                    deadline: moment().add(2, 'days').toISOString()
                },
                {
                    id: 2,
                    title: '编写计算器程序',
                    status: 'completed',
                    deadline: moment().subtract(1, 'day').toISOString()
                },
                {
                    id: 3,
                    title: '制作动画效果',
                    status: 'submitted',
                    deadline: moment().add(5, 'days').toISOString()
                }
            ],
            checkInterval: null
        }
    },

    computed: {
        ...mapGetters(['userInfo'])
    },

    mounted () {
        this.checkCurrentLesson()
        // 每30秒检查一次课程状态
        this.checkInterval = setInterval(() => {
            this.checkCurrentLesson()
            this.checkPushedContent()
        }, 30000)
    },

    beforeDestroy () {
        if (this.checkInterval) {
            clearInterval(this.checkInterval)
        }
    },

    methods: {
        getUserName () {
            if (this.userInfo && (this.userInfo.realName || this.userInfo.username)) {
                return this.userInfo.realName || this.userInfo.username
            }
            return '学员'
        },

        getLessonMessage () {
            const title = this.getLessonTitle()
            return `老师正在上课：${title}`
        },

        getLessonTitle () {
            if (this.currentLesson && this.currentLesson.lessonContent && this.currentLesson.lessonContent.title) {
                return this.currentLesson.lessonContent.title
            }
            return '课程进行中'
        },

        getExerciseTitle () {
            if (this.pushedContent && this.pushedContent.data && this.pushedContent.data.title) {
                return this.pushedContent.data.title
            }
            return '暂无'
        },

        getExerciseDescription () {
            if (this.pushedContent && this.pushedContent.data && this.pushedContent.data.description) {
                return this.pushedContent.data.description
            }
            return '暂无'
        },

        async checkCurrentLesson () {
            try {
                const classId = (this.userInfo && this.userInfo.classId) || 'class-1'
                const response = await getAction(`/class/${classId}/current-lesson`)

                if (response.success) {
                    this.currentLesson = response.result
                }
            } catch (error) {
                console.error('检查当前课程失败:', error)
            }
        },

        async checkPushedContent () {
            if (!this.currentLesson.isActive) return

            try {
                const classId = (this.userInfo && this.userInfo.classId) || 'class-1'
                const studentId = this.userInfo && this.userInfo.id

                const response = await getAction(`/student/get-pushed-content/${classId}`, {
                    studentId
                })

                if (response.success && response.result) {
                    // 如果是新内容，显示提醒
                    if (!this.pushedContent ||
              this.pushedContent.timestamp !== response.result.timestamp) {
                        this.pushedContent = response.result
                        this.$notification.info({
                            message: '老师推送了新内容',
                            description: `类型：${this.getContentTypeName(response.result.type)}`,
                            duration: 5
                        })
                    }
                }
            } catch (error) {
                console.error('检查推送内容失败:', error)
            }
        },

        async joinClassroom () {
            this.joiningClassroom = true
            try {
                const response = await postAction('/student/lesson/join', {
                    studentId: this.userInfo && this.userInfo.id,
                    classId: (this.userInfo && this.userInfo.classId) || 'class-1'
                })

                if (response.success) {
                    this.$message.success('成功加入课堂')
                    // 跳转到在线教室
                    this.$router.push(response.result.classroomUrl)
                } else {
                    this.$message.error(response.message || '加入课堂失败')
                }
            } catch (error) {
                this.$message.error('加入课堂失败')
                console.error('加入课堂失败:', error)
            } finally {
                this.joiningClassroom = false
            }
        },

        viewPushedContent () {
            this.contentModalVisible = true
        },

        applyPushedContent () {
            // 将推送内容应用到编程环境
            this.$router.push({
                path: '/student/programming',
                query: {
                    pushedContent: JSON.stringify(this.pushedContent)
                }
            })
            this.contentModalVisible = false
        },

        viewHomework (homework) {
            this.$router.push(`/student/homework/${homework.id}/view`)
        },

        getContentTypeName (type) {
            const types = {
                'code': '代码示例',
                'exercise': '练习题目',
                'material': '学习资料'
            }
            return types[type] || '未知内容'
        },

        getProgressColor (ratio) {
            if (ratio >= 0.8) return '#52c41a'
            if (ratio >= 0.6) return '#1890ff'
            if (ratio >= 0.4) return '#fa8c16'
            return '#ff4d4f'
        },

        getHomeworkStatusColor (status) {
            const colors = {
                'pending': 'orange',
                'submitted': 'blue',
                'completed': 'green'
            }
            return colors[status] || 'default'
        },

        getHomeworkStatusText (status) {
            const texts = {
                'pending': '待完成',
                'submitted': '已提交',
                'completed': '已完成'
            }
            return texts[status] || '未知'
        },

        formatTime (timeString) {
            return timeString ? moment(timeString).format('MM-DD HH:mm') : '-'
        }
    }
}
</script>

<style scoped>
.student-home {
  padding: 24px;
}

.welcome-section {
  margin-bottom: 16px;
}

.welcome-header {
  display: flex;
  align-items: center;
}

.welcome-info {
  margin-left: 16px;
}

.welcome-info h2 {
  margin: 0;
  color: #1890ff;
}

.welcome-info p {
  margin: 8px 0 0 0;
  color: #666;
}

.current-lesson {
  padding: 16px;
}

.no-lesson {
  text-align: center;
  padding: 40px 20px;
}

.pushed-content {
  background: #f6ffed;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #b7eb8f;
}

.content-preview {
  margin-top: 8px;
}

.progress-item {
  margin-bottom: 16px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-text {
  color: #666;
  font-size: 12px;
}

.content-display {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 6px;
  max-height: 300px;
  overflow-y: auto;
}

.content-display pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
