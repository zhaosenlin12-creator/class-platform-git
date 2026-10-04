<template>
  <div class="exam-monitor">
    <!-- 监控概览面板 -->
    <div v-if="userRole === 'teacher'" class="monitor-overview">
      <a-card title="考试监控中心">
        <div class="overview-stats">
          <a-row :gutter="16">
            <a-col span="{6}">
              <a-statistic
                title="在线考生"
                :value="onlineStudents"
                :total="totalStudents"
                :formatter="(value, total) => `${value}/${total}`"
                :value-style="{ color: '#3f8600' }"
              />
            </a-col>
            <a-col span="{6}">
              <a-statistic
                title="异常行为"
                :value="suspiciousCount"
                :value-style="{ color: suspiciousCount > 0 ? '#cf1322' : '#3f8600' }"
                suffix="次"
              />
            </a-col>
            <a-col span="{6}">
              <a-statistic
                title="切屏次数"
                :value="totalSwitchCount"
                :value-style="{ color: totalSwitchCount > 10 ? '#cf1322' : '#faad14' }"
                suffix="次"
              />
            </a-col>
            <a-col span="{6}">
              <a-statistic
                title="网络异常"
                :value="networkIssueCount"
                :value-style="{ color: networkIssueCount > 0 ? '#cf1322' : '#3f8600' }"
                suffix="人"
              />
            </a-col>
          </a-row>
        </div>

        <div class="monitor-controls">
          <a-space>
            <a-button
              type="primary"
              @click="toggleMonitoring"
              :loading="monitoringToggling"
            >
              {{ isMonitoring ? '停止监控' : '开始监控' }}
            </a-button>
            <a-button @click="refreshMonitorData">
              <a-icon type="reload" />
              刷新数据
            </a-button>
            <a-button @click="exportMonitorReport">
              <a-icon type="download" />
              导出报告
            </a-button>
            <a-button
              type="danger"
              @click="showSuspiciousOnly = !showSuspiciousOnly"
              :ghost="!showSuspiciousOnly"
            >
              {{ showSuspiciousOnly ? '显示全部' : '仅显示异常' }}
            </a-button>
          </a-space>
        </div>
      </a-card>
    </div>

    <!-- 学生监控列表 -->
    <div class="student-monitor-list">
      <a-card title="实时监控画面">
        <div class="monitor-grid">
          <div
            v-for="student in filteredStudents"
            :key="student.userId"
            class="monitor-item"
            :class="{
              'suspicious': student.suspiciousLevel > 2,
              'warning': student.suspiciousLevel > 0 && student.suspiciousLevel <= 2,
              'offline': !student.isOnline
            }"
          >
            <!-- 学生摄像头画面 -->
            <div class="student-camera">
              <video
                :ref="`video_${student.userId}`"
                :srcObject="student.videoStream"
                autoplay
                muted
                class="camera-feed"
              ></video>
              <div v-if="!student.cameraEnabled" class="camera-disabled">
                <a-icon type="video-camera" />
                <span>摄像头未开启</span>
              </div>
              <div v-if="!student.isOnline" class="student-offline">
                <a-icon type="disconnect" />
                <span>学生离线</span>
              </div>
            </div>

            <!-- 学生信息栏 -->
            <div class="student-info">
              <div class="student-name">
                <a-avatar size="small" :src="student.avatar">
                  {{ student.name.charAt(0) }}
                </a-avatar>
                <span>{{ student.name }}</span>
                <a-tag
                  :color="getStatusColor(student)"
                  size="small"
                >
                  {{ getStatusText(student) }}
                </a-tag>
              </div>

              <!-- 风险指标 -->
              <div class="risk-indicators">
                <div class="indicator-item">
                  <a-icon type="eye" />
                  <span class="indicator-label">专注度</span>
                  <a-progress
                    :percent="student.focusLevel"
                    size="small"
                    :status="student.focusLevel < 70 ? 'exception' : 'success'"
                    :show-info="false"
                  />
                  <span class="indicator-value">{{ student.focusLevel }}%</span>
                </div>

                <div class="indicator-item">
                  <a-icon type="swap" />
                  <span class="indicator-label">切屏</span>
                  <span
                    class="indicator-value"
                    :class="{ 'high-risk': student.switchCount > 5 }"
                  >
                    {{ student.switchCount }}次
                  </span>
                </div>

                <div class="indicator-item">
                  <a-icon type="clock-circle" />
                  <span class="indicator-label">离开时间</span>
                  <span
                    class="indicator-value"
                    :class="{ 'high-risk': student.awayTime > 180 }"
                  >
                    {{ formatTime(student.awayTime) }}
                  </span>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="student-actions">
                <a-space size="small">
                  <a-tooltip title="查看详情">
                    <a-button
                      type="text"
                      size="small"
                      @click="viewStudentDetail(student)"
                    >
                      <a-icon type="info-circle" />
                    </a-button>
                  </a-tooltip>
                  <a-tooltip title="发送提醒">
                    <a-button
                      type="text"
                      size="small"
                      @click="sendWarning(student)"
                    >
                      <a-icon type="bell" />
                    </a-button>
                  </a-tooltip>
                  <a-tooltip title="强制提交">
                    <a-button
                      type="text"
                      size="small"
                      danger
                      @click="forceSubmit(student)"
                      v-if="student.suspiciousLevel > 3"
                    >
                      <a-icon type="stop" />
                    </a-button>
                  </a-tooltip>
                </a-space>
              </div>
            </div>

            <!-- 异常警告标记 -->
            <div v-if="student.suspiciousLevel > 0" class="suspicious-badge">
              <a-badge :count="student.suspiciousLevel" :offset="[-10, 10]">
                <a-icon type="warning" />
              </a-badge>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <a-empty
          v-if="filteredStudents.length === 0"
          description="没有学生在线或符合筛选条件"
        />
      </a-card>
    </div>

    <!-- 异常行为日志 -->
    <div class="behavior-log">
      <a-card title="异常行为记录">
        <div class="log-controls">
          <a-space>
            <a-select v-model="logFilter" style="width: 150px">
              <a-select-option value="all">全部行为</a-select-option>
              <a-select-option value="switch">切屏行为</a-select-option>
              <a-select-option value="face">人脸异常</a-select-option>
              <a-select-option value="network">网络异常</a-select-option>
              <a-select-option value="suspicious">可疑行为</a-select-option>
            </a-select>
            <a-input-search
              v-model="searchKeyword"
              placeholder="搜索学生姓名..."
              style="width: 200px"
            />
            <a-button @click="clearLogs" type="text" danger>
              清空日志
            </a-button>
          </a-space>
        </div>

        <a-timeline class="behavior-timeline">
          <a-timeline-item
            v-for="log in filteredLogs"
            :key="log.id"
            :color="getLogColor(log.type)"
          >
            <template #dot>
              <a-icon :type="getLogIcon(log.type)" />
            </template>
            <div class="log-content">
              <div class="log-header">
                <span class="log-time">{{ formatTimestamp(log.timestamp) }}</span>
                <span class="log-student">{{ log.studentName }}</span>
                <a-tag :color="getLogTagColor(log.type)" size="small">
                  {{ getLogTypeText(log.type) }}
                </a-tag>
                <a-tag
                  v-if="log.riskLevel"
                  :color="getRiskLevelColor(log.riskLevel)"
                  size="small"
                >
                  {{ log.riskLevel }}
                </a-tag>
              </div>
              <div class="log-description">{{ log.description }}</div>
              <div v-if="log.evidence" class="log-evidence">
                <a-button type="link" size="small" @click="viewEvidence(log.evidence)">
                  查看证据
                </a-button>
              </div>
            </div>
          </a-timeline-item>
        </a-timeline>

        <div v-if="filteredLogs.length === 0" style="text-align: center; padding: 20px;">
          <a-empty description="暂无异常行为记录" />
        </div>
      </a-card>
    </div>

    <!-- 学生详情弹窗 -->
    <a-modal
      v-model:visible="studentDetailVisible"
      title="学生监控详情"
      width="800px"
      :footer="null"
    >
      <div v-if="selectedStudent" class="student-detail-content">
        <a-tabs>
          <a-tab-pane key="overview" tab="总览">
            <div class="detail-overview">
              <a-descriptions :column="2" bordered>
                <a-descriptions-item label="学生姓名">
                  {{ selectedStudent.name }}
                </a-descriptions-item>
                <a-descriptions-item label="学号">
                  {{ selectedStudent.studentId }}
                </a-descriptions-item>
                <a-descriptions-item label="考试状态">
                  <a-tag :color="getStatusColor(selectedStudent)">
                    {{ getStatusText(selectedStudent) }}
                  </a-tag>
                </a-descriptions-item>
                <a-descriptions-item label="风险等级">
                  <a-tag :color="getRiskLevelColor(selectedStudent.riskLevel)">
                    {{ selectedStudent.riskLevel }}
                  </a-tag>
                </a-descriptions-item>
                <a-descriptions-item label="专注度">
                  <a-progress
                    :percent="selectedStudent.focusLevel"
                    :status="selectedStudent.focusLevel < 70 ? 'exception' : 'success'"
                  />
                </a-descriptions-item>
                <a-descriptions-item label="切屏次数">
                  <span :class="{ 'high-risk': selectedStudent.switchCount > 5 }">
                    {{ selectedStudent.switchCount }}次
                  </span>
                </a-descriptions-item>
                <a-descriptions-item label="累计离开时间">
                  <span :class="{ 'high-risk': selectedStudent.awayTime > 180 }">
                    {{ formatTime(selectedStudent.awayTime) }}
                  </span>
                </a-descriptions-item>
                <a-descriptions-item label="网络状态">
                  <a-tag :color="selectedStudent.networkStable ? 'green' : 'red'">
                    {{ selectedStudent.networkStable ? '稳定' : '不稳定' }}
                  </a-tag>
                </a-descriptions-item>
              </a-descriptions>
            </div>
          </a-tab-pane>

          <a-tab-pane key="timeline" tab="行为时间线">
            <div class="behavior-timeline-detail">
              <a-timeline>
                <a-timeline-item
                  v-for="event in selectedStudent.behaviorHistory"
                  :key="event.id"
                  :color="getLogColor(event.type)"
                >
                  <div class="timeline-content">
                    <div class="timeline-time">{{ formatTimestamp(event.timestamp) }}</div>
                    <div class="timeline-desc">{{ event.description }}</div>
                  </div>
                </a-timeline-item>
              </a-timeline>
            </div>
          </a-tab-pane>

          <a-tab-pane key="screenshots" tab="监控截图">
            <div class="screenshots-gallery">
              <div class="screenshot-item" v-for="screenshot in selectedStudent.screenshots" :key="screenshot.id">
                <img :src="screenshot.url" :alt="screenshot.description" />
                <div class="screenshot-info">
                  <div class="screenshot-time">{{ formatTimestamp(screenshot.timestamp) }}</div>
                  <div class="screenshot-desc">{{ screenshot.description }}</div>
                </div>
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>
    </a-modal>

    <!-- 警告发送弹窗 -->
    <a-modal
      v-model:visible="warningModalVisible"
      title="发送警告"
      @ok="sendWarningMessage"
      :confirm-loading="sendingWarning"
    >
      <a-form layout="vertical">
        <a-form-item label="警告类型">
          <a-select v-model="warningData.type">
            <a-select-option value="focus">请专注考试</a-select-option>
            <a-select-option value="camera">请确保摄像头开启</a-select-option>
            <a-select-option value="switch">请勿切换应用程序</a-select-option>
            <a-select-option value="behavior">检测到异常行为</a-select-option>
            <a-select-option value="custom">自定义警告</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item v-if="warningData.type === 'custom'" label="自定义内容">
          <a-textarea
            v-model="warningData.customMessage"
            placeholder="请输入警告内容..."
            :rows="3"
            :maxlength="200"
            show-count
          />
        </a-form-item>
        <a-form-item>
          <a-checkbox v-model="warningData.recordIncident">
            记录为违纪事件
          </a-checkbox>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
