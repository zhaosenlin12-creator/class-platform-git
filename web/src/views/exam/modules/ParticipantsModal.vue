<template>
  <a-modal
    title="参与者列表"
    :width="800"
    :visible="visible"
    @cancel="handleCancel"
    :footer="null"
  >
    <div class="participants-container" v-if="paperData">
      <!-- 统计信息 -->
      <div class="stats-section">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-statistic title="总参与人数" :value="statistics.totalParticipants" suffix="人" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="已完成" :value="statistics.completed" suffix="人" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="进行中" :value="statistics.inProgress" suffix="人" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="未开始" :value="statistics.notStarted" suffix="人" />
          </a-col>
        </a-row>
      </div>

      <a-divider />

      <!-- 搜索和筛选 -->
      <div class="filter-section">
        <a-row :gutter="16" align="middle">
          <a-col :span="8">
            <a-input-search
              v-model="searchKeyword"
              placeholder="搜索学生姓名或学号"
              enter-button
              @search="handleSearch"
            />
          </a-col>
          <a-col :span="6">
            <a-select v-model="statusFilter" placeholder="筛选状态" style="width: 100%" allow-clear>
              <a-select-option value="completed">已完成</a-select-option>
              <a-select-option value="in_progress">进行中</a-select-option>
              <a-select-option value="not_started">未开始</a-select-option>
              <a-select-option value="timeout">超时</a-select-option>
              <a-select-option value="cheating">异常</a-select-option>
            </a-select>
          </a-col>
          <a-col :span="6">
            <a-select v-model="classFilter" placeholder="筛选班级" style="width: 100%" allow-clear>
              <a-select-option v-for="cls in classList" :key="cls.id" :value="cls.id">
                {{ cls.className }}
              </a-select-option>
            </a-select>
          </a-col>
          <a-col :span="4">
            <a-button @click="resetFilters">重置筛选</a-button>
          </a-col>
        </a-row>
      </div>

      <!-- 参与者列表 -->
      <div class="participants-list">
        <a-table
          :columns="columns"
          :dataSource="filteredParticipants"
          :pagination="{ pageSize: 10, showSizeChanger: true, showQuickJumper: true }"
          size="middle"
          :loading="loading"
          bordered
        >
          <span slot="statusSlot" slot-scope="text, record">
            <a-tag :color="getStatusColor(text)">
              {{ getStatusText(text) }}
            </a-tag>
          </span>

          <span slot="scoreSlot" slot-scope="text, record">
            <span v-if="text !== null" :style="{ color: getScoreColor(text, record.totalScore) }">
              {{ text }} / {{ record.totalScore }}
            </span>
            <span v-else>-</span>
          </span>

          <span slot="durationSlot" slot-scope="text">
            {{ formatDuration(text) }}
          </span>

          <span slot="progressSlot" slot-scope="text, record">
            <a-progress
              v-if="record.status === 'in_progress'"
              :percent="text"
              :stroke-width="6"
              size="small"
            />
            <span v-else-if="record.status === 'completed'">100%</span>
            <span v-else>0%</span>
          </span>

          <span slot="action" slot-scope="text, record">
            <a-space>
              <a @click="handleViewDetail(record)">查看详情</a>
              <a
                v-if="record.status === 'in_progress'"
                @click="handleForceSubmit(record)"
                style="color: #ff4d4f"
              >
                强制提交
              </a>
              <a
                v-if="['completed', 'timeout'].includes(record.status)"
                @click="handleAllowRetake(record)"
                style="color: #52c41a"
              >
                允许重考
              </a>
            </a-space>
          </span>
        </a-table>
      </div>
    </div>

    <!-- 学生详情弹窗 -->
    <student-detail-modal
      ref="studentDetailModal"
    />
  </a-modal>
</template>

<script>
import { getAction, putAction } from '@/api/manage'
import StudentDetailModal from './StudentDetailModal'

