<template>
  <a-modal
    :title="title"
    :width="1000"
    :visible="visible"
    :footer="null"
    @cancel="handleCancel"
  >
    <a-spin :spinning="loading">
      <div class="work-detail-container">
        <!-- 作业基本信息 -->
        <a-card title="作业信息" :bordered="false" style="margin-bottom: 16px">
          <a-descriptions :column="2">
            <a-descriptions-item label="作业名称">{{ workDetail.workName }}</a-descriptions-item>
            <a-descriptions-item label="作业类型">{{ workDetail.workType }}</a-descriptions-item>
            <a-descriptions-item label="发布时间">{{ workDetail.publishTime }}</a-descriptions-item>
            <a-descriptions-item label="截止时间">{{ workDetail.deadline }}</a-descriptions-item>
            <a-descriptions-item label="目标班级">{{ workDetail.targetClass }}</a-descriptions-item>
            <a-descriptions-item label="总人数">{{ workDetail.totalStudents }}</a-descriptions-item>
          </a-descriptions>
        </a-card>

        <!-- 分发统计 -->
        <a-card title="分发统计" :bordered="false" style="margin-bottom: 16px">
          <a-row :gutter="16">
            <a-col :span="6">
              <a-statistic title="已提交" :value="statistics.submitted" :value-style="{ color: '#3f8600' }" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="未提交" :value="statistics.unsubmitted" :value-style="{ color: '#cf1322' }" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="已评分" :value="statistics.graded" :value-style="{ color: '#1890ff' }" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="提交率" :value="statistics.submitRate" suffix="%" :value-style="{ color: '#722ed1' }" />
            </a-col>
          </a-row>
        </a-card>

        <!-- 学生提交详情 -->
        <a-card title="学生提交详情" :bordered="false">
          <div class="table-operator" style="margin-bottom: 16px">
            <a-input-search
              v-model="searchText"
              placeholder="搜索学生姓名或学号"
              style="width: 200px; margin-right: 8px"
              @search="handleSearch"
            />
            <a-select
              v-model="statusFilter"
              placeholder="提交状态"
              style="width: 120px; margin-right: 8px"
              @change="handleStatusFilter"
            >
              <a-select-option value="">全部</a-select-option>
              <a-select-option value="submitted">已提交</a-select-option>
              <a-select-option value="unsubmitted">未提交</a-select-option>
              <a-select-option value="graded">已评分</a-select-option>
            </a-select>
          </div>

          <a-table
            :columns="columns"
            :data-source="filteredStudentList"
            :pagination="pagination"
            :scroll="{ x: 800 }"
            size="middle"
          >
            <template slot="status" slot-scope="text, record">
              <a-tag :color="getStatusColor(record.status)">
                {{ getStatusText(record.status) }}
              </a-tag>
            </template>

            <template slot="submitTime" slot-scope="text">
              {{ text || '-' }}
            </template>

            <template slot="score" slot-scope="text">
              {{ text !== null ? text : '-' }}
            </template>

            <template slot="action" slot-scope="text, record">
              <a-button-group>
                <a-button v-if="record.status === 'submitted'" type="link" size="small" @click="viewSubmission(record)">
                  查看作业
                </a-button>
                <a-button v-if="record.status === 'unsubmitted'" type="link" size="small" @click="sendReminder(record)">
                  发送提醒
                </a-button>
                <a-button v-if="record.status === 'submitted'" type="link" size="small" @click="gradeWork(record)">
                  评分
                </a-button>
              </a-button-group>
            </template>
          </a-table>
        </a-card>
      </div>
    </a-spin>
  </a-modal>
</template>

