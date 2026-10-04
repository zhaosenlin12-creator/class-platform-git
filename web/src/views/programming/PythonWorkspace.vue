<template>
  <div class="python-workspace">
    <!-- 头部工具栏 -->
    <div class="workspace-header">
      <div class="header-left">
        <h2 v-if="currentWork">{{ currentWork.workName }} - Python编程</h2>
        <h2 v-else>Python编程工作空间</h2>
        <div class="work-info" v-if="currentWork">
          <a-tag color="green">Python</a-tag>
          <span class="deadline" v-if="currentWork.endTime">
            截止时间：{{ currentWork.endTime | moment }}
          </span>
        </div>
      </div>
      <div class="header-right">
        <a-button-group>
          <a-button @click="saveCode" :loading="saving" icon="save">保存</a-button>
          <a-button @click="downloadCode" icon="download">下载</a-button>
          <a-button @click="shareCode" icon="share-alt">分享</a-button>
        </a-button-group>
        <a-button type="primary" @click="submitWork" :disabled="!canSubmit" style="margin-left: 8px">
          提交作业
        </a-button>
      </div>
    </div>

    <!-- 主要内容区 -->
    <div class="workspace-content">
      <!-- 左侧代码编辑器 -->
      <div class="editor-panel">
        <div class="editor-header">
          <div class="file-tabs">
            <a-tabs v-model="activeFileTab" type="editable-card" @edit="onTabEdit" @change="onTabChange">
              <a-tab-pane v-for="file in openFiles" :key="file.id" :tab="file.name" :closable="openFiles.length > 1">
                <div class="editor-container">
                  <!-- Monaco Editor 容器 -->
                  <div :id="`editor-${file.id}`" class="monaco-editor"></div>
                </div>
              </a-tab-pane>
            </a-tabs>
          </div>
          <div class="editor-actions">
            <a-button-group size="small">
              <a-button @click="runCode" type="primary" icon="play-circle" :loading="running">运行</a-button>
              <a-button @click="debugCode" icon="bug">调试</a-button>
              <a-button @click="formatCode" icon="formatting">格式化</a-button>
              <a-button @click="lintCode" icon="check-circle">检查</a-button>
            </a-button-group>
          </div>
        </div>

        <!-- 代码编辑器主体 -->
        <div class="editor-main">
          <div class="editor-sidebar">
            <a-tabs size="small">
              <a-tab-pane key="files" tab="文件">
                <div class="file-explorer">
                  <div class="file-tree">
                    <a-button @click="addNewFile" size="small" block style="margin-bottom: 8px;">
                      <a-icon type="plus" /> 新建文件
                    </a-button>
                    <a-tree
                      :tree-data="fileTree"
                      :selected-keys="selectedFiles"
                      @select="onFileSelect"
                      @rightClick="onFileRightClick">
                      <template slot="title" slot-scope="{ title, key, isLeaf }">
                        <span v-if="!isLeaf">
                          <a-icon type="folder" style="color: #1890ff;" /> {{ title }}
                        </span>
                        <span v-else>
                          <a-icon type="file-text" style="color: #52c41a;" /> {{ title }}
                        </span>
                      </template>
                    </a-tree>
                  </div>
                </div>
              </a-tab-pane>
              <a-tab-pane key="outline" tab="大纲">
                <div class="code-outline">
                  <a-tree :tree-data="codeOutline" @select="goToFunction">
                    <template slot="title" slot-scope="{ title, type }">
                      <span>
                        <a-icon :type="getOutlineIcon(type)" /> {{ title }}
                      </span>
                    </template>
                  </a-tree>
                </div>
              </a-tab-pane>
            </a-tabs>
          </div>

          <div class="editor-content">
            <!-- Monaco Editor 在这里动态挂载 -->
          </div>
        </div>
      </div>

      <!-- 右侧面板 -->
      <div class="right-panel">
        <a-tabs size="small">
          <!-- 运行结果 -->
          <a-tab-pane key="output" tab="运行结果">
            <div class="output-container">
              <div class="output-header">
                <span class="execution-info" v-if="lastExecution">
                  执行时间：{{ lastExecution.duration }}ms |
                  状态：<a-tag :color="lastExecution.success ? 'green' : 'red'">
                    {{ lastExecution.success ? '成功' : '失败' }}
                  </a-tag>
                </span>
                <a-button size="small" @click="clearOutput" icon="delete">清空</a-button>
              </div>
              <div class="output-content">
                <div class="stdout" v-if="output.stdout">
                  <h4>标准输出：</h4>
                  <pre>{{ output.stdout }}</pre>
                </div>
                <div class="stderr" v-if="output.stderr">
                  <h4>错误输出：</h4>
                  <pre class="error">{{ output.stderr }}</pre>
                </div>
                <div class="result" v-if="output.result">
                  <h4>返回值：</h4>
                  <pre>{{ output.result }}</pre>
                </div>
              </div>
            </div>
          </a-tab-pane>

          <!-- 代码检查 -->
          <a-tab-pane key="lint" tab="代码检查">
            <div class="lint-container">
              <div class="lint-summary">
                <a-statistic title="问题总数" :value="lintResults.length" />
                <a-button @click="lintCode" size="small" type="primary" style="margin-top: 8px;">
                  重新检查
                </a-button>
              </div>
              <a-list :dataSource="lintResults" size="small">
                <a-list-item slot="renderItem" slot-scope="item">
                  <div class="lint-item">
                    <a-icon :type="getLintIcon(item.severity)" :style="{ color: getLintColor(item.severity) }" />
                    <span class="lint-message">{{ item.message }}</span>
                    <div class="lint-location">
                      第{{ item.line }}行，第{{ item.column }}列
                      <a-button size="small" type="link" @click="goToLine(item.line)">定位</a-button>
                    </div>
                  </div>
                </a-list-item>
              </a-list>
            </div>
          </a-tab-pane>

          <!-- 测试用例 -->
          <a-tab-pane key="tests" tab="测试用例">
            <div class="test-container">
              <div class="test-header">
                <a-button @click="runTests" type="primary" size="small" :loading="runningTests">
                  运行测试
                </a-button>
                <a-button @click="addTestCase" size="small" style="margin-left: 8px;">
                  添加测试
                </a-button>
              </div>
              <div class="test-cases">
                <div v-for="(testCase, index) in testCases" :key="index" class="test-case">
                  <div class="test-case-header">
                    <span>测试用例 {{ index + 1 }}</span>
                    <a-tag :color="getTestStatusColor(testCase.status)">
                      {{ getTestStatusText(testCase.status) }}
                    </a-tag>
                  </div>
                  <div class="test-case-content">
                    <div class="test-input">
                      <span>输入：</span>
                      <pre>{{ testCase.input }}</pre>
                    </div>
                    <div class="test-expected">
                      <span>期望输出：</span>
                      <pre>{{ testCase.expected }}</pre>
                    </div>
                    <div v-if="testCase.actual" class="test-actual">
                      <span>实际输出：</span>
                      <pre>{{ testCase.actual }}</pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </a-tab-pane>

          <!-- AI助手 -->
          <a-tab-pane key="ai" tab="AI助手">
            <div class="ai-assistant">
              <div class="ai-chat">
                <div class="chat-messages" ref="chatMessages">
                  <div v-for="(message, index) in aiMessages" :key="index" class="chat-message" :class="message.type">
                    <div class="message-content">{{ message.content }}</div>
                    <div class="message-time">{{ message.time | moment }}</div>
                  </div>
                </div>
                <div class="chat-input">
                  <a-input v-model="aiInput" placeholder="询问代码问题..." @pressEnter="sendToAI" />
                  <a-button @click="sendToAI" type="primary" :loading="aiThinking">发送</a-button>
                </div>
              </div>
              <div class="ai-suggestions">
                <h4>智能建议：</h4>
                <a-list :dataSource="aiSuggestions" size="small">
                  <a-list-item slot="renderItem" slot-scope="item">
                    <a-button type="link" @click="applySuggestion(item)" size="small">
                      {{ item.title }}
                    </a-button>
                  </a-list-item>
                </a-list>
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="status-bar">
      <div class="status-left">
        <span>行 {{ cursorPosition.line }}, 列 {{ cursorPosition.column }}</span>
        <span>共 {{ totalLines }} 行</span>
        <span>{{ fileEncoding }}</span>
      </div>
      <div class="status-right">
        <span>Python {{ pythonVersion }}</span>
        <a-tag v-if="lastExecution" :color="lastExecution.success ? 'green' : 'red'">
          {{ lastExecution.success ? '运行成功' : '运行失败' }}
        </a-tag>
      </div>
    </div>

    <!-- 提交作业弹窗 -->
    <a-modal
      title="提交Python作业"
      :visible="submitModalVisible"
      @ok="confirmSubmit"
      @cancel="submitModalVisible = false"
      :confirmLoading="submitting"
      width="600px">
      <a-form :form="submitForm">
        <a-form-item label="代码说明">
          <a-textarea v-decorator="['codeDescription']" placeholder="请描述你的代码实现思路" :rows="4" />
        </a-form-item>
        <a-form-item label="遇到的困难">
          <a-textarea v-decorator="['difficulties']" placeholder="编程过程中遇到了什么问题？" :rows="3" />
        </a-form-item>
        <a-form-item label="自我评价">
          <a-rate v-decorator="['selfRating', {initialValue: 3}]" :count="5" />
        </a-form-item>
        <a-form-item label="提交文件">
          <a-checkbox-group v-decorator="['filesToSubmit', {initialValue: getDefaultFilesToSubmit()}]">
            <a-checkbox v-for="file in openFiles" :key="file.id" :value="file.id">
              {{ file.name }}
            </a-checkbox>
          </a-checkbox-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import moment from 'moment'
