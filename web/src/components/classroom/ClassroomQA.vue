<template>
  <div class="classroom-qa">
    <!-- 教师控制面板 -->
    <div v-if="userRole === 'teacher'" class="teacher-panel">
      <a-card>
        <div class="panel-header">
          <h4>课堂问答管理</h4>
          <a-space>
            <a-switch
              v-model="qaSettings.allowStudentQuestions"
              checked-children="允许提问"
              un-checked-children="禁止提问"
            />
            <a-switch
              v-model="qaSettings.requireApproval"
              checked-children="需要审核"
              un-checked-children="自动显示"
            />
            <a-button type="primary" @click="startQuickPoll">
              快速问答
            </a-button>
          </a-space>
        </div>

        <!-- 统计信息 -->
        <div class="qa-stats">
          <a-row :gutter="16">
            <a-col span="{6}">
              <a-statistic
                title="待审核问题"
                :value="pendingQuestions.length"
                :value-style="{ color: '#cf1322' }"
              />
            </a-col>
            <a-col span="{6}">
              <a-statistic
                title="已回答问题"
                :value="answeredQuestions.length"
                :value-style="{ color: '#3f8600' }"
              />
            </a-col>
            <a-col span="{6}">
              <a-statistic
                title="活跃学生"
                :value="activeStudentsCount"
                :value-style="{ color: '#1890ff' }"
              />
            </a-col>
            <a-col span="{6}">
              <a-statistic
                title="总问题数"
                :value="totalQuestionsCount"
              />
            </a-col>
          </a-row>
        </div>
      </a-card>

      <!-- 待审核问题 -->
      <a-card v-if="pendingQuestions.length > 0" title="待审核问题" class="pending-questions">
        <div
          v-for="question in pendingQuestions"
          :key="question.id"
          class="pending-question"
        >
          <div class="question-content">
            <div class="question-meta">
              <a-avatar size="small" :src="question.userAvatar">
                {{ question.userName.charAt(0) }}
              </a-avatar>
              <span class="user-name">{{ question.userName }}</span>
              <span class="question-time">{{ formatTime(question.timestamp) }}</span>
              <a-tag v-if="question.anonymous" size="small" color="blue">匿名</a-tag>
            </div>
            <div class="question-text">{{ question.text }}</div>
          </div>
          <div class="question-actions">
            <a-space>
              <a-button type="primary" size="small" @click="approveQuestion(question)">
                批准
              </a-button>
              <a-button size="small" @click="rejectQuestion(question)">
                拒绝
              </a-button>
              <a-button type="link" size="small" @click="answerQuestion(question)">
                直接回答
              </a-button>
            </a-space>
          </div>
        </div>
      </a-card>
    </div>

    <!-- 问答展示区 -->
    <div class="qa-display">
      <a-card>
        <div class="qa-header">
          <h4>课堂问答</h4>
          <div class="qa-controls">
            <a-radio-group v-model="displayMode" size="small">
              <a-radio-button value="all">全部</a-radio-button>
              <a-radio-button value="answered">已回答</a-radio-button>
              <a-radio-button value="unanswered">未回答</a-radio-button>
            </a-radio-group>
            <a-input-search
              v-model="searchKeyword"
              placeholder="搜索问题..."
              style="width: 200px"
              size="small"
            />
          </div>
        </div>

        <!-- 问答列表 -->
        <div class="qa-list" ref="qaList">
          <div
            v-for="question in filteredQuestions"
            :key="question.id"
            class="qa-item"
            :class="{ highlighted: question.id === highlightedQuestionId }"
          >
            <!-- 问题部分 -->
            <div class="question-section">
              <div class="question-header">
                <div class="user-info">
                  <a-avatar size="small" :src="question.userAvatar">
                    {{ question.userName.charAt(0) }}
                  </a-avatar>
                  <span class="user-name">
                    {{ question.anonymous ? '匿名学生' : question.userName }}
                  </span>
                  <span class="question-time">{{ formatTime(question.timestamp) }}</span>
                </div>
                <div class="question-actions">
                  <a-space size="small">
                    <a-button
                      v-if="!question.answered && userRole === 'teacher'"
                      type="link"
                      size="small"
                      @click="answerQuestion(question)"
                    >
                      回答
                    </a-button>
                    <a-button
                      type="link"
                      size="small"
                      @click="likeQuestion(question)"
                      :class="{ liked: question.userLiked }"
                    >
                      <a-icon type="like" />
                      {{ question.likes || 0 }}
                    </a-button>
                    <a-dropdown v-if="canModifyQuestion(question)">
                      <a-button type="link" size="small">
                        <a-icon type="more" />
                      </a-button>
                      <template #overlay>
                        <a-menu>
                          <a-menu-item @click="editQuestion(question)">
                            编辑
                          </a-menu-item>
                          <a-menu-item @click="deleteQuestion(question)" danger>
                            删除
                          </a-menu-item>
                        </a-menu>
                      </template>
                    </a-dropdown>
                  </a-space>
                </div>
              </div>
              <div class="question-content">
                <p>{{ question.text }}</p>
                <div v-if="question.attachments && question.attachments.length" class="attachments">
                  <a-tag
                    v-for="attachment in question.attachments"
                    :key="attachment.id"
                    color="blue"
                    style="cursor: pointer"
                    @click="viewAttachment(attachment)"
                  >
                    <a-icon type="paper-clip" />
                    {{ attachment.name }}
                  </a-tag>
                </div>
              </div>
            </div>

            <!-- 回答部分 -->
            <div v-if="question.answered" class="answer-section">
              <div class="answer-header">
                <div class="teacher-info">
                  <a-avatar size="small" :src="question.answer.teacherAvatar">
                    {{ question.answer.teacherName.charAt(0) }}
                  </a-avatar>
                  <span class="teacher-name">{{ question.answer.teacherName }}</span>
                  <span class="answer-time">{{ formatTime(question.answer.timestamp) }}</span>
                </div>
              </div>
              <div class="answer-content">
                <p>{{ question.answer.text }}</p>
                <div v-if="question.answer.attachments && question.answer.attachments.length" class="attachments">
                  <a-tag
                    v-for="attachment in question.answer.attachments"
                    :key="attachment.id"
                    color="green"
                    style="cursor: pointer"
                    @click="viewAttachment(attachment)"
                  >
                    <a-icon type="paper-clip" />
                    {{ attachment.name }}
                  </a-tag>
                </div>
              </div>
            </div>

            <!-- 回复区域 -->
            <div v-if="question.allowReplies" class="replies-section">
              <div
                v-for="reply in question.replies"
                :key="reply.id"
                class="reply-item"
              >
                <div class="reply-header">
                  <a-avatar size="mini" :src="reply.userAvatar">
                    {{ reply.userName.charAt(0) }}
                  </a-avatar>
                  <span class="reply-user">{{ reply.userName }}</span>
                  <span class="reply-time">{{ formatTime(reply.timestamp) }}</span>
                </div>
                <div class="reply-content">{{ reply.text }}</div>
              </div>

              <!-- 添加回复 -->
              <div v-if="showReplyInput[question.id]" class="reply-input">
                <a-input
                  v-model="replyTexts[question.id]"
                  placeholder="添加回复..."
                  @keyup.enter="addReply(question)"
                >
                  <template #suffix>
                    <a-button
                      type="link"
                      size="small"
                      @click="addReply(question)"
                      :disabled="!replyTexts[question.id]"
                    >
                      发送
                    </a-button>
                  </template>
                </a-input>
              </div>

              <div v-else class="reply-trigger">
                <a @click="startReply(question)">回复</a>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <a-empty
            v-if="filteredQuestions.length === 0"
            description="暂无问题"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
          />
        </div>
      </a-card>
    </div>

    <!-- 学生提问区 -->
    <div v-if="userRole === 'student'" class="student-ask">
      <a-card>
        <div class="ask-header">
          <h4>提问</h4>
          <a-switch
            v-model="askAnonymously"
            checked-children="匿名"
            un-checked-children="实名"
            size="small"
          />
        </div>

        <div class="ask-form">
          <a-textarea
            v-model="questionText"
            placeholder="请输入您的问题..."
            :rows="3"
            :maxlength="500"
            show-count
            :disabled="!qaSettings.allowStudentQuestions"
          />

          <div class="ask-actions">
            <a-space>
              <a-upload
                :file-list="attachments"
                :before-upload="beforeUpload"
                :remove="removeAttachment"
                multiple
                :show-upload-list="true"
              >
                <a-button size="small" type="text">
                  <a-icon type="paper-clip" />
                  添加附件
                </a-button>
              </a-upload>

              <a-button
                type="primary"
                @click="submitQuestion"
                :loading="submitting"
                :disabled="!canSubmitQuestion"
              >
                {{ qaSettings.requireApproval ? '提交审核' : '提交问题' }}
              </a-button>
            </a-space>
          </div>
        </div>
      </a-card>
    </div>

    <!-- 回答弹窗 -->
    <a-modal
      v-model:visible="answerModalVisible"
      title="回答问题"
      width="600px"
      @ok="submitAnswer"
      :confirm-loading="submittingAnswer"
    >
      <div v-if="currentAnsweringQuestion" class="answer-modal-content">
        <div class="original-question">
          <h5>学生问题：</h5>
          <p>{{ currentAnsweringQuestion.text }}</p>
        </div>

        <a-form layout="vertical">
          <a-form-item label="回答内容">
            <a-textarea
              v-model="answerText"
              placeholder="请输入回答内容..."
              :rows="6"
              :maxlength="1000"
              show-count
            />
          </a-form-item>

          <a-form-item label="附件">
            <a-upload
              v-model:file-list="answerAttachments"
              :before-upload="beforeUploadAnswer"
              multiple
            >
              <a-button>
                <a-icon type="upload" />
                上传附件
              </a-button>
            </a-upload>
          </a-form-item>

          <a-form-item>
            <a-checkbox v-model="highlightAnswer">
              高亮显示此回答
            </a-checkbox>
          </a-form-item>
        </a-form>
      </div>
    </a-modal>

    <!-- 快速问答弹窗 -->
    <a-modal
      v-model:visible="quickPollVisible"
      title="快速问答"
      width="500px"
      @ok="startQuickPollSession"
      :confirm-loading="startingQuickPoll"
    >
      <a-form layout="vertical">
        <a-form-item label="问答主题">
          <a-input
            v-model="quickPoll.topic"
            placeholder="输入问答主题..."
            :maxlength="100"
          />
        </a-form-item>
        <a-form-item label="时间限制">
          <a-input-number
            v-model="quickPoll.timeLimit"
            :min="30"
            :max="600"
            :step="30"
            :formatter="value => `${value}秒`"
            :parser="value => value.replace('秒', '')"
          />
        </a-form-item>
        <a-form-item label="回答模式">
          <a-radio-group v-model="quickPoll.mode">
            <a-radio value="first">抢答模式</a-radio>
            <a-radio value="all">全员回答</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { Empty } from 'ant-design-vue'

