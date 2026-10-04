<template>
  <div class="comment-section">
    <!-- 评论输入框 -->
    <div class="comment-input-section">
      <div class="input-header">
        <a-avatar size="small" src="/images/avatars/current-user.jpg">我</a-avatar>
        <span class="input-label">发表评论</span>
      </div>
      <a-textarea
        v-model="newComment"
        placeholder="写下你对这个作品的想法..."
        :rows="3"
        :maxLength="200"
        show-count
      />
      <div class="input-actions">
        <a-space>
          <a-button icon="smile" @click="showEmojiPanel = !showEmojiPanel">
            表情
          </a-button>
          <a-button icon="picture" @click="insertImage">
            图片
          </a-button>
          <a-button
            type="primary"
            @click="submitComment"
            :disabled="!newComment.trim()"
          >
            发表评论
          </a-button>
        </a-space>
      </div>

      <!-- 表情面板 -->
      <div v-if="showEmojiPanel" class="emoji-panel">
        <div class="emoji-grid">
          <span
            v-for="emoji in emojiList"
            :key="emoji"
            class="emoji-item"
            @click="insertEmoji(emoji)"
          >
            {{ emoji }}
          </span>
        </div>
      </div>
    </div>

    <a-divider />

    <!-- 评论统计 -->
    <div class="comment-stats">
      <h4>评论 ({{ comments.length }})</h4>
      <div class="comment-filters">
        <a-radio-group v-model="sortType" size="small">
          <a-radio-button value="latest">最新</a-radio-button>
          <a-radio-button value="oldest">最早</a-radio-button>
          <a-radio-button value="likes">最热</a-radio-button>
        </a-radio-group>
      </div>
    </div>

    <!-- 评论列表 -->
    <div class="comment-list">
      <div
        v-for="comment in sortedComments"
        :key="comment.id"
        class="comment-item"
      >
        <div class="comment-main">
          <a-avatar :src="comment.avatar" size="default">
            {{ comment.author[0] }}
          </a-avatar>

          <div class="comment-content">
            <div class="comment-header">
              <span class="comment-author">{{ comment.author }}</span>
              <span class="comment-time">{{ formatTime(comment.time) }}</span>
            </div>

            <div class="comment-text">
              {{ comment.content }}
            </div>

            <div class="comment-actions">
              <a-space>
                <a-button
                  type="link"
                  size="small"
                  @click="toggleCommentLike(comment)"
                >
                  <a-icon
                    type="heart"
                    :theme="comment.isLiked ? 'filled' : 'outlined'"
                    :style="{ color: comment.isLiked ? '#f5222d' : '' }"
                  />
                  {{ comment.likes > 0 ? comment.likes : '点赞' }}
                </a-button>

                <a-button
                  type="link"
                  size="small"
                  @click="toggleReplyBox(comment.id)"
                >
                  <a-icon type="message" />
                  回复
                </a-button>

                <a-dropdown>
                  <a-button type="link" size="small">
                    <a-icon type="more" />
                  </a-button>
                  <a-menu slot="overlay">
                    <a-menu-item @click="reportComment(comment)">
                      <a-icon type="flag" />
                      举报
                    </a-menu-item>
                    <a-menu-item v-if="isMyComment(comment)" @click="deleteComment(comment)">
                      <a-icon type="delete" />
                      删除
                    </a-menu-item>
                  </a-menu>
                </a-dropdown>
              </a-space>
            </div>

            <!-- 回复输入框 -->
            <div v-if="showReplyBox === comment.id" class="reply-input">
              <a-textarea
                v-model="replyText"
                placeholder="回复这条评论..."
                :rows="2"
                :maxLength="100"
                show-count
              />
              <div class="reply-actions">
                <a-space>
                  <a-button size="small" @click="cancelReply">
                    取消
                  </a-button>
                  <a-button
                    type="primary"
                    size="small"
                    @click="submitReply(comment.id)"
                    :disabled="!replyText.trim()"
                  >
                    回复
                  </a-button>
                </a-space>
              </div>
            </div>

            <!-- 回复列表 -->
            <div v-if="comment.replies && comment.replies.length > 0" class="replies-section">
              <div
                v-for="reply in comment.replies"
                :key="reply.id"
                class="reply-item"
              >
                <a-avatar :src="reply.avatar" size="small">
                  {{ reply.author[0] }}
                </a-avatar>

                <div class="reply-content">
                  <div class="reply-header">
                    <span class="reply-author">{{ reply.author }}</span>
                    <span class="reply-time">{{ formatTime(reply.time) }}</span>
                  </div>

                  <div class="reply-text">
                    {{ reply.content }}
                  </div>

                  <div class="reply-actions">
                    <a-space>
                      <a-button
                        type="link"
                        size="small"
                        @click="toggleReplyLike(reply)"
                      >
                        <a-icon
                          type="heart"
                          :theme="reply.isLiked ? 'filled' : 'outlined'"
                          :style="{ color: reply.isLiked ? '#f5222d' : '' }"
                        />
                        {{ reply.likes > 0 ? reply.likes : '' }}
                      </a-button>

                      <a-button
                        type="link"
                        size="small"
                        @click="replyToReply(reply, comment.id)"
                      >
                        回复
                      </a-button>
                    </a-space>
                  </div>
                </div>
              </div>

              <!-- 展开/收起回复 -->
              <div
                v-if="comment.replies.length > 3"
                class="expand-replies"
                @click="toggleRepliesExpanded(comment.id)"
              >
                <a-icon :type="comment.repliesExpanded ? 'up' : 'down'" />
                {{ comment.repliesExpanded ? '收起回复' : `展开${comment.replies.length}条回复` }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 加载更多评论 -->
    <div v-if="hasMoreComments" class="load-more-comments">
      <a-button type="dashed" block @click="loadMoreComments">
        <a-icon type="down" />
        加载更多评论
      </a-button>
    </div>

    <!-- 空状态 -->
    <div v-if="comments.length === 0" class="empty-comments">
      <a-empty description="还没有评论，快来发表第一条评论吧！" />
    </div>
  </div>
</template>

<script>
export default {
    name: 'CommentSection',
    props: {
        workId: {
            type: String,
            required: true
        },
        comments: {
            type: Array,
            default: () => []
        }
    },
    data () {
        return {
            newComment: '',
            replyText: '',
            showReplyBox: null,
            showEmojiPanel: false,
            sortType: 'latest',
            hasMoreComments: false,
            currentUserId: 'current-user', // 实际应用中从用户状态获取

            emojiList: [
                '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
                '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
                '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
                '🤔', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
                '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙',
                '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍'
            ]
        }
    },
    computed: {
        sortedComments () {
            const sorted = [...this.comments]
            switch (this.sortType) {
            case 'latest':
                return sorted.sort((a, b) => new Date(b.time) - new Date(a.time))
            case 'oldest':
                return sorted.sort((a, b) => new Date(a.time) - new Date(b.time))
            case 'likes':
                return sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0))
            default:
                return sorted
            }
        }
    },
    methods: {
        formatTime (timeStr) {
            const date = new Date(timeStr)
            const now = new Date()
            const diff = now - date
            const minutes = Math.floor(diff / (1000 * 60))
            const hours = Math.floor(diff / (1000 * 60 * 60))
            const days = Math.floor(diff / (1000 * 60 * 60 * 24))

            if (minutes < 1) return '刚刚'
            if (minutes < 60) return `${minutes}分钟前`
            if (hours < 24) return `${hours}小时前`
            if (days < 7) return `${days}天前`
            return date.toLocaleDateString()
        },

        isMyComment (comment) {
            return comment.authorId === this.currentUserId
        },

        submitComment () {
            if (!this.newComment.trim()) return

            const comment = {
                id: Date.now(),
                author: '当前用户',
                authorId: this.currentUserId,
                avatar: '/images/avatars/current-user.jpg',
                content: this.newComment.trim(),
                time: new Date().toISOString(),
                likes: 0,
                isLiked: false,
                replies: []
            }

            this.$emit('add-comment', comment)
            this.newComment = ''
            this.showEmojiPanel = false
            this.$message.success('评论发表成功')
        },

        toggleReplyBox (commentId) {
            this.showReplyBox = this.showReplyBox === commentId ? null : commentId
            this.replyText = ''
        },

        submitReply (commentId) {
            if (!this.replyText.trim()) return

            const reply = {
                id: Date.now(),
                author: '当前用户',
                authorId: this.currentUserId,
                avatar: '/images/avatars/current-user.jpg',
                content: this.replyText.trim(),
                time: new Date().toISOString(),
                likes: 0,
                isLiked: false
            }

            this.$emit('reply-comment', commentId, reply)
            this.replyText = ''
            this.showReplyBox = null
            this.$message.success('回复发表成功')
        },

        cancelReply () {
            this.showReplyBox = null
            this.replyText = ''
        },

        replyToReply (reply, commentId) {
            this.replyText = `@${reply.author} `
            this.showReplyBox = commentId
        },

        toggleCommentLike (comment) {
            comment.isLiked = !comment.isLiked
            if (comment.isLiked) {
                comment.likes = (comment.likes || 0) + 1
            } else {
                comment.likes = Math.max(0, (comment.likes || 0) - 1)
            }
        },

        toggleReplyLike (reply) {
            reply.isLiked = !reply.isLiked
            if (reply.isLiked) {
                reply.likes = (reply.likes || 0) + 1
            } else {
                reply.likes = Math.max(0, (reply.likes || 0) - 1)
            }
        },

        toggleRepliesExpanded (commentId) {
            const comment = this.comments.find(c => c.id === commentId)
            if (comment) {
                comment.repliesExpanded = !comment.repliesExpanded
            }
        },

        insertEmoji (emoji) {
            this.newComment += emoji
            this.showEmojiPanel = false
        },

        insertImage () {
            this.$message.info('图片上传功能开发中...')
        },

        reportComment (comment) {
            this.$confirm({
                title: '举报评论',
                content: '确定要举报这条评论吗？我们会尽快处理。',
                onOk: () => {
                    this.$message.success('举报成功，感谢你的反馈')
                }
            })
        },

        deleteComment (comment) {
            this.$confirm({
                title: '删除评论',
                content: '确定要删除这条评论吗？删除后无法恢复。',
                onOk: () => {
                    const index = this.comments.findIndex(c => c.id === comment.id)
                    if (index > -1) {
                        this.comments.splice(index, 1)
                        this.$message.success('评论已删除')
                    }
                }
            })
        },

        loadMoreComments () {
            this.$message.info('加载更多评论功能开发中...')
        }
    },

    mounted () {
    // 点击其他区域关闭表情面板
        document.addEventListener('click', (e) => {
            if (!this.$el.contains(e.target)) {
                this.showEmojiPanel = false
            }
        })
    }
}
</script>

