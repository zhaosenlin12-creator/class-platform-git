<template>
  <div class="upload-resource-form">
    <a-alert
      class="upload-alert"
      type="info"
      show-icon
      message="资源分类升级说明"
      description="上传时请先选择课程体系，再选择阶段，最后确认资源类型。AI 资源包可独立归类，方便后续导入 AI 互动课堂。"
    />

    <a-form :form="form" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
      <a-form-item label="资源名称">
        <a-input
          v-decorator="[
            'name',
            { rules: [{ required: true, message: '请输入资源名称' }] }
          ]"
          placeholder="请输入资源名称"
        />
      </a-form-item>

      <a-form-item label="课程体系/系列">
        <a-select
          v-decorator="[
            'courseSystem',
            { rules: [{ required: true, message: '请选择课程体系/系列' }] }
          ]"
          placeholder="请选择课程体系/系列"
          @change="handleCourseSystemChange"
        >
          <a-select-option
            v-for="item in courseSystemOptions"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="课程阶段">
        <a-select
          v-decorator="[
            'courseStage',
            { rules: [{ required: true, message: '请选择课程阶段' }] }
          ]"
          placeholder="请选择课程阶段"
          :disabled="!selectedCourseSystem"
        >
          <a-select-option
            v-for="item in stageOptions"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="资源类型">
        <a-select
          v-decorator="[
            'type',
            {
              initialValue: 'document',
              rules: [{ required: true, message: '请选择资源类型' }]
            }
          ]"
          placeholder="请选择资源类型"
        >
          <a-select-option
            v-for="item in uploadResourceTypes"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="所属课程">
        <a-select
          v-decorator="['courseId']"
          placeholder="请选择所属课程，可选"
          :loading="courseLoading"
          allow-clear
        >
          <a-select-option
            v-for="course in courseList"
            :key="course.id"
            :value="course.id"
          >
            {{ course.courseName || course.course_name }}
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="资源说明">
        <a-textarea
          v-decorator="['description']"
          placeholder="请输入资源说明、适用对象或导入备注"
          :rows="3"
        />
      </a-form-item>

      <a-form-item label="上传文件">
        <a-upload
          :file-list="fileList"
          :before-upload="beforeUploadFile"
          :remove="handleRemoveFile"
          accept=".zip,.rar,.7z,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.sb3,.sb2,.py,.js,.ts,.cpp,.c,.html,.css,.json,.mp4,.mp3,.wav,.jpg,.jpeg,.png,.gif,.webp"
          :multiple="false"
        >
          <a-button icon="upload">选择文件</a-button>
        </a-upload>

        <div v-if="uploading && uploadProgress > 0" class="upload-progress">
          <a-progress :percent="uploadProgress" status="active" />
        </div>

        <div class="upload-hint">
          支持 PPT、Word、PDF、视频、代码、压缩包、图片、音频等格式，单文件最大 100MB。
        </div>
      </a-form-item>
    </a-form>
  </div>
</template>

<script>
import { courseApi } from '@/api/teaching'
import { axios } from '@/utils/request'
import {
    courseSystemOptions,
    resourceTypeOptions,
    stageOptions
} from '../resourceMeta'

const MAX_SIZE = 100 * 1024 * 1024

export default {
    name: 'UploadResourceForm',
    data () {
        return {
            form: this.$form.createForm(this),
            uploading: false,
            uploadProgress: 0,
            courseList: [],
            courseLoading: false,
            fileList: [],
            selectedFile: null,
            selectedCourseSystem: '',
            courseSystemOptions,
            stageOptions
        }
    },
    computed: {
        uploadResourceTypes () {
            return resourceTypeOptions.filter(item => item.value !== 'all')
        }
    },
    created () {
        this.loadCourseList()
    },
    methods: {
        async loadCourseList () {
            this.courseLoading = true
            try {
                const response = await courseApi.getCourseList({ pageSize: 100 })
                if (response && response.success) {
                    this.courseList = response.result.records || response.result || []
                }
            } catch (error) {
            } finally {
                this.courseLoading = false
            }
        },
        handleCourseSystemChange (value) {
            this.selectedCourseSystem = value || ''
            this.form.setFieldsValue({ courseStage: undefined })
        },
        beforeUploadFile (file) {
            if (file.size > MAX_SIZE) {
                this.$message.error('文件大小超过限制，最大支持 100MB')
                return false
            }

            this.selectedFile = file
            this.fileList = [{
                uid: file.uid || String(Date.now()),
                name: file.name,
                status: 'done',
                originFileObj: file
            }]
            return false
        },
        handleRemoveFile () {
            this.selectedFile = null
            this.fileList = []
            return false
        },
        submit () {
            this.form.validateFields(async (error, values) => {
                if (error) {
                    return
                }
                if (!this.selectedFile) {
                    this.$message.warning('请先选择要上传的文件')
                    return
                }

                await this.doUpload(values)
            })
        },
        async doUpload (values) {
            this.uploading = true
            this.uploadProgress = 0
            this.$emit('upload-start', this.selectedFile)

            try {
                const formData = new FormData()
                formData.append('file', this.selectedFile)
                formData.append('name', values.name)
                formData.append('resourceType', values.type || 'document')
                formData.append('courseSystem', values.courseSystem)
                formData.append('courseStage', values.courseStage)
                if (values.description) {
                    formData.append('description', values.description)
                }
                if (values.courseId) {
                    formData.append('courseId', values.courseId)
                    const course = this.courseList.find(item => item.id === values.courseId)
                    if (course) {
                        formData.append('courseName', course.courseName || course.course_name || '')
                    }
                }

                const response = await axios({
                    url: '/teaching/course/resources/upload',
                    method: 'post',
                    data: formData,
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                    onUploadProgress: (event) => {
                        if (!event.lengthComputable) {
                            return
                        }
                        const percent = Math.round((event.loaded / event.total) * 100)
                        this.uploadProgress = percent
                        this.$emit('upload-progress', percent)
                    }
                })

                if (!response || !response.success) {
                    throw new Error(response && response.message || '上传失败')
                }

                this.$emit('upload-success', response.result || {})
                this.form.resetFields()
                this.selectedCourseSystem = ''
                this.selectedFile = null
                this.fileList = []
                this.uploadProgress = 0
            } catch (error) {
                this.$emit('upload-error', error)
                this.$message.error(error.message || '上传失败，请稍后重试')
            } finally {
                this.uploading = false
            }
        }
    }
}
</script>

<style scoped lang="less">
.upload-alert {
  margin-bottom: 16px;
}

.upload-progress {
  margin-top: 8px;
}

.upload-hint {
  margin-top: 8px;
  color: #8c8c8c;
  font-size: 12px;
}
</style>
