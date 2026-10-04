<template>
  <a-modal
    :title="title"
    :width="800"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
    cancelText="取消"
    okText="确定"
  >
    <a-spin :spinning="confirmLoading">
      <a-form :form="form" :label-col="labelCol" :wrapper-col="wrapperCol">
        <a-form-item label="题目标题">
          <a-input
            v-decorator="['title', validatorRules.title]"
            placeholder="请输入题目标题"
          />
        </a-form-item>

        <a-form-item label="题目类型">
          <a-select
            v-decorator="['questionType', validatorRules.questionType]"
            placeholder="请选择题目类型"
            @change="handleQuestionTypeChange"
          >
            <a-select-option value="choice">单选题</a-select-option>
            <a-select-option value="multiple">多选题</a-select-option>
            <a-select-option value="fill">填空题</a-select-option>
            <a-select-option value="judge">判断题</a-select-option>
            <a-select-option value="code">编程题</a-select-option>
            <a-select-option value="essay">问答题</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="题目内容">
          <a-textarea
            v-decorator="['content', validatorRules.content]"
            :rows="4"
            placeholder="请输入题目内容"
          />
        </a-form-item>

        <!-- 选择题选项 -->
        <div v-if="['choice', 'multiple'].includes(currentQuestionType)">
          <a-form-item label="选项设置">
            <div v-for="(option, index) in options" :key="index" class="option-item">
              <a-input
                v-model="option.text"
                :placeholder="`选项${String.fromCharCode(65 + index)}`"
                style="width: 80%"
              />
              <a-button
                v-if="options.length > 2"
                type="danger"
                size="small"
                icon="delete"
                @click="removeOption(index)"
                style="margin-left: 8px"
              />
            </div>
            <a-button
              v-if="options.length < 6"
              type="dashed"
              @click="addOption"
              style="margin-top: 8px"
            >
              <a-icon type="plus" /> 添加选项
            </a-button>
          </a-form-item>

          <a-form-item label="正确答案">
            <a-select
              v-decorator="['answer', validatorRules.answer]"
              :mode="currentQuestionType === 'multiple' ? 'multiple' : 'default'"
              placeholder="请选择正确答案"
            >
              <a-select-option
                v-for="(option, index) in options"
                :key="index"
                :value="String.fromCharCode(65 + index)"
              >
                {{ String.fromCharCode(65 + index) }}. {{ option.text }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </div>

        <!-- 填空题答案 -->
        <a-form-item v-if="currentQuestionType === 'fill'" label="标准答案">
          <a-textarea
            v-decorator="['answer', validatorRules.answer]"
            :rows="2"
            placeholder="请输入标准答案，多个答案用 | 分隔"
          />
        </a-form-item>

        <!-- 判断题答案 -->
        <a-form-item v-if="currentQuestionType === 'judge'" label="正确答案">
          <a-radio-group v-decorator="['answer', validatorRules.answer]">
            <a-radio value="true">正确</a-radio>
            <a-radio value="false">错误</a-radio>
          </a-radio-group>
        </a-form-item>

        <!-- 编程题答案 -->
        <a-form-item v-if="currentQuestionType === 'code'" label="参考答案">
          <a-textarea
            v-decorator="['answer', validatorRules.answer]"
            :rows="6"
            placeholder="请输入参考代码"
          />
        </a-form-item>

        <!-- 问答题答案 -->
        <a-form-item v-if="currentQuestionType === 'essay'" label="参考答案">
          <a-textarea
            v-decorator="['answer', validatorRules.answer]"
            :rows="4"
            placeholder="请输入参考答案"
          />
        </a-form-item>

        <a-form-item label="答案解析">
          <a-textarea
            v-decorator="['explanation']"
            :rows="3"
            placeholder="请输入答案解析（可选）"
          />
        </a-form-item>

        <a-row :gutter="16">
          <a-col :span="12">
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
          <a-col :span="12">
            <a-form-item label="分值">
              <a-input-number
                v-decorator="['score', validatorRules.score]"
                :min="1"
                :max="100"
                placeholder="请输入分值"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="知识点">
              <a-input
                v-decorator="['knowledgePoint']"
                placeholder="请输入知识点"
              />
            </a-form-item>
          </a-col>
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
        </a-row>

        <a-form-item label="题目标签">
          <a-select
            v-decorator="['tags']"
            mode="tags"
            placeholder="请输入标签，按回车添加"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item label="状态">
          <a-switch
            v-decorator="['status', { valuePropName: 'checked', initialValue: true }]"
            checked-children="启用"
            un-checked-children="禁用"
          />
        </a-form-item>
      </a-form>
    </a-spin>
  </a-modal>
</template>

<script>
import { postAction, putAction, getAction } from '@/api/manage'

export default {
    name: 'QuestionModal',
    data () {
        return {
            title: '添加题目',
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
                title: {
                    rules: [
                        { required: true, message: '请输入题目标题!' }
                    ]
                },
                content: {
                    rules: [
                        { required: true, message: '请输入题目内容!' }
                    ]
                },
                questionType: {
                    rules: [
                        { required: true, message: '请选择题目类型!' }
                    ]
                },
                answer: {
                    rules: [
                        { required: true, message: '请设置正确答案!' }
                    ]
                },
                difficulty: {
                    rules: [
                        { required: true, message: '请选择难度等级!' }
                    ]
                },
                score: {
                    rules: [
                        { required: true, message: '请输入分值!' }
                    ]
                },
                courseId: {
                    rules: [
                        { required: true, message: '请选择所属课程!' }
                    ]
                }
            },
            url: {
                add: '/teaching/examQuestion/add',
                edit: '/teaching/examQuestion/edit'
            },
            courseList: [],
            options: [
                { text: '' },
                { text: '' }
            ],
            currentQuestionType: 'choice'
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

            // 设置默认选项
            if (record.questionType && ['choice', 'multiple'].includes(record.questionType)) {
                try {
                    this.options = JSON.parse(record.options || '[{"text":""},{"text":""}]')
                } catch (e) {
                    this.options = [{ text: '' }, { text: '' }]
                }
            } else {
                this.options = [{ text: '' }, { text: '' }]
            }

            this.currentQuestionType = record.questionType || 'choice'

            this.$nextTick(() => {
                this.form.setFieldsValue({
                    ...record,
                    status: record.status !== 0
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

                    // 处理选择题选项
                    if (['choice', 'multiple'].includes(values.questionType)) {
                        values.options = JSON.stringify(this.options.filter(opt => opt.text.trim()))
                        // 如果是多选题，答案需要是数组
                        if (values.questionType === 'multiple' && Array.isArray(values.answer)) {
                            values.answer = values.answer.join(',')
                        }
                    }

                    // 处理状态值
                    values.status = values.status ? 1 : 0

                    // 处理标签
                    if (Array.isArray(values.tags)) {
                        values.tags = values.tags.join(',')
                    }

                    let formData = new FormData()
                    for (let key in values) {
                        if (values[key] !== null && values[key] !== undefined) {
                            formData.append(key, values[key])
                        }
                    }

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

        handleQuestionTypeChange (value) {
            this.currentQuestionType = value
            // 重置答案字段
            this.form.setFieldsValue({ answer: undefined })

            // 如果切换到选择题类型，确保有基本选项
            if (['choice', 'multiple'].includes(value) && this.options.length < 2) {
                this.options = [{ text: '' }, { text: '' }]
            }
        },

        addOption () {
            if (this.options.length < 6) {
                this.options.push({ text: '' })
            }
        },

        removeOption (index) {
            if (this.options.length > 2) {
                this.options.splice(index, 1)
                // 更新答案选项，移除已删除的选项
                const currentAnswer = this.form.getFieldValue('answer')
                if (currentAnswer) {
                    const deletedOptionLabel = String.fromCharCode(65 + index)
                    if (Array.isArray(currentAnswer)) {
                        const newAnswer = currentAnswer.filter(ans => ans !== deletedOptionLabel)
                        this.form.setFieldsValue({ answer: newAnswer })
                    } else if (currentAnswer === deletedOptionLabel) {
                        this.form.setFieldsValue({ answer: undefined })
                    }
                }
            }
        }
    }
}
</script>

<style lang="less" scoped>
.option-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
}
</style>
