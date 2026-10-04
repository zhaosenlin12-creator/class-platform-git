<template>
  <div class="student-classroom-list">
    <a-card title="我的课堂" :bordered="false">
      <div slot="extra">
        <a-button @click="loadClassrooms" icon="reload">刷新</a-button>
      </div>

      <!-- 统计卡片 -->
      <a-row :gutter="16" class="stats-row">
        <a-col :span="8">
          <a-statistic title="进行中的课堂" :value="stats.ongoing" :value-style="{ color: '#52c41a' }">
            <template #prefix>
              <a-icon type="play-circle" />
            </template>
          </a-statistic>
        </a-col>
        <a-col :span="8">
          <a-statistic title="即将开始" :value="stats.scheduled">
            <template #prefix>
              <a-icon type="clock-circle" />
            </template>
          </a-statistic>
        </a-col>
        <a-col :span="8">
          <a-statistic title="已完成" :value="stats.ended">
            <template #prefix>
              <a-icon type="check-circle" />
            </template>
          </a-statistic>
        </a-col>
      </a-row>

      <a-divider />

      <!-- 课堂列表Tab -->
      <a-tabs v-model="activeTab" @change="handleTabChange">
        <!-- 进行中的课堂 -->
        <a-tab-pane key="ongoing" tab="进行中">
          <template #tab>
            <span>
              <a-badge :count="stats.ongoing" :offset="[10, 0]">
                <a-icon type="video-camera" />
                进行中
              </a-badge>
            </span>
          </template>
          <a-list
            :data-source="ongoingClassrooms"
            :loading="loading"
            :locale="{ emptyText: '暂无进行中的课堂' }"
          >
            <a-list-item slot="renderItem" slot-scope="classroom">
              <a-card hoverable class="classroom-card ongoing">
                <div class="classroom-header">
                  <a-tag color="green">进行中</a-tag>
                  <h3>{{ classroom.title }}</h3>
                </div>
                <div class="classroom-info">
                  <p><a-icon type="book" /> 课程: {{ classroom.courseName }}</p>
                  <p><a-icon type="user" /> 教师: {{ classroom.teacherName }}</p>
                  <p><a-icon type="team" /> 班级: {{ classroom.className }}</p>
                  <p><a-icon type="clock-circle" /> 开始时间: {{ classroom.startTime }}</p>
                  <p><a-icon type="info-circle" /> {{ classroom.description }}</p>
                  <p><a-icon type="usergroup-add" /> 已加入: {{ classroom.currentStudents }}/{{ classroom.maxStudents }}</p>
                </div>
                <div class="classroom-actions">
                  <a-button type="primary" size="large" @click="joinClassroom(classroom)" block>
                    <a-icon type="login" />
                    立即加入课堂
                  </a-button>
                </div>
              </a-card>
            </a-list-item>
          </a-list>
        </a-tab-pane>

        <!-- 即将开始的课堂 -->
        <a-tab-pane key="scheduled" tab="即将开始">
          <template #tab>
            <span>
              <a-badge :count="stats.scheduled" :offset="[10, 0]">
                <a-icon type="clock-circle" />
                即将开始
              </a-badge>
            </span>
          </template>
          <a-list
            :data-source="scheduledClassrooms"
            :loading="loading"
            :locale="{ emptyText: '暂无即将开始的课堂' }"
          >
            <a-list-item slot="renderItem" slot-scope="classroom">
              <a-card hoverable class="classroom-card scheduled">
                <div class="classroom-header">
                  <a-tag color="blue">即将开始</a-tag>
                  <h3>{{ classroom.title }}</h3>
                </div>
                <div class="classroom-info">
                  <p><a-icon type="book" /> 课程: {{ classroom.courseName }}</p>
                  <p><a-icon type="user" /> 教师: {{ classroom.teacherName }}</p>
                  <p><a-icon type="team" /> 班级: {{ classroom.className }}</p>
                  <p><a-icon type="clock-circle" /> 开始时间: {{ classroom.startTime }}</p>
                  <p><a-icon type="info-circle" /> {{ classroom.description }}</p>
                </div>
                <div class="classroom-actions">
                  <a-button disabled size="large" block>
                    <a-icon type="clock-circle" />
                    等待开始
                  </a-button>
                </div>
              </a-card>
            </a-list-item>
          </a-list>
        </a-tab-pane>

        <!-- 已结束的课堂 -->
        <a-tab-pane key="ended" tab="已结束">
          <template #tab>
            <span>
              <a-icon type="check-circle" />
              已结束
            </span>
          </template>
          <a-list
            :data-source="endedClassrooms"
            :loading="loading"
            :locale="{ emptyText: '暂无已结束的课堂' }"
          >
            <a-list-item slot="renderItem" slot-scope="classroom">
              <a-card hoverable class="classroom-card ended">
                <div class="classroom-header">
                  <a-tag color="default">已结束</a-tag>
                  <h3>{{ classroom.title }}</h3>
                </div>
                <div class="classroom-info">
                  <p><a-icon type="book" /> 课程: {{ classroom.courseName }}</p>
                  <p><a-icon type="user" /> 教师: {{ classroom.teacherName }}</p>
                  <p><a-icon type="team" /> 班级: {{ classroom.className }}</p>
                  <p><a-icon type="clock-circle" /> 时间: {{ classroom.startTime }} ~ {{ classroom.endTime }}</p>
                  <p><a-icon type="info-circle" /> {{ classroom.description }}</p>
                </div>
                <div class="classroom-actions">
                  <a-button @click="viewClassroomDetail(classroom)" block>
                    <a-icon type="eye" />
                    查看回放
                  </a-button>
                </div>
              </a-card>
            </a-list-item>
          </a-list>
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script>
const runtimeConsole = typeof window !== 'undefined' && window.console
    ? window.console
    : global.console

