<template>
  <div class="whiteboard">
    <a-card title="协作白板" size="small">
      <div slot="extra">
        <a-button-group size="small">
          <a-button
            @click="setTool('pen')"
            :type="currentTool === 'pen' ? 'primary' : 'default'"
          >
            <a-icon type="edit" />
            画笔
          </a-button>
          <a-button
            @click="setTool('eraser')"
            :type="currentTool === 'eraser' ? 'primary' : 'default'"
          >
            <a-icon type="scissor" />
            橡皮
          </a-button>
          <a-button
            @click="setTool('text')"
            :type="currentTool === 'text' ? 'primary' : 'default'"
          >
            <a-icon type="font-size" />
            文字
          </a-button>
          <a-button
            @click="setTool('shape')"
            :type="currentTool === 'shape' ? 'primary' : 'default'"
          >
            <a-icon type="border" />
            形状
          </a-button>
          <a-button @click="clearBoard" type="danger">
            <a-icon type="clear" />
            清空
          </a-button>
          <a-dropdown :trigger="['click']">
            <a-button>
              <a-icon type="more" />
            </a-button>
            <a-menu slot="overlay" @click="handleMenuClick">
              <a-menu-item key="save">
                <a-icon type="save" />
                保存白板
              </a-menu-item>
              <a-menu-item key="load">
                <a-icon type="folder-open" />
                加载白板
              </a-menu-item>
              <a-menu-item key="export">
                <a-icon type="export" />
                导出图片
              </a-menu-item>
              <a-menu-item key="undo">
                <a-icon type="undo" />
                撤销
              </a-menu-item>
              <a-menu-item key="redo">
                <a-icon type="redo" />
                重做
              </a-menu-item>
            </a-menu>
          </a-dropdown>
        </a-button-group>
      </div>

      <!-- 工具设置面板 -->
      <div class="tool-settings" v-show="showToolSettings">
        <a-row :gutter="16">
          <!-- 画笔设置 -->
          <a-col :span="6" v-if="currentTool === 'pen'">
            <div class="setting-group">
              <label>画笔颜色</label>
              <div class="color-picker">
                <div
                  v-for="color in presetColors"
                  :key="color"
                  class="color-option"
                  :class="{ active: strokeColor === color }"
                  :style="{ backgroundColor: color }"
                  @click="strokeColor = color"
                ></div>
                <input
                  type="color"
                  v-model="strokeColor"
                  class="custom-color"
                />
              </div>
            </div>
          </a-col>

          <a-col :span="6" v-if="currentTool === 'pen' || currentTool === 'shape'">
            <div class="setting-group">
              <label>线条粗细</label>
              <a-slider
                v-model="strokeWidth"
                :min="1"
                :max="20"
                :marks="{ 1: '1', 5: '5', 10: '10', 20: '20' }"
              />
            </div>
          </a-col>

          <!-- 文字设置 -->
          <a-col :span="6" v-if="currentTool === 'text'">
            <div class="setting-group">
              <label>文字大小</label>
              <a-slider
                v-model="fontSize"
                :min="12"
                :max="72"
                :marks="{ 12: '12', 24: '24', 36: '36', 72: '72' }"
              />
            </div>
          </a-col>

          <!-- 形状设置 -->
          <a-col :span="6" v-if="currentTool === 'shape'">
            <div class="setting-group">
              <label>形状类型</label>
              <a-select v-model="shapeType" size="small" style="width: 100%">
                <a-select-option value="rectangle">矩形</a-select-option>
                <a-select-option value="circle">圆形</a-select-option>
                <a-select-option value="line">直线</a-select-option>
                <a-select-option value="arrow">箭头</a-select-option>
              </a-select>
            </div>
          </a-col>

          <!-- 填充设置 -->
          <a-col :span="6" v-if="currentTool === 'shape'">
            <div class="setting-group">
              <label>
                <a-checkbox v-model="fillShape">填充形状</a-checkbox>
              </label>
              <div v-if="fillShape" class="color-picker">
                <div
                  v-for="color in presetColors"
                  :key="`fill-${color}`"
                  class="color-option small"
                  :class="{ active: fillColor === color }"
                  :style="{ backgroundColor: color }"
                  @click="fillColor = color"
                ></div>
              </div>
            </div>
          </a-col>
        </a-row>
      </div>

      <!-- 白板画布 -->
      <div class="whiteboard-container" ref="whiteboardContainer">
        <canvas
          ref="canvas"
          class="whiteboard-canvas"
          @mousedown="startDrawing"
          @mousemove="draw"
          @mouseup="stopDrawing"
          @mouseleave="stopDrawing"
          @click="handleCanvasClick"
          @contextmenu="handleRightClick"
        ></canvas>

        <!-- 文字输入框 -->
        <div
          v-if="textInputVisible"
          class="text-input-container"
          :style="textInputStyle"
        >
          <a-input
            ref="textInput"
            v-model="textContent"
            @blur="addTextToCanvas"
            @keyup.enter="addTextToCanvas"
            :style="{ fontSize: fontSize + 'px', color: strokeColor }"
            placeholder="输入文字..."
            autoFocus
          />
        </div>

        <!-- 在线用户光标 -->
        <div
          v-for="cursor in onlineCursors"
          :key="cursor.userId"
          class="user-cursor"
          :style="{
            left: cursor.x + 'px',
            top: cursor.y + 'px',
            color: cursor.color
          }"
        >
          <a-icon type="edit" />
          <span class="cursor-label">{{ cursor.userName }}</span>
        </div>
      </div>

      <!-- 状态栏 -->
      <div class="whiteboard-status">
        <div class="status-left">
          <span>工具: {{ toolNames[currentTool] }}</span>
          <span style="margin-left: 16px;">
            在线用户: {{ onlineUsers.length }}
          </span>
        </div>
        <div class="status-right">
          <a-button size="small" @click="toggleToolSettings">
            <a-icon type="setting" />
            {{ showToolSettings ? '隐藏' : '显示' }}设置
          </a-button>
          <a-switch
            v-model="syncEnabled"
            size="small"
            style="margin-left: 8px;"
          />
          <span style="margin-left: 4px;">实时同步</span>
        </div>
      </div>
    </a-card>

    <!-- 保存白板对话框 -->
    <a-modal
      title="保存白板"
      :visible="saveModalVisible"
      @ok="saveBoardContent"
      @cancel="saveModalVisible = false"
    >
      <a-form layout="vertical">
        <a-form-item label="保存名称">
          <a-input v-model="saveName" placeholder="输入白板名称" />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea v-model="saveDescription" :rows="3" placeholder="可选描述" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
