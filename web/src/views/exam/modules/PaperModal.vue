<template>
  <a-modal
    :title="title"
    :width="900"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
    cancelText="取消"
    okText="确定"
  >
    <a-spin :spinning="confirmLoading">
      <a-form :form="form" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-form-item label="试卷名称">
          <a-input
            v-decorator="['paperName', validatorRules.paperName]"
            placeholder="请输入试卷名称"
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="所属课程">
              <a-select
                v-decorator="['courseId', validatorRules.courseId]"
                placeholder="请选择课程"
              >
                <a-select-option v-for="course in courseList" :key="course.id" :value="course.id">
                  {{ course.courseName }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="考试类型">
              <a-select
                v-decorator="['examType', validatorRules.examType]"
                placeholder="请选择考试类型"
              >
                <a-select-option value="quiz">随堂测验</a-select-option>
                <a-select-option value="midterm">期中考试</a-select-option>
                <a-select-option value="final">期末考试</a-select-option>
                <a-select-option value="assignment">作业</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="试卷描述">
          <a-textarea
            v-decorator="['description']"
            :rows="3"
            placeholder="请输入试卷描述（可选）"
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="考试时长">
              <a-input-number
                v-decorator="['duration', validatorRules.duration]"
                :min="1"
                :max="480"
                placeholder="分钟"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="总分">
              <a-input-number
                v-decorator="['totalScore', validatorRules.totalScore]"
                :min="1"
                :max="1000"
                placeholder="分数"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="难度等级">
              <a-select
                v-decorator="['difficulty', validatorRules.difficulty]"
                placeholder="请选择难度"
              >
                <a-select-option :value="1">1级（简单）</a-select-option>
                <a-select-option :value="2">2级（较简单）</a-select-option>
                <a-select-option :value="3">3级（中等）</a-select-option>
                <a-select-option :value="4">4级（较难）</a-select-option>
                <a-select-option :value="5">5级（困难）</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="开始时间">
              <a-date-picker
                v-decorator="['startTime', validatorRules.startTime]"
                show-time
                format="YYYY-MM-DD HH:mm:ss"
                placeholder="请选择开始时间"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="结束时间">
              <a-date-picker
                v-decorator="['endTime', validatorRules.endTime]"
                show-time
                format="YYYY-MM-DD HH:mm:ss"
                placeholder="请选择结束时间"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- 题目配置 -->
        <a-form-item label="题目配置">
          <a-card size="small" title="题目分配">
            <div v-for="(config, index) in questionConfigs" :key="index" class="question-config-item">
              <a-row :gutter="8" align="middle">
                <a-col :span="4">
                  <a-select v-model="config.questionType" placeholder="题型">
                    <a-select-option value="choice">单选题</a-select-option>
                    <a-select-option value="multiple">多选题</a-select-option>
                    <a-select-option value="fill">填空题</a-select-option>
                    <a-select-option value="judge">判断题</a-select-option>
                    <a-select-option value="code">编程题</a-select-option>
                    <a-select-option value="essay">问答题</a-select-option>
                  </a-select>
                </a-col>
                <a-col :span="3">
                  <a-input-number
                    v-model="config.count"
                    :min="0"
                    :max="50"
                    placeholder="数量"
                    style="width: 100%"
                  />
                </a-col>
                <a-col :span="3">
                  <a-input-number
                    v-model="config.score"
                    :min="1"
                    :max="100"
                    placeholder="每题分值"
                    style="width: 100%"
                  />
                </a-col>
                <a-col :span="4">
                  <a-select v-model="config.difficulty" placeholder="难度" allow-clear>
                    <a-select-option :value="1">1级</a-select-option>
                    <a-select-option :value="2">2级</a-select-option>
                    <a-select-option :value="3">3级</a-select-option>
                    <a-select-option :value="4">4级</a-select-option>
                    <a-select-option :value="5">5级</a-select-option>
                  </a-select>
                </a-col>
                <a-col :span="6">
                  <a-input v-model="config.knowledgePoint" placeholder="知识点（可选）" />
                </a-col>
                <a-col :span="4">
                  <a-button
                    v-if="questionConfigs.length > 1"
                    type="danger"
                    size="small"
                    icon="delete"
                    @click="removeQuestionConfig(index)"
                  />
                  <span v-if="index === questionConfigs.length - 1">
                    <a-button
                      type="dashed"
                      size="small"
                      icon="plus"
                      @click="addQuestionConfig"
                      style="margin-left: 8px"
                    />
                  </span>
                </a-col>
              </a-row>
            </div>
          </a-card>
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
              <a-checkbox v-decorator="['showScore', { valuePropName: 'checked' }]">
                显示得分
              </a-checkbox>
            </a-col>
            <a-col :span="8">
              <a-checkbox v-decorator="['showAnswer', { valuePropName: 'checked' }]">
                显示答案
              </a-checkbox>
            </a-col>
            <a-col :span="8">
              <a-checkbox v-decorator="['autoSubmit', { valuePropName: 'checked', initialValue: true }]">
                时间到自动提交
              </a-checkbox>
            </a-col>
          </a-row>
        </a-form-item>

        <a-form-item label="状态">
          <a-radio-group v-decorator="['status', { initialValue: 'draft' }]">
            <a-radio value="draft">草稿</a-radio>
            <a-radio value="published">发布</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-spin>
  </a-modal>
</template>

<script>
import { postAction, putAction, getAction } from '@/api/manage'

export default {
    name: 'PaperModal',
    data () {
        return {
            title: '创建试卷',
            visible: false,
            model: {},
            confirmLoading: false,
            form: this.$form.createForm(this),
            labelCol: {
                xs: { span: 24 },
                sm: { span: 5 }
            },
            wrapperCol: {
                xs: { span: 24 },
                sm: { span: 16 }
            },
            validatorRules: {
                paperName: {
                    rules: [
                        { required: true, message: '请输入试卷名称!' }
                    ]
                },
                courseId: {
                    rules: [
                        { required: true, message: '请选择所属课程!' }
                    ]
                },
                examType: {
                    rules: [
                        { required: true, message: '请选择考试类型!' }
                    ]
                },
                duration: {
                    rules: [
                        { required: true, message: '请输入考试时长!' }
                    ]
                },
                totalScore: {
                    rules: [
                        { required: true, message: '请输入总分!' }
                    ]
                },
                difficulty: {
                    rules: [
                        { required: true, message: '请选择难度等级!' }
                    ]
                },
                startTime: {
                    rules: [
                        { required: true, message: '请选择开始时间!' }
                    ]
                },
                endTime: {
                    rules: [
                        { required: true, message: '请选择结束时间!' }
                    ]
                }
            },
            url: {
                add: '/teaching/examPaper/add',
                edit: '/teaching/examPaper/edit'
            },
            courseList: [],
            questionConfigs: [
                {
                    questionType: 'choice',
                    count: 10,
                    score: 2,
                    difficulty: null,
                    knowledgePoint: ''
                }
            ]
        }
    },
    created () {
        this.loadCourseList()
    },
    methods: {
        loadCourseList () {
            getAction('/teaching/course/listAll').then(res => {
                if (res.success) {
                    this.courseList = res.result || []
                }
            })
        },

        add () {
            this.edit({})
        },

        edit (record) {
            this.form.resetFields()
            this.model = Object.assign({}, record)
            this.visible = true

            // 重置题目配置
            if (record.questionConfigs) {
                try {
                    this.questionConfigs = JSON.parse(record.questionConfigs)
                } catch (e) {
                    this.questionConfigs = [{
                        questionType: 'choice',
                        count: 10,
                        score: 2,
                        difficulty: null,
                        knowledgePoint: ''
                    }]
                }
            } else {
                this.questionConfigs = [{
                    questionType: 'choice',
                    count: 10,
                    score: 2,
                    difficulty: null,
                    knowledgePoint: ''
                }]
            }

            this.$nextTick(() => {
                this.form.setFieldsValue({
                    ...record,
                    startTime: record.startTime ? this.$moment(record.startTime) : null,
                    endTime: record.endTime ? this.$moment(record.endTime) : null
                })
            })
        },

        close () {
            this.visible = false
            this.form.resetFields()
        },

        handleOk () {
            const that = this
            this.form.validateFields((err, values) => {
                if (!err) {
                    // 验证题目配置
                    const validConfigs = this.questionConfigs.filter(config =>
                        config.questionType && config.count > 0 && config.score > 0
                    )

                    if (validConfigs.length === 0) {
                        this.$message.error('请至少配置一种题型！')
                        return
                    }

                    that.confirmLoading = true
                    let httpUrl = ''
                    let method = ''

                    if (!this.model.id) {
                        httpUrl = this.url.add
                        method = 'post'
                    } else {
                        httpUrl = this.url.edit
                        method = 'put'
                        values.id = this.model.id
                    }

                    // 处理时间格式
                    if (values.startTime) {
                        values.startTime = values.startTime.format('YYYY-MM-DD HH:mm:ss')
                    }
                    if (values.endTime) {
                        values.endTime = values.endTime.format('YYYY-MM-DD HH:mm:ss')
                    }

                    // 处理题目配置
                    values.questionConfigs = JSON.stringify(validConfigs)

                    // 计算题目总数
                    values.questionCount = validConfigs.reduce((total, config) => total + config.count, 0)

                    const action = method === 'post' ? postAction : putAction
                    action(httpUrl, values).then(res => {
                        if (res.success) {
                            that.$message.success(res.message)
                            that.$emit('ok')
                            that.close()
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
            this.close()
        },

        addQuestionConfig () {
            this.questionConfigs.push({
                questionType: 'choice',
                count: 5,
                score: 2,
                difficulty: null,
                knowledgePoint: ''
            })
        },

        removeQuestionConfig (index) {
            if (this.questionConfigs.length > 1) {
                this.questionConfigs.splice(index, 1)
            }
        }
    }
}
</script>

<style lang="less" scoped>
.question-config-item {
  margin-bottom: 8px;
  padding: 8px;
  border: 1px solid #f0f0f0;
  border-radius: 4px;

  &:hover {
    border-color: #d9d9d9;
  }
}
</style>
