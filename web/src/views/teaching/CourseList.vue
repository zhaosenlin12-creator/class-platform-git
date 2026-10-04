<template>
  <div>
    <a-card :bordered="false">
      <div class="table-page-search-wrapper">
        <a-form layout="inline">
          <a-row :gutter="24">
            <a-col :xl="6" :lg="7" :md="8" :sm="24">
              <a-form-item label="课程名称">
                <a-input
                  v-model="queryParam.courseName"
                  placeholder="请输入课程名称"
                  @pressEnter="searchQuery"
                />
              </a-form-item>
            </a-col>
            <a-col :xl="6" :lg="7" :md="8" :sm="24">
              <a-form-item label="状态">
                <a-select
                  v-model="queryParam.status"
                  allowClear
                  placeholder="全部状态"
                  style="width: 100%"
                >
                  <a-select-option value="published">已发布</a-select-option>
                  <a-select-option value="draft">草稿</a-select-option>
                  <a-select-option value="archived">已归档</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :xl="8" :lg="10" :md="8" :sm="24">
              <span class="table-page-search-submitButtons">
                <a-button type="primary" icon="search" @click="searchQuery">查询</a-button>
                <a-button icon="reload" style="margin-left: 8px" @click="searchReset">重置</a-button>
              </span>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div class="table-operator">
        <a-button type="primary" icon="plus" @click="handleAdd">新增课程</a-button>
      </div>

      <a-table
        ref="table"
        size="middle"
        rowKey="id"
        :loading="loading"
        :columns="columns"
        :dataSource="dataSource"
        :pagination="ipagination"
        @change="handleTableChange"
      >
        <template slot="action" slot-scope="text, record">
          <a @click="manageUnits(record)">
            <a-icon type="book" /> 管理课节
          </a>
          <a-divider type="vertical" />
          <a @click="handleEdit(record)">编辑</a>
          <a-divider type="vertical" />
          <a-popconfirm title="确定删除吗?" @confirm="() => handleDelete(record.id)">
            <a style="color: red;">删除</a>
          </a-popconfirm>
        </template>
      </a-table>
    </a-card>

    <a-modal
      :title="modalTitle"
      :visible="visible"
      :confirmLoading="confirmLoading"
      width="600px"
      @ok="handleOk"
      @cancel="handleCancel"
    >
      <a-form-model
        ref="form"
        :model="form"
        :rules="rules"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 16 }"
      >
        <a-form-model-item label="课程名称" prop="courseName">
          <a-input v-model="form.courseName" placeholder="请输入课程名称" />
        </a-form-model-item>
        <a-form-model-item label="课程编码" prop="courseCode">
          <a-input v-model="form.courseCode" placeholder="请输入课程编码" />
        </a-form-model-item>
        <a-form-model-item label="课程描述" prop="description">
          <a-textarea v-model="form.description" :rows="4" placeholder="请输入课程描述" />
        </a-form-model-item>
        <a-form-model-item label="状态">
          <a-select v-model="form.status" placeholder="请选择状态">
            <a-select-option :value="1">正常</a-select-option>
            <a-select-option :value="0">禁用</a-select-option>
          </a-select>
        </a-form-model-item>
      </a-form-model>
    </a-modal>
  </div>
</template>

<script>
import { deleteAction, getAction, postAction } from '@/api/manage'

const DEFAULT_QUERY = Object.freeze({
    courseName: '',
    status: undefined
})

