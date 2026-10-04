<template>
  <div class="homework-management">
    <a-card :bordered="false">
      <div class="page-header">
        <a-row :gutter="16" style="margin-bottom: 16px;">
          <a-col :span="18">
            <h2>作业管理</h2>
            <p>发布、管理和评分学生作业</p>
          </a-col>
          <a-col :span="6" style="text-align: right;">
            <a-button type="primary" icon="plus" @click="showCreateModal = true">
              发布新作业
            </a-button>
          </a-col>
        </a-row>
      </div>

      <!-- 作业统计 -->
      <div class="homework-stats">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-statistic title="总作业数" :value="totalHomeworks" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="待评分" :value="pendingGrading" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="已完成" :value="completedHomeworks" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="平均分" :value="averageScore" suffix="分" />
          </a-col>
        </a-row>
      </div>

      <!-- 搜索和筛选 -->
      <a-row :gutter="16" style="margin: 24px 0;">
        <a-col :span="8">
          <debounced-search
            v-model="searchText"
            placeholder="搜索作业标题或内容"
            :delay="300"
            :sanitize="true"
            @search="handleSearch"
          />
        </a-col>
        <a-col :span="4">
          <a-select
            v-model="selectedStatus"
            placeholder="作业状态"
            style="width: 100%"
            allow-clear
            @change="handleFilter"
          >
            <a-select-option value="">全部状态</a-select-option>
            <a-select-option value="draft">草稿</a-select-option>
            <a-select-option value="published">已发布</a-select-option>
            <a-select-option value="ended">已结束</a-select-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select
            v-model="selectedSubject"
            placeholder="学科"
            style="width: 100%"
            allow-clear
            @change="handleFilter"
          >
            <a-select-option value="">全部学科</a-select-option>
            <a-select-option value="scratch">Scratch编程</a-select-option>
            <a-select-option value="python">Python编程</a-select-option>
            <a-select-option value="algorithm">算法思维</a-select-option>
            <a-select-option value="project">项目实践</a-select-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-select
            v-model="sortBy"
            placeholder="排序方式"
            style="width: 100%"
            @change="handleSort"
          >
            <a-select-option value="latest">最新发布</a-select-option>
            <a-select-option value="deadline">截止时间</a-select-option>
            <a-select-option value="submissions">提交数量</a-select-option>
          </a-select>
        </a-col>
        <a-col :span="4">
          <a-button-group>
            <a-button icon="table" @click="viewMode = 'table'" :type="viewMode === 'table' ? 'primary' : 'default'">
              列表
            </a-button>
            <a-button icon="appstore" @click="viewMode = 'card'" :type="viewMode === 'card' ? 'primary' : 'default'">
              卡片
            </a-button>
          </a-button-group>
        </a-col>
      </a-row>

      <!-- 作业列表 - 卡片视图 -->
      <div v-if="viewMode === 'card'" class="homework-cards">
        <a-row :gutter="[16, 16]">
          <a-col
            :xl="8"
            :lg="12"
            :md="12"
            :sm="24"
            v-for="homework in filteredHomeworks"
            :key="homework.id"
          >
            <a-card
              :hoverable="true"
              class="homework-card"
              @click="viewHomework(homework)"
            >
              <template #actions>
                <a-tooltip title="查看详情">
                  <a-icon type="eye" @click.stop="viewHomework(homework)" />
                </a-tooltip>
                <a-tooltip title="评分管理">
                  <a-icon type="edit" @click.stop="gradeHomework(homework)" />
                </a-tooltip>
                <a-tooltip title="数据统计">
                  <a-icon type="bar-chart" @click.stop="viewStats(homework)" />
                </a-tooltip>
                <a-dropdown @click.stop="">
                  <a-icon type="more" />
                  <a-menu slot="overlay">
                    <a-menu-item @click="editHomework(homework)">
                      <a-icon type="edit" />
                      编辑作业
                    </a-menu-item>
                    <a-menu-item @click="duplicateHomework(homework)">
                      <a-icon type="copy" />
                      复制作业
                    </a-menu-item>
                    <a-menu-item @click="exportHomework(homework)">
                      <a-icon type="download" />
                      导出数据
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item @click="deleteHomework(homework)">
                      <a-icon type="delete" />
                      删除作业
                    </a-menu-item>
                  </a-menu>
                </a-dropdown>
              </template>

              <a-card-meta>
                <template #title>
                  <div class="homework-title">
                    {{ safe(homework.title) }}
                    <a-tag :color="getStatusColor(homework.status)">
                      {{ getStatusText(homework.status) }}
                    </a-tag>
                  </div>
                </template>
                <template #description>
                  <div class="homework-info">
                    <div class="homework-description">
                      {{ safe(homework.description) }}
                    </div>

                    <div class="homework-meta">
                      <div class="meta-row">
                        <span class="meta-item">
                          <a-icon type="book" />
                          {{ getSubjectText(homework.subject) }}
                        </span>
                        <span class="meta-item">
                          <a-icon type="clock-circle" />
                          {{ formatDeadline(homework.deadline) }}
                        </span>
                      </div>

                      <div class="meta-row">
                        <span class="meta-item">
                          <a-icon type="team" />
                          {{ homework.submissionCount }}/{{ homework.totalStudents }} 已提交
                        </span>
                        <span class="meta-item">
                          <a-icon type="check-circle" />
                          {{ homework.gradedCount }} 已评分
                        </span>
                      </div>

                      <div class="progress-section">
                        <div class="progress-label">提交进度</div>
                        <a-progress
                          :percent="getSubmissionProgress(homework)"
                          size="small"
                          status="active"
                        />
                      </div>
                    </div>
                  </div>
                </template>
              </a-card-meta>
            </a-card>
          </a-col>
        </a-row>
      </div>

      <!-- 作业列表 - 表格视图 -->
      <div v-if="viewMode === 'table'" class="homework-table">
        <a-table
          :columns="tableColumns"
          :data-source="filteredHomeworks"
          :pagination="pagination"
          :loading="loading"
          row-key="id"
          @change="handleTableChange"
        >
          <template #title="text, record">
            <div class="table-title">
              <span>{{ safe(record.title) }}</span>
              <a-tag :color="getStatusColor(record.status)" size="small">
                {{ getStatusText(record.status) }}
              </a-tag>
            </div>
          </template>

          <template #subject="text">
            {{ getSubjectText(text) }}
          </template>

          <template #deadline="text">
            <span :class="{ 'deadline-warning': isDeadlineNear(text) }">
              {{ formatDeadline(text) }}
            </span>
          </template>

          <template #progress="text, record">
            <div class="table-progress">
              <a-progress
                :percent="getSubmissionProgress(record)"
                size="small"
                :format="percent => `${record.submissionCount}/${record.totalStudents}`"
              />
            </div>
          </template>

          <template #actions="text, record">
            <a-button-group size="small">
              <a-button icon="eye" @click="viewHomework(record)">
                查看
              </a-button>
              <a-button icon="edit" @click="gradeHomework(record)">
                评分
              </a-button>
              <a-button icon="bar-chart" @click="viewStats(record)">
                统计
              </a-button>
            </a-button-group>
          </template>
        </a-table>
      </div>
    </a-card>

    <!-- 创建作业弹窗 -->
    <a-modal
      title="发布新作业"
      :visible="showCreateModal"
      :width="900"
      :footer="null"
      @cancel="showCreateModal = false"
    >
      <homework-create-form
        @create-success="handleCreateSuccess"
        @cancel="showCreateModal = false"
      />
    </a-modal>

    <!-- 作业详情弹窗 -->
    <a-modal
      title="作业详情"
      :visible="showDetailModal"
      :width="1200"
      :footer="null"
      @cancel="showDetailModal = false"
    >
      <homework-detail-view
        :homework="selectedHomework"
        v-if="selectedHomework"
        @edit="editHomework"
        @grade="gradeHomework"
      />
    </a-modal>

    <!-- 评分管理弹窗 -->
    <a-modal
      title="评分管理"
      :visible="showGradingModal"
      :width="1400"
      :footer="null"
      @cancel="showGradingModal = false"
    >
      <homework-grading-workspace
        :homework="selectedHomework"
        v-if="selectedHomework"
        @grading-complete="handleGradingComplete"
      />
    </a-modal>

    <!-- 统计分析弹窗 -->
    <a-modal
      title="作业统计分析"
      :visible="showStatsModal"
      :width="1000"
      :footer="null"
      @cancel="showStatsModal = false"
    >
      <homework-statistics
        :homework="selectedHomework"
        v-if="selectedHomework"
      />
    </a-modal>
  </div>
