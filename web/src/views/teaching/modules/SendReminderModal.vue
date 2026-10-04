<template>
  <a-modal
    :title="title"
    :width="640"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
    okText="发送提醒"
    cancelText="取消"
  >
    <a-spin :spinning="confirmLoading">
      <a-form-model ref="form" :model="form" :rules="validatorRules" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-form-model-item label="提醒对象" prop="targetType">
          <a-radio-group v-model="form.targetType">
            <a-radio value="all">所有学生</a-radio>
            <a-radio value="unsubmitted">未提交学生</a-radio>
            <a-radio value="specific">指定学生</a-radio>
          </a-radio-group>
        </a-form-model-item>

        <a-form-model-item v-if="form.targetType === 'specific'" label="选择学生" prop="selectedStudents">
          <a-select
            v-model="form.selectedStudents"
            mode="multiple"
            placeholder="请选择要提醒的学生"
            style="width: 100%"
          >
            <a-select-option v-for="student in studentList" :key="student.id" :value="student.id">
              {{ student.name }} ({{ student.studentNo }})
            </a-select-option>
          </a-select>
        </a-form-model-item>

        <a-form-model-item label="提醒方式" prop="reminderType">
          <a-checkbox-group v-model="form.reminderType">
            <a-checkbox value="email">邮件提醒</a-checkbox>
            <a-checkbox value="sms">短信提醒</a-checkbox>
            <a-checkbox value="system">系统通知</a-checkbox>
          </a-checkbox-group>
        </a-form-model-item>

        <a-form-model-item label="提醒内容" prop="content">
          <a-textarea
            v-model="form.content"
            placeholder="请输入提醒内容"
            :rows="4"
          />
        </a-form-model-item>

        <a-form-model-item label="发送时间" prop="sendTime">
          <a-radio-group v-model="form.sendTimeType">
            <a-radio value="now">立即发送</a-radio>
            <a-radio value="scheduled">定时发送</a-radio>
          </a-radio-group>
          <a-date-picker
            v-if="form.sendTimeType === 'scheduled'"
            v-model="form.scheduledTime"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择发送时间"
            style="width: 100%; margin-top: 8px"
          />
        </a-form-model-item>
      </a-form-model>
    </a-spin>
  </a-modal>
</template>

<script>
export default {
    name: 'SendReminderModal',
    data () {
        return {
            title: '发送提醒',
            visible: false,
            confirmLoading: false,
            form: {
                workId: '',
                targetType: 'unsubmitted',
                selectedStudents: [],
                reminderType: ['system'],
                content: '',
                sendTimeType: 'now',
                scheduledTime: null
            },
            studentList: [],
            labelCol: {
                xs: { span: 24 },
                sm: { span: 6 }
            },
            wrapperCol: {
                xs: { span: 24 },
                sm: { span: 16 }
            },
            validatorRules: {
                targetType: [
                    { required: true, message: '请选择提醒对象!' }
                ],
                reminderType: [
                    { required: true, message: '请选择提醒方式!' }
                ],
                content: [
                    { required: true, message: '请输入提醒内容!' }
                ]
            }
        }
    },
    methods: {
        show (record) {
            this.visible = true
            this.form.workId = record.id
            this.loadStudentList(record.id)
            this.initDefaultContent(record)
        },

        loadStudentList (workId) {
            this.studentList = [
                { id: '1', name: '张三', studentNo: '20210001' },
                { id: '2', name: '李四', studentNo: '20210002' },
                { id: '3', name: '王五', studentNo: '20210003' },
                { id: '4', name: '赵六', studentNo: '20210004' }
            ]
        },

        initDefaultContent (record) {
            this.form.content = `亲爱的同学，您有一份作业「${record.workName}」尚未提交，截止时间为${record.deadline}，请及时完成并提交。`
        },

        handleOk () {
            this.$refs.form.validate(valid => {
                if (valid) {
                    this.confirmLoading = true

                    const params = {
                        workId: this.form.workId,
                        targetType: this.form.targetType,
                        selectedStudents: this.form.selectedStudents,
                        reminderType: this.form.reminderType,
                        content: this.form.content,
                        sendTimeType: this.form.sendTimeType,
                        scheduledTime: this.form.scheduledTime ? this.form.scheduledTime.format('YYYY-MM-DD HH:mm:ss') : null
                    }

                    setTimeout(() => {
                        this.confirmLoading = false
                        this.$message.success('提醒发送成功')
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
            this.form.targetType = 'unsubmitted'
            this.form.selectedStudents = []
            this.form.reminderType = ['system']
            this.form.sendTimeType = 'now'
            this.form.scheduledTime = null
        }
    }
}
</script>
