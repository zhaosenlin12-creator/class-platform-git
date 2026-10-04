<template>
  <a-modal
    title="智能组卷"
    :width="700"
    :visible="visible"
    :confirmLoading="confirmLoading"
    @ok="handleOk"
    @cancel="handleCancel"
    cancelText="取消"
    okText="开始组卷"
  >
    <div class="smart-generate-container">
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
                @change="handleCourseChange"
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
                @change="handleScoreChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="整体难度">
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

        <!-- 题型分配 -->
        <a-form-item label="题型分配">
          <a-card size="small" title="自动分配题型和分值">
            <div class="question-types-config">
              <div v-for="(config, index) in questionTypeConfigs" :key="index" class="type-config-row">
                <a-row :gutter="8" align="middle">
                  <a-col :span="6">
                    <a-select v-model="config.questionType" placeholder="题型" @change="updateTotalScore">
                      <a-select-option value="choice">单选题</a-select-option>
                      <a-select-option value="multiple">多选题</a-select-option>
                      <a-select-option value="fill">填空题</a-select-option>
                      <a-select-option value="judge">判断题</a-select-option>
                      <a-select-option value="code">编程题</a-select-option>
                      <a-select-option value="essay">问答题</a-select-option>
                    </a-select>
                  </a-col>
                  <a-col :span="4">
                    <a-input-number
                      v-model="config.count"
                      :min="0"
                      :max="50"
                      placeholder="数量"
                      style="width: 100%"
                      @change="updateTotalScore"
                    />
                  </a-col>
                  <a-col :span="4">
                    <a-input-number
                      v-model="config.score"
                      :min="1"
                      :max="50"
                      placeholder="每题分值"
                      style="width: 100%"
                      @change="updateTotalScore"
                    />
                  </a-col>
                  <a-col :span="4">
                    <span class="subtotal">{{ (config.count || 0) * (config.score || 0) }}分</span>
                  </a-col>
                  <a-col :span="4">
                    <a-slider
                      v-model="config.difficultyWeight"
                      :min="0"
                      :max="100"
                      :tip-formatter="value => `${value}%`"
                    />
                  </a-col>
                  <a-col :span="2">
                    <a-button
                      v-if="questionTypeConfigs.length > 1"
                      type="danger"
                      size="small"
                      icon="delete"
                      @click="removeTypeConfig(index)"
                    />
                  </a-col>
                </a-row>
              </div>
              <a-button
                type="dashed"
                @click="addTypeConfig"
                style="width: 100%; margin-top: 8px"
              >
                <a-icon type="plus" /> 添加题型
              </a-button>
            </div>

            <div class="score-summary">
              <a-row>
                <a-col :span="12">
                  <a-statistic title="计算总分" :value="calculatedScore" suffix="分" />
                </a-col>
                <a-col :span="12">
                  <a-statistic title="题目总数" :value="calculatedCount" suffix="题" />
                </a-col>
              </a-row>
            </div>
          </a-card>
        </a-form-item>

        <!-- 难度分布 -->
        <a-form-item label="难度分布">
          <a-card size="small" title="各难度题目占比">
            <a-row :gutter="16">
              <a-col :span="4" v-for="level in 5" :key="level">
                <div class="difficulty-config">
                  <div class="difficulty-label">{{ level }}级</div>
                  <a-slider
                    v-model="difficultyDistribution[level-1]"
                    :min="0"
                    :max="100"
                    :step="5"
                    :tip-formatter="value => `${value}%`"
                    vertical
                    style="height: 60px"
                  />
                  <div class="difficulty-value">{{ difficultyDistribution[level-1] }}%</div>
                </div>
              </a-col>
              <a-col :span="4">
                <a-button size="small" @click="autoDistributeDifficulty">智能分配</a-button>
              </a-col>
            </a-row>
          </a-card>
        </a-form-item>

        <!-- 知识点筛选 -->
        <a-form-item label="知识点筛选">
          <a-select
            v-model="selectedKnowledgePoints"
            mode="multiple"
            placeholder="选择知识点（可选，不选则从所有知识点中随机抽取）"
            style="width: 100%"
            :options="knowledgePointOptions"
          />
        </a-form-item>

        <!-- 组卷策略 -->
        <a-form-item label="组卷策略">
          <a-radio-group v-model="generateStrategy">
            <a-radio value="random">完全随机</a-radio>
            <a-radio value="balanced">平衡难度</a-radio>
            <a-radio value="adaptive">智能推荐</a-radio>
          </a-radio-group>
          <div class="strategy-desc">
            <p v-if="generateStrategy === 'random'">从题库中完全随机选择符合条件的题目</p>
            <p v-if="generateStrategy === 'balanced'">根据难度分布要求，平衡选择各难度等级的题目</p>
            <p v-if="generateStrategy === 'adaptive'">基于历史数据和题目质量，智能推荐最优题目组合</p>
          </div>
        </a-form-item>
      </a-form>

      <!-- 可用题目统计 -->
      <div v-if="selectedCourseId" class="available-stats">
        <a-card size="small" title="题库统计">
          <a-row :gutter="16">
            <a-col :span="4" v-for="stat in availableStats" :key="stat.type">
              <a-statistic
                :title="getQuestionTypeName(stat.type)"
                :value="stat.count"
                suffix="题"
                :value-style="{ fontSize: '14px' }"
              />
            </a-col>
          </a-row>
        </a-card>
      </div>
    </div>
  </a-modal>
