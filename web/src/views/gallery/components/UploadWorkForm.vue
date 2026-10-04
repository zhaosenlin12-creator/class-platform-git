<template>
  <div class="upload-work-form">
    <a-form-model
      ref="form"
      :model="form"
      :rules="rules"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 16 }"
    >
      <a-form-model-item label="作品标题" prop="title">
        <a-input
          v-model="form.title"
          placeholder="请输入作品标题"
          :maxLength="50"
          show-count
        />
      </a-form-model-item>

      <a-form-model-item label="作品描述" prop="description">
        <a-textarea
          v-model="form.description"
          placeholder="请描述你的作品，包括功能特点、制作思路等"
          :rows="4"
          :maxLength="200"
          show-count
        />
      </a-form-model-item>

      <a-form-model-item label="作品类型" prop="type">
        <a-select
          v-model="form.type"
          placeholder="请选择作品类型"
          @change="onTypeChange"
        >
          <a-select-option value="scratch">Scratch作品</a-select-option>
          <a-select-option value="python">Python项目</a-select-option>
          <a-select-option value="web">网页项目</a-select-option>
          <a-select-option value="game">游戏作品</a-select-option>
        </a-select>
      </a-form-model-item>

      <a-form-model-item label="年级" prop="grade">
        <a-select
          v-model="form.grade"
          placeholder="请选择你的年级"
        >
          <a-select-option value="grade1">一年级</a-select-option>
          <a-select-option value="grade2">二年级</a-select-option>
          <a-select-option value="grade3">三年级</a-select-option>
          <a-select-option value="grade4">四年级</a-select-option>
          <a-select-option value="grade5">五年级</a-select-option>
          <a-select-option value="grade6">六年级</a-select-option>
        </a-select>
      </a-form-model-item>

      <a-form-model-item label="作品标签" prop="tags">
        <a-select
          v-model="form.tags"
          mode="tags"
          placeholder="添加标签（按回车确认）"
          style="width: 100%"
          :maxTagCount="5"
        >
          <a-select-option v-for="tag in recommendedTags" :key="tag" :value="tag">
            {{ tag }}
          </a-select-option>
        </a-select>
        <div class="tag-tips">
          建议添加：{{ recommendedTags.join('、') }}
        </div>
      </a-form-model-item>

      <!-- 文件上传区域 -->
      <a-form-model-item label="作品文件" prop="files">
        <div class="upload-section">
          <!-- Scratch项目上传 -->
          <div v-if="form.type === 'scratch'" class="scratch-upload">
            <a-upload
              :file-list="scratchFiles"
              :before-upload="beforeUploadScratch"
              :remove="removeScratchFile"
              accept=".sb3,.sb2"
              :multiple="false"
            >
              <a-button icon="upload">
                上传Scratch项目文件
              </a-button>
            </a-upload>
            <div class="upload-tips">
              支持格式：.sb3, .sb2（Scratch项目文件）
            </div>
          </div>

          <!-- Python项目上传 -->
          <div v-if="form.type === 'python'" class="python-upload">
            <a-upload
              :file-list="pythonFiles"
              :before-upload="beforeUploadPython"
              :remove="removePythonFile"
              accept=".py,.zip"
              :multiple="true"
            >
              <a-button icon="upload">
                上传Python文件
              </a-button>
            </a-upload>
            <div class="upload-tips">
              支持格式：.py（Python文件）, .zip（项目压缩包）
            </div>
          </div>

          <!-- 网页项目上传 -->
          <div v-if="form.type === 'web'" class="web-upload">
            <a-upload
              :file-list="webFiles"
              :before-upload="beforeUploadWeb"
              :remove="removeWebFile"
              accept=".html,.css,.js,.zip"
              :multiple="true"
            >
              <a-button icon="upload">
                上传网页文件
              </a-button>
            </a-upload>
            <div class="upload-tips">
              支持格式：.html, .css, .js（网页文件）, .zip（项目压缩包）
            </div>
          </div>

          <!-- 游戏项目上传 -->
          <div v-if="form.type === 'game'" class="game-upload">
            <a-upload
              :file-list="gameFiles"
              :before-upload="beforeUploadGame"
              :remove="removeGameFile"
              accept=".py,.zip,.exe"
              :multiple="true"
            >
              <a-button icon="upload">
                上传游戏文件
              </a-button>
            </a-upload>
            <div class="upload-tips">
              支持格式：.py（Python游戏），.zip（项目压缩包），.exe（可执行文件）
            </div>
          </div>
        </div>
      </a-form-model-item>

      <!-- 缩略图上传 -->
      <a-form-model-item label="作品缩略图" prop="thumbnail">
        <a-upload
          :file-list="thumbnailFiles"
          :before-upload="beforeUploadThumbnail"
          :remove="removeThumbnailFile"
          accept="image/*"
          :multiple="false"
          list-type="picture-card"
          class="thumbnail-upload"
        >
          <div v-if="thumbnailFiles.length === 0">
            <a-icon type="plus" />
            <div class="ant-upload-text">上传缩略图</div>
          </div>
        </a-upload>
        <div class="upload-tips">
          建议尺寸：400x300像素，支持jpg、png格式
        </div>
      </a-form-model-item>

      <!-- 作品说明 -->
      <a-form-model-item label="制作说明" prop="instructions">
        <a-textarea
          v-model="form.instructions"
          placeholder="可选：分享你的制作过程、遇到的问题、解决方案等"
          :rows="3"
          :maxLength="300"
          show-count
        />
      </a-form-model-item>

      <!-- 隐私设置 -->
      <a-form-model-item label="隐私设置" prop="privacy">
        <a-radio-group v-model="form.privacy">
          <a-radio value="public">
            <a-icon type="global" />
            公开展示
            <div class="radio-description">所有人都可以查看你的作品</div>
          </a-radio>
          <a-radio value="class">
            <a-icon type="team" />
            班级内可见
            <div class="radio-description">只有同班同学可以查看</div>
          </a-radio>
          <a-radio value="private">
            <a-icon type="lock" />
            仅自己可见
            <div class="radio-description">只有你可以查看，用于保存草稿</div>
          </a-radio>
        </a-radio-group>
      </a-form-model-item>

      <!-- 分享选项 -->
      <a-form-model-item label="分享选项" v-if="form.privacy === 'public'">
        <a-checkbox-group v-model="form.shareOptions">
          <a-checkbox value="allowDownload">
            允许其他同学下载我的作品
          </a-checkbox>
          <a-checkbox value="allowComment">
            允许其他同学评论我的作品
          </a-checkbox>
          <a-checkbox value="allowRemix">
            允许其他同学基于我的作品进行创作
          </a-checkbox>
        </a-checkbox-group>
      </a-form-model-item>
    </a-form-model>

    <div class="form-actions">
      <a-space>
        <a-button @click="$emit('cancel')">
          取消
        </a-button>
        <a-button @click="saveDraft">
          保存草稿
        </a-button>
        <a-button type="primary" @click="submitWork" :loading="uploading">
          <a-icon type="upload" />
          发布作品
        </a-button>
      </a-space>
    </div>
  </div>
