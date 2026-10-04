<template>
  <div class="classroom-manager">
    <a-card>
      <div slot="title">
        <a-icon type="video-camera" />
        线下课堂管理
      </div>
      <div slot="extra">
        <a-button type="primary" @click="createClassroom">
          <a-icon type="plus" />
          创建课堂
        </a-button>
      </div>

      <a-row :gutter="16" class="stats-section">
        <a-col :span="6">
          <a-statistic title="总课堂数" :value="stats.total" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="进行中" :value="stats.active" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="今日创建" :value="stats.today" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="累计学生" :value="stats.totalStudents" />
        </a-col>
      </a-row>

      <a-divider />

      <div class="filter-section">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-select v-model="filters.status" placeholder="筛选课堂状态" style="width: 100%">
              <a-select-option value="">
                全部状态
              </a-select-option>
              <a-select-option value="active">
                进行中
              </a-select-option>
              <a-select-option value="scheduled">
                未开始
              </a-select-option>
              <a-select-option value="ended">
                已结束
              </a-select-option>
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-select v-model="filters.subject" placeholder="筛选课程科目" style="width: 100%">
              <a-select-option value="">
                全部科目
              </a-select-option>
              <a-select-option value="scratch">
                Scratch编程
              </a-select-option>
              <a-select-option value="python">
                Python编程
              </a-select-option>
              <a-select-option value="web">
                Web开发
              </a-select-option>
              <a-select-option value="ai_package">
                AI资源包
              </a-select-option>
              <a-select-option value="java">
                Java
              </a-select-option>
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-date-picker v-model="filters.date" placeholder="按日期筛选" style="width: 100%" />
          </a-col>
          <a-col :span="6">
            <a-input-search
              v-model="filters.keyword"
              placeholder="搜索课堂名称"
              @search="filterClassrooms"
            />
          </a-col>
        </a-row>
      </div>

      <a-table
        class="classroom-table"
        :columns="columns"
        :data-source="filteredClassrooms"
        :loading="loading"
        :pagination="tablePagination"
        :row-key="record => record.id"
        @change="handleTableChange"
      />
    </a-card>

    <a-modal
      :title="editingClassroom ? '编辑课堂' : '创建课堂'"
      :visible="classroomModalVisible"
      :confirm-loading="formLoading"
      width="800px"
      @cancel="classroomModalVisible = false"
      @ok="saveClassroom"
    >
      <a-form layout="vertical">
        <a-alert
          v-if="isAiPackagePrefillMode"
          style="margin-bottom: 16px;"
          type="info"
          show-icon
          message="当前将基于 AI 资源包创建课堂"
          :description="aiPackageHintText"
        />

        <a-form-item label="课堂名称" required>
          <a-input
            v-model="classroomForm.classroomName"
            allow-clear
            placeholder="请输入课堂名称"
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item :label="isAiPackagePrefillMode ? '课程' : '课程包'" :required="!isAiPackagePrefillMode">
              <a-select
                v-model="classroomForm.courseId"
                placeholder="请选择课程包"
                @change="onPackageChange"
              >
                <a-select-option v-for="pkg in coursePackages" :key="pkg.id" :value="pkg.id">
                  {{ pkg.courseName || pkg.name }}（{{ (pkg.lessons || []).length }}课时）
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="isAiPackagePrefillMode ? '课时' : '课程课时'" :required="!isAiPackagePrefillMode">
              <a-select
                v-model="classroomForm.lessonId"
                :disabled="!classroomForm.courseId"
                :placeholder="isAiPackagePrefillMode ? 'AI 资源模式下可不选课时' : '请选择课时'"
                @change="onLessonChange"
              >
                <a-select-option v-for="lesson in selectedPackageLessons" :key="lesson.id" :value="lesson.id">
                  {{ lesson.unitName || lesson.title }}（{{ lesson.duration || 0 }}分钟）
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="开始时间">
              <a-date-picker
                v-model="classroomForm.startTime"
                show-time
                placeholder="请选择开始时间"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="时长">
              <a-input-number
                v-model="classroomForm.duration"
                :min="15"
                :max="240"
                :step="15"
                placeholder="请输入时长"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="授课班级" required>
          <a-select
            v-model="classroomForm.classId"
            :loading="classLoading"
            show-search
            style="width: 100%"
            placeholder="请选择授课班级"
            :filter-option="filterClass"
          >
            <a-select-option v-for="cls in classList" :key="cls.id" :value="cls.id">
              {{ cls.className || cls.name }}（{{ cls.studentCount || 0 }}人）
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="课堂说明">
          <a-textarea
            v-model="classroomForm.description"
            :rows="3"
            placeholder="请输入课堂说明"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      title="课堂详情"
      :visible="detailModalVisible"
      width="1000px"
      :footer="null"
      @cancel="detailModalVisible = false"
    >
      <div v-if="selectedClassroom" class="classroom-detail">
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="课堂名称">
            {{ selectedClassroom.title }}
          </a-descriptions-item>
          <a-descriptions-item label="课程科目">
            {{ selectedClassroom.subject }}
          </a-descriptions-item>
          <a-descriptions-item label="开始时间">
            {{ formatTime(selectedClassroom.startTime) }}
          </a-descriptions-item>
          <a-descriptions-item label="时长">
            {{ selectedClassroom.duration }}
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="getStatusColor(selectedClassroom.status)">
              {{ getStatusText(selectedClassroom.status) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="参与学生">
            {{ (selectedClassroom.students || []).length }}
          </a-descriptions-item>
          <a-descriptions-item label="课堂说明" :span="2">
            {{ selectedClassroom.description || '-' }}
          </a-descriptions-item>
        </a-descriptions>

        <a-divider>学生列表</a-divider>

        <a-table
          :columns="studentColumns"
          :data-source="selectedClassroom.students || []"
          :pagination="false"
          size="small"
        >
          <template slot="status" slot-scope="text">
            <a-tag :color="getStudentStatusColor(text)" size="small">
              {{ getStudentStatusText(text) }}
            </a-tag>
          </template>
        </a-table>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { getAction } from '@/api/manage'
import { courseResourceApi } from '@/api/teaching'
import { resolveTeachingAccess } from '@/utils/teachingAccess'

const AI_CLASSROOM_BASE_URL = 'https://ai.codebn.cn'

const SUBJECT_FILTERS = [
    { text: 'Scratch编程', value: 'scratch' },
    { text: 'Python编程', value: 'python' },
    { text: 'Web开发', value: 'web' },
    { text: 'AI资源包', value: 'ai_package' }
]

const STATUS_META = {
    scheduled: { text: '未开始', color: 'blue' },
    active: { text: '进行中', color: 'green' },
    ongoing: { text: '进行中', color: 'green' },
    in_progress: { text: '进行中', color: 'green' },
    ended: { text: '已结束', color: 'default' },
    archived: { text: '已归档', color: 'default' }
}

const STUDENT_STATUS_META = {
    online: { text: '在线', color: 'success' },
    coding: { text: '编码中', color: 'processing' },
    offline: { text: '离线', color: 'default' }
}

function createDefaultClassroomForm () {
    return {
        classroomName: '',
        courseId: '',
        courseName: '',
        lessonId: '',
        lessonName: '',
        classId: '',
        startTime: null,
        duration: 30,
        description: '',
        maxStudents: 50,
        resourceId: '',
        resourceName: '',
        resourceUrl: '',
        selectedLanguage: ''
    }
}

function getStatusMeta (status) {
    return STATUS_META[status] || { text: status || '-', color: 'default' }
}

function safeString (value, fallback = '') {
    return value === undefined || value === null ? fallback : String(value)
}

function normalizeSubjectLabel (record = {}) {
    const normalizedLanguage = safeString(
        record.selectedLanguage ||
        record.selected_language ||
        record.contentType ||
        record.content_type
    ).trim().toLowerCase()

    if (['ai_package', 'ai-resource', 'ai_resource'].includes(normalizedLanguage)) {
        return 'AI资源包'
    }
    if (normalizedLanguage === 'scratch') {
        return 'Scratch编程'
    }
    if (normalizedLanguage === 'python') {
        return 'Python编程'
    }
    if (['web', 'javascript', 'html', 'html/css'].includes(normalizedLanguage)) {
        return 'Web开发'
    }

    return record.subject || record.courseName || record.course_name || record.resourceName || record.resource_name || '未设置'
}

export default {
    name: 'ClassroomManager',
    data () {
        return {
            loading: false,
            formLoading: false,
            classroomModalVisible: false,
            detailModalVisible: false,
            editingClassroom: null,
            selectedClassroom: null,
            stats: {
                total: 0,
                active: 0,
                today: 0,
                totalStudents: 0
            },
            filters: {
                status: '',
                subject: '',
                date: null,
                keyword: ''
            },
            aiPackagePrefillMeta: {
                id: '',
                name: '',
                courseSystem: '',
                courseStage: ''
            },
            coursePackages: [],
            selectedPackage: null,
            classList: [],
            classLoading: false,
            classrooms: [],
            pagination: {
                current: 1,
                pageSize: 10,
                total: 0
            },
            classroomForm: createDefaultClassroomForm(),
            studentColumns: [
                {
                    title: '学生姓名',
                    dataIndex: 'name',
                    key: 'name'
                },
                {
                    title: '状态',
                    dataIndex: 'status',
                    key: 'status',
                    scopedSlots: { customRender: 'status' }
                },
                {
                    title: '加入时间',
                    dataIndex: 'joinTime',
                    key: 'joinTime',
                    customRender: value => (value ? this.formatTime(value) : '-')
                }
            ],
            columns: [
                {
                    title: '课堂名称',
                    dataIndex: 'title',
                    key: 'title',
                    sorter: true
                },
                {
                    title: '授课班级',
                    dataIndex: 'className',
                    key: 'className',
                    customRender: () => '-'
                },
                {
                    title: '课程科目',
                    dataIndex: 'subject',
                    key: 'subject',
                    filters: SUBJECT_FILTERS
                },
                {
                    title: '授课教师',
                    dataIndex: 'teacherName',
                    key: 'teacherName'
                },
                {
                    title: '开始时间',
                    dataIndex: 'startTime',
                    key: 'startTime',
                    customRender: value => value || '-',
                    sorter: true
                },
                {
                    title: '时长',
                    dataIndex: 'duration',
                    key: 'duration',
                    customRender: value => (value !== undefined && value !== null ? String(value) : '-')
                },
                {
                    title: '状态',
                    dataIndex: 'status',
                    key: 'status',
                    customRender: (text, record) => this.renderStatusTag(record)
                },
                {
                    title: '参与学生',
                    key: 'students',
                    customRender: (text, record) => {
                        if (!record) {
                            return '0'
                        }
                        if (Array.isArray(record.students)) {
                            return String(record.students.length)
                        }
                        return String(record.currentStudents || 0)
                    }
                },
                {
                    title: '操作',
                    key: 'action',
                    width: 320,
                    customRender: (text, record) => this.renderActions(record)
                }
            ]
        }
    },
    computed: {
        filteredClassrooms () {
            let result = [...this.classrooms]

            if (this.filters.status) {
                result = result.filter(item => item.status === this.filters.status)
            }

            if (this.filters.subject) {
                const keyword = this.filters.subject.toLowerCase()
                result = result.filter(item => safeString(item.subject).toLowerCase().includes(keyword))
            }

            if (this.filters.keyword) {
                const keyword = this.filters.keyword.toLowerCase()
                result = result.filter(item => safeString(item.title).toLowerCase().includes(keyword))
            }

            if (this.filters.date && this.$moment && this.filters.date.isValid && this.filters.date.isValid()) {
                const selectedDate = this.filters.date.format('YYYY-MM-DD')
                result = result.filter(item => {
                    const value = item.startTime || item.createTime
                    if (!value) {
                        return false
                    }
                    const parsed = this.$moment(value)
                    return parsed.isValid() && parsed.format('YYYY-MM-DD') === selectedDate
                })
            }

            return result
        },
        tablePagination () {
            return {
                ...this.pagination,
                total: this.filteredClassrooms.length
            }
        },
        selectedPackageLessons () {
            if (!this.selectedPackage) {
                return []
            }
            return this.selectedPackage.lessons || []
        },
        isAiPackagePrefillMode () {
            return Boolean(
                this.aiPackagePrefillMeta.id ||
        (
            this.classroomForm.resourceId &&
          safeString(this.classroomForm.selectedLanguage).trim().toLowerCase() === 'ai_package'
        )
            )
        },
        aiPackageHintText () {
            const segments = []
            const name = this.aiPackagePrefillMeta.name || this.classroomForm.resourceName

            if (name) {
                segments.push(`资源名称：${name}`)
            }
            if (this.aiPackagePrefillMeta.courseSystem) {
                segments.push(`课程体系：${this.aiPackagePrefillMeta.courseSystem}`)
            }
            if (this.aiPackagePrefillMeta.courseStage) {
                segments.push(`课程阶段：${this.aiPackagePrefillMeta.courseStage}`)
            }

            if (segments.length === 0) {
                return '该课堂会绑定一个 AI 资源包创建，保存后可从课堂管理中直接打开 AI 课堂。'
            }

            return `${segments.join('，')}。保存后可直接打开 AI 课堂。`
        }
    },
    mounted () {
        this.loadClassrooms()
        this.loadCoursePackages()
        this.loadClassList()
        this.applyAiPackagePrefillFromRoute()
    },
    methods: {
        renderStatusTag (record) {
            const meta = getStatusMeta(record && record.status)
            return this.$createElement('a-tag', { props: { color: meta.color } }, meta.text)
        },
        renderActions (record) {
            if (!record) {
                return '-'
            }

            const buttons = []
            const isAiPackageClassroom = this.isAiPackageClassroom(record)
            const showAiClassroomShortcut = isAiPackageClassroom && record.status !== 'ended'

            if (record.status === 'active' || record.status === 'ongoing' || record.status === 'in_progress') {
                buttons.push(this.createActionButton({
                    type: 'primary',
                    icon: 'video-camera',
                    text: '进入课堂',
                    onClick: () => this.enterClassroom(record)
                }))
                buttons.push(this.createActionButton({
                    icon: 'eye',
                    text: '查看详情',
                    onClick: () => this.viewClassroom(record)
                }))
            } else if (record.status === 'scheduled') {
                buttons.push(this.createActionButton({
                    type: 'primary',
                    icon: 'play-circle',
                    text: '开始上课',
                    onClick: () => this.startClassroom(record)
                }))
                buttons.push(this.createActionButton({
                    icon: 'login',
                    text: '进入教室',
                    onClick: () => this.enterClassroom(record)
                }))
                buttons.push(this.createActionButton({
                    icon: 'eye',
                    text: '查看详情',
                    onClick: () => this.viewClassroom(record)
                }))
            } else if (record.status === 'ended') {
                buttons.push(this.createActionButton({
                    icon: 'history',
                    text: '回看课堂',
                    onClick: () => this.enterClassroom(record, true)
                }))
                buttons.push(this.createActionButton({
                    icon: 'eye',
                    text: '查看详情',
                    onClick: () => this.viewClassroom(record)
                }))
            } else {
                buttons.push(this.createActionButton({
                    icon: 'eye',
                    text: '查看详情',
                    onClick: () => this.viewClassroom(record)
                }))
            }

            if (showAiClassroomShortcut) {
                buttons.push(this.createActionButton({
                    icon: 'rocket',
                    text: 'AI课堂',
                    onClick: () => this.openAiPackageClassroom(record)
                }))
            }

            buttons.push(this.$createElement('a-dropdown', { style: { marginRight: '8px', marginBottom: '8px' } }, [
                this.$createElement('a-button', { props: { size: 'small' } }, [
                    this.$createElement('a-icon', { props: { type: 'more' } })
                ]),
                this.$createElement('a-menu', {
                    slot: 'overlay',
                    on: { click: event => this.handleAction(event, record) }
                }, [
                    this.$createElement('a-menu-item', { key: 'edit' }, '编辑课堂'),
                    this.$createElement('a-menu-item', { key: 'copy' }, '复制课堂'),
                    this.$createElement('a-menu-item', { key: 'materials' }, '课程资料'),
                    showAiClassroomShortcut ? this.$createElement('a-menu-item', { key: 'open-ai-classroom' }, '打开AI课堂') : null,
                    (record.status === 'active' || record.status === 'ongoing' || record.status === 'in_progress')
                        ? this.$createElement('a-menu-item', { key: 'end' }, '结束课堂')
                        : null,
                    this.$createElement('a-menu-divider'),
                    this.$createElement('a-menu-item', { key: 'delete' }, '删除课堂')
                ].filter(Boolean))
            ]))

            return this.$createElement('div', { class: 'action-group' }, buttons)
        },
        createActionButton ({ type = 'default', icon, text, onClick }) {
            return this.$createElement('a-button', {
                props: {
                    type,
                    size: 'small'
                },
                style: {
                    marginRight: '8px',
                    marginBottom: '8px'
                },
                on: {
                    click: onClick
                }
            }, [
                this.$createElement('a-icon', { props: { type: icon } }),
                ` ${text}`
            ])
        },
        getStatusColor (status) {
            return getStatusMeta(status).color
        },
        getStatusText (status) {
            return getStatusMeta(status).text
        },
        getStudentStatusColor (status) {
            return (STUDENT_STATUS_META[status] || { color: 'default' }).color
        },
        getStudentStatusText (status) {
            return (STUDENT_STATUS_META[status] || { text: status || '-' }).text
        },
        formatTime (value) {
            if (!value) {
                return '-'
            }
            if (this.$moment) {
                const parsed = this.$moment(value)
                if (parsed.isValid()) {
                    return parsed.format('YYYY-MM-DD HH:mm:ss')
                }
            }
            return safeString(value, '-')
        },
        filterClass (input, option) {
            const label =
        safeString(option.componentOptions && option.componentOptions.children && option.componentOptions.children[0] && option.componentOptions.children[0].text)
            return label.toLowerCase().includes(safeString(input).toLowerCase())
        },
        filterClassrooms () {
            this.pagination.current = 1
        },
        handleTableChange (pagination) {
            this.pagination = {
                ...this.pagination,
                current: pagination.current,
                pageSize: pagination.pageSize
            }
        },
        updateStats () {
            const activeStatuses = ['in_progress', 'ongoing', 'active']
            const today = this.$moment ? this.$moment().format('YYYY-MM-DD') : ''

            this.stats = {
                total: this.classrooms.length,
                active: this.classrooms.filter(item => activeStatuses.includes(item.status)).length,
                today: this.classrooms.filter(item => {
                    const value = item.startTime || item.createTime
                    if (!value || !this.$moment) {
                        return false
                    }
                    const parsed = this.$moment(value)
                    return parsed.isValid() && parsed.format('YYYY-MM-DD') === today
                }).length,
                totalStudents: this.classrooms.reduce((sum, item) => {
                    if (Array.isArray(item.students) && item.students.length > 0) {
                        return sum + item.students.length
                    }
                    return sum + (item.currentStudents || 0)
                }, 0)
            }
        },
        resetClassroomForm () {
            this.classroomForm = createDefaultClassroomForm()
            this.aiPackagePrefillMeta = {
                id: '',
                name: '',
                courseSystem: '',
                courseStage: ''
            }
            this.selectedPackage = null
        },
        normalizeLesson (lesson) {
            if (!lesson) {
                return null
            }

            const resourceId = lesson.resourceId || lesson.resource_id
            return {
                id: lesson.id,
                unitName: lesson.unitName || lesson.unit_name || lesson.title || '',
                unitNo: lesson.unitNo || lesson.unit_no,
                duration: lesson.duration || 30,
                contentType: lesson.contentType || lesson.content_type || '',
                contentUrl: lesson.contentUrl || lesson.content_url || (resourceId ? `/api/resource/preview/${resourceId}` : ''),
                resourceId,
                resourceName: lesson.resourceName || lesson.resource_name || '',
                resourceUrl: lesson.resourceUrl || lesson.resource_url || (resourceId ? `/api/resource/preview/${resourceId}` : '')
            }
        },
        ensureCourseOption (detail) {
            if (!detail || !detail.courseId) {
                this.selectedPackage = null
                return
            }

            let course = this.coursePackages.find(pkg => String(pkg.id) === String(detail.courseId))
            if (!course) {
                course = {
                    id: detail.courseId,
                    courseName: detail.courseName || (detail.course && (detail.course.courseName || detail.course.course_name)) || '',
                    lessons: []
                }
                this.coursePackages.push(course)
            } else if (!course.courseName) {
                course.courseName = detail.courseName || (detail.course && (detail.course.courseName || detail.course.course_name)) || ''
            }

            const normalizedLesson = this.normalizeLesson(detail.lesson || detail.selectedLesson)
            if (normalizedLesson && !course.lessons.find(item => String(item.id) === String(normalizedLesson.id))) {
                course.lessons.push(normalizedLesson)
            }

            this.selectedPackage = course
        },
        populateClassroomForm (detail = {}) {
            const course = detail.course || {}
            const lesson = detail.lesson || detail.selectedLesson || {}
            const courseId = detail.courseId || course.id || ''
            const lessonId = detail.lessonId || lesson.id || ''
            const classId = detail.classId || detail.class_id || ''

            return {
                classroomName: detail.classroomName || detail.title || '',
                courseId,
                courseName: detail.courseName || course.courseName || course.course_name || '',
                lessonId,
                lessonName: detail.lessonName || lesson.unitName || lesson.unit_name || '',
                classId,
                startTime: detail.startTime && this.$moment ? this.$moment(detail.startTime) : null,
                duration: detail.duration || 30,
                description: detail.description || '',
                maxStudents: detail.maxStudents || detail.max_students || 50,
                resourceId: detail.resourceId || detail.resource_id || lesson.resourceId || lesson.resource_id || '',
                resourceName: detail.resourceName || detail.resource_name || lesson.resourceName || lesson.resource_name || '',
                resourceUrl: detail.resourceUrl || detail.resource_url || lesson.resourceUrl || lesson.resource_url || '',
                selectedLanguage: detail.selectedLanguage || detail.selected_language || lesson.contentType || lesson.content_type || ''
            }
        },
        mapClassroomRecord (record) {
            const resourceId = record.resourceId || record.resource_id
            const resourceUrl = record.resourceUrl || record.resource_url || (resourceId ? `/api/resource/preview/${resourceId}` : '')
            const subject = normalizeSubjectLabel(record)

            return {
                id: record.id,
                classroomName: record.classroomName || record.classroom_name,
                classroomCode: record.classroomCode || record.classroom_code,
                title: record.title || record.classroomName || record.classroom_name,
                subject,
                classId: record.classId || record.class_id,
                className: record.className || record.class_name,
                courseId: record.courseId || record.course_id,
                courseName: record.courseName || record.course_name,
                lessonId: record.lessonId || record.lesson_id,
                lessonName: record.lessonName || record.lesson_name,
                resourceId,
                resourceName: record.resourceName || record.resource_name,
                resourceUrl,
                contentType: record.contentType || record.content_type,
                selectedLanguage: record.selectedLanguage || record.selected_language,
                teacherId: record.teacherId || record.teacher_id,
                teacherName: record.teacherName || record.teacher_name,
                startTime: record.startTime || record.start_time,
                endTime: record.endTime || record.end_time,
                duration: record.duration || 0,
                status: record.status || 'scheduled',
                maxStudents: record.maxStudents || record.max_students || 50,
                currentStudents: record.currentStudents || record.current_students || 0,
                description: record.description || '',
                students: record.students || [],
                createTime: record.createTime || record.create_time,
                updateTime: record.updateTime || record.update_time
            }
        },
        async loadCoursePackages () {
            try {
                const response = await getAction('/teaching/teachingCourse/list', { pageNo: 1, pageSize: 200 })
                if (!response || !response.success) {
                    return
                }

                const courses = (response.result && response.result.records) || response.result || []
                this.coursePackages = courses.map(course => ({
                    ...course,
                    id: course.id,
                    courseName: course.courseName || course.course_name || course.name,
                    lessons: (course.lessons || []).map(lesson => this.normalizeLesson(lesson)).filter(Boolean)
                }))
            } catch (error) {
                this.$message.error(`加载课程包失败：${error.message || '未知错误'}`)
            }
        },
        async loadClassList () {
            this.classLoading = true
            try {
                const response = await this.$http.get('/teaching/class/list', {
                    params: { pageNo: 1, pageSize: 200 }
                })
                const data = response.data || response
                if (data.success) {
                    const result = (data.result && data.result.records) || data.result || []
                    this.classList = result.map(item => ({
                        id: item.id,
                        className: item.className || item.class_name || item.name,
                        name: item.className || item.class_name || item.name,
                        studentCount: item.enrolledCount || item.student_count || item.studentCount || 0
                    }))
                }
            } catch (error) {
                this.$message.warning('加载班级列表失败')
            } finally {
                this.classLoading = false
            }
        },
        async loadClassrooms () {
            this.loading = true
            try {
                const response = await this.$http.get('/teaching/classroom/list', {
                    params: { pageNo: 1, pageSize: 200 }
                })
                const data = response.data || response
                if (data.success) {
                    const classrooms = (data.result && data.result.records) || data.result || []
                    this.classrooms = classrooms
                        .filter(item => item && item.id)
                        .map(item => this.mapClassroomRecord(item))
                } else {
                    this.classrooms = []
                    this.$message.error(data.message || '加载课堂列表失败')
                }
            } catch (error) {
                this.classrooms = []
                this.$message.error(`加载课堂列表失败：${error.message || '未知错误'}`)
            } finally {
                this.updateStats()
                this.loading = false
            }
        },
        applyAiPackagePrefillFromRoute () {
            const query = this.$route.query || {}
            const aiPackageId = safeString(query.aiPackageId).trim()
            if (!aiPackageId) {
                return
            }

            this.aiPackagePrefillMeta = {
                id: aiPackageId,
                name: safeString(query.aiPackageName).trim(),
                courseSystem: safeString(query.courseSystem).trim(),
                courseStage: safeString(query.courseStage).trim()
            }

            const resourceName = this.aiPackagePrefillMeta.name || 'AI课堂资源'
            this.classroomForm.resourceId = aiPackageId
            this.classroomForm.resourceName = resourceName
            this.classroomForm.resourceUrl = `/api/teaching/course/resources/preview/${aiPackageId}`
            this.classroomForm.selectedLanguage = 'ai_package'
            this.classroomForm.lessonName = resourceName

            if (!this.classroomForm.classroomName) {
                this.classroomForm.classroomName = `${resourceName}课堂`
            }
        },
        createClassroom () {
            this.editingClassroom = null
            this.resetClassroomForm()
            this.applyAiPackagePrefillFromRoute()
            this.classroomModalVisible = true
        },
        async editClassroom (record) {
            if (!record || !record.id) {
                this.$message.warning('未找到要编辑的课堂')
                return
            }

            try {
                this.formLoading = true
                const response = await this.$http.get(`/teaching/classroom/${record.id}`)
                const data = response.data || response
                if (!data.success) {
                    this.$message.error(data.message || '加载课堂详情失败')
                    return
                }

                const detail = data.result || data.data || {}
                this.resetClassroomForm()
                this.ensureCourseOption(detail)
                this.classroomForm = this.populateClassroomForm(detail)
                this.editingClassroom = this.mapClassroomRecord(detail)

                if (this.isAiPackageClassroom(detail)) {
                    this.aiPackagePrefillMeta = {
                        id: safeString(detail.resourceId || detail.resource_id).trim(),
                        name: detail.resourceName || detail.resource_name || '',
                        courseSystem: '',
                        courseStage: ''
                    }
                }

                if (detail.lesson) {
                    const normalizedLesson = this.normalizeLesson(detail.lesson)
                    if (this.selectedPackage && normalizedLesson && !this.selectedPackage.lessons.find(item => String(item.id) === String(normalizedLesson.id))) {
                        this.selectedPackage.lessons.push(normalizedLesson)
                    }
                    if (!this.classroomForm.lessonId && normalizedLesson) {
                        this.classroomForm.lessonId = normalizedLesson.id
                    }
                }

                if (!detail.courseName && detail.course) {
                    this.classroomForm.courseName = detail.course.courseName || detail.course.course_name
                }

                this.classroomModalVisible = true
            } catch (error) {
                this.$message.error(`加载课堂详情失败：${error.message || '未知错误'}`)
            } finally {
                this.formLoading = false
            }
        },
        onPackageChange (courseId) {
            this.selectedPackage = this.coursePackages.find(item => String(item.id) === String(courseId)) || null
            this.classroomForm.lessonId = ''
            this.classroomForm.lessonName = ''
        },
        onLessonChange (lessonId) {
            const lesson = this.selectedPackageLessons.find(item => String(item.id) === String(lessonId))
            if (!lesson) {
                return
            }

            this.classroomForm.duration = lesson.duration || 30
            this.classroomForm.lessonName = lesson.unitName || lesson.title || ''

            if (!this.isAiPackagePrefillMode) {
                const resourceId = lesson.resourceId || lesson.resource_id || ''
                const resourceName = lesson.resourceName || lesson.resource_name || ''
                let resourceUrl = lesson.contentUrl || lesson.content_url || ''
                if (!resourceUrl && resourceId) {
                    resourceUrl = `/api/resource/preview/${resourceId}`
                }

                this.classroomForm.resourceId = resourceId
                this.classroomForm.resourceName = resourceName
                this.classroomForm.resourceUrl = resourceUrl
                this.classroomForm.selectedLanguage = lesson.contentType || lesson.content_type || ''
            }
        },
        async saveClassroom () {
            const hasResourcePrefill = Boolean(this.classroomForm.resourceId)

            if (!this.classroomForm.classroomName) {
                this.$message.error('请输入课堂名称')
                return
            }
            if (!this.classroomForm.courseId && !hasResourcePrefill) {
                this.$message.error('请选择课程包')
                return
            }
            if (!this.classroomForm.lessonId && !hasResourcePrefill) {
                this.$message.error('请选择课程课时')
                return
            }
            if (!this.classroomForm.classId) {
                this.$message.error('请选择授课班级')
                return
            }

            try {
                this.formLoading = true
                const selectedCourse = (this.coursePackages || []).find(item => String(item.id) === String(this.classroomForm.courseId || ''))
                const selectedLesson = (this.selectedPackageLessons || []).find(item => String(item.id) === String(this.classroomForm.lessonId || '')) || {}
                const isAiPackagePrefillMode = this.isAiPackagePrefillMode

                const courseName = selectedCourse ? (selectedCourse.courseName || selectedCourse.name) : ''
                const lessonName = selectedLesson.unitName || selectedLesson.title || this.classroomForm.lessonName || (isAiPackagePrefillMode ? (this.classroomForm.resourceName || this.aiPackagePrefillMeta.name || '') : '')

                let resourceId = ''
                let resourceName = ''
                let resourceUrl = ''
                let contentType = ''
                let selectedLanguage = ''

                if (isAiPackagePrefillMode) {
                    resourceId = this.classroomForm.resourceId || ''
                    resourceName = this.classroomForm.resourceName || this.aiPackagePrefillMeta.name || ''
                    resourceUrl = this.classroomForm.resourceUrl || (resourceId ? `/api/teaching/course/resources/preview/${resourceId}` : '')
                    contentType = 'ai_package'
                    selectedLanguage = 'ai_package'
                } else {
                    resourceId = selectedLesson.resourceId || selectedLesson.resource_id || this.classroomForm.resourceId || ''
                    resourceName = selectedLesson.resourceName || selectedLesson.resource_name || this.classroomForm.resourceName || ''
                    resourceUrl = selectedLesson.contentUrl || selectedLesson.content_url || this.classroomForm.resourceUrl || ''
                    if (!resourceUrl && resourceId) {
                        resourceUrl = `/api/resource/preview/${resourceId}`
                    }
                    contentType = selectedLesson.contentType || selectedLesson.content_type || this.classroomForm.selectedLanguage || ''
                    selectedLanguage = this.classroomForm.selectedLanguage || contentType || ''

                    if (!selectedLanguage && resourceName) {
                        const lowerName = resourceName.toLowerCase()
                        if (/(\.pptx?|\.pdf)$/.test(lowerName)) {
                            selectedLanguage = 'ppt'
                        }
                    }
                    if (selectedLanguage === 'document') {
                        selectedLanguage = 'ppt'
                    }
                    if (!selectedLanguage) {
                        selectedLanguage = 'scratch'
                    }
                }

                const payload = {
                    classroomName: this.classroomForm.classroomName,
                    classId: this.classroomForm.classId,
                    courseId: this.classroomForm.courseId || null,
                    courseName: courseName || null,
                    lessonId: this.classroomForm.lessonId || null,
                    lessonName: lessonName || null,
                    resourceId,
                    resourceName,
                    resourceUrl,
                    contentType,
                    selectedLanguage,
                    startTime: this.classroomForm.startTime ? this.classroomForm.startTime.format() : null,
                    duration: this.classroomForm.duration || 30,
                    description: this.classroomForm.description || '',
                    maxStudents: this.classroomForm.maxStudents || 50
                }

                this.classroomForm.courseName = courseName
                this.classroomForm.lessonName = lessonName || ''
                this.classroomForm.resourceId = resourceId
                this.classroomForm.resourceName = resourceName
                this.classroomForm.resourceUrl = resourceUrl
                this.classroomForm.selectedLanguage = selectedLanguage

                if (this.editingClassroom) {
                    const response = await this.$http.put(`/teaching/classroom/update/${this.editingClassroom.id}`, payload)
                    const result = response.data || response
                    if (!result.success) {
                        this.$message.error(result.message || '更新课堂失败')
                        return
                    }
                    this.$message.success('课堂已更新')
                } else {
                    const response = await this.$http.post('/teaching/classroom/create', payload)
                    const result = response.data || response
                    if (!result.success) {
                        this.$message.error(result.message || '创建课堂失败')
                        return
                    }
                    this.$message.success('课堂已创建')
                }

                this.classroomModalVisible = false
                await this.loadClassrooms()
            } catch (error) {
                this.$message.error(`保存课堂失败：${error.message || '未知错误'}`)
            } finally {
                this.formLoading = false
            }
        },
        async enterClassroom (classroom, isReview = false) {
            try {
                this.$router.push({
                    path: `/classroom/online/${classroom.id}`,
                    query: {
                        role: 'teacher',
                        title: classroom.title || classroom.classroomName || '课堂',
                        subject: classroom.subject || classroom.courseName || '',
                        mode: isReview ? 'review' : 'live'
                    }
                })
            } catch (error) {
                this.$message.error(`进入课堂失败：${error.message || '未知错误'}`)
            }
        },
        async startClassroom (classroom) {
            try {
                const response = await this.$http.post(`/teaching/classroom/start/${classroom.id}`)
                const result = response.data || response
                if (!result.success) {
                    this.$message.error(result.message || '开始课堂失败')
                    return
                }

                classroom.status = 'active'
                this.$message.success('课堂已开始')
                await this.loadClassrooms()
                await this.enterClassroom(classroom)
            } catch (error) {
                this.$message.error(`开始课堂失败：${error.message || '未知错误'}`)
            }
        },
        viewClassroom (classroom) {
            this.selectedClassroom = classroom
            this.detailModalVisible = true
        },
        async handleAction (event, record) {
            switch (event.key) {
            case 'edit':
                await this.editClassroom(record)
                break
            case 'copy':
                this.copyClassroom(record)
                break
            case 'materials':
                this.manageMaterials(record)
                break
            case 'open-ai-classroom':
                await this.openAiPackageClassroom(record)
                break
            case 'end':
                this.endClassroom(record)
                break
            case 'delete':
                this.deleteClassroom(record)
                break
            }
        },
        copyClassroom (classroom) {
            const detail = this.mapClassroomRecord(classroom)
            detail.classroomName = `${detail.title || detail.classroomName || '课堂'}（副本）`
            detail.title = detail.classroomName
            detail.startTime = null

            this.resetClassroomForm()
            this.ensureCourseOption(detail)
            this.classroomForm = this.populateClassroomForm(detail)
            this.classroomForm.startTime = null
            this.editingClassroom = null
            this.classroomModalVisible = true
        },
        endClassroom (classroom) {
            this.$confirm({
                title: '结束课堂',
                content: `确定要结束课堂“${classroom.title || classroom.classroomName || '课堂'}”吗？`,
                onOk: async () => {
                    try {
                        const response = await this.$http.post(`/teaching/classroom/end/${classroom.id}`)
                        const result = response.data || response
                        if (!result.success) {
                            this.$message.error(result.message || '结束课堂失败')
                            return
                        }

                        this.$message.success('课堂已结束')
                        await this.loadClassrooms()
                    } catch (error) {
                        this.$message.error(`结束课堂失败：${error.message || '未知错误'}`)
                    }
                }
            })
        },
        deleteClassroom (classroom) {
            this.$confirm({
                title: '删除课堂',
                content: `确定要删除课堂“${classroom.title || classroom.classroomName || '课堂'}”吗？删除后不可恢复。`,
                onOk: async () => {
                    try {
                        await this.$http.delete(`/teaching/classroom/delete/${classroom.id}`)
                        await this.loadClassrooms()
                        this.$message.success('课堂已删除')
                    } catch (error) {
                        this.$message.error(`删除课堂失败：${error.message || '未知错误'}`)
                    }
                }
            })
        },
        isAiPackageClassroom (record) {
            const normalizedValue = safeString(
                record.selectedLanguage ||
        record.selected_language ||
        record.contentType ||
        record.content_type
            ).trim().toLowerCase()

            return ['ai_package', 'ai-resource', 'ai_resource'].includes(normalizedValue)
        },
        normalizeExternalUrl (value) {
            const normalized = safeString(value).trim()
            if (!normalized) {
                return AI_CLASSROOM_BASE_URL
            }
            if (/^https?:\/\//i.test(normalized)) {
                return normalized.replace(/\/+$/, '')
            }
            return `https://${normalized.replace(/^\/+/, '').replace(/\/+$/, '')}`
        },
        buildAiClassroomLaunchUrl (baseUrl, options = {}) {
            const url = new URL(this.normalizeExternalUrl(baseUrl))
            const importUrl = safeString(options.importUrl).trim()
            const resourceName = safeString(options.resourceName).trim()

            if (importUrl) {
                url.searchParams.set('importUrl', importUrl)
                url.searchParams.set('autoOpen', '1')
                url.searchParams.set('source', 'classroom-manager')
                if (resourceName) {
                    url.searchParams.set('resourceName', resourceName)
                }
            }

            return url.toString()
        },
        async openAiPackageClassroom (record) {
            const resourceId = record && record.resourceId
            if (!resourceId) {
                this.$message.warning('当前课堂没有可用的 AI 资源包')
                return
            }

            let shareData = {}
            try {
                const response = await courseResourceApi.getShareLink(resourceId, { expireDays: 7 })
                if (response && response.success) {
                    shareData = response.result || {}
                }
            } catch (error) {
            }

            const baseUrl = this.normalizeExternalUrl(shareData.openMaicHomeUrl)
            const importUrl = shareData.aiPackageDownloadUrl || shareData.downloadUrl || shareData.shareUrl || ''
            const resourceName = record.resourceName || 'AI课堂资源'
            const launchUrl = this.buildAiClassroomLaunchUrl(baseUrl, {
                importUrl,
                resourceName
            })

            const popup = window.open(launchUrl, '_blank', 'noopener,noreferrer')
            if (!popup) {
                this.$message.warning('浏览器拦截了新窗口，请允许弹窗后重试')
                return
            }

            if (importUrl) {
                this.$message.success('已在新标签页打开 AI 课堂，并尝试自动导入资源包')
            } else {
                this.$message.info('已在新标签页打开 AI 课堂')
            }
        },
        resolveCourseContentPath () {
            const access = resolveTeachingAccess({
                userInfo: this.$store.getters.userInfo || {},
                userRole: this.$store.getters.userRole || [],
                userType: this.$store.getters.userType || ''
            })

            if (access.isAdmin) {
                return '/admin/course-content-admin'
            }
            if (access.isTeacher) {
                return '/teacher/course-content'
            }
            return '/portal/courseList'
        },
        manageMaterials (record) {
            if (!record || !record.id) {
                this.$message.warning('未找到课堂资料入口')
                return
            }

            this.$router.push({
                path: this.resolveCourseContentPath(),
                query: {
                    source: 'classroom-manager',
                    classroomId: record.id,
                    classroomName: record.title || record.classroomName || '',
                    courseId: record.courseId || '',
                    courseName: record.courseName || '',
                    lessonId: record.lessonId || '',
                    lessonName: record.lessonName || '',
                    previewResourceId: record.resourceId || ''
                }
            }).catch(() => {})
        }
    }
}
</script>

<style scoped lang="less">
.classroom-manager {
  padding: 8px;
}

.stats-section {
  margin-bottom: 16px;
}

.filter-section {
  margin-bottom: 16px;
}

.classroom-table {
  margin-top: 12px;
}

.action-group > * {
  display: inline-block;
}
</style>
