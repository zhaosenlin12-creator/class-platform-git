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
            <p>点击开始屏幕共享</p>
          </div>
        </div>

        <!-- 共享信息 -->
        <div v-if="isSharing" class="share-info">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-statistic
                title="分辨率"
                :value="`${shareResolution.width}x${shareResolution.height}`"
              />
            </a-col>
            <a-col :span="8">
              <a-statistic
                title="帧率"
                :value="shareFrameRate"
                suffix="fps"
              />
            </a-col>
            <a-col :span="8">
              <a-statistic
                title="观看人数"
                :value="viewerCount"
              />
            </a-col>
          </a-row>
        </div>
      </a-card>
    </div>

    <!-- 屏幕共享观看区域（学生端） -->
    <div class="share-viewer" v-if="role === 'student'">
      <a-card :title="`${teacherName}的屏幕共享`" size="small">
        <div slot="extra">
          <a-button-group size="small">
            <a-button @click="toggleFullscreen" :type="isFullscreen ? 'primary' : 'default'">
              <a-icon type="fullscreen" />
              全屏
            </a-button>
            <a-button @click="takeScreenshot">
              <a-icon type="camera" />
              截图
            </a-button>
          </a-button-group>
        </div>

        <div class="viewer-area" ref="viewerArea">
          <video
            v-if="receivedShareStream"
            ref="sharedScreen"
            :srcObject="receivedShareStream"
            autoplay
            class="shared-screen-video"
            @loadedmetadata="onVideoLoaded"
          ></video>
          <div v-else class="viewer-placeholder">
            <a-spin size="large" />
            <p style="margin-top: 16px;">等待教师开始屏幕共享...</p>
          </div>
        </div>

        <!-- 观看控制 -->
        <div v-if="receivedShareStream" class="viewer-controls">
          <a-slider
            v-model="videoScale"
            :min="0.5"
            :max="2"
            :step="0.1"
            @change="onScaleChange"
            style="width: 200px;"
          />
          <span style="margin-left: 12px;">缩放: {{ Math.round(videoScale * 100) }}%</span>
          <a-button
            @click="resetScale"
            size="small"
            style="margin-left: 12px;"
          >
            重置
          </a-button>
        </div>
      </a-card>
    </div>

    <!-- 共享质量监控 -->
    <div class="share-stats" v-if="isSharing && showStats">
      <a-card title="共享质量" size="small">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-label">延迟</div>
            <div class="stat-value">{{ shareLatency }}ms</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">码率</div>
            <div class="stat-value">{{ shareBitrate }}kbps</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">丢包率</div>
            <div class="stat-value">{{ sharePacketLoss }}%</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">连接质量</div>
            <div class="stat-value">
              <a-badge :status="connectionStatus" :text="connectionText" />
            </div>
          </div>
        </div>
      </a-card>
    </div>

    <!-- 录制提示 -->
    <a-modal
      title="开始屏幕录制"
      :visible="recordingModalVisible"
      @ok="confirmRecording"
      @cancel="recordingModalVisible = false"
      ok-text="开始录制"
      cancel-text="取消"
    >
      <p>您确定要开始录制屏幕共享吗？录制文件将保存到本地。</p>
      <a-alert
        message="录制提醒"
        description="录制过程中请确保网络稳定，录制文件将包含音频和视频内容。"
        type="info"
        show-icon
      />
    </a-modal>

    <!-- 截图预览 -->
    <a-modal
      title="屏幕截图"
      :visible="screenshotModalVisible"
      @ok="downloadScreenshot"
      @cancel="screenshotModalVisible = false"
      ok-text="下载"
      cancel-text="关闭"
      width="80%"
    >
      <div class="screenshot-preview">
        <img v-if="screenshotUrl" :src="screenshotUrl" alt="屏幕截图" style="max-width: 100%;" />
      </div>
    </a-modal>
  </div>
</template>

