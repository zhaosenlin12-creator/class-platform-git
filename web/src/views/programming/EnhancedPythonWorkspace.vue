<template>
  <div class="enhanced-python-workspace">
    <a-layout>
      <!-- 工具栏 -->
      <a-layout-header class="toolbar">
        <a-row :gutter="16" align="middle">
          <a-col :span="8">
            <h3 style="color: white; margin: 0;">Python编程创作空间</h3>
          </a-col>
          <a-col :span="10">
            <a-space>
              <a-button type="primary" icon="play-circle" @click="runCode" :loading="running">
                运行 (F5)
              </a-button>
              <a-button icon="stop" @click="stopCode" :disabled="!running">
                停止
              </a-button>
              <a-button icon="save" @click="saveCode">
                保存 (Ctrl+S)
              </a-button>
              <a-button icon="folder-open" @click="showLoadModal = true">
                打开
              </a-button>
              <a-button icon="download" @click="exportCode">
                导出
              </a-button>
              <a-button icon="share-alt" @click="shareCode">
                分享
              </a-button>
            </a-space>
          </a-col>
          <a-col :span="6" style="text-align: right;">
            <a-space>
              <a-select v-model="selectedTheme" style="width: 120px;" @change="changeTheme">
                <a-select-option value="vs">浅色主题</a-select-option>
                <a-select-option value="vs-dark">深色主题</a-select-option>
                <a-select-option value="hc-black">高对比度</a-select-option>
              </a-select>
              <a-button icon="question-circle" @click="showHelpModal = true">
                帮助
              </a-button>
              <a-button icon="setting" @click="showSettingsModal = true">
                设置
              </a-button>
            </a-space>
          </a-col>
        </a-row>
      </a-layout-header>

      <a-layout>
        <!-- 侧边栏 -->
        <a-layout-sider width="280" class="sidebar">
          <a-tabs v-model="activeSidebarTab" size="small">
            <!-- 文件资源管理器 -->
            <a-tab-pane key="files" tab="文件">
              <div class="sidebar-panel">
                <div class="panel-header">
                  <span>项目文件</span>
                  <a-dropdown>
                    <a-button type="link" size="small" icon="plus" />
                    <a-menu slot="overlay" @click="handleFileAction">
                      <a-menu-item key="new_file">
                        <a-icon type="file" />
                        新建文件
                      </a-menu-item>
                      <a-menu-item key="new_folder">
                        <a-icon type="folder" />
                        新建文件夹
                      </a-menu-item>
                      <a-menu-item key="upload">
                        <a-icon type="upload" />
                        上传文件
                      </a-menu-item>
                    </a-menu>
                  </a-dropdown>
                </div>

                <div class="file-tree">
                  <a-tree
                    :tree-data="fileTree"
                    :selected-keys="selectedFiles"
                    @select="selectFile"
                    @rightClick="showFileContextMenu"
                  >
                    <template slot="title" slot-scope="{ title, key, icon }">
                      <a-icon :type="icon" />
                      <span style="margin-left: 4px;">{{ title }}</span>
                    </template>
                  </a-tree>
                </div>
              </div>
            </a-tab-pane>

            <!-- 代码库和示例 -->
            <a-tab-pane key="snippets" tab="代码库">
              <div class="sidebar-panel">
                <div class="panel-header">
                  <span>代码片段</span>
                </div>

                <a-collapse size="small" :bordered="false">
                  <a-collapse-panel key="basic" header="基础语法">
                    <div
                      v-for="snippet in basicSnippets"
                      :key="snippet.id"
                      class="snippet-item"
                      @click="insertSnippet(snippet)">
                      <div class="snippet-title">{{ snippet.title }}</div>
                      <div class="snippet-desc">{{ snippet.description }}</div>
                    </div>
                  </a-collapse-panel>

                  <a-collapse-panel key="control" header="流程控制">
                    <div
                      v-for="snippet in controlSnippets"
                      :key="snippet.id"
                      class="snippet-item"
                      @click="insertSnippet(snippet)">
                      <div class="snippet-title">{{ snippet.title }}</div>
                      <div class="snippet-desc">{{ snippet.description }}</div>
                    </div>
                  </a-collapse-panel>

                  <a-collapse-panel key="functions" header="函数">
                    <div
                      v-for="snippet in functionSnippets"
                      :key="snippet.id"
                      class="snippet-item"
                      @click="insertSnippet(snippet)">
                      <div class="snippet-title">{{ snippet.title }}</div>
                      <div class="snippet-desc">{{ snippet.description }}</div>
                    </div>
                  </a-collapse-panel>

                  <a-collapse-panel key="data" header="数据结构">
                    <div
                      v-for="snippet in dataSnippets"
                      :key="snippet.id"
                      class="snippet-item"
                      @click="insertSnippet(snippet)">
                      <div class="snippet-title">{{ snippet.title }}</div>
                      <div class="snippet-desc">{{ snippet.description }}</div>
                    </div>
                  </a-collapse-panel>
                </a-collapse>
              </div>
            </a-tab-pane>

            <!-- AI助手 -->
            <a-tab-pane key="ai" tab="AI助手">
              <div class="sidebar-panel">
                <div class="panel-header">
                  <span>编程助手</span>
                </div>

                <div class="ai-chat">
                  <div class="chat-messages" ref="chatMessages">
                    <div
                      v-for="message in chatMessages"
                      :key="message.id"
                      class="chat-message"
                      :class="{ user: message.type === 'user', ai: message.type === 'ai' }">
                      <div class="message-content">{{ message.content }}</div>
                      <div class="message-time">{{ message.time }}</div>
                    </div>
                  </div>

                  <div class="chat-input">
                    <a-input
                      v-model="chatInput"
                      placeholder="问问AI助手..."
                      @pressEnter="sendChatMessage"
                      :disabled="aiThinking"
                    >
                      <a-button
                        slot="suffix"
                        type="link"
                        icon="send"
                        @click="sendChatMessage"
                        :loading="aiThinking" />
                    </a-input>
                  </div>

                  <div class="quick-questions">
                    <div class="quick-question" @click="askQuickQuestion('如何定义函数？')">
                      如何定义函数？
                    </div>
                    <div class="quick-question" @click="askQuickQuestion('如何读取文件？')">
                      如何读取文件？
                    </div>
                    <div class="quick-question" @click="askQuickQuestion('如何处理异常？')">
                      如何处理异常？
                    </div>
                  </div>
                </div>
              </div>
            </a-tab-pane>

            <!-- 大纲视图 -->
            <a-tab-pane key="outline" tab="大纲">
              <div class="sidebar-panel">
                <div class="panel-header">
                  <span>代码大纲</span>
                  <a-button type="link" size="small" icon="reload" @click="refreshOutline" />
                </div>

                <div class="outline-tree">
                  <div
                    v-for="item in codeOutline"
                    :key="item.key"
                    class="outline-item"
                    :class="item.type"
                    @click="jumpToLine(item.line)">
                    <a-icon :type="getOutlineIcon(item.type)" />
                    <span>{{ item.title }}</span>
                    <span class="line-number">:{{ item.line }}</span>
                  </div>
                </div>
              </div>
            </a-tab-pane>
          </a-tabs>
        </a-layout-sider>

        <a-layout>
          <!-- 编辑器区域 -->
          <a-layout-content class="editor-content">
            <!-- 标签页 -->
            <div class="editor-tabs">
              <a-tabs
                v-model="activeEditorTab"
                type="editable-card"
                @edit="handleTabEdit"
                @change="switchEditorTab"
              >
                <a-tab-pane v-for="file in openFiles" :key="file.path" :tab="file.name">
                  <div class="editor-container" :id="'editor-' + file.id"></div>
                </a-tab-pane>
              </a-tabs>

              <div v-if="openFiles.length === 0" class="welcome-screen">
                <div class="welcome-content">
                  <a-icon type="code" style="font-size: 64px; color: #1890ff;" />
                  <h2>欢迎使用Python编程创作空间</h2>
                  <p>选择一个操作开始编程：</p>
                  <a-space direction="vertical" size="large">
                    <a-button type="primary" size="large" @click="createNewFile">
                      <a-icon type="file-add" />
                      新建文件
                    </a-button>
                    <a-button size="large" @click="showLoadModal = true">
                      <a-icon type="folder-open" />
                      打开文件
                    </a-button>
                    <a-button size="large" @click="loadTemplate">
                      <a-icon type="code" />
                      选择模板
                    </a-button>
                  </a-space>
                </div>
              </div>
            </div>
          </a-layout-content>

          <!-- 底部面板 -->
          <a-layout-footer class="bottom-panel">
            <a-tabs v-model="activeBottomTab" size="small">
              <a-tab-pane key="output" tab="输出">
                <div class="output-panel">
                  <div class="output-toolbar">
                    <a-space>
                      <a-button size="small" icon="clear" @click="clearOutput">
                        清空
                      </a-button>
                      <a-button size="small" icon="copy" @click="copyOutput">
                        复制
                      </a-button>
                      <a-divider type="vertical" />
                      <span class="status-text">
                        状态: {{ running ? '运行中...' : '就绪' }}
                      </span>
                    </a-space>
                  </div>
                  <div class="output-content" ref="outputContent">
                    <pre
                      v-for="(line, index) in outputLines"
                      :key="index"
                      :class="{ error: line.type === 'error', warning: line.type === 'warning' }">{{ line.content }}</pre>
                    <div v-if="outputLines.length === 0" class="empty-output">
                      暂无输出内容
                    </div>
                  </div>
                </div>
              </a-tab-pane>

              <a-tab-pane key="terminal" tab="终端">
                <div class="terminal-panel">
                  <div class="terminal-content" ref="terminalContent">
                    <div v-for="(cmd, index) in terminalHistory" :key="index" class="terminal-line">
                      <span class="terminal-prompt">>>> </span>
                      <span class="terminal-command">{{ cmd.command }}</span>
                      <div v-if="cmd.output" class="terminal-output" v-html="cmd.output"></div>
                    </div>
                  </div>
                  <div class="terminal-input">
                    <span class="terminal-prompt">>>> </span>
                    <input
                      v-model="terminalInput"
                      @keydown.enter="executeTerminalCommand"
                      placeholder="输入Python命令..."
                      class="terminal-input-field"
                    />
                  </div>
                </div>
              </a-tab-pane>

              <a-tab-pane key="problems" tab="问题">
                <div class="problems-panel">
                  <div class="problems-toolbar">
                    <a-space>
                      <a-badge :count="errors.length" :offset="[10, 0]">
                        <a-icon type="close-circle" style="color: #f5222d;" />
                        错误
                      </a-badge>
                      <a-badge :count="warnings.length" :offset="[10, 0]">
                        <a-icon type="warning" style="color: #fa8c16;" />
                        警告
                      </a-badge>
                    </a-space>
                  </div>
                  <div class="problems-content">
                    <div
                      v-for="error in errors"
                      :key="error.id"
                      class="problem-item error"
                      @click="jumpToError(error)">
                      <a-icon type="close-circle" />
                      <span class="problem-message">{{ error.message }}</span>
                      <span class="problem-location">{{ error.file }}:{{ error.line }}</span>
                    </div>
                    <div
                      v-for="warning in warnings"
                      :key="warning.id"
                      class="problem-item warning"
                      @click="jumpToError(warning)">
                      <a-icon type="warning" />
                      <span class="problem-message">{{ warning.message }}</span>
                      <span class="problem-location">{{ warning.file }}:{{ warning.line }}</span>
                    </div>
                  </div>
                </div>
              </a-tab-pane>
            </a-tabs>
          </a-layout-footer>
        </a-layout>
      </a-layout>
    </a-layout>

    <!-- 弹窗组件 -->
    <a-modal
      title="打开文件"
      :visible="showLoadModal"
      @ok="loadSelectedFile"
      @cancel="showLoadModal = false"
      width="600"
    >
      <file-manager ref="fileManager" @file-selected="selectFileToLoad" />
    </a-modal>

    <a-modal
      title="Python编程帮助"
      :visible="showHelpModal"
      @cancel="showHelpModal = false"
      :footer="null"
      width="800"
    >
      <python-help />
    </a-modal>

    <a-modal
      title="编程环境设置"
      :visible="showSettingsModal"
      @ok="saveSettings"
      @cancel="showSettingsModal = false"
    >
      <programming-settings v-model="settings" />
    </a-modal>
  </div>
