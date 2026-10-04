<template>
  <div class="teacher-schedule">
    <a-row :gutter="16">
      <a-col :span="18">
        <a-card title="课程安排" :bordered="false">
          <template slot="extra">
            <a-button type="primary" @click="showCreateModal">
              <a-icon type="plus" />
              创建课程安排
            </a-button>
          </template>

          <!-- 日期选择器 -->
          <div style="margin-bottom: 16px">
            <a-date-picker
              v-model="selectedDate"
              placeholder="选择日期"
              @change="loadSchedules"
              style="margin-right: 16px"
            />
            <a-button @click="loadSchedules">刷新</a-button>
          </div>

          <!-- 课程安排列表 -->
          <a-table
            :columns="scheduleColumns"
            :dataSource="schedules"
            :loading="loading"
            row-key="id"
          >
            <template slot="status" slot-scope="text">
              <a-tag :color="getStatusColor(text)">
                {{ getStatusText(text) }}
              </a-tag>
            </template>

            <template slot="action" slot-scope="text, record">
              <a-space>
                <a-button
                  v-if="record.status === 'scheduled'"
                  type="primary"
                  size="small"
                  @click="startLesson(record)"
                >
                  开始上课
                </a-button>
                <a-button
                  v-if="record.status === 'active'"
                  type="danger"
                  size="small"
                  @click="endLesson(record)"
                >
                  结束上课
                </a-button>
                <a-button
                  v-if="record.status === 'active'"
                  size="small"
                  @click="enterClassroom(record)"
                >
                  进入教室
                </a-button>
              </a-space>
            </template>
          </a-table>
        </a-card>
      </a-col>

      <a-col :span="6">
        <a-card title="当前上课情况" :bordered="false">
          <div v-if="currentLesson">
            <p><strong>课程：</strong>{{ currentLesson.title }}</p>
            <p><strong>班级：</strong>{{ currentLesson.className }}</p>
            <p><strong>开始时间：</strong>{{ formatTime(currentLesson.actualStartTime) }}</p>
            <p><strong>在线学生：</strong>{{ currentLesson.activeStudents || 0 }}人</p>

            <a-divider />

            <a-button
              type="primary"
              block
              @click="enterClassroom(currentLesson)"
              style="margin-bottom: 8px"
            >
              进入教室
            </a-button>

            <a-button
              type="danger"
              block
              @click="endLesson(currentLesson)"
            >
              结束上课
            </a-button>
          </div>
          <div v-else class="empty-state">
            <a-icon type="calendar" style="font-size: 48px; color: #ccc;" />
            <p style="margin-top: 16px; color: #999;">当前没有进行中的课程</p>
          </div>
        </a-card>

        <a-card title="今日统计" :bordered="false" style="margin-top: 16px">
          <a-statistic title="今日课程" :value="todayStats.totalLessons" />
          <a-statistic title="已完成" :value="todayStats.completedLessons" style="margin-top: 16px" />
          <a-statistic title="参与学生" :value="todayStats.totalStudents" style="margin-top: 16px" />
        </a-card>
      </a-col>
    </a-row>

    <!-- 创建课程安排模态框 -->
    <a-modal
      title="创建课程安排"
      :visible="createModalVisible"
      @ok="createSchedule"
      @cancel="createModalVisible = false"
      :confirmLoading="createLoading"
    >
      <a-form-model
        ref="createForm"
        :model="createForm"
        :rules="createRules"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 18 }"
      >
        <a-form-model-item label="课程标题" prop="title">
          <a-input v-model="createForm.title" placeholder="请输入课程标题" />
        </a-form-model-item>

        <a-form-model-item label="选择班级" prop="classId">
          <a-select v-model="createForm.classId" placeholder="请选择班级">
            <a-select-option value="class-1">编程一班</a-select-option>
            <a-select-option value="class-2">编程二班</a-select-option>
            <a-select-option value="class-3">编程三班</a-select-option>
          </a-select>
        </a-form-model-item>

        <a-form-model-item label="选择课程" prop="courseId">
          <a-select v-model="createForm.courseId" placeholder="请选择课程">
            <a-select-option value="course-1">Scratch基础编程</a-select-option>
            <a-select-option value="course-2">Python编程基础</a-select-option>
          </a-select>
        </a-form-model-item>

        <a-form-model-item label="开始时间" prop="startTime">
          <a-date-picker
            v-model="createForm.startTime"
            show-time
            placeholder="选择开始时间"
            style="width: 100%"
          />
        </a-form-model-item>

        <a-form-model-item label="结束时间" prop="endTime">
          <a-date-picker
            v-model="createForm.endTime"
            show-time
            placeholder="选择结束时间"
            style="width: 100%"
          />
        </a-form-model-item>
      </a-form-model>
    </a-modal>
  </div>
</template>

<script>
import moment from 'moment'
import { getAction, postAction } from '@/api/manage'

