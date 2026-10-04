<template>
  <div class="online-help">
    <!-- 帮助浮动按钮 -->
    <a-button
      class="help-button"
      type="primary"
      shape="circle"
      size="large"
      @click="toggleHelpPanel"
    >
      <a-icon type="question" />
    </a-button>

    <!-- 帮助面板 -->
    <a-drawer
      title="在线帮助"
      placement="right"
      :closable="true"
      :visible="helpVisible"
      @close="helpVisible = false"
      width="450"
    >
      <div class="help-panel">
        <!-- 搜索框 -->
        <a-input-search
          v-model="searchText"
          placeholder="搜索帮助内容..."
          @search="searchHelp"
          style="margin-bottom: 16px"
        />

        <!-- 帮助分类 -->
        <a-tabs v-model="activeHelpCategory" size="small">
          <a-tab-pane key="getting-started" tab="入门指南">
            <div class="help-content">
              <a-collapse v-model="activePanel" expandIconPosition="right">
                <a-collapse-panel
                  v-for="item in gettingStartedHelp"
                  :key="item.id"
                  :header="item.title"
                >
                  <div v-html="item.content"></div>
                  <div class="help-actions">
                    <a-button size="small" @click="markHelpful(item)">
                      <a-icon type="like" />
                      有帮助 ({{ item.helpfulCount }})
                    </a-button>
                    <a-button size="small" @click="requestMoreHelp(item)">
                      <a-icon type="question-circle" />
                      需要更多帮助
                    </a-button>
                  </div>
                </a-collapse-panel>
              </a-collapse>
            </div>
          </a-tab-pane>

          <a-tab-pane key="programming" tab="编程教程">
            <div class="help-content">
              <a-list
                :data-source="programmingTutorials"
                size="small"
              >
                <a-list-item slot="renderItem" slot-scope="item">
                  <a-list-item-meta>
                    <span slot="title" @click="openTutorial(item)" style="cursor: pointer; color: #1890ff">
                      {{ item.title }}
                    </span>
                    <span slot="description">{{ item.description }}</span>
                  </a-list-item-meta>
                  <div>
                    <a-tag :color="item.difficulty === '初级' ? 'green' : item.difficulty === '中级' ? 'orange' : 'red'">
                      {{ item.difficulty }}
                    </a-tag>
                    <span style="margin-left: 8px">{{ item.duration }}</span>
                  </div>
                </a-list-item>
              </a-list>
            </div>
          </a-tab-pane>

          <a-tab-pane key="faq" tab="常见问题">
            <div class="help-content">
              <a-collapse v-model="activeFaqPanel" expandIconPosition="right">
                <a-collapse-panel
                  v-for="faq in filteredFaqs"
                  :key="faq.id"
                  :header="faq.question"
                >
                  <div v-html="faq.answer"></div>
                  <div class="faq-tags">
                    <a-tag v-for="tag in faq.tags" :key="tag" size="small">{{ tag }}</a-tag>
                  </div>
                </a-collapse-panel>
              </a-collapse>
            </div>
          </a-tab-pane>

          <a-tab-pane key="contact" tab="联系支持">
            <div class="help-content">
              <a-form layout="vertical">
                <a-form-item label="问题类型">
                  <a-select v-model="supportForm.type" placeholder="选择问题类型">
                    <a-select-option value="technical">技术问题</a-select-option>
                    <a-select-option value="account">账户问题</a-select-option>
                    <a-select-option value="course">课程相关</a-select-option>
                    <a-select-option value="suggestion">建议反馈</a-select-option>
                  </a-select>
                </a-form-item>

                <a-form-item label="问题描述">
                  <a-textarea
                    v-model="supportForm.description"
                    placeholder="详细描述您遇到的问题..."
                    :rows="4"
                  />
                </a-form-item>

                <a-form-item label="联系方式（可选）">
                  <a-input v-model="supportForm.contact" placeholder="邮箱或QQ号" />
                </a-form-item>

                <a-form-item>
                  <a-button type="primary" block @click="submitSupport">
                    提交支持请求
                  </a-button>
                </a-form-item>
              </a-form>

              <a-divider />

              <div class="contact-info">
                <h4>其他联系方式</h4>
                <p><a-icon type="mail" /> 邮箱：support@teaching-platform.com</p>
                <p><a-icon type="qq" /> QQ群：123456789</p>
                <p><a-icon type="wechat" /> 微信群：扫描下方二维码</p>
                <div class="qr-code-placeholder">
                  [二维码占位]
                </div>
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>

        <!-- 快速帮助链接 -->
        <div class="quick-help">
          <h4>快速帮助</h4>
          <a-row :gutter="8">
            <a-col :span="12">
              <a-button size="small" block @click="quickHelp('shortcut')">
                <a-icon type="thunderbolt" />
                快捷键
              </a-button>
            </a-col>
            <a-col :span="12">
              <a-button size="small" block @click="quickHelp('video')">
                <a-icon type="play-circle" />
                视频教程
              </a-button>
            </a-col>
          </a-row>
        </div>
      </div>
    </a-drawer>

    <!-- 快捷键帮助模态框 -->
    <a-modal
      title="常用快捷键"
      :visible="shortcutVisible"
      @cancel="shortcutVisible = false"
      :footer="null"
      width="400px"
    >
      <div class="shortcut-list">
        <div v-for="shortcut in shortcuts" :key="shortcut.key" class="shortcut-item">
          <span class="shortcut-keys">{{ shortcut.keys }}</span>
          <span class="shortcut-description">{{ shortcut.description }}</span>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script>