export default {
    name: 'ParticipantsModal',
    components: {
        StudentDetailModal
    },
    data () {
        return {
            visible: false,
            loading: false,
            paperData: null,
            participants: [],
            filteredParticipants: [],
            classList: [],
            statistics: {
                totalParticipants: 0,
                completed: 0,
                inProgress: 0,
                notStarted: 0
            },
            searchKeyword: '',
            statusFilter: undefined,
            classFilter: undefined,
            columns: [
                {
                    title: '排名',
                    dataIndex: 'rank',
                    width: 60,
                    align: 'center'
                },
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
                    width: 100
                },
                {
                    title: '状态',
                    dataIndex: 'status',
                    width: 80,
                    align: 'center',
                    scopedSlots: { customRender: 'statusSlot' }
                },
                {
                    title: '得分',
                    dataIndex: 'score',
                    width: 100,
                    align: 'center',
                    scopedSlots: { customRender: 'scoreSlot' }
                },
                {
                    title: '用时',
                    dataIndex: 'duration',
                    width: 100,
                    align: 'center',
                    scopedSlots: { customRender: 'durationSlot' }
                },
                {
                    title: '进度',
                    dataIndex: 'progress',
                    width: 120,
                    align: 'center',
                    scopedSlots: { customRender: 'progressSlot' }
                },
                {
                    title: '开始时间',
                    dataIndex: 'startTime',
                    width: 150
                },
                {
                    title: '提交时间',
                    dataIndex: 'submitTime',
                    width: 150
                },
                {
                    title: '操作',
                    dataIndex: 'action',
                    width: 120,
                    align: 'center',
                    fixed: 'right',
                    scopedSlots: { customRender: 'action' }
                }
            ]
        }
    },
    watch: {
        statusFilter () {
            this.filterParticipants()
        },
        classFilter () {
            this.filterParticipants()
        }
    },
    methods: {
        async show (record) {
            this.paperData = record
            this.visible = true
            this.resetFilters()
            await this.loadParticipants()
            await this.loadClassList()
        },

        handleCancel () {
            this.visible = false
            this.paperData = null
            this.participants = []
            this.filteredParticipants = []
            this.resetFilters()
        },

        async loadParticipants () {
            if (!this.paperData || !this.paperData.id) return

            this.loading = true
            try {
                const res = await getAction('/teaching/examRecord/participants', {
                    paperId: this.paperData.id
                })
                if (res.success) {
                    this.participants = res.result.participants || []
                    this.statistics = res.result.statistics || this.statistics
                    this.filterParticipants()
                }
            } catch (error) {
                this.$message.error('加载参与者数据失败')
                console.error(error)
            } finally {
                this.loading = false
            }
        },

        async loadClassList () {
            try {
                const res = await getAction('/teaching/class/listAll')
                if (res.success) {
                    this.classList = res.result || []
                }
            } catch (error) {
                console.error('加载班级列表失败:', error)
            }
        },

        filterParticipants () {
            let filtered = [...this.participants]

            // 搜索过滤
            if (this.searchKeyword.trim()) {
                filtered = filtered.filter(p =>
                    p.studentName.includes(this.searchKeyword) ||
          p.studentNo.includes(this.searchKeyword)
                )
            }

            // 状态过滤
            if (this.statusFilter) {
                filtered = filtered.filter(p => p.status === this.statusFilter)
            }

            // 班级过滤
            if (this.classFilter) {
                filtered = filtered.filter(p => p.classId === this.classFilter)
            }

            // 排序 - 按得分降序
            filtered.sort((a, b) => {
                if (a.score === null && b.score === null) return 0
                if (a.score === null) return 1
                if (b.score === null) return -1
                return b.score - a.score
            })

            // 添加排名
            filtered.forEach((participant, index) => {
                participant.rank = index + 1
            })

            this.filteredParticipants = filtered
        },

        handleSearch () {
            this.filterParticipants()
        },

        resetFilters () {
            this.searchKeyword = ''
            this.statusFilter = undefined
            this.classFilter = undefined
            this.filterParticipants()
        },

        handleViewDetail (record) {
            this.$refs.studentDetailModal.show(record, this.paperData.id)
        },

        handleForceSubmit (record) {
            this.$confirm({
                title: '强制提交确认',
                content: `确定要强制提交学生 ${record.studentName} 的考试吗？`,
                okText: '确认',
                cancelText: '取消',
                onOk: async () => {
                    try {
                        const res = await putAction('/teaching/examRecord/forceSubmit', {
                            recordId: record.id
                        })
                        if (res.success) {
                            this.$message.success('强制提交成功')
                            await this.loadParticipants()
                        } else {
                            this.$message.error(res.message || '操作失败')
                        }
                    } catch (error) {
                        this.$message.error('操作失败')
                        console.error(error)
                    }
                }
            })
        },

        handleAllowRetake (record) {
            this.$confirm({
                title: '允许重考确认',
                content: `确定要允许学生 ${record.studentName} 重新参加考试吗？`,
                okText: '确认',
                cancelText: '取消',
                onOk: async () => {
                    try {
                        const res = await putAction('/teaching/examRecord/allowRetake', {
                            recordId: record.id
                        })
                        if (res.success) {
                            this.$message.success('已允许重考')
                            await this.loadParticipants()
                        } else {
                            this.$message.error(res.message || '操作失败')
                        }
                    } catch (error) {
                        this.$message.error('操作失败')
                        console.error(error)
                    }
                }
            })
        },

        getStatusColor (status) {
            const colorMap = {
                completed: 'success',
                in_progress: 'processing',
                not_started: 'default',
                timeout: 'warning',
                cheating: 'error'
            }
            return colorMap[status] || 'default'
        },

        getStatusText (status) {
            const textMap = {
                completed: '已完成',
                in_progress: '进行中',
                not_started: '未开始',
                timeout: '超时',
                cheating: '异常'
            }
            return textMap[status] || status
        },

        getScoreColor (score, totalScore) {
            const rate = score / totalScore
            if (rate >= 0.9) return '#52c41a'
            if (rate >= 0.8) return '#1890ff'
            if (rate >= 0.6) return '#faad14'
            return '#ff4d4f'
        },

        formatDuration (minutes) {
            if (!minutes) return '-'
            const hours = Math.floor(minutes / 60)
            const mins = minutes % 60
            if (hours > 0) {
                return `${hours}小时${mins}分钟`
            }
            return `${mins}分钟`
        }
    }
}
</script>

<style lang="less" scoped>
.participants-container {
  .stats-section {
    padding: 16px;
    background: #f5f5f5;
    border-radius: 6px;
    margin-bottom: 16px;
  }

  .filter-section {
    margin-bottom: 16px;
  }

  .participants-list {
    .ant-table {
      .ant-table-tbody > tr:hover > td {
        background: #e6f7ff;
      }
    }
  }
}
</style>