export default {
    name: 'ExamMonitor',
    props: {
        examId: {
            type: String,
            required: true
        },
        userRole: {
            type: String,
            default: 'teacher'
        }
    },
    data () {
        return {
            // 监控状态
            isMonitoring: false,
            monitoringToggling: false,

            // 学生数据
            students: [],
            totalStudents: 0,
            onlineStudents: 0,

            // 统计数据
            suspiciousCount: 0,
            totalSwitchCount: 0,
            networkIssueCount: 0,

            // 筛选控制
            showSuspiciousOnly: false,
            logFilter: 'all',
            searchKeyword: '',

            // 行为日志
            behaviorLogs: [],

            // 弹窗状态
            studentDetailVisible: false,
            selectedStudent: null,

            // 警告发送
            warningModalVisible: false,
            warningData: {
                type: 'focus',
                customMessage: '',
                recordIncident: false
            },
            sendingWarning: false,

            // WebSocket连接
            ws: null,

            // 更新定时器
            updateTimer: null,

            // 监控配置
            monitorConfig: {
                faceDetection: true,
                tabSwitchDetection: true,
                screenCaptureInterval: 30000,
                focusCheckInterval: 5000,
                networkCheckInterval: 10000
            }
        }
    },
    computed: {
        filteredStudents () {
            let filtered = this.students

            if (this.showSuspiciousOnly) {
                filtered = filtered.filter(student => student.suspiciousLevel > 0)
            }

            if (this.searchKeyword.trim()) {
                const keyword = this.searchKeyword.toLowerCase()
                filtered = filtered.filter(student =>
                    student.name.toLowerCase().includes(keyword) ||
          student.studentId.toLowerCase().includes(keyword)
                )
            }

            return filtered
        },

        filteredLogs () {
            let filtered = this.behaviorLogs

            if (this.logFilter !== 'all') {
                filtered = filtered.filter(log => log.type === this.logFilter)
            }

            if (this.searchKeyword.trim()) {
                const keyword = this.searchKeyword.toLowerCase()
                filtered = filtered.filter(log =>
                    log.studentName.toLowerCase().includes(keyword)
                )
            }

            return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        }
    },
    mounted () {
        this.initializeMonitor()
        this.setupWebSocket()
        this.startPeriodicUpdates()
    },
    beforeDestroy () {
        this.cleanup()
    },
    methods: {
    // 初始化监控
        async initializeMonitor () {
            try {
                await this.loadExamData()
                await this.loadStudentList()
                this.setupMediaStreams()

                this.$message.success('监控系统初始化完成')
            } catch (error) {
                console.error('监控初始化失败:', error)
                this.$message.error('监控系统初始化失败')
            }
        },

        async loadExamData () {
            const response = await this.$api.get(`/exam/${this.examId}/info`)
            if (response.success) {
                this.examInfo = response.data
            }
        },

        async loadStudentList () {
            const response = await this.$api.get(`/exam/${this.examId}/students`)
            if (response.success) {
                this.students = response.data.map(student => ({
                    ...student,
                    isOnline: false,
                    cameraEnabled: false,
                    videoStream: null,
                    focusLevel: 100,
                    switchCount: 0,
                    awayTime: 0,
                    suspiciousLevel: 0,
                    networkStable: true,
                    riskLevel: '低风险',
                    behaviorHistory: [],
                    screenshots: []
                }))
                this.totalStudents = this.students.length
            }
        },

        // 媒体流管理
        setupMediaStreams () {
            this.students.forEach(student => {
                this.requestStudentCamera(student)
            })
        },

        async requestStudentCamera (student) {
            try {
                // 通过WebRTC获取学生摄像头流
                const stream = await this.getStudentVideoStream(student.userId)
                student.videoStream = stream
                student.cameraEnabled = true

                // 更新视频元素
                this.$nextTick(() => {
                    const video = this.$refs[`video_${student.userId}`]
                    if (video && video[0]) {
                        video[0].srcObject = stream
                    }
                })
            } catch (error) {
                console.error(`获取学生${student.name}摄像头失败:`, error)
                student.cameraEnabled = false
            }
        },

        async getStudentVideoStream (userId) {
            // 这里应该通过WebRTC信令服务获取学生的视频流
            // 暂时返回模拟数据
            return new Promise((resolve, reject) => {
                navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                    .then(stream => resolve(stream))
                    .catch(error => reject(error))
            })
        },

        // 监控控制
        async toggleMonitoring () {
            this.monitoringToggling = true

            try {
                if (this.isMonitoring) {
                    await this.stopMonitoring()
                } else {
                    await this.startMonitoring()
                }
            } catch (error) {
                console.error('监控切换失败:', error)
                this.$message.error('监控状态切换失败')
            } finally {
                this.monitoringToggling = false
            }
        },

        async startMonitoring () {
            const response = await this.$api.post(`/exam/${this.examId}/monitor/start`)
            if (response.success) {
                this.isMonitoring = true
                this.startBehaviorDetection()
                this.broadcastToStudents('monitoring_started')
                this.$message.success('监控已开启')
            }
        },

        async stopMonitoring () {
            const response = await this.$api.post(`/exam/${this.examId}/monitor/stop`)
            if (response.success) {
                this.isMonitoring = false
                this.stopBehaviorDetection()
                this.broadcastToStudents('monitoring_stopped')
                this.$message.success('监控已停止')
            }
        },

        // 行为检测
        startBehaviorDetection () {
            this.students.forEach(student => {
                this.startStudentMonitoring(student)
            })
        },

        startStudentMonitoring (student) {
            // 人脸检测
            if (this.monitorConfig.faceDetection) {
                this.startFaceDetection(student)
            }

            // 专注度检测
            this.startFocusDetection(student)

            // 屏幕截图
            this.startScreenCapture(student)
        },

        startFaceDetection (student) {
            // 使用人脸识别API检测学生是否在屏幕前
            setInterval(() => {
                this.detectStudentFace(student)
            }, this.monitorConfig.focusCheckInterval)
        },

        async detectStudentFace (student) {
            if (!student.videoStream) return

            try {
                // 模拟人脸检测逻辑
                const faceDetected = Math.random() > 0.1 // 90%概率检测到人脸

                if (!faceDetected) {
                    student.focusLevel = Math.max(student.focusLevel - 10, 0)
                    student.awayTime += this.monitorConfig.focusCheckInterval / 1000

                    this.addBehaviorLog({
                        studentId: student.userId,
                        studentName: student.name,
                        type: 'face',
                        description: '检测到学生离开摄像头画面',
                        riskLevel: '中风险',
                        timestamp: new Date()
                    })

                    student.suspiciousLevel++
                } else {
                    student.focusLevel = Math.min(student.focusLevel + 2, 100)
                }

                this.updateStudentRiskLevel(student)
            } catch (error) {
                console.error('人脸检测失败:', error)
            }
        },

        startFocusDetection (student) {
            // 检测窗口焦点变化（需要学生端配合）
            setInterval(() => {
                this.checkStudentFocus(student)
            }, this.monitorConfig.focusCheckInterval)
        },

        checkStudentFocus (student) {
            // 通过WebSocket询问学生端窗口状态
            this.sendToStudent(student.userId, {
                type: 'focus_check',
                timestamp: new Date()
            })
        },

        startScreenCapture (student) {
            setInterval(() => {
                this.captureStudentScreen(student)
            }, this.monitorConfig.screenCaptureInterval)
        },

        async captureStudentScreen (student) {
            try {
                // 请求学生端截图
                this.sendToStudent(student.userId, {
                    type: 'screen_capture',
                    timestamp: new Date()
                })
            } catch (error) {
                console.error('屏幕截图失败:', error)
            }
        },

        stopBehaviorDetection () {
            // 停止所有检测定时器
            if (this.updateTimer) {
                clearInterval(this.updateTimer)
            }
        },

        // 风险等级评估
        updateStudentRiskLevel (student) {
            let riskScore = 0

            // 根据各项指标计算风险分数
            if (student.focusLevel < 70) riskScore += 2
            if (student.switchCount > 3) riskScore += 2
            if (student.switchCount > 5) riskScore += 3
            if (student.awayTime > 120) riskScore += 2
            if (student.awayTime > 300) riskScore += 3
            if (!student.networkStable) riskScore += 1

            // 更新风险等级
            if (riskScore <= 2) {
                student.riskLevel = '低风险'
                student.suspiciousLevel = 0
            } else if (riskScore <= 5) {
                student.riskLevel = '中风险'
                student.suspiciousLevel = Math.min(student.suspiciousLevel + 1, 3)
            } else {
                student.riskLevel = '高风险'
                student.suspiciousLevel = Math.min(student.suspiciousLevel + 2, 5)
            }

            this.updateOverallStats()
        },

        updateOverallStats () {
            this.onlineStudents = this.students.filter(s => s.isOnline).length
            this.suspiciousCount = this.students.reduce((sum, s) => sum + s.suspiciousLevel, 0)
            this.totalSwitchCount = this.students.reduce((sum, s) => sum + s.switchCount, 0)
            this.networkIssueCount = this.students.filter(s => !s.networkStable).length
        },

        // 学生操作
        viewStudentDetail (student) {
            this.selectedStudent = student
            this.studentDetailVisible = true
        },

        sendWarning (student) {
            this.selectedStudent = student
            this.warningModalVisible = true
        },

        async sendWarningMessage () {
            if (!this.selectedStudent) return

            this.sendingWarning = true

            try {
                const warningMessage = this.getWarningMessage()

                // 发送警告到学生端
                this.sendToStudent(this.selectedStudent.userId, {
                    type: 'warning',
                    message: warningMessage,
                    timestamp: new Date()
                })

                // 记录警告日志
                this.addBehaviorLog({
                    studentId: this.selectedStudent.userId,
                    studentName: this.selectedStudent.name,
                    type: 'warning',
                    description: `发送警告: ${warningMessage}`,
                    riskLevel: '提醒',
                    timestamp: new Date()
                })

                // 如果需要记录违纪事件
                if (this.warningData.recordIncident) {
                    await this.recordIncident(this.selectedStudent, warningMessage)
                }

                this.warningModalVisible = false
                this.$message.success('警告已发送')
            } catch (error) {
                console.error('发送警告失败:', error)
                this.$message.error('警告发送失败')
            } finally {
                this.sendingWarning = false
            }
        },

        getWarningMessage () {
            const messages = {
                focus: '请专注于考试，不要分心',
                camera: '请确保摄像头正常开启，保持画面清晰',
                switch: '检测到您切换了应用程序，请专注于考试界面',
                behavior: '检测到可疑行为，请保持正常考试状态',
                custom: this.warningData.customMessage
            }
            return messages[this.warningData.type] || messages.focus
        },

        async forceSubmit (student) {
            this.$confirm({
                title: '确认强制提交',
                content: `确定要强制提交学生 ${student.name} 的考试吗？此操作不可撤销。`,
                onOk: async () => {
                    try {
                        const response = await this.$api.post(`/exam/${this.examId}/force-submit`, {
                            studentId: student.userId
                        })

                        if (response.success) {
                            // 发送强制提交指令
                            this.sendToStudent(student.userId, {
                                type: 'force_submit',
                                message: '由于检测到严重违纪行为，您的考试已被强制提交',
                                timestamp: new Date()
                            })

                            // 记录事件
                            this.addBehaviorLog({
                                studentId: student.userId,
                                studentName: student.name,
                                type: 'force_submit',
                                description: '强制提交考试（检测到严重违纪）',
                                riskLevel: '严重',
                                timestamp: new Date()
                            })

                            student.isOnline = false
                            this.$message.success('已强制提交学生考试')
                        }
                    } catch (error) {
                        console.error('强制提交失败:', error)
                        this.$message.error('强制提交失败')
                    }
                }
            })
        },

        // 日志管理
        addBehaviorLog (logData) {
            const log = {
                id: Date.now() + Math.random(),
                ...logData,
                timestamp: logData.timestamp.toISOString()
            }

            this.behaviorLogs.unshift(log)

            // 限制日志数量
            if (this.behaviorLogs.length > 1000) {
                this.behaviorLogs = this.behaviorLogs.slice(0, 1000)
            }

            // 添加到学生行为历史
            const student = this.students.find(s => s.userId === logData.studentId)
            if (student) {
                student.behaviorHistory.unshift(log)
            }
        },

        clearLogs () {
            this.$confirm({
                title: '确认清空日志',
                content: '确定要清空所有行为日志吗？',
                onOk: () => {
                    this.behaviorLogs = []
                    this.students.forEach(student => {
                        student.behaviorHistory = []
                    })
                    this.$message.success('日志已清空')
                }
            })
        },

        // WebSocket通信
        setupWebSocket () {
            const wsUrl = `ws://localhost:3001/exam-monitor/${this.examId}`
            this.ws = new WebSocket(wsUrl)

            this.ws.onopen = () => {
            }

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data)
                this.handleMonitorMessage(data)
            }

            this.ws.onerror = (error) => {
                console.error('监控WebSocket错误:', error)
            }

            this.ws.onclose = () => {
                setTimeout(() => this.setupWebSocket(), 3000)
            }
        },

        handleMonitorMessage (data) {
            switch (data.type) {
            case 'student_online':
                this.handleStudentOnline(data)
                break
            case 'student_offline':
                this.handleStudentOffline(data)
                break
            case 'tab_switch':
                this.handleTabSwitch(data)
                break
            case 'focus_lost':
                this.handleFocusLost(data)
                break
            case 'network_issue':
                this.handleNetworkIssue(data)
                break
            case 'screen_capture_result':
                this.handleScreenCaptureResult(data)
                break
            }
        },

        handleStudentOnline (data) {
            const student = this.students.find(s => s.userId === data.studentId)
            if (student) {
                student.isOnline = true
                this.requestStudentCamera(student)
            }
        },

        handleStudentOffline (data) {
            const student = this.students.find(s => s.userId === data.studentId)
            if (student) {
                student.isOnline = false
                student.cameraEnabled = false
            }
        },

        handleTabSwitch (data) {
            const student = this.students.find(s => s.userId === data.studentId)
            if (student) {
                student.switchCount++
                student.focusLevel = Math.max(student.focusLevel - 5, 0)

                this.addBehaviorLog({
                    studentId: data.studentId,
                    studentName: student.name,
                    type: 'switch',
                    description: `切换到应用: ${data.appName || '未知应用'}`,
                    riskLevel: student.switchCount > 3 ? '中风险' : '低风险',
                    timestamp: new Date(data.timestamp)
                })

                this.updateStudentRiskLevel(student)
            }
        },

        handleFocusLost (data) {
            const student = this.students.find(s => s.userId === data.studentId)
            if (student) {
                student.focusLevel = Math.max(student.focusLevel - 3, 0)
                this.updateStudentRiskLevel(student)
            }
        },

        handleNetworkIssue (data) {
            const student = this.students.find(s => s.userId === data.studentId)
            if (student) {
                student.networkStable = false

                this.addBehaviorLog({
                    studentId: data.studentId,
                    studentName: student.name,
                    type: 'network',
                    description: '网络连接不稳定',
                    riskLevel: '低风险',
                    timestamp: new Date(data.timestamp)
                })

                this.updateStudentRiskLevel(student)
            }
        },

        handleScreenCaptureResult (data) {
            const student = this.students.find(s => s.userId === data.studentId)
            if (student && data.screenshot) {
                student.screenshots.push({
                    id: Date.now(),
                    url: data.screenshot,
                    description: '监控截图',
                    timestamp: new Date(data.timestamp)
                })

                // 限制截图数量
                if (student.screenshots.length > 50) {
                    student.screenshots = student.screenshots.slice(-50)
                }
            }
        },

        sendToStudent (studentId, message) {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'to_student',
                    studentId: studentId,
                    data: message,
                    timestamp: new Date().toISOString()
                }))
            }
        },

        broadcastToStudents (type, data = {}) {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({
                    type: 'broadcast',
                    data: { type, ...data },
                    timestamp: new Date().toISOString()
                }))
            }
        },

        // 数据刷新
        async refreshMonitorData () {
            try {
                await this.loadStudentList()
                this.updateOverallStats()
                this.$message.success('数据已刷新')
            } catch (error) {
                console.error('刷新数据失败:', error)
                this.$message.error('数据刷新失败')
            }
        },

        startPeriodicUpdates () {
            this.updateTimer = setInterval(() => {
                this.updateOverallStats()
                this.requestPeriodicData()
            }, 10000)
        },

        requestPeriodicData () {
            this.students.forEach(student => {
                if (student.isOnline) {
                    this.sendToStudent(student.userId, {
                        type: 'status_request',
                        timestamp: new Date()
                    })
                }
            })
        },

        // 导出功能
        async exportMonitorReport () {
            try {
                const reportData = {
                    examId: this.examId,
                    exportTime: new Date().toISOString(),
                    summary: {
                        totalStudents: this.totalStudents,
                        onlineStudents: this.onlineStudents,
                        suspiciousCount: this.suspiciousCount,
                        totalSwitchCount: this.totalSwitchCount,
                        networkIssueCount: this.networkIssueCount
                    },
                    students: this.students.map(student => ({
                        ...student,
                        videoStream: undefined // 排除不可序列化的数据
                    })),
                    behaviorLogs: this.behaviorLogs
                }

                const blob = new Blob([JSON.stringify(reportData, null, 2)], {
                    type: 'application/json'
                })

                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `exam-monitor-report-${this.examId}-${Date.now()}.json`
                a.click()

                URL.revokeObjectURL(url)
                this.$message.success('监控报告已导出')
            } catch (error) {
                console.error('导出失败:', error)
                this.$message.error('导出失败')
            }
        },

        // 工具函数
        getStatusColor (student) {
            if (!student.isOnline) return 'default'
            if (student.suspiciousLevel > 3) return 'red'
            if (student.suspiciousLevel > 0) return 'orange'
            return 'green'
        },

        getStatusText (student) {
            if (!student.isOnline) return '离线'
            if (student.suspiciousLevel > 3) return '高风险'
            if (student.suspiciousLevel > 0) return '有异常'
            return '正常'
        },

        getRiskLevelColor (level) {
            const colors = {
                '低风险': 'green',
                '中风险': 'orange',
                '高风险': 'red',
                '严重': 'purple'
            }
            return colors[level] || 'default'
        },

        getLogColor (type) {
            const colors = {
                switch: 'orange',
                face: 'red',
                network: 'blue',
                warning: 'purple',
                force_submit: 'red',
                suspicious: 'red'
            }
            return colors[type] || 'gray'
        },

        getLogIcon (type) {
            const icons = {
                switch: 'swap',
                face: 'user',
                network: 'wifi',
                warning: 'bell',
                force_submit: 'stop',
                suspicious: 'warning'
            }
            return icons[type] || 'info-circle'
        },

        getLogTagColor (type) {
            return this.getLogColor(type)
        },

        getLogTypeText (type) {
            const texts = {
                switch: '切屏行为',
                face: '人脸异常',
                network: '网络异常',
                warning: '警告发送',
                force_submit: '强制提交',
                suspicious: '可疑行为'
            }
            return texts[type] || '未知'
        },

        formatTime (seconds) {
            if (seconds < 60) return `${seconds}秒`
            if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`
            return `${Math.floor(seconds / 3600)}时${Math.floor((seconds % 3600) / 60)}分`
        },

        formatTimestamp (timestamp) {
            return new Date(timestamp).toLocaleString()
        },

        viewEvidence (evidence) {
            // 查看证据文件
            if (evidence.type === 'image') {
                window.open(evidence.url, '_blank')
            } else {
            }
        },

        async recordIncident (student, description) {
            try {
                await this.$api.post('/exam/incident', {
                    examId: this.examId,
                    studentId: student.userId,
                    description: description,
                    timestamp: new Date().toISOString()
                })
            } catch (error) {
                console.error('记录违纪事件失败:', error)
            }
        },

        cleanup () {
            if (this.ws) {
                this.ws.close()
            }
            if (this.updateTimer) {
                clearInterval(this.updateTimer)
            }
            this.stopBehaviorDetection()
        }
    }
}
</script>

<style scoped>
.exam-monitor {
  padding: 16px;
}

.monitor-overview {
  margin-bottom: 24px;
}

.overview-stats {
  margin-bottom: 16px;
}

.monitor-controls {
  display: flex;
  justify-content: center;
}

.student-monitor-list {
  margin-bottom: 24px;
}

.monitor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 16px;
}

.monitor-item {
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;
  position: relative;
}

.monitor-item.warning {
  border-color: #faad14;
  box-shadow: 0 0 8px rgba(250, 173, 20, 0.3);
}

.monitor-item.suspicious {
  border-color: #ff4d4f;
  box-shadow: 0 0 8px rgba(255, 77, 79, 0.3);
}

.monitor-item.offline {
  border-color: #d9d9d9;
  opacity: 0.6;
}

.student-camera {
  position: relative;
  height: 200px;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-feed {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-disabled,
.student-offline {
  color: white;
  text-align: center;
  font-size: 14px;
}

.student-info {
  padding: 12px;
  background: #fafafa;
}

.student-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.risk-indicators {
  margin-bottom: 12px;
}

.indicator-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
}

.indicator-label {
  width: 50px;
  color: #666;
}

.indicator-value {
  min-width: 40px;
  font-weight: 500;
}

.indicator-value.high-risk {
  color: #ff4d4f;
}

.student-actions {
  display: flex;
  justify-content: center;
}

.suspicious-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
}

.behavior-log {
  margin-bottom: 24px;
}

.log-controls {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.behavior-timeline {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}

.log-content {
  margin-bottom: 8px;
}

.log-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.log-time {
  font-size: 12px;
  color: #999;
  min-width: 80px;
}

.log-student {
  font-weight: 500;
  color: #1890ff;
}

.log-description {
  color: #333;
  margin-bottom: 4px;
}

.log-evidence {
  font-size: 12px;
}

.student-detail-content {
  max-height: 600px;
  overflow-y: auto;
}

.detail-overview {
  margin-bottom: 16px;
}

.behavior-timeline-detail {
  max-height: 400px;
  overflow-y: auto;
}

.timeline-content {
  margin-bottom: 8px;
}

.timeline-time {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.timeline-desc {
  color: #333;
}

.screenshots-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.screenshot-item {
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  overflow: hidden;
}

.screenshot-item img {
  width: 100%;
  height: 120px;
  object-fit: cover;
}

.screenshot-info {
  padding: 8px;
  background: #fafafa;
}

.screenshot-time {
  font-size: 11px;
  color: #999;
}

.screenshot-desc {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

@media (max-width: 768px) {
  .monitor-grid {
    grid-template-columns: 1fr;
    padding: 8px;
  }

  .log-controls {
    flex-direction: column;
    gap: 12px;
  }

  .log-header {
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>