</template>

<script>
export default {
    name: 'UploadWorkForm',
    data () {
        return {
            uploading: false,
            form: {
                title: '',
                description: '',
                type: '',
                grade: '',
                tags: [],
                instructions: '',
                privacy: 'public',
                shareOptions: ['allowComment']
            },

            // 文件列表
            scratchFiles: [],
            pythonFiles: [],
            webFiles: [],
            gameFiles: [],
            thumbnailFiles: [],

            // 推荐标签
            recommendedTags: ['创意', '有趣', '实用', '挑战', '学习'],

            // 表单验证规则
            rules: {
                title: [
                    { required: true, message: '请输入作品标题!' },
                    { min: 2, max: 50, message: '标题长度应在2-50个字符之间!' }
                ],
                description: [
                    { required: true, message: '请输入作品描述!' },
                    { min: 10, max: 200, message: '描述长度应在10-200个字符之间!' }
                ],
                type: [
                    { required: true, message: '请选择作品类型!' }
                ],
                grade: [
                    { required: true, message: '请选择你的年级!' }
                ]
            }
        }
    },
    computed: {
        currentFiles () {
            switch (this.form.type) {
            case 'scratch': return this.scratchFiles
            case 'python': return this.pythonFiles
            case 'web': return this.webFiles
            case 'game': return this.gameFiles
            default: return []
            }
        }
    },
    methods: {
        onTypeChange (type) {
            // 清除之前的文件
            this.scratchFiles = []
            this.pythonFiles = []
            this.webFiles = []
            this.gameFiles = []

            // 根据类型设置推荐标签
            const tagMap = {
                'scratch': ['动画', '故事', '游戏', '音乐', '艺术'],
                'python': ['算法', '数据', '图形', '工具', '计算'],
                'web': ['网页', '设计', '交互', '响应式', '美观'],
                'game': ['游戏', '娱乐', '挑战', '关卡', '策略']
            }
            this.recommendedTags = tagMap[type] || ['创意', '有趣', '实用', '挑战', '学习']
        },

        // Scratch文件上传
        beforeUploadScratch (file) {
            const maxSize = 100 * 1024 * 1024 // 100MB
            if (file.size > maxSize) {
                this.$message.error('文件大小超过限制（最大100MB），请压缩文件后重新上传')
                return false
            }
            this.scratchFiles = [{
                uid: file.uid || String(Date.now()),
                name: file.name,
                status: 'done',
                originFileObj: file
            }]
            return false
        },

        removeScratchFile () {
            this.scratchFiles = []
        },

        // Python文件上传
        beforeUploadPython (file) {
            const maxSize = 100 * 1024 * 1024 // 100MB
            if (file.size > maxSize) {
                this.$message.error('文件大小超过限制（最大100MB），请压缩文件后重新上传')
                return false
            }
            this.pythonFiles = [...this.pythonFiles, {
                uid: file.uid || String(Date.now()),
                name: file.name,
                status: 'done',
                originFileObj: file
            }]
            return false
        },

        removePythonFile (file) {
            this.pythonFiles = this.pythonFiles.filter(f => f.uid !== file.uid)
        },

        // 网页文件上传
        beforeUploadWeb (file) {
            const maxSize = 100 * 1024 * 1024 // 100MB
            if (file.size > maxSize) {
                this.$message.error('文件大小超过限制（最大100MB），请压缩文件后重新上传')
                return false
            }
            this.webFiles = [...this.webFiles, {
                uid: file.uid || String(Date.now()),
                name: file.name,
                status: 'done',
                originFileObj: file
            }]
            return false
        },

        removeWebFile (file) {
            this.webFiles = this.webFiles.filter(f => f.uid !== file.uid)
        },

        // 游戏文件上传
        beforeUploadGame (file) {
            const maxSize = 100 * 1024 * 1024 // 100MB
            if (file.size > maxSize) {
                this.$message.error('文件大小超过限制（最大100MB），请压缩文件后重新上传')
                return false
            }
            this.gameFiles = [...this.gameFiles, {
                uid: file.uid || String(Date.now()),
                name: file.name,
                status: 'done',
                originFileObj: file
            }]
            return false
        },

        removeGameFile (file) {
            this.gameFiles = this.gameFiles.filter(f => f.uid !== file.uid)
        },

        // 缩略图上传
        beforeUploadThumbnail (file) {
            // 检查文件大小（缩略图限制10MB）
            const maxSize = 10 * 1024 * 1024 // 10MB
            if (file.size > maxSize) {
                this.$message.error('缩略图大小超过限制（最大10MB），请压缩后重新上传')
                return false
            }

            // 检查文件类型
            const isImage = file.type.startsWith('image/')
            if (!isImage) {
                this.$message.error('只能上传图片文件!')
                return false
            }

            this.thumbnailFiles = [file]
            return false
        },

        removeThumbnailFile () {
            this.thumbnailFiles = []
        },

        // 保存草稿
        saveDraft () {
            this.$refs.form.validate(valid => {
                if (valid) {
                    const draftData = {
                        ...this.form,
                        files: this.currentFiles,
                        thumbnail: this.thumbnailFiles[0] || null,
                        isDraft: true,
                        saveTime: new Date().toLocaleString()
                    }

                    // 保存到本地存储
                    localStorage.setItem('workDraft', JSON.stringify(draftData))
                    this.$message.success('草稿保存成功！')
                }
            })
        },

        // 提交作品
        submitWork () {
            this.$refs.form.validate(valid => {
                if (valid) {
                    // 检查是否有文件
                    if (this.currentFiles.length === 0) {
                        this.$message.error('请上传作品文件!')
                        return
                    }

                    this.uploading = true

                    // 模拟上传过程
                    setTimeout(() => {
                        const newWork = {
                            id: Date.now().toString(),
                            title: this.form.title,
                            description: this.form.description,
                            type: this.form.type,
                            grade: this.form.grade,
                            tags: this.form.tags,
                            instructions: this.form.instructions,
                            privacy: this.form.privacy,
                            shareOptions: this.form.shareOptions,
                            author: '当前用户', // 实际应用中从用户状态获取
                            authorAvatar: '/images/avatars/current-user.jpg',
                            publishTime: new Date().toLocaleString(),
                            views: 0,
                            likes: 0,
                            comments: 0,
                            isLiked: false,
                            isFavorite: false,
                            featured: false,
                            thumbnail: this.thumbnailFiles[0] ? URL.createObjectURL(this.thumbnailFiles[0]) : null,
                            files: this.currentFiles.map(file => ({
                                name: file.name,
                                size: file.size,
                                type: file.type,
                                url: URL.createObjectURL(file)
                            }))
                        }

                        this.uploading = false
                        this.$emit('upload-success', newWork)

                        // 清除草稿
                        localStorage.removeItem('workDraft')

                        this.$message.success('作品发布成功！')
                        this.resetForm()
                    }, 2000)
                }
            })
        },

        // 重置表单
        resetForm () {
            this.$refs.form.resetFields()
            this.scratchFiles = []
            this.pythonFiles = []
            this.webFiles = []
            this.gameFiles = []
            this.thumbnailFiles = []
            this.form = {
                title: '',
                description: '',
                type: '',
                grade: '',
                tags: [],
                instructions: '',
                privacy: 'public',
                shareOptions: ['allowComment']
            }
        },

        // 加载草稿
        loadDraft () {
            const draftData = localStorage.getItem('workDraft')
            if (draftData) {
                const draft = JSON.parse(draftData)
                this.form = { ...draft }
                // 注意：文件需要重新选择，因为File对象无法序列化
                this.$message.info('已加载之前保存的草稿')
            }
        }
    },

    mounted () {
    // 页面加载时尝试加载草稿
        this.loadDraft()
    }
}
</script>

<style scoped>
.upload-work-form {
  padding: 16px 0;
}

.upload-section {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  padding: 16px;
  background: #fafafa;
}

.upload-tips {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.tag-tips {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}

.thumbnail-upload {
  margin-bottom: 8px;
}

.radio-description {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

.form-actions {
  text-align: center;
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.ant-radio {
  display: block;
  height: 50px;
  line-height: 50px;
}

.ant-checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ant-checkbox-wrapper {
  margin-left: 0;
}

/* 上传组件样式调整 */
.ant-upload.ant-upload-select-picture-card {
  width: 120px;
  height: 120px;
}

.ant-upload-list-picture-card .ant-upload-list-item {
  width: 120px;
  height: 120px;
}
</style>
