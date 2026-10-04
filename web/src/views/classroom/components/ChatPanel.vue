<template>
  <div class="chat-panel">
    <a-card title="课堂聊天" size="small" :body-style="{ padding: 0 }">
      <div slot="extra">
        <a-badge :count="unreadCount" size="small">
          <a-button size="small" @click="toggleMinimize">
            <a-icon :type="isMinimized ? 'up' : 'down'" />
          </a-button>
        </a-badge>
      </div>

      <div v-show="!isMinimized" class="chat-container">
        <!-- 聊天消息区域 -->
        <div class="chat-messages" ref="chatMessages">
          <div
            v-for="message in messages"
            :key="message.id"
            class="message-item"
            :class="{
              'own-message': message.userId === currentUserId,
              'teacher-message': message.userRole === 'teacher',
              'system-message': message.type === 'system'
            }"
          >
            <!-- 系统消息 -->
            <div v-if="message.type === 'system'" class="system-message-content">
              <a-icon type="info-circle" />
              <span>{{ message.content }}</span>
              <span class="message-time">{{ formatTime(message.timestamp) }}</span>
            </div>

            <!-- 用户消息 -->
            <div v-else class="user-message-content">
              <div class="message-header">
                <a-avatar :size="24" :src="message.avatar">
                  {{ message.userName ? message.userName.charAt(0) : 'U' }}
                </a-avatar>
                <span class="user-name" :style="{ color: message.nameColor }">
                  {{ message.userName }}
                </span>
                <a-tag v-if="message.userRole === 'teacher'" color="blue" size="small">
                  教师
                </a-tag>
                <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              </div>

              <div class="message-content">
                <!-- 文本消息 -->
                <div v-if="message.messageType === 'text'" class="text-message">
                  {{ message.content }}
                </div>

                <!-- 图片消息 -->
                <div v-else-if="message.messageType === 'image'" class="image-message">
                  <img
                    :src="message.content"
                    alt="图片"
                    class="message-image"
                    @click="previewImage(message.content)"
                  />
                </div>

                <!-- 文件消息 -->
                <div v-else-if="message.messageType === 'file'" class="file-message">
                  <a-button
                    type="link"
                    size="small"
                    @click="downloadFile(message.fileUrl, message.fileName)"
                  >
                    <a-icon type="paperclip" />
                    {{ message.fileName }}
                    <span class="file-size">({{ formatFileSize(message.fileSize) }})</span>
                  </a-button>
                </div>

                <!-- 代码消息 -->
                <div v-else-if="message.messageType === 'code'" class="code-message">
                  <div class="code-header">
                    <span>{{ message.language || 'Code' }}</span>
                    <a-button size="small" type="link" @click="copyCode(message.content)">
                      <a-icon type="copy" />
                      复制
                    </a-button>
                  </div>
                  <pre class="code-content">{{ message.content }}</pre>
                </div>

                <!-- 表情回应 -->
                <div v-if="message.reactions && message.reactions.length > 0" class="message-reactions">
                  <span
                    v-for="reaction in message.reactions"
                    :key="reaction.emoji"
                    class="reaction-item"
                    :class="{ active: reaction.users.includes(currentUserId) }"
                    @click="toggleReaction(message.id, reaction.emoji)"
                  >
                    {{ reaction.emoji }} {{ reaction.count }}
                  </span>
                </div>

                <!-- 回复按钮 -->
                <div class="message-actions" v-if="!message.isOwn">
                  <a-button
                    type="link"
                    size="small"
                    @click="replyToMessage(message)"
                  >
                    <a-icon type="message" />
                    回复
                  </a-button>
                  <a-dropdown :trigger="['click']">
                    <a-button type="link" size="small">
                      <a-icon type="smile" />
                      表情
                    </a-button>
                    <a-menu slot="overlay" @click="({ key }) => addReaction(message.id, key)">
                      <a-menu-item v-for="emoji in quickEmojis" :key="emoji">
                        {{ emoji }}
                      </a-menu-item>
                    </a-menu>
                  </a-dropdown>
                </div>
              </div>
            </div>
          </div>

          <!-- 正在输入提示 -->
          <div v-if="typingUsers.length > 0" class="typing-indicator">
            <a-spin size="small" />
            <span>{{ getTypingText() }}</span>
          </div>
        </div>

        <!-- 消息输入区域 -->
        <div class="chat-input-container">
          <!-- 回复消息显示 -->
          <div v-if="replyingTo" class="replying-to">
            <div class="reply-info">
              <a-icon type="corner-down-right" />
              <span>回复 {{ replyingTo.userName }}:</span>
              <span class="reply-preview">{{ getReplyPreview(replyingTo) }}</span>
            </div>
            <a-button size="small" type="link" @click="cancelReply">
              <a-icon type="close" />
            </a-button>
          </div>

          <!-- 输入工具栏 -->
          <div class="input-toolbar">
            <a-button-group size="small">
              <a-upload
                :show-upload-list="false"
                :before-upload="beforeUploadImage"
                accept="image/*"
              >
                <a-button>
                  <a-icon type="picture" />
                </a-button>
              </a-upload>

              <a-upload
                :show-upload-list="false"
                :before-upload="beforeUploadFile"
              >
                <a-button>
                  <a-icon type="paperclip" />
                </a-button>
              </a-upload>

              <a-button @click="showCodeInput = !showCodeInput">
                <a-icon type="code" />
              </a-button>

              <a-dropdown :trigger="['click']">
                <a-button>
                  <a-icon type="smile" />
                </a-button>
                <a-menu slot="overlay" @click="insertEmoji">
                  <a-menu-item v-for="emoji in allEmojis" :key="emoji">
                    {{ emoji }}
                  </a-menu-item>
                </a-menu>
              </a-dropdown>
            </a-button-group>

            <a-switch
              v-if="userRole === 'teacher'"
              v-model="muteStudents"
              size="small"
              style="margin-left: 8px;"
            />
            <span v-if="userRole === 'teacher'" style="font-size: 12px; margin-left: 4px;">
              禁言学生
            </span>
          </div>

          <!-- 代码输入区域 -->
          <div v-if="showCodeInput" class="code-input-area">
            <a-select v-model="codeLanguage" size="small" style="width: 100px; margin-bottom: 8px;">
              <a-select-option value="javascript">JavaScript</a-select-option>
              <a-select-option value="python">Python</a-select-option>
              <a-select-option value="java">Java</a-select-option>
              <a-select-option value="html">HTML</a-select-option>
              <a-select-option value="css">CSS</a-select-option>
            </a-select>
            <a-textarea
              v-model="codeContent"
              placeholder="输入代码..."
              :rows="4"
              style="font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;"
            />
            <div style="margin-top: 8px;">
              <a-button size="small" @click="sendCodeMessage" type="primary">
                发送代码
              </a-button>
              <a-button size="small" @click="showCodeInput = false" style="margin-left: 8px;">
                取消
              </a-button>
            </div>
          </div>

          <!-- 文本输入 -->
          <div class="text-input-area">
            <a-input
              v-model="inputMessage"
              placeholder="输入消息... (Enter发送，Shift+Enter换行)"
              :disabled="isInputDisabled"
              @keydown="handleKeyDown"
              @input="handleInput"
              ref="messageInput"
            />
            <a-button
              type="primary"
              @click="sendMessage"
              :disabled="!inputMessage.trim() || isInputDisabled"
              style="margin-left: 8px;"
            >
              <a-icon type="send" />
            </a-button>
          </div>
        </div>
      </div>
    </a-card>

    <!-- 图片预览 -->
    <a-modal
      :visible="imagePreviewVisible"
      @cancel="imagePreviewVisible = false"
      footer="{null}"
      width="80%"
    >
      <img :src="previewImageUrl" alt="预览" style="width: 100%;" />
    </a-modal>

    <!-- 用户列表 -->
    <a-drawer
      title="在线用户"
      :visible="userListVisible"
      @close="userListVisible = false"
      width="300"
    >
      <div class="online-users-list">
        <div
          v-for="user in onlineUsers"
          :key="user.id"
          class="user-item"
          :class="{ typing: typingUsers.includes(user.id) }"
        >
          <a-avatar :size="32" :src="user.avatar">
            {{ user.name.charAt(0) }}
          </a-avatar>
          <div class="user-info">
            <div class="user-name">{{ user.name }}</div>
            <div class="user-status">
              <a-badge
                :status="user.online ? 'success' : 'default'"
                :text="user.online ? '在线' : '离线'"
              />
              <span v-if="typingUsers.includes(user.id)" class="typing-text">
                正在输入...
              </span>
            </div>
          </div>
          <div v-if="userRole === 'teacher' && user.role === 'student'" class="user-actions">
            <a-button
              size="small"
              @click="toggleUserMute(user.id)"
              :type="user.muted ? 'danger' : 'default'"
            >
              {{ user.muted ? '取消禁言' : '禁言' }}
            </a-button>
          </div>
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<script>
export default {
    name: 'ChatPanel',
    props: {
        classroomId: {
            type: String,
            required: true
        },
        userInfo: {
            type: Object,
            default: () => ({})
        },
        userRole: {
            type: String,
            default: 'student'
        }
    },
    data () {
        return {
            // UI状态
            isMinimized: false,
            unreadCount: 0,
            showCodeInput: false,
            imagePreviewVisible: false,
            userListVisible: false,
            previewImageUrl: '',

            // 消息相关
            messages: [],
            inputMessage: '',
            replyingTo: null,

            // 代码消息
            codeContent: '',
            codeLanguage: 'javascript',

            // 用户和权限
            currentUserId: this.userInfo.id || 'user123',
            muteStudents: false,
            onlineUsers: [
                {
                    id: 'teacher1',
                    name: '李老师',
                    role: 'teacher',
                    online: true,
                    avatar: null,
                    muted: false
                },
                {
                    id: 'student1',
                    name: '张同学',
                    role: 'student',
                    online: true,
                    avatar: null,
                    muted: false
                },
                {
                    id: 'student2',
                    name: '李同学',
                    role: 'student',
                    online: true,
                    avatar: null,
                    muted: false
                }
            ],

            // 正在输入
            typingUsers: [],
            typingTimer: null,

            // 表情包
            quickEmojis: ['👍', '👎', '❤️', '😊', '😄', '🎉'],
            allEmojis: [
                '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
                '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
                '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
                '🤪', '🤨', '🧐', '🤓', '😎', '👍', '👎', '👌',
                '✌️', '🤞', '🤟', '🤘', '👏', '🙌', '👐', '🤲'
            ]
        }
    },
    computed: {
        isInputDisabled () {
            const currentUser = this.onlineUsers.find(u => u.id === this.currentUserId)
            return this.muteStudents && this.userRole === 'student' && currentUser && currentUser.muted
        }
    },
    mounted () {
        this.loadInitialMessages()
        this.setupChatListeners()
        this.scrollToBottom()
    },
    beforeDestroy () {
        this.cleanup()
    },
    methods: {
        async loadInitialMessages () {
            // 从后端API加载历史聊天记录
            try {
                const { getAction } = require('@/api/manage')
                const res = await getAction(`/teaching/classroom/${this.classroomId}/chat-history`, {
                    pageNo: 1,
                    pageSize: 100
                })

                if (res && res.success && res.result && res.result.records) {
                    // 转换后端数据格式
                    this.messages = res.result.records.map(msg => ({
                        id: msg.id,
                        userId: msg.userId,
                        userName: msg.userName,
                        userRole: msg.userRole,
                        avatar: msg.avatar,
                        nameColor: this.getUserColor(msg.userId),
                        messageType: msg.type || 'text',
                        content: msg.content,
                        timestamp: new Date(msg.timestamp).getTime(),
                        reactions: []
                    }))

                    console.log('✅ [CHAT] 加载历史聊天记录成功:', this.messages.length, '条')

                    // 如果没有历史记录，添加欢迎消息
                    if (this.messages.length === 0) {
                        this.messages.push({
                            id: 'welcome',
                            type: 'system',
                            content: '欢迎进入课堂聊天室！',
                            timestamp: Date.now()
                        })
                    }
                } else {
                    // 加载失败时显示欢迎消息
                    this.messages = [{
                        id: 'welcome',
                        type: 'system',
                        content: '欢迎进入课堂聊天室！',
                        timestamp: Date.now()
                    }]
                }
            } catch (error) {
                console.error('❌ [CHAT] 加载历史聊天记录失败:', error)
                // 出错时显示欢迎消息
                this.messages = [{
                    id: 'welcome',
                    type: 'system',
                    content: '欢迎进入课堂聊天室！',
                    timestamp: Date.now()
                }]
            }
        },

        setupChatListeners () {
            // 设置聊天相关的事件监听
            // 这里应该连接到WebSocket或其他实时通信服务
        },

        sendMessage () {
            if (!this.inputMessage.trim()) return

            const newMessage = {
                id: Date.now().toString(),
                userId: this.currentUserId,
                userName: this.userInfo.name || '我',
                userRole: this.userRole,
                avatar: this.userInfo.avatar,
                nameColor: this.getUserColor(this.currentUserId),
                messageType: 'text',
                content: this.inputMessage.trim(),
                timestamp: Date.now(),
                replyTo: this.replyingTo ? this.replyingTo.id : null,
                reactions: []
            }

            this.messages.push(newMessage)
            this.inputMessage = ''
            this.replyingTo = null

            // 发送消息到服务器
            this.$emit('send-message', newMessage)

            this.$nextTick(() => {
                this.scrollToBottom()
            })
        },

        sendCodeMessage () {
            if (!this.codeContent.trim()) return

            const newMessage = {
                id: Date.now().toString(),
                userId: this.currentUserId,
                userName: this.userInfo.name || '我',
                userRole: this.userRole,
                avatar: this.userInfo.avatar,
                nameColor: this.getUserColor(this.currentUserId),
                messageType: 'code',
                content: this.codeContent.trim(),
                language: this.codeLanguage,
                timestamp: Date.now(),
                reactions: []
            }

            this.messages.push(newMessage)
            this.codeContent = ''
            this.showCodeInput = false

            this.$emit('send-message', newMessage)

            this.$nextTick(() => {
                this.scrollToBottom()
            })
        },

        handleKeyDown (event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                this.sendMessage()
            }
        },

        handleInput () {
            // 发送正在输入状态
            this.sendTypingStatus(true)

            // 清除之前的定时器
            if (this.typingTimer) {
                clearTimeout(this.typingTimer)
            }

            // 设置新的定时器，停止输入状态
            this.typingTimer = setTimeout(() => {
                this.sendTypingStatus(false)
            }, 2000)
        },

        sendTypingStatus (isTyping) {
            this.$emit('typing-status', {
                userId: this.currentUserId,
                userName: this.userInfo.name,
                isTyping: isTyping
            })
        },

        beforeUploadImage (file) {
            const isImage = file.type.startsWith('image/')
            if (!isImage) {
                this.$message.error('只能上传图片文件!')
                return false
            }

            const maxSize = 100 * 1024 * 1024 // 100MB
            if (file.size > maxSize) {
                this.$message.error('图片大小超过限制（最大100MB），请压缩后重新上传')
                return false
            }

            // 读取文件并发送
            const reader = new FileReader()
            reader.onload = (e) => {
                this.sendImageMessage(e.target.result, file.name)
            }
            reader.readAsDataURL(file)

            return false
        },

        beforeUploadFile (file) {
            const maxSize = 100 * 1024 * 1024 // 100MB
            if (file.size > maxSize) {
                this.$message.error('文件大小超过限制（最大100MB），请压缩文件后重新上传')
                return false
            }

            // 验证文件类型（与后端指定允许类型保持一致）
            const allowedExts = new Set(['.zip', '.rar', '.7z', '.tar', '.gz',
                '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
                '.sb3', '.sb2', '.py', '.json',
                '.mp4', '.webm', '.mp3', '.wav', '.ogg',
                '.jpg', '.jpeg', '.png', '.gif', '.webp'])
            const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
            if (!allowedExts.has(ext)) {
                this.$message.error('不支持该文件类型')
                return false
            }

            // 上传到后端并分享下载链接
            const { uploadAction } = require('@/api/manage')
            const formData = new FormData()
            formData.append('file', file)

            const msgKey = 'fileUpload_' + Date.now()
            this.$message.loading({ content: '文件上传中...', key: msgKey, duration: 0 })

            uploadAction(`/classroom/${this.classroomId}/upload-file`, formData)
                .then(res => {
                    if (res && res.success) {
                        this.$message.success({ content: '文件分享成功', key: msgKey })
                        this.sendFileMessage(res.result.fileUrl, res.result.fileName, res.result.fileSize)
                    } else {
                        this.$message.error({ content: (res && res.message) || '文件上传失败', key: msgKey })
                    }
                })
                .catch(err => {
                    console.error('[ChatPanel] 文件上传失败:', err)
                    this.$message.error({ content: '文件上传失败，请重试', key: msgKey })
                })

            return false // 阻止 a-upload 自动处理
        },

        sendImageMessage (imageUrl, fileName) {
            const newMessage = {
                id: Date.now().toString(),
                userId: this.currentUserId,
                userName: this.userInfo.name || '我',
                userRole: this.userRole,
                avatar: this.userInfo.avatar,
                nameColor: this.getUserColor(this.currentUserId),
                messageType: 'image',
                content: imageUrl,
                fileName: fileName,
                timestamp: Date.now(),
                reactions: []
            }

            this.messages.push(newMessage)
            this.$emit('send-message', newMessage)

            this.$nextTick(() => {
                this.scrollToBottom()
            })
        },

        sendFileMessage (fileUrl, fileName, fileSize) {
            const newMessage = {
                id: Date.now().toString(),
                userId: this.currentUserId,
                userName: this.userInfo.name || '我',
                userRole: this.userRole,
                avatar: this.userInfo.avatar,
                nameColor: this.getUserColor(this.currentUserId),
                messageType: 'file',
                content: fileName,
                fileUrl: fileUrl,
                fileName: fileName,
                fileSize: fileSize,
                timestamp: Date.now(),
                reactions: []
            }

            this.messages.push(newMessage)
            this.$emit('send-message', newMessage)

            this.$nextTick(() => {
                this.scrollToBottom()
            })
        },

        insertEmoji ({ key }) {
            this.inputMessage += key
            this.$refs.messageInput.focus()
        },

        replyToMessage (message) {
            this.replyingTo = message
            this.$refs.messageInput.focus()
        },

        cancelReply () {
            this.replyingTo = null
        },

        getReplyPreview (message) {
            if (message.messageType === 'text') {
                return message.content.length > 30
                    ? message.content.substring(0, 30) + '...'
                    : message.content
            } else if (message.messageType === 'image') {
                return '[图片]'
            } else if (message.messageType === 'file') {
                return '[文件]'
            } else if (message.messageType === 'code') {
                return '[代码]'
            }
            return ''
        },

        addReaction (messageId, emoji) {
            const message = this.messages.find(m => m.id === messageId)
            if (!message) return

            if (!message.reactions) {
                message.reactions = []
            }

            const existingReaction = message.reactions.find(r => r.emoji === emoji)
            if (existingReaction) {
                if (existingReaction.users.includes(this.currentUserId)) {
                    // 取消反应
                    existingReaction.users = existingReaction.users.filter(id => id !== this.currentUserId)
                    existingReaction.count = existingReaction.users.length
                    if (existingReaction.count === 0) {
                        message.reactions = message.reactions.filter(r => r.emoji !== emoji)
                    }
                } else {
                    // 添加反应
                    existingReaction.users.push(this.currentUserId)
                    existingReaction.count = existingReaction.users.length
                }
            } else {
                // 新的反应
                message.reactions.push({
                    emoji: emoji,
                    count: 1,
                    users: [this.currentUserId]
                })
            }

            this.$emit('reaction-update', {
                messageId: messageId,
                emoji: emoji,
                userId: this.currentUserId
            })
        },

        toggleReaction (messageId, emoji) {
            this.addReaction(messageId, emoji)
        },

        previewImage (imageUrl) {
            this.previewImageUrl = imageUrl
            this.imagePreviewVisible = true
        },

        downloadFile (fileUrl, fileName) {
            // API 路径（/classroom/...)：通过 axios 携带认证 Token 下载
            if (fileUrl && fileUrl.startsWith('/')) {
                const { downFile } = require('@/api/manage')
                downFile(fileUrl)
                    .then(data => {
                        if (!data || data.size === 0) {
                            this.$message.error('文件下载失败')
                            return
                        }
                        const url = window.URL.createObjectURL(new Blob([data]))
                        const link = document.createElement('a')
                        link.style.display = 'none'
                        link.href = url
                        link.setAttribute('download', fileName)
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                        window.URL.revokeObjectURL(url)
                    })
                    .catch(() => {
                        this.$message.error('文件下载失败，您可能没有访问权限')
                    })
            } else {
                const link = document.createElement('a')
                link.href = fileUrl
                link.download = fileName
                link.click()
            }
        },

        copyCode (code) {
            navigator.clipboard.writeText(code).then(() => {
                this.$message.success('代码已复制到剪贴板')
            })
        },

        formatTime (timestamp) {
            const date = new Date(timestamp)
            const now = new Date()
            const diff = now - date

            if (diff < 60000) { // 1分钟内
                return '刚刚'
            } else if (diff < 3600000) { // 1小时内
                return Math.floor(diff / 60000) + '分钟前'
            } else if (date.toDateString() === now.toDateString()) { // 今天
                return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
            } else {
                return date.toLocaleString('zh-CN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                })
            }
        },

        formatFileSize (bytes) {
            if (bytes === 0) return '0 B'
            const k = 1024
            const sizes = ['B', 'KB', 'MB', 'GB']
            const i = Math.floor(Math.log(bytes) / Math.log(k))
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
        },

        getUserColor (userId) {
            const colors = [
                '#f56a00', '#7265e6', '#ffbf00', '#00a2ae',
                '#ff7875', '#52c41a', '#1890ff', '#722ed1'
            ]
            const index = userId.charCodeAt(0) % colors.length
            return colors[index]
        },

        getTypingText () {
            if (this.typingUsers.length === 1) {
                const user = this.onlineUsers.find(u => u.id === this.typingUsers[0])
                return `${user && user.name || '用户'} 正在输入...`
            } else if (this.typingUsers.length > 1) {
                return `${this.typingUsers.length} 人正在输入...`
            }
            return ''
        },

        toggleMinimize () {
            this.isMinimized = !this.isMinimized
            if (!this.isMinimized) {
                this.unreadCount = 0
                this.$nextTick(() => {
                    this.scrollToBottom()
                })
            }
        },

        toggleUserMute (userId) {
            const user = this.onlineUsers.find(u => u.id === userId)
            if (user) {
                user.muted = !user.muted
                this.$emit('user-mute-toggle', {
                    userId: userId,
                    muted: user.muted
                })
            }
        },

        scrollToBottom () {
            const chatMessages = this.$refs.chatMessages
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight
            }
        },

        // 接收新消息
        receiveMessage (message) {
            this.messages.push(message)

            if (this.isMinimized) {
                this.unreadCount++
            }

            this.$nextTick(() => {
                this.scrollToBottom()
            })
        },

        // 更新正在输入状态
        updateTypingStatus (data) {
            if (data.isTyping) {
                if (!this.typingUsers.includes(data.userId)) {
                    this.typingUsers.push(data.userId)
                }
            } else {
                this.typingUsers = this.typingUsers.filter(id => id !== data.userId)
            }
        },

        cleanup () {
            if (this.typingTimer) {
                clearTimeout(this.typingTimer)
            }
        }
    }
}
</script>

