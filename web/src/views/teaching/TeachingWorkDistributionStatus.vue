<template>
  <a-card :bordered="false">
    <!-- 查询区域 -->
    <div class="table-page-search-wrapper">
      <a-form layout="inline" @keyup.enter.native="searchQuery">
        <a-row :gutter="24">
          <a-col :xl="6" :lg="7" :md="8" :sm="24">
            <a-form-item label="作业名称">
              <a-input placeholder="请输入作业名称" v-model="queryParam.workName"></a-input>
            </a-form-item>
          </a-col>
          <a-col :xl="6" :lg="7" :md="8" :sm="24">
            <a-form-item label="分发状态">
              <a-select placeholder="请选择分发状态" v-model="queryParam.distributionStatus">
                <a-select-option value="">全部</a-select-option>
                <a-select-option value="pending">待分发</a-select-option>
                <a-select-option value="distributing">分发中</a-select-option>
                <a-select-option value="completed">已完成</a-select-option>
                <a-select-option value="failed">分发失败</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xl="6" :lg="7" :md="8" :sm="24">
            <a-form-item label="截止状态">
              <a-select placeholder="请选择截止状态" v-model="queryParam.deadlineStatus">
                <a-select-option value="">全部</a-select-option>
                <a-select-option value="active">进行中</a-select-option>
                <a-select-option value="deadline_soon">即将截止</a-select-option>
                <a-select-option value="overdue">已逾期</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xl="6" :lg="7" :md="8" :sm="24">
            <span style="float: left; overflow: hidden" class="table-page-search-submitButtons">
              <a-button type="primary" @click="searchQuery" icon="search">查询</a-button>
              <a-button type="primary" @click="searchReset" icon="reload" style="margin-left: 8px">重置</a-button>
            </span>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <!-- 统计卡片 -->
    <a-row :gutter="16" style="margin-bottom: 16px">
      <a-col :span="6">
        <a-card size="small">
          <a-statistic title="总作业数" :value="statistics.total" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card size="small">
          <a-statistic title="分发中" :value="statistics.distributing" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card size="small">
          <a-statistic title="即将截止" :value="statistics.deadlineSoon" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card size="small">
          <a-statistic title="已逾期" :value="statistics.overdue" />
        </a-card>
      </a-col>
    </a-row>

    <!-- 操作按钮区域 -->
    <div class="table-operator">
      <a-button @click="batchDistribute" type="primary" icon="cloud-upload" :disabled="selectedRowKeys.length === 0">
        批量分发
      </a-button>
      <a-button @click="batchRemind" type="default" icon="bell" style="margin-left: 8px" :disabled="selectedRowKeys.length === 0">
        批量提醒
      </a-button>
      <a-button @click="exportReport" type="default" icon="download" style="margin-left: 8px">
        导出报告
      </a-button>
    </div>

    <!-- table区域 -->
    <div>
      <a-table
        ref="table"
        size="middle"
        bordered
        rowKey="id"
        :columns="columns"
        :dataSource="dataSource"
        :pagination="ipagination"
        :loading="loading"
        :rowSelection="{ selectedRowKeys: selectedRowKeys, onChange: onSelectChange }"
        @change="handleTableChange"
        :expandedRowRender="expandedRowRender"
      >
        <template slot="distributionStatus" slot-scope="text, record">
          <a-badge :status="getDistributionStatusColor(text)" :text="getDistributionStatusText(text)" />
          <a-progress v-if="text === 'distributing'" :percent="record.distributionProgress" size="small" style="margin-left: 8px; width: 100px;" />
        </template>

        <template slot="deadlineStatus" slot-scope="text, record">
          <a-tag :color="getDeadlineStatusColor(text)">{{ getDeadlineStatusText(text) }}</a-tag>
          <div style="font-size: 12px; color: #999; margin-top: 4px;">
            截止：{{ record.endTime | moment }}
          </div>
        </template>

        <template slot="submissionStats" slot-scope="text, record">
          <div>
            <span>已提交：{{ record.submittedCount || 0 }}</span>
            <a-divider type="vertical" />
            <span>总数：{{ record.totalStudents || 0 }}</span>
          </div>
          <a-progress
            :percent="getSubmissionPercent(record)"
            size="small"
            :status="getSubmissionPercent(record) < 50 ? 'exception' : 'success'"
            style="margin-top: 4px;"
          />
        </template>

        <span slot="action" slot-scope="text, record">
          <a @click="handleViewDetail(record)">查看详情</a>
          <a-divider type="vertical" />
          <a @click="handleDistribute(record)" :disabled="record.distributionStatus === 'distributing'">
            {{ record.distributionStatus === 'pending' ? '开始分发' : '重新分发' }}
          </a>
          <a-divider type="vertical" />
          <a @click="handleSendReminder(record)">发送提醒</a>
          <a-divider type="vertical" />
          <a-dropdown>
            <a class="ant-dropdown-link">更多 <a-icon type="down" /></a>
            <a-menu slot="overlay">
              <a-menu-item>
                <a @click="handleExtendDeadline(record)">延长截止时间</a>
              </a-menu-item>
              <a-menu-item>
                <a @click="handleViewSubmissions(record)">查看提交</a>
              </a-menu-item>
              <a-menu-item>
                <a @click="handleExportStudentList(record)">导出学生名单</a>
              </a-menu-item>
            </a-menu>
          </a-dropdown>
        </span>
      </a-table>
    </div>

    <!-- 详情弹窗 -->
    <work-distribution-detail-modal ref="detailModal"></work-distribution-detail-modal>

    <!-- 延长截止时间弹窗 -->
    <extend-deadline-modal ref="extendModal" @ok="handleExtendOk"></extend-deadline-modal>

    <!-- 发送提醒弹窗 -->
    <send-reminder-modal ref="reminderModal" @ok="handleReminderOk"></send-reminder-modal>
  </a-card>