import { getAction, postAction } from '@/api/manage'

export default {
    name: 'PythonWorkspace',
    filters: {
        moment: function (date) {
            return date ? moment(date).format('MM-DD HH:mm') : '-'
        }
    },
    data () {
        return {
            // 当前作业信息
            currentWork: null,

            // 编辑器相关
            activeFileTab: 'main.py',
            openFiles: [
                { id: 'main.py', name: 'main.py', content: '# Python编程作业\n\nprint("Hello, World!")\n\n# 在这里编写你的代码\n', language: 'python' }
            ],
            selectedFiles: ['main.py'],
            monacoEditor: null,
            editors: {},

            // 文件系统
            fileTree: [
                {
                    title: '项目文件',
                    key: 'root',
                    children: [
                        { title: 'main.py', key: 'main.py', isLeaf: true }
                    ]
                }
            ],

            // 代码大纲
            codeOutline: [],

            // 运行相关
            running: false,
            output: {
                stdout: '',
                stderr: '',
                result: ''
            },
            lastExecution: null,

            // 代码检查
            lintResults: [],

            // 测试用例
            runningTests: false,
            testCases: [],

            // AI助手
            aiMessages: [],
            aiInput: '',
            aiThinking: false,
            aiSuggestions: [
                { title: '优化代码性能', action: 'optimize' },
                { title: '添加错误处理', action: 'error_handling' },
                { title: '生成文档注释', action: 'documentation' },
                { title: '重构代码结构', action: 'refactor' }
            ],

            // 状态信息
            cursorPosition: { line: 1, column: 1 },
            totalLines: 1,
            fileEncoding: 'UTF-8',
            pythonVersion: '3.9.0',

            // 提交相关
            saving: false,
            submitting: false,
            canSubmit: false,
            submitModalVisible: false,
            submitForm: this.$form.createForm(this)
        }
    },
    async mounted () {
        await this.initMonacoEditor()
        this.loadWorkInfo()
        this.loadTestCases()
        this.setupAutoSave()
    },
    methods: {
        async initMonacoEditor () {
            // 动态加载Monaco Editor
            await this.loadMonacoScript()

            // 初始化编辑器
            this.createEditor('main.py')
        },

        async loadMonacoScript () {
            return new Promise((resolve) => {
                if (window.monaco) {
                    resolve()
                    return
                }

                const script = document.createElement('script')
                script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.34.0/min/vs/loader.js'
                script.onload = () => {
                    window.require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.34.0/min/vs' } })
                    window.require(['vs/editor/editor.main'], () => {
                        resolve()
                    })
                }
                document.head.appendChild(script)
            })
        },

        createEditor (fileId) {
            const container = document.getElementById(`editor-${fileId}`)
            if (!container || this.editors[fileId]) return

            const file = this.openFiles.find(f => f.id === fileId)
            if (!file) return

            const editor = window.monaco.editor.create(container, {
                value: file.content,
                language: file.language,
                theme: 'vs-dark',
                automaticLayout: true,
                fontSize: 14,
                minimap: { enabled: true },
                wordWrap: 'on',
                lineNumbers: 'on',
                folding: true,
                renderWhitespace: 'boundary'
            })

            // 监听内容变化
            editor.onDidChangeModelContent(() => {
                file.content = editor.getValue()
                this.canSubmit = true
                this.updateCodeOutline()
            })

            // 监听光标位置变化
            editor.onDidChangeCursorPosition((e) => {
                this.cursorPosition = {
                    line: e.position.lineNumber,
                    column: e.position.column
                }
            })

            this.editors[fileId] = editor
            this.monacoEditor = editor // 当前活动编辑器
        },

        loadWorkInfo () {
            const workId = this.$route.query.workId
            if (workId) {
                getAction('/teaching/teachingWork/get', { id: workId }).then(res => {
                    if (res.success) {
                        this.currentWork = res.result
                        this.loadWorkStarterCode()
                    }
                })
            }
        },

        loadWorkStarterCode () {
            if (this.currentWork && this.currentWork.starterTemplate) {
                // 加载起始代码模板
                getAction('/teaching/teachingWork/getStarterCode', { workId: this.currentWork.id }).then(res => {
                    if (res.success && res.result.code) {
                        const mainFile = this.openFiles.find(f => f.id === 'main.py')
                        if (mainFile) {
                            mainFile.content = res.result.code
                            if (this.editors['main.py']) {
                                this.editors['main.py'].setValue(res.result.code)
                            }
                        }
                    }
                })
            }
        },

        loadTestCases () {
            if (this.currentWork) {
                getAction('/teaching/teachingWork/getTestCases', { workId: this.currentWork.id }).then(res => {
                    if (res.success) {
                        this.testCases = res.result || []
                    }
                })
            } else {
                // 默认测试用例
                this.testCases = [
                    {
                        input: '',
                        expected: 'Hello, World!',
                        status: 'pending'
                    }
                ]
            }
        },

        async runCode () {
            if (!this.monacoEditor) return

            this.running = true
            const code = this.monacoEditor.getValue()
            const startTime = Date.now()

            try {
                const response = await postAction('/api/python/execute', {
                    code: code,
                    timeout: 10000
                })

                const duration = Date.now() - startTime

                if (response.success) {
                    this.output = {
                        stdout: response.result.stdout || '',
                        stderr: response.result.stderr || '',
                        result: response.result.result || ''
                    }

                    this.lastExecution = {
                        success: !response.result.stderr,
                        duration: duration,
                        time: new Date()
                    }
                } else {
                    this.output = {
                        stdout: '',
                        stderr: response.message || '执行失败',
                        result: ''
                    }

                    this.lastExecution = {
                        success: false,
                        duration: duration,
                        time: new Date()
                    }
                }
            } catch (error) {
                this.output = {
                    stdout: '',
                    stderr: `网络错误: ${error.message}`,
                    result: ''
                }

                this.lastExecution = {
                    success: false,
                    duration: Date.now() - startTime,
                    time: new Date()
                }
            }

            this.running = false
            this.canSubmit = true
        },

        async lintCode () {
            if (!this.monacoEditor) return

            const code = this.monacoEditor.getValue()

            try {
                const response = await postAction('/api/python/lint', { code })

                if (response.success) {
                    this.lintResults = response.result.issues || []

                    // 在编辑器中显示错误标记
                    const markers = this.lintResults.map(issue => ({
                        startLineNumber: issue.line,
                        endLineNumber: issue.line,
                        startColumn: issue.column,
                        endColumn: issue.column + 10,
                        message: issue.message,
                        severity: this.getMonacoSeverity(issue.severity)
                    }))

                    window.monaco.editor.setModelMarkers(this.monacoEditor.getModel(), 'lint', markers)
                }
            } catch (error) {
                this.$message.error('代码检查失败：' + error.message)
            }
        },

        async runTests () {
            this.runningTests = true

            const code = this.monacoEditor.getValue()

            for (let i = 0; i < this.testCases.length; i++) {
                const testCase = this.testCases[i]

                try {
                    const response = await postAction('/api/python/test', {
                        code: code,
                        input: testCase.input
                    })

                    if (response.success) {
                        const actual = response.result.stdout.trim()
                        testCase.actual = actual
                        testCase.status = actual === testCase.expected.trim() ? 'passed' : 'failed'
                    } else {
                        testCase.actual = response.result.stderr || '运行错误'
                        testCase.status = 'error'
                    }
                } catch (error) {
                    testCase.actual = `网络错误: ${error.message}`
                    testCase.status = 'error'
                }
            }

            this.runningTests = false
        },

        formatCode () {
            if (!this.monacoEditor) return

            // 触发Monaco Editor的格式化
            this.monacoEditor.getAction('editor.action.formatDocument').run()
        },

        debugCode () {
            this.$message.info('调试功能开发中...')
        },

        updateCodeOutline () {
            if (!this.monacoEditor) return

            const code = this.monacoEditor.getValue()
            const lines = code.split('\n')
            const outline = []

            lines.forEach((line, index) => {
                const trimmed = line.trim()
                if (trimmed.startsWith('def ')) {
                    const match = trimmed.match(/def\s+(\w+)/)
                    const funcName = match && match[1]
                    if (funcName) {
                        outline.push({
                            title: funcName,
                            key: `func_${index}`,
                            type: 'function',
                            line: index + 1
                        })
                    }
                } else if (trimmed.startsWith('class ')) {
                    const classMatch = trimmed.match(/class\s+(\w+)/)
                    const className = classMatch && classMatch[1]
                    if (className) {
                        outline.push({
                            title: className,
                            key: `class_${index}`,
                            type: 'class',
                            line: index + 1
                        })
                    }
                }
            })

            this.codeOutline = outline
        },

        async sendToAI () {
            if (!this.aiInput.trim()) return

            const userMessage = {
                type: 'user',
                content: this.aiInput,
                time: new Date()
            }

            this.aiMessages.push(userMessage)
            this.aiThinking = true
            this.aiInput = ''

            try {
                const response = await postAction('/api/ai/askCode', {
                    question: userMessage.content,
                    code: this.monacoEditor.getValue()
                })

                const aiMessage = {
                    type: 'ai',
                    content: response.result.answer || '抱歉，我无法回答这个问题。',
                    time: new Date()
                }

                this.aiMessages.push(aiMessage)
            } catch (error) {
                const errorMessage = {
                    type: 'ai',
                    content: '抱歉，AI助手暂时无法使用。',
                    time: new Date()
                }
                this.aiMessages.push(errorMessage)
            }

            this.aiThinking = false
            this.$nextTick(() => {
                this.$refs.chatMessages.scrollTop = this.$refs.chatMessages.scrollHeight
            })
        },

        // 文件操作
        addNewFile () {
            this.$prompt('请输入文件名', '新建文件', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                inputValue: 'new_file.py'
            }).then(({ value }) => {
                if (value) {
                    const newFile = {
                        id: value,
                        name: value,
                        content: '# 新建Python文件\n\n',
                        language: 'python'
                    }
                    this.openFiles.push(newFile)
                    this.activeFileTab = value
                    this.$nextTick(() => {
                        this.createEditor(value)
                    })
                }
            })
        },

        saveCode () {
            this.saving = true

            const saveData = {
                workId: this.currentWork ? this.currentWork.id : null,
                files: this.openFiles.map(file => ({
                    name: file.name,
                    content: file.content
                }))
            }

            postAction('/teaching/pythonProject/save', saveData).then(res => {
                if (res.success) {
                    this.$message.success('保存成功')
                } else {
                    this.$message.error('保存失败：' + res.message)
                }
            }).finally(() => {
                this.saving = false
            })
        },

        downloadCode () {
            const file = this.openFiles.find(f => f.id === this.activeFileTab)
            if (!file) return

            const blob = new Blob([file.content], { type: 'text/plain' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = file.name
            a.click()
            URL.revokeObjectURL(url)
        },

        submitWork () {
            if (!this.currentWork) {
                this.$message.warning('请先选择要提交的作业')
                return
            }

            this.submitModalVisible = true
        },

        confirmSubmit () {
            this.submitForm.validateFields((err, values) => {
                if (!err) {
                    this.submitting = true

                    const submitData = {
                        workId: this.currentWork.id,
                        files: this.openFiles.filter(f => values.filesToSubmit.includes(f.id)),
                        codeDescription: values.codeDescription,
                        difficulties: values.difficulties,
                        selfRating: values.selfRating,
                        testResults: this.testCases
                    }

                    postAction('/teaching/teachingWorkSubmit/submitPython', submitData).then(res => {
                        if (res.success) {
                            this.$message.success('作业提交成功！')
                            this.submitModalVisible = false
                        } else {
                            this.$message.error('提交失败：' + res.message)
                        }
                    }).finally(() => {
                        this.submitting = false
                    })
                }
            })
        },

        setupAutoSave () {
            setInterval(() => {
                if (this.canSubmit && !this.saving) {
                    this.saveCode()
                }
            }, 60000) // 每分钟自动保存
        },

        // 辅助方法
        getDefaultFilesToSubmit () {
            return this.openFiles.map(f => f.id)
        },

        getLintIcon (severity) {
            const icons = {
                'error': 'close-circle',
                'warning': 'exclamation-circle',
                'info': 'info-circle'
            }
            return icons[severity] || 'info-circle'
        },

        getLintColor (severity) {
            const colors = {
                'error': '#f5222d',
                'warning': '#fa8c16',
                'info': '#1890ff'
            }
            return colors[severity] || '#1890ff'
        },

        getOutlineIcon (type) {
            const icons = {
                'function': 'function',
                'class': 'api',
                'variable': 'setting'
            }
            return icons[type] || 'code'
        },

        getTestStatusColor (status) {
            const colors = {
                'passed': 'green',
                'failed': 'red',
                'error': 'orange',
                'pending': 'default'
            }
            return colors[status] || 'default'
        },

        getTestStatusText (status) {
            const texts = {
                'passed': '通过',
                'failed': '失败',
                'error': '错误',
                'pending': '待运行'
            }
            return texts[status] || status
        },

        getMonacoSeverity (severity) {
            const severities = {
                'error': window.monaco.MarkerSeverity.Error,
                'warning': window.monaco.MarkerSeverity.Warning,
                'info': window.monaco.MarkerSeverity.Info
            }
            return severities[severity] || window.monaco.MarkerSeverity.Info
        },

        goToLine (line) {
            if (this.monacoEditor) {
                this.monacoEditor.revealLineInCenter(line)
                this.monacoEditor.setPosition({ lineNumber: line, column: 1 })
            }
        },

        onTabChange (key) {
            this.activeFileTab = key
            if (this.editors[key]) {
                this.monacoEditor = this.editors[key]
            } else {
                this.createEditor(key)
            }
        },

        onTabEdit (targetKey, action) {
            if (action === 'remove') {
                this.closeFile(targetKey)
            }
        },

        closeFile (fileId) {
            if (this.openFiles.length === 1) {
                this.$message.warning('至少需要保留一个文件')
                return
            }

            const index = this.openFiles.findIndex(f => f.id === fileId)
            if (index > -1) {
                this.openFiles.splice(index, 1)
                if (this.editors[fileId]) {
                    this.editors[fileId].dispose()
                    delete this.editors[fileId]
                }

                if (this.activeFileTab === fileId) {
                    this.activeFileTab = this.openFiles[0].id
                    this.monacoEditor = this.editors[this.activeFileTab]
                }
            }
        }
    },

    beforeDestroy () {
    // 清理编辑器
        Object.values(this.editors).forEach(editor => {
            if (editor) {
                editor.dispose()
            }
        })
    }
}
</script>

<style scoped>
.python-workspace {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  color: #d4d4d4;
}

.workspace-header {
  background: #2d2d30;
  padding: 12px 20px;
  border-bottom: 1px solid #3e3e42;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left h2 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #cccccc;
}

.work-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.deadline {
  font-size: 13px;
  color: #969696;
}

.workspace-content {
  flex: 1;
  display: flex;
  height: calc(100vh - 120px);
}

.editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
}