<style scoped>
.chat-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-container {
  height: 500px;
  display: flex;
  flex-direction: column;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.message-item {
  margin-bottom: 16px;
}

.system-message-content {
  text-align: center;
  color: #999;
  font-size: 12px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.user-message-content {
  max-width: 80%;
}

.own-message .user-message-content {
  margin-left: auto;
  text-align: right;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 12px;
}

.own-message .message-header {
  flex-direction: row-reverse;
}

.user-name {
  font-weight: 500;
}

.message-time {
  color: #999;
  font-size: 11px;
}

.message-content {
  background: white;
  padding: 8px 12px;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  position: relative;
}

.own-message .message-content {
  background: #1890ff;
  color: white;
}

.teacher-message .message-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.text-message {
  word-break: break-word;
  line-height: 1.4;
}

.image-message {
  padding: 0;
  border-radius: 8px;
  overflow: hidden;
}

.message-image {
  max-width: 200px;
  max-height: 200px;
  cursor: pointer;
  display: block;
}

.file-message {
  background: #f0f0f0;
  border-radius: 6px;
  padding: 8px;
}

.file-size {
  color: #999;
  font-size: 11px;
}

.code-message {
  background: #f6f8fa;
  border: 1px solid #e1e4e8;
  border-radius: 6px;
  overflow: hidden;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: #e1e4e8;
  font-size: 12px;
  font-weight: 500;
}

.code-content {
  padding: 12px;
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  overflow-x: auto;
}

.message-reactions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.reaction-item {
  background: rgba(0, 0, 0, 0.04);
  border-radius: 12px;
  padding: 2px 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.reaction-item:hover {
  background: rgba(0, 0, 0, 0.08);
}

.reaction-item.active {
  background: #e6f7ff;
  color: #1890ff;
}

.message-actions {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  opacity: 0;
  transition: opacity 0.2s;
}

.message-item:hover .message-actions {
  opacity: 1;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #999;
  font-size: 12px;
  font-style: italic;
}

.chat-input-container {
  padding: 12px;
  background: white;
  border-top: 1px solid #f0f0f0;
}

.replying-to {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: #f0f0f0;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 12px;
}

.reply-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.reply-preview {
  color: #666;
  font-style: italic;
}

.input-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.code-input-area {
  margin-bottom: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
}

.text-input-area {
  display: flex;
  align-items: center;
}

.online-users-list {
  padding: 8px 0;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.user-item:hover {
  background: #f0f0f0;
}

.user-item.typing {
  background: #e6f7ff;
}

.user-info {
  flex: 1;
}

.user-name {
  font-weight: 500;
  margin-bottom: 2px;
}

.user-status {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.typing-text {
  color: #1890ff;
  font-style: italic;
}

.user-actions {
  flex-shrink: 0;
}
</style>
