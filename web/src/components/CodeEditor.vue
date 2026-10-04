<template>
  <div class="code-editor-wrapper">
    <!-- Monaco编辑器 -->
    <div ref="codeEditor" class="monaco-editor" :style="{ height: height + 'px' }"></div>

    <!-- 简单的代码运行结果显示 -->
    <div v-if="showOutput" class="output-panel">
      <div class="output-header">
        <span>运行结果</span>
        <a-button type="link" size="small" @click="clearOutput">
          <a-icon type="clear" />
          清空
        </a-button>
      </div>
      <pre class="output-content">{{ output }}</pre>
    </div>
  </div>
</template>

<script>
export default {
    name: 'CodeEditor',
    props: {
        language: {
            type: String,
            default: 'javascript'
        },
        value: {
            type: String,
            default: ''
        },
        height: {
            type: [Number, String],
            default: 300
        },
        readonly: {
            type: Boolean,
            default: false
        },
        broadcastMode: {
            type: Boolean,
            default: false
        }
    },

    data () {
        return {
            editor: null,
            output: '',
            showOutput: false
        }
    },

    mounted () {
        this.initEditor()
    },

    beforeDestroy () {
        if (this.editor) {
            this.editor.dispose()
        }
    },

    watch: {
        value (newValue) {
            if (this.editor && newValue !== this.editor.getValue()) {
                this.editor.setValue(newValue)
            }
        },
        language () {
            this.updateLanguage()
        }
    },

    methods: {
    // 初始化编辑器
        initEditor () {
            // 如果monaco编辑器不可用，使用简单的textarea
            if (typeof monaco === 'undefined') {
                this.initSimpleEditor()
                return
            }

            // 使用Monaco编辑器
            this.editor = monaco.editor.create(this.$refs.codeEditor, {
                value: this.value,
                language: this.getMonacoLanguage(this.language),
                theme: 'vs-dark',
                automaticLayout: true,
                readOnly: this.readonly,
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on'
            })

            // 监听内容变化
            this.editor.onDidChangeModelContent(() => {
                const value = this.editor.getValue()
                this.$emit('change', value)

                // 如果是广播模式，实时广播代码
                if (this.broadcastMode) {
                    this.$emit('broadcast', value)
                }
            })
        },

        // 初始化简单编辑器（fallback）
        initSimpleEditor () {
            const textarea = document.createElement('textarea')
            textarea.value = this.value
            textarea.className = 'simple-code-editor'
            textarea.style.cssText = `
        width: 100%;
        height: ${this.height}px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 14px;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        padding: 12px;
        background: #1e1e1e;
        color: #d4d4d4;
        resize: none;
        outline: none;
      `

            if (this.readonly) {
                textarea.readOnly = true
            }

            textarea.addEventListener('input', (e) => {
                this.$emit('change', e.target.value)
            })

            this.$refs.codeEditor.appendChild(textarea)
        },

        // 获取Monaco语言标识
        getMonacoLanguage (lang) {
            const languageMap = {
                javascript: 'javascript',
                python: 'python',
                html: 'html',
                css: 'css',
                java: 'java',
                cpp: 'cpp',
                scratch: 'javascript' // Scratch使用JavaScript语法高亮
            }
            return languageMap[lang] || 'plaintext'
        },

        // 更新语言
        updateLanguage () {
            if (this.editor && typeof monaco !== 'undefined') {
                const model = this.editor.getModel()
                monaco.editor.setModelLanguage(model, this.getMonacoLanguage(this.language))
            }
        },

        // 运行代码（简单实现）
        runCode () {
            const code = this.editor ? this.editor.getValue() : this.value

            try {
                if (this.language === 'javascript') {
                    // 简单的JavaScript执行
                    this.output = this.executeJavaScript(code)
                } else if (this.language === 'python') {
                    this.output = '注意：Python代码需要在服务器端执行'
                } else {
                    this.output = `${this.language}代码执行功能开发中...`
                }
                this.showOutput = true
            } catch (error) {
                this.output = `错误：${error.message}`
                this.showOutput = true
            }
        },

        // 执行JavaScript代码
        executeJavaScript (code) {
            // 安全的代码执行环境
            const logs = []
            const originalLog = console.log

            // 重定向console.log
            console.log = (...args) => {
                logs.push(args.join(' '))
            }

            try {
                // 执行代码
                const result = new Function(code)()

                // 恢复console.log
                console.log = originalLog

                if (logs.length > 0) {
                    return logs.join('\n')
                } else if (result !== undefined) {
                    return String(result)
                } else {
                    return '代码执行完成'
                }
            } catch (error) {
                // 恢复console.log
                console.log = originalLog
                throw error
            }
        },

        // 清空输出
        clearOutput () {
            this.output = ''
            this.showOutput = false
        },

        // 获取代码内容
        getValue () {
            return this.editor ? this.editor.getValue() : this.value
        },

        // 设置代码内容
        setValue (value) {
            if (this.editor) {
                this.editor.setValue(value)
            }
        }
    }
}
</script>

<style scoped lang="less">
.code-editor-wrapper {
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  overflow: hidden;

  .monaco-editor {
    min-height: 200px;
  }

  .output-panel {
    border-top: 1px solid #d9d9d9;
    background: #f8f9fa;

    .output-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #e6f7ff;
      border-bottom: 1px solid #d9d9d9;
      font-size: 12px;
      font-weight: 500;
    }

    .output-content {
      padding: 12px;
      margin: 0;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
      line-height: 1.4;
      background: #fff;
      border: none;
      white-space: pre-wrap;
      word-wrap: break-word;
      max-height: 200px;
      overflow-y: auto;
    }
  }
}

:global(.simple-code-editor) {
  tab-size: 2;
  -moz-tab-size: 2;
}
</style>
