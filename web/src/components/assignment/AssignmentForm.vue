<template>
  <div class="assignment-form">
    <el-form
      ref="assignmentForm"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      @submit.native.prevent
    >
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="作业标题" prop="title">
            <el-input
              v-model="formData.title"
              placeholder="请输入作业标题"
              maxlength="100"
              show-word-limit
            ></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="科目" prop="subject">
            <el-select v-model="formData.subject" placeholder="选择科目">
              <el-option label="数学" value="math"></el-option>
              <el-option label="语文" value="chinese"></el-option>
              <el-option label="英语" value="english"></el-option>
              <el-option label="物理" value="physics"></el-option>
              <el-option label="化学" value="chemistry"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="作业描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="4"
          placeholder="请输入作业要求和说明"
          maxlength="1000"
          show-word-limit
        ></el-input>
      </el-form-item>

      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item label="开始时间" prop="startTime">
            <el-date-picker
              v-model="formData.startTime"
              type="datetime"
              placeholder="选择开始时间"
              format="yyyy-MM-dd HH:mm"
              value-format="yyyy-MM-dd HH:mm:ss"
            ></el-date-picker>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="截止时间" prop="dueTime">
            <el-date-picker
              v-model="formData.dueTime"
              type="datetime"
              placeholder="选择截止时间"
              format="yyyy-MM-dd HH:mm"
              value-format="yyyy-MM-dd HH:mm:ss"
            ></el-date-picker>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="总分" prop="totalScore">
            <el-input-number
              v-model="formData.totalScore"
              :min="1"
              :max="1000"
              placeholder="总分"
            ></el-input-number>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="作业类型">
        <el-radio-group v-model="formData.type">
          <el-radio label="file">文件提交</el-radio>
          <el-radio label="online">在线答题</el-radio>
          <el-radio label="mixed">混合模式</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="提交设置">
        <el-checkbox-group v-model="formData.settings">
          <el-checkbox label="allowLateSubmission">允许迟交</el-checkbox>
          <el-checkbox label="showGradeToStudent">向学生显示成绩</el-checkbox>
          <el-checkbox label="allowResubmission">允许重新提交</el-checkbox>
          <el-checkbox label="autoGrading">自动批改</el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item label="目标班级" prop="classIds">
        <el-select
          v-model="formData.classIds"
          multiple
          placeholder="选择目标班级"
          style="width: 100%"
        >
          <el-option
            v-for="cls in classList"
            :key="cls.id"
            :label="`${cls.name} (${cls.studentCount}人)`"
            :value="cls.id"
          ></el-option>
        </el-select>
      </el-form-item>

      <!-- 在线答题题目设置 -->
      <div v-if="formData.type === 'online' || formData.type === 'mixed'">
        <el-divider>题目设置</el-divider>
        <div class="questions-section">
          <div class="questions-header">
            <h4>题目列表</h4>
            <el-button size="small" type="primary" @click="addQuestion">
              <i class="el-icon-plus"></i> 添加题目
            </el-button>
          </div>

          <div
            v-for="(question, index) in formData.questions"
            :key="index"
            class="question-item"
          >
            <el-card>
              <div slot="header" class="question-header">
                <span>题目 {{ index + 1 }}</span>
                <el-button
                  type="text"
                  size="small"
                  @click="removeQuestion(index)"
                  style="color: #f56c6c"
                >
                  删除
                </el-button>
              </div>

              <el-form-item label="题目类型">
                <el-select v-model="question.type" placeholder="选择题目类型">
                  <el-option label="单选题" value="single_choice"></el-option>
                  <el-option label="多选题" value="multiple_choice"></el-option>
                  <el-option label="判断题" value="true_false"></el-option>
                  <el-option label="填空题" value="fill_blank"></el-option>
                  <el-option label="简答题" value="essay"></el-option>
                </el-select>
              </el-form-item>

              <el-form-item label="题目内容">
                <el-input
                  v-model="question.content"
                  type="textarea"
                  :rows="3"
                  placeholder="输入题目内容"
                ></el-input>
              </el-form-item>

              <el-form-item label="分数">
                <el-input-number
                  v-model="question.score"
                  :min="1"
                  :max="100"
                  placeholder="题目分数"
                ></el-input-number>
              </el-form-item>

              <!-- 选择题选项 -->
              <div v-if="question.type === 'single_choice' || question.type === 'multiple_choice'">
                <el-form-item label="选项">
                  <div
                    v-for="(option, optionIndex) in question.options"
                    :key="optionIndex"
                    class="option-item"
                  >
                    <el-input
                      v-model="option.content"
                      placeholder="输入选项内容"
                      style="margin-right: 10px"
                    ></el-input>
                    <el-checkbox
                      v-model="option.isCorrect"
                      :disabled="question.type === 'single_choice' && getSingleChoiceCorrectCount(question) >= 1 && !option.isCorrect"
                    >
                      正确答案
                    </el-checkbox>
                    <el-button
                      type="text"
                      size="small"
                      @click="removeOption(question, optionIndex)"
                      style="color: #f56c6c; margin-left: 10px"
                    >
                      删除
                    </el-button>
                  </div>
                  <el-button size="small" @click="addOption(question)">添加选项</el-button>
                </el-form-item>
              </div>

              <!-- 判断题答案 -->
              <div v-if="question.type === 'true_false'">
                <el-form-item label="正确答案">
                  <el-radio-group v-model="question.correctAnswer">
                    <el-radio :label="true">正确</el-radio>
                    <el-radio :label="false">错误</el-radio>
                  </el-radio-group>
                </el-form-item>
              </div>

              <!-- 填空题答案 -->
              <div v-if="question.type === 'fill_blank'">
                <el-form-item label="标准答案">
                  <el-input
                    v-model="question.correctAnswer"
                    placeholder="输入标准答案，多个答案用分号分隔"
                  ></el-input>
                </el-form-item>
              </div>

              <!-- 简答题评分标准 -->
              <div v-if="question.type === 'essay'">
                <el-form-item label="评分标准">
                  <el-input
                    v-model="question.gradingCriteria"
                    type="textarea"
                    :rows="2"
                    placeholder="输入评分标准和要点"
                  ></el-input>
                </el-form-item>
              </div>
            </el-card>
          </div>
        </div>
      </div>

      <!-- 文件提交设置 -->
      <div v-if="formData.type === 'file' || formData.type === 'mixed'">
        <el-divider>文件提交设置</el-divider>
        <el-form-item label="文件要求">
          <el-input
            v-model="formData.fileRequirement"
            type="textarea"
            :rows="3"
            placeholder="请说明文件格式、命名规则等要求"
          ></el-input>
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="文件大小限制">
              <el-input-number
                v-model="formData.maxFileSize"
                :min="1"
                :max="500"
                placeholder="MB"
              ></el-input-number>
              <span style="margin-left: 8px">MB</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="允许文件类型">
              <el-select
                v-model="formData.allowedFileTypes"
                multiple
                placeholder="选择允许的文件类型"
              >
                <el-option label="Word文档 (.docx)" value="docx"></el-option>
                <el-option label="PDF文档 (.pdf)" value="pdf"></el-option>
                <el-option label="图片 (.jpg, .png)" value="image"></el-option>
                <el-option label="压缩包 (.zip, .rar)" value="archive"></el-option>
                <el-option label="文本文件 (.txt)" value="txt"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <el-form-item label="备注">
        <el-input
          v-model="formData.remark"
          type="textarea"
          :rows="2"
          placeholder="其他说明（可选）"
        ></el-input>
      </el-form-item>
    </el-form>

    <div class="form-actions">
      <el-button @click="$emit('cancel')">取消</el-button>
      <el-button @click="saveDraft">保存草稿</el-button>
      <el-button type="primary" @click="submitForm">
        {{ assignment ? '更新作业' : '创建作业' }}
      </el-button>
    </div>
  </div>
