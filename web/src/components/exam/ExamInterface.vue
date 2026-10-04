<template>
  <div class="exam-interface" :class="{ 'fullscreen-mode': isFullscreen }">
    <!-- 考试头部信息 -->
    <div class="exam-header">
      <div class="exam-info">
        <h2 class="exam-title">{{ examData.title }}</h2>
        <div class="exam-meta">
          <a-tag color="blue">{{ examData.subject }}</a-tag>
          <a-tag color="green">{{ examData.type }}</a-tag>
          <span class="exam-duration">考试时长: {{ examData.duration }}分钟</span>
        </div>
      </div>

      <div class="exam-status">
        <!-- 倒计时 -->
        <div class="countdown-timer">
          <a-statistic
            :value="timeRemaining"
            :formatter="formatTime"
            :value-style="{
              color: timeRemaining < 600000 ? '#ff4d4f' : '#3f8600',
              fontSize: '18px',
              fontWeight: 'bold'
            }"
          >
            <template #title>
              <a-icon type="clock-circle" />
              剩余时间
            </template>
          </a-statistic>
        </div>

        <!-- 答题进度 -->
        <div class="progress-info">
          <a-progress
            :percent="answerProgress"
            :status="answerProgress === 100 ? 'success' : 'normal'"
            size="small"
          />
          <span class="progress-text">
            已答题 {{ answeredCount }}/{{ totalQuestions }}
          </span>
        </div>
      </div>
    </div>

    <!-- 主体内容区 -->
    <div class="exam-content">
      <!-- 题目导航面板 -->
      <div class="question-nav" v-if="showNavigation">
        <div class="nav-header">
          <h4>题目导航</h4>
          <a-button
            type="text"
            size="small"
            @click="toggleNavigation"
          >
            <a-icon type="eye-invisible" />
            隐藏
          </a-button>
        </div>

        <div class="nav-content">
          <!-- 题目类型分组 -->
          <div
            v-for="(group, type) in questionGroups"
            :key="type"
            class="question-group"
          >
            <div class="group-header">
              <span class="group-title">{{ getQuestionTypeName(type) }}</span>
              <span class="group-count">({{ group.length }}题)</span>
            </div>

            <div class="question-numbers">
              <a-button
                v-for="question in group"
                :key="question.id"
                :type="getQuestionButtonType(question)"
                :class="getQuestionButtonClass(question)"
                size="small"
                @click="navigateToQuestion(question.order)"
              >
                {{ question.order }}
              </a-button>
            </div>
          </div>

          <!-- 答题状态统计 -->
          <div class="answer-stats">
            <div class="stat-item">
              <div class="stat-color answered"></div>
              <span>已答题 ({{ answeredCount }})</span>
            </div>
            <div class="stat-item">
              <div class="stat-color marked"></div>
              <span>已标记 ({{ markedCount }})</span>
            </div>
            <div class="stat-item">
              <div class="stat-color unanswered"></div>
              <span>未答题 ({{ unansweredCount }})</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 题目展示区 -->
      <div class="question-area">
        <!-- 工具栏 -->
        <div class="question-toolbar">
          <div class="toolbar-left">
            <a-button
              v-if="!showNavigation"
              type="text"
              @click="toggleNavigation"
            >
              <a-icon type="eye" />
              显示导航
            </a-button>

            <a-button
              type="text"
              @click="toggleFullscreen"
            >
              <a-icon v-if="!isFullscreen" type="fullscreen" />
              <a-icon v-else type="fullscreen-exit" />
              {{ isFullscreen ? '退出全屏' : '全屏模式' }}
            </a-button>
          </div>

          <div class="toolbar-center">
            <span class="current-question">
              第 {{ currentQuestionIndex + 1 }} 题 / 共 {{ totalQuestions }} 题
            </span>
          </div>

          <div class="toolbar-right">
            <a-button
              type="text"
              @click="toggleMark"
              :class="{ 'marked': currentQuestion.marked }"
            >
              <a-icon type="flag" />
              {{ currentQuestion.marked ? '取消标记' : '标记题目' }}
            </a-button>

            <a-button
              type="text"
              @click="showCalculator = !showCalculator"
              v-if="examData.allowCalculator"
            >
              <a-icon type="calculator" />
              计算器
            </a-button>
          </div>
        </div>

        <!-- 题目内容 -->
        <div class="question-content" ref="questionContent">
          <div v-if="currentQuestion" class="question-item">
            <!-- 题目头部 -->
            <div class="question-header">
              <div class="question-number">
                <a-tag color="blue">{{ currentQuestionIndex + 1 }}</a-tag>
              </div>
              <div class="question-type">
                <a-tag :color="getQuestionTypeColor(currentQuestion.type)">
                  {{ getQuestionTypeName(currentQuestion.type) }}
                </a-tag>
              </div>
              <div class="question-score">
                <span>{{ currentQuestion.score }}分</span>
              </div>
            </div>

            <!-- 题目内容 -->
            <div class="question-text">
              <div v-html="currentQuestion.content"></div>

              <!-- 题目图片 -->
              <div v-if="currentQuestion.images && currentQuestion.images.length" class="question-images">
                <img
                  v-for="(image, index) in currentQuestion.images"
                  :key="index"
                  :src="image.url"
                  :alt="image.alt"
                  class="question-image"
                  @click="previewImage(image)"
                />
              </div>
            </div>

            <!-- 答题区域 -->
            <div class="answer-area">
              <!-- 单选题 -->
              <div v-if="currentQuestion.type === 'single_choice'" class="single-choice">
                <a-radio-group
                  v-model="currentAnswer"
                  @change="onAnswerChange"
                  size="large"
                >
                  <div
                    v-for="(option, index) in currentQuestion.options"
                    :key="index"
                    class="option-item"
                  >
                    <a-radio :value="option.key">
                      <span class="option-key">{{ option.key }}</span>
                      <span class="option-content" v-html="option.content"></span>
                    </a-radio>
                  </div>
                </a-radio-group>
              </div>

              <!-- 多选题 -->
              <div v-else-if="currentQuestion.type === 'multiple_choice'" class="multiple-choice">
                <a-checkbox-group
                  v-model="currentAnswer"
                  @change="onAnswerChange"
                  size="large"
                >
                  <div
                    v-for="(option, index) in currentQuestion.options"
                    :key="index"
                    class="option-item"
                  >
                    <a-checkbox :value="option.key">
                      <span class="option-key">{{ option.key }}</span>
                      <span class="option-content" v-html="option.content"></span>
                    </a-checkbox>
                  </div>
                </a-checkbox-group>
              </div>

              <!-- 判断题 -->
              <div v-else-if="currentQuestion.type === 'true_false'" class="true-false">
                <a-radio-group
                  v-model="currentAnswer"
                  @change="onAnswerChange"
                  size="large"
                >
                  <div class="option-item">
                    <a-radio value="true">
                      <span class="option-content">正确</span>
                    </a-radio>
                  </div>
                  <div class="option-item">
                    <a-radio value="false">
                      <span class="option-content">错误</span>
                    </a-radio>
                  </div>
                </a-radio-group>
              </div>

              <!-- 填空题 -->
              <div v-else-if="currentQuestion.type === 'fill_blank'" class="fill-blank">
                <div
                  v-for="(blank, index) in currentQuestion.blanks"
                  :key="index"
                  class="blank-item"
                >
                  <label class="blank-label">第{{ index + 1 }}空：</label>
                  <a-input
                    v-model="currentAnswer[index]"
                    @change="onAnswerChange"
                    placeholder="请输入答案..."
                    size="large"
                    style="max-width: 300px;"
                  />
                </div>
              </div>

              <!-- 简答题/论述题 -->
              <div v-else-if="['short_answer', 'essay'].includes(currentQuestion.type)" class="text-answer">
                <a-textarea
                  v-model="currentAnswer"
                  @change="onAnswerChange"
                  placeholder="请输入您的答案..."
                  :rows="currentQuestion.type === 'essay' ? 8 : 4"
                  :maxlength="currentQuestion.maxLength || 1000"
                  show-count
                />
              </div>

              <!-- 计算题 -->
              <div v-else-if="currentQuestion.type === 'calculation'" class="calculation">
                <div class="calculation-steps">
                  <label class="step-label">解题步骤：</label>
                  <a-textarea
                    v-model="currentAnswer.steps"
                    @change="onAnswerChange"
                    placeholder="请写出详细的解题步骤..."
                    :rows="6"
                    :maxlength="2000"
                    show-count
                  />
                </div>
                <div class="calculation-result">
                  <label class="result-label">最终答案：</label>
                  <a-input
                    v-model="currentAnswer.result"
                    @change="onAnswerChange"
                    placeholder="请输入最终答案..."
                    size="large"
                    style="max-width: 200px;"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <a-empty v-else description="没有题目数据" />
        </div>

        <!-- 导航按钮 -->
        <div class="question-navigation">
          <a-button
            @click="previousQuestion"
            :disabled="currentQuestionIndex <= 0"
            size="large"
          >
            <a-icon type="left" />
            上一题
          </a-button>

          <a-button
            @click="nextQuestion"
            :disabled="currentQuestionIndex >= totalQuestions - 1"
            size="large"
            type="primary"
          >
            下一题
            <a-icon type="right" />
          </a-button>

          <a-button
            v-if="currentQuestionIndex === totalQuestions - 1"
            @click="showSubmitModal"
            size="large"
            type="danger"
            style="margin-left: 20px;"
          >
            提交答卷
          </a-button>
        </div>
      </div>
    </div>

    <!-- 计算器弹窗 -->
    <a-modal
      v-model:visible="showCalculator"
      title="计算器"
      :footer="null"
      width="300px"
    >
      <div class="calculator">
        <div class="calculator-display">
          <input
            v-model="calculatorDisplay"
            class="display-input"
            readonly
          />
        </div>
        <div class="calculator-buttons">
          <div class="button-row">
            <button @click="clearCalculator" class="calc-btn clear">C</button>
            <button @click="calculatorInput('/')" class="calc-btn operator">÷</button>
            <button @click="calculatorInput('*')" class="calc-btn operator">×</button>
            <button @click="deleteLast" class="calc-btn operator">⌫</button>
          </div>
          <div class="button-row">
            <button @click="calculatorInput('7')" class="calc-btn number">7</button>
            <button @click="calculatorInput('8')" class="calc-btn number">8</button>
            <button @click="calculatorInput('9')" class="calc-btn number">9</button>
            <button @click="calculatorInput('-')" class="calc-btn operator">-</button>
          </div>
          <div class="button-row">
            <button @click="calculatorInput('4')" class="calc-btn number">4</button>
            <button @click="calculatorInput('5')" class="calc-btn number">5</button>
            <button @click="calculatorInput('6')" class="calc-btn number">6</button>
            <button @click="calculatorInput('+')" class="calc-btn operator">+</button>
          </div>
          <div class="button-row">
            <button @click="calculatorInput('1')" class="calc-btn number">1</button>
            <button @click="calculatorInput('2')" class="calc-btn number">2</button>
            <button @click="calculatorInput('3')" class="calc-btn number">3</button>
            <button @click="calculateResult" class="calc-btn equals" rowspan="2">=</button>
          </div>
          <div class="button-row">
            <button @click="calculatorInput('0')" class="calc-btn number zero">0</button>
            <button @click="calculatorInput('.')" class="calc-btn number">.</button>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- 图片预览 -->
    <a-modal
      v-model:visible="imagePreviewVisible"
      :footer="null"
      width="80%"
      centered
    >
      <img
        :src="previewImageUrl"
        :alt="previewImageAlt"
        style="width: 100%; max-height: 70vh; object-fit: contain;"
      />
    </a-modal>

    <!-- 提交确认弹窗 -->
    <a-modal
      v-model:visible="submitModalVisible"
      title="提交答卷"
      width="600px"
      @ok="submitExam"
      :confirm-loading="submitting"
      ok-text="确认提交"
      cancel-text="继续答题"
    >
      <div class="submit-confirmation">
        <a-alert
          message="确认要提交答卷吗？"
          description="提交后将无法修改答案，请仔细检查。"
          type="warning"
          show-icon
        />

        <div class="submit-stats">
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="总题数">
              {{ totalQuestions }}
            </a-descriptions-item>
            <a-descriptions-item label="已答题数">
              {{ answeredCount }}
            </a-descriptions-item>
            <a-descriptions-item label="未答题数">
              <span :style="{ color: unansweredCount > 0 ? '#ff4d4f' : '#52c41a' }">
                {{ unansweredCount }}
              </span>
            </a-descriptions-item>
            <a-descriptions-item label="标记题数">
              {{ markedCount }}
            </a-descriptions-item>
            <a-descriptions-item label="剩余时间">
              {{ formatTime(timeRemaining) }}
            </a-descriptions-item>
            <a-descriptions-item label="答题进度">
              {{ answerProgress }}%
            </a-descriptions-item>
          </a-descriptions>
        </div>

        <div v-if="unansweredQuestions.length > 0" class="unanswered-warning">
          <h4 style="color: #ff4d4f;">未答题目：</h4>
          <a-tag
            v-for="question in unansweredQuestions"
            :key="question.id"
            color="red"
            style="margin: 4px;"
          >
            第{{ question.order }}题
          </a-tag>
        </div>
      </div>
    </a-modal>

    <!-- 防作弊检测提示 -->
    <div v-if="antiCheatWarning" class="anticheat-warning">
      <a-alert
        :message="antiCheatWarning.title"
        :description="antiCheatWarning.message"
        type="error"
        show-icon
        closable
        @close="antiCheatWarning = null"
      />
    </div>

    <!-- 网络状态提示 -->
    <div v-if="!isOnline" class="network-warning">
      <a-alert
        message="网络连接已断开"
        description="请检查网络连接，答案将在恢复连接后自动保存"
        type="warning"
        show-icon
      />
    </div>
  </div>
