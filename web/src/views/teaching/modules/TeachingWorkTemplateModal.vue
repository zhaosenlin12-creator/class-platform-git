<template>
  <j-modal
    :title="title"
    :width="1200"
    :visible="visible"
    :confirmLoading="confirmLoading"
    switchFullscreen
    @ok="handleOk"
    @cancel="handleCancel"
    cancelText="关闭">

    <a-spin :spinning="confirmLoading">
      <a-form :form="form">
        <a-row :gutter="16">
          <!-- 基础信息 -->
          <a-col :span="24">
            <a-card title="基础信息" size="small" style="margin-bottom: 16px">
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="模板名称" :labelCol="labelCol" :wrapperCol="wrapperCol">
                    <a-input v-decorator="['templateName', validatorRules.templateName]" placeholder="请输入模板名称"></a-input>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="模板类型" :labelCol="labelCol" :wrapperCol="wrapperCol">
                    <j-dict-select-tag v-decorator="['templateType', validatorRules.templateType]" dictCode="work_type" placeholder="请选择模板类型"/>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="适用年级" :labelCol="labelCol" :wrapperCol="wrapperCol">
                    <a-select v-decorator="['gradeLevel', validatorRules.gradeLevel]" placeholder="请选择适用年级">
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
                <a-col :span="12">
                  <a-form-item label="难度等级" :labelCol="labelCol" :wrapperCol="wrapperCol">
                    <a-rate v-decorator="['difficulty', {initialValue: 3}]" :count="5" />
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="预计时长(分钟)" :labelCol="labelCol" :wrapperCol="wrapperCol">
                    <a-input-number v-decorator="['estimatedTime']" :min="1" :max="300" placeholder="预计完成时长"></a-input-number>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="状态" :labelCol="labelCol" :wrapperCol="wrapperCol">
                    <a-radio-group v-decorator="['status', {initialValue: 'active'}]">
                      <a-radio value="active">启用</a-radio>
                      <a-radio value="inactive">禁用</a-radio>
                    </a-radio-group>
                  </a-form-item>
                </a-col>
                <a-col :span="24">
                  <a-form-item label="模板描述" :labelCol="{span: 3}" :wrapperCol="{span: 20}">
                    <a-textarea v-decorator="['templateDescription']" rows="3" placeholder="请输入模板描述"></a-textarea>
                  </a-form-item>
                </a-col>
              </a-row>
            </a-card>
          </a-col>

          <!-- 作业内容设计 -->
          <a-col :span="24">
            <a-card title="作业内容设计" size="small" style="margin-bottom: 16px">
              <a-tabs v-model="activeContentTab">
                <!-- 任务目标 -->
                <a-tab-pane key="objectives" tab="任务目标">
                  <a-form-item label="学习目标" :labelCol="{span: 3}" :wrapperCol="{span: 20}">
                    <a-textarea v-decorator="['learningObjectives']" rows="4" placeholder="请输入学习目标"></a-textarea>
                  </a-form-item>
                  <a-form-item label="技能要求" :labelCol="{span: 3}" :wrapperCol="{span: 20}">
                    <a-select mode="tags" v-decorator="['skillRequirements']" placeholder="请输入技能要求（支持多个标签）">
                      <a-select-option value="逻辑思维">逻辑思维</a-select-option>
                      <a-select-option value="创意设计">创意设计</a-select-option>
                      <a-select-option value="问题解决">问题解决</a-select-option>
                      <a-select-option value="编程基础">编程基础</a-select-option>
                      <a-select-option value="算法思维">算法思维</a-select-option>
                    </a-select>
                  </a-form-item>
                </a-tab-pane>

                <!-- 任务内容 -->
                <a-tab-pane key="content" tab="任务内容">
                  <a-form-item label="任务说明" :labelCol="{span: 3}" :wrapperCol="{span: 20}">
                    <j-editor v-decorator="['taskContent']" placeholder="请输入详细的任务说明"></j-editor>
                  </a-form-item>
                  <a-form-item label="操作步骤" :labelCol="{span: 3}" :wrapperCol="{span: 20}">
                    <div>
                      <a-button @click="addStep" type="dashed" style="width: 100%; margin-bottom: 8px">
                        <a-icon type="plus" /> 添加步骤
                      </a-button>
                      <div v-for="(step, index) in taskSteps" :key="index" style="margin-bottom: 8px; border: 1px solid #e8e8e8; padding: 12px; border-radius: 4px;">
                        <a-row :gutter="8">
                          <a-col :span="2">
                            <span style="font-weight: bold;">步骤{{ index + 1 }}</span>
                          </a-col>
                          <a-col :span="20">
                            <a-input v-model="step.content" placeholder="请输入步骤内容"></a-input>
                          </a-col>
                          <a-col :span="2">
                            <a-button @click="removeStep(index)" type="danger" size="small" icon="delete"></a-button>
                          </a-col>
                        </a-row>
                      </div>
                    </div>
                  </a-form-item>
                </a-tab-pane>

                <!-- 评分标准 -->
                <a-tab-pane key="grading" tab="评分标准">
                  <a-form-item label="评分方式" :labelCol="{span: 3}" :wrapperCol="{span: 20}">
                    <a-radio-group v-decorator="['gradingMethod', {initialValue: 'comprehensive'}]" @change="onGradingMethodChange">
                      <a-radio value="comprehensive">综合评分</a-radio>
                      <a-radio value="criteria">分项评分</a-radio>
                      <a-radio value="auto">自动评分</a-radio>
                    </a-radio-group>
                  </a-form-item>

                  <!-- 分项评分标准 -->
                  <div v-if="gradingMethod === 'criteria'">
                    <a-button @click="addCriteria" type="dashed" style="width: 100%; margin-bottom: 8px">
                      <a-icon type="plus" /> 添加评分项
                    </a-button>
                    <div v-for="(criteria, index) in gradingCriteria" :key="index" style="margin-bottom: 8px; border: 1px solid #e8e8e8; padding: 12px; border-radius: 4px;">
                      <a-row :gutter="8">
                        <a-col :span="8">
                          <a-input v-model="criteria.name" placeholder="评分项名称"></a-input>
                        </a-col>
                        <a-col :span="6">
                          <a-input-number v-model="criteria.weight" :min="0" :max="100" placeholder="权重%"></a-input-number>
                        </a-col>
                        <a-col :span="8">
                          <a-textarea v-model="criteria.description" rows="1" placeholder="评分说明"></a-textarea>
                        </a-col>
                        <a-col :span="2">
                          <a-button @click="removeCriteria(index)" type="danger" size="small" icon="delete"></a-button>
                        </a-col>
                      </a-row>
                    </div>
                  </div>

                  <!-- 自动评分设置 -->
                  <div v-if="gradingMethod === 'auto'">
                    <a-form-item label="自动评分规则" :labelCol="{span: 3}" :wrapperCol="{span: 20}">
                      <a-textarea v-decorator="['autoGradingRules']" rows="4" placeholder="请输入自动评分规则（JSON格式）"></a-textarea>
                    </a-form-item>
                  </div>
                </a-tab-pane>

                <!-- 资源素材 -->
                <a-tab-pane key="resources" tab="资源素材">
                  <a-form-item label="模板封面" :labelCol="{span: 3}" :wrapperCol="{span: 20}">
                    <j-upload v-decorator="['templateCover']" :number="1" :fileType="'image'" :trigger-change="true"></j-upload>
                  </a-form-item>
                  <a-form-item label="参考资料" :labelCol="{span: 3}" :wrapperCol="{span: 20}">
                    <j-upload v-decorator="['referenceFiles']" :number="5" :trigger-change="true"></j-upload>
                  </a-form-item>
                  <a-form-item label="示例文件" :labelCol="{span: 3}" :wrapperCol="{span: 20}">
                    <j-upload v-decorator="['exampleFiles']" :number="3" :trigger-change="true"></j-upload>
                  </a-form-item>
                  <a-form-item label="起始模板" :labelCol="{span: 3}" :wrapperCol="{span: 20}">
                    <j-upload v-decorator="['starterTemplate']" :number="1" :trigger-change="true"></j-upload>
                  </a-form-item>
                </a-tab-pane>
              </a-tabs>
            </a-card>
          </a-col>
        </a-row>
      </a-form>
    </a-spin>
  </j-modal>
