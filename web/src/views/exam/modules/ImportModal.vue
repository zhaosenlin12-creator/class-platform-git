<template>
  <a-modal
    title="批量导入题目"
    :width="600"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
    cancelText="取消"
    okText="开始导入"
  >
    <div class="import-container">
      <a-steps :current="currentStep" size="small">
        <a-step title="选择文件" />
        <a-step title="数据预览" />
        <a-step title="导入完成" />
      </a-steps>

      <!-- 步骤1: 文件上传 -->
      <div v-if="currentStep === 0" class="step-content">
        <a-alert
          message="导入说明"
          description="支持Excel文件(.xlsx, .xls)格式，请按照模板格式填写题目信息。"
          type="info"
          show-icon
          style="margin-bottom: 16px"
        />

        <div class="template-download">
          <a-button type="primary" ghost @click="downloadTemplate">
            <a-icon type="download" />
            下载导入模板
          </a-button>
        </div>

        <a-upload
          :fileList="fileList"
          :beforeUpload="beforeUpload"
          @remove="handleRemove"
          accept=".xlsx,.xls"
        >
          <a-button>
            <a-icon type="upload" />
            选择文件
          </a-button>
        </a-upload>

        <div v-if="fileList.length > 0" class="file-info">
          <a-card size="small" style="margin-top: 16px">
            <p><strong>文件名：</strong>{{ fileList[0].name }}</p>
            <p><strong>文件大小：</strong>{{ formatFileSize(fileList[0].size) }}</p>
            <p><strong>上传时间：</strong>{{ new Date().toLocaleString() }}</p>
          </a-card>
        </div>
      </div>

      <!-- 步骤2: 数据预览 -->
      <div v-if="currentStep === 1" class="step-content">
        <a-alert
          v-if="previewData.errors && previewData.errors.length > 0"
          message="数据校验警告"
          :description="`发现 ${previewData.errors.length} 个数据问题，请确认后继续导入。`"
          type="warning"
          show-icon
          style="margin-bottom: 16px"
        />

        <div class="preview-stats">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-statistic title="总题目数" :value="previewData.total || 0" />
            </a-col>
            <a-col :span="8">
              <a-statistic title="有效题目" :value="previewData.valid || 0" />
            </a-col>
            <a-col :span="8">
              <a-statistic title="问题题目" :value="previewData.invalid || 0" />
            </a-col>
          </a-row>
        </div>

        <a-table
          :columns="previewColumns"
          :dataSource="previewData.questions"
          :pagination="{ pageSize: 5 }"
          size="small"
          style="margin-top: 16px"
        >
          <span slot="typeSlot" slot-scope="text">
            <a-tag :color="getQuestionTypeColor(text)">
              {{ getQuestionTypeName(text) }}
            </a-tag>
          </span>

          <span slot="difficultySlot" slot-scope="text">
            <a-rate :value="text" disabled style="font-size: 12px" />
          </span>

          <span slot="statusSlot" slot-scope="text, record">
            <a-tag :color="record.valid ? 'green' : 'red'">
              {{ record.valid ? '正常' : '异常' }}
            </a-tag>
          </span>
        </a-table>

        <!-- 错误详情 -->
        <div v-if="previewData.errors && previewData.errors.length > 0" style="margin-top: 16px">
          <a-collapse>
            <a-collapse-panel key="errors" header="查看错误详情">
              <div v-for="(error, index) in previewData.errors" :key="index" class="error-item">
                <a-icon type="exclamation-circle" style="color: #ff4d4f; margin-right: 8px" />
                第{{ error.row }}行：{{ error.message }}
              </div>
            </a-collapse-panel>
          </a-collapse>
        </div>
      </div>

      <!-- 步骤3: 导入结果 -->
      <div v-if="currentStep === 2" class="step-content">
        <div class="import-result">
          <a-result
            :status="importResult.success ? 'success' : 'error'"
            :title="importResult.success ? '导入成功' : '导入失败'"
            :sub-title="importResult.message"
          >
            <template slot="extra" v-if="importResult.success">
              <a-descriptions bordered size="small">
                <a-descriptions-item label="成功导入">{{ importResult.successCount }}题</a-descriptions-item>
                <a-descriptions-item label="跳过重复">{{ importResult.duplicateCount }}题</a-descriptions-item>
                <a-descriptions-item label="失败">{{ importResult.failedCount }}题</a-descriptions-item>
              </a-descriptions>
            </template>
          </a-result>
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <template slot="footer">
        <div v-if="currentStep === 0">
          <a-button @click="handleCancel">取消</a-button>
          <a-button type="primary" :disabled="fileList.length === 0" @click="handlePreview">
            下一步
          </a-button>
        </div>
        <div v-else-if="currentStep === 1">
          <a-button @click="handlePrevious">上一步</a-button>
          <a-button @click="handleCancel">取消</a-button>
          <a-button
            type="primary"
            :loading="confirmLoading"
            :disabled="previewData.valid === 0"
            @click="handleImport"
          >
            确认导入
          </a-button>
        </div>
        <div v-else-if="currentStep === 2">
          <a-button type="primary" @click="handleFinish">完成</a-button>
        </div>
      </template>
    </div>
  </a-modal>