<style scoped>
.comment-section {
  padding: 16px 0;
}

.comment-input-section {
  margin-bottom: 24px;
}

.input-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.input-label {
  font-weight: 500;
  color: #333;
}

.input-actions {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.emoji-panel {
  margin-top: 12px;
  padding: 16px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
}

.emoji-item {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 4px;
  font-size: 18px;
  transition: background-color 0.2s;
}

.emoji-item:hover {
  background-color: #f5f5f5;
}

.comment-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.comment-stats h4 {
  margin: 0;
  color: #333;
}

.comment-list {
  margin-bottom: 16px;
}

.comment-item {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-main {
  display: flex;
  gap: 12px;
}

.comment-content {
  flex: 1;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.comment-author {
  font-weight: 500;
  color: #333;
}

.comment-time {
  font-size: 12px;
  color: #999;
}

.comment-text {
  line-height: 1.6;
  color: #333;
  margin-bottom: 12px;
  word-break: break-word;
}

.comment-actions {
  margin-bottom: 8px;
}

.reply-input {
  margin-top: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
}

.reply-actions {
  margin-top: 8px;
  text-align: right;
}

.replies-section {
  margin-top: 16px;
  padding-left: 16px;
  border-left: 2px solid #f0f0f0;
}

.reply-item {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.reply-content {
  flex: 1;
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.reply-author {
  font-weight: 500;
  color: #333;
  font-size: 13px;
}

.reply-time {
  font-size: 11px;
  color: #999;
}

.reply-text {
  line-height: 1.5;
  color: #333;
  font-size: 13px;
  margin-bottom: 6px;
  word-break: break-word;
}

.reply-actions {
  font-size: 12px;
}

.expand-replies {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #1890ff;
  cursor: pointer;
  font-size: 12px;
  margin-top: 8px;
}

.expand-replies:hover {
  color: #40a9ff;
}

.load-more-comments {
  margin-top: 24px;
}

.empty-comments {
  text-align: center;
  padding: 48px 0;
}
</style>