</template>

<script>
import moment from 'moment'
import { JeecgListMixin } from '@/mixins/JeecgListMixin'
import { getAction, postAction } from '@/api/manage'
import WorkDistributionDetailModal from './modules/WorkDistributionDetailModal'
import ExtendDeadlineModal from './modules/ExtendDeadlineModal'
import SendReminderModal from './modules/SendReminderModal'

export default {
    name: 'TeachingWorkDistributionStatus',
    mixins: [JeecgListMixin],
    components: {
        WorkDistributionDetailModal,
        ExtendDeadlineModal,
        SendReminderModal
    },
    filters: {
        moment: function (date) {
            return date ? moment(date).format('YYYY-MM-DD HH:mm') : '-'
        }
    },
    data () {
        return {
            description: '作业分发状态管理',
            columns: [
                {
                    title: '作业名称',
                    align: 'center',
                    dataIndex: 'workName',
                    width: 200
                },
                {
                    title: '作业类型',
                    align: 'center',
                    dataIndex: 'workType',
                    width: 100
                },
                {
                    title: '分发状态',
                    align: 'center',
                    dataIndex: 'distributionStatus',
                    width: 150,
                    scopedSlots: { customRender: 'distributionStatus' }
                },
                {
                    title: '截止状态',
                    align: 'center',
                    dataIndex: 'deadlineStatus',
                    width: 150,
                    scopedSlots: { customRender: 'deadlineStatus' }
                },
                {
                    title: '提交统计',
                    align: 'center',
                    dataIndex: 'submissionStats',
                    width: 150,
                    scopedSlots: { customRender: 'submissionStats' }
                },
                {
                    title: '目标班级',
                    align: 'center',
                    dataIndex: 'targetClasses',
                    width: 200
                },
                {
                    title: '创建时间',
                    align: 'center',
                    dataIndex: 'createTime',
                    width: 150
                },
                {
                    title: '操作',
                    dataIndex: 'action',
                    align: 'center',
                    fixed: 'right',
                    width: 200,
                    scopedSlots: { customRender: 'action' }
                }
            ],
            url: {
                list: '/teaching/teachingWorkDistribution/list',
                distribute: '/teaching/teachingWorkDistribution/distribute',
                batchDistribute: '/teaching/teachingWorkDistribution/batchDistribute',
                sendReminder: '/teaching/teachingWorkDistribution/sendReminder',
                extendDeadline: '/teaching/teachingWorkDistribution/extendDeadline'
            },
            statistics: {
                total: 0,
                distributing: 0,
                deadlineSoon: 0,
                overdue: 0
            }
        }
    },
    created () {
        this.loadStatistics()
    },
    methods: {
        loadStatistics () {
            getAction('/teaching/teachingWorkDistribution/statistics').then(res => {
                if (res.success) {
                    this.statistics = res.result
                }
            })
        },

        expandedRowRender (record) {
            const columns = [
                { title: '班级名称', dataIndex: 'className', width: '25%' },
                { title: '分发状态', dataIndex: 'status', width: '20%' },
                { title: '学生总数', dataIndex: 'totalStudents', width: '15%' },
                { title: '已提交', dataIndex: 'submittedCount', width: '15%' },
                { title: '提交率', dataIndex: 'submissionRate', width: '15%' },
                { title: '分发时间', dataIndex: 'distributionTime', width: '10%' }
            ]

            return h => h('a-table', {
                props: {
                    columns: columns,
                    dataSource: record.classDetails || [],
                    pagination: false,
                    size: 'small'
                }
            })
        },

        getDistributionStatusColor (status) {
            const colors = {
                'pending': 'default',
                'distributing': 'processing',
                'completed': 'success',
                'failed': 'error'
            }
            return colors[status] || 'default'
        },

        getDistributionStatusText (status) {
            const texts = {
                'pending': '待分发',
                'distributing': '分发中',
                'completed': '已完成',
                'failed': '分发失败'
            }
            return texts[status] || status
        },

        getDeadlineStatusColor (status) {
            const colors = {
                'active': 'blue',
                'deadline_soon': 'orange',
                'overdue': 'red'
            }
            return colors[status] || 'default'
        },

        getDeadlineStatusText (status) {
            const texts = {
                'active': '进行中',
                'deadline_soon': '即将截止',
                'overdue': '已逾期'
            }
            return texts[status] || status
        },

        getSubmissionPercent (record) {
            if (!record.totalStudents || record.totalStudents === 0) return 0
            return Math.round((record.submittedCount || 0) / record.totalStudents * 100)
        },

        handleViewDetail (record) {
            this.$refs.detailModal.show(record)
        },

        handleDistribute (record) {
            this.$confirm({
                title: '确认分发',
                content: `确定要分发作业"${record.workName}"吗？`,
                onOk: () => {
                    postAction(this.url.distribute, { id: record.id }).then(res => {
                        if (res.success) {
                            this.$message.success('分发成功')
                            this.loadData()
                            this.loadStatistics()
                        } else {
                            this.$message.error(res.message)
                        }
                    })
                }
            })
        },

        batchDistribute () {
            if (this.selectedRowKeys.length === 0) {
                this.$message.warning('请选择要分发的作业')
                return
            }

            this.$confirm({
                title: '批量分发确认',
                content: `确定要批量分发选中的 ${this.selectedRowKeys.length} 个作业吗？`,
                onOk: () => {
                    postAction(this.url.batchDistribute, { ids: this.selectedRowKeys }).then(res => {
                        if (res.success) {
                            this.$message.success('批量分发成功')
                            this.loadData()
                            this.loadStatistics()
                            this.onClearSelected()
                        } else {
                            this.$message.error(res.message)
                        }
                    })
                }
            })
        },

        handleSendReminder (record) {
            this.$refs.reminderModal.show(record)
        },

        batchRemind () {
            if (this.selectedRowKeys.length === 0) {
                this.$message.warning('请选择要提醒的作业')
                return
            }
            this.$refs.reminderModal.showBatch(this.selectedRowKeys)
        },

        handleExtendDeadline (record) {
            this.$refs.extendModal.show(record)
        },

        handleViewSubmissions (record) {
            this.$router.push({
                path: '/teaching/work-submissions',
                query: { workId: record.id }
            })
        },

        handleExportStudentList (record) {
            getAction('/teaching/teachingWorkDistribution/exportStudentList', { id: record.id }).then(res => {
                if (res.success) {
                    this.$message.success('导出成功')
                    // 下载文件逻辑
                }
            })
        },

        exportReport () {
            getAction('/teaching/teachingWorkDistribution/exportReport', this.queryParam).then(res => {
                if (res.success) {
                    this.$message.success('报告导出成功')
                    // 下载文件逻辑
                }
            })
        },

        handleExtendOk () {
            this.loadData()
            this.loadStatistics()
        },

        handleReminderOk () {
            this.$message.success('提醒发送成功')
        }
    }
}
</script>

<style scoped>
.ant-statistic {
  text-align: center;
}
.table-page-search-wrapper {
  padding: 16px;
  background: #fafafa;
  margin-bottom: 16px;
}
</style>
