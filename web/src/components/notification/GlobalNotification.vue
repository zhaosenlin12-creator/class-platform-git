<template>
  <div class="global-notification">
    <!-- 通知铃铛图标 -->
    <a-badge :count="unreadCount" :offset="[10, 0]" style="cursor: pointer">
      <a-icon
        type="bell"
        :style="{ fontSize: '18px', color: hasUnread ? '#1890ff' : '#666' }"
        @click="toggleNotificationPanel"
      />
    </a-badge>

    <!-- 通知面板 -->
    <a-drawer
      title="消息通知"
      placement="right"
      :closable="true"
      :visible="notificationVisible"
      @close="notificationVisible = false"
      width="400"
    >
      <div class="notification-panel">
        <!-- 通知筛选 -->
        <a-tabs v-model="activeNotificationType" size="small">
          <a-tab-pane key="all" tab="全部">
            <a-badge :count="getTotalCount()" :offset="[10, -5]" />
          </a-tab-pane>
          <a-tab-pane key="system" tab="系统">
            <a-badge :count="getTypeCount('system')" :offset="[10, -5]" />
          </a-tab-pane>
          <a-tab-pane key="course" tab="课程">
            <a-badge :count="getTypeCount('course')" :offset="[10, -5]" />
          </a-tab-pane>
          <a-tab-pane key="homework" tab="作业">
            <a-badge :count="getTypeCount('homework')" :offset="[10, -5]" />
          </a-tab-pane>
          <a-tab-pane key="social" tab="社交">
            <a-badge :count="getTypeCount('social')" :offset="[10, -5]" />
          </a-tab-pane>
        </a-tabs>

        <!-- 操作按钮 -->
        <div class="notification-actions">
          <a-button size="small" @click="markAllAsRead" v-if="hasUnread">
            <a-icon type="check" />
            全部已读
          </a-button>
          <a-button size="small" @click="clearAllRead">
            <a-icon type="delete" />
            清空已读
          </a-button>
        </div>

        <!-- 通知列表 -->
        <div class="notification-list">
          <div
            v-for="notification in filteredNotifications"
            :key="notification.id"
            :class="['notification-item', { 'unread': !notification.isRead }]"
            @click="handleNotificationClick(notification)"
          >
            <div class="notification-icon">
              <a-avatar :style="{ backgroundColor: getTypeColor(notification.type) }">
                <a-icon :type="getTypeIcon(notification.type)" />
              </a-avatar>
            </div>

            <div class="notification-content">
              <div class="notification-title">{{ notification.title }}</div>
              <div class="notification-message">{{ notification.message }}</div>
              <div class="notification-meta">
                <span class="notification-time">{{ formatTime(notification.createTime) }}</span>
                <a-tag size="small" :color="getTypeColor(notification.type)">
                  {{ getTypeLabel(notification.type) }}
                </a-tag>
              </div>
            </div>

            <div class="notification-actions-mini">
              <a-button
                type="link"
                size="small"
                @click.stop="markAsRead(notification)"
                v-if="!notification.isRead"
              >
                <a-icon type="check" />
              </a-button>
              <a-button
                type="link"
                size="small"
                @click.stop="deleteNotification(notification)"
              >
                <a-icon type="delete" />
              </a-button>
            </div>
          </div>

          <div v-if="filteredNotifications.length === 0" class="empty-notifications">
            <a-empty description="暂无通知" />
          </div>
        </div>
      </div>
    </a-drawer>

    <!-- 实时聊天气泡 - 暂时隐藏，待Socket.io实时功能完善后开启 -->
    <div class="chat-bubble" @click="toggleChatPanel" v-if="false">
      <a-badge :count="unreadChatCount" :offset="[5, 5]">
        <a-avatar :style="{ backgroundColor: '#52c41a' }">
          <a-icon type="message" />
        </a-avatar>
      </a-badge>
    </div>

    <!-- 聊天面板 -->
    <a-drawer
      title="实时聊天"
      placement="right"
      :closable="true"
      :visible="chatVisible"
      @close="chatVisible = false"
      width="400"
    >
      <div class="chat-panel">
        <!-- 聊天室列表 -->
        <a-tabs v-model="activeChatRoom" size="small">
          <a-tab-pane key="class" tab="班级群聊">
            <a-badge :count="getChatCount('class')" :offset="[10, -5]" />
          </a-tab-pane>
          <a-tab-pane key="study" tab="学习讨论">
            <a-badge :count="getChatCount('study')" :offset="[10, -5]" />
          </a-tab-pane>
          <a-tab-pane key="teacher" tab="老师答疑">
            <a-badge :count="getChatCount('teacher')" :offset="[10, -5]" />
          </a-tab-pane>
        </a-tabs>

        <!-- 聊天消息列表 -->
        <div class="chat-messages" ref="chatMessages">
          <div
            v-for="message in currentChatMessages"
            :key="message.id"
            :class="['chat-message', { 'own': message.isOwn }]"
          >
            <div class="message-avatar">
              <a-avatar :src="message.avatar" size="small">
                {{ message.sender.charAt(0) }}
              </a-avatar>
            </div>
            <div class="message-content">
              <div class="message-info">
                <span class="message-sender">{{ message.sender }}</span>
                <span class="message-time">{{ formatTime(message.time) }}</span>
              </div>
              <div class="message-text">{{ message.content }}</div>
            </div>
          </div>
        </div>

        <!-- 消息输入区 -->
        <div class="chat-input">
          <a-input
            v-model="chatInput"
            placeholder="输入消息..."
            @keyup.enter="sendMessage"
          >
            <a-button slot="addonAfter" @click="sendMessage" type="primary" size="small">
              发送
            </a-button>
          </a-input>
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<script>
export default {
    name: 'GlobalNotification',
    data () {
        return {
            notificationVisible: false,
            chatVisible: false,
            showChatBubble: true,
            activeNotificationType: 'all',
            activeChatRoom: 'class',
            chatInput: '',

            // 通知列表（真实数据，初始为空）
            notifications: [],

            // 聊天消息（真实数据，初始为空）
            chatMessages: {
                class: [],
                study: [],
                teacher: []
            }
        }
    },

    computed: {
        unreadCount () {
            return this.notifications.filter(n => !n.isRead).length
        },

        hasUnread () {
            return this.unreadCount > 0
        },

        filteredNotifications () {
            if (this.activeNotificationType === 'all') {
                return this.notifications.sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
            }
            return this.notifications
                .filter(n => n.type === this.activeNotificationType)
                .sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
        },

        currentChatMessages () {
            return this.chatMessages[this.activeChatRoom] || []
        },

        unreadChatCount () {
            return Object.values(this.chatMessages)
                .flat()
                .filter(m => !m.isOwn && !m.isRead).length
        }
    },

    mounted () {
    // 不再使用模拟数据
    },

    methods: {
        toggleNotificationPanel () {
            this.notificationVisible = !this.notificationVisible
        },

        toggleChatPanel () {
            this.chatVisible = !this.chatVisible
        },

        getTotalCount () {
            return this.notifications.filter(n => !n.isRead).length
        },

        getTypeCount (type) {
            return this.notifications.filter(n => n.type === type && !n.isRead).length
        },

        getChatCount (room) {
            return this.chatMessages[room]
                ? this.chatMessages[room].filter(m => !m.isOwn && !m.isRead).length
                : 0
        },

        markAllAsRead () {
            this.notifications.forEach(n => {
                if (this.activeNotificationType === 'all' || n.type === this.activeNotificationType) {
                    n.isRead = true
                }
            })
            this.$message.success('已标记为已读')
        },

        clearAllRead () {
            if (this.activeNotificationType === 'all') {
                this.notifications = this.notifications.filter(n => !n.isRead)
            } else {
                this.notifications = this.notifications.filter(n =>
                    n.type !== this.activeNotificationType || !n.isRead
                )
            }
            this.$message.success('已清空已读通知')
        },

        markAsRead (notification) {
            notification.isRead = true
        },

        deleteNotification (notification) {
            const index = this.notifications.findIndex(n => n.id === notification.id)
            if (index > -1) {
                this.notifications.splice(index, 1)
                this.$message.success('通知已删除')
            }
        },

        handleNotificationClick (notification) {
            this.markAsRead(notification)

            // 根据通知类型执行相应操作
            switch (notification.type) {
            case 'homework':
                this.$message.info('跳转到作业页面')
                this.$router.push('/student/homework')
                break
            case 'course':
                this.$message.info('跳转到课堂页面')
                this.$router.push('/student/classrooms')
                break
            case 'social':
                this.$message.info('跳转到作品页面')
                this.$router.push('/student/works')
                break
            default:
                break
            }

            this.notificationVisible = false
        },

        sendMessage () {
            if (!this.chatInput.trim()) return

            const userInfo = this.$store.getters.userInfo || {}
            const newMessage = {
                id: Date.now().toString(),
                sender: userInfo.realname || userInfo.username || '我',
                content: this.chatInput,
                time: new Date(),
                avatar: userInfo.avatar || null,
                isOwn: true,
                isRead: true
            }

            if (!this.chatMessages[this.activeChatRoom]) {
                this.chatMessages[this.activeChatRoom] = []
            }

            this.chatMessages[this.activeChatRoom].push(newMessage)
            this.chatInput = ''

            // 滚动到底部
            this.$nextTick(() => {
                const messagesEl = this.$refs.chatMessages
                if (messagesEl) {
                    messagesEl.scrollTop = messagesEl.scrollHeight
                }
            })
        },

        formatTime (time) {
            const now = new Date()
            const diff = now - new Date(time)
            const minutes = Math.floor(diff / (1000 * 60))
            const hours = Math.floor(diff / (1000 * 60 * 60))
            const days = Math.floor(diff / (1000 * 60 * 60 * 24))

            if (minutes < 1) return '刚刚'
            if (minutes < 60) return `${minutes}分钟前`
            if (hours < 24) return `${hours}小时前`
            if (days < 7) return `${days}天前`
            return new Date(time).toLocaleDateString()
        },

        getTypeIcon (type) {
            const icons = {
                system: 'setting',
                course: 'book',
                homework: 'file-text',
                social: 'heart'
            }
            return icons[type] || 'bell'
        },

        getTypeColor (type) {
            const colors = {
                system: '#f5222d',
                course: '#1890ff',
                homework: '#fa8c16',
                social: '#52c41a'
            }
            return colors[type] || '#666'
        },

        getTypeLabel (type) {
            const labels = {
                system: '系统',
                course: '课程',
                homework: '作业',
                social: '社交'
            }
            return labels[type] || '其他'
        }

    }
}
</script>

