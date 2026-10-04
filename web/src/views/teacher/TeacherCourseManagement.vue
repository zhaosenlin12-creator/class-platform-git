<template>
  <div class="teacher-course-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="title-section">
        <h2>课程管理</h2>
        <p>管理您的教学课程，包括创建、编辑和发布课程</p>
      </div>

      <div class="action-section">
        <a-button type="primary" icon="plus" @click="showCreateModal = true">
          创建课程
        </a-button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <a-row :gutter="16">
        <a-col :span="6">
          <a-statistic title="总课程数" :value="stats.total" suffix="门" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="已发布" :value="stats.published" suffix="门" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="草稿" :value="stats.draft" suffix="门" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="总学员" :value="stats.totalStudents" suffix="人" />
        </a-col>
      </a-row>
    </div>

    <!-- 过滤和搜索 -->
    <div class="filter-section">
      <a-card>
        <a-row :gutter="16">
          <a-col :span="6">
            <a-select v-model="filters.status" placeholder="课程状态" style="width: 100%" @change="loadCourseList">
              <a-select-option value="">全部状态</a-select-option>
              <a-select-option value="draft">草稿</a-select-option>
              <a-select-option value="published">已发布</a-select-option>
              <a-select-option value="archived">已归档</a-select-option>
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-select v-model="filters.category" placeholder="课程分类" style="width: 100%" @change="loadCourseList">
              <a-select-option value="">全部分类</a-select-option>
              <a-select-option value="scratch">Scratch编程</a-select-option>
              <a-select-option value="python">Python编程</a-select-option>
              <a-select-option value="javascript">JavaScript编程</a-select-option>
              <a-select-option value="other">其他</a-select-option>
            </a-select>
          </a-col>
          <a-col :span="8">
            <a-input-search
              v-model="filters.keyword"
              placeholder="搜索课程名称"
              @search="loadCourseList"
            />
          </a-col>
          <a-col :span="4">
            <a-button @click="resetFilters">重置</a-button>
          </a-col>
        </a-row>
      </a-card>
    </div>

    <!-- 课程列表 -->
    <div class="course-list">
      <a-card>
        <a-table
          :columns="columns"
          :data-source="courseList"
          :loading="loading"
          :pagination="pagination"
          @change="handleTableChange"
          row-key="id"
        >
          <!-- 课程信息 -->
          <template #courseInfo="text, record">
            <div class="course-info">
              <img :src="record.coverImage || defaultCourseCover" class="course-cover" />
              <div class="course-details">
                <h4>{{ record.courseName }}</h4>
                <p>{{ record.description }}</p>
              </div>
            </div>
          </template>

          <!-- 分类 -->
          <template #category="text">
            <a-tag :color="getCategoryColor(text)">
              {{ getCategoryText(text) }}
            </a-tag>
          </template>

          <!-- 状态 -->
          <template #status="text">
            <a-tag :color="getStatusColor(text)">
              {{ getStatusText(text) }}
            </a-tag>
          </template>

          <!-- 学员数 -->
          <template #studentCount="text">
            <a-avatar-group :max-count="3" size="small">
              <a-avatar v-for="student in text.slice(0, 3)" :key="student.id" :src="student.avatar">
                {{ student.name.charAt(0) }}
              </a-avatar>
            </a-avatar-group>
            <span style="margin-left: 8px">{{ text.length }}人</span>
          </template>

          <!-- 创建时间 -->
          <template #createTime="text">
            {{ formatTime(text) }}
          </template>

          <!-- 操作 -->
          <template #action="text, record">
            <a-space>
              <a-button type="link" size="small" @click="editCourse(record)">
                编辑
              </a-button>
              <a-button type="link" size="small" @click="viewStatistics(record)">
                统计
              </a-button>
              <a-dropdown>
                <a-menu slot="overlay" @click="handleMenuClick($event, record)">
                  <a-menu-item key="publish" v-if="record.status === 'draft'">
                    <a-icon type="rocket" />发布课程
                  </a-menu-item>
                  <a-menu-item key="archive" v-if="record.status === 'published'">
                    <a-icon type="inbox" />归档课程
                  </a-menu-item>
                  <a-menu-item key="duplicate">
                    <a-icon type="copy" />复制课程
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="delete" style="color: red">
                    <a-icon type="delete" />删除课程
                  </a-menu-item>
                </a-menu>
                <a-button type="link" size="small">
                  更多 <a-icon type="down" />
                </a-button>
              </a-dropdown>
            </a-space>
          </template>
        </a-table>
      </a-card>
    </div>

    <!-- 创建/编辑课程模态框 -->
    <a-modal
      v-model="showCreateModal"
      :title="editingCourse ? '编辑课程' : '创建课程'"
      width="800px"
      @ok="handleSubmitCourse"
      @cancel="cancelEditCourse"
      :confirm-loading="submitLoading"
    >
      <a-form :form="courseForm" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="课程名称">
              <a-input
                v-decorator="['courseName', { rules: [{ required: true, message: '请输入课程名称' }] }]"
                placeholder="请输入课程名称"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="课程分类">
              <a-select
                v-decorator="['category', { rules: [{ required: true, message: '请选择课程分类' }] }]"
                placeholder="请选择课程分类"
              >
                <a-select-option value="scratch">Scratch编程</a-select-option>
                <a-select-option value="python">Python编程</a-select-option>
                <a-select-option value="javascript">JavaScript编程</a-select-option>
                <a-select-option value="other">其他</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="课程描述">
          <a-textarea
            v-decorator="['description', { rules: [{ required: true, message: '请输入课程描述' }] }]"
            placeholder="请输入课程描述"
            :rows="4"
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="适合年龄">
              <a-select
                v-decorator="['targetAge', { rules: [{ required: true, message: '请选择适合年龄' }] }]"
                placeholder="请选择适合年龄"
              >
                <a-select-option value="6-8">6-8岁</a-select-option>
                <a-select-option value="9-12">9-12岁</a-select-option>
                <a-select-option value="13-16">13-16岁</a-select-option>
                <a-select-option value="17+">17岁以上</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="难度等级">
              <a-select
                v-decorator="['difficulty', { rules: [{ required: true, message: '请选择难度等级' }] }]"
                placeholder="请选择难度等级"
              >
                <a-select-option value="beginner">初级</a-select-option>
                <a-select-option value="intermediate">中级</a-select-option>
                <a-select-option value="advanced">高级</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="课程目标">
          <a-textarea
            v-decorator="['objectives']"
            placeholder="请输入课程学习目标"
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 课程统计模态框 -->
    <a-modal
      v-model="showStatsModal"
      title="课程统计"
      width="600px"
      :footer="null"
    >
      <div v-if="currentCourseStats" class="course-stats">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-statistic title="总学员数" :value="currentCourseStats.totalStudents" />
          </a-col>
          <a-col :span="12">
            <a-statistic title="活跃学员" :value="currentCourseStats.activeStudents" />
          </a-col>
        </a-row>
        <a-row :gutter="16" style="margin-top: 16px">
          <a-col :span="12">
            <a-statistic title="平均完成率" :value="currentCourseStats.averageCompletion" suffix="%" />
          </a-col>
          <a-col :span="12">
            <a-statistic title="平均评分" :value="currentCourseStats.averageRating" suffix="分" />
          </a-col>
        </a-row>
      </div>
    </a-modal>
  </div>
