<template>
  <div class="exam-paper-container">
    <a-card :bordered="false">
      <!-- 页面标题 -->
      <div slot="title" class="card-title">
        <a-icon type="file-text" />
        试卷管理
      </div>

      <!-- 操作工具栏 -->
      <div slot="extra" class="toolbar">
        <a-space>
          <a-button type="primary" icon="plus" @click="handleAdd">
            创建试卷
          </a-button>
          <a-button icon="thunderbolt" @click="handleSmartGenerate">
            智能组卷
          </a-button>
          <a-button icon="copy" @click="handleBatchCopy">
            批量复制
          </a-button>
        </a-space>
      </div>

      <!-- 搜索表单 -->
      <div class="search-form">
        <a-form layout="inline" :form="searchForm">
          <a-form-item label="试卷名称">
            <a-input v-model="queryParam.paperName" placeholder="请输入试卷名称" style="width: 200px" />
          </a-form-item>
          <a-form-item label="所属课程">
            <a-select v-model="queryParam.courseId" placeholder="请选择课程" style="width: 160px" allow-clear>
              <a-select-option v-for="course in courseList" :key="course.id" :value="course.id">
                {{ course.courseName }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="试卷状态">
            <a-select v-model="queryParam.status" placeholder="请选择状态" style="width: 120px" allow-clear>
              <a-select-option value="draft">草稿</a-select-option>
              <a-select-option value="published">已发布</a-select-option>
              <a-select-option value="closed">已结束</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="考试类型">
            <a-select v-model="queryParam.examType" placeholder="请选择类型" style="width: 120px" allow-clear>
              <a-select-option value="quiz">随堂测验</a-select-option>
              <a-select-option value="midterm">期中考试</a-select-option>
              <a-select-option value="final">期末考试</a-select-option>
              <a-select-option value="assignment">作业</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item>
            <a-space>
              <a-button type="primary" icon="search" @click="searchQuery">查询</a-button>
              <a-button icon="reload" @click="searchReset">重置</a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </div>

      <!-- 试卷列表表格 -->
      <a-table
        ref="table"
        size="middle"
        :columns="columns"
        :dataSource="dataSource"
        :pagination="ipagination"
        :loading="loading"
        :rowSelection="rowSelection"
        @change="handleTableChange"
        bordered
      >
        <span slot="statusSlot" slot-scope="text">
          <a-badge :status="getStatusBadge(text).status" :text="getStatusBadge(text).text" />
        </span>

        <span slot="examTypeSlot" slot-scope="text">
          <a-tag :color="getExamTypeColor(text)">
            {{ getExamTypeName(text) }}
          </a-tag>
        </span>

        <span slot="difficultySlot" slot-scope="text">
          <a-rate :value="text" disabled style="font-size: 14px" />
        </span>

        <span slot="durationSlot" slot-scope="text">
          {{ text ? `${text}分钟` : '-' }}
        </span>

        <span slot="scoreSlot" slot-scope="text">
          {{ text ? `${text}分` : '-' }}
        </span>

        <span slot="participantSlot" slot-scope="text, record">
          <a @click="handleViewParticipants(record)">{{ text || 0 }}人</a>
        </span>

        <span slot="action" slot-scope="text, record">
          <a-space>
            <a @click="handleView(record)">查看</a>
            <a @click="handleEdit(record)">编辑</a>
            <a-dropdown>
              <a class="ant-dropdown-link">
                更多 <a-icon type="down" />
              </a>
              <a-menu slot="overlay">
                <a-menu-item v-if="record.status === 'draft'">
                  <a @click="handlePublish(record)">发布</a>
                </a-menu-item>
                <a-menu-item>
                  <a @click="handlePreview(record)">预览</a>
                </a-menu-item>
                <a-menu-item>
                  <a @click="handleCopy(record)">复制</a>
                </a-menu-item>
                <a-menu-item>
                  <a @click="handleAnalysis(record)">成绩分析</a>
                </a-menu-item>
                <a-menu-item>
                  <a @click="handleExportResults(record)">导出成绩</a>
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item v-if="record.status === 'published'">
                  <a @click="handleClose(record)" style="color: #ff9800">结束考试</a>
                </a-menu-item>
                <a-menu-item>
                  <a @click="handleDelete(record)" style="color: #ff4d4f">删除</a>
                </a-menu-item>
              </a-menu>
            </a-dropdown>
          </a-space>
        </span>
      </a-table>
    </a-card>

    <!-- 试卷编辑弹窗 -->
    <paper-modal
      ref="modalForm"
      @ok="modalFormOk"
    />

    <!-- 智能组卷弹窗 -->
    <smart-generate-modal
      ref="smartGenerateModal"
      @ok="handleSmartGenerateSuccess"
    />

    <!-- 发布试卷弹窗 -->
    <publish-modal
      ref="publishModal"
      @ok="handlePublishSuccess"
    />

    <!-- 试卷预览弹窗 -->
    <paper-preview-modal
      ref="previewModal"
    />

    <!-- 参与者列表弹窗 -->
    <participants-modal
      ref="participantsModal"
    />
  </div>
</template>

<script>
import { getAction, postAction, putAction } from '@/api/manage'
import { JeecgListMixin } from '@/mixins/JeecgListMixin'
import PaperModal from './modules/PaperModal'
import SmartGenerateModal from './modules/SmartGenerateModal'
import PublishModal from './modules/PublishModal'
import PaperPreviewModal from './modules/PaperPreviewModal'
import ParticipantsModal from './modules/ParticipantsModal'

export default {
    name: 'ExamPaper',
    mixins: [JeecgListMixin],
    components: {
        PaperModal,
        SmartGenerateModal,
        PublishModal,
        PaperPreviewModal,
        ParticipantsModal
    },
    data () {
        return {
            description: '试卷管理页面',
            // 表格相关
            columns: [
                {
                    title: '试卷名称',
                    dataIndex: 'paperName',
                    width: 200,
                    ellipsis: true
                },
                {
                    title: '所属课程',
                    dataIndex: 'courseName',
                    width: 150,
                    ellipsis: true
                },
                {
                    title: '考试类型',
                    dataIndex: 'examType',
                    width: 100,
                    align: 'center',
                    scopedSlots: { customRender: 'examTypeSlot' }
                },
                {
                    title: '状态',
                    dataIndex: 'status',
                    width: 80,
                    align: 'center',
                    scopedSlots: { customRender: 'statusSlot' }
                },
                {
                    title: '考试时长',
                    dataIndex: 'duration',
                    width: 80,
                    align: 'center',
                    scopedSlots: { customRender: 'durationSlot' }
                },
                {
                    title: '总分',
                    dataIndex: 'totalScore',
                    width: 80,
                    align: 'center',
                    scopedSlots: { customRender: 'scoreSlot' }
                },
                {
                    title: '题目数量',
                    dataIndex: 'questionCount',
                    width: 80,
                    align: 'center'
                },
                {
                    title: '难度等级',
                    dataIndex: 'difficulty',
                    width: 120,
                    align: 'center',
                    scopedSlots: { customRender: 'difficultySlot' }
                },
                {
                    title: '参与人数',
                    dataIndex: 'participantCount',
                    width: 80,
                    align: 'center',
                    scopedSlots: { customRender: 'participantSlot' }
                },
                {
                    title: '开始时间',
                    dataIndex: 'startTime',
                    width: 150,
                    sorter: true
                },
                {
                    title: '结束时间',
                    dataIndex: 'endTime',
                    width: 150,
                    sorter: true
                },
                {
                    title: '创建时间',
                    dataIndex: 'createTime',
                    width: 150,
                    sorter: true
                },
                {
                    title: '操作',
                    dataIndex: 'action',
                    width: 120,
                    align: 'center',
                    fixed: 'right',
                    scopedSlots: { customRender: 'action' }
                }
            ],
            url: {
                list: '/teaching/examPaper/list',
                delete: '/teaching/examPaper/delete',
                deleteBatch: '/teaching/examPaper/deleteBatch',
                exportXlsUrl: '/teaching/examPaper/exportXls',
                importExcelUrl: '/teaching/examPaper/importExcel'
            },
            courseList: []
        }
    },
    created () {
        this.getSuperFieldList()
        this.loadCourseList()
    },
    methods: {
        initDictConfig () {
            // 初始化字典配置
        },
        getSuperFieldList () {
            // 获取字段权限列表
        },
        loadCourseList () {
            // 加载课程列表
            getAction('/teaching/course/listAll').then(res => {
                if (res.success) {
                    this.courseList = res.result || []
                }
            })
        },
        handleAdd () {
            this.$refs.modalForm.add()
            this.$refs.modalForm.title = '创建试卷'
        },
        handleEdit (record) {
            this.$refs.modalForm.edit(record)
            this.$refs.modalForm.title = '编辑试卷'
        },
        handleView (record) {
            this.$refs.modalForm.edit(record)
            this.$refs.modalForm.title = '查看试卷'
            this.$refs.modalForm.disableSubmit = true
        },
        handleSmartGenerate () {
            this.$refs.smartGenerateModal.show()
        },
        handleSmartGenerateSuccess () {
            this.loadData()
            this.$message.success('智能组卷成功！')
        },
        handlePublish (record) {
            this.$refs.publishModal.show(record)
        },
        handlePublishSuccess () {
            this.loadData()
            this.$message.success('试卷发布成功！')
        },
        handleClose (record) {
            this.$confirm({
                title: '确认操作',
                content: '确定要结束此次考试吗？结束后学生将无法继续答题',
                onOk: () => {
                    putAction('/teaching/examPaper/close', { id: record.id }).then(res => {
                        if (res.success) {
                            this.$message.success('考试已结束')
                            this.loadData()
                        } else {
                            this.$message.error(res.message || '操作失败')
                        }
                    })
                }
            })
        },
        handlePreview (record) {
            this.$refs.previewModal.show(record)
        },
        handleCopy (record) {
            const newRecord = { ...record }
            delete newRecord.id
            newRecord.paperName = record.paperName + ' - 副本'
            newRecord.status = 'draft'
            this.$refs.modalForm.edit(newRecord)
            this.$refs.modalForm.title = '复制试卷'
        },
        handleBatchCopy () {
            if (this.selectedRowKeys.length === 0) {
                this.$message.warning('请选择要复制的试卷！')
                return
            }
            this.$confirm({
                title: '批量复制',
                content: `确定要复制选中的 ${this.selectedRowKeys.length} 份试卷吗？`,
                onOk: () => {
                    postAction('/teaching/examPaper/batchCopy', { ids: this.selectedRowKeys }).then(res => {
                        if (res.success) {
                            this.$message.success('批量复制成功！')
                            this.loadData()
                        } else {
                            this.$message.error(res.message || '复制失败')
                        }
                    })
                }
            })
        },
        handleAnalysis (record) {
            this.$router.push({
                path: '/exam/analysis',
                query: { paperId: record.id }
            })
        },
        handleViewParticipants (record) {
            this.$refs.participantsModal.show(record)
        },
        handleExportResults (record) {
            if (record.participantCount === 0) {
                this.$message.warning('暂无考试记录可导出！')
                return
            }
            this.$message.loading('正在导出考试结果...', 0)
            getAction('/teaching/examPaper/exportResults', { paperId: record.id }).then(res => {
                this.$message.destroy()
                if (res.success) {
                    // 下载文件
                    const blob = new Blob([res.result], { type: 'application/vnd.ms-excel' })
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${record.paperName}-考试结果.xlsx`
                    a.click()
                    window.URL.revokeObjectURL(url)
                    this.$message.success('导出成功！')
                } else {
                    this.$message.error(res.message || '导出失败')
                }
            }).catch(() => {
                this.$message.destroy()
                this.$message.error('导出失败')
            })
        },
        getStatusBadge (status) {
            const statusMap = {
                draft: { status: 'default', text: '草稿' },
                published: { status: 'processing', text: '进行中' },
                closed: { status: 'success', text: '已结束' }
            }
            return statusMap[status] || { status: 'default', text: status }
        },
        getExamTypeName (type) {
            const typeMap = {
                quiz: '随堂测验',
                midterm: '期中考试',
                final: '期末考试',
                assignment: '作业'
            }
            return typeMap[type] || type
        },
        getExamTypeColor (type) {
            const colorMap = {
                quiz: 'blue',
                midterm: 'orange',
                final: 'red',
                assignment: 'green'
            }
            return colorMap[type] || 'default'
        }
    }
}
</script>

<style lang="less" scoped>
.exam-paper-container {
  .card-title {
    font-size: 16px;
    font-weight: 500;
  }

  .search-form {
    margin-bottom: 16px;
    padding: 16px;
    background: #fafafa;
    border-radius: 4px;
  }

  .toolbar {
    .ant-btn + .ant-btn {
      margin-left: 8px;
    }
  }

  .ant-table {
    .ant-table-tbody > tr:hover > td {
      background: #e6f7ff;
    }
  }
}
</style>
