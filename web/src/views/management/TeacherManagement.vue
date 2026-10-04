<template>
  <div class="teacher-management">
    <a-card :bordered="false">
      <!-- 页面标题 -->
      <div class="table-page-search-wrapper">
        <h2 class="page-title">教师管理</h2>
      </div>

      <!-- 搜索和操作栏 -->
      <div class="table-operator">
        <a-row :gutter="16">
          <a-col :span="18">
            <a-input-search
              v-model="queryParam.keyword"
              placeholder="搜索教师姓名或账号"
              style="width: 300px; margin-right: 16px"
              @search="searchQuery"
              allowClear
            >
              <a-icon slot="prefix" type="search" />
            </a-input-search>

            <a-select
              v-model="queryParam.status"
              placeholder="全部状态"
              style="width: 150px; margin-right: 16px"
              allowClear
              @change="searchQuery"
            >
              <a-select-option :value="1">启用</a-select-option>
              <a-select-option :value="0">禁用</a-select-option>
            </a-select>
          </a-col>

          <a-col :span="6" style="text-align: right">
            <a-button type="primary" icon="plus" @click="handleAdd">添加教师</a-button>
            <a-button icon="upload" style="margin-left: 8px" @click="handleImport">批量导入</a-button>
            <a-button icon="download" style="margin-left: 8px" @click="handleExport">导出数据</a-button>
          </a-col>
        </a-row>
      </div>

      <!-- 教师列表表格 -->
      <a-table
        ref="table"
        :columns="columns"
        :dataSource="dataSource"
        :pagination="ipagination"
        :loading="loading"
        rowKey="id"
        @change="handleTableChange"
        :scroll="{ x: 1200 }"
      >
        <!-- 头像列 -->
        <span slot="avatar" slot-scope="text, record">
          <a-avatar :src="getAvatar(record.avatar)" :size="40" icon="user" />
        </span>

        <!-- 状态列 -->
        <span slot="status" slot-scope="text">
          <a-badge :status="text == 1 ? 'success' : 'error'" :text="text == 1 ? '启用' : '禁用'" />
        </span>

        <!-- 操作列 -->
        <span slot="action" slot-scope="text, record">
          <a-button type="link" size="small" @click="handleDetail(record)">详情</a-button>
          <a-divider type="vertical" />
          <a-button type="link" size="small" @click="handleEdit(record)">编辑</a-button>
          <a-divider type="vertical" />
          <a-dropdown>
            <a class="ant-dropdown-link">
              更多 <a-icon type="down" />
            </a>
            <a-menu slot="overlay">
              <a-menu-item>
                <a @click="handleResetPassword(record)">重置密码</a>
              </a-menu-item>
              <a-menu-item>
                <a @click="handleToggleStatus(record)">
                  {{ record.status == 1 ? '禁用' : '启用' }}
                </a>
              </a-menu-item>
              <a-menu-item>
                <a-popconfirm
                  title="确定删除该教师吗？"
                  @confirm="handleDelete(record.id)"
                >
                  <a style="color: #ff4d4f">删除</a>
                </a-popconfirm>
              </a-menu-item>
            </a-menu>
          </a-dropdown>
        </span>
      </a-table>
    </a-card>

    <!-- 添加/编辑教师弹窗 -->
    <a-modal
      :title="modalTitle"
      :visible="visible"
      :confirmLoading="confirmLoading"
      @ok="handleSubmit"
      @cancel="handleCancel"
      width="600px"
    >
      <a-form :form="form" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="账号">
          <a-input
            v-decorator="[
              'username',
              {
                rules: [
                  { required: true, message: '请输入账号' },
                  { pattern: /^[a-zA-Z0-9_]{4,20}$/, message: '账号格式：4-20位字母、数字或下划线' }
                ]
              }
            ]"
            placeholder="请输入账号"
            :disabled="!!model.id"
          />
        </a-form-item>

        <a-form-item label="姓名">
          <a-input
            v-decorator="[
              'realname',
              {
                rules: [{ required: true, message: '请输入姓名' }]
              }
            ]"
            placeholder="请输入姓名"
          />
        </a-form-item>

        <a-form-item label="密码" v-if="!model.id">
          <a-input-password
            v-decorator="[
              'password',
              {
                rules: [
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6位' }
                ]
              }
            ]"
            placeholder="请输入密码"
          />
        </a-form-item>

        <a-form-item label="手机号">
          <a-input
            v-decorator="[
              'phone',
              {
                rules: [
                  { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
                ]
              }
            ]"
            placeholder="请输入手机号"
          />
        </a-form-item>

        <a-form-item label="邮箱">
          <a-input
            v-decorator="[
              'email',
              {
                rules: [
                  { type: 'email', message: '请输入正确的邮箱' }
                ]
              }
            ]"
            placeholder="请输入邮箱"
          />
        </a-form-item>

        <a-form-item label="性别">
          <a-radio-group
            v-decorator="['sex', { initialValue: 1 }]"
          >
            <a-radio :value="1">男</a-radio>
            <a-radio :value="2">女</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item label="状态">
          <a-radio-group
            v-decorator="['status', { initialValue: 1 }]"
          >
            <a-radio :value="1">启用</a-radio>
            <a-radio :value="0">禁用</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { getAction, postAction, putAction, deleteAction, getFileAccessHttpUrl } from '@/api/manage'

