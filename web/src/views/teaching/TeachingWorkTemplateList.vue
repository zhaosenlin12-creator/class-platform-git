<template>
  <a-card :bordered="false">
    <!-- 查询区域 -->
    <div class="table-page-search-wrapper">
      <a-form layout="inline" @keyup.enter.native="searchQuery">
        <a-row :gutter="24">
          <a-col :xl="6" :lg="7" :md="8" :sm="24">
            <a-form-item label="模板名称">
              <a-input placeholder="请输入模板名称" v-model="queryParam.templateName"></a-input>
            </a-form-item>
          </a-col>
          <a-col :xl="6" :lg="7" :md="8" :sm="24">
            <a-form-item label="模板类型">
              <j-dict-select-tag placeholder="请选择模板类型" v-model="queryParam.templateType" dictCode="work_type" />
            </a-form-item>
          </a-col>
          <a-col :xl="6" :lg="7" :md="8" :sm="24">
            <a-form-item label="适用年级">
              <a-select placeholder="请选择适用年级" v-model="queryParam.gradeLevel">
                <a-select-option value="grade1">一年级</a-select-option>
                <a-select-option value="grade2">二年级</a-select-option>
                <a-select-option value="grade3">三年级</a-select-option>
                <a-select-option value="grade4">四年级</a-select-option>
                <a-select-option value="grade5">五年级</a-select-option>
                <a-select-option value="grade6">六年级</a-select-option>
                <a-select-option value="junior">初中</a-select-option>
                <a-select-option value="senior">高中</a-select-option>
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

    <!-- 操作按钮区域 -->
    <div class="table-operator">
      <a-button @click="handleAdd" type="primary" icon="plus">新建模板</a-button>
      <a-button @click="handleImportTemplate" type="default" icon="import" style="margin-left: 8px">导入模板</a-button>
      <a-dropdown v-if="selectedRowKeys.length > 0">
        <a-menu slot="overlay">
          <a-menu-item key="1" @click="batchDel"><a-icon type="delete" />删除</a-menu-item>
          <a-menu-item key="2" @click="batchExport"><a-icon type="export" />导出</a-menu-item>
        </a-menu>
        <a-button style="margin-left: 8px"> 批量操作 <a-icon type="down" /></a-button>
      </a-dropdown>
    </div>

    <!-- table区域 -->
    <div>
      <div class="ant-alert ant-alert-info" style="margin-bottom: 16px">
        <i class="anticon anticon-info-circle ant-alert-icon"></i> 已选择
        <a style="font-weight: 600">{{ selectedRowKeys.length }}</a>项
        <a style="margin-left: 24px" @click="onClearSelected">清空</a>
      </div>

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
      >
        <template slot="imgSlot" slot-scope="text">
          <span v-if="!text" style="font-size: 12px; font-style: italic">无封面</span>
          <img v-else :src="getImgView(text)" height="50px" alt="" style="max-width: 80px;" />
        </template>

        <template slot="templateType" slot-scope="text">
          <a-tag :color="getTypeColor(text)">{{ getTypeText(text) }}</a-tag>
        </template>

        <template slot="difficulty" slot-scope="text">
          <a-rate :value="text" disabled :count="5" />
        </template>

        <template slot="gradeLevel" slot-scope="text">
          <a-tag color="blue">{{ getGradeLevelText(text) }}</a-tag>
        </template>

        <template slot="status" slot-scope="text">
          <a-badge :status="text === 'active' ? 'success' : 'default'" :text="text === 'active' ? '启用' : '禁用'" />
        </template>

        <span slot="action" slot-scope="text, record">
          <a @click="handleEdit(record)">编辑</a>
          <a-divider type="vertical" />
          <a @click="handlePreview(record)">预览</a>
          <a-divider type="vertical" />
          <a @click="handleCopy(record)">复制</a>
          <a-divider type="vertical" />
          <a @click="handleUseTemplate(record)">使用模板</a>
          <a-divider type="vertical" />
          <a-dropdown>
            <a class="ant-dropdown-link">更多 <a-icon type="down" /></a>
            <a-menu slot="overlay">
              <a-menu-item>
                <a @click="handleExport(record)">导出模板</a>
              </a-menu-item>
              <a-menu-item>
                <a-popconfirm title="确定删除吗?" @confirm="() => handleDelete(record.id)">
                  <a>删除</a>
                </a-popconfirm>
              </a-menu-item>
            </a-menu>
          </a-dropdown>
        </span>
      </a-table>
    </div>

    <!-- 模板编辑弹窗 -->
    <teaching-work-template-modal ref="modalForm" @ok="modalFormOk"></teaching-work-template-modal>

    <!-- 模板预览弹窗 -->
    <teaching-work-template-preview ref="previewModal"></teaching-work-template-preview>

    <!-- 使用模板创建作业弹窗 -->
    <teaching-work-from-template-modal ref="fromTemplateModal" @ok="fromTemplateOk"></teaching-work-from-template-modal>
  </a-card>
</template>

<script>
import '@/assets/less/TableExpand.less'
import { mixinDevice } from '@/utils/mixin'
import { JeecgListMixin } from '@/mixins/JeecgListMixin'
import TeachingWorkTemplateModal from './modules/TeachingWorkTemplateModal'
import TeachingWorkTemplatePreview from './modules/TeachingWorkTemplatePreview'
import TeachingWorkFromTemplateModal from './modules/TeachingWorkFromTemplateModal'
import { getAction } from '@/api/manage'

