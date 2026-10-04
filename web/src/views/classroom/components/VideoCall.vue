<template>
  <div class="video-call">
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
          </a-button-group>
        </div>
        <div class="video-overlay">
          <a-tag color="blue">{{ teacherInfo.name || '教师' }}</a-tag>
        </div>
      </div>

      <!-- 学生视频显示区（教师视角） -->
      <div class="students-video-grid" v-if="role === 'teacher'">
        <div
          v-for="student in connectedStudents"
          :key="student.id"
          class="student-video-item"
          @click="focusStudent(student)"
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
            <a-icon
              v-if="!student.microphoneEnabled"
              type="audio-muted"
              class="muted-icon"
            />
          </div>
          <div class="student-controls" v-if="canControlStudents">
            <a-button
              size="small"
              @click.stop="muteStudent(student.id)"
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
        </a-button-group>
      </div>
      <div class="preview-info">
        <a-tag color="green">{{ studentInfo.name || '学生' }}</a-tag>
        <a-badge
          v-if="handRaised"
          status="processing"
          text="举手中"
        />
      </div>
    </div>

    <!-- 教师视频显示（学生视角） -->
    <div class="teacher-video-display" v-if="role === 'student' && teacherStream">
      <video
        ref="teacherVideo"
        :srcObject="teacherStream"
        autoplay
        class="video-element teacher-main-video"
      ></video>
      <div class="teacher-overlay">
        <a-tag color="blue">{{ teacherInfo.name || '教师' }}</a-tag>
        <a-tag v-if="teacherSpeaking" color="red">
          <a-icon type="sound" />
          讲话中
        </a-tag>
      </div>
    </div>

    <!-- 连接状态指示器 -->
    <div class="connection-status">
      <a-badge
        :status="connectionQuality.status"
        :text="`连接质量: ${connectionQuality.text}`"
      />
    </div>

    <!-- 视频设置面板 -->
    <a-drawer
      title="视频通话设置"
      :visible="settingsVisible"
      @close="settingsVisible = false"
      width="320"
      placement="right"
    >
      <div class="video-settings">
        <a-form layout="vertical">
          <a-form-item label="摄像头">
            <a-select
              v-model="selectedCamera"
              @change="changeCamera"
              placeholder="选择摄像头"
            >
              <a-select-option
                v-for="camera in availableCameras"
                :key="camera.deviceId"
                :value="camera.deviceId"
              >
                {{ camera.label || `摄像头 ${camera.deviceId.slice(0, 8)}` }}
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="麦克风">
            <a-select
              v-model="selectedMicrophone"
              @change="changeMicrophone"
              placeholder="选择麦克风"
            >
              <a-select-option
                v-for="mic in availableMicrophones"
                :key="mic.deviceId"
                :value="mic.deviceId"
              >
                {{ mic.label || `麦克风 ${mic.deviceId.slice(0, 8)}` }}
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="视频质量">
            <a-select v-model="videoQuality" @change="changeVideoQuality">
              <a-select-option value="low">低质量 (320p)</a-select-option>
              <a-select-option value="medium">中质量 (480p)</a-select-option>
              <a-select-option value="high">高质量 (720p)</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item>
            <a-switch
              v-model="noiseReduction"
              @change="toggleNoiseReduction"
            />
            <span style="margin-left: 8px;">降噪功能</span>
          </a-form-item>
        </a-form>
      </div>
    </a-drawer>

    <!-- 设置按钮 -->
    <a-button
      class="settings-btn"
      shape="circle"
      icon="setting"
      @click="settingsVisible = true"
      size="small"
    />
  </div>
</template>

