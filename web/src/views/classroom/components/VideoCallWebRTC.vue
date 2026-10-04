<template>
  <div class="video-call">
    <!-- 连接状态提示 -->
    <div v-if="isConnecting" class="connection-overlay">
      <a-spin size="large">
        <div class="connecting-text">正在连接视频通话...</div>
      </a-spin>
    </div>

    <!-- 连接错误提示 -->
    <a-alert
      v-if="connectionError"
      type="error"
      :message="connectionError"
      show-icon
      closable
      @close="connectionError = null"
      style="margin-bottom: 16px;"
    />

    <!-- 主视频区域 -->
    <div class="main-video-area">
      <!-- 教师主视频 -->
      <div class="teacher-video" v-if="role === 'teacher'">
        <video
          ref="localVideo"
          :srcObject="localStream"
          autoplay
          muted
          class="video-element main-video"
        ></video>
        <div class="video-controls">
          <a-button-group size="small">
            <a-button
              @click="toggleCamera"
              :type="cameraEnabled ? 'primary' : 'danger'"
              :icon="cameraEnabled ? 'video-camera' : 'video-camera-slash'"
            >
              {{ cameraEnabled ? '摄像头开' : '摄像头关' }}
            </a-button>
            <a-button
              @click="toggleMicrophone"
              :type="microphoneEnabled ? 'primary' : 'danger'"
              :icon="microphoneEnabled ? 'audio' : 'audio-muted'"
            >
              {{ microphoneEnabled ? '麦克风开' : '麦克风关' }}
            </a-button>
            <a-button @click="showSettings = true" icon="setting">
              设置
            </a-button>
          </a-button-group>
        </div>
        <div class="video-overlay">
          <a-tag color="blue">{{ userInfo.name || '教师' }}</a-tag>
          <a-badge
            :count="connectedStudents.length"
            :offset="[10, 0]"
            class="student-count"
          >
            <a-icon type="team" />
          </a-badge>
        </div>
        <!-- 连接质量指示器 -->
        <div class="connection-indicator">
          <a-icon
            :type="getConnectionIcon()"
            :style="{ color: getConnectionColor() }"
          />
        </div>
      </div>

      <!-- 学生视频网格（教师视角） -->
      <div class="students-video-grid" v-if="role === 'teacher' && connectedStudents.length > 0">
        <div
          v-for="student in connectedStudents"
          :key="student.socketId"
          class="student-video-item"
          @click="focusStudent(student)"
          :class="{ 'focused': focusedStudent && focusedStudent.socketId === student.socketId }"
        >
          <video
            :ref="`studentVideo_${student.id}`"
            :srcObject="student.stream"
            autoplay
            class="video-element student-video"
          ></video>
          <div class="student-info">
            <a-tag size="small" :color="student.speaking ? 'red' : 'default'">
              {{ student.name }}
            </a-tag>
            <div class="media-status">
              <a-icon
                v-if="!student.microphoneEnabled"
                type="audio-muted"
                class="muted-icon"
              />
              <a-icon
                v-if="!student.cameraEnabled"
                type="video-camera-slash"
                class="camera-off-icon"
              />
            </div>
          </div>
          <div class="student-controls" v-if="canControlStudents">
            <a-button
              size="small"
              @click.stop="muteStudent(student.socketId)"
              :disabled="!student.microphoneEnabled"
            >
              静音
            </a-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 学生端视频预览 -->
    <div class="student-video-preview" v-if="role === 'student'">
      <div class="preview-container">
        <video
          ref="localVideo"
          :srcObject="localStream"
          autoplay
          muted
          class="video-element preview-video"
        ></video>
        <div class="preview-controls">
          <a-button-group size="small">
            <a-button
              @click="toggleCamera"
              :type="cameraEnabled ? 'primary' : 'danger'"
              :icon="cameraEnabled ? 'video-camera' : 'video-camera-slash'"
            >
            </a-button>
            <a-button
              @click="toggleMicrophone"
              :type="microphoneEnabled ? 'primary' : 'danger'"
              :icon="microphoneEnabled ? 'audio' : 'audio-muted'"
            >
            </a-button>
            <a-button @click="toggleHandRaise" :type="handRaised ? 'primary' : 'default'">
              <a-icon type="like" />
              {{ handRaised ? '取消举手' : '举手发言' }}
            </a-button>
            <a-button @click="showSettings = true" icon="setting">
            </a-button>
          </a-button-group>
        </div>
        <div class="video-overlay">
          <a-tag color="green">{{ userInfo.name || '我' }}</a-tag>
        </div>
      </div>

      <!-- 教师视频显示 -->
      <div class="teacher-display" v-if="teacherStream">
        <video
          ref="teacherVideo"
          :srcObject="teacherStream"
          autoplay
          class="video-element teacher-main-video"
        ></video>
        <div class="teacher-label">
          <a-tag color="blue">教师</a-tag>
        </div>
      </div>
    </div>

    <!-- 连接状态面板 -->
    <div class="status-panel" v-if="isConnected">
      <a-row :gutter="16">
        <a-col :span="8">
          <a-statistic
            title="连接用户"
            :value="connectedStudents.length + (role === 'teacher' ? 1 : 2)"
            prefix="👥"
          />
        </a-col>
        <a-col :span="8">
          <a-statistic
            title="连接质量"
            :value="connectionQuality"
            :value-style="{ color: getConnectionColor() }"
          />
        </a-col>
        <a-col :span="8">
          <a-statistic
            title="延迟"
            :value="networkStats.latency"
            suffix="ms"
          />
        </a-col>
      </a-row>
    </div>

    <!-- 设备设置模态框 -->
    <a-modal
      title="视频通话设置"
      :visible="showSettings"
      @ok="saveSettings"
      @cancel="showSettings = false"
      :width="600"
    >
      <a-form layout="vertical">
        <a-form-item label="摄像头设备">
          <a-select
            v-model="selectedDevices.camera"
            placeholder="选择摄像头"
            @change="switchCamera"
          >
            <a-select-option
              v-for="camera in availableDevices.cameras"
              :key="camera.deviceId"
              :value="camera.deviceId"
            >
              {{ camera.label || '摄像头 ' + camera.deviceId.substring(0, 8) }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="麦克风设备">
          <a-select
            v-model="selectedDevices.microphone"
            placeholder="选择麦克风"
            @change="switchMicrophone"
          >
            <a-select-option
              v-for="microphone in availableDevices.microphones"
              :key="microphone.deviceId"
              :value="microphone.deviceId"
            >
              {{ microphone.label || '麦克风 ' + microphone.deviceId.substring(0, 8) }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <!-- 教师专用设置 -->
        <template v-if="role === 'teacher'">
          <a-divider>课堂设置</a-divider>
          <a-form-item>
            <a-checkbox v-model="roomSettings.allowStudentVideo">
              允许学生开启视频
            </a-checkbox>
          </a-form-item>
          <a-form-item>
            <a-checkbox v-model="roomSettings.allowStudentAudio">
              允许学生开启音频
            </a-checkbox>
          </a-form-item>
          <a-form-item>
            <a-checkbox v-model="roomSettings.recordSession">
              录制本次会话
            </a-checkbox>
          </a-form-item>
        </template>

        <a-divider>连接统计</a-divider>
        <a-descriptions size="small" :column="2">
          <a-descriptions-item label="比特率">
            {{ networkStats.bitrate }} kbps
          </a-descriptions-item>
          <a-descriptions-item label="丢包率">
            {{ networkStats.packetsLost }}%
          </a-descriptions-item>
        </a-descriptions>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import WebRTCService from '@/services/webrtc/WebRTCService'

export default {
    name: 'VideoCallWebRTC',
    props: {
        role: {
            type: String,
            required: true,
            validator: value => ['teacher', 'student'].includes(value)
        },
        roomId: {
            type: String,
            required: true
        },
        userId: {
            type: String,
            required: true
        },
        userInfo: {
            type: Object,
            required: true
        },
        canControlStudents: {
            type: Boolean,
            default: true
        }
    },

    data () {
        return {
            // WebRTC服务
            webrtcService: WebRTCService,

            // 媒体流状态
            localStream: null,
            teacherStream: null,
            cameraEnabled: true,
            microphoneEnabled: true,
            handRaised: false,

            // 连接状态
            isConnecting: false,
            isConnected: false,
            connectionError: null,
            connectionQuality: 'good', // good, fair, poor

            // 远程流管理
            remoteStreams: new Map(), // socketId -> MediaStream
            connectedUsers: new Map(), // socketId -> userInfo

            // 学生管理（教师端）
            connectedStudents: [],
            focusedStudent: null,

            // 设备管理
            availableDevices: {
                cameras: [],
                microphones: []
            },
            selectedDevices: {
                camera: null,
                microphone: null
            },

            // 房间设置
            roomSettings: {
                allowStudentVideo: true,
                allowStudentAudio: true,
                recordSession: false
            },

            // 技术状态
            networkStats: {
                bitrate: 0,
                packetsLost: 0,
                latency: 0
            },

            // UI状态
            showSettings: false,
            networkMonitorInterval: null
        }
    },

    computed: {
    // 获取连接状态图标
        getConnectionIcon () {
            return () => {
                switch (this.connectionQuality) {
                case 'good': return 'wifi'
                case 'fair': return 'disconnect'
                case 'poor': return 'exclamation-circle'
                default: return 'loading'
                }
            }
        },

        // 获取连接状态颜色
        getConnectionColor () {
            return () => {
                switch (this.connectionQuality) {
                case 'good': return '#52c41a'
                case 'fair': return '#faad14'
                case 'poor': return '#f5222d'
                default: return '#d9d9d9'
                }
            }
        }
    },

    async mounted () {
        try {
            await this.initializeVideoCall()
            await this.setupWebRTC()
            this.setupEventListeners()
            this.startNetworkMonitoring()
        } catch (error) {
            this.handleInitializationError(error)
        }
    },

    beforeDestroy () {
        this.cleanup()
    },

    methods: {
        async initializeVideoCall () {
            this.isConnecting = true

            try {
                // 获取用户媒体设备
                await this.enumerateDevices()

                // 初始化本地视频流
                this.localStream = await this.webrtcService.initializeLocalStream({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        frameRate: { ideal: 30 },
                        deviceId: this.selectedDevices.camera && this.selectedDevices.camera.deviceId
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                        deviceId: this.selectedDevices.microphone && this.selectedDevices.microphone.deviceId
                    }
                })

                // 设置视频元素
                this.$nextTick(() => {
                    if (this.$refs.localVideo) {
                        this.$refs.localVideo.srcObject = this.localStream
                    }
                })

                this.$emit('initialized', { stream: this.localStream })
            } catch (error) {
                this.connectionError = error.message
                this.$emit('error', error)
                throw error
            } finally {
                this.isConnecting = false
            }
        },

        async setupWebRTC () {
            try {
                // 设置WebRTC事件监听
                this.webrtcService.on('joinedClassroom', this.handleJoinedClassroom)
                this.webrtcService.on('userJoined', this.handleUserJoined)
                this.webrtcService.on('userLeft', this.handleUserLeft)
                this.webrtcService.on('remoteStreamAdded', this.handleRemoteStreamAdded)
                this.webrtcService.on('remoteStreamRemoved', this.handleRemoteStreamRemoved)
                this.webrtcService.on('userMediaChange', this.handleUserMediaChange)
                this.webrtcService.on('error', this.handleWebRTCError)
                this.webrtcService.on('disconnected', this.handleDisconnected)
                this.webrtcService.on('classroomClosed', this.handleClassroomClosed)

                // 连接到信令服务器并加入教室
                await this.webrtcService.joinClassroom(
                    this.roomId,
                    this.userId,
                    this.role,
                    this.userInfo
                )

                this.isConnected = true
                this.$message.success('成功连接到视频通话服务')
            } catch (error) {
                console.error('[VideoCall] WebRTC设置失败:', error)
                this.$message.error('视频通话服务连接失败: ' + error.message)
                throw error
            }
        },

        // WebRTC事件处理器
        handleJoinedClassroom (data) {
            this.$emit('joinedClassroom', data)
        },

        handleUserJoined (data) {
            this.connectedUsers.set(data.socketId, {
                userId: data.userId,
                userRole: data.userRole,
                userInfo: data.userInfo,
                socketId: data.socketId
            })

            this.updateConnectedStudents()
            this.$emit('userJoined', data)
        },

        handleUserLeft (data) {
            this.connectedUsers.delete(data.socketId)
            this.remoteStreams.delete(data.socketId)

            this.updateConnectedStudents()
            this.$emit('userLeft', data)
        },

        handleRemoteStreamAdded ({ socketId, stream }) {
            this.remoteStreams.set(socketId, stream)

            this.$nextTick(() => {
                // 为远程流分配video元素
                const user = this.connectedUsers.get(socketId)
                if (user) {
                    if (user.userRole === 'student') {
                        const videoRef = `studentVideo_${user.userId}`
                        const videoElement = this.$refs[videoRef]
                        if (videoElement && videoElement[0]) {
                            videoElement[0].srcObject = stream
                        }
                    } else if (user.userRole === 'teacher' && this.role === 'student') {
                        // 学生端显示教师流
                        this.teacherStream = stream
                        this.$nextTick(() => {
                            if (this.$refs.teacherVideo) {
                                this.$refs.teacherVideo.srcObject = stream
                            }
                        })
                    }
                }
            })

            this.updateConnectedStudents()
            this.$emit('remoteStreamAdded', { socketId, stream })
        },

        handleRemoteStreamRemoved ({ socketId }) {
            this.remoteStreams.delete(socketId)

            const user = this.connectedUsers.get(socketId)
            if (user && user.userRole === 'teacher' && this.role === 'student') {
                this.teacherStream = null
            }

            this.updateConnectedStudents()
            this.$emit('remoteStreamRemoved', { socketId })
        },

        handleUserMediaChange (data) {
            this.updateConnectedStudents()
            this.$emit('userMediaChange', data)
        },

        handleWebRTCError (error) {
            console.error('[VideoCall] WebRTC错误:', error)
            this.$message.error('视频通话错误: ' + error.message)
            this.$emit('webrtcError', error)
        },

        handleDisconnected () {
            this.isConnected = false
            this.$message.warning('视频通话连接已断开')
            this.$emit('disconnected')
        },

        handleClassroomClosed (data) {
            this.$message.warning(data.message || '课堂已结束')
            this.$emit('classroomClosed', data)
        },

        // 更新连接的学生列表
        updateConnectedStudents () {
            this.connectedStudents = []

            for (const [socketId, user] of this.connectedUsers) {
                if (user.userRole === 'student') {
                    const stream = this.remoteStreams.get(socketId)
                    this.connectedStudents.push({
                        id: user.userId,
                        name: user.userInfo.name || '学生',
                        socketId: socketId,
                        stream: stream,
                        microphoneEnabled: true, // 从WebRTC服务获取实际状态
                        cameraEnabled: !!stream,
                        speaking: false,
                        connectionQuality: 'good'
                    })
                }
            }
        },

        // 媒体控制
        toggleCamera () {
            this.webrtcService.toggleVideo()
            this.cameraEnabled = this.webrtcService.mediaState.videoEnabled

            this.$emit('mediaStateChange', {
                camera: this.cameraEnabled,
                microphone: this.microphoneEnabled
            })

            this.$message.info(this.cameraEnabled ? '摄像头已开启' : '摄像头已关闭')
        },

        toggleMicrophone () {
            this.webrtcService.toggleAudio()
            this.microphoneEnabled = this.webrtcService.mediaState.audioEnabled

            this.$emit('mediaStateChange', {
                camera: this.cameraEnabled,
                microphone: this.microphoneEnabled
            })

            this.$message.info(this.microphoneEnabled ? '麦克风已开启' : '麦克风已关闭')
        },

        toggleHandRaise () {
            this.handRaised = !this.handRaised
            this.$emit('handRaiseChange', this.handRaised)
            this.$message.info(this.handRaised ? '已举手' : '已取消举手')
        },

        // 学生管理
        focusStudent (student) {
            this.focusedStudent = this.focusedStudent && this.focusedStudent.socketId === student.socketId
                ? null : student
            this.$emit('studentFocused', this.focusedStudent)
        },

        muteStudent (socketId) {
            // 发送静音指令给特定学生
            this.$emit('muteStudent', socketId)
            this.$message.success('已发送静音指令')
        },

        // 设备管理
        async enumerateDevices () {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices()

                this.availableDevices.cameras = devices.filter(
                    device => device.kind === 'videoinput'
                )
                this.availableDevices.microphones = devices.filter(
                    device => device.kind === 'audioinput'
                )

                // 设置默认设备
                if (!this.selectedDevices.camera && this.availableDevices.cameras.length > 0) {
                    this.selectedDevices.camera = this.availableDevices.cameras[0].deviceId
                }
                if (!this.selectedDevices.microphone && this.availableDevices.microphones.length > 0) {
                    this.selectedDevices.microphone = this.availableDevices.microphones[0].deviceId
                }
            } catch (error) {
                console.error('[VideoCall] 设备枚举失败:', error)
            }
        },

        async switchCamera (deviceId) {
            try {
                // 重新获取媒体流
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: { deviceId: { exact: deviceId } },
                    audio: this.localStream.getAudioTracks()[0] && this.localStream.getAudioTracks()[0].getSettings()
                })

                // 替换视频轨道
                const newVideoTrack = newStream.getVideoTracks()[0]
                const oldVideoTrack = this.localStream.getVideoTracks()[0]

                if (oldVideoTrack) {
                    this.localStream.removeTrack(oldVideoTrack)
                    oldVideoTrack.stop()
                }

                this.localStream.addTrack(newVideoTrack)

                // 更新video元素
                if (this.$refs.localVideo) {
                    this.$refs.localVideo.srcObject = this.localStream
                }

                this.$message.success('摄像头切换成功')
            } catch (error) {
                console.error('[VideoCall] 摄像头切换失败:', error)
                this.$message.error('摄像头切换失败')
            }
        },

        async switchMicrophone (deviceId) {
            try {
                // 重新获取媒体流
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: this.localStream.getVideoTracks()[0] && this.localStream.getVideoTracks()[0].getSettings(),
                    audio: { deviceId: { exact: deviceId } }
                })

                // 替换音频轨道
                const newAudioTrack = newStream.getAudioTracks()[0]
                const oldAudioTrack = this.localStream.getAudioTracks()[0]

                if (oldAudioTrack) {
                    this.localStream.removeTrack(oldAudioTrack)
                    oldAudioTrack.stop()
                }

                this.localStream.addTrack(newAudioTrack)

                this.$message.success('麦克风切换成功')
            } catch (error) {
                console.error('[VideoCall] 麦克风切换失败:', error)
                this.$message.error('麦克风切换失败')
            }
        },

        saveSettings () {
            // 更新房间设置
            if (this.role === 'teacher') {
                this.webrtcService.updateRoomSettings(this.roomSettings)
            }

            this.showSettings = false
            this.$message.success('设置已保存')
        },

        setupEventListeners () {
            // 监听网络状态变化
            window.addEventListener('online', this.handleOnline)
            window.addEventListener('offline', this.handleOffline)
        },

        handleOnline () {
            this.$message.success('网络已恢复')
        },

        handleOffline () {
            this.$message.warning('网络连接已断开')
        },

        startNetworkMonitoring () {
            this.networkMonitorInterval = setInterval(() => {
                // 模拟网络质量监控
                this.updateNetworkStats()
            }, 5000)
        },

        updateNetworkStats () {
            // 模拟网络统计更新
            this.networkStats = {
                bitrate: Math.floor(Math.random() * 1000) + 500,
                packetsLost: Math.floor(Math.random() * 5),
                latency: Math.floor(Math.random() * 100) + 20
            }

            // 根据统计更新连接质量
            if (this.networkStats.latency < 50 && this.networkStats.packetsLost < 2) {
                this.connectionQuality = 'good'
            } else if (this.networkStats.latency < 150 && this.networkStats.packetsLost < 5) {
                this.connectionQuality = 'fair'
            } else {
                this.connectionQuality = 'poor'
            }
        },

        handleInitializationError (error) {
            console.error('[VideoCall] 初始化失败:', error)
            this.connectionError = error.message
            this.$emit('error', error)
        },

        cleanup () {
            // 清理WebRTC连接
            if (this.webrtcService) {
                this.webrtcService.removeAllListeners()
                this.webrtcService.leaveClassroom()
            }

            // 清理本地流
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop())
                this.localStream = null
            }

            // 清理连接状态
            this.connectedStudents = []
            this.connectedUsers.clear()
            this.remoteStreams.clear()
            this.teacherStream = null
            this.isConnected = false

            // 停止监控
            if (this.networkMonitorInterval) {
                clearInterval(this.networkMonitorInterval)
            }

            // 清理事件监听
            window.removeEventListener('online', this.handleOnline)
            window.removeEventListener('offline', this.handleOffline)

            this.$emit('cleanup')
        }
    }
}
</script>

