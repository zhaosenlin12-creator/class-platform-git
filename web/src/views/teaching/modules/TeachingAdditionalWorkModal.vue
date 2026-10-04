<template>
  <j-modal
    :title="title"
    :width="width"
    :visible="visible"
    :confirmLoading="confirmLoading"
    switchFullscreen
    @ok="handleOk"
    @cancel="handleCancel"
    cancelText="关闭">
    <a-spin :spinning="confirmLoading">
      <a-form :form="form">
        <a-form-item label="状态" :labelCol="labelCol" :wrapperCol="wrapperCol">
          <j-dict-select-tag type="radio" v-decorator="['status',{rules: [{required: true, message: '请选择状态!'}]}]" :trigger-change="true" dictCode="additional_work_status" placeholder="请选择状态"/>
        </a-form-item>
        <a-form-item label="作业类型" :labelCol="labelCol" :wrapperCol="wrapperCol">
          <j-dict-select-tag type="list" v-decorator="['codeType']" :trigger-change="true" dictCode="work_type" placeholder="请选择作业类型"/>
        </a-form-item>
        <a-form-item label="作业名" :labelCol="labelCol" :wrapperCol="wrapperCol">
          <a-input v-decorator="['workName',{rules: [{required: true, message: '请输入作业名!'}]}]" placeholder="请输入作业名"></a-input>
        </a-form-item>
        <a-form-item label="作业描述" :labelCol="labelCol" :wrapperCol="wrapperCol">
          <a-textarea v-decorator="['workDesc']" rows="4" placeholder="请输入作业描述"/>
        </a-form-item>
        <a-form-item label="作业封面" :labelCol="labelCol" :wrapperCol="wrapperCol">
          <j-upload v-decorator="['workCover']" :number="1" :fileType="'image'" :trigger-change="true"></j-upload>
        </a-form-item>
        <a-form-item label="作业资料" :labelCol="labelCol" :wrapperCol="wrapperCol">
          <j-upload v-decorator="['workDocumentUrl']" :number="1" :trigger-change="true"></j-upload>
        </a-form-item>
        <a-form-item label="作业文件" :labelCol="labelCol" :wrapperCol="wrapperCol">
          <j-upload v-decorator="['workUrl']" :number="1" :trigger-change="true"></j-upload>
        </a-form-item>
        <a-form-item label="分配班级" :labelCol="labelCol" :wrapperCol="wrapperCol">
          <j-select-depart :onlyLeaf="true" :onlyCategory="3" :rootOpened="true" :multi="true" v-decorator="['workDept',{rules: [{required: true, message: '请选择班级!'}]}]"/>
        </a-form-item>

        <!-- 新增时间管理部分 -->
        <a-form-item label="开始时间" :labelCol="labelCol" :wrapperCol="wrapperCol">
          <a-date-picker
            v-decorator="['startTime', {rules: [{required: true, message: '请选择开始时间!'}]}]"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择开始时间"
            style="width: 100%"/>
        </a-form-item>
        <a-form-item label="截止时间" :labelCol="labelCol" :wrapperCol="wrapperCol">
          <a-date-picker
            v-decorator="['endTime', {rules: [{required: true, message: '请选择截止时间!'}]}]"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择截止时间"
            style="width: 100%"/>
        </a-form-item>
        <a-form-item label="允许延期" :labelCol="labelCol" :wrapperCol="wrapperCol">
          <a-switch v-decorator="['allowExtension', {initialValue: false, valuePropName: 'checked'}]" @change="onExtensionChange"/>
        </a-form-item>
        <a-form-item v-show="allowExtension" label="最大延期天数" :labelCol="labelCol" :wrapperCol="wrapperCol">
          <a-input-number v-decorator="['maxExtensionDays', {initialValue: 7}]" :min="1" :max="30" placeholder="天数" style="width: 100%"/>
        </a-form-item>

        <!-- 新增提交设置部分 -->
        <a-form-item label="提交次数限制" :labelCol="labelCol" :wrapperCol="wrapperCol">
          <a-radio-group v-decorator="['submissionLimit', {initialValue: 'unlimited'}]" @change="onSubmissionLimitChange">
            <a-radio value="unlimited">不限制</a-radio>
            <a-radio value="limited">限制次数</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item v-show="submissionLimit === 'limited'" label="最大提交次数" :labelCol="labelCol" :wrapperCol="wrapperCol">
          <a-input-number v-decorator="['maxSubmissions', {initialValue: 3}]" :min="1" :max="10" placeholder="次数" style="width: 100%"/>
        </a-form-item>
        <a-form-item label="允许重新提交" :labelCol="labelCol" :wrapperCol="wrapperCol">
          <a-switch v-decorator="['allowResubmission', {initialValue: true, valuePropName: 'checked'}]"/>
        </a-form-item>

        <!-- 新增通知设置 -->
        <a-form-item label="通知设置" :labelCol="labelCol" :wrapperCol="wrapperCol">
          <a-checkbox-group v-decorator="['notifications', {initialValue: ['email', 'system']}]">
            <a-checkbox value="email">邮件通知</a-checkbox>
            <a-checkbox value="system">系统通知</a-checkbox>
            <a-checkbox value="sms">短信通知</a-checkbox>
          </a-checkbox-group>
        </a-form-item>

        <!-- 新增提醒设置 -->
        <a-form-item label="截止提醒" :labelCol="labelCol" :wrapperCol="wrapperCol">
          <a-checkbox-group v-decorator="['deadlineReminders', {initialValue: ['1day', '1hour']}]">
            <a-checkbox value="3day">截止前3天</a-checkbox>
            <a-checkbox value="1day">截止前1天</a-checkbox>
            <a-checkbox value="1hour">截止前1小时</a-checkbox>
          </a-checkbox-group>
        </a-form-item>

      </a-form>
    </a-spin>
  </j-modal>