<style scoped lang="less">
.global-notification {
  .notification-panel {
    .notification-actions {
      display: flex;
      justify-content: space-between;
      margin: 16px 0;
    }

    .notification-list {
      .notification-item {
        display: flex;
        padding: 12px;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        transition: background-color 0.2s;

        &:hover {
          background-color: #f5f5f5;
        }

        &.unread {
          background-color: #e6f7ff;
          border-left: 3px solid #1890ff;
        }

        .notification-icon {
          margin-right: 12px;
        }

        .notification-content {
          flex: 1;

          .notification-title {
            font-weight: 500;
            margin-bottom: 4px;
          }

          .notification-message {
            color: #666;
            font-size: 12px;
            line-height: 1.4;
            margin-bottom: 8px;
          }

          .notification-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;

            .notification-time {
              color: #999;
              font-size: 11px;
            }
          }
        }

        .notification-actions-mini {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
      }

      .empty-notifications {
        padding: 40px 20px;
        text-align: center;
      }
    }
  }

  .chat-bubble {
    position: fixed;
    bottom: 80px;
    right: 24px;
    cursor: pointer;
    z-index: 1000;
    transition: all 0.3s;

    &:hover {
      transform: scale(1.1);
    }
  }

  .chat-panel {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 120px);

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 0;
      margin: 16px 0;

      .chat-message {
        display: flex;
        margin-bottom: 16px;

        &.own {
          flex-direction: row-reverse;

          .message-content {
            text-align: right;
            margin-right: 8px;
            margin-left: 0;

            .message-text {
              background-color: #1890ff;
              color: white;
            }
          }
        }

        .message-avatar {
          margin-right: 8px;
        }

        .message-content {
          max-width: 70%;
          margin-left: 8px;

          .message-info {
            display: flex;
            gap: 8px;
            margin-bottom: 4px;

            .message-sender {
              font-size: 12px;
              color: #666;
              font-weight: 500;
            }

            .message-time {
              font-size: 11px;
              color: #999;
            }
          }

          .message-text {
            background-color: #f5f5f5;
            padding: 8px 12px;
            border-radius: 8px;
            word-wrap: break-word;
            line-height: 1.4;
          }
        }
      }
    }

    .chat-input {
      border-top: 1px solid #f0f0f0;
      padding-top: 16px;
    }
  }
}
</style>