<style scoped>
.video-call {
  position: relative;
  width: 100%;
  height: 100%;
  background: #f5f5f5;
}

.connection-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.connecting-text {
  margin-top: 16px;
  font-size: 16px;
  color: #666;
}

.main-video-area {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 16px;
}

.teacher-video {
  position: relative;
  flex: 1;
  min-height: 400px;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #000;
}

.main-video {
  border-radius: 8px;
}

.video-controls {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  padding: 8px;
  border-radius: 6px;
}

.video-overlay {
  position: absolute;
  top: 16px;
  left: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.student-count {
  color: white;
}

.connection-indicator {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 18px;
}

.students-video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.student-video-item {
  position: relative;
  background: #000;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.student-video-item:hover {
  border-color: #1890ff;
  transform: translateY(-2px);
}

.student-video-item.focused {
  border-color: #52c41a;
  box-shadow: 0 0 12px rgba(82, 196, 26, 0.3);
}

.student-video {
  width: 100%;
  height: 150px;
  object-fit: cover;
}

.student-info {
  position: absolute;
  bottom: 8px;
  left: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.media-status {
  display: flex;
  gap: 4px;
}

.muted-icon, .camera-off-icon {
  color: #ff4d4f;
  font-size: 12px;
}

.student-controls {
  position: absolute;
  top: 8px;
  right: 8px;
}

/* 学生端样式 */
.student-video-preview {
  display: flex;
  gap: 16px;
  height: 100%;
}

.preview-container {
  position: relative;
  width: 300px;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.preview-video {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.preview-controls {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  padding: 6px;
  border-radius: 4px;
}

.teacher-display {
  position: relative;
  flex: 1;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.teacher-main-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.teacher-label {
  position: absolute;
  top: 16px;
  left: 16px;
}

.status-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.95);
  padding: 16px;
  border-radius: 8px;
  min-width: 300px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  .students-video-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 8px;
  }

  .student-video {
    height: 120px;
  }

  .student-video-preview {
    flex-direction: column;
    height: auto;
  }

  .preview-container {
    width: 100%;
  }

  .status-panel {
    position: relative;
    width: 100%;
    margin-top: 16px;
  }
}
</style>
