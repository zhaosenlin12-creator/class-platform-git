<template>
  <div class="teaching-room">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <a-row type="flex" justify="space-between" align="middle">
        <a-col>
          <a-space>
            <a-button @click="$router.back()">
              <a-icon type="arrow-left" />
              返回
            </a-button>
            <a-divider type="vertical" />
            <span class="room-title">{{ roomInfo.roomName }} - {{ roomInfo.courseName }}</span>
          </a-space>
        </a-col>
        <a-col>
          <a-space>
            <a-tag color="green">在线学生: {{ onlineStudents }}</a-tag>
            <a-button type="primary" @click="showStudents">学生管理</a-button>
            <a-button @click="endClass" type="danger">结束课程</a-button>
          </a-space>
        </a-col>
      </a-row>
    </div>

    <!-- 主要教学区域 -->
    <div class="teaching-content">
      <a-row :gutter="16" style="height: 100%;">
        <!-- 左侧：PPT/资源展示区 -->
        <a-col :span="16">
          <a-card title="教学内容" size="small" style="height: 100%;">
            <template #extra>
              <a-space>
                <a-button @click="showUploadPPT">上传PPT</a-button>
                <a-select
                  v-model="currentSlide"
                  style="width: 200px"
                  placeholder="选择页码"
                  @change="onSlideChange"
                  v-if="pptSlides.length > 0"
                >
                  <a-select-option v-for="(slide, index) in pptSlides" :key="index" :value="index">
                    第 {{ index + 1 }} 页
                  </a-select-option>
                </a-select>
              </a-space>
            </template>

            <div class="ppt-display" v-if="pptSlides.length > 0">
              <div class="slide-content">
                <img v-if="pptSlides[currentSlide]" :src="pptSlides[currentSlide]" alt="PPT" />
                <div v-else class="empty-slide">
                  <a-icon type="file-ppt" style="font-size: 48px; color: #ccc;" />
                  <p>暂无内容</p>
                </div>
              </div>
            </div>
            <div v-else class="empty-ppt">
              <a-empty description="暂无PPT内容">
                <a-button type="primary" @click="showUploadPPT">上传PPT</a-button>
              </a-empty>
            </div>
          </a-card>
        </a-col>

        <!-- 右侧：代码展示/白板区 -->
        <a-col :span="8">
          <a-card size="small" style="height: 100%;">
            <template #title>
              <a-radio-group v-model="rightPanelMode" size="small">
                <a-radio-button value="code">代码展示</a-radio-button>
                <a-radio-button value="whiteboard">思路白板</a-radio-button>
                <a-radio-button value="homework">作业收集</a-radio-button>
              </a-radio-group>
            </template>

            <!-- 代码展示模式 - 使用v-show优化频繁切换性能 -->
            <div v-show="rightPanelMode === 'code'" class="code-panel">
              <div class="code-toolbar">
                <a-select v-model="selectedLanguage" style="width: 120px" size="small">
                  <a-select-option value="javascript">JavaScript</a-select-option>
                  <a-select-option value="python">Python</a-select-option>
                  <a-select-option value="scratch">Scratch</a-select-option>
                </a-select>
                <a-button size="small" @click="saveCode" type="primary">保存代码</a-button>
              </div>
              <textarea
                v-model="demoCode"
                class="code-editor"
                placeholder="在此输入演示代码..."
                @input="onCodeChange"
              ></textarea>
            </div>

            <!-- 白板模式 - 使用v-show优化频繁切换性能 -->
            <div v-show="rightPanelMode === 'whiteboard'" class="whiteboard-panel">
              <div class="whiteboard-toolbar">
                <a-button-group size="small">
                  <a-button @click="clearWhiteboard">清空</a-button>
                  <a-button @click="saveWhiteboard">保存</a-button>
                </a-button-group>
              </div>
              <textarea
                v-model="whiteboardContent"
                class="whiteboard-text"
                placeholder="在此记录讲解思路、知识点..."
                @input="onWhiteboardChange"
              ></textarea>
            </div>

            <!-- 作业收集模式 - 使用v-show优化频繁切换性能 -->
            <div v-show="rightPanelMode === 'homework'" class="homework-panel">
              <div class="homework-toolbar">
                <a-button @click="collectHomework" type="primary" size="small">收集作业</a-button>
                <a-button @click="downloadAll" size="small">下载全部</a-button>
              </div>
              <a-list :data-source="homeworkList" size="small">
                <template #renderItem="{ item }">
                  <a-list-item>
                    <template #actions>
                      <a-button size="small" @click="viewHomework(item)">查看</a-button>
                      <a-button size="small" @click="downloadHomework(item)">下载</a-button>
                    </template>
                    <a-list-item-meta>
                      <template #title>{{ item.studentName }}</template>
                      <template #description>
                        {{ item.submitTime }} - {{ item.fileType }}
                      </template>
                    </a-list-item-meta>
                  </a-list-item>
                </template>
              </a-list>
            </div>
          </a-card>
        </a-col>
      </a-row>
    </div>

    <!-- PPT上传对话框 -->
    <a-modal
      v-model="uploadPPTVisible"
      title="上传PPT"
      @ok="handleUploadPPT"
      @cancel="uploadPPTVisible = false"
    >
      <a-upload
        :file-list="pptFileList"
        :before-upload="beforeUpload"
        accept=".ppt,.pptx,.pdf"
        @remove="handleRemove"
      >
        <a-button>
          <a-icon type="upload" /> 选择PPT文件
        </a-button>
      </a-upload>
      <p style="margin-top: 8px; color: #666;">
        支持PPT、PPTX、PDF格式，将自动转换为图片展示
      </p>
    </a-modal>

    <!-- 学生管理对话框 -->
    <a-modal
      v-model="studentsVisible"
      title="在线学生"
      :footer="null"
      width="600px"
    >
      <a-list :data-source="studentsList">
        <template #renderItem="{ item }">
          <a-list-item>
            <template #actions>
              <a-tag :color="item.isOnline ? 'green' : 'red'">
                {{ item.isOnline ? '在线' : '离线' }}
              </a-tag>
              <a-button size="small" @click="viewStudentWork(item)">查看作业</a-button>
            </template>
            <a-list-item-meta>
              <template #title>{{ item.studentName }}</template>
              <template #description>{{ item.lastActive }}</template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>
    </a-modal>
  </div>
