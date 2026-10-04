<template>
  <div class="classroom-poll">
    <!-- 教师创建投票界面 -->
    <div v-if="userRole === 'teacher'" class="poll-creator">
      <div class="creator-header">
        <h3>课堂投票</h3>
        <a-button
          v-if="!isCreating"
          type="primary"
          @click="startCreating"
        >
          <a-icon type="plus" />
          创建投票
        </a-button>
      </div>

      <!-- 创建投票表单 -->
      <div v-if="isCreating" class="create-form">
        <a-card>
          <h4>创建新投票</h4>
          <a-form layout="vertical">
            <a-form-item label="投票标题">
              <a-input
                v-model="newPoll.title"
                placeholder="输入投票问题或标题"
                :maxlength="100"
              />
            </a-form-item>

            <a-form-item label="投票类型">
              <a-radio-group v-model="newPoll.type">
                <a-radio value="single">单选</a-radio>
                <a-radio value="multiple">多选</a-radio>
                <a-radio value="text">文本回答</a-radio>
                <a-radio value="rating">评分(1-5星)</a-radio>
              </a-radio-group>
            </a-form-item>

            <a-form-item
              v-if="['single', 'multiple'].includes(newPoll.type)"
              label="选项"
            >
              <div class="options-editor">
                <div
                  v-for="(option, index) in newPoll.options"
                  :key="index"
                  class="option-item"
                >
                  <a-input
                    v-model="option.text"
                    :placeholder="`选项 ${index + 1}`"
                    :maxlength="50"
                  />
                  <a-button
                    v-if="newPoll.options.length > 2"
                    type="text"
                    danger
                    @click="removeOption(index)"
                  >
                    <a-icon type="delete" />
                  </a-button>
                </div>
                <a-button
                  v-if="newPoll.options.length < 8"
                  type="dashed"
                  block
                  @click="addOption"
                >
                  <a-icon type="plus" />
                  添加选项
                </a-button>
              </div>
            </a-form-item>

            <a-form-item label="投票设置">
              <div class="poll-settings">
                <a-checkbox v-model="newPoll.anonymous">匿名投票</a-checkbox>
                <a-checkbox v-model="newPoll.showRealtime">实时显示结果</a-checkbox>
                <a-checkbox v-model="newPoll.allowChange">允许修改答案</a-checkbox>
              </div>
            </a-form-item>

            <a-form-item label="投票时长">
              <a-input-number
                v-model="newPoll.duration"
                :min="30"
                :max="3600"
                :step="30"
                :formatter="value => `${value}秒`"
                :parser="value => value.replace('秒', '')"
                style="width: 150px"
              />
            </a-form-item>

            <a-form-item>
              <a-space>
                <a-button
                  type="primary"
                  @click="createPoll"
                  :loading="creating"
                  :disabled="!canCreate"
                >
                  发起投票
                </a-button>
                <a-button @click="cancelCreating">取消</a-button>
              </a-space>
            </a-form-item>
          </a-form>
        </a-card>
      </div>

      <!-- 投票控制面板 -->
      <div v-if="activePoll && userRole === 'teacher'" class="poll-control">
        <a-card>
          <div class="control-header">
            <h4>{{ activePoll.title }}</h4>
            <a-tag :color="pollStatusColor">{{ pollStatusText }}</a-tag>
          </div>

          <div class="control-actions">
            <a-space>
              <a-button
                v-if="activePoll.status === 'active'"
                type="primary"
                @click="endPoll"
              >
                结束投票
              </a-button>
              <a-button
                v-if="activePoll.status === 'ended'"
                @click="showResults = !showResults"
              >
                {{ showResults ? '隐藏' : '显示' }}结果
              </a-button>
              <a-button
                v-if="activePoll.status === 'ended'"
                @click="exportResults"
              >
                <a-icon type="download" />
                导出结果
              </a-button>
              <a-button
                type="text"
                danger
                @click="deletePoll"
              >
                删除投票
              </a-button>
            </a-space>
          </div>

          <!-- 实时统计 -->
          <div class="poll-stats">
            <a-row :gutter="16">
              <a-col span="{8}">
                <a-statistic
                  title="总参与人数"
                  :value="pollStats.totalVotes"
                  :total="pollStats.totalStudents"
                  :formatter="(value, total) => `${value}/${total}`"
                />
              </a-col>
              <a-col span="{8}">
                <a-statistic
                  title="参与率"
                  :value="pollStats.participationRate"
                  suffix="%"
                  :precision="1"
                />
              </a-col>
              <a-col span="{8}">
                <a-statistic
                  title="剩余时间"
                  :value="timeRemaining"
                  suffix="秒"
                  v-if="activePoll.status === 'active'"
                />
              </a-col>
            </a-row>
          </div>
        </a-card>
      </div>
    </div>

    <!-- 学生投票界面 -->
    <div v-if="userRole === 'student' && activePoll" class="poll-participant">
      <a-card>
        <div class="poll-header">
          <h4>{{ activePoll.title }}</h4>
          <div class="poll-meta">
            <a-tag v-if="activePoll.anonymous" color="blue">匿名投票</a-tag>
            <a-tag v-if="activePoll.allowChange" color="green">可修改答案</a-tag>
            <span class="time-remaining" v-if="activePoll.status === 'active'">
              剩余时间: {{ timeRemaining }}秒
            </span>
          </div>
        </div>

        <!-- 单选投票 -->
        <div v-if="activePoll.type === 'single'" class="vote-options">
          <a-radio-group
            v-model="userVote.selectedOption"
            :disabled="!canVote"
            @change="onVoteChange"
          >
            <div
              v-for="(option, index) in activePoll.options"
              :key="index"
              class="vote-option"
            >
              <a-radio :value="index">
                {{ option.text }}
              </a-radio>
              <div
                v-if="showResults && pollResults.options"
                class="option-result"
              >
                <a-progress
                  :percent="pollResults.options[index].percentage"
                  :show-info="false"
                  size="small"
                />
                <span class="vote-count">
                  {{ pollResults.options[index].count }}票
                  ({{ pollResults.options[index].percentage }}%)
                </span>
              </div>
            </div>
          </a-radio-group>
        </div>

        <!-- 多选投票 -->
        <div v-if="activePoll.type === 'multiple'" class="vote-options">
          <a-checkbox-group
            v-model="userVote.selectedOptions"
            :disabled="!canVote"
            @change="onVoteChange"
          >
            <div
              v-for="(option, index) in activePoll.options"
              :key="index"
              class="vote-option"
            >
              <a-checkbox :value="index">
                {{ option.text }}
              </a-checkbox>
              <div
                v-if="showResults && pollResults.options"
                class="option-result"
              >
                <a-progress
                  :percent="pollResults.options[index].percentage"
                  :show-info="false"
                  size="small"
                />
                <span class="vote-count">
                  {{ pollResults.options[index].count }}票
                  ({{ pollResults.options[index].percentage }}%)
                </span>
              </div>
            </div>
          </a-checkbox-group>
        </div>

        <!-- 文本回答 -->
        <div v-if="activePoll.type === 'text'" class="vote-text">
          <a-textarea
            v-model="userVote.textAnswer"
            :disabled="!canVote"
            placeholder="请输入您的答案..."
            :rows="4"
            :maxlength="500"
            show-count
            @change="onVoteChange"
          />
        </div>

        <!-- 评分投票 -->
        <div v-if="activePoll.type === 'rating'" class="vote-rating">
          <div class="rating-container">
            <span class="rating-label">您的评分：</span>
            <a-rate
              v-model="userVote.rating"
              :disabled="!canVote"
              allow-half
              @change="onVoteChange"
            />
            <span class="rating-value">{{ userVote.rating || 0 }}星</span>
          </div>
          <div
            v-if="showResults && pollResults.averageRating"
            class="rating-result"
          >
            <span>平均评分：</span>
            <a-rate
              :value="pollResults.averageRating"
              disabled
              allow-half
            />
            <span>{{ pollResults.averageRating }}星 ({{ pollResults.totalVotes }}人参与)</span>
          </div>
        </div>

        <!-- 投票按钮 -->
        <div class="vote-actions">
          <a-button
            v-if="canVote && !userVote.submitted"
            type="primary"
            @click="submitVote"
            :disabled="!hasValidVote"
            :loading="submitting"
          >
            提交投票
          </a-button>
          <a-button
            v-if="canVote && userVote.submitted && activePoll.allowChange"
            @click="changeVote"
          >
            修改投票
          </a-button>
          <a-alert
            v-if="userVote.submitted"
            message="投票已提交"
            type="success"
            show-icon
            style="margin-top: 12px"
          />
        </div>
      </a-card>
    </div>

    <!-- 投票结果展示 -->
    <div v-if="showResults && pollResults" class="poll-results">
      <a-card>
        <h4>投票结果</h4>

        <!-- 选择题结果图表 -->
        <div v-if="['single', 'multiple'].includes(activePoll.type)" class="chart-container">
          <div ref="chartContainer" style="height: 300px;"></div>
        </div>

        <!-- 文本回答结果 -->
        <div v-if="activePoll.type === 'text'" class="text-results">
          <div class="text-stats">
            <a-statistic title="回答总数" :value="pollResults.totalAnswers" />
          </div>
          <div class="text-answers">
            <div
              v-for="(answer, index) in pollResults.textAnswers"
              :key="index"
              class="text-answer"
            >
              <div class="answer-header">
                <span v-if="!activePoll.anonymous" class="answer-author">
                  {{ answer.userName }}
                </span>
                <span class="answer-time">{{ formatTime(answer.timestamp) }}</span>
              </div>
              <div class="answer-content">{{ answer.text }}</div>
            </div>
          </div>
        </div>

        <!-- 评分结果 -->
        <div v-if="activePoll.type === 'rating'" class="rating-results">
          <div class="rating-stats">
            <a-row
              :gutter="16}>
              <a-col span={8}>
                <a-statistic title="
              平均评分"
              :value="pollResults.averageRating"
              :precision="2" />
            </a-col>
            <a-col span="{8}">
              <a-statistic title="参与人数" :value="pollResults.totalVotes" />
            </a-col>
            <a-col span="{8}">
              <a-statistic title="最高评分" :value="pollResults.maxRating" />
            </a-col>
            </a-row>
          </div>
          <div class="rating-distribution">
            <h5>评分分布</h5>
            <div
              v-for="i in 5"
              :key="i"
              class="rating-bar"
            >
              <span class="rating-star">{{ i }}星</span>
              <a-progress
                :percent="pollResults.ratingDistribution[i] || 0"
                :show-info="true"
              />
            </div>
          </div>
        </div>

        <!-- 参与者列表 -->
        <div v-if="!activePoll.anonymous" class="participants-list">
          <h5>参与者列表</h5>
          <div class="participants">
            <a-tag
              v-for="participant in pollResults.participants"
              :key="participant.userId"
              :color="participant.voted ? 'green' : 'default'"
            >
              {{ participant.userName }}
              {{ participant.voted ? '✓' : '未投票' }}
            </a-tag>
          </div>
        </div>
      </a-card>
    </div>

    <!-- 历史投票列表 -->
    <div v-if="userRole === 'teacher'" class="poll-history">
      <a-card>
        <h4>历史投票</h4>
        <a-list
          :data-source="historicalPolls"
          :pagination="{ pageSize: 5 }"
        >
          <template #renderItem="{ item }">
            <a-list-item>
              <a-list-item-meta>
                <template #title>
                  <span>{{ item.title }}</span>
                  <a-tag :color="item.status === 'ended' ? 'default' : 'processing'">
                    {{ item.status === 'ended' ? '已结束' : '进行中' }}
                  </a-tag>
                </template>
                <template #description>
                  <div>
                    <span>类型: {{ pollTypeNames[item.type] }}</span>
                    <span class="separator">|</span>
                    <span>参与: {{ item.votes }}/{{ item.totalStudents }}</span>
                    <span class="separator">|</span>
                    <span>创建时间: {{ formatTime(item.createdAt) }}</span>
                  </div>
                </template>
              </a-list-item-meta>
              <template #actions>
                <a @click="viewPollResults(item)">查看结果</a>
                <a @click="duplicatePoll(item)">复制</a>
                <a-popconfirm
                  title="确定删除这个投票吗？"
                  @confirm="deleteHistoricalPoll(item.id)"
                >
                  <a style="color: #ff4d4f">删除</a>
                </a-popconfirm>
              </template>
            </a-list-item>
          </template>
        </a-list>
      </a-card>
    </div>
  </div>
