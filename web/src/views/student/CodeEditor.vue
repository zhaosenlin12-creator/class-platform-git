<template>
  <div class="code-editor">
    <a-layout>
      <!-- 工具栏 -->
      <a-layout-header class="editor-header">
        <div class="header-left">
          <a-select v-model="selectedLanguage" @change="changeLanguage" style="width: 120px">
            <a-select-option value="scratch">Scratch</a-select-option>
            <a-select-option value="python">Python</a-select-option>
            <a-select-option value="javascript">JavaScript</a-select-option>
            <a-select-option value="html">HTML</a-select-option>
            <a-select-option value="css">CSS</a-select-option>
            <a-select-option value="java">Java</a-select-option>
            <a-select-option value="cpp">C++</a-select-option>
          </a-select>

          <a-input
            v-model="fileName"
            placeholder="文件名"
            style="width: 200px; margin-left: 12px"
            @blur="saveFileName"
          />

          <a-button-group style="margin-left: 12px">
            <a-button @click="runCode" type="primary" :loading="isRunning">
              <a-icon type="play-circle" />
              运行
            </a-button>
            <a-button @click="debugCode" :disabled="!canDebug">
              <a-icon type="bug" />
              调试
            </a-button>
            <a-button @click="stopExecution" :disabled="!isRunning">
              <a-icon type="stop" />
              停止
            </a-button>
            <a-button @click="saveCode" :loading="isSaving">
              <a-icon type="save" />
              保存
            </a-button>
            <a-button @click="shareCode">
              <a-icon type="share-alt" />
              分享
            </a-button>
            <a-button @click="submitHomework" type="danger" style="margin-left: 12px">
              <a-icon type="upload" />
              提交作业
            </a-button>
          </a-button-group>
        </div>

        <div class="header-right">
          <a-button @click="toggleTheme" style="margin-right: 8px">
            <a-icon :type="isDarkTheme ? 'sun' : 'moon'" />
            {{ isDarkTheme ? '浅色' : '深色' }}
          </a-button>
          <a-button @click="showSettings">
            <a-icon type="setting" />
            设置
          </a-button>
        </div>
      </a-layout-header>

      <a-layout>
        <!-- 侧边栏 - 文件管理 -->
        <a-layout-sider width="250" :theme="isDarkTheme ? 'dark' : 'light'" class="file-sider">
          <div class="file-explorer">
            <div class="file-header">
              <span>文件管理</span>
              <a-button size="small" type="link" @click="createNewFile">
                <a-icon type="plus" />
              </a-button>
            </div>

            <a-tree
              :tree-data="fileTree"
              :selected-keys="selectedFileKeys"
              @select="selectFile"
              :show-icon="true"
            >
              <template #title="{ title, key, type }">
                <span>{{ title }}</span>
                <a-dropdown :trigger="['contextmenu']">
                  <span class="ant-dropdown-link">
                    <a-icon type="more" style="float: right; margin-top: 4px" />
                  </span>
                  <a-menu slot="overlay" @click="handleFileAction($event, key)">
                    <a-menu-item key="rename">重命名</a-menu-item>
                    <a-menu-item key="delete">删除</a-menu-item>
                    <a-menu-item key="duplicate">复制</a-menu-item>
                  </a-menu>
                </a-dropdown>
              </template>
            </a-tree>
          </div>
        </a-layout-sider>

        <a-layout>
          <!-- 代码编辑器 -->
          <a-layout-content class="editor-content">
            <div class="editor-tabs">
              <a-tabs
                v-model="activeTabKey"
                type="editable-card"
                @edit="editTab"
                @change="changeTab"
              >
                <a-tab-pane
                  v-for="tab in openTabs"
                  :key="tab.key"
                  :tab="tab.title"
                  :closable="tab.closable"
                >
                  <!-- Scratch 可视化编程界面 -->
                  <div v-if="tab.language === 'scratch'" class="scratch-editor-container">
                    <div class="scratch-workspace">
                      <div class="scratch-blocks-panel">
                        <div class="blocks-category">
                          <h4>动作</h4>
                          <div class="block-item" @click="addBlock('move', tab.key)">移动10步</div>
                          <div class="block-item" @click="addBlock('turn_right', tab.key)">右转15度</div>
                          <div class="block-item" @click="addBlock('turn_left', tab.key)">左转15度</div>
                          <div class="block-item" @click="addBlock('go_to', tab.key)">移到x:0 y:0</div>
                        </div>
                        <div class="blocks-category">
                          <h4>外观</h4>
                          <div class="block-item" @click="addBlock('say', tab.key)">说"Hello"</div>
                          <div class="block-item" @click="addBlock('think', tab.key)">想"Hmm..."</div>
                          <div class="block-item" @click="addBlock('show', tab.key)">显示</div>
                          <div class="block-item" @click="addBlock('hide', tab.key)">隐藏</div>
                        </div>
                        <div class="blocks-category">
                          <h4>声音</h4>
                          <div class="block-item" @click="addBlock('play_sound', tab.key)">播放声音</div>
                          <div class="block-item" @click="addBlock('stop_sound', tab.key)">停止所有声音</div>
                        </div>
                        <div class="blocks-category">
                          <h4>事件</h4>
                          <div class="block-item event-block" @click="addBlock('when_start', tab.key)">当点击绿旗</div>
                          <div class="block-item event-block" @click="addBlock('when_key', tab.key)">当按下空格键</div>
                          <div class="block-item event-block" @click="addBlock('when_click', tab.key)">当点击角色</div>
                        </div>
                        <div class="blocks-category">
                          <h4>控制</h4>
                          <div class="block-item control-block" @click="addBlock('wait', tab.key)">等待1秒</div>
                          <div class="block-item control-block" @click="addBlock('repeat', tab.key)">重复10次</div>
                          <div class="block-item control-block" @click="addBlock('forever', tab.key)">重复执行</div>
                          <div class="block-item control-block" @click="addBlock('if', tab.key)">如果...那么</div>
                        </div>
                      </div>
                      <div class="scratch-canvas">
                        <div class="canvas-header">
                          <span>程序区</span>
                          <a-button size="small" @click="clearBlocks(tab.key)">清空</a-button>
                        </div>
                        <div class="blocks-workspace" :id="`scratch-workspace-${tab.key}`">
                          <div v-for="(block, index) in tab.scratchBlocks" :key="index"
                               :class="['scratch-block', block.type]"
                               @click="selectBlock(block, index, tab.key)">
                            {{ block.content }}
                            <a-button size="small" type="danger" @click="removeBlock(index, tab.key)" class="remove-block">×</a-button>
                          </div>
                        </div>
                      </div>
                      <div class="scratch-stage">
                        <div class="stage-header">
                          <span>舞台</span>
                          <a-button size="small" @click="toggleStage(tab.key)">{{ tab.stageRunning ? '停止' : '开始' }}</a-button>
                        </div>
                        <div class="stage-canvas" :id="`stage-${tab.key}`">
                          <div class="sprite" :style="getSpriteStyle(tab.sprite)">
                            <div class="sprite-icon">🐱</div>
                            <div v-if="tab.sprite.saying" class="speech-bubble">{{ tab.sprite.saying }}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 传统代码编辑器 -->
                  <div
                    v-else
                    ref="codeEditor"
                    :id="`editor-${tab.key}`"
                    class="code-editor-container"
                    style="height: 500px"
                  ></div>
                </a-tab-pane>
              </a-tabs>
            </div>
          </a-layout-content>

          <!-- 输出面板 -->
          <a-layout-footer class="output-panel" v-if="showOutput">
            <a-tabs v-model="outputTabKey">
              <a-tab-pane key="output" tab="输出">
                <div class="output-content">
                  <pre v-if="output">{{ output }}</pre>
                  <div v-else class="empty-output">点击"运行"按钮执行代码</div>
                </div>
              </a-tab-pane>
              <a-tab-pane key="console" tab="控制台">
                <div class="console-content">
                  <div v-for="(log, index) in consoleLogs" :key="index" :class="['console-line', log.type]">
                    {{ log.message }}
                  </div>
                </div>
              </a-tab-pane>
              <a-tab-pane key="problems" tab="问题">
                <div class="problems-content">
                  <div v-for="(problem, index) in problems" :key="index" :class="['problem-line', problem.severity]">
                    <a-icon :type="problem.severity === 'error' ? 'close-circle' : 'warning'" />
                    {{ problem.message }}
                  </div>
                </div>
              </a-tab-pane>
            </a-tabs>

            <a-button
              class="toggle-output-btn"
              @click="toggleOutput"
              size="small"
            >
              <a-icon :type="showOutput ? 'down' : 'up'" />
            </a-button>
          </a-layout-footer>
        </a-layout>
      </a-layout>
    </a-layout>

    <!-- 设置模态框 -->
    <a-modal
      title="编辑器设置"
      :visible="settingsVisible"
      @cancel="settingsVisible = false"
      @ok="applySettings"
      width="500px"
    >
      <a-form layout="vertical">
        <a-form-item label="字体大小">
          <a-slider v-model="settings.fontSize" :min="12" :max="24" />
          <span>{{ settings.fontSize }}px</span>
        </a-form-item>

        <a-form-item label="Tab 大小">
          <a-radio-group v-model="settings.tabSize">
            <a-radio :value="2">2</a-radio>
            <a-radio :value="4">4</a-radio>
            <a-radio :value="8">8</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="自动保存">
          <a-switch v-model="settings.autoSave" />
        </a-form-item>

        <a-form-item label="显示行号">
          <a-switch v-model="settings.lineNumbers" />
        </a-form-item>

        <a-form-item label="代码折叠">
          <a-switch v-model="settings.codeFolding" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 分享模态框 -->
    <a-modal
      title="分享代码"
      :visible="shareVisible"
      @cancel="shareVisible = false"
      @ok="confirmShare"
      width="400px"
    >
      <a-form layout="vertical">
        <a-form-item label="分享链接">
          <a-input v-model="shareUrl" readonly>
            <a-button slot="addonAfter" @click="copyShareUrl">复制</a-button>
          </a-input>
        </a-form-item>

        <a-form-item label="权限设置">
          <a-radio-group v-model="sharePermission">
            <a-radio value="read">只读</a-radio>
            <a-radio value="edit">可编辑</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="有效期">
          <a-select v-model="shareExpiry">
            <a-select-option value="1h">1小时</a-select-option>
            <a-select-option value="1d">1天</a-select-option>
            <a-select-option value="7d">7天</a-select-option>
            <a-select-option value="30d">30天</a-select-option>
            <a-select-option value="never">永久</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 作业提交模态框 -->
    <a-modal
      title="提交作业"
      :visible="homeworkSubmitVisible"
      @cancel="homeworkSubmitVisible = false"
      @ok="confirmSubmitHomework"
      width="600px"
      :confirmLoading="submittingHomework"
    >
      <a-form layout="vertical">
        <a-form-item label="选择作业">
          <a-select v-model="selectedHomework" placeholder="请选择要提交的作业">
            <a-select-option v-for="hw in availableHomework" :key="hw.id" :value="hw.id">
              {{ hw.title }} (截止: {{ hw.deadline }})
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="提交内容" v-if="selectedHomework">
          <div class="submission-content">
            <div v-if="getCurrentTab().language === 'scratch'">
              <h4>Scratch程序</h4>
              <div class="scratch-preview">
                <div class="blocks-count">
                  已创建 {{ getCurrentTab().scratchBlocks ? getCurrentTab().scratchBlocks.length : 0 }} 个积木块
                </div>
                <div class="preview-blocks">
                  <div v-for="(block, index) in getCurrentTab().scratchBlocks" :key="index"
                       :class="['preview-block', block.type]">
                    {{ block.content }}
                  </div>
                </div>
              </div>
            </div>
            <div v-else>
              <h4>代码文件</h4>
              <pre class="code-preview">{{ getCurrentTab().content || '' }}</pre>
            </div>
          </div>
        </a-form-item>

        <a-form-item label="附加文件">
          <a-upload
            v-model="uploadedFiles"
            :file-list="uploadedFiles"
            :before-upload="beforeUpload"
            @remove="removeFile"
            multiple
          >
            <a-button>
              <a-icon type="upload" />
              上传文件
            </a-button>
          </a-upload>
        </a-form-item>

        <a-form-item label="提交说明">
          <a-textarea
            v-model="submissionDescription"
            placeholder="请简要说明您的作业完成情况、遇到的问题或特别说明..."
            :rows="4"
          />
        </a-form-item>

        <a-form-item label="自我评价">
          <a-rate v-model="selfRating" :count="5" />
          <span style="margin-left: 12px">{{ getRatingText(selfRating) }}</span>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
