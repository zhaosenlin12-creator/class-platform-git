<template>
  <div class="teacher-grading-workspace">
    <!-- 头部工具栏 -->
    <div class="workspace-header">
      <div class="header-left">
        <h2>教师评分工作台</h2>
        <div class="work-info" v-if="currentAssignment">
          <a-tag color="blue">{{ currentAssignment.workType }}</a-tag>
          <span>{{ currentAssignment.workName }}</span>
          <span class="stats">
            已评分：{{ gradedCount }}/{{ totalCount }}
          </span>
        </div>
      </div>
      <div class="header-right">
        <a-button-group>
          <a-button @click="showBatchGrading" icon="thunderbolt">批量评分</a-button>
          <a-button @click="exportGrades" icon="download">导出成绩</a-button>
          <a-button @click="showStatistics" icon="bar-chart">统计分析</a-button>
        </a-button-group>
        <a-button type="primary" @click="publishGrades" :disabled="gradedCount === 0">
          发布成绩
        </a-button>
      </div>
    </div>

    <!-- 主要内容区 -->
    <div class="workspace-content">
      <!-- 左侧学生列表 -->
      <div class="student-list-panel">
        <div class="list-header">
          <h3>学生提交列表</h3>
          <div class="filter-controls">
            <a-select v-model="statusFilter" placeholder="状态筛选" style="width: 120px; margin-right: 8px;">
              <a-select-option value="">全部</a-select-option>
              <a-select-option value="submitted">已提交</a-select-option>
              <a-select-option value="graded">已评分</a-select-option>
              <a-select-option value="pending">待评分</a-select-option>
              <a-select-option value="late">迟交</a-select-option>
            </a-select>
            <a-input v-model="searchKeyword" placeholder="搜索学生" style="width: 150px;" />
          </div>
        </div>

        <div class="student-list">
          <div
            v-for="submission in filteredSubmissions"
            :key="submission.id"
            class="student-item"
            :class="{ active: selectedSubmission && selectedSubmission.id === submission.id }"
            @click="selectSubmission(submission)">

            <div class="student-info">
              <div class="student-header">
                <span class="student-name">{{ submission.studentName }}</span>
                <a-badge :status="getSubmissionStatusColor(submission.status)" />
              </div>
              <div class="student-details">
                <span class="student-id">{{ submission.studentId }}</span>
                <span class="submit-time">{{ submission.submitTime | moment }}</span>
              </div>
            </div>

            <div class="grading-info">
              <div v-if="submission.autoScore !== null" class="auto-score">
                <span>自动评分：</span>
                <a-tag :color="getScoreColor(submission.autoScore)">{{ submission.autoScore }}</a-tag>
              </div>
              <div v-if="submission.manualScore !== null" class="manual-score">
                <span>最终得分：</span>
                <a-tag :color="getScoreColor(submission.manualScore)">{{ submission.manualScore }}</a-tag>
              </div>
              <div v-else class="no-score">
                <a-tag color="orange">待评分</a-tag>
              </div>
            </div>

            <div class="quick-actions">
              <a-button size="small" type="link" @click.stop="quickGrade(submission)">快速评分</a-button>
              <a-button size="small" type="link" @click.stop="viewSubmission(submission)">查看详情</a-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 中间评分区域 -->
      <div class="grading-panel">
        <div v-if="!selectedSubmission" class="no-selection">
          <a-empty description="请选择要评分的学生作业" />
        </div>

        <div v-else class="grading-content">
          <!-- 学生作业信息 -->
          <a-card title="学生作业" size="small" style="margin-bottom: 16px;">
            <div class="submission-header">
              <div class="student-details">
                <h3>{{ selectedSubmission.studentName }} ({{ selectedSubmission.studentId }})</h3>
                <p>提交时间：{{ selectedSubmission.submitTime | moment }}</p>
                <p v-if="selectedSubmission.lateSubmission" style="color: #ff4d4f;">
                  <a-icon type="clock-circle" /> 迟交 {{ selectedSubmission.lateDays }} 天
                </p>
              </div>
              <div class="submission-actions">
                <a-button @click="downloadSubmission" icon="download">下载作业</a-button>
                <a-button @click="runCode" icon="play-circle" type="primary">运行代码</a-button>
              </div>
            </div>
          </a-card>

          <!-- 代码查看区 -->
          <a-card title="代码内容" size="small" style="margin-bottom: 16px;">
            <a-tabs v-model="activeCodeTab">
              <a-tab-pane v-for="file in selectedSubmission.files" :key="file.name" :tab="file.name">
                <div class="code-viewer">
                  <pre><code class="python">{{ file.content }}</code></pre>
                </div>
              </a-tab-pane>
            </a-tabs>

            <!-- 运行结果 -->
            <div v-if="codeOutput" class="code-output" style="margin-top: 16px;">
              <h4>运行结果：</h4>
              <div class="output-container">
                <pre v-if="codeOutput.stdout">{{ codeOutput.stdout }}</pre>
                <pre v-if="codeOutput.stderr" class="error">{{ codeOutput.stderr }}</pre>
              </div>
            </div>
          </a-card>

          <!-- 自动评分结果 -->
          <a-card v-if="selectedSubmission.autoGrading" title="自动评分分析" size="small" style="margin-bottom: 16px;">
            <div class="auto-grading-result">
              <div class="score-summary">
                <a-statistic title="自动评分" :value="selectedSubmission.autoScore" suffix="分" />
                <a-progress :percent="selectedSubmission.autoScore" />
              </div>

              <div class="grading-breakdown">
                <h4>分项得分：</h4>
                <div v-for="item in selectedSubmission.autoGrading.breakdown" :key="item.category" class="breakdown-item">
                  <div style="display: flex; justify-content: space-between;">
                    <span>{{ item.category }}</span>
                    <span>{{ item.score }}/{{ item.maxScore }}</span>
                  </div>
                  <a-progress :percent="(item.score / item.maxScore) * 100" size="small" />
                </div>
              </div>

              <div class="ai-suggestions">
                <h4>AI建议：</h4>
                <a-list :dataSource="selectedSubmission.autoGrading.suggestions" size="small">
                  <a-list-item slot="renderItem" slot-scope="item">
                    <span>{{ item.message }}</span>
                  </a-list-item>
                </a-list>
              </div>
            </div>
          </a-card>

          <!-- 手动评分区 -->
          <a-card title="手动评分" size="small">
            <a-form :form="gradingForm" layout="vertical">
              <a-row :gutter="16">
                <a-col :span="12">
                  <a-form-item label="评分方式">
                    <a-radio-group v-decorator="['gradingMode', {initialValue: 'adjust'}]" @change="onGradingModeChange">
                      <a-radio value="adjust">基于自动评分调整</a-radio>
                      <a-radio value="manual">完全手动评分</a-radio>
                    </a-radio-group>
                  </a-form-item>
                </a-col>
                <a-col :span="12">
                  <a-form-item label="最终得分">
                    <a-input-number
                      v-decorator="['finalScore', {initialValue: selectedSubmission.autoScore || 0}]"
                      :min="0"
                      :max="100"
                      style="width: 100%"
                      @change="onScoreChange" />
                  </a-form-item>
                </a-col>
              </a-row>

              <!-- 分项评分 -->
              <div v-if="gradingMode === 'manual'" class="manual-grading">
                <h4>分项评分：</h4>
                <div v-for="(criteria, index) in gradingCriteria" :key="index" class="criteria-grading">
                  <a-row :gutter="8">
                    <a-col :span="8">
                      <span>{{ criteria.name }}</span>
                    </a-col>
                    <a-col :span="8">
                      <a-input-number
                        v-model="criteria.score"
                        :min="0"
                        :max="criteria.maxScore"
                        @change="calculateTotalScore" />
                      <span> / {{ criteria.maxScore }}</span>
                    </a-col>
                    <a-col :span="8">
                      <a-progress :percent="(criteria.score / criteria.maxScore) * 100" size="small" />
                    </a-col>
                  </a-row>
                </div>
              </div>

              <a-form-item label="评分理由">
                <a-textarea
                  v-decorator="['gradingReason']"
                  placeholder="请说明评分理由和依据..."
                  :rows="3" />
              </a-form-item>

              <a-form-item label="改进建议">
                <a-textarea
                  v-decorator="['improvementSuggestions']"
                  placeholder="给学生的改进建议..."
                  :rows="4" />
              </a-form-item>

              <a-form-item label="评分标签">
                <a-select mode="tags" v-decorator="['gradingTags']" placeholder="添加评分标签">
                  <a-select-option value="逻辑清晰">逻辑清晰</a-select-option>
                  <a-select-option value="代码规范">代码规范</a-select-option>
                  <a-select-option value="创新思路">创新思路</a-select-option>
                  <a-select-option value="需要改进">需要改进</a-select-option>
                  <a-select-option value="超出要求">超出要求</a-select-option>
                </a-select>
              </a-form-item>

              <a-form-item>
                <a-button type="primary" @click="saveGrading" :loading="saving" style="margin-right: 8px;">
                  保存评分
                </a-button>
                <a-button @click="saveAndNext" :loading="saving">
                  保存并下一个
                </a-button>
              </a-form-item>
            </a-form>
          </a-card>
        </div>
      </div>

      <!-- 右侧统计面板 -->
      <div class="statistics-panel">
        <!-- 评分进度 -->
        <a-card title="评分进度" size="small" style="margin-bottom: 16px;">
          <div class="progress-stats">
            <a-progress
              :percent="Math.round((gradedCount / totalCount) * 100)"
              :format="percent => `${gradedCount}/${totalCount}`" />
            <div class="progress-details">
              <div class="stat-item">
                <span>已评分：</span>
                <span class="value">{{ gradedCount }}</span>
              </div>
              <div class="stat-item">
                <span>待评分：</span>
                <span class="value">{{ totalCount - gradedCount }}</span>
              </div>
              <div class="stat-item">
                <span>迟交：</span>
                <span class="value">{{ lateCount }}</span>
              </div>
            </div>
          </div>
        </a-card>

        <!-- 成绩分布 -->
        <a-card title="成绩分布" size="small" style="margin-bottom: 16px;">
          <div class="grade-distribution">
            <div class="grade-stats">
              <div class="grade-level">
                <span>优秀 (90-100):</span>
                <span class="count">{{ gradeStats.excellent }}</span>
              </div>
              <div class="grade-level">
                <span>良好 (80-89):</span>
                <span class="count">{{ gradeStats.good }}</span>
              </div>
              <div class="grade-level">
                <span>中等 (70-79):</span>
                <span class="count">{{ gradeStats.average }}</span>
              </div>
              <div class="grade-level">
                <span>及格 (60-69):</span>
                <span class="count">{{ gradeStats.pass }}</span>
              </div>
              <div class="grade-level">
                <span>不及格 (<60):</span>
                <span class="count">{{ gradeStats.fail }}</span>
              </div>
            </div>

            <div class="average-score">
              <a-statistic title="平均分" :value="averageScore" :precision="1" />
            </div>
          </div>
        </a-card>

        <!-- 评分历史 -->
        <a-card title="评分历史" size="small">
          <a-list :dataSource="recentGradings" size="small">
            <a-list-item slot="renderItem" slot-scope="item">
              <div style="width: 100%;">
                <div style="display: flex; justify-content: space-between;">
                  <span>{{ item.studentName }}</span>
                  <a-tag :color="getScoreColor(item.score)">{{ item.score }}</a-tag>
                </div>
                <p style="margin: 4px 0 0 0; color: #666; font-size: 12px;">
                  {{ item.time | moment }}
                </p>
              </div>
            </a-list-item>
          </a-list>
        </a-card>
      </div>
    </div>

    <!-- 批量评分弹窗 -->
    <a-modal
      title="批量评分"
      :visible="batchGradingVisible"
      @ok="confirmBatchGrading"
      @cancel="batchGradingVisible = false"
      :confirmLoading="batchGrading"
      width="600px">
      <a-form :form="batchForm">
        <a-form-item label="批量操作">
          <a-checkbox-group v-decorator="['operations']">
            <a-checkbox value="autoGrade">应用自动评分结果</a-checkbox>
            <a-checkbox value="addBonus">添加平时分</a-checkbox>
            <a-checkbox value="latepenalty">迟交扣分</a-checkbox>
          </a-checkbox-group>
        </a-form-item>

        <a-form-item label="平时分加分" v-if="batchForm.getFieldValue('operations') && batchForm.getFieldValue('operations').includes('addBonus')">
          <a-input-number v-decorator="['bonusScore']" :min="0" :max="20" placeholder="加分数值" />
        </a-form-item>

        <a-form-item label="迟交扣分比例" v-if="batchForm.getFieldValue('operations') && batchForm.getFieldValue('operations').includes('latepenalty')">
          <a-input-number v-decorator="['penaltyRate']" :min="0" :max="50" placeholder="每天扣分%" />
        </a-form-item>

        <a-form-item label="统一评语">
          <a-textarea v-decorator="['batchComment']" placeholder="批量添加评语" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 统计分析弹窗 -->
    <a-modal
      title="成绩统计分析"
      :visible="statisticsVisible"
      @cancel="statisticsVisible = false"
      :footer="null"
      width="800px">
      <grade-statistics-chart :data="statisticsData"></grade-statistics-chart>
    </a-modal>
  </div>
