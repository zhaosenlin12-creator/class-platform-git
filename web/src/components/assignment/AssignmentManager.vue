<template>
  <div class="assignment-manager">
    <div class="manager-header">
      <h2>作业管理</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog = true">
          <i class="el-icon-plus"></i> 创建作业
        </el-button>
        <el-button @click="refreshAssignments">
          <i class="el-icon-refresh"></i> 刷新
        </el-button>
      </div>
    </div>

    <div class="filter-bar">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-select v-model="filters.status" placeholder="状态筛选" clearable>
            <el-option label="全部" value=""></el-option>
            <el-option label="未发布" value="draft"></el-option>
            <el-option label="进行中" value="active"></el-option>
            <el-option label="已截止" value="closed"></el-option>
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="filters.subject" placeholder="科目筛选" clearable>
            <el-option label="全部" value=""></el-option>
            <el-option label="数学" value="math"></el-option>
            <el-option label="语文" value="chinese"></el-option>
            <el-option label="英语" value="english"></el-option>
            <el-option label="物理" value="physics"></el-option>
            <el-option label="化学" value="chemistry"></el-option>
          </el-select>
        </el-col>
        <el-col :span="12">
          <el-input
            v-model="filters.keyword"
            placeholder="搜索作业标题或内容"
            prefix-icon="el-icon-search"
            clearable
          ></el-input>
        </el-col>
      </el-row>
    </div>

    <el-table
      :data="filteredAssignments"
      v-loading="loading"
      style="width: 100%"
      @sort-change="handleSortChange"
    >
      <el-table-column prop="title" label="作业标题" min-width="200">
        <template slot-scope="scope">
          <el-link @click="viewAssignment(scope.row)" type="primary">
            {{ scope.row.title }}
          </el-link>
        </template>
      </el-table-column>

      <el-table-column prop="subject" label="科目" width="100">
        <template slot-scope="scope">
          <el-tag :type="getSubjectTagType(scope.row.subject)">
            {{ getSubjectName(scope.row.subject) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="status" label="状态" width="100">
        <template slot-scope="scope">
          <el-tag :type="getStatusTagType(scope.row.status)">
            {{ getStatusName(scope.row.status) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="createTime" label="创建时间" width="150" sortable="custom">
        <template slot-scope="scope">
          {{ formatTime(scope.row.createTime) }}
        </template>
      </el-table-column>

      <el-table-column prop="dueTime" label="截止时间" width="150" sortable="custom">
        <template slot-scope="scope">
          <span :class="{ 'text-danger': isOverdue(scope.row.dueTime) }">
            {{ formatTime(scope.row.dueTime) }}
          </span>
        </template>
      </el-table-column>

      <el-table-column prop="submissionCount" label="提交情况" width="120">
        <template slot-scope="scope">
          <span>{{ scope.row.submissionCount || 0 }}/{{ scope.row.totalStudents || 0 }}</span>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="200" fixed="right">
        <template slot-scope="scope">
          <el-button size="mini" @click="editAssignment(scope.row)">编辑</el-button>
          <el-button size="mini" type="success" @click="gradeAssignment(scope.row)">批改</el-button>
          <el-button size="mini" type="info" @click="viewStatistics(scope.row)">统计</el-button>
          <el-dropdown @command="handleCommand" trigger="click">
            <el-button size="mini">
              更多<i class="el-icon-arrow-down el-icon--right"></i>
            </el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item :command="{action: 'publish', row: scope.row}" v-if="scope.row.status === 'draft'">
                发布作业
              </el-dropdown-item>
              <el-dropdown-item :command="{action: 'close', row: scope.row}" v-if="scope.row.status === 'active'">
                关闭作业
              </el-dropdown-item>
              <el-dropdown-item :command="{action: 'duplicate', row: scope.row}">
                复制作业
              </el-dropdown-item>
              <el-dropdown-item :command="{action: 'export', row: scope.row}">
                导出成绩
              </el-dropdown-item>
              <el-dropdown-item :command="{action: 'delete', row: scope.row}" divided>
                删除作业
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrapper">
      <el-pagination
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        :current-page="pagination.page"
        :page-sizes="[10, 20, 50, 100]"
        :page-size="pagination.size"
        layout="total, sizes, prev, pager, next, jumper"
        :total="pagination.total"
      ></el-pagination>
    </div>

    <!-- 创建/编辑作业对话框 -->
    <el-dialog
      :title="editingAssignment ? '编辑作业' : '创建作业'"
      :visible.sync="showCreateDialog"
      width="80%"
      :close-on-click-modal="false"
    >
      <assignment-form
        :assignment="editingAssignment"
        @submit="handleAssignmentSubmit"
        @cancel="handleAssignmentCancel"
      />
    </el-dialog>

    <!-- 作业详情对话框 -->
    <el-dialog
      title="作业详情"
      :visible.sync="showDetailDialog"
      width="70%"
    >
      <assignment-detail
        :assignment="selectedAssignment"
        @edit="editAssignment"
        @grade="gradeAssignment"
      />
    </el-dialog>

    <!-- 统计分析对话框 -->
    <el-dialog
      title="作业统计分析"
      :visible.sync="showStatsDialog"
      width="90%"
    >
      <assignment-statistics
        :assignment="selectedAssignment"
      />
    </el-dialog>
  </div>
</template>

<script>
import AssignmentForm from './AssignmentForm.vue'
import AssignmentDetail from './AssignmentDetail.vue'
import AssignmentStatistics from './AssignmentStatistics.vue'

export default {
    name: 'AssignmentManager',
    components: {
        AssignmentForm,
        AssignmentDetail,
        AssignmentStatistics
    },
    data () {
        return {
            loading: false,
            assignments: [],
            showCreateDialog: false,
            showDetailDialog: false,
            showStatsDialog: false,
            editingAssignment: null,
            selectedAssignment: null,
            filters: {
                status: '',
                subject: '',
                keyword: ''
            },
            pagination: {
                page: 1,
                size: 20,
                total: 0
            },
            sortField: 'createTime',
            sortOrder: 'desc'
        }
    },
    computed: {
        filteredAssignments () {
            let filtered = [...this.assignments]

            if (this.filters.status) {
                filtered = filtered.filter(item => item.status === this.filters.status)
            }

            if (this.filters.subject) {
                filtered = filtered.filter(item => item.subject === this.filters.subject)
            }

            if (this.filters.keyword) {
                const keyword = this.filters.keyword.toLowerCase()
                filtered = filtered.filter(item =>
                    item.title.toLowerCase().includes(keyword) ||
          (item.description && item.description.toLowerCase().includes(keyword))
                )
            }

            return filtered.sort((a, b) => {
                const aVal = a[this.sortField]
                const bVal = b[this.sortField]

                if (this.sortOrder === 'desc') {
                    return bVal > aVal ? 1 : -1
                } else {
                    return aVal > bVal ? 1 : -1
                }
            })
        }
    },
    mounted () {
        this.loadAssignments()
    },
    methods: {
        async loadAssignments () {
            this.loading = true
            try {
                const response = await this.$http.get('/api/assignments', {
                    params: {
                        page: this.pagination.page,
                        size: this.pagination.size,
                        sort: `${this.sortField},${this.sortOrder}`
                    }
                })

                this.assignments = response.data.content || []
                this.pagination.total = response.data.totalElements || 0
            } catch (error) {
                console.error('加载作业列表失败:', error)
                this.$message.error('加载作业列表失败')
            } finally {
                this.loading = false
            }
        },

        refreshAssignments () {
            this.loadAssignments()
        },

        handleSortChange ({ column, prop, order }) {
            this.sortField = prop
            this.sortOrder = order === 'ascending' ? 'asc' : 'desc'
            this.loadAssignments()
        },

        handleSizeChange (val) {
            this.pagination.size = val
            this.pagination.page = 1
            this.loadAssignments()
        },

        handleCurrentChange (val) {
            this.pagination.page = val
            this.loadAssignments()
        },

        viewAssignment (assignment) {
            this.selectedAssignment = assignment
            this.showDetailDialog = true
        },

        editAssignment (assignment) {
            this.editingAssignment = { ...assignment }
            this.showCreateDialog = true
            this.showDetailDialog = false
        },

        gradeAssignment (assignment) {
            this.$router.push(`/teacher/assignment/${assignment.id}/grade`)
        },

        viewStatistics (assignment) {
            this.selectedAssignment = assignment
            this.showStatsDialog = true
        },

        async handleCommand ({ action, row }) {
            switch (action) {
            case 'publish':
                await this.publishAssignment(row)
                break
            case 'close':
                await this.closeAssignment(row)
                break
            case 'duplicate':
                await this.duplicateAssignment(row)
                break
            case 'export':
                await this.exportGrades(row)
                break
            case 'delete':
                await this.deleteAssignment(row)
                break
            }
        },

        async publishAssignment (assignment) {
            try {
                await this.$confirm('确定要发布这个作业吗？', '确认', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'info'
                })

                await this.$http.post(`/api/assignments/${assignment.id}/publish`)
                this.$message.success('作业发布成功')
                this.loadAssignments()
            } catch (error) {
                if (error !== 'cancel') {
                    console.error('发布作业失败:', error)
                    this.$message.error('发布作业失败')
                }
            }
        },

        async closeAssignment (assignment) {
            try {
                await this.$confirm('确定要关闭这个作业吗？关闭后学生将无法继续提交。', '确认', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning'
                })

                await this.$http.post(`/api/assignments/${assignment.id}/close`)
                this.$message.success('作业已关闭')
                this.loadAssignments()
            } catch (error) {
                if (error !== 'cancel') {
                    console.error('关闭作业失败:', error)
                    this.$message.error('关闭作业失败')
                }
            }
        },

        async duplicateAssignment (assignment) {
            try {
                const response = await this.$http.post(`/api/assignments/${assignment.id}/duplicate`)
                this.$message.success('作业复制成功')
                this.loadAssignments()
            } catch (error) {
                console.error('复制作业失败:', error)
                this.$message.error('复制作业失败')
            }
        },

        async exportGrades (assignment) {
            try {
                const response = await this.$http.get(`/api/assignments/${assignment.id}/export`, {
                    responseType: 'blob'
                })

                const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.style.display = 'none'
                link.href = url
                link.download = `${assignment.title}_成绩.xlsx`

                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)

                this.$message.success('成绩导出成功')
            } catch (error) {
                console.error('导出成绩失败:', error)
                this.$message.error('导出成绩失败')
            }
        },

        async deleteAssignment (assignment) {
            try {
                await this.$confirm('确定要删除这个作业吗？此操作不可恢复。', '警告', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'error'
                })

                await this.$http.delete(`/api/assignments/${assignment.id}`)
                this.$message.success('作业删除成功')
                this.loadAssignments()
            } catch (error) {
                if (error !== 'cancel') {
                    console.error('删除作业失败:', error)
                    this.$message.error('删除作业失败')
                }
            }
        },

        async handleAssignmentSubmit (assignmentData) {
            try {
                if (this.editingAssignment) {
                    await this.$http.put(`/api/assignments/${this.editingAssignment.id}`, assignmentData)
                    this.$message.success('作业更新成功')
                } else {
                    await this.$http.post('/api/assignments', assignmentData)
                    this.$message.success('作业创建成功')
                }

                this.showCreateDialog = false
                this.editingAssignment = null
                this.loadAssignments()
            } catch (error) {
                console.error('保存作业失败:', error)
                this.$message.error('保存作业失败')
            }
        },

        handleAssignmentCancel () {
            this.showCreateDialog = false
            this.editingAssignment = null
        },

        getSubjectTagType (subject) {
            const types = {
                math: 'primary',
                chinese: 'success',
                english: 'info',
                physics: 'warning',
                chemistry: 'danger'
            }
            return types[subject] || ''
        },

        getSubjectName (subject) {
            const names = {
                math: '数学',
                chinese: '语文',
                english: '英语',
                physics: '物理',
                chemistry: '化学'
            }
            return names[subject] || subject
        },

        getStatusTagType (status) {
            const types = {
                draft: 'info',
                active: 'success',
                closed: 'danger'
            }
            return types[status] || ''
        },

        getStatusName (status) {
            const names = {
                draft: '未发布',
                active: '进行中',
                closed: '已截止'
            }
            return names[status] || status
        },

        formatTime (time) {
            if (!time) return ''
            return new Date(time).toLocaleString('zh-CN')
        },

        isOverdue (dueTime) {
            if (!dueTime) return false
            return new Date(dueTime) < new Date()
        }
    }
}
</script>

<style scoped>
.assignment-manager {
  padding: 20px;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.manager-header h2 {
  margin: 0;
  color: #333;
}

.filter-bar {
  margin-bottom: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 4px;
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: right;
}

.text-danger {
  color: #f56c6c;
}
</style>
