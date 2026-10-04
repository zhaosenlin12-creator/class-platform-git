<template>
  <div class="question-bank-container">
    <a-card :bordered="false">
      <!-- 页面标题 -->
      <div slot="title" class="card-title">
        <a-icon type="database" />
        题库管理
      </div>

      <!-- 操作工具栏 -->
      <div slot="extra" class="toolbar">
        <a-space>
          <a-button type="primary" icon="plus" @click="handleAdd">
            新建题目
          </a-button>
          <a-button icon="upload" @click="handleImport">
            批量导入
          </a-button>
          <a-button icon="download" @click="handleExport">
            导出题库
          </a-button>
        </a-space>
      </div>

      <!-- 搜索表单 -->
      <div class="search-form">
        <a-form layout="inline" :form="searchForm">
          <a-form-item label="题目标题">
            <a-input v-model="queryParam.title" placeholder="请输入题目标题" style="width: 200px" />
          </a-form-item>
          <a-form-item label="题目类型">
            <a-select v-model="queryParam.questionType" placeholder="请选择题目类型" style="width: 120px" allow-clear>
              <a-select-option value="choice">单选题</a-select-option>
              <a-select-option value="multiple">多选题</a-select-option>
              <a-select-option value="fill">填空题</a-select-option>
              <a-select-option value="judge">判断题</a-select-option>
              <a-select-option value="code">编程题</a-select-option>
              <a-select-option value="essay">问答题</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="难度等级">
            <a-select v-model="queryParam.difficulty" placeholder="请选择难度" style="width: 100px" allow-clear>
              <a-select-option :value="1">1级</a-select-option>
              <a-select-option :value="2">2级</a-select-option>
              <a-select-option :value="3">3级</a-select-option>
              <a-select-option :value="4">4级</a-select-option>
              <a-select-option :value="5">5级</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="所属课程">
            <a-select v-model="queryParam.courseId" placeholder="请选择课程" style="width: 160px" allow-clear>
              <a-select-option v-for="course in courseList" :key="course.id" :value="course.id">
                {{ course.courseName }}
              </a-select-option>
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

      <!-- 题目列表表格 -->
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
        <span slot="questionTypeSlot" slot-scope="text, record">
          <a-tag :color="getQuestionTypeColor(text)">
            {{ getQuestionTypeName(text) }}
          </a-tag>
        </span>

        <span slot="difficultySlot" slot-scope="text">
          <a-rate :value="text" disabled style="font-size: 14px" />
        </span>

        <span slot="statusSlot" slot-scope="text">
          <a-badge :status="text === 1 ? 'success' : 'default'" :text="text === 1 ? '启用' : '禁用'" />
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
                <a-menu-item>
                  <a @click="handlePreview(record)">预览</a>
                </a-menu-item>
                <a-menu-item>
                  <a @click="handleCopy(record)">复制</a>
                </a-menu-item>
                <a-menu-item>
                  <a @click="handleUsageStats(record)">使用统计</a>
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item>
                  <a @click="handleDelete(record)" style="color: #ff4d4f">删除</a>
                </a-menu-item>
              </a-menu>
            </a-dropdown>
          </a-space>
        </span>
      </a-table>
    </a-card>

    <!-- 题目编辑弹窗 -->
    <question-modal
      ref="modalForm"
      @ok="modalFormOk"
    />

    <!-- 题目预览弹窗 -->
    <question-preview-modal
      ref="previewModal"
    />

    <!-- 导入题目弹窗 -->
    <import-modal
      ref="importModal"
      @ok="handleImportSuccess"
    />
  </div>
</template>

<script>
import { getAction } from '@/api/manage'
import { JeecgListMixin } from '@/mixins/JeecgListMixin'
import QuestionModal from './modules/QuestionModal'
import QuestionPreviewModal from './modules/QuestionPreviewModal'
import ImportModal from './modules/ImportModal'

export default {
    name: 'QuestionBank',
    mixins: [JeecgListMixin],
    components: {
        QuestionModal,
        QuestionPreviewModal,
        ImportModal
    },
    data () {
        return {
            description: '题库管理页面',
            // 表格相关
            columns: [
                {
                    title: '题目标题',
                    dataIndex: 'title',
                    width: 200,
                    ellipsis: true
                },
                {
                    title: '题目类型',
                    dataIndex: 'questionType',
                    width: 100,
                    align: 'center',
                    scopedSlots: { customRender: 'questionTypeSlot' }
                },
                {
                    title: '难度等级',
                    dataIndex: 'difficulty',
                    width: 120,
                    align: 'center',
                    scopedSlots: { customRender: 'difficultySlot' }
                },
                {
                    title: '知识点',
                    dataIndex: 'knowledgePoint',
                    width: 150,
                    ellipsis: true
                },
                {
                    title: '使用次数',
                    dataIndex: 'useCount',
                    width: 80,
                    align: 'center'
                },
                {
                    title: '正确率',
                    dataIndex: 'correctRate',
                    width: 80,
                    align: 'center',
                    customRender: (text) => text ? `${(text * 100).toFixed(1)}%` : '-'
                },
                {
                    title: '状态',
                    dataIndex: 'status',
                    width: 80,
                    align: 'center',
                    scopedSlots: { customRender: 'statusSlot' }
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
                list: '/teaching/examQuestion/list',
                delete: '/teaching/examQuestion/delete',
                deleteBatch: '/teaching/examQuestion/deleteBatch',
                exportXlsUrl: '/teaching/examQuestion/exportXls',
                importExcelUrl: '/teaching/examQuestion/importExcel'
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
            this.$refs.modalForm.title = '新增题目'
        },
        handleEdit (record) {
            this.$refs.modalForm.edit(record)
            this.$refs.modalForm.title = '编辑题目'
        },
        handleView (record) {
            this.$refs.modalForm.edit(record)
            this.$refs.modalForm.title = '查看题目'
            this.$refs.modalForm.disableSubmit = true
        },
        handlePreview (record) {
            this.$refs.previewModal.show(record)
        },
        handleCopy (record) {
            const newRecord = { ...record }
            delete newRecord.id
            newRecord.title = record.title + ' - 副本'
            this.$refs.modalForm.edit(newRecord)
            this.$refs.modalForm.title = '复制题目'
        },
        handleUsageStats (record) {
            this.$message.info('功能开发中...')
        },
        handleImport () {
            this.$refs.importModal.show()
        },
        handleImportSuccess () {
            this.loadData()
        },
        handleExport () {
            if (this.selectedRowKeys.length === 0) {
                this.$message.warning('请选择要导出的数据！')
                return
            }
            this.$message.success('导出功能开发中...')
        },
        getQuestionTypeName (type) {
            const typeMap = {
                choice: '单选题',
                multiple: '多选题',
                fill: '填空题',
                judge: '判断题',
                code: '编程题',
                essay: '问答题'
            }
            return typeMap[type] || type
        },
        getQuestionTypeColor (type) {
            const colorMap = {
                choice: 'blue',
                multiple: 'cyan',
                fill: 'green',
                judge: 'orange',
                code: 'purple',
                essay: 'red'
            }
            return colorMap[type] || 'default'
        }
    }
}
</script>

<style lang="less" scoped>
.question-bank-container {
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