</template>

<script>
import { postAction, getAction } from '@/api/manage'

export default {
    name: 'ImportModal',
    data () {
        return {
            visible: false,
            confirmLoading: false,
            currentStep: 0,
            fileList: [],
            previewData: {
                total: 0,
                valid: 0,
                invalid: 0,
                questions: [],
                errors: []
            },
            importResult: {
                success: false,
                message: '',
                successCount: 0,
                duplicateCount: 0,
                failedCount: 0
            },
            previewColumns: [
                {
                    title: '题目标题',
                    dataIndex: 'title',
                    width: 200,
                    ellipsis: true
                },
                {
                    title: '类型',
                    dataIndex: 'questionType',
                    width: 80,
                    scopedSlots: { customRender: 'typeSlot' }
                },
                {
                    title: '难度',
                    dataIndex: 'difficulty',
                    width: 100,
                    scopedSlots: { customRender: 'difficultySlot' }
                },
                {
                    title: '分值',
                    dataIndex: 'score',
                    width: 60
                },
                {
                    title: '状态',
                    dataIndex: 'status',
                    width: 80,
                    scopedSlots: { customRender: 'statusSlot' }
                }
            ]
        }
    },
    methods: {
        show () {
            this.visible = true
            this.currentStep = 0
            this.fileList = []
            this.previewData = {
                total: 0,
                valid: 0,
                invalid: 0,
                questions: [],
                errors: []
            }
        },

        handleCancel () {
            this.visible = false
            this.currentStep = 0
            this.fileList = []
            this.confirmLoading = false
        },

        beforeUpload (file) {
            // 检查文件类型
            const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                      file.type === 'application/vnd.ms-excel'
            if (!isExcel) {
                this.$message.error('只支持上传Excel文件！')
                return false
            }

            // 检查文件大小
            const isLt10M = file.size / 1024 / 1024 < 10
            if (!isLt10M) {
                this.$message.error('文件大小不能超过10MB！')
                return false
            }

            this.fileList = [file]
            return false // 阻止自动上传
        },

        handleRemove () {
            this.fileList = []
        },

        async handlePreview () {
            if (this.fileList.length === 0) {
                this.$message.error('请先选择文件')
                return
            }

            this.confirmLoading = true
            const formData = new FormData()
            formData.append('file', this.fileList[0])

            try {
                const res = await postAction('/teaching/examQuestion/previewImport', formData)
                if (res.success) {
                    this.previewData = res.result
                    this.currentStep = 1
                } else {
                    this.$message.error(res.message || '文件解析失败')
                }
            } catch (error) {
                this.$message.error('文件解析失败')
                console.error(error)
            } finally {
                this.confirmLoading = false
            }
        },

        handlePrevious () {
            this.currentStep = 0
        },

        async handleImport () {
            this.confirmLoading = true

            const formData = new FormData()
            formData.append('file', this.fileList[0])

            try {
                const res = await postAction('/teaching/examQuestion/batchImport', formData)
                if (res.success) {
                    this.importResult = {
                        success: true,
                        message: '题目导入完成',
                        ...res.result
                    }
                    this.currentStep = 2
                    this.$emit('ok')
                } else {
                    this.importResult = {
                        success: false,
                        message: res.message || '导入失败'
                    }
                    this.currentStep = 2
                }
            } catch (error) {
                this.importResult = {
                    success: false,
                    message: '导入过程中发生错误'
                }
                this.currentStep = 2
                console.error(error)
            } finally {
                this.confirmLoading = false
            }
        },

        handleFinish () {
            this.handleCancel()
        },

        async downloadTemplate () {
            try {
                const res = await getAction('/teaching/examQuestion/downloadTemplate')
                if (res.success) {
                    // 创建下载链接
                    const blob = new Blob([res.result], {
                        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    })
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = '题目导入模板.xlsx'
                    a.click()
                    window.URL.revokeObjectURL(url)
                } else {
                    this.$message.error('模板下载失败')
                }
            } catch (error) {
                this.$message.error('模板下载失败')
                console.error(error)
            }
        },

        formatFileSize (bytes) {
            if (bytes === 0) return '0 B'
            const k = 1024
            const sizes = ['B', 'KB', 'MB', 'GB']
            const i = Math.floor(Math.log(bytes) / Math.log(k))
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
.import-container {
  .ant-steps {
    margin-bottom: 24px;
  }

  .step-content {
    min-height: 300px;
  }

  .template-download {
    margin-bottom: 16px;
    text-align: center;
  }

  .file-info {
    .ant-card {
      border: 1px dashed #d9d9d9;
      background: #fafafa;
    }
  }

  .preview-stats {
    padding: 16px;
    background: #fafafa;
    border-radius: 6px;
  }

  .error-item {
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }
  }

  .import-result {
    text-align: center;
  }
}
</style>