export default {
    name: 'ClassroomQA',
    props: {
        classroomId: {
            type: String,
            required: true
        },
        userRole: {
            type: String,
            default: 'student'
        }
    },
    data () {
        return {
            Empty,

            // 问答设置
            qaSettings: {
                allowStudentQuestions: true,
                requireApproval: false,
                enableReplies: true,
                enableAttachments: true
            },

            // 问题数据
            questions: [],
            pendingQuestions: [],

            // 显示控制
            displayMode: 'all',
            searchKeyword: '',
            highlightedQuestionId: null,

            // 学生提问
            questionText: '',
            askAnonymously: false,
            attachments: [],
            submitting: false,

            // 回答相关
            answerModalVisible: false,
            currentAnsweringQuestion: null,
            answerText: '',
            answerAttachments: [],
            submittingAnswer: false,
            highlightAnswer: false,

            // 回复相关
            showReplyInput: {},
            replyTexts: {},

            // 快速问答
            quickPollVisible: false,
            startingQuickPoll: false,
            quickPoll: {
                topic: '',
                timeLimit: 300,
                mode: 'all'
            },

            // WebSocket连接
            ws: null,

            // 计时器
            updateTimer: null
        }
    },
    computed: {
        answeredQuestions () {
            return this.questions.filter(q => q.answered)
        },

        unansweredQuestions () {
            return this.questions.filter(q => !q.answered)
        },

        activeStudentsCount () {
            const activeUsers = new Set()
            this.questions.forEach(q => {
                if (!q.anonymous) {
                    activeUsers.add(q.userId)
                }
            })
            return activeUsers.size
        },

        totalQuestionsCount () {
            return this.questions.length + this.pendingQuestions.length
        },

        filteredQuestions () {
            let filtered = this.questions

            // 按显示模式过滤
            if (this.displayMode === 'answered') {
                filtered = filtered.filter(q => q.answered)
            } else if (this.displayMode === 'unanswered') {
                filtered = filtered.filter(q => !q.answered)
            }

            // 按搜索关键词过滤
            if (this.searchKeyword.trim()) {
                const keyword = this.searchKeyword.toLowerCase()
                filtered = filtered.filter(q =>
                    q.text.toLowerCase().includes(keyword) ||
          (q.answered && q.answer.text.toLowerCase().includes(keyword))
                )
            }

            return filtered.sort((a, b) => {
                // 已回答的排在前面，然后按时间倒序
                if (a.answered && !b.answered) return -1
                if (!a.answered && b.answered) return 1
                return new Date(b.timestamp) - new Date(a.timestamp)
            })
        },

        canSubmitQuestion () {
            return this.questionText.trim() &&
             this.qaSettings.allowStudentQuestions &&
             !this.submitting
        },

        canModifyQuestion () {
            return (question) => {
                return this.userRole === 'teacher' ||
               (question.userId === this.$store.getters.userId && !question.answered)
            }
        }
    },
    mounted () {
        this.initWebSocket()
        this.loadQuestions()
        this.loadQASettings()
        this.startUpdateTimer()
    },
    beforeDestroy () {
        this.cleanup()
    },
    methods: {
    // 初始化
        async loadQuestions () {
            try {
                const response = await this.$api.get(`/classroom/${this.classroomId}/qa/questions`)

                if (response.success) {
                    this.questions = response.data.questions || []
                    this.pendingQuestions = response.data.pendingQuestions || []
                }
            } catch (error) {
                console.error('加载问题列表失败:', error)
                this.$message.error('加载问题列表失败')
            }
        },

        async loadQASettings () {
            try {
                const response = await this.$api.get(`/classroom/${this.classroomId}/qa/settings`)

                if (response.success) {
                    this.qaSettings = { ...this.qaSettings, ...response.data }
                }
            } catch (error) {
                console.error('加载问答设置失败:', error)
            }
        },

        // 学生提问
        async submitQuestion () {
            if (!this.canSubmitQuestion) return

            this.submitting = true

            try {
                const questionData = {
                    text: this.questionText.trim(),
                    classroomId: this.classroomId,
                    userId: this.$store.getters.userId,
                    userName: this.$store.getters.username,
                    userAvatar: this.$store.getters.avatar,
                    anonymous: this.askAnonymously,
                    attachments: this.attachments,
                    timestamp: new Date().toISOString()
                }

                const response = await this.$api.post('/classroom/qa/question', questionData)

                if (response.success) {
                    if (this.qaSettings.requireApproval) {
                        this.pendingQuestions.push(response.data)
                        this.$message.success('问题已提交，等待老师审核')
                    } else {
                        this.questions.unshift(response.data)
                        this.$message.success('问题提交成功')
                    }

                    this.resetQuestionForm()
                    this.broadcastQAEvent('questionSubmitted', questionData)
                }
            } catch (error) {
                console.error('提交问题失败:', error)
                this.$message.error('提交问题失败')
            } finally {
                this.submitting = false
            }
        },

        resetQuestionForm () {
            this.questionText = ''
            this.attachments = []
            this.askAnonymously = false
        },

        // 教师操作
        async approveQuestion (question) {
            try {
                const response = await this.$api.post(`/classroom/qa/question/${question.id}/approve`)

                if (response.success) {
                    this.pendingQuestions = this.pendingQuestions.filter(q => q.id !== question.id)
                    this.questions.unshift(response.data)

                    this.$message.success('问题已批准')
                    this.broadcastQAEvent('questionApproved', { questionId: question.id })
                }
            } catch (error) {
                console.error('批准问题失败:', error)
                this.$message.error('批准失败')
            }
        },

        async rejectQuestion (question) {
            try {
                const response = await this.$api.post(`/classroom/qa/question/${question.id}/reject`)

                if (response.success) {
                    this.pendingQuestions = this.pendingQuestions.filter(q => q.id !== question.id)
                    this.$message.success('问题已拒绝')
                }
            } catch (error) {
                console.error('拒绝问题失败:', error)
                this.$message.error('拒绝失败')
            }
        },

        answerQuestion (question) {
            this.currentAnsweringQuestion = question
            this.answerText = ''
            this.answerAttachments = []
            this.highlightAnswer = false
            this.answerModalVisible = true
        },

        async submitAnswer () {
            if (!this.answerText.trim()) {
                this.$message.error('请输入回答内容')
                return
            }

            this.submittingAnswer = true

            try {
                const answerData = {
                    questionId: this.currentAnsweringQuestion.id,
                    text: this.answerText.trim(),
                    teacherId: this.$store.getters.userId,
                    teacherName: this.$store.getters.username,
                    teacherAvatar: this.$store.getters.avatar,
                    attachments: this.answerAttachments,
                    highlighted: this.highlightAnswer,
                    timestamp: new Date().toISOString()
                }

                const response = await this.$api.post('/classroom/qa/answer', answerData)

                if (response.success) {
                    // 更新本地问题状态
                    const questionIndex = this.questions.findIndex(q => q.id === this.currentAnsweringQuestion.id)
                    if (questionIndex !== -1) {
                        this.questions[questionIndex].answered = true
                        this.questions[questionIndex].answer = response.data

                        if (this.highlightAnswer) {
                            this.highlightedQuestionId = this.currentAnsweringQuestion.id
                            setTimeout(() => {
                                this.highlightedQuestionId = null
                            }, 5000)
                        }
                    }

                    this.answerModalVisible = false
                    this.$message.success('回答提交成功')

                    this.broadcastQAEvent('questionAnswered', {
                        questionId: this.currentAnsweringQuestion.id,
                        answer: response.data
                    })
                }
            } catch (error) {
                console.error('提交回答失败:', error)
                this.$message.error('提交回答失败')
            } finally {
                this.submittingAnswer = false
            }
        },

        // 互动功能
        async likeQuestion (question) {
            try {
                const response = await this.$api.post(`/classroom/qa/question/${question.id}/like`, {
                    userId: this.$store.getters.userId
                })

                if (response.success) {
                    question.likes = response.data.likes
                    question.userLiked = response.data.userLiked

                    this.broadcastQAEvent('questionLiked', {
                        questionId: question.id,
                        likes: response.data.likes
                    })
                }
            } catch (error) {
                console.error('点赞失败:', error)
            }
        },

        startReply (question) {
            this.$set(this.showReplyInput, question.id, true)
            this.$set(this.replyTexts, question.id, '')
        },

        async addReply (question) {
            const replyText = this.replyTexts[question.id]
            if (!replyText || !replyText.trim()) return

            try {
                const replyData = {
                    questionId: question.id,
                    text: replyText.trim(),
                    userId: this.$store.getters.userId,
                    userName: this.$store.getters.username,
                    userAvatar: this.$store.getters.avatar,
                    timestamp: new Date().toISOString()
                }

                const response = await this.$api.post('/classroom/qa/reply', replyData)

                if (response.success) {
                    if (!question.replies) {
                        question.replies = []
                    }
                    question.replies.push(response.data)

                    this.$set(this.showReplyInput, question.id, false)
                    this.$set(this.replyTexts, question.id, '')

                    this.broadcastQAEvent('replyAdded', {
                        questionId: question.id,
                        reply: response.data
                    })
                }
            } catch (error) {
                console.error('添加回复失败:', error)
                this.$message.error('回复失败')
            }
        },

        // 快速问答
        startQuickPoll () {
            this.quickPoll = {
                topic: '',
                timeLimit: 300,
                mode: 'all'
            }
            this.quickPollVisible = true
        },

        async startQuickPollSession () {
            if (!this.quickPoll.topic.trim()) {
                this.$message.error('请输入问答主题')
                return
            }

            this.startingQuickPoll = true

            try {
                const pollData = {
                    ...this.quickPoll,
                    classroomId: this.classroomId,
                    createdBy: this.$store.getters.userId,
                    timestamp: new Date().toISOString()
                }

                const response = await this.$api.post('/classroom/qa/quick-poll', pollData)

                if (response.success) {
                    this.quickPollVisible = false
                    this.$message.success('快速问答已开始')

                    this.broadcastQAEvent('quickPollStarted', pollData)
                }
            } catch (error) {
                console.error('启动快速问答失败:', error)
                this.$message.error('启动失败')
            } finally {
                this.startingQuickPoll = false
            }
        },

        // 附件处理
        beforeUpload (file) {
            // 支持更多文件类型
            const isValidType = file.type.startsWith('image/') ||
                         file.type === 'application/pdf' ||
                         file.type.startsWith('text/') ||
                         file.type.startsWith('video/') ||
                         file.type.startsWith('audio/') ||
                         file.type === 'application/msword' ||
                         file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                         file.type === 'application/vnd.ms-excel' ||
                         file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                         file.type === 'application/vnd.ms-powerpoint' ||
                         file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
                         file.type === 'application/zip' ||
                         file.type === 'application/x-zip-compressed' ||
                         file.name.endsWith('.sb3') ||
                         file.name.endsWith('.sb2') ||
                         file.name.endsWith('.py')

            if (!isValidType) {
                this.$message.error('不支持该文件类型，请上传图片、文档、视频、音频或压缩包')
                return false
            }

            const maxSize = 100 * 1024 * 1024 // 100MB
            if (file.size > maxSize) {
                this.$message.error('文件大小超过限制（最大100MB），请压缩文件后重新上传')
                return false
            }

            return false // 阻止自动上传
        },

        beforeUploadAnswer (file) {
            return this.beforeUpload(file)
        },

        removeAttachment (file) {
            const index = this.attachments.indexOf(file)
            if (index > -1) {
                this.attachments.splice(index, 1)
            }
        },

        viewAttachment (attachment) {
            if (attachment.type.startsWith('image/')) {
                // 预览图片
                window.open(attachment.url, '_blank')
            } else {
                // 下载文件
                const a = document.createElement('a')
                a.href = attachment.url
                a.download = attachment.name
                a.click()
            }
        },

        // WebSocket通信
        initWebSocket () {
            const wsUrl = `ws://localhost:3001/qa/${this.classroomId}`
            this.ws = new WebSocket(wsUrl)

            this.ws.onopen = () => {
            }

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data)
                this.handleQAMessage(data)
            }

            this.ws.onerror = (error) => {
                console.error('问答WebSocket错误:', error)
            }

            this.ws.onclose = () => {
                setTimeout(() => this.initWebSocket(), 3000)
            }
        },

        handleQAMessage (data) {
            switch (data.type) {
            case 'questionSubmitted':
                if (data.userId !== this.$store.getters.userId) {
                    if (this.userRole === 'teacher') {
                        if (this.qaSettings.requireApproval) {
                            this.pendingQuestions.unshift(data.question)
                        } else {
                            this.questions.unshift(data.question)
                        }
                        this.$message.info('收到新问题')
                    }
                }
                break

            case 'questionAnswered':
                const questionIndex = this.questions.findIndex(q => q.id === data.questionId)
                if (questionIndex !== -1) {
                    this.questions[questionIndex].answered = true
                    this.questions[questionIndex].answer = data.answer

                    if (data.answer.highlighted) {
                        this.highlightedQuestionId = data.questionId
                        setTimeout(() => {
                            this.highlightedQuestionId = null
                        }, 5000)
                    }
                }
                break

            case 'questionLiked':
                const likedQuestion = this.questions.find(q => q.id === data.questionId)
                if (likedQuestion) {
                    likedQuestion.likes = data.likes
                }
                break

            case 'replyAdded':
                const repliedQuestion = this.questions.find(q => q.id === data.questionId)
                if (repliedQuestion) {
                    if (!repliedQuestion.replies) {
                        repliedQuestion.replies = []
                    }
                    repliedQuestion.replies.push(data.reply)
                }
                break
            }
        },

        broadcastQAEvent (type, data) {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

            this.ws.send(JSON.stringify({
                type,
                classroomId: this.classroomId,
                userId: this.$store.getters.userId,
                userName: this.$store.getters.username,
                timestamp: new Date().toISOString(),
                ...data
            }))
        },

        // 定时更新
        startUpdateTimer () {
            this.updateTimer = setInterval(() => {
                if (this.userRole === 'teacher') {
                    this.loadQuestions()
                }
            }, 30000) // 30秒更新一次
        },

        // 工具函数
        formatTime (timestamp) {
            const now = new Date()
            const time = new Date(timestamp)
            const diff = now - time

            if (diff < 60000) { // 小于1分钟
                return '刚刚'
            } else if (diff < 3600000) { // 小于1小时
                return Math.floor(diff / 60000) + '分钟前'
            } else if (diff < 86400000) { // 小于1天
                return Math.floor(diff / 3600000) + '小时前'
            } else {
                return time.toLocaleDateString()
            }
        },

        cleanup () {
            if (this.ws) {
                this.ws.close()
            }
            if (this.updateTimer) {
                clearInterval(this.updateTimer)
            }
        }
    }
}
</script>