</template>

<script>
import AntiCheatDetector from '@/utils/antiCheatDetector'

export default {
    name: 'ExamInterface',
    props: {
        examId: {
            type: String,
            required: true
        }
    },
    data () {
        return {
            // 考试数据
            examData: {},
            questions: [],
            answers: {},

            // 当前状态
            currentQuestionIndex: 0,
            timeRemaining: 0,
            examStartTime: null,
            examEndTime: null,

            // 界面状态
            showNavigation: true,
            isFullscreen: false,
            showCalculator: false,
            submitModalVisible: false,
            submitting: false,

            // 图片预览
            imagePreviewVisible: false,
            previewImageUrl: '',
            previewImageAlt: '',

            // 计算器
            calculatorDisplay: '0',
            calculatorOperation: '',

            // 防作弊
            antiCheatDetector: null,
            antiCheatWarning: null,

            // 网络状态
            isOnline: navigator.onLine,

            // 自动保存
            autoSaveTimer: null,
            lastSaveTime: null
        }
    },
    computed: {
        currentQuestion () {
            return this.questions[this.currentQuestionIndex] || {}
        },

        currentAnswer: {
            get () {
                const questionId = this.currentQuestion.id
                return this.answers[questionId] || this.getDefaultAnswer()
            },
            set (value) {
                const questionId = this.currentQuestion.id
                this.answers[questionId] = value
            }
        },

        totalQuestions () {
            return this.questions.length
        },

        answeredCount () {
            return Object.keys(this.answers).filter(questionId => {
                const answer = this.answers[questionId]
                return this.isAnswered(answer)
            }).length
        },

        unansweredCount () {
            return this.totalQuestions - this.answeredCount
        },

        markedCount () {
            return this.questions.filter(q => q.marked).length
        },

        answerProgress () {
            return this.totalQuestions > 0 ? Math.round((this.answeredCount / this.totalQuestions) * 100) : 0
        },

        questionGroups () {
            const groups = {}
            this.questions.forEach(question => {
                if (!groups[question.type]) {
                    groups[question.type] = []
                }
                groups[question.type].push(question)
            })
            return groups
        },

        unansweredQuestions () {
            return this.questions.filter(question => {
                const answer = this.answers[question.id]
                return !this.isAnswered(answer)
            })
        }
    },
    mounted () {
        this.initExam()
        this.setupEventListeners()
        this.startAutoSave()
        this.initAntiCheat()
    },
    beforeDestroy () {
        this.cleanup()
    },
    methods: {
    // 初始化考试
        async initExam () {
            try {
                await this.loadExamData()
                await this.loadQuestions()
                this.startExamTimer()

                this.$message.success('考试加载完成')
            } catch (error) {
                console.error('考试初始化失败:', error)
                this.$message.error('考试加载失败')
            }
        },

        async loadExamData () {
            const response = await this.$api.get(`/exam/${this.examId}`)
            if (response.success) {
                this.examData = response.data
                this.timeRemaining = response.data.duration * 60 * 1000 // 转换为毫秒
                this.examStartTime = new Date()
                this.examEndTime = new Date(this.examStartTime.getTime() + this.timeRemaining)
            }
        },

        async loadQuestions () {
            const response = await this.$api.get(`/exam/${this.examId}/questions`)
            if (response.success) {
                this.questions = response.data.map((question, index) => ({
                    ...question,
                    order: index + 1,
                    marked: false
                }))
            }
        },

        // 计时器管理
        startExamTimer () {
            this.timer = setInterval(() => {
                this.timeRemaining -= 1000

                if (this.timeRemaining <= 0) {
                    this.timeUp()
                } else if (this.timeRemaining <= 600000) { // 最后10分钟
                    this.showTimeWarning()
                }
            }, 1000)
        },

        timeUp () {
            clearInterval(this.timer)
            this.$message.warning('考试时间到，系统将自动提交答卷')
            this.submitExam(true) // 自动提交
        },

        showTimeWarning () {
            if (this.timeRemaining === 600000) { // 正好10分钟时提醒一次
                this.$message.warning('考试时间还剩10分钟，请注意时间！')
            }
        },

        formatTime (milliseconds) {
            const totalSeconds = Math.floor(milliseconds / 1000)
            const hours = Math.floor(totalSeconds / 3600)
            const minutes = Math.floor((totalSeconds % 3600) / 60)
            const seconds = totalSeconds % 60

            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            }
            return `${minutes}:${seconds.toString().padStart(2, '0')}`
        },

        // 题目导航
        navigateToQuestion (order) {
            this.currentQuestionIndex = order - 1
            this.scrollToTop()
        },

        previousQuestion () {
            if (this.currentQuestionIndex > 0) {
                this.currentQuestionIndex--
                this.scrollToTop()
            }
        },

        nextQuestion () {
            if (this.currentQuestionIndex < this.totalQuestions - 1) {
                this.currentQuestionIndex++
                this.scrollToTop()
            }
        },

        scrollToTop () {
            if (this.$refs.questionContent) {
                this.$refs.questionContent.scrollTop = 0
            }
        },

        // 答案处理
        getDefaultAnswer () {
            switch (this.currentQuestion.type) {
            case 'single_choice':
            case 'true_false':
                return null
            case 'multiple_choice':
                return []
            case 'fill_blank':
                return new Array((this.currentQuestion.blanks && this.currentQuestion.blanks.length) || 1).fill('')
            case 'calculation':
                return { steps: '', result: '' }
            default:
                return ''
            }
        },

        isAnswered (answer) {
            if (!answer && answer !== false && answer !== 0) return false

            switch (this.currentQuestion.type) {
            case 'single_choice':
            case 'true_false':
                return answer !== null && answer !== undefined
            case 'multiple_choice':
                return Array.isArray(answer) && answer.length > 0
            case 'fill_blank':
                return Array.isArray(answer) && answer.some(item => item.trim())
            case 'calculation':
                return answer.result && answer.result.trim()
            case 'short_answer':
            case 'essay':
                return answer && answer.trim()
            default:
                return !!answer
            }
        },

        onAnswerChange () {
            this.saveAnswer()
        },

        async saveAnswer () {
            const questionId = this.currentQuestion.id
            const answer = this.answers[questionId]

            try {
                await this.$api.post('/exam/answer/save', {
                    examId: this.examId,
                    questionId: questionId,
                    answer: answer,
                    timestamp: new Date().toISOString()
                })

                this.lastSaveTime = Date.now()
            } catch (error) {
                console.error('保存答案失败:', error)
                // 失败时暂存到本地存储
                this.saveToLocalStorage()
            }
        },

        // 题目标记
        toggleMark () {
            this.currentQuestion.marked = !this.currentQuestion.marked
            this.saveQuestionState()
        },

        async saveQuestionState () {
            try {
                await this.$api.post('/exam/question/state', {
                    examId: this.examId,
                    questionId: this.currentQuestion.id,
                    marked: this.currentQuestion.marked
                })
            } catch (error) {
                console.error('保存题目状态失败:', error)
            }
        },

        // 界面控制
        toggleNavigation () {
            this.showNavigation = !this.showNavigation
        },

        toggleFullscreen () {
            if (!this.isFullscreen) {
                this.enterFullscreen()
            } else {
                this.exitFullscreen()
            }
        },

        enterFullscreen () {
            const element = this.$el
            if (element.requestFullscreen) {
                element.requestFullscreen()
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen()
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen()
            }
        },

        exitFullscreen () {
            if (document.exitFullscreen) {
                document.exitFullscreen()
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen()
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen()
            }
        },

        // 图片预览
        previewImage (image) {
            this.previewImageUrl = image.url
            this.previewImageAlt = image.alt
            this.imagePreviewVisible = true
        },

        // 计算器功能
        calculatorInput (value) {
            if (this.calculatorDisplay === '0' && !isNaN(value)) {
                this.calculatorDisplay = value
            } else {
                this.calculatorDisplay += value
            }
        },

        clearCalculator () {
            this.calculatorDisplay = '0'
        },

        deleteLast () {
            if (this.calculatorDisplay.length > 1) {
                this.calculatorDisplay = this.calculatorDisplay.slice(0, -1)
            } else {
                this.calculatorDisplay = '0'
            }
        },

        calculateResult () {
            try {
                const expression = this.calculatorDisplay.replace(/×/g, '*').replace(/÷/g, '/')
                const result = Function('"use strict"; return (' + expression + ')')()
                this.calculatorDisplay = result.toString()
            } catch (error) {
                this.$message.error('计算表达式错误')
                this.calculatorDisplay = '0'
            }
        },

        // 考试提交
        showSubmitModal () {
            this.submitModalVisible = true
        },

        async submitExam (isAutoSubmit = false) {
            this.submitting = true

            try {
                const submissionData = {
                    examId: this.examId,
                    answers: this.answers,
                    timeSpent: Date.now() - this.examStartTime.getTime(),
                    submitTime: new Date().toISOString(),
                    isAutoSubmit: isAutoSubmit,
                    antiCheatReport: this.antiCheatDetector ? this.antiCheatDetector.getReport() : null
                }

                const response = await this.$api.post('/exam/submit', submissionData)

                if (response.success) {
                    this.$message.success('答卷提交成功')
                    this.$router.push({
                        path: '/exam/result',
                        query: { examId: this.examId, submissionId: response.data.submissionId }
                    })
                }
            } catch (error) {
                console.error('提交答卷失败:', error)
                this.$message.error('提交失败，请重试')
            } finally {
                this.submitting = false
                this.submitModalVisible = false
            }
        },

        // 自动保存
        startAutoSave () {
            this.autoSaveTimer = setInterval(() => {
                this.autoSave()
            }, 30000) // 每30秒自动保存一次
        },

        async autoSave () {
            if (Date.now() - (this.lastSaveTime || 0) < 10000) {
                return // 如果最近10秒内已经保存过，则跳过
            }

            try {
                await this.$api.post('/exam/autosave', {
                    examId: this.examId,
                    answers: this.answers,
                    currentQuestionIndex: this.currentQuestionIndex,
                    timestamp: new Date().toISOString()
                })
            } catch (error) {
                console.error('自动保存失败:', error)
                this.saveToLocalStorage()
            }
        },

        saveToLocalStorage () {
            const data = {
                examId: this.examId,
                answers: this.answers,
                currentQuestionIndex: this.currentQuestionIndex,
                timestamp: Date.now()
            }
            localStorage.setItem(`exam_${this.examId}`, JSON.stringify(data))
        },

        loadFromLocalStorage () {
            const data = localStorage.getItem(`exam_${this.examId}`)
            if (data) {
                const parsed = JSON.parse(data)
                this.answers = { ...this.answers, ...parsed.answers }
                this.currentQuestionIndex = parsed.currentQuestionIndex || 0
            }
        },

        // 防作弊检测
        initAntiCheat () {
            this.antiCheatDetector = new AntiCheatDetector({
                onViolation: this.handleAntiCheatViolation,
                onWarning: this.handleAntiCheatWarning,
                onSuspicious: this.handleAntiCheatSuspicious
            })

            this.antiCheatDetector.start()
        },

        handleAntiCheatViolation (violation) {
            this.antiCheatWarning = {
                title: '检测到违规行为',
                message: violation.message,
                severity: violation.severity
            }

            // 记录违规行为
            this.$api.post('/exam/violation', {
                examId: this.examId,
                violation: violation,
                timestamp: new Date().toISOString()
            }).catch(error => {
                console.error('记录违规失败:', error)
            })
        },

        handleAntiCheatWarning (warning) {
            if (warning.severity === 'high') {
                this.$message.warning(warning.message)
            }
        },

        handleAntiCheatSuspicious (suspicious) {
        },

        // 事件监听
        setupEventListeners () {
            // 全屏状态变化
            document.addEventListener('fullscreenchange', this.handleFullscreenChange)
            document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange)

            // 网络状态变化
            window.addEventListener('online', this.handleOnline)
            window.addEventListener('offline', this.handleOffline)

            // 页面可见性变化
            document.addEventListener('visibilitychange', this.handleVisibilityChange)

            // 禁用右键和某些快捷键
            document.addEventListener('contextmenu', this.handleContextMenu)
            document.addEventListener('keydown', this.handleKeyDown)

            // 页面关闭前警告
            window.addEventListener('beforeunload', this.handleBeforeUnload)
        },

        handleFullscreenChange () {
            this.isFullscreen = !!document.fullscreenElement
        },

        handleOnline () {
            this.isOnline = true
            this.$message.success('网络连接已恢复')
        },

        handleOffline () {
            this.isOnline = false
            this.$message.warning('网络连接已断开')
        },

        handleVisibilityChange () {
            if (document.hidden) {
            } else {
            }
        },

        handleContextMenu (event) {
            event.preventDefault()
            return false
        },

        handleKeyDown (event) {
            // 禁用F5刷新等
            if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
                event.preventDefault()
                return false
            }
        },

        handleBeforeUnload (event) {
            const message = '确定要离开考试页面吗？未保存的答案可能丢失。'
            event.returnValue = message
            return message
        },

        // 工具函数
        getQuestionTypeName (type) {
            const typeNames = {
                single_choice: '单选题',
                multiple_choice: '多选题',
                true_false: '判断题',
                fill_blank: '填空题',
                short_answer: '简答题',
                essay: '论述题',
                calculation: '计算题'
            }
            return typeNames[type] || '未知题型'
        },

        getQuestionTypeColor (type) {
            const colors = {
                single_choice: 'blue',
                multiple_choice: 'green',
                true_false: 'orange',
                fill_blank: 'purple',
                short_answer: 'cyan',
                essay: 'magenta',
                calculation: 'red'
            }
            return colors[type] || 'default'
        },

        getQuestionButtonType (question) {
            if (question.order === this.currentQuestionIndex + 1) {
                return 'primary'
            }
            const answer = this.answers[question.id]
            if (this.isAnswered(answer)) {
                return 'default'
            }
            return 'ghost'
        },

        getQuestionButtonClass (question) {
            const classes = []
            const answer = this.answers[question.id]

            if (this.isAnswered(answer)) {
                classes.push('answered')
            } else {
                classes.push('unanswered')
            }

            if (question.marked) {
                classes.push('marked')
            }

            return classes
        },

        // 清理资源
        cleanup () {
            if (this.timer) {
                clearInterval(this.timer)
            }
            if (this.autoSaveTimer) {
                clearInterval(this.autoSaveTimer)
            }
            if (this.antiCheatDetector) {
                this.antiCheatDetector.destroy()
            }

            // 移除事件监听器
            document.removeEventListener('fullscreenchange', this.handleFullscreenChange)
            document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange)
            window.removeEventListener('online', this.handleOnline)
            window.removeEventListener('offline', this.handleOffline)
            document.removeEventListener('visibilitychange', this.handleVisibilityChange)
            document.removeEventListener('contextmenu', this.handleContextMenu)
            document.removeEventListener('keydown', this.handleKeyDown)
            window.removeEventListener('beforeunload', this.handleBeforeUnload)
        }
    }
}
</script>

