<template>
  <div class="homework-create-form">
    <a-steps :current="currentStep" size="small" style="margin-bottom: 24px;">
      <a-step title="基本信息" />
      <a-step title="作业内容" />
      <a-step title="评分设置" />
      <a-step title="发布设置" />
    </a-steps>

    <a-form-model
      ref="form"
      :model="form"
      :rules="rules"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 16 }"
    >
      <!-- 步骤1:基本信息 -->
      <div v-show="currentStep === 0" class="step-content">
        <a-form-model-item label="作业标题" prop="title">
          <a-input
            v-model="form.title"
            placeholder="请输入作业标题"
            :maxLength="50"
            show-count
          />
        </a-form-model-item>

        <a-form-model-item label="作业描述" prop="description">
          <a-textarea
            v-model="form.description"
            placeholder="请描述作业要求和目标"
            :rows="4"
            :maxLength="500"
            show-count
          />
        </a-form-model-item>

        <a-form-model-item label="学科类型" prop="subject">
          <a-select v-model="form.subject" placeholder="请选择学科类型">
            <a-select-option value="scratch">Scratch编程</a-select-option>
            <a-select-option value="python">Python编程</a-select-option>
            <a-select-option value="algorithm">算法思维</a-select-option>
            <a-select-option value="project">项目实践</a-select-option>
          </a-select>
        </a-form-model-item>

        <a-form-model-item label="难度等级" prop="difficulty">
          <a-radio-group v-model="form.difficulty">
            <a-radio value="beginner">
              <a-icon type="star" />
              初级
            </a-radio>
            <a-radio value="intermediate">
              <a-icon type="star" />
              <a-icon type="star" />
              中级
            </a-radio>
            <a-radio value="advanced">
              <a-icon type="star" />
              <a-icon type="star" />
              <a-icon type="star" />
              高级
            </a-radio>
          </a-radio-group>
        </a-form-model-item>

        <a-form-model-item label="目标班级" prop="classes">
          <a-select
            v-model="form.classes"
            mode="multiple"
            placeholder="选择目标班级"
          >
            <a-select-option value="class1">一年级1班</a-select-option>
            <a-select-option value="class2">一年级2班</a-select-option>
            <a-select-option value="class3">二年级1班</a-select-option>
            <a-select-option value="class4">二年级2班</a-select-option>
            <a-select-option value="class5">三年级1班</a-select-option>
          </a-select>
        </a-form-model-item>
      </div>

      <!-- 步骤2:作业内容 -->
      <div v-show="currentStep === 1" class="step-content">
        <a-form-model-item label="作业类型" prop="type">
          <a-radio-group v-model="form.type" @change="onTypeChange">
            <a-radio value="file">文件提交</a-radio>
            <a-radio value="online">在线完成</a-radio>
            <a-radio value="mixed">混合模式</a-radio>
          </a-radio-group>
        </a-form-model-item>

        <!-- 文件提交设置 -->
        <div v-if="form.type === 'file' || form.type === 'mixed'" class="file-submission-settings">
          <a-form-model-item label="允许文件格式" prop="allowedFormats">
            <a-checkbox-group v-model="form.allowedFormats">
              <a-checkbox value="sb3">Scratch项目 (.sb3)</a-checkbox>
              <a-checkbox value="py">Python文件 (.py)</a-checkbox>
              <a-checkbox value="zip">压缩文件 (.zip)</a-checkbox>
              <a-checkbox value="pdf">PDF文档 (.pdf)</a-checkbox>
              <a-checkbox value="doc">Word文档 (.doc, .docx)</a-checkbox>
              <a-checkbox value="image">图片文件 (.png, .jpg)</a-checkbox>
            </a-checkbox-group>
          </a-form-model-item>

          <a-form-model-item label="文件大小限制">
            <a-input-number
              v-model="form.maxFileSize"
              :min="1"
              :max="100"
              style="width: 120px;"
            />
            <span style="margin-left: 8px;">MB</span>
          </a-form-model-item>

          <a-form-model-item label="最多上传文件数">
            <a-input-number
              v-model="form.maxFiles"
              :min="1"
              :max="10"
              style="width: 120px;"
            />
            <span style="margin-left: 8px;">个</span>
          </a-form-model-item>
        </div>

        <!-- 在线完成设置 -->
        <div v-if="form.type === 'online' || form.type === 'mixed'" class="online-settings">
          <a-form-model-item label="编程环境" prop="environment">
            <a-select v-model="form.environment" placeholder="选择编程环境">
              <a-select-option value="scratch">Scratch工作区</a-select-option>
              <a-select-option value="python">Python编辑器</a-select-option>
              <a-select-option value="web">网页编辑器</a-select-option>
            </a-select>
          </a-form-model-item>

          <a-form-model-item label="初始模板" prop="template">
            <secure-upload
              v-model="templateFiles"
              :max-size="20 * 1024 * 1024"
              :allowed-extensions="['sb3', 'py', 'html', 'css', 'js']"
              :max-count="1"
              button-text="上传模板文件"
            >
              <a-button icon="upload">
                上传模板文件
              </a-button>
            </secure-upload>
            <div class="upload-tips">
              提供初始代码或项目模板,学生在此基础上完成作业
            </div>
          </a-form-model-item>
        </div>

        <a-form-model-item label="详细要求" prop="requirements">
          <a-textarea
            v-model="form.requirements"
            placeholder="详细描述作业的具体要求、评分标准等"
            :rows="6"
            :maxLength="1000"
            show-count
          />
        </a-form-model-item>

        <a-form-model-item label="参考资料">
          <secure-upload
            v-model="referenceFiles"
            :max-size="50 * 1024 * 1024"
            :allowed-extensions="['pdf', 'doc', 'docx', 'ppt', 'pptx', 'mp4', 'avi', 'sb3', 'py', 'zip']"
            :max-count="10"
            :multiple="true"
            button-text="上传参考资料"
          >
            <a-button icon="upload">
              上传参考资料
            </a-button>
          </secure-upload>
          <div class="upload-tips">
            可上传相关文档、示例代码、教学视频等参考资料
          </div>
        </a-form-model-item>
      </div>

      <!-- 步骤3:评分设置 -->
      <div v-show="currentStep === 2" class="step-content">
        <a-form-model-item label="总分" prop="totalScore">
          <a-input-number
            v-model="form.totalScore"
            :min="10"
            :max="200"
            style="width: 120px;"
          />
          <span style="margin-left: 8px;">分</span>
        </a-form-model-item>

        <a-form-model-item label="评分方式" prop="gradingMethod">
          <a-radio-group v-model="form.gradingMethod">
            <a-radio value="manual">手动评分</a-radio>
            <a-radio value="auto">自动评分</a-radio>
            <a-radio value="mixed">混合评分</a-radio>
          </a-radio-group>
        </a-form-model-item>

        <!-- 评分标准 -->
        <a-form-model-item label="评分标准">
          <div class="grading-criteria">
            <div
              v-for="(criterion, index) in form.gradingCriteria"
              :key="index"
              class="criterion-item"
            >
              <a-row :gutter="8">
                <a-col :span="10">
                  <a-input
                    v-model="criterion.name"
                    placeholder="评分项目"
                  />
                </a-col>
                <a-col :span="6">
                  <a-input-number
                    v-model="criterion.score"
                    :min="1"
                    placeholder="分值"
                    style="width: 100%;"
                  />
                </a-col>
                <a-col :span="6">
                  <a-input
                    v-model="criterion.description"
                    placeholder="说明"
                  />
                </a-col>
                <a-col :span="2">
                  <a-button
                    type="danger"
                    size="small"
                    icon="delete"
                    @click="removeCriterion(index)"
                  />
                </a-col>
              </a-row>
            </div>
            <a-button
              type="dashed"
              block
              icon="plus"
              @click="addCriterion"
            >
              添加评分项目
            </a-button>
          </div>
        </a-form-model-item>

        <a-form-model-item label="迟交扣分">
          <a-checkbox v-model="form.penaltyEnabled">
            启用迟交扣分
          </a-checkbox>
          <div v-if="form.penaltyEnabled" style="margin-top: 8px;">
            <a-input-number
              v-model="form.penaltyPerDay"
              :min="1"
              :max="50"
              style="width: 80px;"
            />
            <span style="margin: 0 8px;">分/天</span>
            <span class="penalty-description">超过截止时间每天扣分</span>
          </div>
        </a-form-model-item>

        <a-form-model-item label="提交次数">
          <a-radio-group v-model="form.submissionLimit">
            <a-radio value="unlimited">不限制</a-radio>
            <a-radio value="limited">限制次数</a-radio>
          </a-radio-group>
          <div v-if="form.submissionLimit === 'limited'" style="margin-top: 8px;">
            <a-input-number
              v-model="form.maxSubmissions"
              :min="1"
              :max="10"
              style="width: 80px;"
            />
            <span style="margin-left: 8px;">次</span>
          </div>
        </a-form-model-item>
      </div>

      <!-- 步骤4:发布设置 -->
      <div v-show="currentStep === 3" class="step-content">
        <a-form-model-item label="发布方式" prop="publishMethod">
          <a-radio-group v-model="form.publishMethod">
            <a-radio value="immediate">立即发布</a-radio>
            <a-radio value="scheduled">定时发布</a-radio>
            <a-radio value="draft">保存为草稿</a-radio>
          </a-radio-group>
        </a-form-model-item>

        <a-form-model-item
          v-if="form.publishMethod === 'scheduled'"
          label="发布时间"
          prop="publishTime"
        >
          <a-date-picker
            v-model="form.publishTime"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="选择发布时间"
          />
        </a-form-model-item>

        <a-form-model-item label="截止时间" prop="deadline">
          <a-date-picker
            v-model="form.deadline"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="选择截止时间"
          />
        </a-form-model-item>

        <a-form-model-item label="提醒设置">
          <a-checkbox-group v-model="form.reminderSettings">
            <a-checkbox value="deadline">截止前提醒</a-checkbox>
            <a-checkbox value="submission">提交后确认</a-checkbox>
            <a-checkbox value="grading">评分完成通知</a-checkbox>
          </a-checkbox-group>
        </a-form-model-item>

        <a-form-model-item label="可见性设置" prop="visibility">
          <a-radio-group v-model="form.visibility">
            <a-radio value="students">仅学生可见</a-radio>
            <a-radio value="public">公开可见</a-radio>
            <a-radio value="teachers">仅教师可见</a-radio>
          </a-radio-group>
        </a-form-model-item>

        <a-form-model-item label="允许学生查看">
          <a-checkbox-group v-model="form.studentPermissions">
            <a-checkbox value="scores">查看分数</a-checkbox>
            <a-checkbox value="comments">查看评语</a-checkbox>
            <a-checkbox value="ranking">查看排名</a-checkbox>
            <a-checkbox value="solutions">查看参考答案</a-checkbox>
          </a-checkbox-group>
        </a-form-model-item>

        <!-- 作业预览 -->
        <a-form-model-item label="作业预览">
          <div class="homework-preview">
            <h4>{{ safe(form.title) || '作业标题' }}</h4>
            <p>{{ safe(form.description) || '作业描述' }}</p>
            <div class="preview-meta">
              <a-tag>{{ getSubjectText(form.subject) }}</a-tag>
              <a-tag>{{ getDifficultyText(form.difficulty) }}</a-tag>
              <span>总分:{{ form.totalScore }}分</span>
            </div>
          </div>
        </a-form-model-item>
      </div>
    </a-form-model>

    <!-- 操作按钮 -->
    <div class="form-actions">
      <a-space>
        <a-button v-if="currentStep > 0" @click="prevStep">
          上一步
        </a-button>
        <a-button @click="$emit('cancel')">
          取消
        </a-button>
        <a-button v-if="currentStep < 3" type="primary" @click="nextStep">
          下一步
        </a-button>
        <a-button
          v-if="currentStep === 3"
          type="primary"
          @click="submitHomework"
          :loading="submitting"
        >
          {{ form.publishMethod === 'draft' ? '保存草稿' : '发布作业' }}
        </a-button>
      </a-space>
    </div>
  </div>
