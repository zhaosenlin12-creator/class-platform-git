<template>
  <div class="screen-share">
    <!-- 屏幕共享控制栏 -->
    <div class="share-controls" v-if="role === 'teacher'">
      <a-card title="屏幕共享" size="small">
        <div slot="extra">
          <a-button-group size="small">
            <a-button
              @click="toggleScreenShare"
              :type="isSharing ? 'danger' : 'primary'"
              :loading="shareLoading"
            >
              <a-icon :type="isSharing ? 'stop' : 'desktop'" />
              {{ isSharing ? '停止共享' : '开始共享' }}
            </a-button>
            <a-dropdown :trigger="['click']">
              <a-button>
                <a-icon type="setting" />
                设置
              </a-button>
              <a-menu slot="overlay" @click="handleShareOption">
                <a-menu-item key="screen">
                  <a-icon type="desktop" />
                  共享整个屏幕
                </a-menu-item>
                <a-menu-item key="window">
                  <a-icon type="window" />
                  共享应用窗口
                </a-menu-item>
                <a-menu-item key="tab">
                  <a-icon type="chrome" />
                  共享浏览器标签页
                </a-menu-item>
              </a-menu>
            </a-dropdown>
          </a-button-group>
        </div>

        <!-- 共享预览区域 -->
        <div class="share-preview">
          <video
            v-if="isSharing"
            ref="sharePreview"
            :srcObject="shareStream"
            autoplay
            muted
            class="preview-video"
          ></video>
          <div v-else class="share-placeholder">
            <a-icon type="desktop" style="font-size: 48px; color: #ccc;" />
            <p class="placeholder-text">点击"开始共享"来分享您的屏幕</p>
          </div>
        </div>

        <!-- 共享状态信息 -->
        <div class="share-status" v-if="isSharing">
          <a-row :gutter="16">
            <a-col :span="6">
              <a-statistic
                title="观看人数"
                :value="viewerCount"
                prefix="👥"
                :value-style="{ fontSize: '16px' }"
              />
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="共享时长"
                :value="formatDuration(shareDuration)"
                :value-style="{ fontSize: '16px' }"
              />
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="质量"
                :value="shareQuality"
                :value-style="{
                  fontSize: '16px',
                  color: getQualityColor()
                }"
              />
            </a-col>
            <a-col :span="6">
              <div class="recording-control" v-if="recordingEnabled">
                <a-button
                  @click="toggleRecording"
                  :type="isRecording ? 'danger' : 'default'"
                  size="small"
                  :icon="isRecording ? 'pause-circle' : 'play-circle'"
                >
                  {{ isRecording ? '停止录制' : '开始录制' }}
                </a-button>
              </div>
            </a-col>
          </a-row>
        </div>
      </a-card>
    </div>

    <!-- 学生端观看区域 -->
    <div class="share-viewer" v-if="role === 'student'">
      <a-card title="屏幕共享" size="small">
        <div slot="extra">
          <a-button-group size="small">
            <a-button @click="toggleFullscreen" icon="fullscreen">
              全屏
            </a-button>
            <a-button @click="requestControl" :disabled="!allowStudentControl">
              <a-icon type="hand-paper" />
              请求控制
            </a-button>
          </a-button-group>
        </div>

        <!-- 共享内容显示 -->
        <div class="shared-content">
          <video
            v-if="receivedShareStream"
            ref="sharedScreen"
            :srcObject="receivedShareStream"
            autoplay
            class="shared-video"
            @click="toggleFullscreen"
          ></video>
          <div v-else class="no-share">
            <a-icon type="desktop" style="font-size: 64px; color: #ccc;" />
            <p class="no-share-text">
              {{ shareStatus === 'waiting' ? '等待教师开始屏幕共享...' : '教师暂未共享屏幕' }}
            </p>
          </div>
        </div>

        <!-- 学生端状态信息 -->
        <div class="viewer-info" v-if="receivedShareStream">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-tag color="green">
                <a-icon type="eye" />
                正在观看
              </a-tag>
            </a-col>
            <a-col :span="8">
              <a-tag :color="getConnectionQualityColor()">
                连接: {{ connectionQuality }}
              </a-tag>
            </a-col>
            <a-col :span="8">
              <a-tag v-if="hasControl" color="blue">
                <a-icon type="control" />
                可控制
              </a-tag>
            </a-col>
          </a-row>
        </div>
      </a-card>
    </div>

    <!-- 权限请求对话框 -->
    <a-modal
      title="屏幕共享权限请求"
      :visible="showPermissionDialog"
      @ok="handlePermissionRequest"
      @cancel="showPermissionDialog = false"
      :confirmLoading="permissionLoading"
    >
      <p>需要获取屏幕共享权限才能开始共享。</p>
      <p>请在浏览器弹出的权限请求中选择要共享的屏幕或窗口。</p>
    </a-modal>

    <!-- 录制设置对话框 -->
    <a-modal
      title="录制设置"
      :visible="showRecordingSettings"
      @ok="saveRecordingSettings"
      @cancel="showRecordingSettings = false"
      :width="500"
    >
      <a-form layout="vertical">
        <a-form-item label="录制质量">
          <a-radio-group v-model="recordingSettings.quality">
            <a-radio value="high">高质量 (1080p)</a-radio>
            <a-radio value="medium">中等质量 (720p)</a-radio>
            <a-radio value="low">低质量 (480p)</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="录制格式">
          <a-select v-model="recordingSettings.format">
            <a-select-option value="mp4">MP4</a-select-option>
            <a-select-option value="webm">WebM</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="同时录制音频">
          <a-checkbox v-model="recordingSettings.includeAudio">
            包含系统音频
          </a-checkbox>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 全屏模式 -->
    <div v-if="fullscreenMode" class="fullscreen-overlay" @click="exitFullscreen">
      <video
        ref="fullscreenVideo"
        :srcObject="receivedShareStream"
        autoplay
        class="fullscreen-video"
      ></video>
      <div class="fullscreen-controls">
        <a-button @click="exitFullscreen" type="primary" ghost>
          <a-icon type="fullscreen-exit" />
          退出全屏
        </a-button>
      </div>
    </div>
  </div>