</template>

<script>
import HomeworkCreateForm from './components/HomeworkCreateForm'
import HomeworkDetailView from './components/HomeworkDetailView'
import HomeworkGradingWorkspace from './components/HomeworkGradingWorkspace'
import HomeworkStatistics from './components/HomeworkStatistics'
import DebouncedSearch from '@/components/DebouncedSearch'
import { sanitizeInput } from '@/utils/security'

import { getTeacherHomeworks } from '@/api/homework'

export default {
    name: 'HomeworkManagement',
    components: {
        HomeworkCreateForm,
        HomeworkDetailView,
        HomeworkGradingWorkspace,
        HomeworkStatistics,
        DebouncedSearch
    },
    data () {
        return {
            searchText: '',
            selectedStatus: '',
            selectedSubject: '',
            sortBy: 'latest',
            viewMode: 'card',
            loading: false,
            showCreateModal: false,
            showDetailModal: false,
            showGradingModal: false,
            showStatsModal: false,
            selectedHomework: null,

            pagination: {
                current: 1,
                pageSize: 10,
                total: 0,
                showTotal: total => `共 ${total} 个作业`
            },

            tableColumns: [
                {
                    title: '作业标题',
                    dataIndex: 'title',
                    key: 'title',
                    scopedSlots: { customRender: 'title' }
                },
                {
                    title: '学科',
                    dataIndex: 'subject',
                    key: 'subject',
                    scopedSlots: { customRender: 'subject' }
                },
                {
                    title: '截止时间',
                    dataIndex: 'deadline',
                    key: 'deadline',
                    scopedSlots: { customRender: 'deadline' }
                },
                {
                    title: '提交进度',
                    key: 'progress',
                    scopedSlots: { customRender: 'progress' }
                },
                {
                    title: '发布时间',
                    dataIndex: 'publishTime',
                    key: 'publishTime'
                },
                {
                    title: '操作',
                    key: 'actions',
                    fixed: 'right',
                    width: 180,
                    scopedSlots: { customRender: 'actions' }
                }
            ],

            homeworks: []
        }
    },
    mounted () {
        this.loadHomeworks()
    },
    computed: {
        filteredHomeworks () {
            // API已处理分页和部分筛选，这里主要处理前端显示排序和额外过滤
            // 如果数据量大，建议全部移至后端处理
            let filtered = this.homeworks

            // 搜索过滤 (如果API支持搜索，这里可以移除)
            if (this.searchText) {
                const searchLower = this.searchText.toLowerCase()
                filtered = filtered.filter(homework =>
                    homework.title.toLowerCase().includes(searchLower) ||
          (homework.description && homework.description.toLowerCase().includes(searchLower))
                )
            }

            // 状态过滤 (如果API支持，这里可以移除)
            if (this.selectedStatus) {
                filtered = filtered.filter(homework => homework.status === this.selectedStatus)
            }

            // 学科过滤
            if (this.selectedSubject) {
                filtered = filtered.filter(homework => homework.subject === this.selectedSubject)
            }

            // 排序
            return this.sortHomeworks(filtered)
        },

        totalHomeworks () {
            return this.pagination.total
        },

        pendingGrading () {
            return this.homeworks.reduce((total, homework) => {
                const pending = (homework.submissionCount || 0) - (homework.gradedCount || 0)
                return total + (pending > 0 ? pending : 0)
            }, 0)
        },

        completedHomeworks () {
            return this.homeworks.filter(homework => homework.status === 'ended' || new Date(homework.deadline) < new Date()).length
        },

        averageScore () {
            const published = this.homeworks.filter(homework => (homework.gradedCount || 0) > 0)
            if (published.length === 0) return 0
            const total = published.reduce((sum, homework) => sum + (homework.averageScore || 0), 0)
            return Math.round(total / published.length * 10) / 10
        }
    },
    methods: {
        loadHomeworks () {
            this.loading = true
            getTeacherHomeworks({
                pageNo: this.pagination.current,
                pageSize: this.pagination.pageSize,
                status: this.selectedStatus || undefined
            }).then(res => {
                if (res.success && res.result) {
                    const records = res.result.records || []
                    // 过滤掉模板，只显示已分配的作业
                    const assignedHomeworks = records.filter(item => item.is_template === 0)

                    this.homeworks = assignedHomeworks.map(item => {
                        // 状态映射
                        let status = 'draft' // pending
                        if (item.status === 'ongoing') status = 'published'
                        if (item.status === 'closed') status = 'ended'

                        return {
                            id: item.id,
                            title: item.homework_title,
                            description: item.description,
                            subject: item.course_id ? 'scratch' : 'other',
                            status: status, // 使用映射后的状态
                            deadline: item.deadline,
                            publishTime: item.publish_time,
                            totalStudents: item.total_students || 0,
                            submissionCount: item.submitted_count || 0,
                            gradedCount: 0, // 需后端补充
                            averageScore: 0, // 需后端补充
                            maxScore: item.total_score,
                            // 保留原始数据
                            ...item
                        }
                    })
                    this.pagination.total = res.result.total // 注意：这里Total可能包含模板，如果后端没过滤的话分页会有点准不确，但在前端过滤是临时方案
                } else {
                    this.$message.warning('获取作业列表失败')
                }
            }).catch(err => {
                console.error(err)
                this.$message.error('加载失败')
            }).finally(() => {
                this.loading = false
            })
        },

        // 安全输入清理方法
        safe (text) {
            return sanitizeInput(text, { maxLength: 200 })
        },

        getStatusColor (status) {
            const colorMap = {
                'draft': 'default',
                'published': 'processing',
                'ended': 'success'
            }
            return colorMap[status] || 'default'
        },

        getStatusText (status) {
            const textMap = {
                'draft': '草稿',
                'published': '进行中',
                'ended': '已结束'
            }
            return textMap[status] || '未知'
        },

        getSubjectText (subject) {
            const textMap = {
                'scratch': 'Scratch编程',
                'python': 'Python编程',
                'algorithm': '算法思维',
                'project': '项目实践'
            }
            return textMap[subject] || '其他'
        },

        formatDeadline (deadline) {
            if (!deadline) return '未设置'
            const date = new Date(deadline)
            const now = new Date()
            const diff = date - now
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

            if (days < 0) return '已截止'
            if (days === 0) return '今天截止'
            if (days === 1) return '明天截止'
            return `${days}天后截止`
        },

        isDeadlineNear (deadline) {
            if (!deadline) return false
            const date = new Date(deadline)
            const now = new Date()
            const diff = date - now
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
            return days <= 3 && days >= 0
        },

        getSubmissionProgress (homework) {
            if (homework.totalStudents === 0) return 0
            return Math.round((homework.submissionCount / homework.totalStudents) * 100)
        },

        sortHomeworks (homeworks) {
            const sorted = [...homeworks]
            switch (this.sortBy) {
            case 'latest':
                return sorted.sort((a, b) => new Date(b.publishTime || 0) - new Date(a.publishTime || 0))
            case 'deadline':
                return sorted.sort((a, b) => new Date(a.deadline || '9999-12-31') - new Date(b.deadline || '9999-12-31'))
            case 'submissions':
                return sorted.sort((a, b) => b.submissionCount - a.submissionCount)
            default:
                return sorted
            }
        },

        handleSearch () {
            // 搜索逻辑在computed中处理
        },

        handleFilter () {
            // 筛选逻辑在computed中处理
        },

        handleSort () {
            // 排序逻辑在computed中处理
        },

        handleTableChange (pagination) {
            this.pagination = pagination
        },

        viewHomework (homework) {
            this.selectedHomework = homework
            this.showDetailModal = true
        },

        editHomework (homework) {
            this.$message.info('编辑功能开发中...')
        },

        gradeHomework (homework) {
            this.selectedHomework = homework
            this.showGradingModal = true
        },

        viewStats (homework) {
            this.selectedHomework = homework
            this.showStatsModal = true
        },

        duplicateHomework (homework) {
            this.$message.success(`已复制作业：${this.safe(homework.title)}`)
        },

        exportHomework (homework) {
            this.$message.success(`正在导出作业数据：${this.safe(homework.title)}`)
        },

        deleteHomework (homework) {
            this.$confirm({
                title: '确认删除',
                content: `确定要删除作业"${this.safe(homework.title)}"吗？此操作不可恢复。`,
                onOk: () => {
                    const index = this.homeworks.findIndex(h => h.id === homework.id)
                    if (index > -1) {
                        this.homeworks.splice(index, 1)
                        this.$message.success('作业删除成功')
                    }
                }
            })
        },

        handleCreateSuccess (newHomework) {
            this.homeworks.unshift(newHomework)
            this.showCreateModal = false
            this.$message.success('作业创建成功')
        },

        handleGradingComplete () {
            this.showGradingModal = false
            this.$message.success('评分完成')
        }
    }
}
</script>

<style scoped>
.homework-management {
  padding: 24px;
}

.page-header h2 {
  margin: 0;
  color: #1890ff;
  font-size: 24px;
}

.page-header p {
  margin: 8px 0 0 0;
  color: #666;
}

.homework-stats {
  background: #fafafa;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.homework-cards .homework-card {
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s;
  cursor: pointer;
}

.homework-cards .homework-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.homework-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}

.homework-info {
  margin-top: 8px;
}

.homework-description {
  color: #666;
  font-size: 13px;
  line-height: 1.4;
  margin-bottom: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.homework-meta {
  font-size: 12px;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #666;
}

.progress-section {
  margin-top: 12px;
}

.progress-label {
  color: #666;
  font-size: 12px;
  margin-bottom: 4px;
}

.homework-table .table-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.deadline-warning {
  color: #ff4d4f;
  font-weight: 500;
}

.table-progress {
  width: 120px;
}
</style>