</template>

<script>
import moment from 'moment'
import { courseApi } from '@/api/teaching'

const EMPTY_STATS = {
    total: 0,
    published: 0,
    draft: 0,
    totalStudents: 0
}

export default {
    name: 'TeacherCourseManagement',
    data () {
        return {
            loading: false,
            submitLoading: false,
            defaultCourseCover: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiB2aWV3Qm94PSIwIDAgMjAwIDE1MCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNlOGY0ZmQiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjQwIiBmaWxsPSIjMTg5MGZmIj7wn5ONPC90ZXh0Pjwvc3ZnPg==',
            stats: { ...EMPTY_STATS },
            filters: {
                status: '',
                category: '',
                keyword: ''
            },
            courseList: [],
            pagination: {
                current: 1,
                pageSize: 10,
                total: 0,
                showSizeChanger: true
            },
            columns: [
                {
                    title: '????',
                    key: 'courseInfo',
                    width: 300,
                    scopedSlots: { customRender: 'courseInfo' }
                },
                {
                    title: '??',
                    dataIndex: 'category',
                    key: 'category',
                    scopedSlots: { customRender: 'category' }
                },
                {
                    title: '??',
                    dataIndex: 'status',
                    key: 'status',
                    scopedSlots: { customRender: 'status' }
                },
                {
                    title: '??',
                    dataIndex: 'students',
                    key: 'students',
                    scopedSlots: { customRender: 'studentCount' }
                },
                {
                    title: '????',
                    dataIndex: 'createTime',
                    key: 'createTime',
                    scopedSlots: { customRender: 'createTime' }
                },
                {
                    title: '??',
                    key: 'action',
                    width: 200,
                    scopedSlots: { customRender: 'action' }
                }
            ],
            showCreateModal: false,
            showStatsModal: false,
            editingCourse: null,
            courseForm: this.$form.createForm(this),
            currentCourseStats: null
        }
    },
    mounted () {
        this.loadStats()
        this.loadCourseList()
    },
    methods: {
        async loadStats () {
            try {
                const response = await courseApi.getCourseList({ statsOnly: true })
                this.stats = response && response.success && response.result && response.result.stats
                    ? { ...EMPTY_STATS, ...response.result.stats }
                    : { ...EMPTY_STATS }
            } catch (error) {
                console.error('????????:', error)
                this.stats = { ...EMPTY_STATS }
            }
        },
        async loadCourseList () {
            this.loading = true
            try {
                const params = {
                    pageNo: this.pagination.current,
                    pageSize: this.pagination.pageSize,
                    status: this.filters.status || undefined,
                    category: this.filters.category || undefined,
                    keyword: this.filters.keyword || undefined
                }
                const response = await courseApi.getCourseList(params)
                if (response && response.success && response.result) {
                    this.courseList = response.result.records || []
                    this.pagination.total = Number(response.result.total) || 0
                } else {
                    this.courseList = []
                    this.pagination.total = 0
                }
            } catch (error) {
                console.error('????????:', error)
                this.courseList = []
                this.pagination.total = 0
            } finally {
                this.loading = false
            }
        },
        resetFilters () {
            this.filters = {
                status: '',
                category: '',
                keyword: ''
            }
            this.pagination.current = 1
            this.loadCourseList()
        },
        handleTableChange (pagination) {
            this.pagination.current = pagination.current
            this.pagination.pageSize = pagination.pageSize
            this.loadCourseList()
        },
        editCourse (course) {
            this.editingCourse = course
            this.showCreateModal = true
            this.$nextTick(() => {
                this.courseForm.setFieldsValue({
                    courseName: course.courseName,
                    category: course.category,
                    description: course.description,
                    targetAge: course.targetAge,
                    difficulty: course.difficulty,
                    objectives: course.objectives
                })
            })
        },
        cancelEditCourse () {
            this.editingCourse = null
            this.courseForm.resetFields()
        },
        async handleSubmitCourse () {
            try {
                const values = await new Promise((resolve, reject) => {
                    this.courseForm.validateFields((error, result) => {
                        if (error) {
                            reject(error)
                        } else {
                            resolve(result)
                        }
                    })
                })

                this.submitLoading = true
                const response = this.editingCourse
                    ? await courseApi.updateCourse(this.editingCourse.id, values)
                    : await courseApi.createCourse(values)

                if (response && response.success) {
                    this.$message.success(this.editingCourse ? '??????' : '??????')
                    this.showCreateModal = false
                    this.cancelEditCourse()
                    await this.loadCourseList()
                    await this.loadStats()
                } else {
                    this.$message.error((response && response.message) || '????????')
                }
            } catch (error) {
                console.error('??????:', error)
                this.$message.error(error.message || '????????')
            } finally {
                this.submitLoading = false
            }
        },
        async handleMenuClick (event, record) {
            const { key } = event
            switch (key) {
            case 'publish':
                await this.publishCourse(record)
                break
            case 'archive':
                await this.archiveCourse(record)
                break
            case 'duplicate':
                await this.duplicateCourse(record)
                break
            case 'delete':
                this.deleteCourse(record)
                break
            }
        },
        async publishCourse (course) {
            try {
                const response = await courseApi.publishCourse(course.id)
                if (response && response.success) {
                    this.$message.success('??????')
                    await this.loadCourseList()
                    await this.loadStats()
                } else {
                    this.$message.error((response && response.message) || '????????')
                }
            } catch (error) {
                console.error('??????:', error)
                this.$message.error(error.message || '????????')
            }
        },
        async archiveCourse (course) {
            try {
                const response = await courseApi.updateCourse(course.id, { status: 'archived' })
                if (response && response.success) {
                    this.$message.success('?????')
                    await this.loadCourseList()
                    await this.loadStats()
                } else {
                    this.$message.error((response && response.message) || '????????')
                }
            } catch (error) {
                console.error('??????:', error)
                this.$message.error(error.message || '????????')
            }
        },
        async duplicateCourse (course) {
            try {
                const courseData = {
                    ...course,
                    courseName: course.courseName + ' - ??',
                    status: 'draft'
                }
                delete courseData.id

                const response = await courseApi.createCourse(courseData)
                if (response && response.success) {
                    this.$message.success('??????')
                    await this.loadCourseList()
                    await this.loadStats()
                } else {
                    this.$message.error((response && response.message) || '????????')
                }
            } catch (error) {
                console.error('??????:', error)
                this.$message.error(error.message || '????????')
            }
        },
        deleteCourse (course) {
            this.$confirm({
                title: '????',
                content: '???????????????????',
                onOk: async () => {
                    try {
                        const response = await courseApi.deleteCourse(course.id)
                        if (response && response.success) {
                            this.$message.success('??????')
                            await this.loadCourseList()
                            await this.loadStats()
                        } else {
                            this.$message.error((response && response.message) || '????????')
                        }
                    } catch (error) {
                        console.error('??????:', error)
                        this.$message.error(error.message || '????????')
                    }
                }
            })
        },
        async viewStatistics (course) {
            try {
                const response = await courseApi.getCourseStatistics(course.id)
                this.currentCourseStats = response && response.success ? response.result : null
                this.showStatsModal = true
            } catch (error) {
                console.error('????????:', error)
                this.currentCourseStats = null
                this.showStatsModal = true
            }
        },
        getCategoryText (category) {
            const categoryMap = {
                scratch: 'Scratch',
                python: 'Python',
                javascript: 'JavaScript',
                other: '??'
            }
            return categoryMap[category] || '??'
        },
        getCategoryColor (category) {
            const colorMap = {
                scratch: 'orange',
                python: 'blue',
                javascript: 'green',
                other: 'gray'
            }
            return colorMap[category] || 'default'
        },
        getStatusText (status) {
            const statusMap = {
                draft: '??',
                published: '???',
                archived: '???'
            }
            return statusMap[status] || '??'
        },
        getStatusColor (status) {
            const colorMap = {
                draft: 'default',
                published: 'green',
                archived: 'gray'
            }
            return colorMap[status] || 'default'
        },
        formatTime (time) {
            return moment(time).format('YYYY-MM-DD')
        }
    }
}
</script>

<style lang="less" scoped>
.teacher-course-management {
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    padding: 24px;
    border-radius: 8px;
    margin-bottom: 16px;

    .title-section {
      h2 {
        margin: 0 0 8px 0;
        color: #262626;
      }

      p {
        margin: 0;
        color: #8c8c8c;
      }
    }
  }

  .stats-section {
    background: white;
    padding: 24px;
    border-radius: 8px;
    margin-bottom: 16px;
  }

  .filter-section {
    margin-bottom: 16px;
  }

  .course-list {
    .course-info {
      display: flex;
      align-items: center;

      .course-cover {
        width: 60px;
        height: 40px;
        border-radius: 4px;
        object-fit: cover;
        margin-right: 12px;
      }

      .course-details {
        h4 {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 500;
        }

        p {
          margin: 0;
          color: #666;
          font-size: 12px;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }

  .course-stats {
    .ant-row {
      margin-bottom: 16px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}
</style>