const console = typeof window !== 'undefined' && window.__APP_DEBUG__ === true
    ? runtimeConsole
    : {
        log () {},
        warn () {},
        error (...args) {
            return runtimeConsole && runtimeConsole.error
                ? runtimeConsole.error(...args)
                : undefined
        }
    }

export default {
    name: 'StudentClassroomList',
    data () {
        return {
            loading: false,
            activeTab: 'ongoing',
            classrooms: [],
            stats: {
                ongoing: 0,
                scheduled: 0,
                ended: 0
            }
        }
    },
    computed: {
    // 进行中的课堂
        ongoingClassrooms () {
            return this.classrooms.filter(c => c.status === 'ongoing')
        },
        // 即将开始的课堂
        scheduledClassrooms () {
            return this.classrooms.filter(c => c.status === 'scheduled')
        },
        // 已结束的课堂
        endedClassrooms () {
            return this.classrooms.filter(c => c.status === 'ended')
        },
        // 获取当前用户信息
        userInfo () {
            return this.$store.getters.userInfo || {}
        }
    },
    mounted () {
        this.loadClassrooms()
    },
    methods: {
    // 加载课堂列表
        async loadClassrooms () {
            this.loading = true
            try {
                const { getAction } = require('@/api/manage')
                const res = await getAction('/teaching/classroom/student/my-classrooms')

                if (res && res.success) {
                    // 处理返回的数据结构
                    const data = res.result || { ongoing: [], upcoming: [], finished: [] }

                    // 将数据转换为统一格式
                    this.classrooms = []

                    // 进行中的课堂
                    if (data.ongoing && data.ongoing.length > 0) {
                        data.ongoing.forEach(c => {
                            this.classrooms.push({
                                ...c,
                                status: 'ongoing'
                            })
                        })
                    }

                    // 即将开始的课堂
                    if (data.upcoming && data.upcoming.length > 0) {
                        data.upcoming.forEach(c => {
                            this.classrooms.push({
                                ...c,
                                status: 'scheduled'
                            })
                        })
                    }

                    // 已结束的课堂
                    if (data.finished && data.finished.length > 0) {
                        data.finished.forEach(c => {
                            this.classrooms.push({
                                ...c,
                                status: 'ended'
                            })
                        })
                    }

                    this.updateStats()
                    console.log('✅ [CLASSROOM LIST] 课堂列表加载成功:', this.classrooms)
                } else {
                    console.warn('⚠️ [CLASSROOM LIST] 课堂列表加载失败:', res)
                    this.$message.warning((res && res.message) || '加载课堂列表失败')
                }
            } catch (error) {
                console.error('❌ [CLASSROOM LIST] 加载课堂列表异常:', error)
                this.$message.error('加载课堂列表异常')
            } finally {
                this.loading = false
            }
        },

        // 更新统计
        updateStats () {
            this.stats.ongoing = this.ongoingClassrooms.length
            this.stats.scheduled = this.scheduledClassrooms.length
            this.stats.ended = this.endedClassrooms.length
        },

        // 切换Tab
        handleTabChange (key) {
        },

        // 加入课堂
        async joinClassroom (classroom) {
            try {
                console.log('🚪 [CLASSROOM LIST] 进入课堂:', classroom.id)

                // 直接跳转到在线课堂页面（统一入口）
                this.$router.push({
                    path: `/classroom/online/${classroom.id}`,
                    query: {
                        role: 'student'
                    }
                })
            } catch (error) {
                console.error('❌ [CLASSROOM LIST] 加入课堂失败:', error)
                this.$message.error('加入课堂失败: ' + (error.message || '网络错误'))
            }
        },

        // 查看课堂详情/回放
        viewClassroomDetail (classroom) {
            try {
                console.log('👁️ [CLASSROOM LIST] 查看回放:', classroom.id)

                // 进入课堂查看历史记录（和加入课堂一样的页面，只是课堂状态不同）
                this.$router.push({
                    path: `/classroom/online/${classroom.id}`,
                    query: {
                        role: 'student',
                        replay: true // 标记为回放模式
                    }
                })
            } catch (error) {
                console.error('❌ [CLASSROOM LIST] 查看回放失败:', error)
                this.$message.error('查看回放失败: ' + (error.message || '网络错误'))
            }
        }
    }
}
</script>

<style scoped lang="less">
.student-classroom-list {
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;

  .stats-row {
    margin-bottom: 24px;
  }

  .classroom-card {
    margin-bottom: 16px;
    border-left: 4px solid #1890ff;

    &.ongoing {
      border-left-color: #52c41a;
    }

    &.scheduled {
      border-left-color: #1890ff;
    }

    &.ended {
      border-left-color: #d9d9d9;
    }

    .classroom-header {
      display: flex;
      align-items: center;
      margin-bottom: 16px;

      h3 {
        margin: 0 0 0 12px;
        font-size: 18px;
        font-weight: 600;
      }
    }

    .classroom-info {
      margin-bottom: 16px;

      p {
        margin: 8px 0;
        color: #666;
        font-size: 14px;

        .anticon {
          margin-right: 8px;
          color: #1890ff;
        }
      }
    }

    .classroom-actions {
      margin-top: 16px;
    }
  }

  /deep/ .ant-list-item {
    padding: 0;
    border: none;
  }
}
</style>