</template>

<script>
import { httpAction } from '@/api/manage'
import pick from 'lodash.pick'
import JUpload from '@/components/jeecg/JUpload'
import JEditor from '@/components/jeecg/JEditor'

export default {
    name: 'TeachingWorkTemplateModal',
    components: {
        JUpload,
        JEditor
    },
    data () {
        return {
            form: this.$form.createForm(this),
            title: '操作',
            visible: false,
            model: {},
            labelCol: {
                xs: { span: 24 },
                sm: { span: 6 }
            },
            wrapperCol: {
                xs: { span: 24 },
                sm: { span: 16 }
            },
            confirmLoading: false,
            validatorRules: {
                templateName: { rules: [{ required: true, message: '请输入模板名称!' }] },
                templateType: { rules: [{ required: true, message: '请选择模板类型!' }] },
                gradeLevel: { rules: [{ required: true, message: '请选择适用年级!' }] }
            },
            url: {
                add: '/teaching/teachingWorkTemplate/add',
                edit: '/teaching/teachingWorkTemplate/edit'
            },
            activeContentTab: 'objectives',
            gradingMethod: 'comprehensive',
            taskSteps: [],
            gradingCriteria: []
        }
    },
    methods: {
        add () {
            this.edit({})
        },

        edit (record) {
            this.form.resetFields()
            this.model = Object.assign({}, record)
            this.visible = true
            this.title = record.id ? '编辑模板' : '新建模板'

            // 初始化数据
            this.taskSteps = record.taskSteps ? JSON.parse(record.taskSteps) : []
            this.gradingCriteria = record.gradingCriteria ? JSON.parse(record.gradingCriteria) : []
            this.gradingMethod = record.gradingMethod || 'comprehensive'

            this.$nextTick(() => {
                this.form.setFieldsValue(pick(this.model,
                    'templateName', 'templateType', 'gradeLevel', 'difficulty', 'estimatedTime',
                    'status', 'templateDescription', 'learningObjectives', 'skillRequirements',
                    'taskContent', 'gradingMethod', 'autoGradingRules', 'templateCover',
                    'referenceFiles', 'exampleFiles', 'starterTemplate'
                ))
            })
        },

        close () {
            this.$emit('close')
            this.visible = false
        },

        handleOk () {
            const that = this
            this.form.validateFields((err, values) => {
                if (!err) {
                    that.confirmLoading = true

                    // 添加自定义数据
                    values.taskSteps = JSON.stringify(this.taskSteps)
                    values.gradingCriteria = JSON.stringify(this.gradingCriteria)

                    let httpurl = ''
                    let method = ''
                    if (!this.model.id) {
                        httpurl += this.url.add
                        method = 'post'
                    } else {
                        httpurl += this.url.edit
                        method = 'put'
                        values.id = this.model.id
                    }

                    httpAction(httpurl, values, method).then((res) => {
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

        onGradingMethodChange (e) {
            this.gradingMethod = e.target.value
        },

        addStep () {
            this.taskSteps.push({ content: '' })
        },

        removeStep (index) {
            this.taskSteps.splice(index, 1)
        },

        addCriteria () {
            this.gradingCriteria.push({
                name: '',
                weight: 0,
                description: ''
            })
        },

        removeCriteria (index) {
            this.gradingCriteria.splice(index, 1)
        }
    }
}
</script>

<style scoped>
.ant-card-head {
  background: #fafafa;
}
</style>
