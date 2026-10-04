<template>
  <div class="homework-submit">
    <a-card>
      <div slot="title">
        <a-icon type="edit" />
        作业提交
      </div>
      <div slot="extra">
        <a-button @click="goBack">返回</a-button>
      </div>

      <div v-if="homework">
        <a-row :gutter="16">
          <a-col :span="16">
            <a-card title="作业信息" style="margin-bottom: 16px;">
              <a-descriptions :column="2" bordered>
                <a-descriptions-item label="作业标题">{{ safe(homework.homeworkTitle) }}</a-descriptions-item>
                <a-descriptions-item label="课程名称">{{ safe(homework.courseName) }}</a-descriptions-item>
                <a-descriptions-item label="截止时间">{{ homework.deadline }}</a-descriptions-item>
                <a-descriptions-item label="满分">{{ homework.totalScore || 100 }}分</a-descriptions-item>
              </a-descriptions>

              <a-divider>作业要求</a-divider>
              <div v-html="sanitizedRequirements"></div>

              <a-divider>参考资料</a-divider>
              <ul v-if="homework.resources">
                <li v-for="resource in homework.resources" :key="resource.id">
                  <a :href="resource.url" target="_blank">{{ safe(resource.name) }}</a>
                </li>
              </ul>
            </a-card>

            <a-card title="提交作业">
              <a-form layout="vertical">
                <a-form-item label="作业说明" :required="true">
                  <a-textarea
                    v-model="submitForm.description"
                    placeholder="请详细描述您的作业完成情况、遇到的问题及解决方案等"
                    :rows="4"
                  />
                </a-form-item>

                <a-form-item label="作业文件">
                  <secure-upload
                    v-model="submitForm.fileList"
                    :max-size="maxFileSize"
                    :allowed-extensions="getAllowedExtensions()"
                    :max-count="5"
                    :multiple="true"
                    button-text="选择文件"
                    :show-tips="true"
                  >
                    <a-button>
                      <a-icon type="upload" />
                      选择文件
                    </a-button>
                  </secure-upload>
                </a-form-item>

                <a-form-item label="在线作品链接">
                  <a-input
                    v-model="submitForm.url"
                    placeholder="如果是在线作品（如Scratch项目），请填写链接"
                    @blur="validateURLInput"
                  />
                  <span v-if="urlError" style="color: red; font-size: 12px;">{{ urlError }}</span>
                </a-form-item>

                <a-form-item>
                  <a-button
                    type="primary"
                    size="large"
                    @click="submitHomework"
                    :loading="submitting"
                    style="margin-right: 8px;"
                  >
                    提交作业
                  </a-button>
                  <a-button @click="saveDraft">保存草稿</a-button>
                </a-form-item>
              </a-form>
            </a-card>
          </a-col>

          <a-col :span="8">
            <a-card title="提交须知" size="small">
              <ul style="margin: 0; padding-left: 20px;">
                <li>请确保作业内容完整，符合要求</li>
                <li>文件大小不超过100MB</li>
                <li>支持的文件格式：{{ getFileTypeHint() }}</li>
                <li>提交后可以重新提交，以最后一次为准</li>
                <li>请在截止时间前完成提交</li>
              </ul>
            </a-card>

            <a-card title="作业进度" size="small" style="margin-top: 16px;">
              <a-steps direction="vertical" size="small" :current="currentStep">
                <a-step title="查看作业要求" description="了解作业详情" />
                <a-step title="完成作业" description="按要求完成作业内容" />
                <a-step title="提交作业" description="上传作业文件或链接" />
                <a-step title="等待批改" description="教师批改作业" />
                <a-step title="查看结果" description="获得成绩和反馈" />
              </a-steps>
            </a-card>

            <a-card title="编程环境" size="small" style="margin-top: 16px;" v-if="homework.type === 'Scratch项目'">
              <a-button block @click="openScratchEditor">
                <a-icon type="code" />
                打开Scratch编辑器
              </a-button>
            </a-card>

            <a-card title="编程环境" size="small" style="margin-top: 16px;" v-if="homework.type === 'Python代码'">
              <a-button block @click="openPythonEditor">
                <a-icon type="code" />
                打开Python编辑器
              </a-button>
            </a-card>

            <a-card title="编程环境" size="small" style="margin-top: 16px;" v-if="homework.type === 'HTML/CSS'">
              <a-button block @click="openWebEditor">
                <a-icon type="code" />
                打开Web编辑器
              </a-button>
            </a-card>
          </a-col>
        </a-row>
      </div>

      <div v-else>
        <a-result
          status="404"
          title="作业不存在"
          sub-title="未找到指定的作业信息"
        >
          <template #extra>
            <a-button type="primary" @click="goBack">返回作业列表</a-button>
          </template>
        </a-result>
      </div>
    </a-card>
  </div>
