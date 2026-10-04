<template>
  <div class="simple-classroom">
    <!-- 教室列表和管理 -->
    <div class="classroom-header">
      <a-card title="我的教室" size="small">
        <template #extra>
          <a-button type="primary" @click="createClassroom">创建教室</a-button>
        </template>

        <a-list :data-source="classrooms" size="small">
          <template #renderItem="{ item }">
            <a-list-item>
              <template #actions>
                <a-button size="small" type="primary" @click="enterClassroom(item)">
                  {{ item.status === 'active' ? '进入教室' : item.status === 'ended' ? '查看回放' : '开始上课' }}
                </a-button>
                <a-button size="small" @click="endClass(item)" v-if="item.status === 'active'">结束</a-button>
              </template>

              <a-list-item-meta>
                <template #title>
                  {{ item.roomName || '未命名教室' }}
                  <a-tag :color="getStatusColor(item.status)">{{ getStatusText(item.status) }}</a-tag>
                </template>
                <template #description>
                  {{ item.courseName || '未指定课程' }} - {{ item.className || '未指定班级' }}
                </template>
              </a-list-item-meta>
            </a-list-item>
          </template>
        </a-list>
      </a-card>
    </div>

    <!-- 创建教室对话框 -->
    <a-modal
      v-model="createVisible"
      title="创建教室"
      @ok="handleCreateClassroom"
      @cancel="createVisible = false"
      :confirmLoading="creating"
    >
      <a-form :form="createForm" layout="vertical">
        <a-form-item label="教室名称">
          <a-input
            v-decorator="['roomName', { rules: [{ required: true, message: '请输入教室名称' }] }]"
            placeholder="请输入教室名称"
          />
        </a-form-item>
        <a-form-item label="选择班级">
          <a-select
            v-decorator="['classId', { rules: [{ required: true, message: '请选择班级' }] }]"
            placeholder="请选择班级"
          >
            <a-select-option v-for="cls in classList" :key="cls.id" :value="cls.id">
              {{ cls.className }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="选择课程">
          <a-select
            v-decorator="['courseId', { rules: [{ required: true, message: '请选择课程' }] }]"
            placeholder="请选择课程"
          >
            <a-select-option v-for="course in courseList" :key="course.id" :value="course.id">
              {{ course.courseName }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { classroomApi, classApi, courseApi } from '@/api/teaching'

export default {
    name: 'SimpleClassroom',
    data () {
        return {
            loading: false,
            classrooms: [],
            classList: [],
            courseList: [],
            createVisible: false,
            creating: false,
            createForm: this.$form.createForm(this)
        }
    },

    mounted () {
        this.loadData()
    },

    methods: {
        async loadData () {
            this.loading = true
            try {
                await Promise.all([
                    this.loadClassrooms(),
                    this.loadClasses(),
                    this.loadCourses()
                ])
            } catch (error) {
                console.error('加载数据失败:', error)
            } finally {
                this.loading = false
            }
        },

        async loadClassrooms () {
            try {
                const response = await classroomApi.getClassroomList()
                if (response.success) {
                    this.classrooms = response.result.records || []
                }
            } catch (error) {
                console.error('加载教室失败:', error)
                // 使用模拟数据
                this.classrooms = [
                    {
                        id: '1',
                        roomName: 'Scratch编程教室',
                        className: '小学编程1班',
                        courseName: 'Scratch创意编程',
                        status: 'scheduled'
                    }
                ]
            }
        },

        async loadClasses () {
            try {
                const response = await classApi.getClassList()
                if (response.success) {
                    this.classList = response.result.records || []
                }
            } catch (error) {
                console.error('加载班级失败:', error)
            }
        },

        async loadCourses () {
            try {
                const response = await courseApi.getCourseList()
                if (response.success) {
                    this.courseList = response.result.records || []
                }
            } catch (error) {
                console.error('加载课程失败:', error)
            }
        },

        createClassroom () {
            this.createVisible = true
        },

        async handleCreateClassroom () {
            this.createForm.validateFields(async (err, values) => {
                if (!err) {
                    this.creating = true
                    try {
                        const selectedClass = this.classList.find(c => c.id === values.classId)
                        const selectedCourse = this.courseList.find(c => c.id === values.courseId)

                        const classroomData = {
                            roomName: values.roomName,
                            classId: values.classId,
                            className: selectedClass ? selectedClass.className : '',
                            courseId: values.courseId,
                            courseName: selectedCourse ? selectedCourse.courseName : '',
                            status: 'scheduled'
                        }

                        const response = await classroomApi.createClassroom(classroomData)
                        if (response.success) {
                            this.$message.success('教室创建成功')
                            this.createVisible = false
                            this.createForm.resetFields()
                            this.loadClassrooms()
                        }
                    } catch (error) {
                        console.error('创建教室失败:', error)
                        this.$message.error('创建失败，请重试')
                    } finally {
                        this.creating = false
                    }
                }
            })
        },

        async enterClassroom (classroom) {
            // 如果是已结束的课堂，直接进入查看（不需要重新开始）
            if (classroom.status === 'ended') {
                this.$message.info('进入课堂回放模式')
                this.$router.push({
                    path: `/classroom/online/${classroom.id}`,
                    query: {
                        role: 'teacher'
                    }
                })
                return
            }

            // 如果不是进行中的课堂，开始上课
            if (classroom.status !== 'active') {
                try {
                    const response = await classroomApi.startClassroom(classroom.id)
                    if (response.success) {
                        classroom.status = 'active'
                        this.$message.success('课程开始成功')
                    }
                } catch (error) {
                    console.error('开始课程失败:', error)
                    this.$message.error('开始课程失败')
                    return
                }
            }

            // 进入教学界面（使用统一的在线教室）
            this.$router.push({
                path: `/classroom/online/${classroom.id}`,
                query: {
                    role: 'teacher'
                }
            })
        },

        async endClass (classroom) {
            try {
                const response = await classroomApi.endClassroom(classroom.id)
                if (response.success) {
                    classroom.status = 'ended'
                    this.$message.success('课程结束成功')
                }
            } catch (error) {
                console.error('结束课程失败:', error)
                this.$message.error('结束课程失败')
            }
        },

        getStatusColor (status) {
            const colors = {
                scheduled: 'blue',
                active: 'green',
                ended: 'red'
            }
            return colors[status] || 'default'
        },

        getStatusText (status) {
            const texts = {
                scheduled: '待开始',
                active: '进行中',
                ended: '已结束'
            }
            return texts[status] || '未知'
        }
    }
}
</script>

<style scoped>
.simple-classroom {
  padding: 24px;
}

.classroom-header {
  margin-bottom: 24px;
}
</style>