</template>

<script>
import { postAction, getAction } from '@/api/manage'

export default {
    name: 'SmartGenerateModal',
    data () {
        return {
            visible: false,
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
                    rules: [{ required: true, message: '请输入试卷名称!' }]
                },
                courseId: {
                    rules: [{ required: true, message: '请选择所属课程!' }]
                },
                examType: {
                    rules: [{ required: true, message: '请选择考试类型!' }]
                },
                duration: {
                    rules: [{ required: true, message: '请输入考试时长!' }]
                },
                totalScore: {
                    rules: [{ required: true, message: '请输入总分!' }]
                },
                difficulty: {
                    rules: [{ required: true, message: '请选择整体难度!' }]
                }
            },
            courseList: [],
            selectedCourseId: null,
            questionTypeConfigs: [
                {
                    questionType: 'choice',
                    count: 10,
                    score: 2,
                    difficultyWeight: 20
                },
                {
                    questionType: 'multiple',
                    count: 5,
                    score: 4,
                    difficultyWeight: 30
                },
                {
                    questionType: 'judge',
                    count: 10,
                    score: 1,
                    difficultyWeight: 10
                }
            ],
            difficultyDistribution: [20, 30, 30, 15, 5], // 1-5级难度占比
            selectedKnowledgePoints: [],
            knowledgePointOptions: [],
            generateStrategy: 'balanced',
            availableStats: [],
            calculatedScore: 0,
            calculatedCount: 0
        }
    },
    created () {
        this.loadCourseList()
        this.updateTotalScore()
    },
    methods: {
        show () {
            this.visible = true
            this.form.resetFields()
            this.updateTotalScore()
        },

        handleCancel () {
            this.visible = false
            this.selectedCourseId = null
            this.availableStats = []
            this.knowledgePointOptions = []
        },

        async loadCourseList () {
            try {
                const res = await getAction('/teaching/course/listAll')
                if (res.success) {
                    this.courseList = res.result || []
                }
            } catch (error) {
                console.error('加载课程列表失败:', error)
            }
        },

        async handleCourseChange (courseId) {
            this.selectedCourseId = courseId
            await this.loadAvailableStats(courseId)
            await this.loadKnowledgePoints(courseId)
        },

        async loadAvailableStats (courseId) {
            try {
                const res = await getAction('/teaching/examQuestion/stats', { courseId })
                if (res.success) {
                    this.availableStats = res.result || []
                }
            } catch (error) {
                console.error('加载题目统计失败:', error)
            }
        },

        async loadKnowledgePoints (courseId) {
            try {
                const res = await getAction('/teaching/examQuestion/knowledgePoints', { courseId })
                if (res.success) {
                    this.knowledgePointOptions = (res.result || []).map(point => ({
                        label: point,
                        value: point
                    }))
                }
            } catch (error) {
                console.error('加载知识点失败:', error)
            }
        },

        handleScoreChange (value) {
            // 当总分改变时，可以提供建议的题型分配
            this.updateTotalScore()
        },

        updateTotalScore () {
            this.calculatedScore = this.questionTypeConfigs.reduce((total, config) => {
                return total + (config.count || 0) * (config.score || 0)
            }, 0)

            this.calculatedCount = this.questionTypeConfigs.reduce((total, config) => {
                return total + (config.count || 0)
            }, 0)
        },

        addTypeConfig () {
            this.questionTypeConfigs.push({
                questionType: 'choice',
                count: 5,
                score: 2,
                difficultyWeight: 20
            })
            this.updateTotalScore()
        },

        removeTypeConfig (index) {
            if (this.questionTypeConfigs.length > 1) {
                this.questionTypeConfigs.splice(index, 1)
                this.updateTotalScore()
            }
        },

        autoDistributeDifficulty () {
            // 根据选择的整体难度自动分配各级难度占比
            const difficulty = this.form.getFieldValue('difficulty')

            const distributions = {
                1: [50, 30, 15, 5, 0], // 简单
                2: [30, 40, 20, 8, 2], // 较简单
                3: [15, 25, 35, 20, 5], // 中等
                4: [5, 15, 30, 35, 15], // 较难
                5: [0, 5, 20, 40, 35] // 困难
            }

            if (difficulty && distributions[difficulty]) {
                this.difficultyDistribution = [...distributions[difficulty]]
            }
        },

        async handleOk () {
            this.form.validateFields(async (err, values) => {
                if (!err) {
                    // 验证难度分布总和是否为100%
                    const totalDistribution = this.difficultyDistribution.reduce((sum, val) => sum + val, 0)
                    if (Math.abs(totalDistribution - 100) > 1) {
                        this.$message.error('难度分布总占比应为100%！')
                        return
                    }

                    // 验证是否有有效的题型配置
                    const validConfigs = this.questionTypeConfigs.filter(config =>
                        config.questionType && config.count > 0 && config.score > 0
                    )

                    if (validConfigs.length === 0) {
                        this.$message.error('请至少配置一种题型！')
                        return
                    }

                    this.confirmLoading = true

                    try {
                        const generateParams = {
                            ...values,
                            questionTypeConfigs: validConfigs,
                            difficultyDistribution: this.difficultyDistribution,
                            knowledgePoints: this.selectedKnowledgePoints,
                            generateStrategy: this.generateStrategy
                        }

                        const res = await postAction('/teaching/examPaper/smartGenerate', generateParams)

                        if (res.success) {
                            this.$message.success('智能组卷成功！')
                            this.$emit('ok')
                            this.handleCancel()
                        } else {
                            this.$message.error(res.message || '组卷失败')
                        }
                    } catch (error) {
                        this.$message.error('组卷过程中发生错误')
                        console.error(error)
                    } finally {
                        this.confirmLoading = false
                    }
                }
            })
        },

        getQuestionTypeName (type) {
            const typeMap = {
                choice: '单选题',
                multiple: '多选题',
                fill: '填空题',
                judge: '判断题',
                code: '编程题',
                essay: '问答题'
            }
            return typeMap[type] || type
        }
    }
}
</script>

<style lang="less" scoped>
.smart-generate-container {
  .question-types-config {
    .type-config-row {
      margin-bottom: 8px;
      padding: 8px;
      border: 1px solid #f0f0f0;
      border-radius: 4px;

      .subtotal {
        font-weight: bold;
        color: #1890ff;
      }
    }
  }

  .score-summary {
    margin-top: 16px;
    padding: 12px;
    background: #f5f5f5;
    border-radius: 4px;
  }

  .difficulty-config {
    text-align: center;

    .difficulty-label {
      font-size: 12px;
      margin-bottom: 8px;
    }

    .difficulty-value {
      font-size: 12px;
      margin-top: 8px;
      color: #666;
    }
  }

  .strategy-desc {
    margin-top: 8px;
    font-size: 12px;
    color: #666;

    p {
      margin: 0;
    }
  }

  .available-stats {
    margin-top: 16px;
  }
}
</style>
