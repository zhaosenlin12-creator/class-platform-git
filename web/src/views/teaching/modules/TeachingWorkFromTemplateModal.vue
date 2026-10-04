<template>
  <a-modal
    title="使用模板创建作业"
    :width="800"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel">

    <a-spin :spinning="confirmLoading">
      <!-- 模板信息预览 -->
      <a-card v-if="templateData" size="small" style="margin-bottom: 16px; background: #fafafa;">
        <a-row :gutter="16">
          <a-col :span="4" v-if="templateData.templateCover">
            <img :src="getImgView(templateData.templateCover)" style="width: 100%; border-radius: 4px;" alt="模板封面"/>
          </a-col>
          <a-col :span="templateData.templateCover ? 20 : 24">
            <h4>{{ templateData.templateName }}</h4>
            <p style="margin: 0; color: #666;">{{ templateData.templateDescription }}</p>
            <div style="margin-top: 8px;">
              <a-tag :color="getTypeColor(templateData.templateType)">{{ getTypeText(templateData.templateType) }}</a-tag>
              <a-tag color="blue">{{ getGradeLevelText(templateData.gradeLevel) }}</a-tag>
              <span style="margin-left: 8px;">预计时长：{{ templateData.estimatedTime }}分钟</span>
            </div>
          </a-col>
        </a-row>
      </a-card>

      <a-form :form="form">
        <!-- 基础设置 -->
        <a-card title="基础设置" size="small" style="margin-bottom: 16px;">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="作业名称" :labelCol="labelCol" :wrapperCol="wrapperCol">
                <a-input v-decorator="['workName', validatorRules.workName]" placeholder="请输入作业名称"></a-input>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="作业类型" :labelCol="labelCol" :wrapperCol="wrapperCol">
                <j-dict-select-tag v-decorator="['workType', validatorRules.workType]" dictCode="work_type" disabled />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item label="作业描述" :labelCol="{span: 3}" :wrapperCol="{span: 20}">
                <a-textarea v-decorator="['workDescription']" rows="3" placeholder="请输入作业描述"></a-textarea>
              </a-form-item>
            </a-col>
          </a-row>
        </a-card>

        <!-- 分发设置 -->
        <a-card title="分发设置" size="small" style="margin-bottom: 16px;">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="分配班级" :labelCol="labelCol" :wrapperCol="wrapperCol">
                <j-select-depart
                  :onlyLeaf="true"
                  :onlyCategory="3"
                  :rootOpened="true"
                  :multi="true"
                  v-decorator="['assignedClasses', validatorRules.assignedClasses]"
                  placeholder="请选择班级"/>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="发布状态" :labelCol="labelCol" :wrapperCol="wrapperCol">
                <a-radio-group v-decorator="['publishStatus', {initialValue: 'draft'}]">
                  <a-radio value="draft">草稿</a-radio>
                  <a-radio value="published">立即发布</a-radio>
                  <a-radio value="scheduled">定时发布</a-radio>
                </a-radio-group>
              </a-form-item>
            </a-col>
          </a-row>
        </a-card>

        <!-- 时间设置 -->
        <a-card title="时间设置" size="small" style="margin-bottom: 16px;">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="开始时间" :labelCol="labelCol" :wrapperCol="wrapperCol">
                <a-date-picker
                  v-decorator="['startTime', validatorRules.startTime]"
                  show-time
                  format="YYYY-MM-DD HH:mm:ss"
                  placeholder="请选择开始时间"
                  style="width: 100%"/>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="截止时间" :labelCol="labelCol" :wrapperCol="wrapperCol">
                <a-date-picker
                  v-decorator="['endTime', validatorRules.endTime]"
                  show-time
                  format="YYYY-MM-DD HH:mm:ss"
                  placeholder="请选择截止时间"
                  style="width: 100%"/>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="允许延期" :labelCol="labelCol" :wrapperCol="wrapperCol">
                <a-switch v-decorator="['allowExtension', {initialValue: false, valuePropName: 'checked'}]" />
              </a-form-item>
            </a-col>
            <a-col :span="12" v-if="form.getFieldValue('allowExtension')">
              <a-form-item label="最大延期天数" :labelCol="labelCol" :wrapperCol="wrapperCol">
                <a-input-number v-decorator="['maxExtensionDays']" :min="1" :max="30" placeholder="天数" style="width: 100%"/>
              </a-form-item>
            </a-col>
          </a-row>
        </a-card>

        <!-- 提交设置 -->
        <a-card title="提交设置" size="small" style="margin-bottom: 16px;">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="提交次数限制" :labelCol="labelCol" :wrapperCol="wrapperCol">
                <a-radio-group v-decorator="['submissionLimit', {initialValue: 'unlimited'}]" @change="onSubmissionLimitChange">
                  <a-radio value="unlimited">不限制</a-radio>
                  <a-radio value="limited">限制次数</a-radio>
                </a-radio-group>
              </a-form-item>
            </a-col>
            <a-col :span="12" v-if="submissionLimit === 'limited'">
              <a-form-item label="最大提交次数" :labelCol="labelCol" :wrapperCol="wrapperCol">
                <a-input-number v-decorator="['maxSubmissions']" :min="1" :max="10" placeholder="次数" style="width: 100%"/>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="允许重新提交" :labelCol="labelCol" :wrapperCol="wrapperCol">
                <a-switch v-decorator="['allowResubmission', {initialValue: true, valuePropName: 'checked'}]" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="自动保存" :labelCol="labelCol" :wrapperCol="wrapperCol">
                <a-switch v-decorator="['autoSave', {initialValue: true, valuePropName: 'checked'}]" />
              </a-form-item>
            </a-col>
          </a-row>
        </a-card>

        <!-- 评分设置 -->
        <a-card title="评分设置" size="small">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-form-item label="评分方式" :labelCol="labelCol" :wrapperCol="wrapperCol">
                <a-select v-decorator="['gradingMethod']" disabled>
                  <a-select-option value="comprehensive">综合评分</a-select-option>
                  <a-select-option value="criteria">分项评分</a-select-option>
                  <a-select-option value="auto">自动评分</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="总分" :labelCol="labelCol" :wrapperCol="wrapperCol">
                <a-input-number v-decorator="['totalScore', {initialValue: 100}]" :min="1" :max="1000" style="width: 100%"/>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="及格分数" :labelCol="labelCol" :wrapperCol="wrapperCol">
                <a-input-number v-decorator="['passingScore', {initialValue: 60}]" :min="1" :max="1000" style="width: 100%"/>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="显示成绩" :labelCol="labelCol" :wrapperCol="wrapperCol">
                <a-radio-group v-decorator="['showGrade', {initialValue: 'after_grading'}]">
                  <a-radio value="immediately">立即显示</a-radio>
                  <a-radio value="after_grading">评分后显示</a-radio>
                  <a-radio value="after_deadline">截止后显示</a-radio>
                </a-radio-group>
              </a-form-item>
            </a-col>
          </a-row>
        </a-card>
      </a-form>
    </a-spin>
  </a-modal>
