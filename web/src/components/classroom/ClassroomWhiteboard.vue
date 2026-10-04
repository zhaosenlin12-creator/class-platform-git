<template>
  <div class="classroom-whiteboard">
    <div class="whiteboard-toolbar" v-if="canDrawIframe">
      <div class="tool-group">
        <a-button-group size="small">
          <a-button
            :type="currentTool === 'pen' ? 'primary' : 'default'"
            @click="setTool('pen')"
          >
            <a-icon type="edit" />
            画笔
          </a-button>
          <a-button
            :type="currentTool === 'eraser' ? 'primary' : 'default'"
            @click="setTool('eraser')"
          >
            <a-icon type="delete" />
            橡皮擦
          </a-button>
          <a-button
            :type="currentTool === 'line' ? 'primary' : 'default'"
            @click="setTool('line')"
          >
            <a-icon type="line" />
            直线
          </a-button>
          <a-button
            :type="currentTool === 'rectangle' ? 'primary' : 'default'"
            @click="setTool('rectangle')"
          >
            <a-icon type="border" />
            矩形
          </a-button>
          <a-button
            :type="currentTool === 'circle' ? 'primary' : 'default'"
            @click="setTool('circle')"
          >
            <a-icon type="radius-upright" />
            圆形
          </a-button>
          <a-button
            :type="currentTool === 'text' ? 'primary' : 'default'"
            @click="setTool('text')"
          >
            <a-icon type="font-size" />
            文本
          </a-button>
        </a-button-group>
      </div>

      <div class="tool-group">
        <span class="tool-label">颜色:</span>
        <div class="color-picker">
          <div
            v-for="color in colors"
            :key="color"
            class="color-item"
            :class="{ active: currentColor === color }"
            :style="{ backgroundColor: color }"
            @click="setColor(color)"
          ></div>
        </div>
      </div>

      <div class="tool-group">
        <span class="tool-label">粗细:</span>
        <a-slider
          v-model="currentWidth"
          :min="1"
          :max="20"
          :step="1"
          style="width: 80px"
        />
        <span class="width-value">{{ currentWidth }}px</span>
      </div>

      <div class="tool-group">
        <a-button size="small" @click="clearBoard">
          <a-icon type="close-circle" />
          清空
        </a-button>
        <a-button size="small" @click="undoAction">
          <a-icon type="undo" />
          撤销
        </a-button>
        <a-button size="small" @click="redoAction">
          <a-icon type="redo" />
          重做
        </a-button>
      </div>

      <div class="tool-group">
        <a-button size="small" @click="saveBoard">
          <a-icon type="save" />
          保存
        </a-button>
        <a-upload
          :show-upload-list="false"
          :before-upload="loadImage"
          accept="image/*"
        >
          <a-button size="small">
            <a-icon type="picture" />
            插入图片
          </a-button>
        </a-upload>
      </div>
    </div>

    <div class="whiteboard-container" ref="whiteboardContainer">
      <canvas
        ref="whiteboard"
        class="whiteboard-canvas"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseLeave"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      ></canvas>

      <!-- 文本输入框 -->
      <div
        v-if="showTextInput"
        class="text-input-container"
        :style="textInputStyle"
      >
        <a-input
          ref="textInput"
          v-model="textInputValue"
          :style="{ color: currentColor, fontSize: currentWidth + 'px' }"
          @blur="addText"
          @keyup.enter="addText"
          placeholder="输入文本..."
          auto-focus
        />
      </div>

      <!-- 参与者光标 -->
      <div
        v-for="cursor in participantCursors"
        :key="cursor.userId"
        class="participant-cursor"
        :style="{
          left: cursor.x + 'px',
          top: cursor.y + 'px',
          color: cursor.color
        }"
      >
        <div class="cursor-pointer"></div>
        <div class="cursor-name">{{ cursor.name }}</div>
      </div>
    </div>

    <!-- 页面控制 -->
    <div class="page-controls" v-if="canDrawIframe">
      <a-button size="small" @click="previousPage" :disabled="currentPage <= 1">
        <a-icon type="left" />
        上一页
      </a-button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <a-button size="small" @click="nextPage">
        <a-icon type="right" />
        下一页
      </a-button>
      <a-button size="small" @click="addPage">
        <a-icon type="plus" />
        新增页面
      </a-button>
    </div>
  </div>