export default {
    name: 'TeacherScheduleFixed',
    data () {
        return {
            selectedDate: moment(),
            schedules: [],
            currentLesson: null,
            loading: false,
            createModalVisible: false,
            createLoading: false,
            createForm: {
                title: '',
                classId: '',
                courseId: '',
                startTime: null,
                endTime: null
            },
            createRules: {
                title: [
                    { required: true, message: '请输入课程标题', trigger: 'blur' }
                ],
                classId: [
                    { required: true, message: '请选择班级', trigger: 'change' }
                ],
                courseId: [
                    { required: true, message: '请选择课程', trigger: 'change' }
                ],
                startTime: [
                    { required: true, message: '请选择开始时间', trigger: 'change' }
                ],
                endTime: [
                    { required: true, message: '请选择结束时间', trigger: 'change' }
                ]
            },
            scheduleColumns: [
                {
                    title: '课程标题',
                    dataIndex: 'title',
                    key: 'title'
                },
                {
                    title: '班级',
                    dataIndex: 'className',
                    key: 'className'
                },
                {
                    title: '开始时间',
                    dataIndex: 'startTime',
                    key: 'startTime',
                    customRender: (text) => this.formatTime(text)
                },
                {
                    title: '结束时间',
                    dataIndex: 'endTime',
                    key: 'endTime',
                    customRender: (text) => this.formatTime(text)
                },
                {
                    title: '状态',
                    dataIndex: 'status',
                    key: 'status',
                    scopedSlots: { customRender: 'status' }
                },
                {
                    title: '操作',
                    key: 'action',
                    scopedSlots: { customRender: 'action' }
                }
            ],
            todayStats: {
                totalLessons: 0,
                completedLessons: 0,
                totalStudents: 0
            }
        }
    },

    mounted () {
        this.loadSchedules()
        this.loadTodayStats()
    },

    methods: {
        async loadSchedules () {
            this.loading = true
            try {
                // 使用兼容的写法替代可选链操作符
                const userInfo = this.$store.getters.userInfo
                const params = {
                    teacherId: userInfo && userInfo.id,
                    date: this.selectedDate ? this.selectedDate.format('YYYY-MM-DD') : null
                }

                const response = await getAction('/teacher/schedule/list', params)
                if (response.success) {
                    this.schedules = response.result

                    // 查找当前进行中的课程
                    this.currentLesson = this.schedules.find(s => s.status === 'active')
                }
            } catch (error) {
                this.$message.error('获取课程安排失败')
                console.error('加载课程安排失败:', error)
            } finally {
                this.loading = false
            }
        },

        showCreateModal () {
            this.createModalVisible = true
            this.createForm = {
                title: '',
                classId: '',
                courseId: '',
                startTime: null,
                endTime: null
            }
        },

        async createSchedule () {
            const form = this.$refs.createForm
            if (!form) {
                this.$message.error('表单未准备就绪')
                return
            }

            form.validate(async (valid) => {
                if (valid) {
                    this.createLoading = true
                    try {
                        const params = {
                            ...this.createForm,
                            startTime: this.createForm.startTime.toISOString(),
                            endTime: this.createForm.endTime.toISOString()
                        }

                        const response = await postAction('/teacher/schedule/create', params)
                        if (response.success) {
                            this.$message.success('课程安排创建成功')
                            this.createModalVisible = false
                            this.loadSchedules()
                        }
                    } catch (error) {
                        this.$message.error('创建课程安排失败')
                        console.error('创建课程安排失败:', error)
                    } finally {
                        this.createLoading = false
                    }
                }
            })
        },

        async startLesson (record) {
            try {
                console.log('▶️ 开始上课:', record.id)
                const response = await postAction('/teaching/schedule/start/' + record.id)

                if (response.success) {
                    this.$message.success('课程已开始')

                    // 保存返回的classroomId到record中
                    if (response.result && response.result.classroomId) {
                        record.classroomId = response.result.classroomId
                        console.log('✅ 课堂ID:', record.classroomId)
                    }

                    this.loadSchedules()

                    // 询问是否进入教室
                    this.$confirm({
                        title: '课程已开始',
                        content: '是否立即进入在线教室？',
                        onOk: () => {
                            this.enterClassroom(record)
                        }
                    })
                }
            } catch (error) {
                console.error('❌ 开始上课失败:', error)
                this.$message.error('开始上课失败')
            }
        },

        async endLesson (record) {
            this.$confirm({
                title: '确认结束上课',
                content: '确定要结束这节课吗？',
                onOk: async () => {
                    try {
                        const response = await postAction('/teacher/lesson/end', {
                            scheduleId: record.id,
                            classId: record.classId
                        })

                        if (response.success) {
                            this.$message.success('课程已结束')
                            this.loadSchedules()
                        }
                    } catch (error) {
                        this.$message.error('结束上课失败')
                        console.error('结束上课失败:', error)
                    }
                }
            })
        },

        enterClassroom (record) {
            // 跳转到在线教室（使用统一的在线教室）
            const classroomId = record.classroomId || record.classroom_id
            if (!classroomId) {
                this.$message.error('课堂ID不存在，请先开始上课')
                console.error('❌ 课堂ID不存在:', record)
                return
            }
            console.log('🚪 进入教室:', classroomId)
            this.$router.push({
                path: `/classroom/online/${classroomId}`,
                query: {
                    role: 'teacher'
                }
            })
        },

        loadTodayStats () {
            // 模拟今日统计数据
            this.todayStats = {
                totalLessons: 3,
                completedLessons: 1,
                totalStudents: 45
            }
        },

        getStatusColor (status) {
            const colors = {
                'scheduled': 'blue',
                'active': 'green',
                'completed': 'default'
            }
            return colors[status] || 'default'
        },

        getStatusText (status) {
            const texts = {
                'scheduled': '计划中',
                'active': '进行中',
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
.teacher-schedule {
  padding: 24px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.ant-space {
  display: flex;
  gap: 8px;
}

.ant-space .ant-btn {
  margin-right: 0;
}
</style>