export default {
    name: 'CourseList',
    data () {
        return {
            loading: false,
            queryParam: { ...DEFAULT_QUERY },
            dataSource: [],
            visible: false,
            confirmLoading: false,
            modalTitle: '',
            form: {
                courseName: '',
                courseCode: '',
                description: '',
                status: 1
            },
            rules: {
                courseName: [{ required: true, message: '请输入课程名称', trigger: 'blur' }],
                courseCode: [{ required: true, message: '请输入课程编码', trigger: 'blur' }]
            },
            columns: [
                {
                    title: '课程名称',
                    align: 'center',
                    dataIndex: 'courseName'
                },
                {
                    title: '课程编码',
                    align: 'center',
                    dataIndex: 'courseCode'
                },
                {
                    title: '课程描述',
                    align: 'center',
                    dataIndex: 'description'
                },
                {
                    title: '授课教师',
                    align: 'center',
                    dataIndex: 'teacherName'
                },
                {
                    title: '状态',
                    align: 'center',
                    dataIndex: 'status',
                    customRender: (text) => this.getStatusText(text)
                },
                {
                    title: '创建时间',
                    align: 'center',
                    dataIndex: 'createTime'
                },
                {
                    title: '操作',
                    dataIndex: 'action',
                    align: 'center',
                    fixed: 'right',
                    width: 150,
                    scopedSlots: { customRender: 'action' }
                }
            ],
            ipagination: {
                current: 1,
                pageSize: 10,
                pageSizeOptions: ['10', '20', '30'],
                showQuickJumper: true,
                showSizeChanger: true,
                total: 0,
                showTotal: (total, range) => `${range[0]}-${range[1]} 共 ${total} 条`
            }
        }
    },
    mounted () {
        this.loadData(1)
    },
    methods: {
        getStatusText (status) {
            if (status === 'published' || status === 1 || status === '1') {
                return '已发布'
            }
            if (status === 'draft' || status === 0 || status === '0' || status === 2 || status === '2') {
                return '草稿'
            }
            if (status === 'archived' || status === 3 || status === '3') {
                return '已归档'
            }
            return status || '-'
        },
        buildQueryParams () {
            return {
                pageNo: this.ipagination.current,
                pageSize: this.ipagination.pageSize,
                courseName: (this.queryParam.courseName || '').trim() || undefined,
                status: this.queryParam.status || undefined
            }
        },
        loadData (arg) {
            if (arg === 1) {
                this.ipagination.current = 1
            }

            this.loading = true
            getAction('/teaching/teachingCourse/list', this.buildQueryParams())
                .then(res => {
                    if (res.success) {
                        const result = res.result || {}
                        this.dataSource = result.records || []
                        this.ipagination.total = Number(result.total) || 0
                    } else {
                        this.$message.warning(res.message)
                    }
                })
                .catch(() => {})
                .finally(() => {
                    this.loading = false
                })
        },
        searchQuery () {
            this.loadData(1)
        },
        searchReset () {
            this.queryParam = { ...DEFAULT_QUERY }
            this.loadData(1)
        },
        handleTableChange (pagination) {
            this.ipagination = {
                ...this.ipagination,
                current: pagination.current,
                pageSize: pagination.pageSize
            }
            this.loadData()
        },
        handleAdd () {
            this.modalTitle = '新增课程'
            this.form = {
                courseName: '',
                courseCode: '',
                description: '',
                status: 1
            }
            this.visible = true
        },
        handleCancel () {
            this.visible = false
            if (this.$refs.form) {
                this.$refs.form.clearValidate()
            }
        },
        handleOk () {
            this.$refs.form.validate(valid => {
                if (!valid) {
                    return
                }

                this.confirmLoading = true
                const isEditing = Boolean(this.form.id)
                const request = isEditing
                    ? postAction('/teaching/teachingCourse/update', this.form)
                    : postAction('/teaching/teachingCourse/create', this.form)

                request
                    .then(res => {
                        if (res.success) {
                            this.$message.success(isEditing ? '更新成功' : '创建成功')
                            this.visible = false
                            this.loadData(isEditing ? undefined : 1)
                        } else {
                            this.$message.error(res.message || (isEditing ? '更新失败' : '创建失败'))
                        }
                    })
                    .catch(err => {
                        const serverMsg = err.response && err.response.data && err.response.data.message
                        const message = serverMsg && /^[\u4e00-\u9fa5]/.test(serverMsg)
                            ? serverMsg
                            : (isEditing ? '更新失败，请稍后重试' : '创建失败，请稍后重试')
                        this.$message.error(message)
                    })
                    .finally(() => {
                        this.confirmLoading = false
                    })
            })
        },
        handleEdit (record) {
            this.modalTitle = '编辑课程'
            this.form = {
                id: record.id,
                courseName: record.courseName,
                courseCode: record.courseCode,
                description: record.description,
                status: record.status === 'published' ? 1 : 0
            }
            this.visible = true
        },
        manageUnits (record) {
            this.$router.push({
                path: '/admin/course/units',
                query: { courseId: record.id }
            })
        },
        handleDelete (id) {
            deleteAction('/teaching/teachingCourse', { id })
                .then(res => {
                    if (res.success) {
                        this.$message.success('删除成功')
                        this.loadData(1)
                    } else {
                        this.$message.warning(res.message)
                    }
                })
        }
    }
}
</script>

<style scoped>
.table-page-search-wrapper {
  background: #fafafa;
  padding: 24px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.table-operator {
  margin-bottom: 16px;
}

.table-page-search-submitButtons {
  display: inline-flex;
  align-items: center;
  margin-bottom: 24px;
  white-space: nowrap;
}
</style>