<script>
export default {
    name: 'WorkDistributionDetailModal',
    data () {
        return {
            title: '作业分发详情',
            visible: false,
            loading: false,
            searchText: '',
            statusFilter: '',
            workDetail: {},
            statistics: {
                submitted: 0,
                unsubmitted: 0,
                graded: 0,
                submitRate: 0
            },
            studentList: [],
            filteredStudentList: [],
            pagination: {
                current: 1,
                pageSize: 10,
                total: 0,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
            },
            columns: [
                {
                    title: '学号',
                    dataIndex: 'studentNo',
                    width: 120
                },
                {
                    title: '姓名',
                    dataIndex: 'studentName',
                    width: 100
                },
                {
                    title: '班级',
                    dataIndex: 'className',
                    width: 120
                },
                {
                    title: '提交状态',
                    dataIndex: 'status',
                    width: 100,
                    scopedSlots: { customRender: 'status' }
                },
                {
                    title: '提交时间',
                    dataIndex: 'submitTime',
                    width: 160,
                    scopedSlots: { customRender: 'submitTime' }
                },
                {
                    title: '评分',
                    dataIndex: 'score',
                    width: 80,
                    scopedSlots: { customRender: 'score' }
                },
                {
                    title: '操作',
                    width: 150,
                    scopedSlots: { customRender: 'action' }
                }
            ]
        }
    },
    methods: {
        show (record) {
            this.visible = true
            this.workDetail = record
            this.loadWorkDetail(record.id)
        },

        loadWorkDetail (workId) {
            this.loading = true

            setTimeout(() => {
                this.studentList = [
                    {
                        id: '1',
                        studentNo: '20210001',
                        studentName: '张三',
                        className: '计科21-1班',
                        status: 'submitted',
                        submitTime: '2024-01-15 14:30:00',
                        score: 95
                    },
                    {
                        id: '2',
                        studentNo: '20210002',
                        studentName: '李四',
                        className: '计科21-1班',
                        status: 'submitted',
                        submitTime: '2024-01-15 16:20:00',
                        score: null
                    },
                    {
                        id: '3',
                        studentNo: '20210003',
                        studentName: '王五',
                        className: '计科21-1班',
                        status: 'unsubmitted',
                        submitTime: null,
                        score: null
                    },
                    {
                        id: '4',
                        studentNo: '20210004',
                        studentName: '赵六',
                        className: '计科21-1班',
                        status: 'graded',
                        submitTime: '2024-01-14 20:15:00',
                        score: 88
                    }
                ]

                this.updateStatistics()
                this.applyFilters()
                this.loading = false
            }, 500)
        },

        updateStatistics () {
            const submitted = this.studentList.filter(s => s.status === 'submitted' || s.status === 'graded').length
            const unsubmitted = this.studentList.filter(s => s.status === 'unsubmitted').length
            const graded = this.studentList.filter(s => s.status === 'graded').length
            const total = this.studentList.length

            this.statistics = {
                submitted,
                unsubmitted,
                graded,
                submitRate: total > 0 ? Math.round((submitted / total) * 100) : 0
            }
        },

        applyFilters () {
            let filtered = [...this.studentList]

            if (this.searchText) {
                filtered = filtered.filter(student =>
                    student.studentName.includes(this.searchText) ||
          student.studentNo.includes(this.searchText)
                )
            }

            if (this.statusFilter) {
                filtered = filtered.filter(student => student.status === this.statusFilter)
            }

            this.filteredStudentList = filtered
            this.pagination.total = filtered.length
        },

        handleSearch () {
            this.applyFilters()
        },

        handleStatusFilter () {
            this.applyFilters()
        },

        getStatusColor (status) {
            const colorMap = {
                'submitted': 'orange',
                'unsubmitted': 'red',
                'graded': 'green'
            }
            return colorMap[status] || 'default'
        },

        getStatusText (status) {
            const textMap = {
                'submitted': '已提交',
                'unsubmitted': '未提交',
                'graded': '已评分'
            }
            return textMap[status] || '未知'
        },

        viewSubmission (record) {
            this.$message.info(`查看 ${record.studentName} 的作业提交`)
        },

        sendReminder (record) {
            this.$message.info(`向 ${record.studentName} 发送提醒`)
        },

        gradeWork (record) {
            this.$message.info(`为 ${record.studentName} 的作业评分`)
        },

        handleCancel () {
            this.visible = false
            this.workDetail = {}
            this.studentList = []
            this.filteredStudentList = []
            this.searchText = ''
            this.statusFilter = ''
        }
    }
}
</script>

<style scoped>
.work-detail-container {
  max-height: 600px;
  overflow-y: auto;
}

.table-operator {
  display: flex;
  align-items: center;
}
</style>