export default {
    name: 'TeacherManagement',
    data () {
        return {
            // 查询参数
            queryParam: {
                keyword: '',
                status: undefined,
                pageNo: 1,
                pageSize: 10
            },
            // 表格列配置
            columns: [
                {
                    title: '头像',
                    dataIndex: 'avatar',
                    width: 80,
                    align: 'center',
                    scopedSlots: { customRender: 'avatar' }
                },
                {
                    title: '账号',
                    dataIndex: 'username',
                    width: 120
                },
                {
                    title: '姓名',
                    dataIndex: 'realname',
                    width: 100
                },
                {
                    title: '性别',
                    dataIndex: 'sex',
                    width: 60,
                    customRender: (text) => {
                        return text == 1 ? '男' : text == 2 ? '女' : '-'
                    }
                },
                {
                    title: '手机号',
                    dataIndex: 'phone',
                    width: 120
                },
                {
                    title: '邮箱',
                    dataIndex: 'email',
                    width: 180
                },
                {
                    title: '状态',
                    dataIndex: 'status',
                    width: 80,
                    scopedSlots: { customRender: 'status' }
                },
                {
                    title: '创建时间',
                    dataIndex: 'create_time',
                    width: 160,
                    customRender: (text) => {
                        return text ? this.$moment(text).format('YYYY-MM-DD HH:mm') : '-'
                    }
                },
                {
                    title: '操作',
                    dataIndex: 'action',
                    width: 180,
                    fixed: 'right',
                    scopedSlots: { customRender: 'action' }
                }
            ],
            // 数据源
            dataSource: [],
            // 分页配置
            ipagination: {
                current: 1,
                pageSize: 10,
                total: 0,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`
            },
            // 加载状态
            loading: false,
            // 弹窗相关
            visible: false,
            confirmLoading: false,
            modalTitle: '添加教师',
            form: this.$form.createForm(this),
            model: {},
            // API地址
            url: {
                list: '/sys/user/teacherList',
                add: '/sys/user/addTeacher',
                edit: '/sys/user/editTeacher',
                delete: '/sys/user/deleteTeacher',
                resetPassword: '/sys/user/resetPassword'
            }
        }
    },
    mounted () {
        this.loadData()
    },
    methods: {
    // 加载数据
        loadData (arg) {
            if (arg === 1) {
                this.ipagination.current = 1
            }
            const params = {
                ...this.queryParam,
                pageNo: this.ipagination.current,
                pageSize: this.ipagination.pageSize
            }
            this.loading = true
            getAction(this.url.list, params).then((res) => {
                this.loading = false
                if (res.success) {
                    this.dataSource = res.result.records || res.result
                    this.ipagination.total = res.result.total || this.dataSource.length
                } else {
                    this.$message.error(res.message || '加载失败')
                }
            }).catch(() => {
                this.loading = false
                this.$message.error('加载失败')
            })
        },

        // 搜索
        searchQuery () {
            this.loadData(1)
        },

        // 表格变化
        handleTableChange (pagination) {
            this.ipagination.current = pagination.current
            this.ipagination.pageSize = pagination.pageSize
            this.loadData()
        },

        // 获取头像
        getAvatar (avatar) {
            if (avatar) {
                return getFileAccessHttpUrl(avatar)
            }
            return ''
        },

        // 添加
        handleAdd () {
            this.model = {}
            this.modalTitle = '添加教师'
            this.visible = true
            this.$nextTick(() => {
                this.form.resetFields()
            })
        },

        // 编辑
        handleEdit (record) {
            this.model = { ...record }
            this.modalTitle = '编辑教师'
            this.visible = true
            this.$nextTick(() => {
                this.form.setFieldsValue({
                    username: record.username,
                    realname: record.realname,
                    phone: record.phone,
                    email: record.email,
                    sex: record.sex || 1,
                    status: record.status !== undefined ? record.status : 1
                })
            })
        },

        // 详情
        handleDetail (record) {
            this.$info({
                title: '教师详情',
                width: 600,
                content: (
                    <div>
                        <p><strong>账号：</strong>{record.username}</p>
                        <p><strong>姓名：</strong>{record.realname}</p>
                        <p><strong>性别：</strong>{record.sex == 1 ? '男' : record.sex == 2 ? '女' : '-'}</p>
                        <p><strong>手机号：</strong>{record.phone || '-'}</p>
                        <p><strong>邮箱：</strong>{record.email || '-'}</p>
                        <p><strong>状态：</strong>{record.status == 1 ? '启用' : '禁用'}</p>
                        <p><strong>创建时间：</strong>{record.create_time ? this.$moment(record.create_time).format('YYYY-MM-DD HH:mm:ss') : '-'}</p>
                    </div>
                )
            })
        },

        // 提交
        handleSubmit () {
            this.form.validateFields((err, values) => {
                if (!err) {
                    this.confirmLoading = true
                    const formData = {
                        ...values,
                        id: this.model.id
                    }

                    const apiUrl = this.model.id ? this.url.edit : this.url.add
                    const httpMethod = this.model.id ? putAction : postAction

                    httpMethod(apiUrl, formData).then((res) => {
                        this.confirmLoading = false
                        if (res.success) {
                            this.$message.success(this.model.id ? '编辑成功' : '添加成功')
                            this.visible = false
                            this.loadData()
                        } else {
                            // 显示服务器返回的友好错误消息
                            this.$message.error(res.message || '操作失败')
                        }
                    }).catch((error) => {
                        this.confirmLoading = false
                        // 尝试从错误响应中获取友好消息
                        const errorMsg = (error.response && error.response.data && error.response.data.message) || error.message || '操作失败，请稍后重试'
                        this.$message.error(errorMsg)
                    })
                }
            })
        },

        // 取消
        handleCancel () {
            this.visible = false
            this.form.resetFields()
        },

        // 删除
        handleDelete (id) {
            deleteAction(this.url.delete, { id }).then((res) => {
                if (res.success) {
                    this.$message.success('删除成功')
                    this.loadData()
                } else {
                    this.$message.error(res.message || '删除失败')
                }
            })
        },

        // 重置密码
        handleResetPassword (record) {
            this.$confirm({
                title: '重置密码',
                content: `确定要重置教师 ${record.realname} 的密码为 123456 吗？`,
                onOk: () => {
                    postAction(this.url.resetPassword, {
                        id: record.id,
                        password: '123456'
                    }).then((res) => {
                        if (res.success) {
                            this.$message.success('密码已重置为：123456')
                        } else {
                            this.$message.error(res.message || '重置失败')
                        }
                    })
                }
            })
        },

        // 切换状态
        handleToggleStatus (record) {
            const newStatus = record.status == 1 ? 0 : 1
            putAction(this.url.edit, {
                id: record.id,
                status: newStatus
            }).then((res) => {
                if (res.success) {
                    this.$message.success('状态已更新')
                    this.loadData()
                } else {
                    this.$message.error(res.message || '更新失败')
                }
            })
        },

        // 批量导入
        handleImport () {
            this.$message.info('批量导入功能开发中')
        },

        // 导出数据
        handleExport () {
            this.$message.info('导出功能开发中')
        }
    }
}
</script>

<style lang="less" scoped>
.teacher-management {
  .page-title {
    margin-bottom: 20px;
    font-size: 20px;
    font-weight: 500;
  }

  .table-operator {
    margin-bottom: 16px;
  }
}
</style>