</template>

<script>
export default {
    name: 'ClassroomWhiteboard',
    props: {
        classroomId: {
            type: String,
            required: true
        },
        userRole: {
            type: String,
            default: 'student'
        },
        canDrawIframe: {
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
            startX: 0,
            startY: 0,

            // 工具设置
            currentTool: 'pen',
            currentColor: '#000000',
            currentWidth: 3,
            colors: [
                '#000000', '#FF0000', '#00FF00', '#0000FF',
                '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500',
                '#800080', '#008000', '#800000', '#008080'
            ],

            // 历史记录
            history: [],
            historyIndex: -1,
            maxHistory: 50,

            // 页面管理
            currentPage: 1,
            totalPages: 1,
            pages: [{ data: null, background: null }],

            // 文本输入
            showTextInput: false,
            textInputValue: '',
            textInputStyle: {},

            // 参与者光标
            participantCursors: new Map(),

            // WebSocket连接
            ws: null,

            // 触摸设备支持
            isTouchDevice: false,
            touchStartTime: 0
        }
    },
    mounted () {
        this.initCanvas()
        this.setupWebSocket()
        this.detectTouchDevice()
        this.addEventListeners()
    },
    beforeDestroy () {
        this.cleanup()
    },
    methods: {
    // 初始化画布
        initCanvas () {
            this.canvas = this.$refs.whiteboard
            this.ctx = this.canvas.getContext('2d')

            this.resizeCanvas()
            this.setupCanvasDefaults()
            this.saveState()

            // 监听窗口大小变化
            window.addEventListener('resize', this.resizeCanvas)
        },

        // 调整画布大小
        resizeCanvas () {
            const container = this.$refs.whiteboardContainer
            if (!container || !this.canvas) return

            const rect = container.getBoundingClientRect()
            this.canvas.width = rect.width
            this.canvas.height = rect.height - 40 // 减去工具栏高度

            this.setupCanvasDefaults()
            this.redrawCurrentPage()
        },

        // 设置画布默认属性
        setupCanvasDefaults () {
            this.ctx.lineCap = 'round'
            this.ctx.lineJoin = 'round'
            this.ctx.imageSmoothingEnabled = true
        },

        // 设置工具
        setTool (tool) {
            this.currentTool = tool
            this.canvas.style.cursor = this.getCursor(tool)

            // 发送工具切换事件
            this.broadcastEvent('toolChange', {
                tool,
                userId: this.$store.getters.userId,
                userName: this.$store.getters.username
            })
        },

        // 获取光标样式
        getCursor (tool) {
            const cursors = {
                pen: 'crosshair',
                eraser: 'crosshair',
                line: 'crosshair',
                rectangle: 'crosshair',
                circle: 'crosshair',
                text: 'text'
            }
            return cursors[tool] || 'default'
        },

        // 设置颜色
        setColor (color) {
            this.currentColor = color
        },

        // 鼠标事件处理
        onMouseDown (event) {
            if (!this.canDrawIframe) return

            event.preventDefault()
            const rect = this.canvas.getBoundingClientRect()
            this.startX = event.clientX - rect.left
            this.startY = event.clientY - rect.top

            if (this.currentTool === 'text') {
                this.showTextInputAt(this.startX, this.startY)
                return
            }

            this.isDrawing = true
            this.ctx.beginPath()

            if (this.currentTool === 'pen' || this.currentTool === 'eraser') {
                this.ctx.moveTo(this.startX, this.startY)
            }

            // 广播开始绘制事件
            this.broadcastDrawEvent('drawStart', {
                x: this.startX,
                y: this.startY,
                tool: this.currentTool,
                color: this.currentColor,
                width: this.currentWidth
            })
        },

        onMouseMove (event) {
            const rect = this.canvas.getBoundingClientRect()
            const currentX = event.clientX - rect.left
            const currentY = event.clientY - rect.top

            // 广播光标位置
            this.broadcastCursor(currentX, currentY)

            if (!this.isDrawing || !this.canDrawIframe) return

            event.preventDefault()

            switch (this.currentTool) {
            case 'pen':
                this.drawLine(this.startX, this.startY, currentX, currentY)
                this.startX = currentX
                this.startY = currentY
                break
            case 'eraser':
                this.erase(currentX, currentY)
                break
            default:
                this.redrawCurrentPage()
                this.drawShape(this.startX, this.startY, currentX, currentY)
            }

            // 广播绘制事件
            this.broadcastDrawEvent('drawMove', {
                x: currentX,
                y: currentY,
                startX: this.startX,
                startY: this.startY,
                tool: this.currentTool,
                color: this.currentColor,
                width: this.currentWidth
            })
        },

        onMouseUp (event) {
            if (!this.isDrawing || !this.canDrawIframe) return

            event.preventDefault()
            this.isDrawing = false

            const rect = this.canvas.getBoundingClientRect()
            const endX = event.clientX - rect.left
            const endY = event.clientY - rect.top

            if (['line', 'rectangle', 'circle'].includes(this.currentTool)) {
                this.drawShape(this.startX, this.startY, endX, endY)
            }

            this.saveState()

            // 广播结束绘制事件
            this.broadcastDrawEvent('drawEnd', {
                x: endX,
                y: endY,
                startX: this.startX,
                startY: this.startY,
                tool: this.currentTool,
                color: this.currentColor,
                width: this.currentWidth
            })
        },

        onMouseLeave () {
            this.isDrawing = false
        },

        // 触摸事件处理
        onTouchStart (event) {
            event.preventDefault()
            const touch = event.touches[0]
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            })
            this.onMouseDown(mouseEvent)
        },

        onTouchMove (event) {
            event.preventDefault()
            const touch = event.touches[0]
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            })
            this.onMouseMove(mouseEvent)
        },

        onTouchEnd (event) {
            event.preventDefault()
            const mouseEvent = new MouseEvent('mouseup', {})
            this.onMouseUp(mouseEvent)
        },

        // 绘制函数
        drawLine (x1, y1, x2, y2) {
            this.ctx.globalCompositeOperation = 'source-over'
            this.ctx.strokeStyle = this.currentColor
            this.ctx.lineWidth = this.currentWidth
            this.ctx.lineTo(x2, y2)
            this.ctx.stroke()
        },

        drawShape (startX, startY, endX, endY) {
            this.ctx.globalCompositeOperation = 'source-over'
            this.ctx.strokeStyle = this.currentColor
            this.ctx.lineWidth = this.currentWidth

            switch (this.currentTool) {
            case 'line':
                this.ctx.beginPath()
                this.ctx.moveTo(startX, startY)
                this.ctx.lineTo(endX, endY)
                this.ctx.stroke()
                break
            case 'rectangle':
                this.ctx.beginPath()
                this.ctx.rect(startX, startY, endX - startX, endY - startY)
                this.ctx.stroke()
                break
            case 'circle':
                const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2))
                this.ctx.beginPath()
                this.ctx.arc(startX, startY, radius, 0, 2 * Math.PI)
                this.ctx.stroke()
                break
            }
        },

        erase (x, y) {
            this.ctx.globalCompositeOperation = 'destination-out'
            this.ctx.beginPath()
            this.ctx.arc(x, y, this.currentWidth, 0, 2 * Math.PI)
            this.ctx.fill()
        },

        // 文本处理
        showTextInputAt (x, y) {
            this.showTextInput = true
            this.textInputValue = ''
            this.textInputStyle = {
                position: 'absolute',
                left: x + 'px',
                top: y + 'px',
                zIndex: 1000
            }

            this.$nextTick(() => {
                this.$refs.textInput.focus()
            })
        },

        addText () {
            if (!this.textInputValue.trim()) {
                this.showTextInput = false
                return
            }

            const x = parseInt(this.textInputStyle.left)
            const y = parseInt(this.textInputStyle.top)

            this.ctx.globalCompositeOperation = 'source-over'
            this.ctx.fillStyle = this.currentColor
            this.ctx.font = `${this.currentWidth * 4}px Arial`
            this.ctx.fillText(this.textInputValue, x, y)

            this.showTextInput = false
            this.saveState()

            // 广播文本事件
            this.broadcastDrawEvent('addText', {
                text: this.textInputValue,
                x: x,
                y: y,
                color: this.currentColor,
                fontSize: this.currentWidth * 4
            })
        },

        // 历史记录管理
        saveState () {
            if (this.historyIndex < this.history.length - 1) {
                this.history = this.history.slice(0, this.historyIndex + 1)
            }

            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
            this.history.push(imageData)

            if (this.history.length > this.maxHistory) {
                this.history.shift()
            } else {
                this.historyIndex++
            }

            this.pages[this.currentPage - 1].data = imageData
        },

        undoAction () {
            if (this.historyIndex > 0) {
                this.historyIndex--
                const imageData = this.history[this.historyIndex]
                this.ctx.putImageData(imageData, 0, 0)

                this.broadcastEvent('undo', { page: this.currentPage })
            }
        },

        redoAction () {
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++
                const imageData = this.history[this.historyIndex]
                this.ctx.putImageData(imageData, 0, 0)

                this.broadcastEvent('redo', { page: this.currentPage })
            }
        },

        clearBoard () {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
            this.saveState()

            this.broadcastEvent('clear', { page: this.currentPage })
        },

        // 页面管理
        addPage () {
            this.pages.push({ data: null, background: null })
            this.totalPages = this.pages.length
            this.nextPage()
        },

        previousPage () {
            if (this.currentPage > 1) {
                this.saveCurrentPage()
                this.currentPage--
                this.loadPage(this.currentPage)
            }
        },

        nextPage () {
            if (this.currentPage < this.totalPages) {
                this.saveCurrentPage()
                this.currentPage++
                this.loadPage(this.currentPage)
            } else if (this.currentPage === this.totalPages && this.pages[this.currentPage - 1].data) {
                this.addPage()
            }
        },

        saveCurrentPage () {
            const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
            this.pages[this.currentPage - 1].data = imageData
        },

        loadPage (pageNum) {
            const page = this.pages[pageNum - 1]
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

            if (page.background) {
                this.ctx.putImageData(page.background, 0, 0)
            }

            if (page.data) {
                this.ctx.putImageData(page.data, 0, 0)
            }

            this.saveState()
        },

        redrawCurrentPage () {
            const page = this.pages[this.currentPage - 1]
            if (page.data) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
                if (page.background) {
                    this.ctx.putImageData(page.background, 0, 0)
                }
                this.ctx.putImageData(page.data, 0, 0)
            }
        },

        // 图片处理
        loadImage (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
                const img = new Image()
                img.onload = () => {
                    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height)
                    this.saveState()
                }
                img.src = e.target.result
            }
            reader.readAsDataURL(file)
            return false
        },

        saveBoard () {
            const link = document.createElement('a')
            link.download = `whiteboard-page-${this.currentPage}-${Date.now()}.png`
            link.href = this.canvas.toDataURL()
            link.click()
        },

        // WebSocket通信
        setupWebSocket () {
            if (!this.classroomId) return

            const wsUrl = `ws://localhost:3001/whiteboard/${this.classroomId}`
            this.ws = new WebSocket(wsUrl)

            this.ws.onopen = () => {
            }

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data)
                this.handleWhiteboardMessage(data)
            }

            this.ws.onerror = (error) => {
                console.error('白板WebSocket错误:', error)
            }

            this.ws.onclose = () => {
                setTimeout(() => this.setupWebSocket(), 3000)
            }
        },

        handleWhiteboardMessage (data) {
            if (data.userId === this.$store.getters.userId) return

            switch (data.type) {
            case 'drawStart':
            case 'drawMove':
            case 'drawEnd':
                this.handleRemoteDrawEvent(data)
                break
            case 'cursor':
                this.updateParticipantCursor(data)
                break
            case 'clear':
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
                break
            case 'undo':
            case 'redo':
                // 处理远程撤销/重做
                break
            case 'addText':
                this.handleRemoteText(data)
                break
            }
        },

        handleRemoteDrawEvent (data) {
            const oldColor = this.ctx.strokeStyle
            const oldWidth = this.ctx.lineWidth

            this.ctx.strokeStyle = data.color
            this.ctx.lineWidth = data.width

            switch (data.tool) {
            case 'pen':
                if (data.type === 'drawStart') {
                    this.ctx.beginPath()
                    this.ctx.moveTo(data.x, data.y)
                } else if (data.type === 'drawMove') {
                    this.ctx.lineTo(data.x, data.y)
                    this.ctx.stroke()
                }
                break
            case 'line':
                if (data.type === 'drawEnd') {
                    this.ctx.beginPath()
                    this.ctx.moveTo(data.startX, data.startY)
                    this.ctx.lineTo(data.x, data.y)
                    this.ctx.stroke()
                }
                break
            }

            this.ctx.strokeStyle = oldColor
            this.ctx.lineWidth = oldWidth
        },

        handleRemoteText (data) {
            const oldFillStyle = this.ctx.fillStyle
            this.ctx.fillStyle = data.color
            this.ctx.font = `${data.fontSize}px Arial`
            this.ctx.fillText(data.text, data.x, data.y)
            this.ctx.fillStyle = oldFillStyle
        },

        updateParticipantCursor (data) {
            this.participantCursors.set(data.userId, {
                userId: data.userId,
                name: data.userName,
                x: data.x,
                y: data.y,
                color: data.color || '#666',
                timestamp: Date.now()
            })

            // 5秒后清除光标
            setTimeout(() => {
                const cursor = this.participantCursors.get(data.userId)
                if (cursor && Date.now() - cursor.timestamp > 4500) {
                    this.participantCursors.delete(data.userId)
                }
            }, 5000)
        },

        broadcastDrawEvent (type, data) {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

            this.ws.send(JSON.stringify({
                type,
                userId: this.$store.getters.userId,
                userName: this.$store.getters.username,
                classroomId: this.classroomId,
                page: this.currentPage,
                ...data
            }))
        },

        broadcastEvent (type, data) {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

            this.ws.send(JSON.stringify({
                type,
                userId: this.$store.getters.userId,
                userName: this.$store.getters.username,
                classroomId: this.classroomId,
                ...data
            }))
        },

        broadcastCursor (x, y) {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

            // 节流发送光标位置
            clearTimeout(this.cursorThrottle)
            this.cursorThrottle = setTimeout(() => {
                this.ws.send(JSON.stringify({
                    type: 'cursor',
                    userId: this.$store.getters.userId,
                    userName: this.$store.getters.username,
                    classroomId: this.classroomId,
                    x: x,
                    y: y
                }))
            }, 50)
        },

        // 工具函数
        detectTouchDevice () {
            this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
        },

        addEventListeners () {
            // 防止页面滚动
            document.addEventListener('touchstart', (e) => {
                if (e.target === this.canvas) {
                    e.preventDefault()
                }
            }, { passive: false })

            document.addEventListener('touchmove', (e) => {
                if (e.target === this.canvas) {
                    e.preventDefault()
                }
            }, { passive: false })
        },

        cleanup () {
            if (this.ws) {
                this.ws.close()
            }
            window.removeEventListener('resize', this.resizeCanvas)
            clearTimeout(this.cursorThrottle)
        }
    }
}
</script>