</template>

<script>

import { httpAction } from '@/api/manage'
import pick from 'lodash.pick'

import JUpload from '@/components/jeecg/JUpload'
import JSelectDepart from '@/components/jeecgbiz/JSelectDepart'

export default {
    name: 'TeachingAdditionalWorkModal',
    components: {
        JUpload,
        JSelectDepart
    },
    data () {
        return {
            form: this.$form.createForm(this),
            title: '操作',
            width: 1000,
            visible: false,
            model: {},
            labelCol: {
                xs: { span: 24 },
                sm: { span: 5 }
            },
            wrapperCol: {
                xs: { span: 24 },
                sm: { span: 16 }
            },
            confirmLoading: false,
            allowExtension: false,
            submissionLimit: 'unlimited',
            validatorRules: {
            },
            url: {
                add: '/teaching/teachingAdditionalWork/add',
                edit: '/teaching/teachingAdditionalWork/edit'
            }
        }
    },
    created () {
    },
    methods: {
        add () {
            this.edit({})
        },
        edit (record) {
            this.form.resetFields()
            this.model = Object.assign({}, record)
            this.visible = true
            this.allowExtension = this.model.allowExtension || false
            this.submissionLimit = this.model.submissionLimit || 'unlimited'

            this.$nextTick(() => {
                this.form.setFieldsValue(pick(this.model,
                    'codeType', 'createTime', 'workName', 'workDesc', 'workCover', 'workDocumentUrl', 'workUrl', 'workDept', 'status',
                    'startTime', 'endTime', 'allowExtension', 'maxExtensionDays', 'submissionLimit', 'maxSubmissions',
                    'allowResubmission', 'notifications', 'deadlineReminders'
                ))
            })
        },
        close () {
            this.$emit('close')
            this.visible = false
        },
        handleOk () {
            const that = this
            // 触发表单验证
            this.form.validateFields((err, values) => {
                if (!err) {
                    that.confirmLoading = true
                    let httpurl = ''
                    let method = ''
                    if (!this.model.id) {
                        httpurl += this.url.add
                        method = 'post'
                    } else {
                        httpurl += this.url.edit
                        method = 'put'
                    }
                    // 时间验证
                    if (values.startTime && values.endTime && values.startTime.isAfter(values.endTime)) {
                        that.$message.error('开始时间不能晚于截止时间！')
                        that.confirmLoading = false
                        return
                    }

                    // 处理时间格式
                    if (values.startTime) {
                        values.startTime = values.startTime.format('YYYY-MM-DD HH:mm:ss')
                    }
                    if (values.endTime) {
                        values.endTime = values.endTime.format('YYYY-MM-DD HH:mm:ss')
                    }

                    let formData = Object.assign(this.model, values)
                    httpAction(httpurl, formData, method).then((res) => {
                        if (res.success) {
                            that.$message.success(res.message)
                            that.$emit('ok')
                        } else {
                            that.$message.warning(res.message)
                        }
                    }).finally(() => {
                        that.confirmLoading = false
                        that.close()
                    })
                }
            })
        },
        handleCancel () {
            this.close()
        },
        popupCallback (row) {
            this.form.setFieldsValue(pick(row, 'codeType', 'createTime', 'workName', 'workDesc', 'workCover', 'workDocumentUrl', 'workUrl', 'workDept', 'workIntegral', 'status'))
        },

        // 处理延期开关变化
        onExtensionChange (checked) {
            this.allowExtension = checked
        },

        // 处理提交次数限制变化
        onSubmissionLimitChange (e) {
            this.submissionLimit = e.target.value
        },

        // 批量分发作业
        batchAssign () {
        // 实现批量分发逻辑
            this.$confirm({
                title: '批量分发确认',
                content: '确定要向选择的班级批量分发作业吗？',
                onOk: () => {
                    // 调用批量分发API
                    this.$message.success('批量分发成功')
                }
            })
        },

        // 预览作业内容
        previewWork () {
        // 实现作业预览功能
            this.$message.info('作业预览功能开发中...')
        }
    }
}
</script>