export default {
    name: 'Whiteboard',
    props: {
        classroomId: {
            type: String,
            required: true
        },
        userInfo: {
            type: Object,
            default: () => ({})
        },
        canEdit: {
            type: Boolean,
            default: true
        }
    },
    data () {
        return {
            // 画布相关
            canvas: null,
            ctx: null,
            isDrawing: false,

            // 工具设置
            currentTool: 'pen',
            strokeColor: '#000000',
            fillColor: '#ffffff',
            strokeWidth: 3,
            fontSize: 16,
            shapeType: 'rectangle',
            fillShape: false,

            // 颜色预设
            presetColors: [
                '#000000', '#ffffff', '#ff0000', '#00ff00',
                '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
                '#808080', '#800000', '#008000', '#000080'
            ],

            // UI状态
            showToolSettings: true,
            textInputVisible: false,
            textInputStyle: {},
            textContent: '',
            syncEnabled: true,

            // 工具名称映射
            toolNames: {
                pen: '画笔',
                eraser: '橡皮擦',
                text: '文字工具',
                shape: '形状工具'
            },

            // 绘画状态
            lastX: 0,
            lastY: 0,

            // 历史记录
            history: [],
            historyIndex: -1,

            // 在线协作
            onlineUsers: [
                { id: '1', name: '张同学', color: '#ff0000' },
                { id: '2', name: '李同学', color: '#00ff00' }
            ],
            onlineCursors: [],

            // 保存对话框
            saveModalVisible: false,
            saveName: '',
            saveDescription: ''
        }
    },
    mounted () {
        this.initCanvas()
        this.setupEventListeners()
    },
    beforeDestroy () {
        this.cleanup()
    },
    methods: {
        initCanvas () {
            this.canvas = this.$refs.canvas
            this.ctx = this.canvas.getContext('2d')

            // 设置画布大小
            const container = this.$refs.whiteboardContainer
            this.canvas.width = container.clientWidth
            this.canvas.height = 500

            // 设置画布样式
            this.ctx.lineCap = 'round'
            this.ctx.lineJoin = 'round'

            // 填充白色背景
            this.ctx.fillStyle = '#ffffff'
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

            // 保存初始状态
            this.saveState()
        },

        setupEventListeners () {
            // 监听窗口大小变化
            window.addEventListener('resize', this.handleResize)

            // 监听鼠标移动（用于协作光标）
            this.canvas.addEventListener('mousemove', this.handleMouseMove)
        },

        setTool (tool) {
            this.currentTool = tool
            this.canvas.style.cursor = this.getCursorStyle(tool)
        },

        getCursorStyle (tool) {
            const cursors = {
                pen: 'crosshair',
                eraser: 'grab',
                text: 'text',
                shape: 'crosshair'
            }
            return cursors[tool] || 'default'
        },

        startDrawing (event) {
            if (!this.canEdit) return

            const rect = this.canvas.getBoundingClientRect()
            this.lastX = event.clientX - rect.left
            this.lastY = event.clientY - rect.top

            if (this.currentTool === 'text') {
                this.showTextInput(this.lastX, this.lastY)
                return
            }

            this.isDrawing = true

            if (this.currentTool === 'pen') {
                this.ctx.beginPath()
                this.ctx.moveTo(this.lastX, this.lastY)
            }
        },

        draw (event) {
            if (!this.isDrawing || !this.canEdit) return

            const rect = this.canvas.getBoundingClientRect()
            const currentX = event.clientX - rect.left
            const currentY = event.clientY - rect.top

            if (this.currentTool === 'pen') {
                this.ctx.globalCompositeOperation = 'source-over'
                this.ctx.strokeStyle = this.strokeColor
                this.ctx.lineWidth = this.strokeWidth

                this.ctx.lineTo(currentX, currentY)
                this.ctx.stroke()
                this.ctx.beginPath()
                this.ctx.moveTo(currentX, currentY)
            } else if (this.currentTool === 'eraser') {
                this.ctx.globalCompositeOperation = 'destination-out'
                this.ctx.beginPath()
                this.ctx.arc(currentX, currentY, this.strokeWidth * 2, 0, Math.PI * 2)
                this.ctx.fill()
            }

            // 广播绘画数据
            if (this.syncEnabled) {
                this.broadcastDrawing({
                    tool: this.currentTool,
                    x: currentX,
                    y: currentY,
                    lastX: this.lastX,
                    lastY: this.lastY,
                    color: this.strokeColor,
                    width: this.strokeWidth
                })
            }

            this.lastX = currentX
            this.lastY = currentY
        },

        stopDrawing () {
            if (this.isDrawing) {
                this.isDrawing = false
                this.saveState()
            }
        },

        handleCanvasClick (event) {
            if (this.currentTool === 'shape' && !this.isDrawing) {
                const rect = this.canvas.getBoundingClientRect()
                const x = event.clientX - rect.left
                const y = event.clientY - rect.top
                this.drawShape(x, y)
            }
        },

        drawShape (x, y) {
            this.ctx.strokeStyle = this.strokeColor
            this.ctx.lineWidth = this.strokeWidth

            if (this.fillShape) {
                this.ctx.fillStyle = this.fillColor
            }

            const size = 50 // 默认形状大小

            switch (this.shapeType) {
            case 'rectangle':
                this.ctx.strokeRect(x - size / 2, y - size / 2, size, size)
                if (this.fillShape) {
                    this.ctx.fillRect(x - size / 2, y - size / 2, size, size)
                }
                break

            case 'circle':
                this.ctx.beginPath()
                this.ctx.arc(x, y, size / 2, 0, Math.PI * 2)
                this.ctx.stroke()
                if (this.fillShape) {
                    this.ctx.fill()
                }
                break

            case 'line':
                this.ctx.beginPath()
                this.ctx.moveTo(x - size / 2, y)
                this.ctx.lineTo(x + size / 2, y)
                this.ctx.stroke()
                break

            case 'arrow':
                this.drawArrow(x - size / 2, y, x + size / 2, y)
                break
            }

            this.saveState()
        },

        drawArrow (fromX, fromY, toX, toY) {
            const headLength = 10
            const angle = Math.atan2(toY - fromY, toX - fromX)

            // 绘制箭头线
            this.ctx.beginPath()
            this.ctx.moveTo(fromX, fromY)
            this.ctx.lineTo(toX, toY)
            this.ctx.stroke()

            // 绘制箭头头部
            this.ctx.beginPath()
            this.ctx.moveTo(toX, toY)
            this.ctx.lineTo(
                toX - headLength * Math.cos(angle - Math.PI / 6),
                toY - headLength * Math.sin(angle - Math.PI / 6)
            )
            this.ctx.moveTo(toX, toY)
            this.ctx.lineTo(
                toX - headLength * Math.cos(angle + Math.PI / 6),
                toY - headLength * Math.sin(angle + Math.PI / 6)
            )
            this.ctx.stroke()
        },

        showTextInput (x, y) {
            this.textInputVisible = true
            this.textContent = ''
            this.textInputStyle = {
                position: 'absolute',
                left: x + 'px',
                top: y + 'px',
                fontSize: this.fontSize + 'px',
                color: this.strokeColor
            }

            this.$nextTick(() => {
                this.$refs.textInput.focus()
            })
        },

        addTextToCanvas () {
            if (this.textContent.trim()) {
                const x = parseInt(this.textInputStyle.left)
                const y = parseInt(this.textInputStyle.top)

                this.ctx.font = `${this.fontSize}px Arial`
                this.ctx.fillStyle = this.strokeColor
                this.ctx.fillText(this.textContent, x, y + this.fontSize)

                this.saveState()
            }

            this.textInputVisible = false
            this.textContent = ''
        },

        clearBoard () {
            this.$confirm({
                title: '确认清空白板？',
                content: '此操作将清空白板上的所有内容，是否继续？',
                onOk: () => {
                    this.ctx.fillStyle = '#ffffff'
                    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
                    this.saveState()

                    if (this.syncEnabled) {
                        this.broadcastClear()
                    }
                }
            })
        },

        handleMenuClick ({ key }) {
            switch (key) {
            case 'save':
                this.saveModalVisible = true
                break
            case 'load':
                this.loadBoard()
                break
            case 'export':
                this.exportBoard()
                break
            case 'undo':
                this.undo()
                break
            case 'redo':
                this.redo()
                break
            }
        },

        saveState () {
            // 保存当前状态到历史记录
            this.history = this.history.slice(0, this.historyIndex + 1)
            this.history.push(this.canvas.toDataURL())
            this.historyIndex++

            // 限制历史记录数量
            if (this.history.length > 50) {
                this.history.shift()
                this.historyIndex--
            }
        },

        undo () {
            if (this.historyIndex > 0) {
                this.historyIndex--
                this.loadFromDataURL(this.history[this.historyIndex])
            }
        },

        redo () {
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++
                this.loadFromDataURL(this.history[this.historyIndex])
            }
        },

        loadFromDataURL (dataURL) {
            const img = new Image()
            img.onload = () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
                this.ctx.drawImage(img, 0, 0)
            }
            img.src = dataURL
        },

        saveBoardContent () {
            const dataURL = this.canvas.toDataURL('image/png')
            const boardData = {
                name: this.saveName,
                description: this.saveDescription,
                imageData: dataURL,
                timestamp: new Date().toISOString()
            }

            // 保存到本地存储
            const savedBoards = JSON.parse(localStorage.getItem('whiteboards') || '[]')
            savedBoards.push(boardData)
            localStorage.setItem('whiteboards', JSON.stringify(savedBoards))

            this.$message.success('白板已保存')
            this.saveModalVisible = false
            this.saveName = ''
            this.saveDescription = ''
        },

        loadBoard () {
            // 这里应该显示已保存的白板列表供用户选择
            this.$message.info('加载白板功能开发中...')
        },

        exportBoard () {
            const link = document.createElement('a')
            link.download = `whiteboard-${Date.now()}.png`
            link.href = this.canvas.toDataURL('image/png')
            link.click()

            this.$message.success('白板已导出')
        },

        toggleToolSettings () {
            this.showToolSettings = !this.showToolSettings
        },

        handleResize () {
            // 保存当前内容
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)

            // 重新设置画布大小
            const container = this.$refs.whiteboardContainer
            this.canvas.width = container.clientWidth
            this.canvas.height = 500

            // 恢复内容
            this.ctx.putImageData(imageData, 0, 0)
        },

        handleMouseMove (event) {
            if (this.syncEnabled) {
                const rect = this.canvas.getBoundingClientRect()
                const x = event.clientX - rect.left
                const y = event.clientY - rect.top

                this.broadcastCursor(x, y)
            }
        },

        handleRightClick (event) {
            event.preventDefault()
            // 可以添加右键菜单功能
        },

        // 协作相关方法
        broadcastDrawing (data) {
            this.$emit('drawing-data', {
                type: 'draw',
                data: data,
                userId: this.userInfo.id,
                timestamp: Date.now()
            })
        },

        broadcastClear () {
            this.$emit('drawing-data', {
                type: 'clear',
                userId: this.userInfo.id,
                timestamp: Date.now()
            })
        },

        broadcastCursor (x, y) {
            this.$emit('cursor-data', {
                userId: this.userInfo.id,
                userName: this.userInfo.name,
                x: x,
                y: y,
                color: '#ff0000' // 可以根据用户设置颜色
            })
        },

        // 接收远程绘画数据
        receiveDrawingData (data) {
            if (data.type === 'draw') {
                this.applyRemoteDrawing(data.data)
            } else if (data.type === 'clear') {
                this.ctx.fillStyle = '#ffffff'
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
            }
        },

        applyRemoteDrawing (data) {
            // 应用远程用户的绘画数据
            this.ctx.strokeStyle = data.color
            this.ctx.lineWidth = data.width

            if (data.tool === 'pen') {
                this.ctx.globalCompositeOperation = 'source-over'
                this.ctx.beginPath()
                this.ctx.moveTo(data.lastX, data.lastY)
                this.ctx.lineTo(data.x, data.y)
                this.ctx.stroke()
            }
        },

        // 更新在线光标
        updateOnlineCursor (cursorData) {
            const existingIndex = this.onlineCursors.findIndex(
                cursor => cursor.userId === cursorData.userId
            )

            if (existingIndex !== -1) {
                this.onlineCursors[existingIndex] = cursorData
            } else {
                this.onlineCursors.push(cursorData)
            }

            // 清除过期光标
            setTimeout(() => {
                this.onlineCursors = this.onlineCursors.filter(
                    cursor => cursor.userId !== cursorData.userId || Date.now() - cursor.timestamp < 3000
                )
            }, 3000)
        },

        cleanup () {
            window.removeEventListener('resize', this.handleResize)
        }
    }
}
</script>

<style scoped>
.whiteboard {
  height: 100%;
}

.tool-settings {
  background: #fafafa;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.setting-group {
  margin-bottom: 16px;
}

.setting-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.color-option {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.color-option.small {
  width: 16px;
  height: 16px;
}

.color-option.active {
  border-color: #1890ff;
}

.color-option:hover {
  border-color: #40a9ff;
}

.custom-color {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 8px;
}

.whiteboard-container {
  position: relative;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  overflow: hidden;
}

.whiteboard-canvas {
  display: block;
  cursor: crosshair;
}

.text-input-container {
  z-index: 10;
}

.text-input-container input {
  border: 1px dashed #1890ff;
  background: rgba(255, 255, 255, 0.9);
  min-width: 100px;
}

.user-cursor {
  position: absolute;
  pointer-events: none;
  z-index: 20;
  transition: all 0.1s ease;
}

.cursor-label {
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  margin-left: 16px;
  white-space: nowrap;
}

.whiteboard-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
  font-size: 12px;
}

.status-left, .status-right {
  display: flex;
  align-items: center;
}
</style>
