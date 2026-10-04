<template>
  <div class="python-programming">
    <div class="page-header">
      <h1>Python编程环境</h1>
      <p>在线Python代码编辑器和运行环境</p>
    </div>

    <div class="programming-content">
      <a-card title="Python编程器" :bordered="false">
        <div class="python-editor">
          <a-row :gutter="16">
            <a-col :span="12">
              <div class="editor-panel">
                <h3>代码编辑器</h3>
                <textarea
                  v-model="pythonCode"
                  class="code-editor"
                  placeholder="在这里输入Python代码..."
                ></textarea>
                <div class="editor-actions">
                  <a-button type="primary" @click="runCode">
                    <a-icon type="play-circle" />
                    运行代码
                  </a-button>
                  <a-button @click="clearCode" style="margin-left: 8px;">
                    <a-icon type="delete" />
                    清空
                  </a-button>
                </div>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="output-panel">
                <h3>运行结果</h3>
                <div class="code-output">
                  <pre>{{ output }}</pre>
                </div>
              </div>
            </a-col>
          </a-row>
        </div>
      </a-card>

      <a-row :gutter="16" style="margin-top: 16px;">
        <a-col :span="8">
          <a-card title="示例代码" size="small">
            <a-button block @click="loadExample('hello')" style="margin-bottom: 8px;">
              Hello World
            </a-button>
            <a-button block @click="loadExample('calculator')" style="margin-bottom: 8px;">
              简单计算器
            </a-button>
            <a-button block @click="loadExample('loop')">
              循环示例
            </a-button>
          </a-card>
        </a-col>
        <a-col :span="8">
          <a-card title="Python语法" size="small">
            <p>• 变量定义: x = 10</p>
            <p>• 条件语句: if x > 5:</p>
            <p>• 循环: for i in range(10):</p>
            <p>• 函数: def my_function():</p>
          </a-card>
        </a-col>
        <a-col :span="8">
          <a-card title="学习资源" size="small">
            <p><a href="https://www.python.org/about/gettingstarted/" target="_blank">Python入门</a></p>
            <p><a href="https://docs.python.org/zh-cn/3/tutorial/" target="_blank">官方教程</a></p>
            <p><a href="https://www.runoob.com/python3/" target="_blank">菜鸟教程</a></p>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script>
export default {
    name: 'PythonProgramming',
    data () {
        return {
            pythonCode: '# 欢迎使用Python编程环境\nprint("Hello, Python!")\n\n# 试试基础计算\nx = 10\ny = 20\nprint(f"x + y = {x + y}")',
            output: '点击"运行代码"按钮执行Python代码'
        }
    },
    methods: {
        runCode () {
            // 模拟代码运行（实际项目中需要后端Python执行环境）
            try {
                if (this.pythonCode.includes('print("Hello, Python!")')) {
                    this.output = 'Hello, Python!\nx + y = 30'
                } else if (this.pythonCode.includes('print("Hello World")')) {
                    this.output = 'Hello World'
                } else if (this.pythonCode.includes('for i in range')) {
                    this.output = '0\n1\n2\n3\n4'
                } else {
                    this.output = '代码执行成功！\n（注意：这是演示环境，实际执行需要后端支持）'
                }
            } catch (error) {
                this.output = `错误: ${error.message}`
            }
        },
        clearCode () {
            this.pythonCode = ''
            this.output = '代码已清空'
        },
        loadExample (type) {
            switch (type) {
            case 'hello':
                this.pythonCode = 'print("Hello World")\nprint("欢迎学习Python编程！")'
                break
            case 'calculator':
                this.pythonCode = '# 简单计算器\na = float(input("请输入第一个数: "))\nb = float(input("请输入第二个数: "))\n\nprint(f"加法: {a} + {b} = {a + b}")\nprint(f"减法: {a} - {b} = {a - b}")\nprint(f"乘法: {a} * {b} = {a * b}")\nif b != 0:\n    print(f"除法: {a} / {b} = {a / b}")\nelse:\n    print("除数不能为0")'
                break
            case 'loop':
                this.pythonCode = '# 循环示例\nprint("数字1到5:")\nfor i in range(1, 6):\n    print(i)\n\nprint("\\n偶数:")\nfor i in range(2, 11, 2):\n    print(i)'
                break
            }
        }
    },
    mounted () {
    }
}
</script>

<style scoped>
.python-programming {
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #1f2329;
}

.page-header p {
  font-size: 14px;
  color: #86909c;
  margin: 0;
}

.editor-panel h3,
.output-panel h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
}

.code-editor {
  width: 100%;
  height: 400px;
  padding: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
}

.code-output {
  width: 100%;
  height: 400px;
  padding: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background-color: #f5f5f5;
  overflow-y: auto;
}

.code-output pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
}

.editor-actions {
  margin-top: 12px;
}

.programming-content {
  max-width: 1200px;
}
</style>