// 注意：实际使用时需要安装 monaco-editor
// import * as monaco from 'monaco-editor'

export default {
  name: 'CodeEditor',
  data() {
    return {
      selectedLanguage: 'python',
      fileName: 'main.py',
      isDarkTheme: false,
      showOutput: true,
      outputTabKey: 'output',
      activeTabKey: 'tab1',
      selectedFileKeys: ['file1'],
      settingsVisible: false,
      shareVisible: false,
      shareUrl: '',
      sharePermission: 'read',
      shareExpiry: '7d',

      // 作业提交相关
      homeworkSubmitVisible: false,
      submittingHomework: false,
      selectedHomework: null,
      submissionDescription: '',
      selfRating: 0,
      uploadedFiles: [],
      availableHomework: [
        {
          id: '1',
          title: '制作小猫追球游戏',
          deadline: '2024-01-20 23:59',
          type: 'scratch'
        },
        {
          id: '2',
          title: 'Python计算器',
          deadline: '2024-01-25 23:59',
          type: 'python'
        }
      ],

      output: '',
      consoleLogs: [],
      problems: [],
      isRunning: false,
      isSaving: false,
      canDebug: false,
      executionId: null,

      settings: {
        fontSize: 14,
        tabSize: 4,
        autoSave: true,
        lineNumbers: true,
        codeFolding: true
      },

      openTabs: [
        {
          key: 'tab1',
          title: 'main.py',
          closable: false,
          content: '# 欢迎使用在线代码编辑器\nprint("Hello, World!")',
          language: 'python',
          scratchBlocks: [],
          sprite: {
            x: 100,
            y: 100,
            direction: 90,
            saying: '',
            visible: true
          },
          stageRunning: false
        }
      ],

      fileTree: [
        {
          title: 'main.py',
          key: 'file1',
          icon: 'file-text',
          type: 'file'
        },
        {
          title: 'utils.py',
          key: 'file2',
          icon: 'file-text',
          type: 'file'
        },
        {
          title: 'static',
          key: 'folder1',
          icon: 'folder',
          type: 'folder',
          children: [
            {
              title: 'style.css',
              key: 'file3',
              icon: 'file-text',
              type: 'file'
            },
            {
              title: 'script.js',
              key: 'file4',
              icon: 'file-text',
              type: 'file'
            }
          ]
        }
      ],

      editorInstances: {}
    }
  },

  mounted() {
    this.initializeEditor()
  },

  methods: {
    initializeEditor() {
      // 模拟Monaco Editor初始化
      // 实际项目中需要安装monaco-editor并正确初始化
      this.$nextTick(() => {
        this.consoleLogs.push({
          type: 'info',
          message: '编辑器初始化完成'
        })
      })
    },

    changeLanguage(language) {
      this.selectedLanguage = language
      // 更新当前标签页的语言
      const currentTab = this.openTabs.find(tab => tab.key === this.activeTabKey)
      if (currentTab) {
        currentTab.language = language

        // 初始化语言特定的数据结构
        if (language === 'scratch' && !currentTab.scratchBlocks) {
          currentTab.scratchBlocks = []
          currentTab.sprite = {
            x: 100,
            y: 100,
            direction: 90,
            saying: '',
            visible: true
          }
          currentTab.stageRunning = false
        }

        // 更新编辑器语言模式
        this.updateEditorLanguage(language)

        // 启动实时预览
        if (language === 'python' && currentTab.content) {
          this.startPythonLivePreview(currentTab.content)
        }
      }
    },

    updateEditorLanguage(language) {
      // 实际项目中更新Monaco Editor的语言模式
      this.consoleLogs.push({
        type: 'info',
        message: `语言切换到: ${language}`
      })
    },

    async runCode() {
      const currentTab = this.openTabs.find(tab => tab.key === this.activeTabKey)
      if (!currentTab) return

      this.isRunning = true
      this.canDebug = true
      this.executionId = Date.now().toString()

      this.consoleLogs.push({
        type: 'info',
        message: `正在运行 ${currentTab.language} 代码...`,
        timestamp: new Date().toLocaleTimeString()
      })

      try {
        // 增强的代码执行模拟
        if (currentTab.language === 'scratch') {
          await this.executeScratch(currentTab)
        } else if (currentTab.language === 'python') {
          await this.executePython(currentTab.content)
        } else if (currentTab.language === 'javascript') {
          await this.executeJavaScript(currentTab.content)
        } else if (currentTab.language === 'html') {
          await this.executeHTML(currentTab.content)
        } else {
          await this.executeGeneral(currentTab.content, currentTab.language)
        }

        this.consoleLogs.push({
          type: 'success',
          message: '代码执行成功',
          timestamp: new Date().toLocaleTimeString()
        })
      } catch (error) {
        this.consoleLogs.push({
          type: 'error',
          message: `执行错误: ${error.message}`,
          timestamp: new Date().toLocaleTimeString()
        })
      } finally {
        this.isRunning = false
      }
    },

    async executePython(code) {
      return new Promise((resolve, reject) => {
        // 启动实时预览
        this.startPythonLivePreview(code)

        setTimeout(async () => {
          try {
            // 代码分析和执行
            const result = await this.analyzePythonCode(code)

            // 执行代码
            const output = await this.runPythonCode(code)

            // 更新输出
            this.output = output

            // 生成评测报告
            await this.generatePythonEvaluationReport(code, result, output)

            resolve()
          } catch (error) {
            this.output = `执行错误: ${error.message}`
            reject(error)
          }
        }, Math.random() * 2000 + 1000)
      })
    },

    // Python代码分析
    async analyzePythonCode(code) {
      const analysis = {
        lines: code.split('\n').filter(line => line.trim()).length,
        functions: [],
        variables: [],
        imports: [],
        syntax_errors: [],
        complexity: 1,
        style_issues: []
      }

      // 分析函数定义
      const funcMatches = code.match(/def\s+(\w+)\s*\([^)]*\):/g)
      if (funcMatches) {
        analysis.functions = funcMatches.map(match => {
          const name = match.match(/def\s+(\w+)/)[1]
          return { name, line: this.findLineNumber(code, match) }
        })
      }

      // 分析变量
      const varMatches = code.match(/^\s*(\w+)\s*=/gm)
      if (varMatches) {
        analysis.variables = [...new Set(varMatches.map(match => match.match(/(\w+)\s*=/)[1]))]
      }

      // 分析导入
      const importMatches = code.match(/^import\s+\w+|^from\s+\w+\s+import/gm)
      if (importMatches) {
        analysis.imports = importMatches
      }

      // 语法检查
      analysis.syntax_errors = this.checkPythonSyntax(code)

      // 复杂度分析
      analysis.complexity = this.calculateComplexity(code)

      // 代码风格检查
      analysis.style_issues = this.checkPythonStyle(code)

      return analysis
    },

    // 运行Python代码
    async runPythonCode(code) {
      const outputs = []
      const errors = []

      try {
        // 模拟Python执行环境
        const pythonEnv = this.createPythonEnvironment()

        // 处理print语句
        const printMatches = code.match(/print\([^)]+\)/g)
        if (printMatches) {
          printMatches.forEach(printStmt => {
            try {
              const content = this.evaluatePrintStatement(printStmt, pythonEnv)
              outputs.push(content)
            } catch (error) {
              errors.push(`Print错误: ${error.message}`)
            }
          })
        }

        // 处理变量赋值和计算
        const calculations = this.evaluatePythonExpressions(code, pythonEnv)
        outputs.push(...calculations)

        // 处理循环和条件语句
        const controlFlow = this.evaluateControlFlow(code, pythonEnv)
        outputs.push(...controlFlow)

        // 处理函数调用
        const functionCalls = this.evaluateFunctionCalls(code, pythonEnv)
        outputs.push(...functionCalls)

      } catch (error) {
        errors.push(`运行时错误: ${error.message}`)
      }

      // 合并输出和错误
      let result = outputs.join('\n')
      if (errors.length > 0) {
        result += '\n' + errors.join('\n')
      }

      return result || '代码执行完成'
    },

    // 创建Python执行环境
    createPythonEnvironment() {
      return {
        variables: {},
        functions: {},
        builtins: {
          len: (obj) => obj.length,
          str: (obj) => String(obj),
          int: (obj) => parseInt(obj),
          float: (obj) => parseFloat(obj),
          type: (obj) => typeof obj,
          range: (start, end) => {
            const result = []
            for (let i = start; i < (end || start); i++) {
              result.push(end ? i : i - start)
            }
            return result
          }
        }
      }
    },

    // 评估print语句
    evaluatePrintStatement(printStmt, env) {
      // 简化的print语句解析
      const content = printStmt.match(/print\((.+)\)/)[1]

      // 处理字符串字面量
      if (content.match(/^["'].*["']$/)) {
        return content.slice(1, -1)
      }

      // 处理变量
      if (env.variables[content]) {
        return env.variables[content]
      }

      // 处理简单表达式
      try {
        const result = this.evaluateSimpleExpression(content, env)
        return String(result)
      } catch {
        return content
      }
    },

    // 评估Python表达式
    evaluatePythonExpressions(code, env) {
      const outputs = []
      const lines = code.split('\n')

      lines.forEach(line => {
        line = line.trim()

        // 变量赋值
        const assignMatch = line.match(/^(\w+)\s*=\s*(.+)$/)
        if (assignMatch) {
          const [, varName, expression] = assignMatch
          try {
            const value = this.evaluateSimpleExpression(expression, env)
            env.variables[varName] = value
            outputs.push(`${varName} = ${value}`)
          } catch (error) {
            outputs.push(`赋值错误: ${line}`)
          }
        }
      })

      return outputs
    },

    // 评估控制流
    evaluateControlFlow(code, env) {
      const outputs = []

      // 简单的for循环处理
      const forMatches = code.match(/for\s+\w+\s+in\s+range\(\d+\):/g)
      if (forMatches) {
        forMatches.forEach(forStmt => {
          const rangeMatch = forStmt.match(/range\((\d+)\)/)
          if (rangeMatch) {
            const count = parseInt(rangeMatch[1])
            outputs.push(`循环将执行 ${count} 次`)
          }
        })
      }

      // 简单的if语句处理
      const ifMatches = code.match(/if\s+.+:/g)
      if (ifMatches) {
        outputs.push(`检测到 ${ifMatches.length} 个条件判断`)
      }

      return outputs
    },

    // 评估函数调用
    evaluateFunctionCalls(code, env) {
      const outputs = []

      // 检测函数定义
      const funcDefs = code.match(/def\s+(\w+)\s*\([^)]*\):/g)
      if (funcDefs) {
        funcDefs.forEach(funcDef => {
          const name = funcDef.match(/def\s+(\w+)/)[1]
          outputs.push(`定义函数: ${name}`)
        })
      }

      return outputs
    },

    // 简单表达式计算
    evaluateSimpleExpression(expr, env) {
      expr = expr.trim()

      // 数字
      if (/^\d+$/.test(expr)) {
        return parseInt(expr)
      }

      // 浮点数
      if (/^\d+\.\d+$/.test(expr)) {
        return parseFloat(expr)
      }

      // 字符串
      if (/^["'].*["']$/.test(expr)) {
        return expr.slice(1, -1)
      }

      // 变量
      if (env.variables[expr]) {
        return env.variables[expr]
      }

      // 简单算术运算
      if (/^\d+\s*[+\-*/]\s*\d+$/.test(expr)) {
        return eval(expr) // 仅用于简单算术，实际项目中需要更安全的实现
      }

      return expr
    },

    // 语法检查
    checkPythonSyntax(code) {
      const errors = []
      const lines = code.split('\n')

      lines.forEach((line, index) => {
        const lineNum = index + 1
        line = line.trim()

        // 检查缩进
        if (line.length > 0 && !line.startsWith('#')) {
          const originalLine = lines[index]
          const leadingSpaces = originalLine.length - originalLine.trimLeft().length

          if (line.endsWith(':') && leadingSpaces % 4 !== 0) {
            errors.push({
              line: lineNum,
              message: '缩进不是4的倍数',
              type: 'IndentationError'
            })
          }
        }

        // 检查语法结构
        if (line.includes('def ') && !line.endsWith(':')) {
          errors.push({
            line: lineNum,
            message: '函数定义缺少冒号',
            type: 'SyntaxError'
          })
        }

        if ((line.includes('if ') || line.includes('for ') || line.includes('while ')) && !line.endsWith(':')) {
          errors.push({
            line: lineNum,
            message: '控制语句缺少冒号',
            type: 'SyntaxError'
          })
        }
      })

      return errors
    },

    // 代码风格检查
    checkPythonStyle(code) {
      const issues = []
      const lines = code.split('\n')

      lines.forEach((line, index) => {
        const lineNum = index + 1

        // 行长度检查
        if (line.length > 79) {
          issues.push({
            line: lineNum,
            message: '行长度超过79字符',
            type: 'style',
            severity: 'warning'
          })
        }

        // 空格使用检查
        if (line.includes('\t')) {
          issues.push({
            line: lineNum,
            message: '建议使用空格而不是制表符',
            type: 'style',
            severity: 'info'
          })
        }

        // 变量命名检查
        const varMatches = line.match(/^\s*([A-Z_]+)\s*=/g)
        if (varMatches) {
          issues.push({
            line: lineNum,
            message: '变量名建议使用小写字母和下划线',
            type: 'style',
            severity: 'info'
          })
        }
      })

      return issues
    },

    // 计算代码复杂度
    calculateComplexity(code) {
      let complexity = 1

      // 条件语句增加复杂度
      const ifCount = (code.match(/if\s+/g) || []).length
      const elifCount = (code.match(/elif\s+/g) || []).length
      const whileCount = (code.match(/while\s+/g) || []).length
      const forCount = (code.match(/for\s+/g) || []).length

      complexity += ifCount + elifCount + whileCount + forCount

      // 异常处理
      const tryCount = (code.match(/try:/g) || []).length
      const exceptCount = (code.match(/except/g) || []).length

      complexity += tryCount + exceptCount

      return complexity
    },

    // 查找行号
    findLineNumber(code, searchText) {
      const lines = code.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(searchText.split(' ')[1])) {
          return i + 1
        }
      }
      return 1
    },

    // 启动实时预览
    startPythonLivePreview(code) {
      // 清除之前的预览
      this.clearLivePreview()

      // 实时语法检查
      const syntaxErrors = this.checkPythonSyntax(code)
      if (syntaxErrors.length > 0) {
        this.problems = syntaxErrors.map(error => ({
          severity: 'error',
          message: `第${error.line}行: ${error.message}`
        }))
      } else {
        this.problems = []
      }

      // 实时风格检查
      const styleIssues = this.checkPythonStyle(code)
      this.problems.push(...styleIssues.map(issue => ({
        severity: issue.severity,
        message: `第${issue.line}行: ${issue.message}`
      })))

      // 显示代码分析信息
      this.consoleLogs.push({
        type: 'info',
        message: `代码分析完成 - 行数: ${code.split('\n').length}, 复杂度: ${this.calculateComplexity(code)}`
      })
    },

    // 清除实时预览
    clearLivePreview() {
      this.problems = []
    },

    // 生成评测报告
    async generatePythonEvaluationReport(code, analysis, output) {
      const report = {
        timestamp: new Date().toLocaleString(),
        code_quality: this.assessCodeQuality(analysis),
        performance: this.assessPerformance(analysis),
        best_practices: this.assessBestPractices(analysis),
        suggestions: this.generateSuggestions(analysis),
        score: this.calculateScore(analysis)
      }

      // 输出评测报告到控制台
      this.consoleLogs.push({
        type: 'success',
        message: `📊 代码评测完成`,
        timestamp: new Date().toLocaleTimeString()
      })

      this.consoleLogs.push({
        type: 'info',
        message: `💯 代码质量评分: ${report.score}/100`,
        timestamp: new Date().toLocaleTimeString()
      })

      this.consoleLogs.push({
        type: 'info',
        message: `🎯 复杂度: ${analysis.complexity} | 函数: ${analysis.functions.length} | 变量: ${analysis.variables.length}`,
        timestamp: new Date().toLocaleTimeString()
      })

      if (report.suggestions.length > 0) {
        this.consoleLogs.push({
          type: 'warning',
          message: `💡 改进建议: ${report.suggestions.slice(0, 2).join(', ')}`,
          timestamp: new Date().toLocaleTimeString()
        })
      }

      return report
    },

    // 评估代码质量
    assessCodeQuality(analysis) {
      let score = 100

      // 语法错误扣分
      score -= analysis.syntax_errors.length * 20

      // 风格问题扣分
      score -= analysis.style_issues.filter(i => i.severity === 'warning').length * 5

      // 复杂度过高扣分
      if (analysis.complexity > 10) {
        score -= (analysis.complexity - 10) * 5
      }

      return Math.max(0, score)
    },

    // 评估性能
    assessPerformance(analysis) {
      let score = 100

      // 基于复杂度评估
      if (analysis.complexity > 15) {
        score -= 30
      } else if (analysis.complexity > 10) {
        score -= 15
      }

      // 基于行数评估
      if (analysis.lines > 100) {
        score -= 20
      }

      return Math.max(0, score)
    },

    // 评估最佳实践
    assessBestPractices(analysis) {
      let score = 100

      // 函数使用
      if (analysis.lines > 20 && analysis.functions.length === 0) {
        score -= 20
      }

      // 变量命名
      const badVarNames = analysis.variables.filter(v => v.length < 2 || /^[A-Z_]+$/.test(v))
      score -= badVarNames.length * 10

      return Math.max(0, score)
    },

    // 生成改进建议
    generateSuggestions(analysis) {
      const suggestions = []

      if (analysis.syntax_errors.length > 0) {
        suggestions.push('修复语法错误')
      }

      if (analysis.complexity > 10) {
        suggestions.push('考虑拆分复杂的函数')
      }

      if (analysis.lines > 20 && analysis.functions.length === 0) {
        suggestions.push('将代码组织成函数')
      }

      if (analysis.style_issues.length > 5) {
        suggestions.push('改进代码风格')
      }

      return suggestions
    },

    // 计算总分
    calculateScore(analysis) {
      const qualityScore = this.assessCodeQuality(analysis)
      const performanceScore = this.assessPerformance(analysis)
      const practicesScore = this.assessBestPractices(analysis)

      return Math.round((qualityScore * 0.4 + performanceScore * 0.3 + practicesScore * 0.3))
    },

    // 执行Scratch程序
    async executeScratch(tab) {
      if (!tab.scratchBlocks || tab.scratchBlocks.length === 0) {
        this.output = 'Scratch程序区为空，请添加积木块'
        return
      }

      this.output = `正在运行Scratch程序...\n包含${tab.scratchBlocks.length}个积木块`

      // 自动运行Scratch程序
      tab.stageRunning = true
      await this.runScratchProgram(tab)

      // 生成Scratch评测报告
      await this.generateScratchEvaluationReport(tab)
    },

    // 生成Scratch评测报告
    async generateScratchEvaluationReport(tab) {
      const blocks = tab.scratchBlocks || []
      const analysis = {
        totalBlocks: blocks.length,
        blockTypes: {},
        hasEvents: false,
        hasMotion: false,
        hasControl: false,
        hasLogic: false,
        complexity: 1
      }

      // 分析积木类型
      blocks.forEach(block => {
        if (!analysis.blockTypes[block.type]) {
          analysis.blockTypes[block.type] = 0
        }
        analysis.blockTypes[block.type]++

        // 检查程序结构
        if (block.type === 'event') analysis.hasEvents = true
        if (block.type === 'motion') analysis.hasMotion = true
        if (block.type === 'control') analysis.hasControl = true
      })

      // 计算复杂度
      analysis.complexity = Math.min(10, Math.floor(blocks.length / 3) + 1)

      // 评估程序质量
      let score = 50 // 基础分

      if (analysis.hasEvents) score += 20
      if (analysis.hasMotion) score += 15
      if (analysis.hasControl) score += 15
      if (blocks.length >= 5) score += 10
      if (blocks.length >= 10) score += 10

      score = Math.min(100, score)

      // 输出评测报告
      this.consoleLogs.push({
        type: 'success',
        message: `🎨 Scratch程序评测完成`,
        timestamp: new Date().toLocaleTimeString()
      })

      this.consoleLogs.push({
        type: 'info',
        message: `💯 程序质量评分: ${score}/100`,
        timestamp: new Date().toLocaleTimeString()
      })

      this.consoleLogs.push({
        type: 'info',
        message: `🧩 积木数量: ${analysis.totalBlocks} | 复杂度: ${analysis.complexity}`,
        timestamp: new Date().toLocaleTimeString()
      })

      // 生成建议
      const suggestions = []
      if (!analysis.hasEvents) suggestions.push('添加事件积木作为程序入口')
      if (!analysis.hasMotion) suggestions.push('添加动作积木让角色动起来')
      if (!analysis.hasControl) suggestions.push('使用控制积木增加逻辑')
      if (blocks.length < 5) suggestions.push('增加更多积木丰富程序功能')

      if (suggestions.length > 0) {
        this.consoleLogs.push({
          type: 'warning',
          message: `💡 改进建议: ${suggestions.slice(0, 2).join(', ')}`,
          timestamp: new Date().toLocaleTimeString()
        })
      }

      return { analysis, score, suggestions }
    },

    async executeJavaScript(code) {
      return new Promise((resolve) => {
        setTimeout(() => {
          try {
            // 安全的JavaScript执行环境
            const logs = []
            const mockConsole = {
              log: (...args) => logs.push(args.join(' ')),
              error: (...args) => logs.push('Error: ' + args.join(' ')),
              warn: (...args) => logs.push('Warning: ' + args.join(' '))
            }

            // 模拟执行
            if (code.includes('console.log')) {
              const matches = code.match(/console\.log\((.+?)\)/g)
              if (matches) {
                matches.forEach(match => {
                  const content = match.match(/console\.log\((.+?)\)/)[1]
                  logs.push(content.replace(/['"]/g, ''))
                })
              }
            }

            this.output = logs.length > 0 ? logs.join('\n') : '代码执行完成'
            resolve()
          } catch (error) {
            throw new Error('JavaScript执行错误: ' + error.message)
          }
        }, Math.random() * 1500 + 800)
      })
    },

    async executeHTML(code) {
      return new Promise((resolve) => {
        setTimeout(() => {
          this.output = 'HTML页面已渲染\n可在预览窗口查看结果'
          resolve()
        }, 500)
      })
    },

    async executeGeneral(code, language) {
      return new Promise((resolve) => {
        setTimeout(() => {
          this.output = `${language} 代码执行完成\n共 ${code.split('\n').length} 行代码`
          resolve()
        }, Math.random() * 2000 + 1000)
      })
    },

    debugCode() {
      if (!this.canDebug) return

      this.$message.info('调试功能启动中...')
      this.consoleLogs.push({
        type: 'info',
        message: '进入调试模式',
        timestamp: new Date().toLocaleTimeString()
      })

      // 模拟调试断点
      setTimeout(() => {
        this.consoleLogs.push({
          type: 'warning',
          message: '在第5行设置断点',
          timestamp: new Date().toLocaleTimeString()
        })
      }, 1000)
    },

    stopExecution() {
      if (!this.isRunning) return

      this.isRunning = false
      this.canDebug = false
      this.executionId = null

      this.consoleLogs.push({
        type: 'warning',
        message: '代码执行已停止',
        timestamp: new Date().toLocaleTimeString()
      })

      this.$message.warning('代码执行已停止')
    },

    async saveCode() {
      this.isSaving = true

      try {
        // 模拟保存过程
        await new Promise(resolve => setTimeout(resolve, 1000))

        this.$message.success('代码已保存')
        this.consoleLogs.push({
          type: 'info',
          message: '文件已保存',
          timestamp: new Date().toLocaleTimeString()
        })
      } catch (error) {
        this.$message.error('保存失败: ' + error.message)
        this.consoleLogs.push({
          type: 'error',
          message: '保存失败: ' + error.message,
          timestamp: new Date().toLocaleTimeString()
        })
      } finally {
        this.isSaving = false
      }
    },

    shareCode() {
      this.shareUrl = `https://code.example.com/share/${Math.random().toString(36).substr(2, 9)}`
      this.shareVisible = true
    },

    confirmShare() {
      this.$message.success('分享链接已生成')
      this.shareVisible = false
    },

    copyShareUrl() {
      // 复制到剪贴板
      navigator.clipboard.writeText(this.shareUrl).then(() => {
        this.$message.success('链接已复制到剪贴板')
      })
    },

    toggleTheme() {
      this.isDarkTheme = !this.isDarkTheme
      // 实际项目中切换Monaco Editor主题
      this.consoleLogs.push({
        type: 'info',
        message: `主题切换到: ${this.isDarkTheme ? '深色' : '浅色'}`
      })
    },

    showSettings() {
      this.settingsVisible = true
    },

    applySettings() {
      this.$message.success('设置已应用')
      this.settingsVisible = false
      // 实际项目中应用设置到Monaco Editor
    },

    toggleOutput() {
      this.showOutput = !this.showOutput
    },

    createNewFile() {
      const newFileKey = `file${Date.now()}`
      const newTabKey = `tab${Date.now()}`

      this.fileTree.push({
        title: 'untitled.py',
        key: newFileKey,
        icon: 'file-text',
        type: 'file'
      })

      this.openTabs.push({
        key: newTabKey,
        title: 'untitled.py',
        closable: true,
        content: '',
        language: this.selectedLanguage
      })

      this.activeTabKey = newTabKey
    },

    selectFile(selectedKeys, e) {
      if (selectedKeys.length > 0) {
        const fileKey = selectedKeys[0]
        const file = this.findFileInTree(this.fileTree, fileKey)

        if (file && file.type === 'file') {
          // 检查是否已经打开
          const existingTab = this.openTabs.find(tab => tab.title === file.title)
          if (existingTab) {
            this.activeTabKey = existingTab.key
          } else {
            // 创建新标签页
            const newTabKey = `tab${Date.now()}`
            this.openTabs.push({
              key: newTabKey,
              title: file.title,
              closable: true,
              content: this.getFileContent(file.title),
              language: this.getLanguageFromFileName(file.title)
            })
            this.activeTabKey = newTabKey
          }
        }
      }
    },

    findFileInTree(tree, key) {
      for (const item of tree) {
        if (item.key === key) {
          return item
        }
        if (item.children) {
          const found = this.findFileInTree(item.children, key)
          if (found) return found
        }
      }
      return null
    },

    getFileContent(fileName) {
      // 模拟文件内容
      const contents = {
        'main.py': '# 主程序文件\nprint("Hello, World!")',
        'utils.py': '# 工具函数文件\ndef helper():\n    pass',
        'style.css': '/* CSS样式文件 */\nbody {\n    margin: 0;\n    padding: 0;\n}',
        'script.js': '// JavaScript文件\n'
      }
      return contents[fileName] || ''
    },

    getLanguageFromFileName(fileName) {
      const ext = fileName.split('.').pop()
      const languageMap = {
        'py': 'python',
        'js': 'javascript',
        'css': 'css',
        'html': 'html',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'cpp'
      }
      return languageMap[ext] || 'text'
    },

    editTab(targetKey, action) {
      if (action === 'remove') {
        this.removeTab(targetKey)
      }
    },

    removeTab(targetKey) {
      let lastIndex = 0
      this.openTabs.forEach((tab, i) => {
        if (tab.key === targetKey) {
          lastIndex = i - 1
        }
      })

      this.openTabs = this.openTabs.filter(tab => tab.key !== targetKey)

      if (this.openTabs.length && this.activeTabKey === targetKey) {
        if (lastIndex >= 0) {
          this.activeTabKey = this.openTabs[lastIndex].key
        } else {
          this.activeTabKey = this.openTabs[0].key
        }
      }
    },

    changeTab(activeKey) {
      this.activeTabKey = activeKey
    },

    handleFileAction(e, fileKey) {
      const action = e.key
      const file = this.findFileInTree(this.fileTree, fileKey)

      if (action === 'rename') {
        this.$message.info(`重命名文件: ${file.title}`)
      } else if (action === 'delete') {
        this.$message.info(`删除文件: ${file.title}`)
      } else if (action === 'duplicate') {
        this.$message.info(`复制文件: ${file.title}`)
      }
    },

    saveFileName() {
      // 保存文件名更改
      this.$message.success('文件名已更新')
    },

    // Scratch 相关方法
    addBlock(blockType, tabKey) {
      const tab = this.openTabs.find(t => t.key === tabKey)
      if (!tab) return

      if (!tab.scratchBlocks) {
        tab.scratchBlocks = []
      }

      const blockTemplates = {
        move: { type: 'motion', content: '移动 10 步' },
        turn_right: { type: 'motion', content: '右转 15 度' },
        turn_left: { type: 'motion', content: '左转 15 度' },
        go_to: { type: 'motion', content: '移到 x:0 y:0' },
        say: { type: 'looks', content: '说 "Hello" 2 秒' },
        think: { type: 'looks', content: '想 "Hmm..." 2 秒' },
        show: { type: 'looks', content: '显示' },
        hide: { type: 'looks', content: '隐藏' },
        play_sound: { type: 'sound', content: '播放声音 "pop"' },
        stop_sound: { type: 'sound', content: '停止所有声音' },
        when_start: { type: 'event', content: '当点击绿旗时' },
        when_key: { type: 'event', content: '当按下 空格键 时' },
        when_click: { type: 'event', content: '当点击角色时' },
        wait: { type: 'control', content: '等待 1 秒' },
        repeat: { type: 'control', content: '重复 10 次' },
        forever: { type: 'control', content: '重复执行' },
        if: { type: 'control', content: '如果...那么' }
      }

      const block = blockTemplates[blockType]
      if (block) {
        tab.scratchBlocks.push({
          ...block,
          id: Date.now(),
          timestamp: new Date()
        })
        this.$message.success(`添加了积木: ${block.content}`)
      }
    },

    removeBlock(index, tabKey) {
      const tab = this.openTabs.find(t => t.key === tabKey)
      if (tab && tab.scratchBlocks) {
        tab.scratchBlocks.splice(index, 1)
        this.$message.info('积木已删除')
      }
    },

    clearBlocks(tabKey) {
      const tab = this.openTabs.find(t => t.key === tabKey)
      if (tab) {
        tab.scratchBlocks = []
        this.$message.info('程序区已清空')
      }
    },

    selectBlock(block, index, tabKey) {
      this.$message.info(`选中积木: ${block.content}`)
      // 这里可以添加选中积木的处理逻辑
    },

    toggleStage(tabKey) {
      const tab = this.openTabs.find(t => t.key === tabKey)
      if (!tab) return

      tab.stageRunning = !tab.stageRunning

      if (tab.stageRunning) {
        this.runScratchProgram(tab)
        this.$message.success('Scratch程序开始运行')
      } else {
        this.$message.info('Scratch程序已停止')
      }
    },

    async runScratchProgram(tab) {
      if (!tab.scratchBlocks || tab.scratchBlocks.length === 0) {
        this.$message.warning('程序区为空，请添加积木块')
        return
      }

      // 模拟执行Scratch程序
      for (const block of tab.scratchBlocks) {
        if (!tab.stageRunning) break

        await this.executeBlock(block, tab)
        await this.delay(500) // 每个积木间隔0.5秒
      }
    },

    async executeBlock(block, tab) {
      switch (block.type) {
        case 'motion':
          if (block.content.includes('移动')) {
            const steps = parseInt(block.content.match(/\d+/)) || 10
            tab.sprite.x += steps * Math.cos(tab.sprite.direction * Math.PI / 180)
            tab.sprite.y += steps * Math.sin(tab.sprite.direction * Math.PI / 180)
          } else if (block.content.includes('右转')) {
            const degrees = parseInt(block.content.match(/\d+/)) || 15
            tab.sprite.direction += degrees
          } else if (block.content.includes('左转')) {
            const degrees = parseInt(block.content.match(/\d+/)) || 15
            tab.sprite.direction -= degrees
          }
          break
        case 'looks':
          if (block.content.includes('说')) {
            const text = block.content.match(/"([^"]+)"/)
            tab.sprite.saying = text ? text[1] : 'Hello'
            setTimeout(() => { tab.sprite.saying = '' }, 2000)
          }
          break
        case 'control':
          if (block.content.includes('等待')) {
            const seconds = parseInt(block.content.match(/\d+/)) || 1
            await this.delay(seconds * 1000)
          }
          break
      }
    },

    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    },

    getSpriteStyle(sprite) {
      return {
        transform: `translate(${sprite.x}px, ${sprite.y}px) rotate(${sprite.direction}deg)`,
        visibility: sprite.visible ? 'visible' : 'hidden'
      }
    },

    // 作业提交相关方法
    submitHomework() {
      this.homeworkSubmitVisible = true
      this.loadAvailableHomework()
    },

    async loadAvailableHomework() {
      try {
        // 模拟API调用获取可用作业
        this.consoleLogs.push({
          type: 'info',
          message: '正在加载可提交的作业...'
        })

        // 实际项目中应该调用API
        // const response = await getAction('/student/homework/available')
        // this.availableHomework = response.data.result

      } catch (error) {
        this.$message.error('加载作业列表失败')
      }
    },

    getCurrentTab() {
      return this.openTabs.find(tab => tab.key === this.activeTabKey) || {}
    },

    beforeUpload(file) {
      const allowedTypes = ['zip', 'rar', '7z', 'txt', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'py', 'js', 'html', 'css', 'json', 'sb3', 'sb2', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'mp3', 'wav']
      const isValidType = allowedTypes.some(type =>
        file.name.toLowerCase().endsWith('.' + type)
      )
      if (!isValidType) {
        this.$message.error('不支持该文件类型，请上传文档、代码、图片、音视频或压缩包')
        return false
      }
      const maxSize = 100 * 1024 * 1024 // 100MB
      if (file.size > maxSize) {
        this.$message.error('文件大小超过限制（最大100MB），请压缩文件后重新上传')
        return false
      }
      return false // 阻止自动上传
    },

    removeFile(file) {
      this.uploadedFiles = this.uploadedFiles.filter(f => f.uid !== file.uid)
    },

    getRatingText(rating) {
      const texts = ['', '需要改进', '基本完成', '较好完成', '很好完成', '完美完成']
      return texts[rating] || ''
    },

    async confirmSubmitHomework() {
      if (!this.selectedHomework) {
        this.$message.error('请选择要提交的作业')
        return
      }

      this.submittingHomework = true

      try {
        const currentTab = this.getCurrentTab()
        const submissionData = {
          homeworkId: this.selectedHomework,
          language: currentTab.language,
          content: currentTab.content || '',
          scratchBlocks: currentTab.scratchBlocks || [],
          files: this.uploadedFiles,
          description: this.submissionDescription,
          selfRating: this.selfRating,
          submitTime: new Date().toISOString()
        }

        // 模拟API调用
        await this.delay(2000)

        // 实际项目中调用提交API
        // const response = await postAction('/student/homework/submit', submissionData)

        this.$message.success('作业提交成功！')
        this.homeworkSubmitVisible = false
        this.resetSubmissionForm()

        this.consoleLogs.push({
          type: 'success',
          message: '作业已成功提交'
        })

      } catch (error) {
        this.$message.error('作业提交失败，请重试')
        console.error('作业提交失败:', error)
      } finally {
        this.submittingHomework = false
      }
    },

    resetSubmissionForm() {
      this.selectedHomework = null
      this.submissionDescription = ''
      this.selfRating = 0
      this.uploadedFiles = []
    },

    // 代码实时预览相关方法
    startRealTimePreview() {
      // 启动实时预览定时器
      if (this.previewTimer) {
        clearInterval(this.previewTimer)
      }

      this.previewTimer = setInterval(() => {
        const currentTab = this.openTabs.find(tab => tab.key === this.activeTabKey)
        if (currentTab && currentTab.language === 'python' && currentTab.content) {
          this.startPythonLivePreview(currentTab.content)
        }
      }, 3000) // 每3秒检查一次代码变化
    },

    stopRealTimePreview() {
      if (this.previewTimer) {
        clearInterval(this.previewTimer)
        this.previewTimer = null
      }
    },

    // 代码变化时触发
    onCodeChange(newContent) {
      const currentTab = this.openTabs.find(tab => tab.key === this.activeTabKey)
      if (currentTab) {
        currentTab.content = newContent

        // 如果是Python代码，启动实时预览
        if (currentTab.language === 'python') {
          // 防抖处理，避免频繁分析
          if (this.previewDebounce) {
            clearTimeout(this.previewDebounce)
          }

          this.previewDebounce = setTimeout(() => {
            this.startPythonLivePreview(newContent)
          }, 1500) // 1.5秒后执行分析
        }
      }
    },

    // 增强的保存功能
    async saveCode() {
      const currentTab = this.openTabs.find(tab => tab.key === this.activeTabKey)
      if (!currentTab) return

      this.isSaving = true

      try {
        // 保存代码
        const saveData = {
          tabKey: currentTab.key,
          language: currentTab.language,
          content: currentTab.content,
          scratchBlocks: currentTab.scratchBlocks || [],
          sprite: currentTab.sprite || {},
          timestamp: new Date().toISOString()
        }

        // 模拟保存API调用
        await this.delay(800)

        // 保存到本地存储
        const savedFiles = JSON.parse(localStorage.getItem('codeeditor_files') || '{}')
        savedFiles[currentTab.key] = saveData
        localStorage.setItem('codeeditor_files', JSON.stringify(savedFiles))

        this.$message.success('代码保存成功')

        this.consoleLogs.push({
          type: 'success',
          message: `💾 ${currentTab.language}代码已保存`,
          timestamp: new Date().toLocaleTimeString()
        })

        // 如果是Python代码，重新运行分析
        if (currentTab.language === 'python' && currentTab.content) {
          this.startPythonLivePreview(currentTab.content)
        }

      } catch (error) {
        this.$message.error('保存失败，请重试')
        console.error('保存代码失败:', error)
      } finally {
        this.isSaving = false
      }
    },

    // 加载保存的代码
    loadSavedCode(tabKey) {
      try {
        const savedFiles = JSON.parse(localStorage.getItem('codeeditor_files') || '{}')
        const savedData = savedFiles[tabKey]

        if (savedData) {
          const tab = this.openTabs.find(t => t.key === tabKey)
          if (tab) {
            tab.content = savedData.content || ''
            tab.language = savedData.language || 'python'
            tab.scratchBlocks = savedData.scratchBlocks || []
            tab.sprite = savedData.sprite || {
              x: 100, y: 100, direction: 90, saying: '', visible: true
            }

            this.consoleLogs.push({
              type: 'info',
              message: `📂 已加载保存的${tab.language}代码`,
              timestamp: new Date().toLocaleTimeString()
            })

            // 如果是Python代码，启动实时预览
            if (tab.language === 'python' && tab.content) {
              this.startPythonLivePreview(tab.content)
            }
          }
        }
      } catch (error) {
        console.error('加载保存的代码失败:', error)
      }
    }
  },

  mounted() {
    this.initializeEditor()
    this.startRealTimePreview()

    // 加载保存的代码
    this.loadSavedCode('tab1')
  },

  beforeDestroy() {
    this.stopRealTimePreview()
    if (this.previewDebounce) {
      clearTimeout(this.previewDebounce)
    }
  }
}
</script>