<style scoped>
.classroom-whiteboard {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8f9fa;
}

.whiteboard-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #ffffff;
  border-bottom: 1px solid #e8e8e8;
  flex-wrap: wrap;
  gap: 12px;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-label {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.color-picker {
  display: flex;
  gap: 4px;
}

.color-item {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid #ddd;
  transition: all 0.2s;
}

.color-item.active {
  border-color: #1890ff;
  transform: scale(1.1);
}

.width-value {
  font-size: 12px;
  color: #666;
  min-width: 30px;
  text-align: center;
}

.whiteboard-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #ffffff;
}

.whiteboard-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  background: #ffffff;
}

.text-input-container {
  position: absolute;
  z-index: 1000;
}

.text-input-container .ant-input {
  border: 2px solid #1890ff;
  min-width: 200px;
}

.participant-cursor {
  position: absolute;
  pointer-events: none;
  z-index: 999;
}

.cursor-pointer {
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 12px solid currentColor;
  margin-bottom: 2px;
}

.cursor-name {
  font-size: 11px;
  background: currentColor;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
}

.page-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background: #ffffff;
  border-top: 1px solid #e8e8e8;
  gap: 12px;
}

.page-info {
  font-size: 14px;
  color: #666;
  margin: 0 8px;
}

@media (max-width: 768px) {
  .whiteboard-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .tool-group {
    justify-content: center;
  }

  .color-picker {
    justify-content: center;
  }
}
</style>