</template>

<script>
import { classroomApi } from '@/api/teaching'
import io from 'socket.io-client'

export default {
    name: 'TeachingRoom',
    data () {
        return {
            socket: null,
            roomId: null,
            roomInfo: {},
            onlineStudents: 0,
            rightPanelMode: 'code',
            selectedLanguage: 'javascript',
            demoCode: '',
            whiteboardContent: '',
            currentSlide: 0,
            pptSlides: [],
            uploadPPTVisible: false,
            pptFileList: [],
            studentsVisible: false,
            studentsList: [],
            homeworkList: []
        }
    },

    created () {
        this.roomId = this.$route.params.id || 'default-room'
        this.initSocket()
        this.loadRoomInfo()
        this.loadStudents()
    },

    beforeDestroy () {
    // 清理WebSocket连接
        if (this.socket) {
            this.socket.emit('teacher_leave_room', { roomId: this.roomId })
            this.socket.disconnect()
            this.socket = null
        }
    },

    methods: {
        initSocket () {
            try {
                // 连接到WebSocket服务器
                const socketUrl = process.env.VUE_APP_SOCKET_URL || 'http://localhost:3001'
                this.socket = io(socketUrl, {
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    reconnectionDelay: 1000,
                    reconnectionAttempts: 5
                })

                // 连接成功
                this.socket.on('connect', () => {
                    this.$message.success('教室连接成功')

                    // 教师加入房间
                    const userInfo = this.$store.getters.userInfo || {}
                    this.socket.emit('teacher_join_room', {
                        roomId: this.roomId,
                        teacherName: userInfo.name || '教师',
                        teacherId: userInfo.id || 'teacher-1'
                    })
                })

                // 连接断开
                this.socket.on('disconnect', (reason) => {
                    console.warn('⚠️ WebSocket断开:', reason)
                    this.$message.warning('教室连接已断开')
                })

                // 连接错误
                this.socket.on('connect_error', (error) => {
                    console.error('❌ WebSocket连接错误:', error)
                    this.$message.error('教室连接失败,请检查网络')
                })

                // 接收学生进入教室事件
                this.socket.on('student_joined', (data) => {
                    this.onlineStudents++
                    this.$message.info(`${data.studentName} 进入了教室`)
                    this.loadStudents()
                })

                // 接收学生离开教室事件
                this.socket.on('student_left', (data) => {
                    this.onlineStudents = Math.max(0, this.onlineStudents - 1)
                    this.$message.info(`${data.studentName} 离开了教室`)
                    this.loadStudents()
                })

                // 接收在线学生数量更新
                this.socket.on('students_count_update', (data) => {
                    this.onlineStudents = data.count
                })

                // 接收作业提交通知
                this.socket.on('homework_submitted', (data) => {
                    this.$message.success(`${data.studentName} 提交了作业`)
                    this.homeworkList.unshift(data)
                })
            } catch (error) {
                console.error('初始化WebSocket失败:', error)
                this.$message.error('教室初始化失败')
            }
        },

        async loadRoomInfo () {
            try {
                // 获取教室信息
                this.roomInfo = {
                    roomName: 'Scratch编程教室',
                    courseName: 'Scratch创意编程',
                    className: '小学编程1班'
                }
                this.onlineStudents = 5
            } catch (error) {
                console.error('加载教室信息失败:', error)
            }
        },

        async loadStudents () {
            try {
                // 获取在线学生列表
                this.studentsList = [
                    { id: '1', studentName: '张小明', isOnline: true, lastActive: '刚刚' },
                    { id: '2', studentName: '李小红', isOnline: true, lastActive: '2分钟前' },
                    { id: '3', studentName: '王小强', isOnline: false, lastActive: '10分钟前' }
                ]
            } catch (error) {
                console.error('加载学生列表失败:', error)
            }
        },

        onSlideChange (slideIndex) {
            this.currentSlide = slideIndex
            // 同步给学生端
            this.syncToStudents('slide_change', { slideIndex })
        },

        onCodeChange () {
            // 实时同步代码到学生端
            this.syncToStudents('code_update', {
                code: this.demoCode,
                language: this.selectedLanguage
            })
        },

        onWhiteboardChange () {
            // 实时同步白板内容到学生端
            this.syncToStudents('whiteboard_update', { content: this.whiteboardContent })
        },

        syncToStudents (type, data) {
            // 通过WebSocket实时同步给学生端
            if (!this.socket || !this.socket.connected) {
                console.warn('⚠️ WebSocket未连接,无法同步')
                this.$message.warning('教室未连接,无法同步内容')
                return
            }

            try {
                // 发送教师操作事件到房间内所有学生
                const userInfo = this.$store.getters.userInfo || {}
                this.socket.emit('teacher_action', {
                    roomId: this.roomId,
                    type: type,
                    data: data,
                    timestamp: Date.now(),
                    teacherId: userInfo.id || 'teacher-1'
                })
            } catch (error) {
                console.error('❌ 同步失败:', error)
                this.$message.error('内容同步失败')
            }
        },

        saveCode () {
            this.$message.success('代码已保存')
        },

        clearWhiteboard () {
            this.whiteboardContent = ''
            this.syncToStudents('whiteboard_update', { content: '' })
        },

        saveWhiteboard () {
            this.$message.success('白板内容已保存')
        },

        showUploadPPT () {
            this.uploadPPTVisible = true
        },

        beforeUpload (file) {
            const maxSize = 100 * 1024 * 1024 // 100MB
            if (file.size > maxSize) {
                this.$message.error('文件大小超过限制（最大100MB），请压缩文件后重新上传')
                return false
            }
            this.pptFileList = [file]
            return false
        },

        handleRemove () {
            this.pptFileList = []
        },

        async handleUploadPPT () {
            if (this.pptFileList.length === 0) {
                this.$message.error('请选择PPT文件')
                return
            }

            // 模拟PPT上传和转换
            this.pptSlides = [
                '/static/slide1.jpg',
                '/static/slide2.jpg',
                '/static/slide3.jpg'
            ]
            this.currentSlide = 0
            this.uploadPPTVisible = false
            this.pptFileList = []
            this.$message.success('PPT上传成功')
        },

        showStudents () {
            this.studentsVisible = true
        },

        viewStudentWork (student) {
        },

        collectHomework () {
            this.$message.success('作业收集指令已发送给学生')
        },

        downloadAll () {
            this.$message.success('开始下载所有作业')
        },

        viewHomework (homework) {
        },

        downloadHomework (homework) {
        },

        async endClass () {
            try {
                await classroomApi.endClassroom(this.roomId)
                this.$message.success('课程已结束')
                this.$router.back()
            } catch (error) {
                console.error('结束课程失败:', error)
                this.$message.error('结束课程失败')
            }
        }
    }
}
</script>

<style scoped>
.teaching-room {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.toolbar {
  padding: 12px 24px;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
}

.room-title {
  font-size: 16px;
  font-weight: 500;
}

.teaching-content {
  flex: 1;
  padding: 16px;
  background: #f5f5f5;
}

.ppt-display {
  height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slide-content img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.empty-ppt, .empty-slide {
  height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}

.code-panel, .whiteboard-panel, .homework-panel {
  height: 70vh;
  display: flex;
  flex-direction: column;
}

.code-toolbar, .whiteboard-toolbar, .homework-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.code-editor, .whiteboard-text {
  flex: 1;
  width: 100%;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 8px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  resize: none;
}

.whiteboard-text {
  font-family: inherit;
}
</style>