<script>
export default {
    name: 'ScreenShare',
    props: {
        role: {
            type: String,
            default: 'student',
            validator: value => ['teacher', 'student'].includes(value)
        },
        classroomId: {
            type: String,
            required: true
        },
        teacherName: {
            type: String,
            default: '教师'
        }
    },
    data () {
        return {
            // 共享状态
            isSharing: false,
            shareLoading: false,
            shareStream: null,
            receivedShareStream: null,

            // 共享参数
            shareType: 'screen', // 'screen' | 'window' | 'tab'
            shareResolution: { width: 1920, height: 1080 },
            shareFrameRate: 30,
            viewerCount: 0,

            // 观看控制
            isFullscreen: false,
            videoScale: 1,

            // 质量监控
            showStats: false,
            shareLatency: 0,
            shareBitrate: 0,
            sharePacketLoss: 0,
            connectionStatus: 'success',
            connectionText: '良好',

            // UI状态
            recordingModalVisible: false,
            screenshotModalVisible: false,
            screenshotUrl: '',

            // MediaRecorder相关
            mediaRecorder: null,
            recordedChunks: []
        }
    },
    mounted () {
        this.setupEventListeners()
    },
    beforeDestroy () {
        this.cleanup()
    },
    methods: {
        async toggleScreenShare () {
            if (this.isSharing) {
                await this.stopScreenShare()
            } else {
                await this.startScreenShare()
            }
        },

        async startScreenShare () {
            this.shareLoading = true
            try {
                const displayMediaOptions = {
                    video: {
                        width: { ideal: 1920, max: 1920 },
                        height: { ideal: 1080, max: 1080 },
                        frameRate: { ideal: 30, max: 30 }
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true
                    }
                }

                // 根据共享类型调整约束
                if (this.shareType === 'window') {
                    displayMediaOptions.video.displaySurface = 'window'
                } else if (this.shareType === 'tab') {
                    displayMediaOptions.video.displaySurface = 'browser'
                }

                this.shareStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions)

                // 设置预览视频
                if (this.$refs.sharePreview) {
                    this.$refs.sharePreview.srcObject = this.shareStream
                }

                // 监听共享结束事件
                this.shareStream.getVideoTracks()[0].addEventListener('ended', () => {
                    this.stopScreenShare()
                })

                // 获取实际分辨率和帧率
                const videoTrack = this.shareStream.getVideoTracks()[0]
                const settings = videoTrack.getSettings()
                this.shareResolution = {
                    width: settings.width || 1920,
                    height: settings.height || 1080
                }
                this.shareFrameRate = settings.frameRate || 30

                this.isSharing = true
                this.$emit('screen-share-started', this.shareStream)
                this.$message.success('屏幕共享已开始')

                // 开始质量监控
                this.startQualityMonitoring()
            } catch (error) {
                console.error('开始屏幕共享失败:', error)
                this.$message.error('开始屏幕共享失败，请检查浏览器权限')
            } finally {
                this.shareLoading = false
            }
        },

        async stopScreenShare () {
            if (this.shareStream) {
                this.shareStream.getTracks().forEach(track => track.stop())
                this.shareStream = null
            }

            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop()
            }

            this.isSharing = false
            this.showStats = false
            this.$emit('screen-share-stopped')
            this.$message.info('屏幕共享已停止')
        },

        handleShareOption ({ key }) {
            this.shareType = key
            if (this.isSharing) {
                // 重新开始共享
                this.stopScreenShare().then(() => {
                    this.startScreenShare()
                })
            }
        },

        onVideoLoaded () {
            // 当接收到的视频加载完成时调用
            const video = this.$refs.sharedScreen
            if (video) {
                this.shareResolution = {
                    width: video.videoWidth,
                    height: video.videoHeight
                }
            }
        },

        toggleFullscreen () {
            const element = this.$refs.viewerArea
            if (!this.isFullscreen) {
                if (element.requestFullscreen) {
                    element.requestFullscreen()
                } else if (element.webkitRequestFullscreen) {
                    element.webkitRequestFullscreen()
                } else if (element.msRequestFullscreen) {
                    element.msRequestFullscreen()
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen()
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen()
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen()
                }
            }
        },

        onScaleChange (value) {
            const video = this.$refs.sharedScreen
            if (video) {
                video.style.transform = `scale(${value})`
            }
        },

        resetScale () {
            this.videoScale = 1
            this.onScaleChange(1)
        },

        takeScreenshot () {
            const video = this.$refs.sharedScreen
            if (!video) return

            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            canvas.width = video.videoWidth
            canvas.height = video.videoHeight

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

            canvas.toBlob(blob => {
                this.screenshotUrl = URL.createObjectURL(blob)
                this.screenshotModalVisible = true
            }, 'image/png')
        },

        downloadScreenshot () {
            if (this.screenshotUrl) {
                const link = document.createElement('a')
                link.href = this.screenshotUrl
                link.download = `screenshot-${Date.now()}.png`
                link.click()
                this.screenshotModalVisible = false
                URL.revokeObjectURL(this.screenshotUrl)
                this.screenshotUrl = ''
            }
        },

        startQualityMonitoring () {
            this.showStats = true

            // 模拟质量数据更新
            this.qualityInterval = setInterval(() => {
                this.shareLatency = Math.floor(Math.random() * 100) + 20
                this.shareBitrate = Math.floor(Math.random() * 2000) + 1000
                this.sharePacketLoss = Math.random() * 2

                // 根据指标更新连接状态
                if (this.shareLatency < 50 && this.sharePacketLoss < 1) {
                    this.connectionStatus = 'success'
                    this.connectionText = '优秀'
                } else if (this.shareLatency < 100 && this.sharePacketLoss < 2) {
                    this.connectionStatus = 'warning'
                    this.connectionText = '良好'
                } else {
                    this.connectionStatus = 'error'
                    this.connectionText = '较差'
                }
            }, 2000)
        },

        confirmRecording () {
            this.startRecording()
            this.recordingModalVisible = false
        },

        startRecording () {
            if (!this.shareStream) return

            try {
                this.mediaRecorder = new MediaRecorder(this.shareStream, {
                    mimeType: 'video/webm;codecs=vp9'
                })

                this.recordedChunks = []

                this.mediaRecorder.ondataavailable = event => {
                    if (event.data.size > 0) {
                        this.recordedChunks.push(event.data)
                    }
                }

                this.mediaRecorder.onstop = () => {
                    const blob = new Blob(this.recordedChunks, { type: 'video/webm' })
                    const url = URL.createObjectURL(blob)

                    const link = document.createElement('a')
                    link.href = url
                    link.download = `screen-recording-${Date.now()}.webm`
                    link.click()

                    URL.revokeObjectURL(url)
                }

                this.mediaRecorder.start()
                this.$message.success('屏幕录制已开始')
            } catch (error) {
                console.error('开始录制失败:', error)
                this.$message.error('开始录制失败')
            }
        },

        setupEventListeners () {
            // 监听全屏状态变化
            document.addEventListener('fullscreenchange', () => {
                this.isFullscreen = !!document.fullscreenElement
            })
        },

        // 接收远程屏幕共享流
        receiveScreenShare (stream) {
            this.receivedShareStream = stream
            if (this.$refs.sharedScreen) {
                this.$refs.sharedScreen.srcObject = stream
            }
        },

        // 停止接收屏幕共享
        stopReceivingShare () {
            this.receivedShareStream = null
            if (this.$refs.sharedScreen) {
                this.$refs.sharedScreen.srcObject = null
            }
        },

        cleanup () {
            if (this.shareStream) {
                this.shareStream.getTracks().forEach(track => track.stop())
            }

            if (this.qualityInterval) {
                clearInterval(this.qualityInterval)
            }

            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop()
            }

            if (this.screenshotUrl) {
                URL.revokeObjectURL(this.screenshotUrl)
            }
        }
    }
}
</script>

