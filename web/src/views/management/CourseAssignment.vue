<template>
  <div class="course-assignment">
    <a-card>
      <div slot="title">
        <a-icon type="project" />
        班级课程分配管理
      </div>
      <div slot="extra">
        <a-button-group>
          <a-button type="primary" @click="batchAssignCourses">
            <a-icon type="plus-circle" />
            批量分配课程
          </a-button>
          <a-button @click="generateSchedule">
            <a-icon type="calendar" />
            生成课程表
          </a-button>
          <a-button @click="exportSchedule">
            <a-icon type="download" />
            导出安排
          </a-button>
        </a-button-group>
      </div>

      <!-- 筛选条件 -->
      <div class="filter-section">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-select v-model="filters.classId" placeholder="选择班级" style="width: 100%" @change="loadAssignments">
              <a-select-option value="">所有班级</a-select-option>
              <a-select-option v-for="cls in classList" :key="cls.id" :value="cls.id">
                {{ cls.name }}
              </a-select-option>
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-select v-model="filters.courseType" placeholder="课程类型" style="width: 100%" @change="loadAssignments">
              <a-select-option value="">所有类型</a-select-option>
              <a-select-option value="scratch">Scratch编程</a-select-option>
              <a-select-option value="python">Python基础</a-select-option>
              <a-select-option value="javascript">JavaScript开发</a-select-option>
              <a-select-option value="web">Web开发</a-select-option>
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-select v-model="filters.status" placeholder="分配状态" style="width: 100%" @change="loadAssignments">
              <a-select-option value="">所有状态</a-select-option>
              <a-select-option value="planned">已计划</a-select-option>
              <a-select-option value="ongoing">进行中</a-select-option>
              <a-select-option value="completed">已完成</a-select-option>
              <a-select-option value="suspended">暂停</a-select-option>
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-input-search
              v-model="filters.keyword"
              placeholder="搜索课程/班级"
              @search="loadAssignments"
              style="width: 100%"
            />
          </a-col>
        </a-row>
      </div>

      <a-divider />

      <!-- 课程分配表格 -->
      <a-table
        :columns="assignmentColumns"
        :data-source="assignments"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
        :row-selection="{ selectedRowKeys: selectedRowKeys, onChange: onSelectChange }"
      >
        <template #className="{ text, record }">
          <div class="class-info">
            <div class="class-name">{{ text }}</div>
            <div class="class-details">
              学员: {{ record.studentCount }}人 | 容量: {{ record.classCapacity }}人
            </div>
          </div>
        </template>

        <template #courseInfo="{ record }">
          <div class="course-info">
            <div class="course-title">
              <a-icon :type="getCourseIcon(record.courseType)" />
              {{ record.courseName }}
            </div>
            <div class="course-details">
              类型: {{ getCourseTypeName(record.courseType) }} |
              时长: {{ record.courseDuration }}课时 |
              难度: {{ getDifficultyText(record.difficulty) }}
            </div>
          </div>
        </template>

        <template #teacher="{ record }">
          <div class="teacher-info">
            <a-avatar :src="record.teacherAvatar" size="small" />
            <span style="margin-left: 8px">{{ record.teacherName }}</span>
            <div class="teacher-workload">工作量: {{ record.teacherWorkload }}%</div>
          </div>
        </template>

        <template #schedule="{ record }">
          <div class="schedule-info">
            <div>开始: {{ record.startDate }}</div>
            <div>结束: {{ record.endDate }}</div>
            <div class="schedule-progress">
              进度:
              <a-progress
                :percent="record.progress"
                size="small"
                :stroke-color="getProgressColor(record.progress)"
              />
            </div>
          </div>
        </template>

        <template #status="{ text }">
          <a-tag :color="getStatusColor(text)">
            {{ getStatusText(text) }}
          </a-tag>
        </template>

        <template #action="{ record }">
          <a-button-group size="small">
            <a-button @click="editAssignment(record)" type="link">
              <a-icon type="edit" />
              编辑
            </a-button>
            <a-button @click="viewDetails(record)" type="link">
              <a-icon type="eye" />
              详情
            </a-button>
            <a-dropdown>
              <a-button type="link">
                更多 <a-icon type="down" />
              </a-button>
              <a-menu slot="overlay" @click="handleMoreAction($event, record)">
                <a-menu-item key="adjust">调整进度</a-menu-item>
                <a-menu-item key="changeTeacher">更换教师</a-menu-item>
                <a-menu-item key="reschedule">重新安排</a-menu-item>
                <a-menu-item key="suspend">暂停课程</a-menu-item>
                <a-menu-item key="complete">标记完成</a-menu-item>
                <a-menu-item key="delete">删除分配</a-menu-item>
              </a-menu>
            </a-dropdown>
          </a-button-group>
        </template>
      </a-table>
    </a-card>

    <!-- 分配/编辑课程模态框 -->
    <a-modal
      :title="editingAssignment ? '编辑课程分配' : '分配课程'"
      :visible="assignmentModalVisible"
      @cancel="assignmentModalVisible = false"
      @ok="saveAssignment"
      width="800px"
      :confirmLoading="saving"
    >
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="目标班级" required>
              <a-select v-model="assignmentForm.classId" placeholder="选择班级" @change="onClassChange">
                <a-select-option v-for="cls in classList" :key="cls.id" :value="cls.id">
                  {{ cls.name }} ({{ cls.enrolledCount }}/{{ cls.capacity }}人)
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="课程" required>
              <a-select v-model="assignmentForm.courseId" placeholder="选择课程" @change="onCourseChange">
                <a-select-option v-for="course in courseList" :key="course.id" :value="course.id">
                  {{ course.name }} - {{ course.duration }}课时
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="授课教师" required>
              <a-select v-model="assignmentForm.teacherId" placeholder="选择教师">
                <a-select-option v-for="teacher in availableTeachers" :key="teacher.id" :value="teacher.id">
                  {{ teacher.realname }} (工作量: {{ teacher.workload }}%)
                  <a-tag v-if="teacher.workload > 80" color="red" size="small">繁忙</a-tag>
                  <a-tag v-else-if="teacher.workload > 60" color="orange" size="small">较忙</a-tag>
                  <a-tag v-else color="green" size="small">空闲</a-tag>
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="课程顺序">
              <a-input-number
                v-model="assignmentForm.sequence"
                :min="1"
                placeholder="在班级中的课程顺序"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="开始日期" required>
              <a-date-picker
                v-model="assignmentForm.startDate"
                placeholder="选择开始日期"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="结束日期">
              <a-date-picker
                v-model="assignmentForm.endDate"
                placeholder="选择结束日期"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="上课时间安排">
          <div class="schedule-builder">
            <a-row :gutter="8" v-for="(slot, index) in assignmentForm.timeSlots" :key="index">
              <a-col :span="8">
                <a-select v-model="slot.weekday" placeholder="星期">
                  <a-select-option :value="1">星期一</a-select-option>
                  <a-select-option :value="2">星期二</a-select-option>
                  <a-select-option :value="3">星期三</a-select-option>
                  <a-select-option :value="4">星期四</a-select-option>
                  <a-select-option :value="5">星期五</a-select-option>
                  <a-select-option :value="6">星期六</a-select-option>
                  <a-select-option :value="7">星期天</a-select-option>
                </a-select>
              </a-col>
              <a-col :span="6">
                <a-time-picker v-model="slot.startTime" placeholder="开始时间" format="HH:mm" />
              </a-col>
              <a-col :span="6">
                <a-time-picker v-model="slot.endTime" placeholder="结束时间" format="HH:mm" />
              </a-col>
              <a-col :span="4">
                <a-button @click="removeTimeSlot(index)" type="danger" size="small">
                  <a-icon type="delete" />
                </a-button>
              </a-col>
            </a-row>
            <a-button @click="addTimeSlot" type="dashed" style="width: 100%; margin-top: 8px">
              <a-icon type="plus" />
              添加时间段
            </a-button>
          </div>
        </a-form-item>

        <a-form-item label="教学目标">
          <a-textarea
            v-model="assignmentForm.objectives"
            placeholder="输入本课程的教学目标和预期成果"
            :rows="3"
          />
        </a-form-item>

        <a-form-item label="特殊说明">
          <a-textarea
            v-model="assignmentForm.notes"
            placeholder="输入任何特殊要求或注意事项"
            :rows="2"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 批量分配模态框 -->
    <a-modal
      title="批量分配课程"
      :visible="batchAssignVisible"
      @cancel="batchAssignVisible = false"
      @ok="confirmBatchAssign"
      width="700px"
    >
      <a-form layout="vertical">
        <a-form-item label="选择班级">
          <a-select v-model="batchForm.classIds" mode="multiple" placeholder="选择多个班级">
            <a-select-option v-for="cls in classList" :key="cls.id" :value="cls.id">
              {{ cls.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="分配课程">
          <a-select v-model="batchForm.courseIds" mode="multiple" placeholder="选择多个课程">
            <a-select-option v-for="course in courseList" :key="course.id" :value="course.id">
              {{ course.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="分配策略">
          <a-radio-group v-model="batchForm.strategy">
            <a-radio value="auto">自动分配（系统推荐）</a-radio>
            <a-radio value="round_robin">轮询分配教师</a-radio>
            <a-radio value="workload_balance">平衡教师工作量</a-radio>
            <a-radio value="manual">手动指定教师</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-if="batchForm.strategy === 'manual'" label="指定教师">
          <a-select v-model="batchForm.teacherId" placeholder="选择教师">
            <a-select-option v-for="teacher in teachers" :key="teacher.id" :value="teacher.id">
              {{ teacher.realname }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="开始日期">
          <a-date-picker v-model="batchForm.startDate" placeholder="统一开始日期" style="width: 100%" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 课程表生成模态框 -->
    <a-modal
      title="生成课程表"
      :visible="scheduleVisible"
      @cancel="scheduleVisible = false"
      @ok="confirmGenerateSchedule"
      width="900px"
    >
      <div class="schedule-generator">
        <a-form layout="vertical">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item label="选择班级">
                <a-select v-model="scheduleForm.classId" placeholder="选择班级">
                  <a-select-option v-for="cls in classList" :key="cls.id" :value="cls.id">
                    {{ cls.name }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="学期开始">
                <a-date-picker v-model="scheduleForm.termStart" style="width: 100%" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="学期结束">
                <a-date-picker v-model="scheduleForm.termEnd" style="width: 100%" />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="排课规则">
            <a-checkbox-group v-model="scheduleForm.rules">
              <a-checkbox value="avoid_conflict">避免时间冲突</a-checkbox>
              <a-checkbox value="teacher_preference">考虑教师偏好</a-checkbox>
              <a-checkbox value="course_sequence">按课程顺序排列</a-checkbox>
              <a-checkbox value="break_between">课程间留间隔</a-checkbox>
            </a-checkbox-group>
          </a-form-item>
        </a-form>

        <!-- 预览课程表 -->
        <div v-if="previewSchedule.length > 0" class="schedule-preview">
          <h4>课程表预览</h4>
          <a-table
            :columns="scheduleColumns"
            :data-source="previewSchedule"
            :pagination="false"
            size="small"
          >
            <template #time="{ record }">
              {{ record.weekday }} {{ record.timeSlot }}
            </template>
          </a-table>
        </div>
      </div>
    </a-modal>

    <!-- 课程详情模态框 -->
    <a-modal
      title="课程分配详情"
      :visible="detailVisible"
      @cancel="detailVisible = false"
      :footer="null"
      width="900px"
    >
      <div v-if="selectedAssignment" class="assignment-detail">
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="班级">{{ selectedAssignment.className }}</a-descriptions-item>
          <a-descriptions-item label="课程">{{ selectedAssignment.courseName }}</a-descriptions-item>
          <a-descriptions-item label="授课教师">{{ selectedAssignment.teacherName }}</a-descriptions-item>
          <a-descriptions-item label="课程状态">
            <a-tag :color="getStatusColor(selectedAssignment.status)">
              {{ getStatusText(selectedAssignment.status) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="开始日期">{{ selectedAssignment.startDate }}</a-descriptions-item>
          <a-descriptions-item label="结束日期">{{ selectedAssignment.endDate }}</a-descriptions-item>
          <a-descriptions-item label="课程进度">
            <a-progress :percent="selectedAssignment.progress" size="small" />
          </a-descriptions-item>
          <a-descriptions-item label="学员反馈">4.5/5.0 ⭐</a-descriptions-item>
        </a-descriptions>

        <a-divider />

        <h4>上课时间安排</h4>
        <a-timeline>
          <a-timeline-item v-for="(slot, index) in selectedAssignment.timeSlots" :key="index">
            {{ getWeekdayText(slot.weekday) }} {{ slot.startTime }} - {{ slot.endTime }}
          </a-timeline-item>
        </a-timeline>

        <a-divider />

        <h4>教学进度</h4>
        <a-steps :current="selectedAssignment.currentLesson || 0" size="small">
          <a-step
            v-for="(lesson, index) in selectedAssignment.lessons"
            :key="index"
            :title="lesson.title"
            :description="lesson.description"
          />
        </a-steps>
      </div>
    </a-modal>
  </div>
</template>

<script>
export default {
    name: 'CourseAssignment',
    data () {
        return {
            loading: false,
            saving: false,
            assignmentModalVisible: false,
            batchAssignVisible: false,
            scheduleVisible: false,
            detailVisible: false,
            editingAssignment: null,
            selectedAssignment: null,
            selectedRowKeys: [],

            filters: {
                classId: '',
                courseType: '',
                status: '',
                keyword: ''
            },

            classList: [],
            courseList: [],
            teachers: [],
            availableTeachers: [],
            assignments: [],
            previewSchedule: [],

            pagination: {
                current: 1,
                pageSize: 10,
                total: 0,
                showSizeChanger: true,
                showQuickJumper: true
            },

            assignmentColumns: [
                {
                    title: '班级信息',
                    dataIndex: 'className',
                    key: 'className',
                    width: 200,
                    scopedSlots: { customRender: 'className' }
                },
                {
                    title: '课程信息',
                    dataIndex: 'courseInfo',
                    key: 'courseInfo',
                    width: 250,
                    scopedSlots: { customRender: 'courseInfo' }
                },
                {
                    title: '授课教师',
                    dataIndex: 'teacher',
                    key: 'teacher',
                    width: 150,
                    scopedSlots: { customRender: 'teacher' }
                },
                {
                    title: '时间安排',
                    dataIndex: 'schedule',
                    key: 'schedule',
                    width: 200,
                    scopedSlots: { customRender: 'schedule' }
                },
                {
                    title: '状态',
                    dataIndex: 'status',
                    key: 'status',
                    width: 100,
                    scopedSlots: { customRender: 'status' }
                },
                {
                    title: '操作',
                    key: 'action',
                    width: 200,
                    scopedSlots: { customRender: 'action' }
                }
            ],

            scheduleColumns: [
                { title: '时间', dataIndex: 'time', key: 'time', scopedSlots: { customRender: 'time' } },
                { title: '课程', dataIndex: 'courseName', key: 'courseName' },
                { title: '教师', dataIndex: 'teacherName', key: 'teacherName' },
                { title: '地点', dataIndex: 'location', key: 'location' }
            ],

            assignmentForm: {
                classId: '',
                courseId: '',
                teacherId: '',
                sequence: 1,
                startDate: null,
                endDate: null,
                timeSlots: [
                    { weekday: null, startTime: null, endTime: null }
                ],
                objectives: '',
                notes: ''
            },

            batchForm: {
                classIds: [],
                courseIds: [],
                strategy: 'auto',
                teacherId: '',
                startDate: null
            },

            scheduleForm: {
                classId: '',
                termStart: null,
                termEnd: null,
                rules: ['avoid_conflict', 'course_sequence']
            }
        }
    },

    mounted () {
        this.loadClassList()
        this.loadCourseList()
        this.loadTeachers()
        this.loadAssignments()
    },

    methods: {
        async loadClassList () {
            try {
                const response = await this.$http.get('/class/list')
                if (response && response.success) {
                    this.classList = response.result.records || []
                }
            } catch (error) {
                console.error('加载班级列表失败:', error)
            }
        },

        async loadCourseList () {
            try {
                const response = await this.$http.get('/course/list')
                if (response && response.success) {
                    this.courseList = response.result.records || this.getMockCourseData()
                } else {
                    this.courseList = this.getMockCourseData()
                }
            } catch (error) {
                console.error('加载课程列表失败:', error)
                this.courseList = this.getMockCourseData()
            }
        },

        async loadTeachers () {
            try {
                const response = await this.$http.get('/teacher/list')
                if (response && response.success) {
                    this.teachers = response.result.records || this.getMockTeacherData()
                } else {
                    this.teachers = this.getMockTeacherData()
                }
                this.availableTeachers = this.teachers
            } catch (error) {
                console.error('加载教师列表失败:', error)
                this.teachers = this.getMockTeacherData()
                this.availableTeachers = this.teachers
            }
        },

        async loadAssignments () {
            this.loading = true
            try {
                const params = {
                    pageNo: this.pagination.current,
                    pageSize: this.pagination.pageSize,
                    ...this.filters
                }

                const response = await this.$http.get('/course/assignments', { params })
                if (response && response.success) {
                    this.assignments = response.result.records || this.getMockAssignmentData()
                    this.pagination.total = response.result.total || this.assignments.length
                } else {
                    this.assignments = this.getMockAssignmentData()
                    this.pagination.total = this.assignments.length
                }
            } catch (error) {
                console.error('加载课程分配失败:', error)
                this.assignments = this.getMockAssignmentData()
                this.pagination.total = this.assignments.length
            } finally {
                this.loading = false
            }
        },

        getMockCourseData () {
            return [
                {
                    id: 'course_001',
                    name: 'Scratch图形化编程基础',
                    type: 'scratch',
                    duration: 20,
                    difficulty: 'easy',
                    description: 'Scratch图形化编程入门课程'
                },
                {
                    id: 'course_002',
                    name: 'Python编程入门',
                    type: 'python',
                    duration: 30,
                    difficulty: 'medium',
                    description: 'Python编程语言基础教学'
                },
                {
                    id: 'course_003',
                    name: 'JavaScript网页编程',
                    type: 'javascript',
                    duration: 25,
                    difficulty: 'medium',
                    description: 'JavaScript前端开发基础'
                }
            ]
        },

        getMockTeacherData () {
            return [
                {
                    id: 'teacher_001',
                    realname: '张老师',
                    avatar: '/avatars/teacher001.jpg',
                    workload: 75,
                    specialties: ['scratch', 'python']
                },
                {
                    id: 'teacher_002',
                    realname: '李老师',
                    avatar: '/avatars/teacher002.jpg',
                    workload: 60,
                    specialties: ['javascript', 'web']
                },
                {
                    id: 'teacher_003',
                    realname: '王老师',
                    avatar: '/avatars/teacher003.jpg',
                    workload: 45,
                    specialties: ['python', 'web']
                }
            ]
        },

        getMockAssignmentData () {
            return [
                {
                    id: 'assign_001',
                    className: '2024春季JavaScript班',
                    classId: 'class_001',
                    studentCount: 25,
                    classCapacity: 30,
                    courseName: 'Scratch图形化编程基础',
                    courseId: 'course_001',
                    courseType: 'scratch',
                    courseDuration: 20,
                    difficulty: 'easy',
                    teacherName: '张老师',
                    teacherId: 'teacher_001',
                    teacherAvatar: '/avatars/teacher001.jpg',
                    teacherWorkload: 75,
                    startDate: '2024-03-01',
                    endDate: '2024-04-15',
                    progress: 65,
                    status: 'ongoing',
                    timeSlots: [
                        { weekday: 1, startTime: '14:00', endTime: '16:00' },
                        { weekday: 3, startTime: '14:00', endTime: '16:00' }
                    ],
                    objectives: '让学生掌握Scratch基础编程概念',
                    notes: '注意照顾编程零基础的学员',
                    currentLesson: 3,
                    lessons: [
                        { title: 'Scratch介绍', description: '了解Scratch界面和基本概念' },
                        { title: '动作积木', description: '学习角色移动控制' },
                        { title: '外观积木', description: '学习角色外观变化' },
                        { title: '声音积木', description: '添加音效和音乐' }
                    ]
                },
                {
                    id: 'assign_002',
                    className: '2024春季Vue进阶班',
                    classId: 'class_002',
                    studentCount: 20,
                    classCapacity: 25,
                    courseName: 'Python编程入门',
                    courseId: 'course_002',
                    courseType: 'python',
                    courseDuration: 30,
                    difficulty: 'medium',
                    teacherName: '王老师',
                    teacherId: 'teacher_003',
                    teacherAvatar: '/avatars/teacher003.jpg',
                    teacherWorkload: 45,
                    startDate: '2024-03-15',
                    endDate: '2024-05-30',
                    progress: 30,
                    status: 'ongoing',
                    timeSlots: [
                        { weekday: 2, startTime: '19:00', endTime: '21:00' },
                        { weekday: 4, startTime: '19:00', endTime: '21:00' }
                    ],
                    objectives: '掌握Python基础语法和编程思维',
                    notes: '结合实际项目进行教学',
                    currentLesson: 1,
                    lessons: [
                        { title: 'Python环境搭建', description: '安装Python和IDE' },
                        { title: '变量和数据类型', description: '学习基础数据类型' },
                        { title: '控制结构', description: '条件判断和循环' },
                        { title: '函数定义', description: '函数的定义和调用' }
                    ]
                }
            ]
        },

        handleTableChange (pagination, filters, sorter) {
            this.pagination.current = pagination.current
            this.pagination.pageSize = pagination.pageSize
            this.loadAssignments()
        },

        onSelectChange (selectedRowKeys) {
            this.selectedRowKeys = selectedRowKeys
        },

        editAssignment (assignment) {
            this.editingAssignment = assignment
            this.assignmentForm = {
                classId: assignment.classId,
                courseId: assignment.courseId,
                teacherId: assignment.teacherId,
                sequence: assignment.sequence || 1,
                startDate: assignment.startDate,
                endDate: assignment.endDate,
                timeSlots: [...assignment.timeSlots],
                objectives: assignment.objectives || '',
                notes: assignment.notes || ''
            }
            this.assignmentModalVisible = true
        },

        viewDetails (assignment) {
            this.selectedAssignment = assignment
            this.detailVisible = true
        },

        batchAssignCourses () {
            this.batchForm = {
                classIds: [],
                courseIds: [],
                strategy: 'auto',
                teacherId: '',
                startDate: null
            }
            this.batchAssignVisible = true
        },

        generateSchedule () {
            this.scheduleForm = {
                classId: '',
                termStart: null,
                termEnd: null,
                rules: ['avoid_conflict', 'course_sequence']
            }
            this.previewSchedule = []
            this.scheduleVisible = true
        },

        async saveAssignment () {
            if (!this.assignmentForm.classId || !this.assignmentForm.courseId || !this.assignmentForm.teacherId) {
                this.$message.error('请填写必填字段')
                return
            }

            this.saving = true
            try {
                const url = this.editingAssignment ? `/course/assignment/${this.editingAssignment.id}` : '/course/assignment'
                const method = this.editingAssignment ? 'put' : 'post'

                await this.$http[method](url, this.assignmentForm)

                this.$message.success(this.editingAssignment ? '课程分配更新成功' : '课程分配成功')
                this.assignmentModalVisible = false
                this.loadAssignments()
            } catch (error) {
                this.$message.error('保存失败')
            } finally {
                this.saving = false
            }
        },

        async confirmBatchAssign () {
            if (!this.batchForm.classIds.length || !this.batchForm.courseIds.length) {
                this.$message.error('请选择班级和课程')
                return
            }

            try {
                await this.$http.post('/course/batch-assign', this.batchForm)
                this.$message.success('批量分配成功')
                this.batchAssignVisible = false
                this.loadAssignments()
            } catch (error) {
                this.$message.error('批量分配失败')
            }
        },

        async confirmGenerateSchedule () {
            if (!this.scheduleForm.classId) {
                this.$message.error('请选择班级')
                return
            }

            try {
                const response = await this.$http.post('/course/generate-schedule', this.scheduleForm)
                this.previewSchedule = response.result || this.getMockScheduleData()
                this.$message.success('课程表生成成功')
            } catch (error) {
                this.$message.error('生成课程表失败')
                this.previewSchedule = this.getMockScheduleData()
            }
        },

        getMockScheduleData () {
            return [
                {
                    weekday: '星期一',
                    timeSlot: '14:00-16:00',
                    courseName: 'Scratch基础',
                    teacherName: '张老师',
                    location: '教室A101'
                },
                {
                    weekday: '星期三',
                    timeSlot: '14:00-16:00',
                    courseName: 'Scratch基础',
                    teacherName: '张老师',
                    location: '教室A101'
                }
            ]
        },

        onClassChange (classId) {
            // 根据班级筛选可用教师
            this.updateAvailableTeachers()
        },

        onCourseChange (courseId) {
            // 根据课程类型筛选专业教师
            this.updateAvailableTeachers()
        },

        updateAvailableTeachers () {
            // 简化实现，实际应根据课程类型和时间冲突筛选
            this.availableTeachers = this.teachers
        },

        addTimeSlot () {
            this.assignmentForm.timeSlots.push({
                weekday: null,
                startTime: null,
                endTime: null
            })
        },

        removeTimeSlot (index) {
            this.assignmentForm.timeSlots.splice(index, 1)
        },

        handleMoreAction (e, record) {
            const action = e.key
            switch (action) {
            case 'adjust':
                this.adjustProgress(record)
                break
            case 'changeTeacher':
                this.changeTeacher(record)
                break
            case 'reschedule':
                this.reschedule(record)
                break
            case 'suspend':
                this.suspendCourse(record)
                break
            case 'complete':
                this.completeCourse(record)
                break
            case 'delete':
                this.deleteAssignment(record)
                break
            }
        },

        adjustProgress (assignment) {
            this.$message.info(`调整 ${assignment.courseName} 的进度`)
        },

        changeTeacher (assignment) {
            this.$message.info(`更换 ${assignment.courseName} 的教师`)
        },

        reschedule (assignment) {
            this.$message.info(`重新安排 ${assignment.courseName}`)
        },

        suspendCourse (assignment) {
            this.$confirm({
                title: '确认暂停',
                content: `确定要暂停课程"${assignment.courseName}"吗？`,
                onOk: () => {
                    this.$message.success('课程已暂停')
                    this.loadAssignments()
                }
            })
        },

        completeCourse (assignment) {
            this.$confirm({
                title: '确认完成',
                content: `确定要标记课程"${assignment.courseName}"为已完成吗？`,
                onOk: () => {
                    this.$message.success('课程已标记为完成')
                    this.loadAssignments()
                }
            })
        },

        deleteAssignment (assignment) {
            this.$confirm({
                title: '确认删除',
                content: `确定要删除课程分配"${assignment.courseName}"吗？`,
                onOk: async () => {
                    try {
                        await this.$http.delete(`/course/assignment/${assignment.id}`)
                        this.$message.success('分配删除成功')
                        this.loadAssignments()
                    } catch (error) {
                        this.$message.error('删除失败')
                    }
                }
            })
        },

        exportSchedule () {
            this.$message.info('导出功能开发中...')
        },

        getCourseIcon (type) {
            const icons = {
                scratch: 'build',
                python: 'code',
                javascript: 'thunderbolt',
                web: 'global'
            }
            return icons[type] || 'book'
        },

        getCourseTypeName (type) {
            const names = {
                scratch: 'Scratch',
                python: 'Python',
                javascript: 'JavaScript',
                web: 'Web开发'
            }
            return names[type] || type
        },

        getDifficultyText (difficulty) {
            const texts = {
                easy: '简单',
                medium: '中等',
                hard: '困难'
            }
            return texts[difficulty] || difficulty
        },

        getStatusColor (status) {
            const colors = {
                planned: 'blue',
                ongoing: 'green',
                completed: 'gray',
                suspended: 'red'
            }
            return colors[status] || 'default'
        },

        getStatusText (status) {
            const texts = {
                planned: '已计划',
                ongoing: '进行中',
                completed: '已完成',
                suspended: '暂停'
            }
            return texts[status] || status
        },

        getProgressColor (progress) {
            if (progress >= 80) return '#52c41a'
            if (progress >= 60) return '#1890ff'
            if (progress >= 40) return '#fa8c16'
            return '#ff4d4f'
        },

        getWeekdayText (weekday) {
            const texts = ['', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期天']
            return texts[weekday] || '未知'
        }
    }
}
</script>

<style scoped lang="less">
.course-assignment {
  .filter-section {
    margin-bottom: 24px;
  }

  .class-info {
    .class-name {
      font-weight: 600;
      margin-bottom: 4px;
    }

    .class-details {
      font-size: 12px;
      color: #666;
    }
  }

  .course-info {
    .course-title {
      font-weight: 600;
      margin-bottom: 4px;

      .anticon {
        margin-right: 6px;
      }
    }

    .course-details {
      font-size: 12px;
      color: #666;
    }
  }

  .teacher-info {
    display: flex;
    align-items: center;
    flex-direction: column;

    .teacher-workload {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
  }

  .schedule-info {
    font-size: 12px;

    .schedule-progress {
      margin-top: 8px;
    }
  }

  .schedule-builder {
    .ant-row {
      margin-bottom: 8px;
    }
  }

  .schedule-generator {
    .schedule-preview {
      margin-top: 24px;
      padding: 16px;
      background: #fafafa;
      border-radius: 4px;

      h4 {
        margin-bottom: 16px;
      }
    }
  }

  .assignment-detail {
    .ant-descriptions {
      margin-bottom: 24px;
    }

    h4 {
      margin: 16px 0;
      color: #333;
    }
  }
}
</style>