</template>

<script>
import SecureUpload from '@/components/SecureUpload'
import { sanitizeHTML, sanitizeInput, validateURL } from '@/utils/security'

export default {
    name: 'HomeworkSubmit',
    components: {
        SecureUpload
    },
    data () {
        return {
            homework: null,
            submitting: false,
            currentStep: 2,
            submitForm: {
                description: '',
                fileList: [],
                url: ''
            },
            maxFileSize: 100 * 1024 * 1024, // 100MB
            urlError: '',
            homeworkData: [
                {
                    id: '1',
                    homeworkTitle: '制作小猫追球游戏',
                    courseName: 'Scratch入门编程',
                    deadline: '2024-01-25',
                    description: '使用Scratch制作一个小猫追球的互动游戏',
                    requirements: '<p>1. 创建一个小猫角色和一个球角色</p><p>2. 实现小猫跟随鼠标移动</p><p>3. 球在舞台上随机移动</p><p>4. 小猫碰到球时得分</p><p>5. 添加背景音乐和音效</p>',
                    type: 'Scratch项目',
                    totalScore: 100,
                    resources: [
                        { id: '1', name: 'Scratch入门教程', url: '#' },
                        { id: '2', name: '游戏制作示例', url: '#' }
                    ]
                },
                {
                    id: '2',
                    homeworkTitle: 'Python变量练习',
                    courseName: 'Python基础教程',
                    deadline: '2024-01-27',
                    description: '完成Python变量定义和使用的练习题',
                    requirements: '<p>1. 定义不同类型的变量（字符串、整数、浮点数）</p><p>2. 实现变量的算术运算</p><p>3. 使用input()函数获取用户输入</p><p>4. 输出格式化的结果</p>',
                    type: 'Python代码',
                    totalScore: 100,
                    resources: [
                        { id: '1', name: 'Python变量教程', url: '#' }
                    ]
                },
                {
                    id: '3',
                    homeworkTitle: '网页设计作业',
                    courseName: 'Web前端基础',
                    deadline: '2024-01-30',
                    description: '制作一个个人介绍网页',
                    requirements: '<p>1. 使用HTML创建网页结构</p><p>2. 使用CSS美化页面样式</p><p>3. 包含个人信息、爱好、照片等内容</p><p>4. 页面布局美观，色彩搭配合理</p>',
                    type: 'HTML/CSS',
                    totalScore: 100,
                    resources: [
                        { id: '1', name: 'HTML基础教程', url: '#' },
                        { id: '2', name: 'CSS样式指南', url: '#' }
                    ]
                }
            ]
        }
    },
    computed: {
    /**
     * 清理后的作业要求HTML内容
     */
        sanitizedRequirements () {
            if (!this.homework || !this.homework.requirements) return ''
            return sanitizeHTML(this.homework.requirements)
        }
    },
    created () {
        this.loadHomework()
    },
    methods: {
    /**
     * 清理用户输入文本
     */
        safe (text) {
            return sanitizeInput(text, { maxLength: 200 })
        },

        /**
     * 获取允许的文件扩展名
     */
        getAllowedExtensions () {
            if (!this.homework) return []

            switch (this.homework.type) {
            case 'Scratch项目':
                return ['sb3', 'sb2']
            case 'Python代码':
                return ['py', 'txt']
            case 'HTML/CSS':
                return ['html', 'css', 'zip']
            default:
                return []
            }
        },

        /**
     * 验证URL输入
     */
        validateURLInput () {
            this.urlError = ''
            if (!this.submitForm.url) return

            const validation = validateURL(this.submitForm.url, {
                allowedProtocols: ['http', 'https']
            })

            if (!validation.valid) {
                this.urlError = validation.error
                return false
            }

            this.submitForm.url = validation.sanitized
            return true
        },

        loadHomework () {
            const homeworkId = this.$route.params.id
            this.homework = this.homeworkData.find(h => h.id === homeworkId)
        },

        goBack () {
            this.$router.push('/student/homework')
        },

        getAcceptTypes () {
            if (!this.homework) return ''

            switch (this.homework.type) {
            case 'Scratch项目':
                return '.sb3,.sb2'
            case 'Python代码':
                return '.py,.txt'
            case 'HTML/CSS':
                return '.html,.css,.zip'
            default:
                return ''
            }
        },

        getFileTypeHint () {
            if (!this.homework) return ''

            switch (this.homework.type) {
            case 'Scratch项目':
                return '支持.sb3, .sb2格式'
            case 'Python代码':
                return '支持.py, .txt格式'
            case 'HTML/CSS':
                return '支持.html, .css, .zip格式'
            default:
                return '支持常见文件格式'
            }
        },

        submitHomework () {
            // 清理作业说明输入
            const cleanedDescription = sanitizeInput(this.submitForm.description, {
                maxLength: 1000,
                allowSpaces: true
            })

            if (!cleanedDescription.trim()) {
                this.$message.error('请填写作业说明')
                return
            }

            if (this.submitForm.fileList.length === 0 && !this.submitForm.url) {
                this.$message.error('请上传作业文件或填写作业链接')
                return
            }

            // 如果填写了URL,验证URL
            if (this.submitForm.url && !this.validateURLInput()) {
                this.$message.error('请输入有效的URL地址')
                return
            }

            // 更新清理后的内容
            this.submitForm.description = cleanedDescription

            this.submitting = true

            // 模拟提交过程
            setTimeout(() => {
                this.$message.success('作业提交成功！')
                this.submitting = false
                this.currentStep = 3

                // 提交成功后跳转到作业列表
                setTimeout(() => {
                    this.$router.push('/student/homework')
                }, 1500)
            }, 2000)
        },

        saveDraft () {
            this.$message.success('草稿保存成功！')
        },

        openScratchEditor () {
            window.open('#', '_blank')
            this.$message.info('正在打开Scratch编辑器...')
        },

        openPythonEditor () {
            window.open('#', '_blank')
            this.$message.info('正在打开Python编辑器...')
        },

        openWebEditor () {
            window.open('#', '_blank')
            this.$message.info('正在打开Web编辑器...')
        }
    },

    beforeDestroy () {
    // 清理URL对象,防止内存泄漏
        if (this.submitForm.fileList) {
            this.submitForm.fileList.forEach(file => {
                if (file.url && file.url.startsWith('blob:')) {
                    URL.revokeObjectURL(file.url)
                }
            })
        }
    }
}
</script>

<style scoped lang="less">
.homework-submit {
  padding: 24px;

  .ant-descriptions {
    margin-bottom: 16px;
  }

  .ant-steps {
    .ant-steps-item-title {
      font-size: 12px;
    }
    .ant-steps-item-description {
      font-size: 11px;
    }
  }

  .ant-card-head-title {
    font-weight: 600;
  }

  .ant-upload {
    .ant-btn {
      margin-right: 8px;
    }
  }
}
</style>
