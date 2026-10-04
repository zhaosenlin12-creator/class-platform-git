<template>
  <div class="student-home">
    <a-row :gutter="16" class="welcome-section">
      <a-col :span="24">
        <a-card>
          <div class="welcome-header">
            <a-avatar size="large" :src="sanitizedAvatar" icon="user" />
            <div class="welcome-info">
              <h2>欢迎回来,{{ safeUserName }}!</h2>
              <p>今天也要努力学习编程哦</p>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" class="stats-section">
      <a-col :span="6">
        <a-card>
          <a-statistic title="已学课程" :value="stats.completedCourses" suffix="门" />
          <div slot="prefix">
            <a-icon type="book" style="color: #52c41a" />
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="进行中课程" :value="stats.activeCourses" suffix="门" />
          <div slot="prefix">
            <a-icon type="play-circle" style="color: #1890ff" />
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="待提交作业" :value="stats.pendingHomework" suffix="个" />
          <div slot="prefix">
            <a-icon type="file-text" style="color: #fa8c16" />
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="学习时长" :value="stats.studyHours" suffix="小时" />
          <div slot="prefix">
            <a-icon type="clock-circle" style="color: #722ed1" />
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 课堂快速入口 -->
    <a-row :gutter="16" style="margin-top: 16px;">
      <a-col :span="24">
        <a-card>
          <div slot="title">
            <a-icon type="video-camera" />
            课堂快速入口
          </div>
          <div slot="extra">
            <a-button type="link" @click="goToClassrooms">查看全部课堂 <a-icon type="arrow-right" /></a-button>
          </div>

          <!-- 只显示正在进行的课堂 -->
          <a-empty v-if="!classrooms.ongoing || classrooms.ongoing.length === 0" description="暂无进行中的课堂">
            <a-button type="primary" @click="goToClassrooms">
              <a-icon type="video-camera" /> 查看我的课堂
            </a-button>
          </a-empty>

          <a-list v-else :data-source="classrooms.ongoing" :grid="{ gutter: 16, column: 3 }">
            <a-list-item slot="renderItem" slot-scope="item">
              <a-card hoverable class="classroom-quick-card">
                <div class="classroom-status">
                  <a-badge status="processing" text="正在上课" />
                </div>
                <h3>{{ item.title }}</h3>
                <p><a-icon type="team" /> {{ item.className }}</p>
                <p><a-icon type="user" /> {{ item.teacherName }}</p>
                <p><a-icon type="book" /> {{ item.lessonName || '无' }}</p>
                <a-button type="primary" size="large" block @click="enterClassroom(item.id)" style="margin-top: 12px;">
                  <a-icon type="login" /> 立即进入
                </a-button>
              </a-card>
            </a-list-item>
          </a-list>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" class="content-section">
      <a-col :span="24">
        <a-card title="待完成作业" extra="查看全部">
          <div class="homework-list">
            <div v-for="homework in pendingHomeworkList" :key="homework.id" class="homework-item">
              <a-row :gutter="8" align="middle">
                <a-col :span="16">
                  <h4>{{ safe(homework.homeworkTitle) }}</h4>
                  <p>课程:{{ safe(homework.courseName) }}</p>
                  <p class="deadline">截止时间:{{ homework.deadline }}</p>
                </a-col>
                <a-col :span="8">
                  <a-button type="primary" size="small" @click="goToHomeworkDetail(homework.id)">
                    去完成
                  </a-button>
                </a-col>
              </a-row>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" class="quick-actions">
      <a-col :span="24">
        <a-card title="快速导航">
          <a-row :gutter="16">
            <a-col :span="8">
              <div class="quick-action" @click="goToClassrooms">
                <a-icon type="video-camera" style="font-size: 32px; color: #1890ff" />
                <h3>我的课堂</h3>
                <p>查看所有课堂</p>
              </div>
            </a-col>
            <a-col :span="8">
              <div class="quick-action" @click="goToHomework">
                <a-icon type="edit" style="font-size: 32px; color: #faad14" />
                <h3>我的作业</h3>
                <p>完成作业任务</p>
              </div>
            </a-col>
            <a-col :span="8">
              <div class="quick-action" @click="goToWorks">
                <a-icon type="picture" style="font-size: 32px; color: #f5222d" />
                <h3>我的作品</h3>
                <p>查看我的作品</p>
              </div>
            </a-col>
          </a-row>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { sanitizeInput } from '@/utils/security'

