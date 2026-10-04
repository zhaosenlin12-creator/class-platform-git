<template>
  <div class="edit-resource-form">
    <a-alert
      class="edit-alert"
      type="info"
      show-icon
      message="资源信息编辑说明"
      description="本次编辑只更新资源名称、分类、阶段、归属课程、类型和说明，不会修改已上传的文件内容与存储地址。"
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
            { rules: [{ required: true, message: '请选择资源类型' }] }
          ]"
          placeholder="请选择资源类型"
        >
          <a-select-option
            v-for="item in resourceTypeOptions"
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
          placeholder="请选择所属课程，可留空"
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

      <a-form-item label="标签">
        <a-input
          v-decorator="['tags']"
          placeholder="多个标签请用逗号分隔"
        />
      </a-form-item>

      <a-form-item label="资源说明">
        <a-textarea
          v-decorator="['description']"
          :rows="4"
          placeholder="请输入资源说明、适用对象或课堂使用备注"
        />
      </a-form-item>
    </a-form>
  </div>
</template>

<script>
import { courseApi, courseResourceApi } from '@/api/teaching'
import {
    courseSystemOptions,
    resourceTypeOptions,
    stageOptions
} from '../resourceMeta'

export default {
    name: 'EditResourceForm',
    props: {
        resource: {
            type: Object,
            required: true
        }
    },
    data () {
        return {
            form: this.$form.createForm(this),
            courseList: [],
            courseLoading: false,
            submitting: false,
            selectedCourseSystem: '',
            courseSystemOptions,
            stageOptions
        }
    },
    computed: {
        resourceTypeOptions () {
            return resourceTypeOptions.filter(item => item.value !== 'all')
        }
    },
    created () {
        this.selectedCourseSystem = this.resource.courseSystem || ''
        this.loadCourseList()
    },
    mounted () {
        this.setInitialValues()
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
        setInitialValues () {
            this.form.setFieldsValue({
                name: this.resource.name || this.resource.resource_name || '',
                courseSystem: this.resource.courseSystem || undefined,
                courseStage: this.resource.courseStage || undefined,
                type: this.resource.type || this.resource.resource_type || 'document',
                courseId: this.resource.courseId || undefined,
                tags: Array.isArray(this.resource.tags) ? this.resource.tags.join(', ') : this.resource.tags || '',
                description: this.resource.description || ''
            })
        },
        handleCourseSystemChange (value) {
            this.selectedCourseSystem = value || ''
            this.form.setFieldsValue({ courseStage: undefined })
        },
        submit () {
            this.form.validateFields(async (error, values) => {
                if (error || this.submitting) {
                    return
                }

                this.submitting = true
                try {
                    const selectedCourse = this.courseList.find(item => item.id === values.courseId)
                    const payload = {
                        name: values.name,
                        courseSystem: values.courseSystem,
                        courseStage: values.courseStage,
                        type: values.type,
                        courseId: values.courseId || '',
                        courseName: selectedCourse && (selectedCourse.courseName || selectedCourse.course_name) || '',
                        description: values.description || '',
                        tags: values.tags || ''
                    }

                    const response = await courseResourceApi.updateResource(this.resource.id, payload)
                    if (!response || !response.success) {
                        throw new Error(response && response.message || '更新资源信息失败')
                    }

                    this.$emit('update-success', response.result || { ...payload, id: this.resource.id })
                } catch (error) {
                    this.$message.error(error.message || '更新资源信息失败，请稍后重试')
                } finally {
                    this.submitting = false
                }
            })
        }
    }
}
</script>

<style scoped lang="less">
.edit-alert {
  margin-bottom: 16px;
}
</style>