export default {
    name: 'OnlineHelp',
    data () {
        return {
            helpVisible: false,
            shortcutVisible: false,
            searchText: '',
            activeHelpCategory: 'getting-started',
            activePanel: [],
            activeFaqPanel: [],

            supportForm: {
                type: '',
                description: '',
                contact: ''
            },

            gettingStartedHelp: [
                {
                    id: '1',
                    title: '如何开始第一个编程项目？',
                    content: `
            <p>欢迎来到编程世界！按照以下步骤开始：</p>
            <ol>
              <li>点击"编程环境"页面</li>
              <li>选择一种编程语言（推荐从Scratch开始）</li>
              <li>点击"新建项目"</li>
              <li>跟随引导完成第一个"Hello World"程序</li>
            </ol>
            <p><strong>提示：</strong>不要害怕出错，编程就是在不断试错中学习的！</p>
          `,
                    helpfulCount: 45
                },
                {
                    id: '2',
                    title: '如何提交作业？',
                    content: `
            <p>提交作业很简单：</p>
            <ol>
              <li>进入"作业中心"页面</li>
              <li>找到待提交的作业</li>
              <li>点击"提交作业"按钮</li>
              <li>上传你的代码文件或填写在线链接</li>
              <li>添加作业说明（可选）</li>
              <li>点击"确认提交"</li>
            </ol>
            <p><strong>注意：</strong>请在截止时间前提交，逾期可能会影响成绩。</p>
          `,
                    helpfulCount: 32
                },
                {
                    id: '3',
                    title: '如何分享我的作品？',
                    content: `
            <p>分享作品让更多人看到你的创作：</p>
            <ol>
              <li>在"作品展示"页面找到你的作品</li>
              <li>点击作品卡片上的"分享设置"图标</li>
              <li>选择"公开"可见性</li>
              <li>设置允许的操作（查看、评论、点赞等）</li>
              <li>复制分享链接发给朋友</li>
            </ol>
            <p><strong>提示：</strong>优秀的作品有机会被推荐到"精选作品"板块！</p>
          `,
                    helpfulCount: 28
                }
            ],

            programmingTutorials: [
                {
                    id: '1',
                    title: 'Scratch入门：制作你的第一个动画',
                    description: '学习使用Scratch制作简单的动画效果',
                    difficulty: '初级',
                    duration: '30分钟',
                    url: '/tutorials/scratch-animation'
                },
                {
                    id: '2',
                    title: 'Python基础：变量和数据类型',
                    description: '理解Python中的基本概念和语法',
                    difficulty: '初级',
                    duration: '45分钟',
                    url: '/tutorials/python-basics'
                },
                {
                    id: '3',
                    title: 'HTML/CSS：制作你的第一个网页',
                    description: '从零开始制作一个简单的个人网页',
                    difficulty: '初级',
                    duration: '60分钟',
                    url: '/tutorials/html-css-basics'
                },
                {
                    id: '4',
                    title: 'JavaScript：制作互动小游戏',
                    description: '学习JavaScript基础并制作简单游戏',
                    difficulty: '中级',
                    duration: '90分钟',
                    url: '/tutorials/js-game'
                }
            ],

            faqs: [
                {
                    id: '1',
                    question: '为什么我的代码无法运行？',
                    answer: `
            <p>代码无法运行的常见原因：</p>
            <ul>
              <li><strong>语法错误：</strong>检查括号、分号、引号是否匹配</li>
              <li><strong>变量未定义：</strong>确保使用的变量已经声明</li>
              <li><strong>缩进问题：</strong>Python等语言对缩进要求严格</li>
              <li><strong>环境问题：</strong>确保选择了正确的编程语言</li>
            </ul>
            <p>如果问题仍然存在，可以点击"联系支持"寻求帮助。</p>
          `,
                    tags: ['编程', '调试', '常见问题']
                },
                {
                    id: '2',
                    question: '如何保存我的项目？',
                    answer: `
            <p>项目会自动保存，但你也可以手动保存：</p>
            <ul>
              <li>在代码编辑器中按 <code>Ctrl+S</code>（Mac: <code>Cmd+S</code>）</li>
              <li>点击编辑器工具栏的"保存"按钮</li>
              <li>项目会保存到"我的项目"列表中</li>
            </ul>
            <p><strong>提示：</strong>建议定期手动保存重要项目。</p>
          `,
                    tags: ['项目管理', '保存']
                },
                {
                    id: '3',
                    question: '忘记密码怎么办？',
                    answer: `
            <p>重置密码的步骤：</p>
            <ol>
              <li>在登录页面点击"忘记密码"链接</li>
              <li>输入你的用户名或邮箱</li>
              <li>查收邮件中的重置链接</li>
              <li>点击链接设置新密码</li>
            </ol>
            <p>如果收不到邮件，请检查垃圾邮件文件夹，或联系管理员。</p>
          `,
                    tags: ['账户', '密码', '登录']
                }
            ],

            shortcuts: [
                { keys: 'Ctrl + S', description: '保存当前文件' },
                { keys: 'Ctrl + Z', description: '撤销操作' },
                { keys: 'Ctrl + Y', description: '重做操作' },
                { keys: 'Ctrl + F', description: '查找文本' },
                { keys: 'Ctrl + R', description: '运行代码' },
                { keys: 'F11', description: '全屏编辑' },
                { keys: 'Ctrl + /', description: '注释/取消注释' },
                { keys: 'Tab', description: '增加缩进' },
                { keys: 'Shift + Tab', description: '减少缩进' }
            ]
        }
    },

    computed: {
        filteredFaqs () {
            if (!this.searchText) {
                return this.faqs
            }
            return this.faqs.filter(faq =>
                faq.question.toLowerCase().includes(this.searchText.toLowerCase()) ||
        faq.answer.toLowerCase().includes(this.searchText.toLowerCase()) ||
        faq.tags.some(tag => tag.toLowerCase().includes(this.searchText.toLowerCase()))
            )
        }
    },

    methods: {
        toggleHelpPanel () {
            this.helpVisible = !this.helpVisible
        },

        searchHelp () {
            // 搜索功能在computed中实现
            this.activeHelpCategory = 'faq' // 切换到FAQ页面显示搜索结果
        },

        markHelpful (item) {
            item.helpfulCount += 1
            this.$message.success('感谢您的反馈！')
        },

        requestMoreHelp (item) {
            this.activeHelpCategory = 'contact'
            this.supportForm.description = `关于"${item.title}"需要更多帮助：`
        },

        openTutorial (tutorial) {
            this.$message.info(`打开教程：${tutorial.title}`)
            // 这里可以跳转到具体的教程页面
            // window.open(tutorial.url, '_blank')
        },

        submitSupport () {
            if (!this.supportForm.type || !this.supportForm.description) {
                this.$message.error('请填写问题类型和描述')
                return
            }

            // 模拟提交支持请求
            this.$message.success('支持请求已提交，我们会尽快回复您！')
            this.supportForm = {
                type: '',
                description: '',
                contact: ''
            }
        },

        quickHelp (type) {
            if (type === 'shortcut') {
                this.shortcutVisible = true
            } else if (type === 'video') {
                this.$message.info('即将播放视频教程')
                // 这里可以打开视频教程
            }
        }
    }
}
</script>

<style scoped lang="less">
.online-help {
  .help-button {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .help-panel {
    .help-content {
      .help-actions {
        margin-top: 12px;
        display: flex;
        gap: 8px;
      }

      .faq-tags {
        margin-top: 12px;
      }

      .contact-info {
        h4 {
          margin-bottom: 12px;
        }

        p {
          margin: 8px 0;

          .anticon {
            margin-right: 8px;
            color: #1890ff;
          }
        }

        .qr-code-placeholder {
          width: 120px;
          height: 120px;
          border: 2px dashed #d9d9d9;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 16px 0;
          border-radius: 4px;
          color: #999;
        }
      }
    }

    .quick-help {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #f0f0f0;

      h4 {
        margin-bottom: 12px;
      }
    }
  }

  .shortcut-list {
    .shortcut-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;

      &:last-child {
        border-bottom: none;
      }

      .shortcut-keys {
        font-family: 'Courier New', monospace;
        background-color: #f5f5f5;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
      }

      .shortcut-description {
        color: #666;
      }
    }
  }
}
</style>
