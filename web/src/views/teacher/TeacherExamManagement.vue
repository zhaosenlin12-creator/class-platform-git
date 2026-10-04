<template>
  <div class="teacher-exam-management">
    <a-card title="考试管理" class="exam-card">
      <!-- 功能导航 -->
      <div class="exam-navigation" style="margin-bottom: 24px;">
        <a-button-group>
          <a-button
            :type="activeTab === 'questions' ? 'primary' : 'default'"
            @click="activeTab = 'questions'"
            icon="question-circle"
          >
            题库管理
          </a-button>
          <a-button
            :type="activeTab === 'papers' ? 'primary' : 'default'"
            @click="activeTab = 'papers'"
            icon="file-text"
          >
            试卷管理
          </a-button>
          <a-button
            :type="activeTab === 'records' ? 'primary' : 'default'"
            @click="activeTab = 'records'"
            icon="history"
          >
            考试记录
          </a-button>
          <a-button
            :type="activeTab === 'stats' ? 'primary' : 'default'"
            @click="activeTab = 'stats'"
            icon="bar-chart"
          >
            统计分析
          </a-button>
        </a-button-group>
      </div>

      <!-- 题库管理 -->
      <div v-if="activeTab === 'questions'" class="questions-management">
        <div class="questions-header">
          <h3>题库管理</h3>
          <a-button type="primary" icon="plus" @click="showCreateQuestion = true">
            添加题目
          </a-button>
        </div>

        <!-- 筛选条件 -->
        <div class="questions-filters" style="margin: 16px 0;">
          <a-row :gutter="16">
            <a-col :span="4">
              <a-select
                v-model="questionFilters.questionType"
                placeholder="题目类型"
                allowClear
                @change="loadQuestions"
              >
                <a-select-option v-for="type in questionTypes" :key="type.type_code" :value="type.type_code">
                  {{ type.type_name }}
                </a-select-option>
              </a-select>
            </a-col>
            <a-col :span="4">
              <a-select
                v-model="questionFilters.difficulty"
                placeholder="难度等级"
                allowClear
                @change="loadQuestions"
              >
                <a-select-option :value="1">简单</a-select-option>
                <a-select-option :value="2">中等</a-select-option>
                <a-select-option :value="3">困难</a-select-option>
                <a-select-option :value="4">很难</a-select-option>
                <a-select-option :value="5">极难</a-select-option>
              </a-select>
            </a-col>
            <a-col :span="6">
              <a-input-search
                v-model="questionFilters.keyword"
                placeholder="搜索题目标题或内容"
                @search="loadQuestions"
                allowClear
              />
            </a-col>
            <a-col :span="4">
              <a-button @click="resetFilters" icon="reload">
                重置
              </a-button>
            </a-col>
          </a-row>
        </div>

        <!-- 题目列表 -->
        <a-table
          :columns="questionColumns"
          :dataSource="questions"
          :loading="questionsLoading"
          :pagination="questionsPagination"
          @change="handleQuestionTableChange"
          rowKey="id"
          size="middle"
        >
          <template slot="difficulty" slot-scope="difficulty">
            <a-tag :color="getDifficultyColor(difficulty)">
              {{ getDifficultyText(difficulty) }}
            </a-tag>
          </template>
          <template slot="question_type" slot-scope="type">
            <a-tag>{{ getTypeText(type) }}</a-tag>
          </template>
          <template slot="use_count" slot-scope="count">
            {{ count || 0 }}
          </template>
          <template slot="correct_rate" slot-scope="rate">
            {{ rate ? rate.toFixed(1) + '%' : '0%' }}
          </template>
          <template slot="actions" slot-scope="text, record">
            <a-button-group size="small">
              <a-button @click="editQuestion(record)" icon="edit">编辑</a-button>
              <a-button @click="viewQuestion(record)" icon="eye">预览</a-button>
              <a-button @click="deleteQuestion(record)" icon="delete" type="danger">删除</a-button>
            </a-button-group>
          </template>
        </a-table>
      </div>

      <!-- 试卷管理 -->
      <div v-if="activeTab === 'papers'" class="papers-management">
        <div class="papers-header">
          <h3>试卷管理</h3>
          <a-button type="primary" icon="plus" @click="showCreatePaper = true">
            创建试卷
          </a-button>
        </div>

        <a-table
          :columns="paperColumns"
          :dataSource="papers"
          :loading="papersLoading"
          :pagination="papersPagination"
          @change="handlePaperTableChange"
          rowKey="id"
          size="middle"
        >
          <template slot="status" slot-scope="status">
            <a-tag :color="getPaperStatusColor(status)">
              {{ getPaperStatusText(status) }}
            </a-tag>
          </template>
          <template slot="actions" slot-scope="text, record">
            <a-button-group size="small">
              <a-button @click="editPaper(record)" icon="edit">编辑</a-button>
              <a-button @click="viewPaper(record)" icon="eye">预览</a-button>
              <a-button @click="managePaperQuestions(record)" icon="ordered-list">题目</a-button>
            </a-button-group>
          </template>
        </a-table>
      </div>

      <!-- 统计分析 -->
      <div v-if="activeTab === 'stats'" class="stats-management">
        <h3>统计分析</h3>

        <a-row :gutter="16" style="margin-bottom: 16px;">
          <a-col :span="8">
            <a-card title="题目统计" size="small">
              <a-statistic
                title="题目总数"
                :value="stats.totalQuestions"
                prefix="📝"
                :value-style="{ color: '#1890ff' }"
              />
            </a-card>
          </a-col>
          <a-col :span="8">
            <a-card title="试卷统计" size="small">
              <a-statistic
                title="试卷总数"
                :value="stats.totalPapers"
                prefix="📄"
                :value-style="{ color: '#52c41a' }"
              />
            </a-card>
          </a-col>
          <a-col :span="8">
            <a-card title="考试统计" size="small">
              <a-statistic
                title="考试次数"
                :value="stats.totalExams"
                prefix="✅"
                :value-style="{ color: '#722ed1' }"
              />
            </a-card>
          </a-col>
        </a-row>

        <a-card title="题目类型分布" size="small">
          <a-table
            :columns="statsColumns"
            :dataSource="questionStats"
            :loading="statsLoading"
            :pagination="false"
            rowKey="question_type"
            size="small"
          >
            <template slot="avg_use_count" slot-scope="count">
              {{ parseFloat(count).toFixed(1) }}
            </template>
            <template slot="avg_correct_rate" slot-scope="rate">
              {{ parseFloat(rate).toFixed(1) }}%
            </template>
          </a-table>
        </a-card>
      </div>

      <!-- 考试记录 -->
      <div v-if="activeTab === 'records'" class="records-management">
        <h3>考试记录</h3>
        <a-empty description="考试记录功能开发中" />
      </div>
    </a-card>

    <!-- 创建题目模态框 -->
    <a-modal
      title="添加题目"
      :visible="showCreateQuestion"
      @ok="createQuestion"
      @cancel="showCreateQuestion = false"
      :confirmLoading="createQuestionLoading"
      width="800px"
    >
      <a-form :form="questionForm" layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="题目类型">
              <a-select
                v-decorator="['questionType', { initialValue: 'choice' }]"
                @change="onQuestionTypeChange"
              >
                <a-select-option v-for="type in questionTypes" :key="type.type_code" :value="type.type_code">
                  {{ type.type_name }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="难度等级">
              <a-select v-decorator="['difficulty', { initialValue: 1 }]">
                <a-select-option :value="1">简单</a-select-option>
                <a-select-option :value="2">中等</a-select-option>
                <a-select-option :value="3">困难</a-select-option>
                <a-select-option :value="4">很难</a-select-option>
                <a-select-option :value="5">极难</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item label="题目标题">
          <a-input v-decorator="['title', { rules: [{ required: true, message: '请输入题目标题' }] }]" />
        </a-form-item>

        <a-form-item label="题目内容">
          <a-textarea
            v-decorator="['content', { rules: [{ required: true, message: '请输入题目内容' }] }]"
            :rows="3"
          />
        </a-form-item>

        <!-- 选择题选项 -->
        <div v-if="currentQuestionType === 'choice' || currentQuestionType === 'multiple'">
          <a-form-item label="选项">
            <div v-for="(option, index) in questionOptions" :key="index" style="margin-bottom: 8px;">
              <a-input
                v-model="option.text"
                :placeholder="`选项 ${option.key}`"
                :addonBefore="option.key"
              />
            </div>
          </a-form-item>
        </div>

        <a-form-item label="正确答案">
          <a-input
            v-decorator="['answer', { rules: [{ required: true, message: '请输入正确答案' }] }]"
            :placeholder="getAnswerPlaceholder()"
          />
        </a-form-item>

        <a-form-item label="答案解析">
          <a-textarea
            v-decorator="['explanation']"
            :rows="2"
            placeholder="可选：解释为什么这个答案是正确的"
          />
        </a-form-item>

        <a-form-item label="知识点">
          <a-input
            v-decorator="['knowledgePoint']"
            placeholder="例如：Python基础语法、循环结构等"
          />
        </a-form-item>

        <a-form-item label="标签">
          <a-input
            v-decorator="['tags']"
            placeholder="多个标签用逗号分隔，例如：Python,变量,基础"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 预览题目模态框 -->
    <a-modal
      title="题目预览"
      :visible="showPreviewQuestion"
      @cancel="showPreviewQuestion = false"
      :footer="null"
      width="700px"
    >
      <div v-if="previewQuestion" class="question-preview">
        <div class="question-header">
          <a-tag :color="getDifficultyColor(previewQuestion.difficulty)">
            {{ getDifficultyText(previewQuestion.difficulty) }}
          </a-tag>
          <a-tag>{{ getTypeText(previewQuestion.question_type) }}</a-tag>
        </div>

        <h4>{{ previewQuestion.title }}</h4>
        <p>{{ previewQuestion.content }}</p>

        <div v-if="previewQuestion.options" class="question-options">
          <div v-for="(text, key) in previewQuestion.options" :key="key" class="option-item">
            <strong>{{ key }}.</strong> {{ text }}
          </div>
        </div>

        <div class="question-answer">
          <strong>正确答案：</strong>{{ previewQuestion.answer }}
        </div>

        <div v-if="previewQuestion.explanation" class="question-explanation">
          <strong>解析：</strong>{{ previewQuestion.explanation }}
        </div>

        <div class="question-meta">
          <a-descriptions size="small" :column="2">
            <a-descriptions-item label="使用次数">{{ previewQuestion.use_count || 0 }}</a-descriptions-item>
            <a-descriptions-item label="正确率">{{ previewQuestion.correct_rate ? previewQuestion.correct_rate.toFixed(1) + '%' : '0%' }}</a-descriptions-item>
            <a-descriptions-item label="知识点">{{ previewQuestion.knowledge_point || '未设置' }}</a-descriptions-item>
            <a-descriptions-item label="标签">{{ previewQuestion.tags || '无' }}</a-descriptions-item>
          </a-descriptions>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script>
import axios from 'axios'

export default {
    name: 'TeacherExamManagement',

    data () {
        return {
            activeTab: 'questions',

            // 题库管理
            questions: [],
            questionsLoading: false,
            questionTypes: [],
            questionFilters: {
                questionType: undefined,
                difficulty: undefined,
                keyword: ''
            },
            questionsPagination: {
                current: 1,
                pageSize: 10,
                total: 0,
                showSizeChanger: true,
                showQuickJumper: true
            },

            // 试卷管理
            papers: [],
            papersLoading: false,
            papersPagination: {
                current: 1,
                pageSize: 10,
                total: 0
            },

            // 统计数据
            stats: {
                totalQuestions: 0,
                totalPapers: 0,
                totalExams: 0
            },
            questionStats: [],
            statsLoading: false,

            // 创建题目
            showCreateQuestion: false,
            createQuestionLoading: false,
            questionForm: this.$form.createForm(this),
            currentQuestionType: 'choice',
            questionOptions: [
                { key: 'A', text: '' },
                { key: 'B', text: '' },
                { key: 'C', text: '' },
                { key: 'D', text: '' }
            ],

            // 题目预览
            showPreviewQuestion: false,
            previewQuestion: null,

            // 试卷管理
            showCreatePaper: false,

            // 表格列定义
            questionColumns: [
                { title: '题目标题', dataIndex: 'title', width: '25%' },
                { title: '类型', dataIndex: 'question_type', scopedSlots: { customRender: 'question_type' }, width: '10%' },
                { title: '难度', dataIndex: 'difficulty', scopedSlots: { customRender: 'difficulty' }, width: '10%' },
                { title: '使用次数', dataIndex: 'use_count', scopedSlots: { customRender: 'use_count' }, width: '10%' },
                { title: '正确率', dataIndex: 'correct_rate', scopedSlots: { customRender: 'correct_rate' }, width: '10%' },
                { title: '知识点', dataIndex: 'knowledge_point', width: '15%' },
                { title: '操作', scopedSlots: { customRender: 'actions' }, width: '20%' }
            ],

            paperColumns: [
                { title: '试卷名称', dataIndex: 'paper_name', width: '25%' },
                { title: '题目数量', dataIndex: 'question_count', width: '10%' },
                { title: '总分', dataIndex: 'total_score', width: '10%' },
                { title: '考试时长', dataIndex: 'duration', render: (text) => text + '分钟', width: '10%' },
                { title: '状态', dataIndex: 'status', scopedSlots: { customRender: 'status' }, width: '10%' },
                { title: '创建时间', dataIndex: 'create_time', width: '15%' },
                { title: '操作', scopedSlots: { customRender: 'actions' }, width: '20%' }
            ],

            statsColumns: [
                { title: '题目类型', dataIndex: 'question_type' },
                { title: '难度等级', dataIndex: 'difficulty' },
                { title: '题目数量', dataIndex: 'question_count' },
                { title: '平均使用次数', dataIndex: 'avg_use_count', scopedSlots: { customRender: 'avg_use_count' } },
                { title: '平均正确率', dataIndex: 'avg_correct_rate', scopedSlots: { customRender: 'avg_correct_rate' } }
            ]
        }
    },

    mounted () {
        this.loadQuestionTypes()
        this.loadQuestions()
        this.loadStats()
    },

    methods: {
    // 数据加载
        async loadQuestionTypes () {
            try {
                const response = await axios.get('http://localhost:3005/api/exam/question-types')
                if (response.data.success) {
                    this.questionTypes = response.data.data
                }
            } catch (error) {
                console.error('加载题目类型失败:', error)
                this.$message.error('加载题目类型失败')
            }
        },

        async loadQuestions () {
            try {
                this.questionsLoading = true
                const params = {
                    page: this.questionsPagination.current,
                    size: this.questionsPagination.pageSize,
                    ...this.questionFilters
                }

                // 移除空值
                Object.keys(params).forEach(key => {
                    if (params[key] === undefined || params[key] === '') {
                        delete params[key]
                    }
                })

                const response = await axios.get('http://localhost:3005/api/exam/questions', { params })
                if (response.data.success) {
                    this.questions = response.data.data.list
                    this.questionsPagination.total = response.data.data.total
                }
            } catch (error) {
                console.error('加载题库失败:', error)
                this.$message.error('加载题库失败')
            } finally {
                this.questionsLoading = false
            }
        },

        async loadPapers () {
            try {
                this.papersLoading = true
                const params = {
                    page: this.papersPagination.current,
                    size: this.papersPagination.pageSize
                }

                const response = await axios.get('http://localhost:3005/api/exam/papers', { params })
                if (response.data.success) {
                    this.papers = response.data.data.list
                    this.papersPagination.total = response.data.data.total
                }
            } catch (error) {
                console.error('加载试卷失败:', error)
                this.$message.error('加载试卷失败')
            } finally {
                this.papersLoading = false
            }
        },

        async loadStats () {
            try {
                this.statsLoading = true

                // 加载题目统计
                const statsResponse = await axios.get('http://localhost:3005/api/exam/stats/questions')
                if (statsResponse.data.success) {
                    this.questionStats = statsResponse.data.data
                    this.stats.totalQuestions = this.questionStats.reduce((sum, stat) => sum + stat.question_count, 0)
                }

                // 加载试卷统计
                const papersResponse = await axios.get('http://localhost:3005/api/exam/papers?size=1')
                if (papersResponse.data.success) {
                    this.stats.totalPapers = papersResponse.data.data.total
                }

                // 加载考试统计
                const examResponse = await axios.get('http://localhost:3005/api/exam/stats/exams')
                if (examResponse.data.success) {
                    this.stats.totalExams = examResponse.data.data.totalExams || 0
                }
            } catch (error) {
                console.error('加载统计数据失败:', error)
                this.$message.error('加载统计数据失败')
            } finally {
                this.statsLoading = false
            }
        },

        // 表格事件处理
        handleQuestionTableChange (pagination) {
            this.questionsPagination = { ...this.questionsPagination, ...pagination }
            this.loadQuestions()
        },

        handlePaperTableChange (pagination) {
            this.papersPagination = { ...this.papersPagination, ...pagination }
            this.loadPapers()
        },

        // 筛选重置
        resetFilters () {
            this.questionFilters = {
                questionType: undefined,
                difficulty: undefined,
                keyword: ''
            }
            this.questionsPagination.current = 1
            this.loadQuestions()
        },

        // 题目操作
        async createQuestion () {
            try {
                this.createQuestionLoading = true
                const values = await this.questionForm.validateFields()

                const questionData = {
                    ...values,
                    courseId: 'course001', // 默认课程ID，实际应该从当前用户获取
                    options: (this.currentQuestionType === 'choice' || this.currentQuestionType === 'multiple')
                        ? this.getOptionsObject() : null
                }

                const response = await axios.post('http://localhost:3005/api/exam/questions', questionData)
                if (response.data.success) {
                    this.$message.success('题目创建成功')
                    this.showCreateQuestion = false
                    this.questionForm.resetFields()
                    this.resetQuestionOptions()
                    this.loadQuestions()
                }
            } catch (error) {
                console.error('创建题目失败:', error)
                this.$message.error('创建题目失败')
            } finally {
                this.createQuestionLoading = false
            }
        },

        editQuestion (question) {
            this.$message.info('编辑功能开发中')
        },

        viewQuestion (question) {
            this.previewQuestion = question
            this.showPreviewQuestion = true
        },

        async deleteQuestion (question) {
            this.$confirm({
                title: '确认删除',
                content: `确定要删除题目"${question.title}"吗？`,
                onOk: async () => {
                    try {
                        const response = await axios.delete(`http://localhost:3005/api/exam/questions/${question.id}`)
                        if (response.data.success) {
                            this.$message.success('题目删除成功')
                            this.loadQuestions()
                        }
                    } catch (error) {
                        console.error('删除题目失败:', error)
                        this.$message.error('删除题目失败')
                    }
                }
            })
        },

        // 试卷操作
        editPaper (paper) {
            this.$message.info('编辑功能开发中')
        },

        viewPaper (paper) {
            this.$message.info('预览功能开发中')
        },

        managePaperQuestions (paper) {
            this.$message.info('题目管理功能开发中')
        },

        // 题目类型变化处理
        onQuestionTypeChange (type) {
            this.currentQuestionType = type
        },

        getOptionsObject () {
            const options = {}
            this.questionOptions.forEach(option => {
                if (option.text.trim()) {
                    options[option.key] = option.text.trim()
                }
            })
            return Object.keys(options).length > 0 ? options : null
        },

        resetQuestionOptions () {
            this.questionOptions = [
                { key: 'A', text: '' },
                { key: 'B', text: '' },
                { key: 'C', text: '' },
                { key: 'D', text: '' }
            ]
        },

        getAnswerPlaceholder () {
            switch (this.currentQuestionType) {
            case 'choice':
            case 'judge':
                return '例如：A 或 true/false'
            case 'multiple':
                return '多个答案用逗号分隔，例如：A,C,D'
            case 'fill':
                return '多个答案用逗号分隔，例如：答案1,答案2'
            default:
                return '请输入正确答案'
            }
        },

        // 辅助方法
        getDifficultyColor (difficulty) {
            const colors = { 1: 'green', 2: 'blue', 3: 'orange', 4: 'red', 5: 'purple' }
            return colors[difficulty] || 'default'
        },

        getDifficultyText (difficulty) {
            const texts = { 1: '简单', 2: '中等', 3: '困难', 4: '很难', 5: '极难' }
            return texts[difficulty] || '未知'
        },

        getTypeText (type) {
            const typeMap = this.questionTypes.reduce((map, t) => {
                map[t.type_code] = t.type_name
                return map
            }, {})
            return typeMap[type] || type
        },

        getPaperStatusColor (status) {
            const colors = { 0: 'default', 1: 'green', 2: 'orange', 3: 'red' }
            return colors[status] || 'default'
        },

        getPaperStatusText (status) {
            const texts = { 0: '草稿', 1: '发布', 2: '结束', 3: '禁用' }
            return texts[status] || '未知'
        }
    },

    watch: {
        activeTab (newTab) {
            if (newTab === 'papers') {
                this.loadPapers()
            } else if (newTab === 'stats') {
                this.loadStats()
            }
        }
    }
}
</script>

<style lang="less" scoped>
.teacher-exam-management {
  padding: 24px;
  min-height: 100vh;
  background: #f0f2f5;

  .exam-card {
    .exam-navigation {
      .ant-btn-group .ant-btn {
        margin-right: 0;
      }
    }

    .questions-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      h3 {
        margin: 0;
      }
    }

    .papers-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      h3 {
        margin: 0;
      }
    }

    .question-preview {
      .question-header {
        margin-bottom: 16px;

        .ant-tag {
          margin-right: 8px;
        }
      }

      h4 {
        color: #1890ff;
        margin: 16px 0;
        font-size: 16px;
      }

      p {
        margin: 12px 0;
        line-height: 1.6;
      }

      .question-options {
        margin: 16px 0;
        background: #fafafa;
        padding: 12px;
        border-radius: 4px;

        .option-item {
          margin: 8px 0;
          padding: 4px 0;

          strong {
            color: #1890ff;
            margin-right: 8px;
          }
        }
      }

      .question-answer {
        margin: 16px 0;
        padding: 12px;
        background: #f6ffed;
        border: 1px solid #b7eb8f;
        border-radius: 4px;
        color: #52c41a;

        strong {
          color: #389e0d;
        }
      }

      .question-explanation {
        margin: 16px 0;
        padding: 12px;
        background: #fff7e6;
        border: 1px solid #ffd591;
        border-radius: 4px;
        color: #d46b08;

        strong {
          color: #d4380d;
        }
      }

      .question-meta {
        margin: 16px 0;
        padding: 12px;
        background: #fafafa;
        border-radius: 4px;
      }
    }

    .questions-filters {
      .ant-row {
        align-items: center;
      }
    }

    // 统计卡片样式
    .ant-card {
      .ant-statistic {
        .ant-statistic-content {
          font-size: 18px;
        }
      }
    }

    // 表格样式
    .ant-table {
      .ant-tag {
        margin: 0;
      }

      .ant-btn-group {
        .ant-btn {
          margin-right: 4px;

          &:last-child {
            margin-right: 0;
          }
        }
      }
    }
  }

  // 响应式设计
  @media (max-width: 768px) {
    padding: 12px;

    .questions-header,
    .papers-header {
      flex-direction: column;
      align-items: flex-start;

      h3 {
        margin-bottom: 12px;
      }
    }

    .questions-filters {
      .ant-col {
        margin-bottom: 12px;
      }
    }

    .exam-navigation {
      .ant-btn-group {
        display: flex;
        flex-wrap: wrap;

        .ant-btn {
          margin-bottom: 8px;
          flex: 1;
          min-width: 120px;
        }
      }
    }
  }

  @media (max-width: 480px) {
    .ant-table {
      font-size: 12px;
    }

    .question-preview {
      h4 {
        font-size: 14px;
      }

      .question-options,
      .question-answer,
      .question-explanation {
        padding: 8px;
        margin: 8px 0;
      }
    }
  }
}
</style>
