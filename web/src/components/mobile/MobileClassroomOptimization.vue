<template>
  <div class="mobile-classroom-optimization" v-if="isMobile">
    <!-- 移动端课堂控制栏 -->
    <div class="mobile-classroom-controls" v-if="isClassroom">
      <div class="control-group">
        <a-button-group size="small">
          <a-button @click="toggleAudio" :type="audioEnabled ? 'primary' : 'default'">
            <a-icon :type="audioEnabled ? 'sound' : 'sound-mute'" />
            <span v-if="!isCompactMode">{{ audioEnabled ? '静音' : '取消静音' }}</span>
          </a-button>
          <a-button @click="toggleVideo" :type="videoEnabled ? 'primary' : 'default'">
            <a-icon :type="videoEnabled ? 'video-camera' : 'video-camera-slash'" />
            <span v-if="!isCompactMode">{{ videoEnabled ? '关闭摄像头' : '开启摄像头' }}</span>
          </a-button>
          <a-button @click="toggleScreenShare" :type="screenSharing ? 'primary' : 'default'">
            <a-icon type="desktop" />
            <span v-if="!isCompactMode">{{ screenSharing ? '停止共享' : '共享屏幕' }}</span>
          </a-button>
        </a-button-group>
      </div>

      <div class="control-group">
        <a-button @click="toggleWhiteboard" size="small">
          <a-icon type="highlight" />
          <span v-if="!isCompactMode">白板</span>
        </a-button>
        <a-button @click="toggleChat" size="small">
          <a-icon type="message" />
          <span v-if="!isCompactMode">聊天</span>
          <a-badge :count="unreadMessages" v-if="unreadMessages > 0" />
        </a-button>
        <a-button @click="toggleParticipants" size="small">
          <a-icon type="team" />
          <span v-if="!isCompactMode">参与者</span>
          <a-badge :count="participantCount" />
        </a-button>
      </div>

      <div class="control-group">
        <a-button @click="showMoreActions" size="small">
          <a-icon type="more" />
        </a-button>
      </div>
    </div>

    <!-- 移动端考试控制栏 -->
    <div class="mobile-exam-controls" v-if="isExam">
      <div class="exam-progress">
        <div class="progress-info">
          <span class="current-question">{{ currentQuestionIndex + 1 }}</span>
          <span class="separator">/</span>
          <span class="total-questions">{{ totalQuestions }}</span>
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${(currentQuestionIndex + 1) / totalQuestions * 100}%` }"
          ></div>
        </div>
      </div>

      <div class="exam-timer" v-if="timeRemaining > 0">
        <a-icon type="clock-circle" />
        <span class="time-text">{{ formatTime(timeRemaining) }}</span>
      </div>

      <div class="exam-actions">
        <a-button @click="toggleQuestionList" size="small">
          <a-icon type="bars" />
          题目
        </a-button>
        <a-button @click="flagQuestion" size="small" :type="isFlagged ? 'primary' : 'default'">
          <a-icon type="flag" />
          标记
        </a-button>
      </div>
    </div>

    <!-- 虚拟键盘占位 -->
    <div
      class="virtual-keyboard-spacer"
      v-if="keyboardVisible"
      :style="{ height: `${keyboardHeight}px` }"
    ></div>

    <!-- 触摸手势提示 -->
    <div class="gesture-hint" v-if="showGestureHint">
      <div class="hint-content">
        <a-icon type="swap" />
        <span>左右滑动切换内容</span>
      </div>
    </div>

    <!-- 网络状态指示器 -->
    <div class="network-indicator" :class="networkStatus">
      <a-icon :type="getNetworkIcon()" />
      <span class="status-text">{{ getNetworkText() }}</span>
    </div>
  </div>
</template>

<script>
import { mobileOptimizationMixin } from '@/utils/mobileOptimization'

export default {
    name: 'MobileClassroomOptimization',
    mixins: [mobileOptimizationMixin],
    props: {
        mode: {
            type: String,
            default: 'classroom', // classroom, exam
            validator: value => ['classroom', 'exam'].includes(value)
        },
        // 课堂相关props
        audioEnabled: {
            type: Boolean,
            default: false
        },
        videoEnabled: {
            type: Boolean,
            default: false
        },
        screenSharing: {
            type: Boolean,
            default: false
        },
        participantCount: {
            type: Number,
            default: 0
        },
        unreadMessages: {
            type: Number,
            default: 0
        },
        // 考试相关props
        currentQuestionIndex: {
            type: Number,
            default: 0
        },
        totalQuestions: {
            type: Number,
            default: 0
        },
        timeRemaining: {
            type: Number,
            default: 0
        },
        isFlagged: {
            type: Boolean,
            default: false
        }
    },
    data () {
        return {
            keyboardVisible: false,
            keyboardHeight: 0,
            showGestureHint: false,
            networkStatus: 'good', // good, poor, offline
            isCompactMode: false
        }
    },
    computed: {
        isClassroom () {
            return this.mode === 'classroom'
        },
        isExam () {
            return this.mode === 'exam'
        }
    },
    mounted () {
        this.setupMobileOptimizations()
        this.checkCompactMode()
        this.showInitialGestureHint()
    },
    methods: {
        setupMobileOptimizations () {
            // 监听虚拟键盘
            this.setupKeyboardDetection()

            // 监听网络状态
            this.setupNetworkMonitoring()

            // 监听手势
            this.setupGestureHandlers()

            // 监听屏幕方向变化
            window.addEventListener('orientationchange', this.handleOrientationChange)
        },

        setupKeyboardDetection () {
            const initialHeight = window.innerHeight

            window.addEventListener('resize', () => {
                const currentHeight = window.innerHeight
                const heightDiff = initialHeight - currentHeight

                if (heightDiff > 150) {
                    this.keyboardVisible = true
                    this.keyboardHeight = heightDiff
                    this.$emit('keyboardShow', heightDiff)
                } else {
                    if (this.keyboardVisible) {
                        this.keyboardVisible = false
                        this.keyboardHeight = 0
                        this.$emit('keyboardHide')
                    }
                }
            })
        },

        setupNetworkMonitoring () {
            // 监听网络状态变化
            window.addEventListener('online', () => {
                this.networkStatus = 'good'
            })

            window.addEventListener('offline', () => {
                this.networkStatus = 'offline'
            })

            // 检测网络质量（如果有相关API）
            if ('connection' in navigator) {
                const connection = navigator.connection
                this.updateNetworkStatus(connection)

                connection.addEventListener('change', () => {
                    this.updateNetworkStatus(connection)
                })
            }
        },

        updateNetworkStatus (connection) {
            if (connection.effectiveType === '4g') {
                this.networkStatus = 'good'
            } else if (connection.effectiveType === '3g') {
                this.networkStatus = 'fair'
            } else {
                this.networkStatus = 'poor'
            }
        },

        setupGestureHandlers () {
            document.addEventListener('swipegesture', (e) => {
                const { direction } = e.detail

                if (this.isExam) {
                    if (direction === 'left') {
                        this.$emit('nextQuestion')
                    } else if (direction === 'right') {
                        this.$emit('prevQuestion')
                    }
                }

                this.$emit('gesture', e.detail)
            })
        },

        handleOrientationChange () {
            setTimeout(() => {
                this.checkCompactMode()
                this.$emit('orientationChange', window.orientation)
            }, 100)
        },

        checkCompactMode () {
            // 横屏时启用紧凑模式
            this.isCompactMode = window.innerWidth > window.innerHeight
        },

        showInitialGestureHint () {
            if (this.isExam) {
                this.showGestureHint = true
                setTimeout(() => {
                    this.showGestureHint = false
                }, 3000)
            }
        },

        // 课堂控制方法
        toggleAudio () {
            this.$emit('toggleAudio')
        },

        toggleVideo () {
            this.$emit('toggleVideo')
        },

        toggleScreenShare () {
            this.$emit('toggleScreenShare')
        },

        toggleWhiteboard () {
            this.$emit('toggleWhiteboard')
        },

        toggleChat () {
            this.$emit('toggleChat')
        },

        toggleParticipants () {
            this.$emit('toggleParticipants')
        },

        showMoreActions () {
            this.$emit('showMoreActions')
        },

        // 考试控制方法
        toggleQuestionList () {
            this.$emit('toggleQuestionList')
        },

        flagQuestion () {
            this.$emit('flagQuestion')
        },

        // 工具方法
        formatTime (seconds) {
            const hours = Math.floor(seconds / 3600)
            const minutes = Math.floor((seconds % 3600) / 60)
            const secs = seconds % 60

            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
            }
            return `${minutes}:${secs.toString().padStart(2, '0')}`
        },

        getNetworkIcon () {
            switch (this.networkStatus) {
            case 'good': return 'wifi'
            case 'fair': return 'wifi'
            case 'poor': return 'disconnect'
            case 'offline': return 'disconnect'
            default: return 'wifi'
            }
        },

        getNetworkText () {
            switch (this.networkStatus) {
            case 'good': return '网络良好'
            case 'fair': return '网络一般'
            case 'poor': return '网络较差'
            case 'offline': return '网络断开'
            default: return '网络状态未知'
            }
        }
    },

    beforeDestroy () {
        window.removeEventListener('orientationchange', this.handleOrientationChange)
    }
}
</script>

<style lang="less" scoped>
.mobile-classroom-optimization {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-top: 1px solid #e8e8e8;
  padding: 8px;
  transition: all 0.3s ease;

  @media (max-width: 768px) {
    padding: 4px;
  }
}

.mobile-classroom-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  .control-group {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .ant-btn {
    border-radius: 20px;
    min-width: 40px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;

    span {
      margin-left: 4px;
      font-size: 12px;
    }
  }
}

.mobile-exam-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;

  .exam-progress {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .progress-info {
      display: flex;
      align-items: center;
      font-size: 14px;
      font-weight: 500;

      .current-question {
        color: #1890ff;
      }

      .separator {
        margin: 0 4px;
        color: #999;
      }

      .total-questions {
        color: #666;
      }
    }

    .progress-bar {
      height: 4px;
      background: #f0f0f0;
      border-radius: 2px;
      overflow: hidden;

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #1890ff, #40a9ff);
        transition: width 0.3s ease;
      }
    }
  }

  .exam-timer {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: #fff2f0;
    border: 1px solid #ffccc7;
    border-radius: 12px;
    color: #ff4d4f;
    font-size: 12px;
    font-weight: 500;

    .time-text {
      min-width: 45px;
      text-align: center;
    }
  }

  .exam-actions {
    display: flex;
    gap: 4px;

    .ant-btn {
      height: 32px;
      border-radius: 16px;
      font-size: 12px;
    }
  }
}

.virtual-keyboard-spacer {
  transition: height 0.3s ease;
}

.gesture-hint {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 12px 20px;
  border-radius: 20px;
  font-size: 14px;
  z-index: 9999;
  animation: fadeInOut 3s ease-in-out;

  .hint-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.network-indicator {
  position: fixed;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  z-index: 1001;
  transition: all 0.3s ease;

  &.good {
    background: #f6ffed;
    border: 1px solid #b7eb8f;
    color: #52c41a;
  }

  &.fair {
    background: #fff7e6;
    border: 1px solid #ffd591;
    color: #fa8c16;
  }

  &.poor {
    background: #fff2f0;
    border: 1px solid #ffccc7;
    color: #ff4d4f;
  }

  &.offline {
    background: #f5f5f5;
    border: 1px solid #d9d9d9;
    color: #666;
  }

  .status-text {
    white-space: nowrap;
  }
}

@keyframes fadeInOut {
  0%, 100% { opacity: 0; }
  20%, 80% { opacity: 1; }
}

// 横屏适配
@media (orientation: landscape) and (max-height: 500px) {
  .mobile-classroom-optimization {
    padding: 2px 8px;
  }

  .mobile-classroom-controls {
    .ant-btn {
      height: 32px;
      min-width: 36px;

      span {
        display: none; // 横屏时隐藏文字，只显示图标
      }
    }
  }

  .mobile-exam-controls {
    padding: 4px 0;

    .exam-timer {
      padding: 2px 6px;
    }
  }
}

// 深色模式适配
@media (prefers-color-scheme: dark) {
  .mobile-classroom-optimization {
    background: rgba(20, 20, 20, 0.95);
    border-top-color: #303030;
  }

  .gesture-hint {
    background: rgba(255, 255, 255, 0.9);
    color: #000;
  }
}
</style>