</template>

<script>
export default {
    name: 'EnhancedPythonWorkspace',
    data () {
        return {
            running: false,
            activeSidebarTab: 'files',
            activeEditorTab: '',
            activeBottomTab: 'output',
            selectedTheme: 'vs',
            showLoadModal: false,
            showHelpModal: false,
            showSettingsModal: false,

            // 编辑器相关
            openFiles: [],
            selectedFiles: [],
            monacoEditors: {},

            // 输出相关
            outputLines: [],
            terminalHistory: [],
            terminalInput: '',

            // 错误和警告
            errors: [],
            warnings: [],

            // AI助手
            chatMessages: [
                {
                    id: 1,
                    type: 'ai',
                    content: '你好！我是Python编程助手，有什么可以帮助你的吗？',
                    time: '刚刚'
                }
            ],
            chatInput: '',
            aiThinking: false,

            // 代码大纲
            codeOutline: [],

            // 设置
            settings: {
                fontSize: 14,
                tabSize: 4,
                wordWrap: true,
                autoSave: true,
                lineNumbers: true,
                minimap: true,
                autoComplete: true
            },

            // 文件树
            fileTree: [
                {
                    title: 'main.py',
                    key: 'main.py',
                    icon: 'file-text',
                    isLeaf: true
                },
                {
                    title: 'utils',
                    key: 'utils',
                    icon: 'folder',
                    children: [
                        {
                            title: 'helpers.py',
                            key: 'utils/helpers.py',
                            icon: 'file-text',
                            isLeaf: true
                        }
                    ]
                }
            ],

            // 代码片段
            basicSnippets: [
                {
                    id: 'print',
                    title: 'print语句',
                    description: '输出文本到控制台',
                    code: 'print("Hello, World!")'
                },
                {
                    id: 'input',
                    title: 'input输入',
                    description: '获取用户输入',
                    code: 'name = input("请输入您的姓名: ")\nprint(f"你好, {name}!")'
                },
                {
                    id: 'variable',
                    title: '变量定义',
                    description: '定义和使用变量',
                    code: '# 定义变量\nname = "Python"\nage = 30\nheight = 1.75\nis_student = True'
                }
            ],

            controlSnippets: [
                {
                    id: 'if',
                    title: 'if条件语句',
                    description: '条件判断',
                    code: 'if condition:\n    # 条件为真时执行\n    pass\nelse:\n    # 条件为假时执行\n    pass'
                },
                {
                    id: 'for',
                    title: 'for循环',
                    description: '遍历序列',
                    code: 'for i in range(10):\n    print(i)'
                },
                {
                    id: 'while',
                    title: 'while循环',
                    description: '条件循环',
                    code: 'while condition:\n    # 循环体\n    pass'
                }
            ],

            functionSnippets: [
                {
                    id: 'function',
                    title: '函数定义',
                    description: '定义函数',
                    code: 'def function_name(parameter):\n    """函数说明"""\n    # 函数体\n    return result'
                },
                {
                    id: 'lambda',
                    title: 'lambda函数',
                    description: '匿名函数',
                    code: 'lambda x: x * 2'
                }
            ],

            dataSnippets: [
                {
                    id: 'list',
                    title: '列表操作',
                    description: '创建和操作列表',
                    code: '# 创建列表\nmy_list = [1, 2, 3, 4, 5]\n\n# 添加元素\nmy_list.append(6)\n\n# 遍历列表\nfor item in my_list:\n    print(item)'
                },
                {
                    id: 'dict',
                    title: '字典操作',
                    description: '创建和操作字典',
                    code: '# 创建字典\nmy_dict = {"name": "Python", "version": "3.9"}\n\n# 访问值\nprint(my_dict["name"])\n\n# 遍历字典\nfor key, value in my_dict.items():\n    print(f"{key}: {value}")'
                }
            ]
        }
    },
    mounted () {
        this.initMonacoEditor()
        this.setupKeyboardShortcuts()
        this.loadDefaultFile()
    },
    methods: {
        initMonacoEditor () {
            // Monaco Editor 初始化逻辑
            // 这里应该集成真实的 Monaco Editor
        },

        setupKeyboardShortcuts () {
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 's') {
                    e.preventDefault()
                    this.saveCode()
                } else if (e.key === 'F5') {
                    e.preventDefault()
                    this.runCode()
                }
            })
        },

        loadDefaultFile () {
            const defaultFile = {
                id: 'default',
                name: 'main.py',
                path: 'main.py',
                content: '# 欢迎使用Python编程创作空间\n# 在这里编写你的Python代码\n\nprint("Hello, Python!")\n'
            }
            this.openFiles.push(defaultFile)
            this.activeEditorTab = defaultFile.path
        },

        createNewFile () {
            const fileName = prompt('请输入文件名:') || 'untitled.py'
            const newFile = {
                id: Date.now().toString(),
                name: fileName,
                path: fileName,
                content: '# 新建Python文件\n\n'
            }
            this.openFiles.push(newFile)
            this.activeEditorTab = newFile.path
        },

        runCode () {
            this.running = true
            this.clearOutput()
            this.addOutput('正在运行Python代码...', 'info')

            // 模拟代码执行
            setTimeout(() => {
                this.addOutput('Hello, Python!', 'output')
                this.addOutput('代码执行完成', 'info')
                this.running = false
            }, 1000)
        },

        stopCode () {
            this.running = false
            this.addOutput('代码执行已停止', 'warning')
        },

        saveCode () {
            const currentFile = this.getCurrentFile()
            if (currentFile) {
                // 保存文件逻辑
                this.$message.success(`文件 ${currentFile.name} 已保存`)
            }
        },

        addOutput (content, type = 'output') {
            this.outputLines.push({
                content,
                type,
                timestamp: new Date().toLocaleTimeString()
            })
            this.$nextTick(() => {
                const outputEl = this.$refs.outputContent
                if (outputEl) {
                    outputEl.scrollTop = outputEl.scrollHeight
                }
            })
        },

        clearOutput () {
            this.outputLines = []
        },

        copyOutput () {
            const text = this.outputLines.map(line => line.content).join('\n')
            navigator.clipboard.writeText(text)
            this.$message.success('输出内容已复制到剪贴板')
        },

        getCurrentFile () {
            return this.openFiles.find(file => file.path === this.activeEditorTab)
        },

        insertSnippet (snippet) {
            const currentFile = this.getCurrentFile()
            if (currentFile) {
                // 在当前光标位置插入代码片段
                this.addOutput(`插入代码片段: ${snippet.title}`, 'info')
            }
        },

        sendChatMessage () {
            if (!this.chatInput.trim()) return

            const userMessage = {
                id: Date.now(),
                type: 'user',
                content: this.chatInput,
                time: new Date().toLocaleTimeString()
            }

            this.chatMessages.push(userMessage)
            const question = this.chatInput
            this.chatInput = ''
            this.aiThinking = true

            // 模拟AI回复
            setTimeout(() => {
                const aiResponse = this.generateAIResponse(question)
                this.chatMessages.push({
                    id: Date.now(),
                    type: 'ai',
                    content: aiResponse,
                    time: new Date().toLocaleTimeString()
                })
                this.aiThinking = false
                this.scrollChatToBottom()
            }, 1500)
        },

        generateAIResponse (question) {
            const responses = {
                '如何定义函数？': '在Python中，使用def关键字定义函数：\n\ndef my_function(parameter):\n    """函数文档"""\n    return result',
                '如何读取文件？': '使用open()函数读取文件：\n\nwith open("filename.txt", "r") as file:\n    content = file.read()\n    print(content)',
                '如何处理异常？': '使用try-except语句处理异常：\n\ntry:\n    # 可能出错的代码\n    result = 10 / 0\nexcept ZeroDivisionError:\n    print("除零错误！")'
            }

            return responses[question] || '我明白你的问题。让我为你提供一些Python编程建议...'
        },

        askQuickQuestion (question) {
            this.chatInput = question
            this.sendChatMessage()
        },

        scrollChatToBottom () {
            this.$nextTick(() => {
                const chatEl = this.$refs.chatMessages
                if (chatEl) {
                    chatEl.scrollTop = chatEl.scrollHeight
                }
            })
        },

        refreshOutline () {
            // 分析当前文件，生成代码大纲
            this.codeOutline = [
                { key: 'func1', title: 'main', type: 'function', line: 5 },
                { key: 'class1', title: 'Calculator', type: 'class', line: 15 },
                { key: 'var1', title: 'global_var', type: 'variable', line: 1 }
            ]
        },

        getOutlineIcon (type) {
            const icons = {
                'function': 'code',
                'class': 'gold',
                'variable': 'container'
            }
            return icons[type] || 'file'
        },

        jumpToLine (line) {
            this.addOutput(`跳转到第 ${line} 行`, 'info')
        },

        executeTerminalCommand () {
            if (!this.terminalInput.trim()) return

            const command = this.terminalInput
            this.terminalHistory.push({
                command,
                output: this.simulateTerminalCommand(command)
            })

            this.terminalInput = ''
            this.$nextTick(() => {
                const terminalEl = this.$refs.terminalContent
                if (terminalEl) {
                    terminalEl.scrollTop = terminalEl.scrollHeight
                }
            })
        },

        simulateTerminalCommand (command) {
            if (command.startsWith('print(')) {
                try {
                    const content = command.match(/print\((.*)\)/)[1]
                    return eval(content) // 简化的评估，实际应该更安全
                } catch (e) {
                    return `错误: ${e.message}`
                }
            }
            return `执行命令: ${command}`
        },

        changeTheme (theme) {
            // 更改编辑器主题
            this.$message.info(`切换到${theme}主题`)
        },

        handleTabEdit (targetKey, action) {
            if (action === 'remove') {
                this.closeFile(targetKey)
            }
        },

        closeFile (filePath) {
            const index = this.openFiles.findIndex(file => file.path === filePath)
            if (index > -1) {
                this.openFiles.splice(index, 1)
                if (this.activeEditorTab === filePath && this.openFiles.length > 0) {
                    this.activeEditorTab = this.openFiles[0].path
                }
            }
        },

        selectFile (selectedKeys) {
            if (selectedKeys.length > 0) {
                const filePath = selectedKeys[0]
                // 打开选中的文件
                this.openFile(filePath)
            }
        },

        openFile (filePath) {
            const existingFile = this.openFiles.find(file => file.path === filePath)
            if (existingFile) {
                this.activeEditorTab = filePath
            } else {
                // 加载新文件
                const newFile = {
                    id: Date.now().toString(),
                    name: filePath.split('/').pop(),
                    path: filePath,
                    content: '# 加载的文件内容\n'
                }
                this.openFiles.push(newFile)
                this.activeEditorTab = filePath
            }
        },

        exportCode () {
            const currentFile = this.getCurrentFile()
            if (currentFile) {
                const blob = new Blob([currentFile.content], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = currentFile.name
                a.click()
                URL.revokeObjectURL(url)
                this.$message.success('文件导出成功')
            }
        },

        shareCode () {
            this.$message.success('代码分享链接已生成')
        },

        saveSettings () {
            localStorage.setItem('pythonWorkspaceSettings', JSON.stringify(this.settings))
            this.$message.success('设置已保存')
            this.showSettingsModal = false
        }
    }
}
</script>