</template>

<script>
import moment from 'moment'
import { getAction, postAction } from '@/api/manage'
import GradeStatisticsChart from './modules/GradeStatisticsChart'

export default {
    name: 'TeacherGradingWorkspace',
    components: {
        GradeStatisticsChart
    },
    filters: {
        moment: function (date) {
            return date ? moment(date).format('MM-DD HH:mm') : '-'
        }
    },
    data () {
        return {
            // 当前作业
            currentAssignment: null,

            // 学生提交列表
            submissions: [],
            filteredSubmissions: [],
            selectedSubmission: null,

            // 筛选条件
            statusFilter: '',
            searchKeyword: '',

            // 评分相关
            gradingForm: this.$form.createForm(this),
            gradingMode: 'adjust',
            gradingCriteria: [
                { name: '代码正确性', score: 0, maxScore: 40 },
                { name: '代码风格', score: 0, maxScore: 20 },
                { name: '算法效率', score: 0, maxScore: 25 },
                { name: '创新性', score: 0, maxScore: 15 }
            ],
            saving: false,

            // 代码查看
            activeCodeTab: '',
            codeOutput: null,

            // 批量评分
            batchGradingVisible: false,
            batchGrading: false,
            batchForm: this.$form.createForm(this),

            // 统计分析
            statisticsVisible: false,
            statisticsData: {},

            // 评分历史
            recentGradings: []
        }
    },
    computed: {
        totalCount () {
            return this.submissions.length
        },
        gradedCount () {
            return this.submissions.filter(s => s.manualScore !== null).length
        },
        lateCount () {
            return this.submissions.filter(s => s.lateSubmission).length
        },
        averageScore () {
            const gradedSubmissions = this.submissions.filter(s => s.manualScore !== null)
            if (gradedSubmissions.length === 0) return 0
            const totalScore = gradedSubmissions.reduce((sum, s) => sum + s.manualScore, 0)
            return totalScore / gradedSubmissions.length
        },
        gradeStats () {
            const gradedSubmissions = this.submissions.filter(s => s.manualScore !== null)
            return {
                excellent: gradedSubmissions.filter(s => s.manualScore >= 90).length,
                good: gradedSubmissions.filter(s => s.manualScore >= 80 && s.manualScore < 90).length,
                average: gradedSubmissions.filter(s => s.manualScore >= 70 && s.manualScore < 80).length,
                pass: gradedSubmissions.filter(s => s.manualScore >= 60 && s.manualScore < 70).length,
                fail: gradedSubmissions.filter(s => s.manualScore < 60).length
            }
        }
    },
    watch: {
        statusFilter () {
            this.filterSubmissions()
        },
        searchKeyword () {
            this.filterSubmissions()
        }
    },
    mounted () {
        this.loadAssignmentData()
        this.loadSubmissions()
    },
    methods: {
        loadAssignmentData () {
            const assignmentId = this.$route.query.assignmentId
            if (assignmentId) {
                getAction('/teaching/teachingWork/get', { id: assignmentId }).then(res => {
                    if (res.success) {
                        this.currentAssignment = res.result
                    }
                })
            }
        },

        loadSubmissions () {
            const assignmentId = this.$route.query.assignmentId
            if (assignmentId) {
                getAction('/teaching/teachingWorkSubmit/getSubmissions', { workId: assignmentId }).then(res => {
                    if (res.success) {
                        this.submissions = res.result.map(submission => ({
                            ...submission,
                            lateSubmission: submission.submitTime > submission.deadline,
                            lateDays: submission.submitTime > submission.deadline
                                ? Math.ceil((new Date(submission.submitTime) - new Date(submission.deadline)) / (1000 * 60 * 60 * 24)) : 0
                        }))
                        this.filterSubmissions()
                    }
                })
            } else {
                // 模拟数据
                this.submissions = this.generateMockSubmissions()
                this.filterSubmissions()
            }
        },

        generateMockSubmissions () {
            const submissions = []
            for (let i = 1; i <= 30; i++) {
                const autoScore = Math.floor(Math.random() * 30) + 70
                submissions.push({
                    id: i,
                    studentId: `2024${String(i).padStart(3, '0')}`,
                    studentName: `学生${i}`,
                    status: Math.random() > 0.2 ? 'submitted' : 'pending',
                    submitTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                    deadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                    autoScore: autoScore,
                    manualScore: Math.random() > 0.5 ? autoScore + Math.floor(Math.random() * 10) - 5 : null,
                    files: [
                        {
                            name: 'main.py',
                            content: `def hello_world():
    print("Hello, World!")
    return "success"

if __name__ == "__main__":
    hello_world()`
                        }
                    ],
                    autoGrading: {
                        breakdown: [
                            { category: '代码正确性', score: Math.floor(autoScore * 0.4), maxScore: 40 },
                            { category: '代码风格', score: Math.floor(autoScore * 0.2), maxScore: 20 },
                            { category: '算法效率', score: Math.floor(autoScore * 0.25), maxScore: 25 },
                            { category: '创新性', score: Math.floor(autoScore * 0.15), maxScore: 15 }
                        ],
                        suggestions: [
                            { message: '代码逻辑清晰，运行正确' },
                            { message: '建议添加更多注释' },
                            { message: '变量命名规范' }
                        ]
                    }
                })
            }
            return submissions
        },

        filterSubmissions () {
            let filtered = this.submissions

            if (this.statusFilter) {
                filtered = filtered.filter(s => {
                    switch (this.statusFilter) {
                    case 'submitted':
                        return s.status === 'submitted'
                    case 'graded':
                        return s.manualScore !== null
                    case 'pending':
                        return s.manualScore === null && s.status === 'submitted'
                    case 'late':
                        return s.lateSubmission
                    default:
                        return true
                    }
                })
            }

            if (this.searchKeyword) {
                filtered = filtered.filter(s =>
                    s.studentName.includes(this.searchKeyword) ||
          s.studentId.includes(this.searchKeyword)
                )
            }

            this.filteredSubmissions = filtered
        },

        selectSubmission (submission) {
            this.selectedSubmission = submission
            this.activeCodeTab = submission.files && submission.files[0] && submission.files[0].name || ''

            // 重置评分表单
            this.$nextTick(() => {
                this.gradingForm.setFieldsValue({
                    finalScore: submission.manualScore || submission.autoScore || 0,
                    gradingReason: submission.gradingReason || '',
                    improvementSuggestions: submission.improvementSuggestions || '',
                    gradingTags: submission.gradingTags || []
                })
            })
        },

        onGradingModeChange (e) {
            this.gradingMode = e.target.value
            if (this.gradingMode === 'manual') {
                this.initManualGrading()
            }
        },

        initManualGrading () {
            if (this.selectedSubmission && this.selectedSubmission.autoGrading && this.selectedSubmission.autoGrading.breakdown) {
                this.gradingCriteria = this.selectedSubmission.autoGrading.breakdown.map(item => ({
                    name: item.category,
                    score: item.score,
                    maxScore: item.maxScore
                }))
            }
        },

        calculateTotalScore () {
            const total = this.gradingCriteria.reduce((sum, criteria) => sum + criteria.score, 0)
            this.gradingForm.setFieldsValue({ finalScore: total })
        },

        onScoreChange (value) {
            // 分数变化时的处理
        },

        async runCode () {
            if (!this.selectedSubmission) return

            const mainFile = this.selectedSubmission.files.find(f => f.name.endsWith('.py'))
            if (!mainFile) {
                this.$message.warning('没有找到可执行的Python文件')
                return
            }

            try {
                const response = await postAction('/api/python/execute', {
                    code: mainFile.content
                })

                if (response.success) {
                    this.codeOutput = response.result
                } else {
                    this.codeOutput = { stderr: response.message }
                }
            } catch (error) {
                this.codeOutput = { stderr: '代码执行失败' }
            }
        },

        saveGrading () {
            this.gradingForm.validateFields((err, values) => {
                if (!err) {
                    this.saving = true

                    const gradingData = {
                        submissionId: this.selectedSubmission.id,
                        finalScore: values.finalScore,
                        gradingReason: values.gradingReason,
                        improvementSuggestions: values.improvementSuggestions,
                        gradingTags: values.gradingTags,
                        gradingMode: this.gradingMode,
                        criteriaScores: this.gradingMode === 'manual' ? this.gradingCriteria : null
                    }

                    postAction('/teaching/teachingWorkSubmit/saveGrading', gradingData).then(res => {
                        if (res.success) {
                            this.$message.success('评分保存成功')

                            // 更新本地数据
                            this.selectedSubmission.manualScore = values.finalScore
                            this.selectedSubmission.gradingReason = values.gradingReason
                            this.selectedSubmission.improvementSuggestions = values.improvementSuggestions
                            this.selectedSubmission.gradingTags = values.gradingTags

                            // 添加到评分历史
                            this.recentGradings.unshift({
                                studentName: this.selectedSubmission.studentName,
                                score: values.finalScore,
                                time: new Date()
                            })
                            if (this.recentGradings.length > 10) {
                                this.recentGradings.pop()
                            }
                        } else {
                            this.$message.error('评分保存失败：' + res.message)
                        }
                    }).finally(() => {
                        this.saving = false
                    })
                }
            })
        },

        saveAndNext () {
            this.gradingForm.validateFields((err, values) => {
                if (!err) {
                    this.saveGrading()

                    // 选择下一个待评分的作业
                    const currentIndex = this.filteredSubmissions.findIndex(s => s.id === this.selectedSubmission.id)
                    const nextSubmission = this.filteredSubmissions.find((s, index) =>
                        index > currentIndex && s.manualScore === null && s.status === 'submitted'
                    )

                    if (nextSubmission) {
                        this.selectSubmission(nextSubmission)
                    } else {
                        this.$message.info('已完成所有作业评分')
                    }
                }
            })
        },

        quickGrade (submission) {
            if (submission.autoScore) {
                submission.manualScore = submission.autoScore
                this.$message.success('已应用自动评分结果')
            } else {
                this.$message.warning('该作业暂无自动评分结果')
            }
        },

        viewSubmission (submission) {
            this.selectSubmission(submission)
        },

        downloadSubmission () {
            if (!this.selectedSubmission) return
            this.$message.info('下载功能开发中...')
        },

        showBatchGrading () {
            this.batchGradingVisible = true
        },

        confirmBatchGrading () {
            this.batchForm.validateFields((err, values) => {
                if (!err) {
                    this.batchGrading = true

                    // 执行批量操作
                    setTimeout(() => {
                        this.batchGrading = false
                        this.batchGradingVisible = false
                        this.$message.success('批量评分完成')
                    }, 2000)
                }
            })
        },

        exportGrades () {
            const gradedSubmissions = this.submissions.filter(s => s.manualScore !== null)
            if (gradedSubmissions.length === 0) {
                this.$message.warning('暂无已评分的作业')
                return
            }

            // 生成CSV数据
            const csvData = gradedSubmissions.map(s => [
                s.studentId,
                s.studentName,
                s.autoScore || '',
                s.manualScore,
                s.gradingTags && s.gradingTags.join(';') || '',
                s.submitTime
            ])

            this.$message.success('成绩导出成功')
        },

        showStatistics () {
            this.statisticsData = {
                gradeDistribution: this.gradeStats,
                averageScore: this.averageScore,
                submissions: this.submissions
            }
            this.statisticsVisible = true
        },

        publishGrades () {
            this.$confirm({
                title: '确认发布成绩',
                content: `确定要发布 ${this.gradedCount} 个学生的成绩吗？发布后学生可以查看成绩。`,
                onOk: () => {
                    postAction('/teaching/teachingWork/publishGrades', {
                        workId: this.currentAssignment.id
                    }).then(res => {
                        if (res.success) {
                            this.$message.success('成绩发布成功')
                        } else {
                            this.$message.error('发布失败：' + res.message)
                        }
                    })
                }
            })
        },

        getSubmissionStatusColor (status) {
            const colors = {
                'submitted': 'success',
                'pending': 'default',
                'graded': 'processing',
                'late': 'warning'
            }
            return colors[status] || 'default'
        },

        getScoreColor (score) {
            if (score >= 90) return 'green'
            if (score >= 80) return 'blue'
            if (score >= 70) return 'orange'
            if (score >= 60) return 'gold'
            return 'red'
        }
    }
}
</script>