export default {
    name: 'TeachingWorkTemplateList',
    mixins: [JeecgListMixin, mixinDevice],
    components: {
        TeachingWorkTemplateModal,
        TeachingWorkTemplatePreview,
        TeachingWorkFromTemplateModal
    },
    data () {
        return {
            description: '作业模板管理页面',
            // 表头
            columns: [
                {
                    title: '#',
                    dataIndex: '',
                    key: 'rowIndex',
                    width: 60,
                    align: 'center',
                    customRender: function (t, r, index) {
                        return parseInt(index) + 1
                    }
                },
                {
                    title: '模板封面',
                    align: 'center',
                    dataIndex: 'templateCover',
                    width: 100,
                    scopedSlots: { customRender: 'imgSlot' }
                },
                {
                    title: '模板名称',
                    align: 'center',
                    dataIndex: 'templateName',
                    width: 200
                },
                {
                    title: '模板类型',
                    align: 'center',
                    dataIndex: 'templateType',
                    width: 120,
                    scopedSlots: { customRender: 'templateType' }
                },
                {
                    title: '适用年级',
                    align: 'center',
                    dataIndex: 'gradeLevel',
                    width: 120,
                    scopedSlots: { customRender: 'gradeLevel' }
                },
                {
                    title: '难度等级',
                    align: 'center',
                    dataIndex: 'difficulty',
                    width: 150,
                    scopedSlots: { customRender: 'difficulty' }
                },
                {
                    title: '预计时长',
                    align: 'center',
                    dataIndex: 'estimatedTime',
                    width: 100,
                    customRender: function (text) {
                        return text ? text + '分钟' : '-'
                    }
                },
                {
                    title: '使用次数',
                    align: 'center',
                    dataIndex: 'usageCount',
                    width: 100
                },
                {
                    title: '状态',
                    align: 'center',
                    dataIndex: 'status',
                    width: 100,
                    scopedSlots: { customRender: 'status' }
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
                    width: 250,
                    scopedSlots: { customRender: 'action' }
                }
            ],
            url: {
                list: '/teaching/teachingWorkTemplate/list',
                delete: '/teaching/teachingWorkTemplate/delete',
                deleteBatch: '/teaching/teachingWorkTemplate/deleteBatch',
                exportXlsUrl: '/teaching/teachingWorkTemplate/exportXls',
                importExcelUrl: '/teaching/teachingWorkTemplate/importExcel'
            },
            dictOptions: {}
        }
    },
    computed: {
        importExcelUrl () {
            return `${window._CONFIG['domainURL']}/${this.url.importExcelUrl}`
        }
    },
    methods: {
        getTypeColor (type) {
            const colors = {
                'scratch': 'orange',
                'python': 'green',
                'web': 'blue',
                'game': 'purple',
                'ai': 'red'
            }
            return colors[type] || 'default'
        },

        getTypeText (type) {
            const types = {
                'scratch': 'Scratch编程',
                'python': 'Python编程',
                'web': '网页设计',
                'game': '游戏开发',
                'ai': '人工智能'
            }
            return types[type] || type
        },

        getGradeLevelText (level) {
            const levels = {
                'grade1': '一年级',
                'grade2': '二年级',
                'grade3': '三年级',
                'grade4': '四年级',
                'grade5': '五年级',
                'grade6': '六年级',
                'junior': '初中',
                'senior': '高中'
            }
            return levels[level] || level
        },

        handlePreview (record) {
            this.$refs.previewModal.show(record)
        },

        handleCopy (record) {
            // 复制模板
            const copyData = {
                ...record,
                templateName: record.templateName + '_副本',
                id: null
            }
            this.$refs.modalForm.add()
            this.$refs.modalForm.edit(copyData)
        },

        handleUseTemplate (record) {
            // 使用模板创建作业
            this.$refs.fromTemplateModal.show(record)
        },

        handleExport (record) {
            // 导出单个模板
            const params = { id: record.id }
            getAction('/teaching/teachingWorkTemplate/export', params).then(res => {
                if (res.success) {
                    this.$message.success('模板导出成功')
                    // 下载文件逻辑
                    this.downloadFile(res.result)
                } else {
                    this.$message.error('导出失败：' + res.message)
                }
            })
        },

        batchExport () {
            // 批量导出模板
            if (this.selectedRowKeys.length === 0) {
                this.$message.warning('请选择要导出的模板')
                return
            }
            const params = { ids: this.selectedRowKeys.join(',') }
            getAction('/teaching/teachingWorkTemplate/batchExport', params).then(res => {
                if (res.success) {
                    this.$message.success('批量导出成功')
                    this.downloadFile(res.result)
                } else {
                    this.$message.error('导出失败：' + res.message)
                }
            })
        },

        handleImportTemplate () {
            // 导入模板
            this.$refs.importModal.show()
        },

        fromTemplateOk () {
            // 使用模板创建作业成功回调
            this.$message.success('作业创建成功')
        },

        downloadFile (fileData) {
            // 文件下载逻辑
            const blob = new Blob([fileData])
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'template_export.json'
            a.click()
            window.URL.revokeObjectURL(url)
        }
    }
}
</script>

<style scoped>
.ant-card-body .table-page-search-wrapper {
  padding: 16px;
  background: #fafafa;
  margin-bottom: 16px;
}
</style>