</template>

<script>
export default {
    name: 'ClassroomPoll',
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
            // 创建投票状态
            isCreating: false,
            creating: false,
            newPoll: {
                title: '',
                type: 'single',
                options: [
                    { text: '' },
                    { text: '' }
                ],
                anonymous: false,
                showRealtime: true,
                allowChange: false,
                duration: 300
            },

            // 当前活跃投票
            activePoll: null,

            // 用户投票数据
            userVote: {
                selectedOption: null,
                selectedOptions: [],
                textAnswer: '',
                rating: 0,
                submitted: false
            },

            // 投票结果
            pollResults: null,
            showResults: false,

            // 统计数据
            pollStats: {
                totalVotes: 0,
                totalStudents: 0,
                participationRate: 0
            },

            // 历史投票
            historicalPolls: [],

            // 计时器
            timer: null,
            timeRemaining: 0,

            // 状态
            submitting: false,

            // WebSocket连接
            ws: null,

            // 常量
            pollTypeNames: {
                single: '单选',
                multiple: '多选',
                text: '文本',
                rating: '评分'
            }
        }
    },
    computed: {
        canCreate () {
            return this.newPoll.title.trim() &&
             (this.newPoll.type === 'text' ||
              this.newPoll.type === 'rating' ||
              this.newPoll.options.some(opt => opt.text.trim()))
        },

        canVote () {
            return this.activePoll &&
             this.activePoll.status === 'active' &&
             (!this.userVote.submitted || this.activePoll.allowChange)
        },

        hasValidVote () {
            switch (this.activePoll && this.activePoll.type) {
            case 'single':
                return this.userVote.selectedOption !== null
            case 'multiple':
                return this.userVote.selectedOptions.length > 0
            case 'text':
                return this.userVote.textAnswer.trim()
            case 'rating':
                return this.userVote.rating > 0
            default:
                return false
            }
        },

        pollStatusColor () {
            const colors = {
                active: 'processing',
                ended: 'default',
                draft: 'warning'
            }
            return colors[this.activePoll && this.activePoll.status] || 'default'
        },

        pollStatusText () {
            const texts = {
                active: '进行中',
                ended: '已结束',
                draft: '草稿'
            }
            return texts[this.activePoll && this.activePoll.status] || '未知'
        }
    },
    mounted () {
        this.initWebSocket()
        this.loadHistoricalPolls()
    },
    beforeDestroy () {
        this.cleanup()
    },
    methods: {
    // 创建投票
        startCreating () {
            this.isCreating = true
            this.resetNewPoll()
        },

        cancelCreating () {
            this.isCreating = false
            this.resetNewPoll()
        },

        resetNewPoll () {
            this.newPoll = {
                title: '',
                type: 'single',
                options: [{ text: '' }, { text: '' }],
                anonymous: false,
                showRealtime: true,
                allowChange: false,
                duration: 300
            }
        },

        addOption () {
            if (this.newPoll.options.length < 8) {
                this.newPoll.options.push({ text: '' })
            }
        },

        removeOption (index) {
            if (this.newPoll.options.length > 2) {
                this.newPoll.options.splice(index, 1)
            }
        },

        async createPoll () {
            this.creating = true

            try {
                const pollData = {
                    ...this.newPoll,
                    classroomId: this.classroomId,
                    createdBy: this.$store.getters.userId,
                    createdAt: new Date().toISOString(),
                    status: 'active'
                }

                // 过滤空选项
                if (['single', 'multiple'].includes(pollData.type)) {
                    pollData.options = pollData.options.filter(opt => opt.text.trim())
                }

                // 发送到服务器
                const response = await this.$api.post('/classroom/poll/create', pollData)

                if (response.success) {
                    this.activePoll = response.data
                    this.startPollTimer()
                    this.broadcastPollEvent('pollCreated', pollData)

                    this.isCreating = false
                    this.$message.success('投票创建成功')
                }
            } catch (error) {
                console.error('创建投票失败:', error)
                this.$message.error('创建投票失败')
            } finally {
                this.creating = false
            }
        },

        async endPoll () {
            if (!this.activePoll) return

            try {
                const response = await this.$api.post(`/classroom/poll/${this.activePoll.id}/end`)

                if (response.success) {
                    this.activePoll.status = 'ended'
                    this.stopPollTimer()
                    this.loadPollResults()
                    this.broadcastPollEvent('pollEnded', { pollId: this.activePoll.id })

                    this.$message.success('投票已结束')
                }
            } catch (error) {
                console.error('结束投票失败:', error)
                this.$message.error('结束投票失败')
            }
        },

        // 投票参与
        onVoteChange () {
            if (this.activePoll && this.activePoll.showRealtime && this.userVote.submitted) {
                this.submitVote(true) // 自动提交更新
            }
        },

        async submitVote (isUpdate = false) {
            this.submitting = true

            try {
                const voteData = {
                    pollId: this.activePoll.id,
                    userId: this.$store.getters.userId,
                    userName: this.$store.getters.username,
                    classroomId: this.classroomId,
                    timestamp: new Date().toISOString()
                }

                // 根据投票类型添加答案数据
                switch (this.activePoll.type) {
                case 'single':
                    voteData.answer = { selectedOption: this.userVote.selectedOption }
                    break
                case 'multiple':
                    voteData.answer = { selectedOptions: this.userVote.selectedOptions }
                    break
                case 'text':
                    voteData.answer = { textAnswer: this.userVote.textAnswer }
                    break
                case 'rating':
                    voteData.answer = { rating: this.userVote.rating }
                    break
                }

                const endpoint = isUpdate ? '/classroom/poll/update-vote' : '/classroom/poll/vote'
                const response = await this.$api.post(endpoint, voteData)

                if (response.success) {
                    this.userVote.submitted = true
                    this.broadcastPollEvent('voteSubmitted', voteData)

                    if (!isUpdate) {
                        this.$message.success('投票提交成功')
                    }
                }
            } catch (error) {
                console.error('提交投票失败:', error)
                this.$message.error('提交投票失败')
            } finally {
                this.submitting = false
            }
        },

        changeVote () {
            this.userVote.submitted = false
        },

        // 结果处理
        async loadPollResults () {
            if (!this.activePoll) return

            try {
                const response = await this.$api.get(`/classroom/poll/${this.activePoll.id}/results`)

                if (response.success) {
                    this.pollResults = response.data
                    this.showResults = true
                    this.updatePollStats()

                    if (this.userRole === 'teacher') {
                        this.renderResultsChart()
                    }
                }
            } catch (error) {
                console.error('加载投票结果失败:', error)
            }
        },

        updatePollStats () {
            if (!this.pollResults) return

            this.pollStats = {
                totalVotes: this.pollResults.totalVotes || 0,
                totalStudents: this.pollResults.totalStudents || 0,
                participationRate: this.pollResults.totalStudents > 0
                    ? (this.pollResults.totalVotes / this.pollResults.totalStudents) * 100
                    : 0
            }
        },

        renderResultsChart () {
            // 这里可以集成图表库如ECharts
            // 暂时使用简单的实现
        },

        // 计时器管理
        startPollTimer () {
            if (!this.activePoll || !this.activePoll.duration) return

            this.timeRemaining = this.activePoll.duration

            this.timer = setInterval(() => {
                this.timeRemaining--

                if (this.timeRemaining <= 0) {
                    this.endPoll()
                }
            }, 1000)
        },

        stopPollTimer () {
            if (this.timer) {
                clearInterval(this.timer)
                this.timer = null
            }
        },

        // 历史记录
        async loadHistoricalPolls () {
            try {
                const response = await this.$api.get(`/classroom/${this.classroomId}/polls/history`)

                if (response.success) {
                    this.historicalPolls = response.data
                }
            } catch (error) {
                console.error('加载历史投票失败:', error)
            }
        },

        viewPollResults (poll) {
            // 查看历史投票结果
        },

        duplicatePoll (poll) {
            this.newPoll = {
                title: poll.title + ' (复制)',
                type: poll.type,
                options: [...poll.options],
                anonymous: poll.anonymous,
                showRealtime: poll.showRealtime,
                allowChange: poll.allowChange,
                duration: poll.duration
            }
            this.startCreating()
        },

        async deletePoll () {
            if (!this.activePoll) return

            try {
                const response = await this.$api.delete(`/classroom/poll/${this.activePoll.id}`)

                if (response.success) {
                    this.activePoll = null
                    this.pollResults = null
                    this.showResults = false
                    this.stopPollTimer()

                    this.$message.success('投票已删除')
                }
            } catch (error) {
                console.error('删除投票失败:', error)
                this.$message.error('删除投票失败')
            }
        },

        async deleteHistoricalPoll (pollId) {
            try {
                const response = await this.$api.delete(`/classroom/poll/${pollId}`)

                if (response.success) {
                    this.historicalPolls = this.historicalPolls.filter(p => p.id !== pollId)
                    this.$message.success('投票已删除')
                }
            } catch (error) {
                console.error('删除历史投票失败:', error)
                this.$message.error('删除失败')
            }
        },

        // 导出结果
        exportResults () {
            if (!this.pollResults) return

            const data = {
                poll: this.activePoll,
                results: this.pollResults,
                exportTime: new Date().toISOString()
            }

            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json'
            })

            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `poll-results-${this.activePoll.id}-${Date.now()}.json`
            a.click()

            URL.revokeObjectURL(url)
        },

        // WebSocket通信
        initWebSocket () {
            const wsUrl = `ws://localhost:3001/poll/${this.classroomId}`
            this.ws = new WebSocket(wsUrl)

            this.ws.onopen = () => {
            }

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data)
                this.handlePollMessage(data)
            }

            this.ws.onerror = (error) => {
                console.error('投票WebSocket错误:', error)
            }

            this.ws.onclose = () => {
                setTimeout(() => this.initWebSocket(), 3000)
            }
        },

        handlePollMessage (data) {
            switch (data.type) {
            case 'pollCreated':
                if (this.userRole === 'student') {
                    this.activePoll = data.poll
                    this.resetUserVote()
                    this.$message.info('老师发起了新投票')
                }
                break
            case 'pollEnded':
                if (this.activePoll && this.activePoll.id === data.pollId) {
                    this.activePoll.status = 'ended'
                    this.stopPollTimer()
                    this.$message.info('投票已结束')
                }
                break
            case 'voteSubmitted':
                if (this.activePoll && this.activePoll.showRealtime) {
                    this.loadPollResults()
                }
                break
            }
        },

        broadcastPollEvent (type, data) {
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

        resetUserVote () {
            this.userVote = {
                selectedOption: null,
                selectedOptions: [],
                textAnswer: '',
                rating: 0,
                submitted: false
            }
        },

        // 工具函数
        formatTime (timestamp) {
            return new Date(timestamp).toLocaleString()
        },

        cleanup () {
            this.stopPollTimer()
            if (this.ws) {
                this.ws.close()
            }
        }
    }
}
</script>