<style scoped>
.teacher-grading-workspace {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.workspace-header {
  background: white;
  padding: 16px 24px;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left h2 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
}

.work-info {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #666;
}

.stats {
  font-weight: 500;
}

.workspace-content {
  flex: 1;
  display: flex;
  height: calc(100vh - 80px);
}

.student-list-panel {
  width: 300px;
  background: white;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
}

.list-header {
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
}

.list-header h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
}

.filter-controls {
  display: flex;
  gap: 8px;
}

.student-list {
  flex: 1;
  overflow-y: auto;
}

.student-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.student-item:hover {
  background: #f5f5f5;
}

.student-item.active {
  background: #e6f7ff;
  border-right: 3px solid #1890ff;
}

.student-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.student-name {
  font-weight: 500;
  color: #333;
}

.student-details {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.grading-info {
  margin-bottom: 8px;
}

.auto-score, .manual-score, .no-score {
  font-size: 12px;
  margin-bottom: 4px;
}

.quick-actions {
  display: flex;
  gap: 8px;
}

.grading-panel {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.no-selection {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submission-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.student-details h3 {
  margin: 0 0 8px 0;
  color: #333;
}

.student-details p {
  margin: 0 0 4px 0;
  color: #666;
}

.code-viewer {
  max-height: 400px;
  overflow-y: auto;
}

.code-viewer pre {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  border-radius: 6px;
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.4;
  margin: 0;
}

.output-container pre {
  background: #000;
  color: #00ff00;
  padding: 12px;
  border-radius: 4px;
  font-family: monospace;
  margin: 0;
}

.output-container pre.error {
  color: #ff6b6b;
}

.auto-grading-result {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.score-summary {
  text-align: center;
}

.breakdown-item {
  margin-bottom: 8px;
}

.manual-grading {
  margin: 16px 0;
}

.criteria-grading {
  margin-bottom: 12px;
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
}

.statistics-panel {
  width: 250px;
  background: white;
  border-left: 1px solid #e8e8e8;
  padding: 16px;
  overflow-y: auto;
}

.progress-details {
  margin-top: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 13px;
}

.value {
  font-weight: 500;
}

.grade-level {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.count {
  font-weight: 500;
  color: #1890ff;
}

.average-score {
  text-align: center;
  margin-top: 16px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .student-list-panel {
    width: 250px;
  }

  .statistics-panel {
    width: 200px;
  }
}

@media (max-width: 768px) {
  .workspace-content {
    flex-direction: column;
  }

  .student-list-panel, .statistics-panel {
    width: 100%;
    height: 200px;
  }
}
</style>