.editor-header {
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
}

.file-tabs {
  flex: 1;
}

.editor-main {
  flex: 1;
  display: flex;
}

.editor-sidebar {
  width: 250px;
  background: #252526;
  border-right: 1px solid #3e3e42;
}

.editor-content {
  flex: 1;
}

.monaco-editor {
  height: 100%;
  width: 100%;
}

.right-panel {
  width: 350px;
  background: #252526;
  border-left: 1px solid #3e3e42;
}

.output-container {
  padding: 16px;
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.execution-info {
  font-size: 12px;
  color: #969696;
}

.output-content h4 {
  margin: 8px 0 4px 0;
  color: #cccccc;
  font-size: 13px;
}

.output-content pre {
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 4px;
  padding: 8px;
  font-size: 12px;
  color: #d4d4d4;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
}

.output-content pre.error {
  color: #f48771;
}

.status-bar {
  height: 24px;
  background: #007acc;
  color: white;
  padding: 0 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.status-left > span {
  margin-right: 16px;
}

.status-right > span {
  margin-left: 16px;
}

.lint-container, .test-container, .ai-assistant {
  padding: 16px;
}

.lint-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lint-message {
  font-size: 13px;
}

.lint-location {
  font-size: 11px;
  color: #969696;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.test-case {
  border: 1px solid #3e3e42;
  border-radius: 4px;
  margin-bottom: 8px;
  overflow: hidden;
}

.test-case-header {
  background: #2d2d30;
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.test-case-content {
  padding: 12px;
}

.test-case-content > div {
  margin-bottom: 8px;
}

.test-case-content span {
  font-weight: bold;
  color: #cccccc;
}

.test-case-content pre {
  background: #1e1e1e;
  border: 1px solid #3e3e42;
  border-radius: 3px;
  padding: 6px;
  margin: 4px 0 0 0;
  font-size: 11px;
}

.ai-chat {
  height: 300px;
  display: flex;
  flex-direction: column;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 12px;
}

.chat-message {
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 6px;
}

.chat-message.user {
  background: #0e639c;
  margin-left: 20px;
}

.chat-message.ai {
  background: #2d2d30;
  margin-right: 20px;
}

.message-content {
  font-size: 13px;
  line-height: 1.4;
}

.message-time {
  font-size: 11px;
  color: #969696;
  margin-top: 4px;
}

.chat-input {
  display: flex;
  gap: 8px;
}

.file-explorer {
  padding: 8px;
}

/* 覆盖Ant Design在深色主题下的样式 */
.python-workspace :deep(.ant-tabs-nav) {
  background: #2d2d30 !important;
}

.python-workspace :deep(.ant-tabs-tab) {
  color: #cccccc !important;
  background: #1e1e1e !important;
  border-color: #3e3e42 !important;
}

.python-workspace :deep(.ant-tabs-tab-active) {
  background: #1e1e1e !important;
  color: #ffffff !important;
}

.python-workspace :deep(.ant-input) {
  background: #3c3c3c !important;
  border-color: #3e3e42 !important;
  color: #cccccc !important;
}

.python-workspace :deep(.ant-btn) {
  background: #0e639c !important;
  border-color: #0e639c !important;
}
</style>