<style scoped>
.exam-interface {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.exam-interface.fullscreen-mode {
  background: #ffffff;
}

.exam-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #ffffff;
  border-bottom: 1px solid #e8e8e8;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.exam-info .exam-title {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 18px;
}

.exam-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.exam-status {
  display: flex;
  align-items: center;
  gap: 24px;
}

.countdown-timer {
  text-align: right;
}

.progress-info {
  min-width: 200px;
}

.progress-text {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #666;
}

.exam-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.question-nav {
  width: 280px;
  background: #ffffff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
}

.nav-header {
  padding: 16px;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-header h4 {
  margin: 0;
}

.nav-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.question-group {
  margin-bottom: 20px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.group-title {
  font-weight: 600;
  color: #333;
}

.group-count {
  font-size: 12px;
  color: #999;
}

.question-numbers {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.question-numbers .ant-btn {
  width: 36px;
  height: 36px;
  padding: 0;
}

.question-numbers .ant-btn.answered {
  background: #f6ffed;
  border-color: #b7eb8f;
  color: #52c41a;
}

.question-numbers .ant-btn.marked {
  background: #fff7e6;
  border-color: #ffd666;
  color: #fa8c16;
}

.question-numbers .ant-btn.unanswered {
  background: #ffffff;
  border-color: #d9d9d9;
  color: #666;
}

.answer-stats {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e8e8e8;
}

.stat-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.stat-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  margin-right: 8px;
}

.stat-color.answered {
  background: #52c41a;
}

.stat-color.marked {
  background: #fa8c16;
}

.stat-color.unanswered {
  background: #d9d9d9;
}

.question-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.question-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

.toolbar-center {
  font-weight: 600;
  color: #333;
}

.toolbar-right .ant-btn.marked {
  color: #fa8c16;
}

.question-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.question-item {
  max-width: 800px;
  margin: 0 auto;
}

.question-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8e8e8;
}

.question-score {
  margin-left: auto;
  font-weight: 600;
  color: #1890ff;
}

.question-text {
  margin-bottom: 24px;
  line-height: 1.6;
  font-size: 16px;
}

.question-images {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.question-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.2s;
}

.question-image:hover {
  transform: scale(1.05);
}

.answer-area {
  margin-bottom: 40px;
}

.option-item {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.option-item:hover {
  background-color: #f0f9ff;
}

.option-key {
  display: inline-block;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  background: #1890ff;
  color: white;
  border-radius: 50%;
  margin-right: 12px;
  font-size: 14px;
  font-weight: 600;
}

.option-content {
  vertical-align: top;
  line-height: 1.5;
}

.blank-item {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}

.blank-label {
  min-width: 80px;
  font-weight: 500;
}

.calculation-steps,
.calculation-result {
  margin-bottom: 16px;
}

.step-label,
.result-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.question-navigation {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-top: 1px solid #e8e8e8;
  background: #fafafa;
}

.calculator {
  width: 100%;
}

.calculator-display {
  margin-bottom: 12px;
}

.display-input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  font-size: 18px;
  text-align: right;
  border: 2px solid #e8e8e8;
  border-radius: 6px;
  background: #f5f5f5;
}

.calculator-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.button-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.calc-btn {
  height: 48px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #ffffff;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.calc-btn:hover {
  background: #f0f0f0;
}

.calc-btn.operator {
  background: #1890ff;
  color: white;
}

.calc-btn.equals {
  background: #52c41a;
  color: white;
  grid-row: span 2;
}

.calc-btn.clear {
  background: #ff4d4f;
  color: white;
}

.calc-btn.zero {
  grid-column: span 2;
}

.submit-confirmation {
  padding: 16px 0;
}

.submit-stats {
  margin: 20px 0;
}

.unanswered-warning {
  margin-top: 16px;
  padding: 12px;
  background: #fff2f0;
  border-radius: 6px;
}

.anticheat-warning,
.network-warning {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  max-width: 400px;
}

@media (max-width: 768px) {
  .exam-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .exam-content {
    flex-direction: column;
  }

  .question-nav {
    width: 100%;
    max-height: 200px;
  }

  .question-numbers {
    grid-template-columns: repeat(8, 1fr);
  }

  .question-toolbar {
    flex-wrap: wrap;
    gap: 8px;
  }

  .question-navigation {
    flex-wrap: wrap;
  }
}
</style>