<script>
export default {
    name: 'VideoCall',
    props: {
        role: {
            type: String,
            default: 'student', // 'teacher' | 'student'
            validator: value => ['teacher', 'student'].includes(value)
        },
        classroomId: {
            type: String,
            required: true
        },
        userInfo: {
            type: Object,
            default: () => ({})
        }
    },
    data () {
        return {
            // 媒体流
            localStream: null,
            teacherStream: null,
            connectedStudents: [],

            // 设备控制
            cameraEnabled: true,
            microphoneEnabled: true,
            handRaised: false,
            teacherSpeaking: false,

            // 用户信息
            teacherInfo: {
                name: '李老师'
            },
            studentInfo: {
                name: this.userInfo.name || '学生'
            },

            // 连接状态
            connectionQuality: {
                status: 'success',
                text: '良好'
            },

            // 设备列表
            availableCameras: [],
            availableMicrophones: [],
            selectedCamera: '',
            selectedMicrophone: '',

            // 设置
            settingsVisible: false,
            videoQuality: 'medium',
            noiseReduction: true,
            canControlStudents: true
        }
    },
    async mounted () {
        await this.initializeVideoCall()
        this.setupMediaDevices()
    },
    beforeDestroy () {
        this.cleanup()
    },
    methods: {
        async initializeVideoCall () {
            try {
                // 请求用户媒体权限
                this.localStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { min: 320, ideal: 640, max: 1280 },
                        height: { min: 240, ideal: 480, max: 720 },
                        frameRate: { min: 15, ideal: 24, max: 30 }
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: this.noiseReduction,
                        sampleRate: 44100
                    }
                })

                // 设置本地视频
                if (this.$refs.localVideo) {
                    this.$refs.localVideo.srcObject = this.localStream
                }

                this.$message.success('视频通话初始化成功')
                this.$emit('media-ready', this.localStream)
            } catch (error) {
                console.error('初始化视频通话失败:', error)
                this.$message.error('无法访问摄像头或麦克风，请检查设备权限')
                this.$emit('media-error', error)
            }
        },

        async setupMediaDevices () {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices()
                this.availableCameras = devices.filter(device => device.kind === 'videoinput')
                this.availableMicrophones = devices.filter(device => device.kind === 'audioinput')

                // 设置默认设备
                if (this.availableCameras.length > 0) {
                    this.selectedCamera = this.availableCameras[0].deviceId
                }
                if (this.availableMicrophones.length > 0) {
                    this.selectedMicrophone = this.availableMicrophones[0].deviceId
                }
            } catch (error) {
                console.error('获取媒体设备失败:', error)
            }
        },

        toggleCamera () {
            if (this.localStream) {
                const videoTrack = this.localStream.getVideoTracks()[0]
                if (videoTrack) {
                    videoTrack.enabled = !videoTrack.enabled
                    this.cameraEnabled = videoTrack.enabled
                    this.$emit('camera-toggle', this.cameraEnabled)
                }
            }
        },

        toggleMicrophone () {
            if (this.localStream) {
                const audioTrack = this.localStream.getAudioTracks()[0]
                if (audioTrack) {
                    audioTrack.enabled = !audioTrack.enabled
                    this.microphoneEnabled = audioTrack.enabled
                    this.$emit('microphone-toggle', this.microphoneEnabled)
                }
            }
        },

        toggleHandRaise () {
            this.handRaised = !this.handRaised
            this.$emit('hand-raise', this.handRaised)
        },

        focusStudent (student) {
            this.$emit('focus-student', student)
        },

        muteStudent (studentId) {
            this.$emit('mute-student', studentId)
            this.$message.info(`已静音学生`)
        },

        async changeCamera () {
            try {
                const constraints = {
                    video: { deviceId: { exact: this.selectedCamera } },
                    audio: { deviceId: { exact: this.selectedMicrophone } }
                }

                const newStream = await navigator.mediaDevices.getUserMedia(constraints)

                // 停止旧的流
                if (this.localStream) {
                    this.localStream.getTracks().forEach(track => track.stop())
                }

                this.localStream = newStream
                if (this.$refs.localVideo) {
                    this.$refs.localVideo.srcObject = newStream
                }

                this.$emit('stream-updated', newStream)
                this.$message.success('摄像头切换成功')
            } catch (error) {
                console.error('切换摄像头失败:', error)
                this.$message.error('切换摄像头失败')
            }
        },

        async changeMicrophone () {
            await this.changeCamera() // 重新获取媒体流
        },

        changeVideoQuality () {
            // 视频质量切换逻辑
            const qualityMap = {
                low: { width: 320, height: 240 },
                medium: { width: 640, height: 480 },
                high: { width: 1280, height: 720 }
            }

            const quality = qualityMap[this.videoQuality]
            this.$emit('quality-change', quality)
        },

        toggleNoiseReduction () {
            // 降噪功能切换
            if (this.localStream) {
                const audioTrack = this.localStream.getAudioTracks()[0]
                if (audioTrack) {
                    audioTrack.applyConstraints({
                        noiseSuppression: this.noiseReduction
                    })
                }
            }
        },

        // 添加学生连接
        addStudentConnection (studentData) {
            this.connectedStudents.push({
                id: studentData.id,
                name: studentData.name,
                stream: studentData.stream,
                microphoneEnabled: true,
                speaking: false
            })
        },

        // 移除学生连接
        removeStudentConnection (studentId) {
            this.connectedStudents = this.connectedStudents.filter(
                student => student.id !== studentId
            )
        },

        // 更新连接质量
        updateConnectionQuality (quality) {
            const qualityMap = {
                'excellent': { status: 'success', text: '优秀' },
                'good': { status: 'success', text: '良好' },
                'fair': { status: 'warning', text: '一般' },
                'poor': { status: 'error', text: '较差' }
            }
            this.connectionQuality = qualityMap[quality] || qualityMap['good']
        },

        cleanup () {
            // 清理资源
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop())
            }
            this.connectedStudents.forEach(student => {
                if (student.stream) {
                    student.stream.getTracks().forEach(track => track.stop())
                }
            })
        }
    }
}
</script>

<style scoped>
.video-call {
  position: relative;
  width: 100%;
  height: 100%;
}

.main-video-area {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.teacher-video {
  position: relative;
  flex: 1;
  min-height: 300px;
  background: #f0f0f0;
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

.student-video {
  border-radius: 4px;
}

.preview-video {
  border-radius: 8px;
  max-height: 200px;
}

.teacher-main-video {
  border-radius: 8px;
  min-height: 400px;
}

.video-controls {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 12px;
  border-radius: 20px;
}

.video-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
}

.students-video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 16px;
  max-height: 200px;
  overflow-y: auto;
}

.student-video-item {
  position: relative;
  aspect-ratio: 4/3;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
}

.student-video-item:hover {
  transform: scale(1.05);
}

.student-info {
  position: absolute;
  bottom: 4px;
  left: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.student-controls {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.student-video-item:hover .student-controls {
  opacity: 1;
}

.muted-icon {
  color: #ff4d4f;
}

.student-video-preview {
  position: relative;
  max-width: 300px;
  margin: 0 auto;
}

.preview-controls {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  padding: 6px;
  border-radius: 16px;
}

.preview-info {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.teacher-video-display {
  position: relative;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.teacher-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  gap: 8px;
}

.connection-status {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.9);
  padding: 4px 8px;
  border-radius: 4px;
}

.settings-btn {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  color: white;
}

.settings-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}

.video-settings {
  padding: 16px 0;
}
</style>