</template>

<script>
import WebRTCService from '@/services/webrtc/WebRTCService'

export default {
    name: 'ScreenShareWebRTC',
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
        allowStudentControl: {
            type: Boolean,
            default: false
        },
        recordingEnabled: {
            type: Boolean,
            default: true
        }
    },

    data () {
        return {
            // WebRTC服务
            webrtcService: WebRTCService,

            // 屏幕共享状态
            isSharing: false,
            shareStream: null,
            receivedShareStream: null,
            shareLoading: false,
            shareStatus: 'idle', // idle, waiting, active, error

            // 共享设置
            shareOptions: {
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                },
                audio: true
            },
            shareType: 'screen', // screen, window, tab

            // 录制功能
            isRecording: false,
            mediaRecorder: null,
            recordedChunks: [],
            recordingSettings: {
                quality: 'medium',
                format: 'mp4',
                includeAudio: true
            },

            // 状态统计
            shareDuration: 0,
            shareQuality: 'good', // good, fair, poor
            connectionQuality: 'good',
            viewerCount: 0,

            // 控制权限
            hasControl: false,
            controlRequests: [],

            // UI状态
            showPermissionDialog: false,
            permissionLoading: false,
            showRecordingSettings: false,
            fullscreenMode: false,

            // 定时器
            durationTimer: null,
            qualityMonitor: null
        }
    },

    computed: {
    // 格式化持续时间
        formatDuration () {
            return (seconds) => {
                const hours = Math.floor(seconds / 3600)
                const minutes = Math.floor((seconds % 3600) / 60)
                const secs = seconds % 60

                if (hours > 0) {
                    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                }
                return `${minutes}:${secs.toString().padStart(2, '0')}`
            }
        },

        // 获取质量颜色
        getQualityColor () {
            return () => {
                switch (this.shareQuality) {
                case 'good': return '#52c41a'
                case 'fair': return '#faad14'
                case 'poor': return '#f5222d'
                default: return '#d9d9d9'
                }
            }
        },

        // 获取连接质量颜色
        getConnectionQualityColor () {
            return () => {
                switch (this.connectionQuality) {
                case 'good': return 'green'
                case 'fair': return 'orange'
                case 'poor': return 'red'
                default: return 'default'
                }
            }
        }
    },

    mounted () {
        this.setupWebRTCListeners()
        this.initializeScreenShare()
    },

    beforeDestroy () {
        this.cleanup()
    },

    methods: {
        setupWebRTCListeners () {
            // 监听屏幕共享事件
            this.webrtcService.on('screenShareStarted', this.handleRemoteScreenShareStarted)
            this.webrtcService.on('screenShareStopped', this.handleRemoteScreenShareStopped)
            this.webrtcService.on('remoteStreamAdded', this.handleRemoteStreamAdded)
            this.webrtcService.on('remoteStreamRemoved', this.handleRemoteStreamRemoved)
        },

        async initializeScreenShare () {
            // 初始化屏幕共享功能
            if (this.role === 'student') {
                this.shareStatus = 'waiting'
            }
        },

        // 切换屏幕共享
        async toggleScreenShare () {
            if (this.isSharing) {
                await this.stopScreenShare()
            } else {
                await this.startScreenShare()
            }
        },

        // 开始屏幕共享
        async startScreenShare () {
            try {
                this.shareLoading = true

                // 通过WebRTC服务启动屏幕共享
                this.shareStream = await this.webrtcService.startScreenShare()

                // 设置预览
                this.$nextTick(() => {
                    if (this.$refs.sharePreview) {
                        this.$refs.sharePreview.srcObject = this.shareStream
                    }
                })

                this.isSharing = true
                this.shareStatus = 'active'
                this.startDurationTimer()
                this.startQualityMonitor()

                this.$message.success('屏幕共享已开始')
                this.$emit('shareStarted', { stream: this.shareStream })
            } catch (error) {
                console.error('[ScreenShare] 开始屏幕共享失败:', error)
                this.handleShareError(error)
            } finally {
                this.shareLoading = false
            }
        },

        // 停止屏幕共享
        async stopScreenShare () {
            try {
                this.shareLoading = true

                // 停止录制
                if (this.isRecording) {
                    this.stopRecording()
                }

                // 通过WebRTC服务停止屏幕共享
                await this.webrtcService.stopScreenShare()

                // 清理本地状态
                this.shareStream = null
                this.isSharing = false
                this.shareStatus = 'idle'

                this.stopDurationTimer()
                this.stopQualityMonitor()

                this.$message.success('屏幕共享已停止')
                this.$emit('shareStopped')
            } catch (error) {
                console.error('[ScreenShare] 停止屏幕共享失败:', error)
                this.handleShareError(error)
            } finally {
                this.shareLoading = false
            }
        },

        // 处理共享选项
        handleShareOption ({ key }) {
            this.shareType = key

            // 更新共享选项
            switch (key) {
            case 'screen':
                this.shareOptions = {
                    video: {
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        frameRate: { ideal: 30 }
                    },
                    audio: true
                }
                break
            case 'window':
                this.shareOptions = {
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 30 }
                    },
                    audio: false
                }
                break
            case 'tab':
                this.shareOptions = {
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 30 }
                    },
                    audio: true
                }
                break
            }

            this.$message.info(`已选择共享${key === 'screen' ? '整个屏幕' : key === 'window' ? '应用窗口' : '浏览器标签页'}`)
        },

        // 录制控制
        toggleRecording () {
            if (this.isRecording) {
                this.stopRecording()
            } else {
                this.startRecording()
            }
        },

        startRecording () {
            if (!this.shareStream) return

            try {
                // 创建媒体录制器
                this.mediaRecorder = new MediaRecorder(this.shareStream, {
                    mimeType: 'video/webm;codecs=vp9'
                })

                this.recordedChunks = []

                this.mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        this.recordedChunks.push(event.data)
                    }
                }

                this.mediaRecorder.onstop = () => {
                    this.saveRecording()
                }

                this.mediaRecorder.start()
                this.isRecording = true

                this.$message.success('开始录制屏幕共享')
                this.$emit('recordingStarted')
            } catch (error) {
                console.error('[ScreenShare] 录制启动失败:', error)
                this.$message.error('录制功能启动失败')
            }
        },

        stopRecording () {
            if (this.mediaRecorder && this.isRecording) {
                this.mediaRecorder.stop()
                this.isRecording = false

                this.$message.success('录制已停止')
                this.$emit('recordingStopped')
            }
        },

        saveRecording () {
            if (this.recordedChunks.length === 0) return

            const blob = new Blob(this.recordedChunks, { type: 'video/webm' })
            const url = URL.createObjectURL(blob)

            // 创建下载链接
            const a = document.createElement('a')
            a.style.display = 'none'
            a.href = url
            a.download = `screen-share-${new Date().getTime()}.webm`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)

            // 清理
            URL.revokeObjectURL(url)
            this.recordedChunks = []

            this.$message.success('录制文件已保存')
        },

        saveRecordingSettings () {
            this.showRecordingSettings = false
            this.$message.success('录制设置已保存')
        },

        // WebRTC事件处理
        handleRemoteScreenShareStarted (data) {
            if (this.role === 'student') {
                this.shareStatus = 'active'
                this.$message.info('教师开始了屏幕共享')
            }
        },

        handleRemoteScreenShareStopped (data) {
            if (this.role === 'student') {
                this.receivedShareStream = null
                this.shareStatus = 'waiting'
                this.$message.info('教师停止了屏幕共享')
            }
        },

        handleRemoteStreamAdded ({ socketId, stream }) {
            // 检查是否是屏幕共享流（可以通过流的特征或元数据来判断）
            if (this.role === 'student' && this.isScreenShareStream(stream)) {
                this.receivedShareStream = stream

                this.$nextTick(() => {
                    if (this.$refs.sharedScreen) {
                        this.$refs.sharedScreen.srcObject = stream
                    }
                })

                this.shareStatus = 'active'
                this.$emit('receiveShareStream', { socketId, stream })
            }
        },

        handleRemoteStreamRemoved ({ socketId }) {
            if (this.role === 'student' && this.receivedShareStream) {
                this.receivedShareStream = null
                this.shareStatus = 'waiting'
            }
        },

        // 判断是否是屏幕共享流
        isScreenShareStream (stream) {
            // 这里可以通过流的轨道类型、分辨率等特征来判断
            // 简化实现，假设宽度大于800的视频流为屏幕共享
            const videoTrack = stream.getVideoTracks()[0]
            if (videoTrack) {
                const settings = videoTrack.getSettings()
                return settings.width && settings.width > 800
            }
            return false
        },

        // 学生端控制
        toggleFullscreen () {
            if (this.fullscreenMode) {
                this.exitFullscreen()
            } else {
                this.enterFullscreen()
            }
        },

        enterFullscreen () {
            if (this.receivedShareStream) {
                this.fullscreenMode = true
                this.$nextTick(() => {
                    if (this.$refs.fullscreenVideo) {
                        this.$refs.fullscreenVideo.srcObject = this.receivedShareStream
                    }
                })
            }
        },

        exitFullscreen () {
            this.fullscreenMode = false
        },

        requestControl () {
            this.$emit('requestControl', {
                userId: this.userId,
                roomId: this.roomId
            })
            this.$message.info('已发送控制权限请求')
        },

        // 监控和统计
        startDurationTimer () {
            this.shareDuration = 0
            this.durationTimer = setInterval(() => {
                this.shareDuration++
            }, 1000)
        },

        stopDurationTimer () {
            if (this.durationTimer) {
                clearInterval(this.durationTimer)
                this.durationTimer = null
                this.shareDuration = 0
            }
        },

        startQualityMonitor () {
            this.qualityMonitor = setInterval(() => {
                this.updateShareQuality()
                this.updateConnectionQuality()
            }, 3000)
        },

        stopQualityMonitor () {
            if (this.qualityMonitor) {
                clearInterval(this.qualityMonitor)
                this.qualityMonitor = null
            }
        },

        updateShareQuality () {
            // 模拟质量监控，实际应该基于WebRTC统计
            const qualities = ['good', 'fair', 'poor']
            const randomIndex = Math.floor(Math.random() * 3)
            this.shareQuality = Math.random() > 0.3 ? 'good' : qualities[randomIndex]
        },

        updateConnectionQuality () {
            // 模拟连接质量更新
            const qualities = ['good', 'fair', 'poor']
            this.connectionQuality = Math.random() > 0.7 ? qualities[Math.floor(Math.random() * 3)] : 'good'
        },

        // 错误处理
        handleShareError (error) {
            this.shareStatus = 'error'

            let errorMessage = '屏幕共享失败'

            if (error.name === 'NotAllowedError') {
                errorMessage = '用户拒绝了屏幕共享权限'
            } else if (error.name === 'NotFoundError') {
                errorMessage = '未找到可用的屏幕或窗口'
            } else if (error.name === 'NotSupportedError') {
                errorMessage = '浏览器不支持屏幕共享'
            }

            this.$message.error(errorMessage)
            this.$emit('shareError', error)
        },

        handlePermissionRequest () {
            this.showPermissionDialog = false
            this.startScreenShare()
        },

        // 清理资源
        cleanup () {
            // 停止屏幕共享
            if (this.isSharing) {
                this.stopScreenShare()
            }

            // 停止录制
            if (this.isRecording) {
                this.stopRecording()
            }

            // 清理定时器
            this.stopDurationTimer()
            this.stopQualityMonitor()

            // 清理WebRTC监听器
            if (this.webrtcService) {
                this.webrtcService.removeListener('screenShareStarted', this.handleRemoteScreenShareStarted)
                this.webrtcService.removeListener('screenShareStopped', this.handleRemoteScreenShareStopped)
                this.webrtcService.removeListener('remoteStreamAdded', this.handleRemoteStreamAdded)
                this.webrtcService.removeListener('remoteStreamRemoved', this.handleRemoteStreamRemoved)
            }

            this.$emit('cleanup')
        }
    }
}
</script>

<style scoped>
.screen-share {
  width: 100%;
  height: 100%;
}

.share-controls {
  margin-bottom: 16px;
}

.share-preview {
  width: 100%;
  height: 300px;
  background: #f5f5f5;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.share-placeholder {
  text-align: center;
  color: #999;
}

.placeholder-text {
  margin-top: 16px;
  font-size: 14px;
}

.share-status {
  margin-top: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
}

.recording-control {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.share-viewer {
  width: 100%;
  height: 100%;
}

.shared-content {
  width: 100%;
  height: 500px;
  background: #000;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.shared-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  cursor: pointer;
}

.no-share {
  text-align: center;
  color: #666;
}

.no-share-text {
  margin-top: 16px;
  font-size: 16px;
}

.viewer-info {
  margin-top: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
}

.fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fullscreen-video {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.fullscreen-controls {
  position: absolute;
  top: 20px;
  right: 20px;
}

@media (max-width: 768px) {
  .share-preview,
  .shared-content {
    height: 200px;
  }

  .share-status,
  .viewer-info {
    padding: 8px;
  }

  .fullscreen-controls {
    top: 10px;
    right: 10px;
  }
}
</style>