export default {
    name: 'StudentHome',
    data () {
        return {
            stats: {
                completedCourses: 0,
                activeCourses: 0,
                pendingHomework: 0,
                studyHours: 0
            },
            pendingHomeworkList: [],
            classrooms: {
                ongoing: [],
                upcoming: [],
                finished: []
            }
        }
    },
    mounted () {
        this.bootstrapHome()
    },
    computed: {
        ...mapGetters(['userInfo']),

        /**
     * 安全的头像URL
     */
        sanitizedAvatar () {
            if (!this.userInfo || !this.userInfo.avatar) return '/logo.png'
            const url = this.userInfo.avatar
            // 简单验证URL格式
            if (!/^https?:\/\/.+/.test(url)) return '/logo.png'
            return url
        },

        /**
     * 安全的用户名
     */
        safeUserName () {
            if (!this.userInfo) return '学员'
            const name = this.userInfo.realName || this.userInfo.username || '学员'
            return sanitizeInput(name, { maxLength: 50 })
        }
    },
    methods: {
        async bootstrapHome () {
            await Promise.allSettled([
                this.loadMyClassrooms(),
                this.loadPendingHomework()
            ])
            this.recalculateDashboardStats()
        },

        /**
     * 清理用户输入文本
     */
        safe (text) {
            return sanitizeInput(text, { maxLength: 100 })
        },

        buildLearningBucket (items) {
            return Array.isArray(items) ? items.filter(Boolean) : []
        },

        estimateClassroomMinutes (item) {
            const explicitDuration = Number(item && item.duration)
            if (Number.isFinite(explicitDuration) && explicitDuration > 0) {
                return explicitDuration
            }

            const startTime = item && item.startTime ? new Date(item.startTime) : null
            const endTime = item && item.endTime ? new Date(item.endTime) : null
            if (startTime && endTime && !Number.isNaN(startTime.getTime()) && !Number.isNaN(endTime.getTime())) {
                const diffMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000)
                return diffMinutes > 0 ? diffMinutes : 0
            }

            return 0
        },

        recalculateDashboardStats () {
            const ongoing = this.buildLearningBucket(this.classrooms.ongoing)
            const upcoming = this.buildLearningBucket(this.classrooms.upcoming)
            const finished = this.buildLearningBucket(this.classrooms.finished)
            const totalMinutes = [...ongoing, ...upcoming, ...finished].reduce(
                (sum, item) => sum + this.estimateClassroomMinutes(item),
                0
            )

            this.stats = {
                ...this.stats,
                completedCourses: finished.length,
                activeCourses: ongoing.length + upcoming.length,
                studyHours: Number((totalMinutes / 60).toFixed(1))
            }
        },

        /**
     * 获取安全的图片URL
     */
        getSafeImageUrl (url) {
            // 默认课程封面（使用内联SVG数据URI）
            const defaultCover = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiB2aWV3Qm94PSIwIDAgMjAwIDE1MCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNlOGY0ZmQiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjQwIiBmaWxsPSIjMTg5MGZmIj7wn5ONPC90ZXh0Pjwvc3ZnPg=='
            if (!url) return defaultCover
            if (!/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(url)) {
                return defaultCover
            }
            return url
        },

        goToCourse (courseId) {
            this.$router.push({ path: `/student/courses/${courseId}` })
        },

        goToHomeworkDetail (homeworkId) {
            this.$router.push({ path: `/student/homework/${homeworkId}` })
        },

        goToClassrooms () {
            this.$router.push({ path: '/student/classrooms' })
        },

        goToHomework () {
            this.$router.push({ path: '/student/homework' })
        },

        goToProgramming () {
            this.$router.push({ path: '/student/programming' })
        },

        goToWorks () {
            this.$router.push({ path: '/student/works' })
        },

        /**
     * 加载学生的课堂列表
     */
        async loadMyClassrooms () {
            try {
                const { getAction } = require('@/api/manage')
                const res = await getAction('/teaching/classroom/student/my-classrooms')

                if (res && res.success) {
                    this.classrooms = res.result || { ongoing: [], upcoming: [], finished: [] }
                    this.recalculateDashboardStats()
                } else {
                    this.$message.warning(res.message || '加载课堂列表失败')
                }
            } catch (_) {
                this.$message.error('加载课堂列表异常')
            }
        },

        /**
     * 加载待提交作业列表
     */
        async loadPendingHomework () {
            try {
                const { getStudentHomework } = require('@/api/homework')
                const res = await getStudentHomework({ pageNo: 1, pageSize: 10, status: 'pending' })

                if (res && res.success) {
                    const homeworks = res.result.records || []
                    this.pendingHomeworkList = homeworks.slice(0, 2) // 只显示前2个
                    this.stats.pendingHomework = homeworks.length
                }
            } catch (_) {}
        },

        /**
     * 进入课堂
     */
        enterClassroom (classroomId) {
            this.$router.push({
                path: `/classroom/online/${classroomId}`,
                query: {
                    role: 'student'
                }
            })
        },

        /**
     * 格式化时间
     */
        formatTime (time) {
            if (!time) return '-'
            const date = new Date(time)
            return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
        }
    }
}
</script>

<style scoped lang="less">
.student-home {
  padding: 24px;
  background: #f0f2f5;
  min-height: calc(100vh - 64px);

  .welcome-section {
    margin-bottom: 24px;

    .welcome-header {
      display: flex;
      align-items: center;
      padding: 16px 0;

      .welcome-info {
        margin-left: 16px;

        h2 {
          margin: 0;
          color: #1890ff;
        }

        p {
          margin: 4px 0 0 0;
          color: #666;
        }
      }
    }
  }

  .stats-section {
    margin-bottom: 24px;

    .ant-card {
      text-align: center;
    }
  }

  .content-section {
    margin-bottom: 24px;

    .course-list, .homework-list {
      .course-item, .homework-item {
        padding: 12px 0;
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }

        h4 {
          margin: 0 0 4px 0;
          font-size: 14px;
        }

        p {
          margin: 0;
          font-size: 12px;
          color: #666;

          &.deadline {
            color: #fa8c16;
          }
        }

        .course-thumbnail {
          width: 40px;
          height: 30px;
          object-fit: cover;
          border-radius: 4px;
        }
      }
    }
  }

  .quick-actions {
    .quick-action {
      text-align: center;
      padding: 24px;
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        border-color: #1890ff;
        box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
        transform: translateY(-2px);
      }

      h3 {
        margin: 12px 0 4px 0;
        font-size: 16px;
      }

      p {
        margin: 0;
        color: #666;
        font-size: 12px;
      }
    }
  }

  .classroom-quick-card {
    text-align: center;

    .classroom-status {
      margin-bottom: 12px;
    }

    h3 {
      margin: 8px 0;
      font-size: 16px;
      font-weight: 600;
      color: #52c41a;
    }

    p {
      margin: 4px 0;
      font-size: 14px;
      color: #666;

      .anticon {
        margin-right: 4px;
        color: #1890ff;
      }
    }
  }
}
</style>
