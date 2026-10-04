<template>
  <a-modal
    :title="title"
    :width="640"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
    okText="确定"
    cancelText="取消"
  >
    <a-spin :spinning="confirmLoading">
      <a-form-model ref="form" :model="form" :rules="validatorRules" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-form-model-item label="当前截止时间" prop="currentDeadline">
          <a-input :value="currentDeadlineText" disabled />
        </a-form-model-item>

        <a-form-model-item label="新截止时间" prop="newDeadline">
          <a-date-picker
            v-model="form.newDeadline"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择新的截止时间"
            style="width: 100%"
          />
        </a-form-model-item>

        <a-form-model-item label="延期原因" prop="reason">
          <a-textarea
            v-model="form.reason"
            placeholder="请输入延期原因"
            :rows="4"
          />
        </a-form-model-item>

        <a-form-model-item label="通知学生">
          <a-switch v-model="form.notifyStudents" />
          <span style="margin-left: 8px">是否通知相关学生</span>
        </a-form-model-item>
      </a-form-model>
    </a-spin>
  </a-modal>
</template>

<script>
import moment from 'moment'

export default {
    name: 'ExtendDeadlineModal',
    data () {
        return {
            title: '延长截止时间',
            visible: false,
            confirmLoading: false,
            form: {
                workId: '',
                currentDeadline: null,
                newDeadline: null,
                reason: '',
                notifyStudents: true
            },
            labelCol: {
                xs: { span: 24 },
                sm: { span: 6 }
            },
            wrapperCol: {
                xs: { span: 24 },
                sm: { span: 16 }
            },
            validatorRules: {
                newDeadline: [
                    { required: true, message: '请选择新的截止时间!' }
                ],
                reason: [
                    { required: true, message: '请输入延期原因!' }
                ]
            }
        }
    },
    computed: {
        currentDeadlineText () {
            if (this.form.currentDeadline) {
                return moment(this.form.currentDeadline).format('YYYY-MM-DD HH:mm:ss')
            }
            return ''
        }
    },
    methods: {
        show (record) {
            this.visible = true
            this.form.workId = record.id
            this.form.currentDeadline = record.deadline
            this.form.newDeadline = null
            this.form.reason = ''
            this.form.notifyStudents = true
        },

        handleOk () {
            this.$refs.form.validate(valid => {
                if (valid) {
                    this.confirmLoading = true

                    const params = {
                        workId: this.form.workId,
                        newDeadline: this.form.newDeadline.format('YYYY-MM-DD HH:mm:ss'),
                        reason: this.form.reason,
                        notifyStudents: this.form.notifyStudents
                    }

                    setTimeout(() => {
                        this.confirmLoading = false
                        this.$message.success('截止时间延长成功')
                        this.handleCancel()
                        this.$emit('ok', params)
                    }, 1000)
                }
            })
        },

        handleCancel () {
            this.visible = false
            this.confirmLoading = false
            this.$refs.form.resetFields()
        }
    }
}
</script>