</template>

<script>
import { httpAction } from '@/api/manage'

import moment from 'moment'
import JSelectDepart from '@/components/jeecgbiz/JSelectDepart'

export default {
    name: 'TeachingWorkFromTemplateModal',
    components: {
        JSelectDepart
    },
    data () {
        return {
            form: this.$form.createForm(this),
            visible: false,
            templateData: null,
            confirmLoading: false,
            labelCol: {
                xs: { span: 24 },
                sm: { span: 8 }
            },
            wrapperCol: {
                xs: { span: 24 },
                sm: { span: 16 }
            },
            validatorRules: {
                workName: { rules: [{ required: true, message: '请输入作业名称!' }] },
                workType: { rules: [{ required: true, message: '请选择作业类型!' }] },
                assignedClasses: { rules: [{ required: true, message: '请选择分配班级!' }] },
                startTime: { rules: [{ required: true, message: '请选择开始时间!' }] },
                endTime: { rules: [{ required: true, message: '请选择截止时间!' }] }
            },
            submissionLimit: 'unlimited',
            url: {
                createFromTemplate: '/teaching/teachingWork/createFromTemplate'
            }
        }
    },
    methods: {
        show (templateRecord) {
            this.templateData = templateRecord
            this.visible = true
            this.form.resetFields()

            // 根据模板预设值
            this.$nextTick(() => {
                this.form.setFieldsValue({
                    workName: templateRecord.templateName,
                    workType: templateRecord.templateType,
                    workDescription: templateRecord.templateDescription,
                    gradingMethod: templateRecord.gradingMethod || 'comprehensive',
                    startTime: moment(),
                    endTime: moment().add(templateRecord.estimatedTime * 2 || 120, 'minutes') // 预计时长的2倍作为截止时间
                })
            })
        },

        handleOk () {
            const that = this
            this.form.validateFields((err, values) => {
                if (!err) {
                    that.confirmLoading = true

                    // 验证时间逻辑
                    if (values.startTime && values.endTime && values.startTime.isAfter(values.endTime)) {
                        that.$message.error('开始时间不能晚于截止时间！')
                        that.confirmLoading = false
                        return
                    }

                    // 构建请求数据
                    const requestData = {
                        templateId: this.templateData.id,
                        ...values,
                        startTime: values.startTime ? values.startTime.format('YYYY-MM-DD HH:mm:ss') : null,
                        endTime: values.endTime ? values.endTime.format('YYYY-MM-DD HH:mm:ss') : null
                    }

                    httpAction(this.url.createFromTemplate, requestData, 'post').then((res) => {
                        if (res.success) {
                            that.$message.success('作业创建成功！')
                            that.$emit('ok', res.result)
                            that.handleCancel()
                        } else {
                            that.$message.warning(res.message)
                        }
                    }).finally(() => {
                        that.confirmLoading = false
                    })
                }
            })
        },

        handleCancel () {
            this.visible = false
            this.templateData = null
        },

        onSubmissionLimitChange (e) {
            this.submissionLimit = e.target.value
        },

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

        getImgView (path) {
            if (!path) return ''
            if (path.startsWith('http')) return path
            return window._CONFIG['domainURL'] + '/' + path
        }
    }
}
</script>

<style scoped>
.ant-card-head {
  background: #fafafa;
}
</style>