<style scoped lang="less">
.code-editor {
  height: 100vh;
  background: #f5f5f5;

  .ant-layout {
    height: 100%;
  }

  .editor-header {
    background: white;
    padding: 0 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e8e8e8;

    .header-left {
      display: flex;
      align-items: center;
    }

    .header-right {
      display: flex;
      align-items: center;
    }
  }

  .file-sider {
    border-right: 1px solid #e8e8e8;

    .file-explorer {
      padding: 16px;

      .file-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        font-weight: bold;
      }
    }
  }

  .editor-content {
    background: white;

    .editor-tabs {
      height: 100%;

      .ant-tabs {
        height: 100%;

        .ant-tabs-content-holder {
          height: calc(100% - 44px);

          .ant-tabs-content {
            height: 100%;

            .ant-tabs-tabpane {
              height: 100%;
            }
          }
        }
      }

      .code-editor-container {
        border: 1px solid #e8e8e8;
        border-radius: 4px;
      }
    }
  }

  .output-panel {
    background: white;
    height: 300px;
    border-top: 1px solid #e8e8e8;
    position: relative;

    .toggle-output-btn {
      position: absolute;
      top: -16px;
      right: 16px;
      z-index: 10;
    }

    .output-content,
    .console-content,
    .problems-content {
      height: 240px;
      overflow-y: auto;
      padding: 12px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      background: #fafafa;

      .empty-output {
        color: #999;
        text-align: center;
        padding: 40px;
      }

      .console-line {
        margin: 2px 0;

        &.info { color: #1890ff; }
        &.success { color: #52c41a; }
        &.warning { color: #fa8c16; }
        &.error { color: #ff4d4f; }
      }

      .problem-line {
        margin: 4px 0;
        display: flex;
        align-items: center;

        .anticon {
          margin-right: 8px;
        }

        &.error {
          color: #ff4d4f;
        }

        &.warning {
          color: #fa8c16;
        }
      }

      pre {
        white-space: pre-wrap;
        word-wrap: break-word;
        margin: 0;
      }
    }
  }

  // Scratch 编程界面样式
  .scratch-editor-container {
    height: 500px;
    background: #f5f5f5;

    .scratch-workspace {
      display: flex;
      height: 100%;

      .scratch-blocks-panel {
        width: 220px;
        background: #fff;
        border-right: 1px solid #e8e8e8;
        overflow-y: auto;
        padding: 12px 8px;

        .blocks-category {
          margin-bottom: 16px;

          h4 {
            margin: 0 0 8px 0;
            font-size: 14px;
            font-weight: 600;
            color: #666;
          }

          .block-item {
            display: block;
            padding: 8px 12px;
            margin: 4px 0;
            background: #1890ff;
            color: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;

            &:hover {
              transform: translateY(-1px);
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            &.event-block {
              background: #fa8c16;
            }

            &.control-block {
              background: #f5222d;
            }
          }
        }
      }

      .scratch-canvas {
        flex: 1;
        background: white;
        border-right: 1px solid #e8e8e8;
        display: flex;
        flex-direction: column;

        .canvas-header {
          padding: 12px 16px;
          border-bottom: 1px solid #e8e8e8;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fafafa;

          span {
            font-weight: 600;
          }
        }

        .blocks-workspace {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          min-height: 400px;

          .scratch-block {
            display: inline-block;
            padding: 8px 12px;
            margin: 4px 8px 4px 0;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            position: relative;
            font-size: 12px;
            min-width: 100px;
            transition: all 0.2s;

            &:hover {
              transform: scale(1.05);
            }

            &.motion {
              background: #1890ff;
            }

            &.looks {
              background: #722ed1;
            }

            &.sound {
              background: #eb2f96;
            }

            &.event {
              background: #fa8c16;
            }

            &.control {
              background: #f5222d;
            }

            .remove-block {
              position: absolute;
              top: -5px;
              right: -5px;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              padding: 0;
              font-size: 10px;
              line-height: 16px;
            }
          }
        }
      }

      .scratch-stage {
        width: 300px;
        background: white;
        display: flex;
        flex-direction: column;

        .stage-header {
          padding: 12px 16px;
          border-bottom: 1px solid #e8e8e8;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fafafa;

          span {
            font-weight: 600;
          }
        }

        .stage-canvas {
          flex: 1;
          position: relative;
          background: linear-gradient(45deg, #f0f0f0 25%, transparent 25%),
                      linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #f0f0f0 75%),
                      linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
          overflow: hidden;

          .sprite {
            position: absolute;
            transition: transform 0.3s ease;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;

            .sprite-icon {
              font-size: 24px;
            }

            .speech-bubble {
              position: absolute;
              bottom: 45px;
              left: 50%;
              transform: translateX(-50%);
              background: white;
              border: 2px solid #333;
              border-radius: 12px;
              padding: 6px 10px;
              white-space: nowrap;
              font-size: 12px;
              z-index: 10;

              &::after {
                content: '';
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 8px solid #333;
              }
            }
          }
        }
      }
    }
  }

  // 作业提交模态框样式
  .submission-content {
    .scratch-preview {
      border: 1px solid #e8e8e8;
      border-radius: 4px;
      padding: 12px;
      background: #fafafa;

      .blocks-count {
        margin-bottom: 8px;
        font-weight: 600;
        color: #666;
      }

      .preview-blocks {
        max-height: 120px;
        overflow-y: auto;

        .preview-block {
          display: inline-block;
          padding: 4px 8px;
          margin: 2px 4px 2px 0;
          border-radius: 3px;
          color: white;
          font-size: 11px;

          &.motion { background: #1890ff; }
          &.looks { background: #722ed1; }
          &.sound { background: #eb2f96; }
          &.event { background: #fa8c16; }
          &.control { background: #f5222d; }
        }
      }
    }

    .code-preview {
      max-height: 150px;
      overflow-y: auto;
      background: #f5f5f5;
      border: 1px solid #e8e8e8;
      border-radius: 4px;
      padding: 8px;
      font-size: 12px;
      margin: 0;
    }
  }
}

// 深色主题样式
.code-editor.dark-theme {
  background: #1e1e1e;

  .editor-header {
    background: #2d2d30;
    border-bottom-color: #3c3c3c;
  }

  .editor-content {
    background: #1e1e1e;
  }

  .output-panel {
    background: #252526;
    border-top-color: #3c3c3c;

    .output-content,
    .console-content,
    .problems-content {
      background: #1e1e1e;
      color: #d4d4d4;
    }
  }
}
</style>