<style scoped>
.enhanced-python-workspace {
  height: 100vh;
  background: #f0f2f5;
}

.toolbar {
  background: #1890ff;
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.sidebar {
  background: white;
  border-right: 1px solid #f0f0f0;
}

.sidebar-panel {
  padding: 12px;
  height: calc(100vh - 150px);
  overflow-y: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 500;
  color: #333;
}

.file-tree {
  font-size: 12px;
}

.snippet-item {
  padding: 8px;
  margin: 4px 0;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.snippet-item:hover {
  border-color: #1890ff;
  background: #e6f7ff;
}

.snippet-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.snippet-desc {
  font-size: 11px;
  color: #666;
}

.ai-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  max-height: 300px;
}

.chat-message {
  margin: 8px 0;
  padding: 8px;
  border-radius: 6px;
}

.chat-message.user {
  background: #e6f7ff;
  margin-left: 20px;
}

.chat-message.ai {
  background: #f6ffed;
  margin-right: 20px;
}

.message-content {
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.message-time {
  font-size: 10px;
  color: #999;
  margin-top: 4px;
}

.chat-input {
  margin: 8px 0;
}

.quick-questions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.quick-question {
  padding: 6px 8px;
  background: #f0f0f0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  transition: background 0.3s;
}

.quick-question:hover {
  background: #e6f7ff;
}

.outline-tree {
  font-size: 12px;
}

.outline-item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  margin: 2px 0;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s;
}

.outline-item:hover {
  background: #f0f0f0;
}

.outline-item .anticon {
  margin-right: 6px;
}

.outline-item.function {
  color: #1890ff;
}

.outline-item.class {
  color: #fa8c16;
}

.outline-item.variable {
  color: #52c41a;
}

.line-number {
  margin-left: auto;
  font-size: 10px;
  color: #999;
}

.editor-content {
  background: white;
}

.editor-tabs {
  height: calc(100vh - 250px);
}

.editor-container {
  height: calc(100vh - 300px);
  border: 1px solid #f0f0f0;
}

.welcome-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #fafafa;
}