<style scoped>
.classroom-poll {
  padding: 16px;
}

.creator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.create-form {
  margin-bottom: 24px;
}

.options-editor {
  max-width: 500px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.poll-settings {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.poll-control {
  margin-bottom: 24px;
}

.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.control-actions {
  margin-bottom: 16px;
}

.poll-stats {
  margin-top: 16px;
}

.poll-participant {
  margin-bottom: 24px;
}

.poll-header {
  margin-bottom: 16px;
}

.poll-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.time-remaining {
  color: #ff4d4f;
  font-weight: 500;
}

.vote-options {
  margin: 16px 0;
}

.vote-option {
  margin-bottom: 12px;
}

.option-result {
  margin-top: 4px;
  padding-left: 24px;
}

.vote-count {
  margin-left: 8px;
  font-size: 12px;
  color: #666;
}

.vote-text {
  margin: 16px 0;
}

.vote-rating {
  margin: 16px 0;
}

.rating-container {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.rating-label {
  font-weight: 500;
}

.rating-value {
  color: #666;
}

.rating-result {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
}

.vote-actions {
  margin-top: 20px;
}

.poll-results {
  margin-bottom: 24px;
}

.chart-container {
  margin: 16px 0;
}

.text-results {
  margin: 16px 0;
}

.text-stats {
  margin-bottom: 16px;
}

.text-answers {
  max-height: 400px;
  overflow-y: auto;
}

.text-answer {
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

.answer-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
  color: #666;
}

.answer-author {
  font-weight: 500;
  color: #1890ff;
}

.answer-content {
  color: #333;
  line-height: 1.5;
}

.rating-results {
  margin: 16px 0;
}

.rating-stats {
  margin-bottom: 24px;
}

.rating-distribution {
  margin-top: 16px;
}

.rating-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.rating-star {
  width: 40px;
  font-size: 12px;
}

.participants-list {
  margin-top: 24px;
}

.participants {
  margin-top: 12px;
}

.poll-history .separator {
  margin: 0 8px;
  color: #ccc;
}

@media (max-width: 768px) {
  .poll-header {
    text-align: center;
  }

  .control-header {
    flex-direction: column;
    gap: 8px;
  }

  .rating-container {
    flex-direction: column;
    align-items: flex-start;
  }

  .rating-result {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
