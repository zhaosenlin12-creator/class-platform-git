<template>
  <a-modal
    title="发布试卷"
    :width="600"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
    cancelText="取消"
    okText="确认发布"
  >
    <div class="publish-container">
      <a-alert
        message="发布提醒"
        description="试卷发布后学生即可开始考试，请确认所有配置无误。"
        type="info"
        show-icon
        style="margin-bottom: 16px"
      />

      <a-form :form="form" :label-col="labelCol" :wrapper-col="wrapperCol">
        <!-- 试卷基本信息展示 -->
        <div class="paper-info" v-if="paperData">
          <h4>试卷信息</h4>
          <a-descriptions bordered size="small">
            <a-descriptions-item label="试卷名称">{{ paperData.paperName }}</a-descriptions-item>
            <a-descriptions-item label="考试时长">{{ paperData.duration }}分钟</a-descriptions-item>
            <a-descriptions-item label="题目数量">{{ paperData.questionCount }}题</a-descriptions-item>
            <a-descriptions-item label="总分">{{ paperData.totalScore }}分</a-descriptions-item>
          </a-descriptions>
        </div>

        <!-- 发布时间设置 -->
        <a-form-item label="开始时间">
          <a-date-picker
            v-decorator="['startTime', validatorRules.startTime]"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择考试开始时间"
            style="width: 100%"
            :disabled-date="disabledStartDate"
          />
        </a-form-item>

        <a-form-item label="结束时间">
          <a-date-picker
            v-decorator="['endTime', validatorRules.endTime]"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择考试结束时间"
            style="width: 100%"
            :disabled-date="disabledEndDate"
          />
        </a-form-item>

        <!-- 参与学生设置 -->
        <a-form-item label="参与学生">
          <a-radio-group v-decorator="['participantType', { initialValue: 'all' }]" @change="handleParticipantTypeChange">
            <a-radio value="all">全部学生</a-radio>
            <a-radio value="class">按班级</a-radio>
            <a-radio value="custom">指定学生</a-radio>
          </a-radio-group>
        </a-form-item>

        <!-- 班级选择 -->
        <a-form-item v-if="currentParticipantType === 'class'" label="选择班级">
          <a-select
            v-decorator="['classIds', validatorRules.classIds]"
            mode="multiple"
            placeholder="请选择班级"
            style="width: 100%"
          >
            <a-select-option v-for="cls in classList" :key="cls.id" :value="cls.id">
              {{ cls.className }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <!-- 学生选择 -->
        <a-form-item v-if="currentParticipantType === 'custom'" label="选择学生">
          <a-select
            v-decorator="['studentIds', validatorRules.studentIds]"
            mode="multiple"
            placeholder="请选择学生"
            style="width: 100%"
            show-search
            :filter-option="filterOption"
          >
            <a-select-option v-for="student in studentList" :key="student.id" :value="student.id">
              {{ student.studentName }}（{{ student.studentNo }}）
            </a-select-option>
          </a-select>
        </a-form-item>

        <!-- 考试设置 -->
        <a-form-item label="考试设置">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-checkbox v-decorator="['allowRetake', { valuePropName: 'checked' }]">
                允许重考
              </a-checkbox>
            </a-col>
            <a-col :span="8">
              <a-checkbox v-decorator="['shuffleQuestions', { valuePropName: 'checked' }]">
                题目乱序
              </a-checkbox>
            </a-col>
            <a-col :span="8">
              <a-checkbox v-decorator="['shuffleOptions', { valuePropName: 'checked' }]">
                选项乱序
              </a-checkbox>
            </a-col>
          </a-row>
          <a-row :gutter="16" style="margin-top: 8px">
            <a-col :span="8">
              <a-checkbox v-decorator="['antiCheat', { valuePropName: 'checked', initialValue: true }]">
                防作弊检测
              </a-checkbox>
            </a-col>
            <a-col :span="8">
              <a-checkbox v-decorator="['autoSubmit', { valuePropName: 'checked', initialValue: true }]">
                时间到自动提交
              </a-checkbox>
            </a-col>
            <a-col :span="8">
              <a-checkbox v-decorator="['showScore', { valuePropName: 'checked' }]">
                立即显示成绩
              </a-checkbox>
            </a-col>
          </a-row>
        </a-form-item>

        <!-- 重考设置 -->
        <div v-if="form.getFieldValue('allowRetake')" style="margin-left: 20px;">
          <a-form-item label="重考次数">
            <a-input-number
              v-decorator="['retakeLimit', { initialValue: 1 }]"
              :min="1"
              :max="10"
              placeholder="次数"
              style="width: 100px"
            />
            <span style="margin-left: 8px;">次</span>
          </a-form-item>

          <a-form-item label="重考间隔">
            <a-input-number
              v-decorator="['retakeInterval', { initialValue: 60 }]"
              :min="0"
              :max="1440"
              placeholder="分钟"
              style="width: 100px"
            />
            <span style="margin-left: 8px;">分钟</span>
          </a-form-item>
        </div>

        <!-- 监考设置 -->
        <a-form-item label="监考设置">
          <a-checkbox v-decorator="['requireCamera', { valuePropName: 'checked' }]">
            要求开启摄像头
          </a-checkbox>
          <br/>
          <a-checkbox v-decorator="['requireMicrophone', { valuePropName: 'checked' }]">
            要求开启麦克风
          </a-checkbox>
          <br/>
          <a-checkbox v-decorator="['forbidSwitchTab', { valuePropName: 'checked', initialValue: true }]">
            禁止切换标签页
          </a-checkbox>
          <br/>
          <a-checkbox v-decorator="['forbidCopy', { valuePropName: 'checked', initialValue: true }]">
            禁止复制粘贴
          </a-checkbox>
        </a-form-item>

        <!-- 通知设置 -->
        <a-form-item label="通知设置">
          <a-checkbox v-decorator="['sendNotification', { valuePropName: 'checked', initialValue: true }]">
            发送考试通知
          </a-checkbox>
          <div v-if="form.getFieldValue('sendNotification')" style="margin-left: 20px; margin-top: 8px;">
            <a-checkbox v-decorator="['emailNotification', { valuePropName: 'checked' }]">
              邮件通知
            </a-checkbox>
            <br/>
            <a-checkbox v-decorator="['smsNotification', { valuePropName: 'checked' }]">
              短信通知
            </a-checkbox>
          </div>
        </a-form-item>

        <!-- 发布说明 -->
        <a-form-item label="发布说明">
          <a-textarea
            v-decorator="['publishNote']"
            placeholder="可以输入考试注意事项等信息（可选）"
            :rows="3"
          />
        </a-form-item>
      </a-form>

      <!-- 预估参与人数 -->
      <div class="participant-stats" v-if="estimatedParticipants > 0">
        <a-card size="small" title="预估参与人数">
          <a-statistic :value="estimatedParticipants" suffix="人" />
        </a-card>
      </div>
    </div>
  </a-modal>
</template>

<script>
import { getAction, putAction } from '@/api/manage'

export default {
    name: 'PublishModal',
    data () {
        return {
            visible: false,
            confirmLoading: false,
            form: this.$form.createForm(this),
            labelCol: {
                xs: { span: 24 },
                sm: { span: 6 }
            },
            wrapperCol: {
                xs: { span: 24 },
                sm: { span: 16 }
            },
            validatorRules: {
                startTime: {
                    rules: [{ required: true, message: '请选择开始时间!' }]
                },
                endTime: {
                    rules: [{ required: true, message: '请选择结束时间!' }]
                },
                classIds: {
                    rules: [{ required: true, message: '请选择班级!' }]
                },
                studentIds: {
                    rules: [{ required: true, message: '请选择学生!' }]
                }
            },
            paperData: null,
            currentParticipantType: 'all',
            classList: [],
            studentList: [],
            estimatedParticipants: 0
        }
    },
    created () {
        this.loadClassList()
        this.loadStudentList()
    },
    methods: {
        show (record) {
            this.paperData = record
            this.visible = true
            this.form.resetFields()
            this.currentParticipantType = 'all'
            this.estimateParticipants()

            // 设置默认时间
            this.$nextTick(() => {
                const now = this.$moment()
                this.form.setFieldsValue({
                    startTime: now.add(1, 'hour'),
                    endTime: now.add(1, 'hour').add(this.paperData.duration, 'minutes')
                })
            })
        },

        handleCancel () {
            this.visible = false
            this.paperData = null
            this.currentParticipantType = 'all'
            this.estimatedParticipants = 0
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

        async loadStudentList () {
            try {
                const res = await getAction('/teaching/student/listAll')
                if (res.success) {
                    this.studentList = res.result || []
                }
            } catch (error) {
                console.error('加载学生列表失败:', error)
            }
        },

        handleParticipantTypeChange (e) {
            this.currentParticipantType = e.target.value
            this.estimateParticipants()
        },

        async estimateParticipants () {
            // 根据选择的参与类型估算参与人数
            try {
                let count = 0
                if (this.currentParticipantType === 'all') {
                    count = this.studentList.length
                } else if (this.currentParticipantType === 'class') {
                    const classIds = this.form.getFieldValue('classIds') || []
                    // 这里应该调用API获取班级学生数，简化处理
                    count = classIds.length * 30 // 假设每个班级30人
                } else if (this.currentParticipantType === 'custom') {
                    const studentIds = this.form.getFieldValue('studentIds') || []
                    count = studentIds.length
                }
                this.estimatedParticipants = count
            } catch (error) {
                console.error('估算参与人数失败:', error)
            }
        },

        disabledStartDate (current) {
            // 不能选择过去的日期
            return current && current < this.$moment().startOf('day')
        },

        disabledEndDate (current) {
            // 不能选择开始时间之前的日期
            const startTime = this.form.getFieldValue('startTime')
            if (startTime) {
                return current && current < startTime
            }
            return current && current < this.$moment().startOf('day')
        },

        filterOption (input, option) {
            return (
                option.componentOptions.children[0].text.toLowerCase().indexOf(input.toLowerCase()) >= 0
            )
        },

        async handleOk () {
            this.form.validateFields(async (err, values) => {
                if (!err) {
                    // 验证时间设置
                    if (values.endTime.isBefore(values.startTime)) {
                        this.$message.error('结束时间不能早于开始时间！')
                        return
                    }

                    // 验证考试时长
                    const duration = values.endTime.diff(values.startTime, 'minutes')
                    if (duration < this.paperData.duration) {
                        this.$message.error(`考试时长不足！至少需要${this.paperData.duration}分钟`)
                        return
                    }

                    this.confirmLoading = true

                    try {
                        const publishData = {
                            paperId: this.paperData.id,
                            startTime: values.startTime.format('YYYY-MM-DD HH:mm:ss'),
                            endTime: values.endTime.format('YYYY-MM-DD HH:mm:ss'),
                            participantType: values.participantType,
                            classIds: values.classIds,
                            studentIds: values.studentIds,
                            allowRetake: values.allowRetake,
                            retakeLimit: values.retakeLimit,
                            retakeInterval: values.retakeInterval,
                            shuffleQuestions: values.shuffleQuestions,
                            shuffleOptions: values.shuffleOptions,
                            antiCheat: values.antiCheat,
                            autoSubmit: values.autoSubmit,
                            showScore: values.showScore,
                            requireCamera: values.requireCamera,
                            requireMicrophone: values.requireMicrophone,
                            forbidSwitchTab: values.forbidSwitchTab,
                            forbidCopy: values.forbidCopy,
                            sendNotification: values.sendNotification,
                            emailNotification: values.emailNotification,
                            smsNotification: values.smsNotification,
                            publishNote: values.publishNote
                        }

                        const res = await putAction('/teaching/examPaper/publish', publishData)

                        if (res.success) {
                            this.$message.success('试卷发布成功！')
                            this.$emit('ok')
                            this.handleCancel()
                        } else {
                            this.$message.error(res.message || '发布失败')
                        }
                    } catch (error) {
                        this.$message.error('发布过程中发生错误')
                        console.error(error)
                    } finally {
                        this.confirmLoading = false
                    }
                }
            })
        }
    }
}
</script>

<style lang="less" scoped>
.publish-container {
  .paper-info {
    margin-bottom: 20px;
    padding: 12px;
    background: #f5f5f5;
    border-radius: 4px;

    h4 {
      margin-bottom: 12px;
    }
  }

  .participant-stats {
    margin-top: 16px;
  }
}
</style>