</template>

<script>
import SecureUpload from '@/components/SecureUpload'
import { sanitizeInput } from '@/utils/security'

export default {
    name: 'HomeworkCreateForm',
    components: {
        SecureUpload
    },
    data () {
        return {
            currentStep: 0,
            submitting: false,
            templateFiles: [],
            referenceFiles: [],

            form: {
                title: '',
                description: '',
                subject: '',
                difficulty: 'beginner',
                classes: [],
                type: 'file',
                allowedFormats: ['sb3', 'py'],
                maxFileSize: 10,
                maxFiles: 3,
                environment: '',
                requirements: '',
                totalScore: 100,
                gradingMethod: 'manual',
                gradingCriteria: [
                    { name: '完成度', score: 40, description: '是否完成基本要求' },
                    { name: '代码质量', score: 30, description: '代码规范性和可读性' },
                    { name: '创意性', score: 20, description: '是否有创新和亮点' },
                    { name: '文档说明', score: 10, description: '是否有清晰的说明文档' }
                ],
                penaltyEnabled: true,
                penaltyPerDay: 5,
                submissionLimit: 'unlimited',
                maxSubmissions: 3,
                publishMethod: 'immediate',
                publishTime: null,
                deadline: null,
                reminderSettings: ['deadline', 'submission'],
                visibility: 'students',
                studentPermissions: ['scores', 'comments']
            },

            rules: {
                title: [
                    { required: true, message: '请输入作业标题!' },
                    { min: 2, max: 50, message: '标题长度应在2-50个字符之间!' }
                ],
                description: [
                    { required: true, message: '请输入作业描述!' },
                    { min: 10, max: 500, message: '描述长度应在10-500个字符之间!' }
                ],
                subject: [
                    { required: true, message: '请选择学科类型!' }
                ],
                classes: [
                    { required: true, message: '请选择目标班级!' }
                ],
                type: [
                    { required: true, message: '请选择作业类型!' }
                ],
                deadline: [
                    { required: true, message: '请设置截止时间!' }
                ]
            }
        }
    },
    methods: {
    /**
     * 清理用户输入文本 - 防止XSS攻击
     */
        safe (text) {
            if (!text) return ''
            return sanitizeInput(text, { maxLength: 200 })
        },

        nextStep () {
            // 验证当前步骤
            if (this.currentStep === 0) {
                this.$refs.form.validateField(['title', 'description', 'subject', 'classes'], (valid) => {
                    if (valid) {
                        this.currentStep++
                    }
                })
            } else if (this.currentStep === 1) {
                this.$refs.form.validateField(['type'], (valid) => {
                    if (valid) {
                        this.currentStep++
                    }
                })
            } else if (this.currentStep === 2) {
                this.currentStep++
            }
        },

        prevStep () {
            this.currentStep--
        },

        onTypeChange () {
            // 根据作业类型重置相关字段
            if (this.form.type === 'online') {
                this.form.allowedFormats = []
            } else if (this.form.type === 'file') {
                this.form.environment = ''
            }
        },

        addCriterion () {
            this.form.gradingCriteria.push({
                name: '',
                score: 10,
                description: ''
            })
        },

        removeCriterion (index) {
            this.form.gradingCriteria.splice(index, 1)
        },

        getSubjectText (subject) {
            const textMap = {
                'scratch': 'Scratch编程',
                'python': 'Python编程',
                'algorithm': '算法思维',
                'project': '项目实践'
            }
            return textMap[subject] || ''
        },

        getDifficultyText (difficulty) {
            const textMap = {
                'beginner': '初级',
                'intermediate': '中级',
                'advanced': '高级'
            }
            return textMap[difficulty] || ''
        },

        submitHomework () {
            this.$refs.form.validate(valid => {
                if (valid) {
                    this.submitting = true

                    // 清理所有用户输入
                    const cleanedForm = {
                        ...this.form,
                        title: sanitizeInput(this.form.title, { maxLength: 50 }),
                        description: sanitizeInput(this.form.description, { maxLength: 500, allowSpaces: true }),
                        requirements: sanitizeInput(this.form.requirements, { maxLength: 1000, allowSpaces: true }),
                        gradingCriteria: this.form.gradingCriteria.map(criterion => ({
                            name: sanitizeInput(criterion.name, { maxLength: 50 }),
                            score: criterion.score,
                            description: sanitizeInput(criterion.description, { maxLength: 100, allowSpaces: true })
                        }))
                    }

                    // 调用真实API
                    const { postAction } = require('@/api/manage')

                    const homeworkData = {
                        homeworkTitle: cleanedForm.title,
                        homeworkType: cleanedForm.type,
                        difficulty: cleanedForm.difficulty,
                        courseId: cleanedForm.courseId,
                        description: cleanedForm.description || null,
                        totalScore: cleanedForm.totalScore || 100,
                        publishTime: cleanedForm.publishMethod === 'immediate' ? new Date().toISOString() : cleanedForm.publishTime,
                        deadline: cleanedForm.deadline,
                        status: cleanedForm.publishMethod === 'draft' ? 'draft' : 'published'
                    }

                    postAction('/homework/create', homeworkData).then(response => {
                        if (response && response.success) {
                            const newHomework = {
                                id: response.result.id || Date.now().toString(),
                                ...cleanedForm,
                                publishTime: homeworkData.publishTime,
                                status: homeworkData.status,
                                totalStudents: cleanedForm.classes.length * 30,
                                submissionCount: 0,
                                gradedCount: 0,
                                averageScore: 0,
                                templateFiles: this.templateFiles,
                                referenceFiles: this.referenceFiles
                            }

                            this.submitting = false
                            this.$emit('create-success', newHomework)
                            this.resetForm()
                        } else {
                            throw new Error((response && response.message) || '创建失败')
                        }
                    }).catch(error => {
                        console.error('创建作业失败:', error)
                        this.$message.error((error && error.message) || '创建作业失败')
                        this.submitting = false
                    })
                }
            })
        },

        resetForm () {
            this.currentStep = 0
            this.$refs.form.resetFields()
            this.templateFiles = []
            this.referenceFiles = []
        }
    }
}
</script>

<style scoped>
.homework-create-form {
  padding: 16px 0;
}

.step-content {
  min-height: 400px;
  padding: 16px 0;
}

.file-submission-settings,
.online-settings {
  background: #fafafa;
  padding: 16px;
  border-radius: 6px;
  margin: 16px 0;
}

.upload-tips {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.grading-criteria {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 16px;
}

.criterion-item {
  margin-bottom: 12px;
}

.penalty-description {
  color: #666;
  font-size: 12px;
}

.homework-preview {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 16px;
  background: #fafafa;
}

.homework-preview h4 {
  margin: 0 0 8px 0;
  color: #333;
}

.homework-preview p {
  margin: 0 0 12px 0;
  color: #666;
  line-height: 1.5;
}

.preview-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.form-actions {
  text-align: center;
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