<style scoped>
.screen-share {
  height: 100%;
}

.share-controls {
  margin-bottom: 16px;
}

.share-preview {
  min-height: 200px;
  background: #f0f0f0;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.preview-video {
  max-width: 100%;
  max-height: 300px;
  border-radius: 6px;
}

.share-placeholder {
  text-align: center;
  color: #999;
}

.share-info {
  background: #fafafa;
  padding: 16px;
  border-radius: 6px;
}

.share-viewer {
  height: 100%;
}

.viewer-area {
  min-height: 400px;
  background: #000;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.shared-screen-video {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transform-origin: center;
  transition: transform 0.3s ease;
}

.viewer-placeholder {
  text-align: center;
  color: white;
}

.viewer-controls {
  display: flex;
  align-items: center;
  margin-top: 12px;
  padding: 8px;
  background: #fafafa;
  border-radius: 6px;
}

.share-stats {
  position: fixed;
  top: 80px;
  right: 16px;
  width: 280px;
  z-index: 100;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-item {
  text-align: center;
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.screenshot-preview {
  text-align: center;
}

/* 全屏模式下的样式 */
.viewer-area:-webkit-full-screen {
  width: 100vw;
  height: 100vh;
  background: #000;
}

.viewer-area:fullscreen {
  width: 100vw;
  height: 100vh;
  background: #000;
}
</style>