.welcome-content {
  text-align: center;
  color: #666;
}

.welcome-content h2 {
  color: #333;
  margin: 16px 0;
}

.bottom-panel {
  background: white;
  border-top: 1px solid #f0f0f0;
  height: 200px;
  padding: 0;
}

.output-panel,
.terminal-panel,
.problems-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.output-toolbar,
.problems-toolbar {
  padding: 8px 16px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.status-text {
  font-size: 12px;
  color: #666;
}

.output-content {
  flex: 1;
  padding: 8px 16px;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.5;
  background: #000;
  color: #fff;
}

.output-content pre {
  margin: 0;
  padding: 2px 0;
}

.output-content pre.error {
  color: #ff4d4f;
}

.output-content pre.warning {
  color: #faad14;
}

.empty-output {
  color: #666;
  font-style: italic;
  text-align: center;
  padding: 40px 0;
}

.terminal-panel {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  background: #000;
  color: #fff;
}

.terminal-content {
  flex: 1;
  padding: 8px 16px;
  overflow-y: auto;
  font-size: 12px;
}

.terminal-line {
  margin: 4px 0;
}

.terminal-prompt {
  color: #52c41a;
}

.terminal-command {
  color: #fff;
}

.terminal-output {
  color: #1890ff;
  margin-left: 20px;
}

.terminal-input {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-top: 1px solid #333;
}

.terminal-input-field {
  flex: 1;
  background: transparent;
  border: none;
  color: #fff;
  font-family: inherit;
  font-size: 12px;
  outline: none;
  margin-left: 4px;
}

.problems-content {
  flex: 1;
  overflow-y: auto;
}

.problem-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  font-size: 12px;
}

.problem-item:hover {
  background: #f0f0f0;
}

.problem-item.error {
  color: #f5222d;
}

.problem-item.warning {
  color: #fa8c16;
}

.problem-item .anticon {
  margin-right: 8px;
}

.problem-message {
  flex: 1;
  margin-right: 8px;
}

.problem-location {
  color: #999;
  font-size: 11px;
}
</style>