</template>

<script>
export default {
    name: 'AssignmentForm',
    props: {
        assignment: {
            type: Object,
            default: null
        }
    },
    data () {
        return {
            formData: {
                title: '',
                subject: '',
                description: '',
                startTime: '',
                dueTime: '',
                totalScore: 100,
                type: 'file',
                settings: [],
                classIds: [],
                questions: [],
                fileRequirement: '',
                maxFileSize: 50,
                allowedFileTypes: [],
                remark: ''
            },
            classList: [],
            formRules: {
                title: [
                    { required: true, message: '请输入作业标题', trigger: 'blur' },
                    { min: 2, max: 100, message: '标题长度在 2 到 100 个字符', trigger: 'blur' }
                ],
                subject: [
                    { required: true, message: '请选择科目', trigger: 'change' }
                ],
                startTime: [
                    { required: true, message: '请选择开始时间', trigger: 'change' }
                ],
                dueTime: [
                    { required: true, message: '请选择截止时间', trigger: 'change' }
                ],
                totalScore: [
                    { required: true, message: '请输入总分', trigger: 'blur' }
                ],
                classIds: [
                    { required: true, message: '请选择目标班级', trigger: 'change' }
                ]
            }
        }
    },
    watch: {
        assignment: {
            immediate: true,
            handler (val) {
                if (val) {
                    this.formData = { ...val }
                } else {
                    this.resetForm()
                }
            }
        },
        'formData.type' (newType) {
            if (newType === 'online' || newType === 'mixed') {
                if (this.formData.questions.length === 0) {
                    this.addQuestion()
                }
            }
        }
    },
    mounted () {
        this.loadClassList()
    },
    methods: {
        async loadClassList () {
            try {
                const response = await this.$http.get('/api/classes')
                this.classList = response.data || []
            } catch (error) {
                console.error('加载班级列表失败:', error)
            }
        },

        addQuestion () {
            this.formData.questions.push({
                type: 'single_choice',
                content: '',
                score: 5,
                options: [
                    { content: '', isCorrect: false },
                    { content: '', isCorrect: false }
                ],
                correctAnswer: null,
                gradingCriteria: ''
            })
        },

        removeQuestion (index) {
            this.formData.questions.splice(index, 1)
        },

        addOption (question) {
            question.options.push({
                content: '',
                isCorrect: false
            })
        },

        removeOption (question, index) {
            if (question.options.length > 2) {
                question.options.splice(index, 1)
            } else {
                this.$message.warning('至少需要保留两个选项')
            }
        },

        getSingleChoiceCorrectCount (question) {
            return question.options.filter(option => option.isCorrect).length
        },

        resetForm () {
            this.formData = {
                title: '',
                subject: '',
                description: '',
                startTime: '',
                dueTime: '',
                totalScore: 100,
                type: 'file',
                settings: [],
                classIds: [],
                questions: [],
                fileRequirement: '',
                maxFileSize: 50,
                allowedFileTypes: [],
                remark: ''
            }
        },

        validateForm () {
            if (!this.formData.dueTime || !this.formData.startTime) {
                return false
            }

            if (new Date(this.formData.dueTime) <= new Date(this.formData.startTime)) {
                this.$message.error('截止时间必须晚于开始时间')
                return false
            }

            if (this.formData.type === 'online' || this.formData.type === 'mixed') {
                if (this.formData.questions.length === 0) {
                    this.$message.error('在线答题模式至少需要一道题目')
                    return false
                }

                for (let i = 0; i < this.formData.questions.length; i++) {
                    const question = this.formData.questions[i]
                    if (!question.content.trim()) {
                        this.$message.error(`第${i + 1}题的题目内容不能为空`)
                        return false
                    }

                    if (question.type === 'single_choice' || question.type === 'multiple_choice') {
                        const correctOptions = question.options.filter(opt => opt.isCorrect)
                        if (correctOptions.length === 0) {
                            this.$message.error(`第${i + 1}题必须设置正确答案`)
                            return false
                        }

                        if (question.type === 'single_choice' && correctOptions.length > 1) {
                            this.$message.error(`第${i + 1}题是单选题，只能有一个正确答案`)
                            return false
                        }
                    }
                }
            }

            return true
        },

        saveDraft () {
            if (!this.validateForm()) return

            const data = {
                ...this.formData,
                status: 'draft'
            }
            this.$emit('submit', data)
        },

        submitForm () {
            this.$refs.assignmentForm.validate((valid) => {
                if (valid && this.validateForm()) {
                    const data = {
                        ...this.formData,
                        status: this.assignment ? this.assignment.status : 'active'
                    }
                    this.$emit('submit', data)
                }
            })
        }
    }
}
</script>

<style scoped>
.assignment-form {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 10px;
}

.questions-section {
  border: 1px solid #e6ebf5;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 20px;
}

.questions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.questions-header h4 {
  margin: 0;
  color: #333;
}

.question-item {
  margin-bottom: 15px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.option-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.form-actions {
  text-align: right;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e6ebf5;
}

.form-actions .el-button {
  margin-left: 10px;
}
</style>