<style scoped>
.classroom-qa {
  padding: 16px;
}

.teacher-panel {
  margin-bottom: 24px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.qa-stats {
  margin-top: 16px;
}

.pending-questions {
  margin-bottom: 24px;
}

.pending-question {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.pending-question:last-child {
  border-bottom: none;
}

.question-content {
  flex: 1;
}

.question-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.user-name {
  font-weight: 500;
}

.question-time {
  font-size: 12px;
  color: #999;
}

.question-text {
  color: #333;
  line-height: 1.5;
}

.question-actions {
  margin-left: 16px;
}

.qa-display {
  margin-bottom: 24px;
}

.qa-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.qa-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.qa-list {
  max-height: 600px;
  overflow-y: auto;
}

.qa-item {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  margin-bottom: 16px;
  overflow: hidden;
  transition: all 0.3s;
}

.qa-item.highlighted {
  border-color: #1890ff;
  box-shadow: 0 0 8px rgba(24, 144, 255, 0.3);
}

.question-section {
  padding: 16px;
  background: #fafafa;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.question-actions .liked {
  color: #1890ff;
}

.question-content p {
  margin: 0;
  line-height: 1.6;
}

.attachments {
  margin-top: 8px;
}

.answer-section {
  padding: 16px;
  background: #ffffff;
  border-top: 1px solid #e8e8e8;
}

.answer-header {
  margin-bottom: 12px;
}

.teacher-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.teacher-name {
  font-weight: 500;
  color: #1890ff;
}

.answer-time {
  font-size: 12px;
  color: #999;
}

.answer-content p {
  margin: 0;
  line-height: 1.6;
}

.replies-section {
  padding: 16px;
  background: #f8f9fa;
  border-top: 1px solid #e8e8e8;
}

.reply-item {
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #ffffff;
  border-radius: 4px;
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.reply-user {
  font-size: 12px;
  font-weight: 500;
}

.reply-time {
  font-size: 11px;
  color: #999;
}

.reply-content {
  font-size: 13px;
  color: #666;
}

.reply-input {
  margin-top: 8px;
}

.reply-trigger {
  margin-top: 8px;
  text-align: right;
}

.student-ask {
  margin-bottom: 24px;
}

.ask-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.ask-form {
  space-y: 12px;
}

.ask-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.answer-modal-content {
  margin-bottom: 16px;
}

.original-question {
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 16px;
}

.original-question h5 {
  margin: 0 0 8px 0;
  color: #666;
}

.original-question p {
  margin: 0;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .panel-header,
  .qa-header,
  .ask-header {
    flex-direction: column;
    gap: 12px;
  }

  .qa-controls {
    width: 100%;
    justify-content: space-between;
  }

  .question-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .ask-actions {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
}
</style>
