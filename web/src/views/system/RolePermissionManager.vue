<template>
  <div class="role-permission-manager">
    <a-card title="角色权限管理" :bordered="false">
      <div class="table-page-search-wrapper">
        <a-form layout="inline">
          <a-row :gutter="48">
            <a-col :md="8" :sm="24">
              <a-form-item label="角色">
                <a-select v-model="queryParam.role" placeholder="选择角色" allowClear>
                  <a-select-option
                    v-for="role in availableRoles"
                    :key="role.value"
                    :value="role.value"
                  >
                    {{ role.label }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :md="8" :sm="24">
              <a-form-item label="权限模块">
                <a-select v-model="queryParam.module" placeholder="选择模块" allowClear>
                  <a-select-option
                    v-for="module in availableModules"
                    :key="module.value"
                    :value="module.value"
                  >
                    {{ module.label }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :md="8" :sm="24">
              <span class="table-page-search-submitButtons">
                <a-button type="primary" @click="loadData">查询</a-button>
                <a-button style="margin-left: 8px" @click="resetQuery">重置</a-button>
              </span>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div class="table-operator">
        <a-button
          type="primary"
          icon="plus"
          @click="showCreateModal"
          v-permission="{ module: 'user_management', action: 'create' }"
        >
          新建角色
        </a-button>
        <a-button
          type="default"
          icon="sync"
          @click="refreshPermissions"
          v-permission="{ module: 'system_settings', action: 'update' }"
        >
          刷新权限缓存
        </a-button>
      </div>

      <!-- 权限矩阵表格 -->
      <a-table
        ref="table"
        size="default"
        rowKey="id"
        :columns="columns"
        :dataSource="roleList"
        :pagination="pagination"
        :loading="loading"
        @change="handleTableChange"
        :scroll="{ x: 1200 }"
      >
        <template slot="role" slot-scope="text, record">
          <a-tag :color="getRoleTagColor(record.role)">
            {{ getRoleDisplayName(record.role) }}
          </a-tag>
        </template>

        <template slot="permissions" slot-scope="text, record">
          <div class="permission-grid">
            <div
              v-for="module in availableModules"
              :key="module.value"
              class="permission-module"
            >
              <div class="module-header">
                <strong>{{ module.label }}</strong>
              </div>
              <div class="permission-actions">
                <a-tag
                  v-for="action in availableActions"
                  :key="`${module.value}-${action.value}`"
                  :color="hasRolePermission(record, module.value, action.value) ? 'green' : 'default'"
                  size="small"
                  @click="togglePermission(record, module.value, action.value)"
                  style="cursor: pointer; margin: 2px;"
                >
                  {{ action.label }}
                </a-tag>
              </div>
            </div>
          </div>
        </template>

        <template slot="action" slot-scope="text, record">
          <a-button-group size="small">
            <a-button
              type="primary"
              @click="editRole(record)"
              v-permission="{ module: 'user_management', action: 'update' }"
            >
              编辑
            </a-button>
            <a-button
              type="default"
              @click="copyRole(record)"
              v-permission="{ module: 'user_management', action: 'create' }"
            >
              复制
            </a-button>
            <a-button
              type="danger"
              @click="deleteRole(record)"
              v-permission="{ module: 'user_management', action: 'delete' }"
              :disabled="record.role === 'super_admin'"
            >
              删除
            </a-button>
          </a-button-group>
        </template>
      </a-table>
    </a-card>

    <!-- 角色编辑模态框 -->
    <a-modal
      :title="modalTitle"
      :visible="modalVisible"
      :width="800"
      @ok="handleSubmit"
      @cancel="handleCancel"
      :confirmLoading="confirmLoading"
    >
      <a-form :form="form" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="角色名称">
          <a-input
            v-decorator="['roleName', { rules: [{ required: true, message: '请输入角色名称' }] }]"
            placeholder="请输入角色名称"
          />
        </a-form-item>

        <a-form-item label="角色代码">
          <a-input
            v-decorator="['roleCode', { rules: [{ required: true, message: '请输入角色代码' }] }]"
            placeholder="请输入角色代码"
            :disabled="isEdit"
          />
        </a-form-item>

        <a-form-item label="角色描述">
          <a-textarea
            v-decorator="['description']"
            placeholder="请输入角色描述"
            :rows="3"
          />
        </a-form-item>

        <a-form-item label="权限配置">
          <div class="permission-config">
            <a-collapse v-model="activePanel">
              <a-collapse-panel
                v-for="module in availableModules"
                :key="module.value"
                :header="module.label"
              >
                <a-checkbox-group
                  v-model="selectedPermissions[module.value]"
                  @change="onPermissionChange(module.value, $event)"
                >
                  <a-row>
                    <a-col
                      v-for="action in availableActions"
                      :key="action.value"
                      :span="6"
                    >
                      <a-checkbox :value="action.value">
                        {{ action.label }}
                      </a-checkbox>
                    </a-col>
                  </a-row>
                </a-checkbox-group>
              </a-collapse-panel>
            </a-collapse>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 权限详情模态框 -->
    <a-modal
      title="权限详情"
      :visible="permissionDetailVisible"
      :width="600"
      @cancel="permissionDetailVisible = false"
      :footer="null"
    >
      <div v-if="selectedRoleDetail">
        <a-descriptions :title="selectedRoleDetail.roleName" bordered size="small">
          <a-descriptions-item label="角色代码">{{ selectedRoleDetail.roleCode }}</a-descriptions-item>
          <a-descriptions-item label="用户数量">{{ selectedRoleDetail.userCount }}</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ selectedRoleDetail.createTime }}</a-descriptions-item>
          <a-descriptions-item label="最后更新">{{ selectedRoleDetail.updateTime }}</a-descriptions-item>
          <a-descriptions-item label="描述" :span="2">{{ selectedRoleDetail.description }}</a-descriptions-item>
        </a-descriptions>

        <h4 style="margin-top: 16px;">权限列表</h4>
        <a-tree
          :tree-data="permissionTreeData"
          :default-expand-all="true"
          :show-icon="true"
        />
      </div>
    </a-modal>
  </div>
</template>

<script>

import { permissionMixin } from '@/directive/permission'
import {
    USER_ROLES,
    PERMISSION_MODULES,
    PERMISSION_ACTIONS,
    DEFAULT_ROLE_PERMISSIONS,
    getRoleDisplayName
} from '@/utils/permissions'

export default {
    name: 'RolePermissionManager',
    mixins: [permissionMixin],

    data () {
        return {
            loading: false,
            confirmLoading: false,

            // 查询参数
            queryParam: {
                role: undefined,
                module: undefined
            },

            // 表格数据
            roleList: [],

            // 分页配置
            pagination: {
                current: 1,
                pageSize: 10,
                total: 0,
                showQuickJumper: true,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条记录`
            },

            // 表格列配置
            columns: [
                {
                    title: '角色',
                    dataIndex: 'role',
                    key: 'role',
                    width: 120,
                    scopedSlots: { customRender: 'role' }
                },
                {
                    title: '角色名称',
                    dataIndex: 'roleName',
                    key: 'roleName',
                    width: 150
                },
                {
                    title: '用户数量',
                    dataIndex: 'userCount',
                    key: 'userCount',
                    width: 100,
                    align: 'center'
                },
                {
                    title: '权限配置',
                    key: 'permissions',
                    scopedSlots: { customRender: 'permissions' }
                },
                {
                    title: '操作',
                    key: 'action',
                    width: 200,
                    fixed: 'right',
                    scopedSlots: { customRender: 'action' }
                }
            ],

            // 模态框
            modalVisible: false,
            modalTitle: '',
            isEdit: false,
            form: this.$form.createForm(this),

            // 权限配置
            selectedPermissions: {},
            activePanel: ['homework_management'],

            // 权限详情
            permissionDetailVisible: false,
            selectedRoleDetail: null,
            permissionTreeData: [],

            // 可用选项
            availableRoles: [
                { value: USER_ROLES.SUPER_ADMIN, label: '超级管理员' },
                { value: USER_ROLES.SCHOOL_ADMIN, label: '学校管理员' },
                { value: USER_ROLES.TEACHER, label: '教师' },
                { value: USER_ROLES.STUDENT, label: '学生' },
                { value: USER_ROLES.PARENT, label: '家长' },
                { value: USER_ROLES.GUEST, label: '访客' }
            ],

            availableModules: [
                { value: PERMISSION_MODULES.USER_MANAGEMENT, label: '用户管理' },
                { value: PERMISSION_MODULES.COURSE_MANAGEMENT, label: '课程管理' },
                { value: PERMISSION_MODULES.HOMEWORK_MANAGEMENT, label: '作业管理' },
                { value: PERMISSION_MODULES.GRADE_MANAGEMENT, label: '成绩管理' },
                { value: PERMISSION_MODULES.SYSTEM_SETTINGS, label: '系统设置' },
                { value: PERMISSION_MODULES.DATA_ANALYSIS, label: '数据分析' },
                { value: PERMISSION_MODULES.CONTENT_MANAGEMENT, label: '内容管理' },
                { value: PERMISSION_MODULES.TEACHING_TOOLS, label: '教学工具' }
            ],

            availableActions: [
                { value: PERMISSION_ACTIONS.CREATE, label: '创建' },
                { value: PERMISSION_ACTIONS.READ, label: '查看' },
                { value: PERMISSION_ACTIONS.UPDATE, label: '编辑' },
                { value: PERMISSION_ACTIONS.DELETE, label: '删除' },
                { value: PERMISSION_ACTIONS.EXPORT, label: '导出' },
                { value: PERMISSION_ACTIONS.IMPORT, label: '导入' },
                { value: PERMISSION_ACTIONS.APPROVE, label: '审核' },
                { value: PERMISSION_ACTIONS.ASSIGN, label: '分配' }
            ]
        }
    },

    mounted () {
        this.loadData()
    },

    methods: {
    // 加载数据
        async loadData () {
            this.loading = true
            try {
                // 模拟角色数据
                this.roleList = [
                    {
                        id: '1',
                        role: USER_ROLES.SUPER_ADMIN,
                        roleName: '超级管理员',
                        userCount: 1,
                        createTime: '2024-01-01 00:00:00',
                        updateTime: '2024-01-20 10:30:00',
                        description: '拥有系统所有权限',
                        permissions: DEFAULT_ROLE_PERMISSIONS[USER_ROLES.SUPER_ADMIN]
                    },
                    {
                        id: '2',
                        role: USER_ROLES.SCHOOL_ADMIN,
                        roleName: '学校管理员',
                        userCount: 5,
                        createTime: '2024-01-02 00:00:00',
                        updateTime: '2024-01-20 10:30:00',
                        description: '学校级别管理权限',
                        permissions: DEFAULT_ROLE_PERMISSIONS[USER_ROLES.SCHOOL_ADMIN]
                    },
                    {
                        id: '3',
                        role: USER_ROLES.TEACHER,
                        roleName: '教师',
                        userCount: 25,
                        createTime: '2024-01-03 00:00:00',
                        updateTime: '2024-01-20 10:30:00',
                        description: '教学相关权限',
                        permissions: DEFAULT_ROLE_PERMISSIONS[USER_ROLES.TEACHER]
                    },
                    {
                        id: '4',
                        role: USER_ROLES.STUDENT,
                        roleName: '学生',
                        userCount: 500,
                        createTime: '2024-01-04 00:00:00',
                        updateTime: '2024-01-20 10:30:00',
                        description: '学生基础权限',
                        permissions: DEFAULT_ROLE_PERMISSIONS[USER_ROLES.STUDENT]
                    }
                ]

                // 应用过滤条件
                if (this.queryParam.role) {
                    this.roleList = this.roleList.filter(role => role.role === this.queryParam.role)
                }

                this.pagination.total = this.roleList.length
            } catch (error) {
                console.error('加载角色数据失败:', error)
                this.$message.error('加载数据失败')
            } finally {
                this.loading = false
            }
        },

        // 重置查询
        resetQuery () {
            this.queryParam = {
                role: undefined,
                module: undefined
            }
            this.loadData()
        },

        // 表格变化处理
        handleTableChange (pagination) {
            this.pagination = pagination
            this.loadData()
        },

        // 获取角色标签颜色
        getRoleTagColor (role) {
            const colors = {
                [USER_ROLES.SUPER_ADMIN]: 'red',
                [USER_ROLES.SCHOOL_ADMIN]: 'orange',
                [USER_ROLES.TEACHER]: 'blue',
                [USER_ROLES.STUDENT]: 'green',
                [USER_ROLES.PARENT]: 'purple',
                [USER_ROLES.GUEST]: 'default'
            }
            return colors[role] || 'default'
        },

        // 获取角色显示名称
        getRoleDisplayName,

        // 检查角色是否有特定权限
        hasRolePermission (role, module, action) {
            return role.permissions &&
             role.permissions[module] &&
             role.permissions[module].includes(action)
        },

        // 切换权限
        async togglePermission (role, module, action) {
            if (role.role === USER_ROLES.SUPER_ADMIN) {
                this.$message.warning('超级管理员权限不可修改')
                return
            }

            try {
                // 这里实现权限切换逻辑
                const hasPermission = this.hasRolePermission(role, module, action)

                if (hasPermission) {
                    // 移除权限
                    role.permissions[module] = role.permissions[module].filter(a => a !== action)
                } else {
                    // 添加权限
                    if (!role.permissions[module]) {
                        role.permissions[module] = []
                    }
                    role.permissions[module].push(action)
                }

                // 这里应该调用API保存权限变更
                this.$message.success(`权限${hasPermission ? '移除' : '添加'}成功`)
            } catch (error) {
                console.error('权限切换失败:', error)
                this.$message.error('权限修改失败')
            }
        },

        // 显示创建模态框
        showCreateModal () {
            this.modalVisible = true
            this.modalTitle = '新建角色'
            this.isEdit = false
            this.form.resetFields()
            this.initPermissions()
        },

        // 编辑角色
        editRole (record) {
            this.modalVisible = true
            this.modalTitle = '编辑角色'
            this.isEdit = true

            this.$nextTick(() => {
                this.form.setFieldsValue({
                    roleName: record.roleName,
                    roleCode: record.role,
                    description: record.description
                })
                this.loadRolePermissions(record.permissions)
            })
        },

        // 复制角色
        copyRole (record) {
            this.modalVisible = true
            this.modalTitle = '复制角色'
            this.isEdit = false

            this.$nextTick(() => {
                this.form.setFieldsValue({
                    roleName: `${record.roleName}_副本`,
                    roleCode: `${record.role}_copy`,
                    description: record.description
                })
                this.loadRolePermissions(record.permissions)
            })
        },

        // 删除角色
        deleteRole (record) {
            this.$confirm({
                title: '确认删除',
                content: `确定要删除角色"${record.roleName}"吗？`,
                onOk: async () => {
                    try {
                        // 这里调用删除API
                        this.$message.success('删除成功')
                        this.loadData()
                    } catch (error) {
                        console.error('删除失败:', error)
                        this.$message.error('删除失败')
                    }
                }
            })
        },

        // 初始化权限选择
        initPermissions () {
            this.selectedPermissions = {}
            this.availableModules.forEach(module => {
                this.selectedPermissions[module.value] = []
            })
        },

        // 加载角色权限
        loadRolePermissions (permissions) {
            this.selectedPermissions = {}
            this.availableModules.forEach(module => {
                this.selectedPermissions[module.value] = permissions[module.value] || []
            })
        },

        // 权限变化处理
        onPermissionChange (module, checkedValues) {
            this.selectedPermissions[module] = checkedValues
        },

        // 提交表单
        handleSubmit () {
            this.form.validateFields(async (err, values) => {
                if (!err) {
                    this.confirmLoading = true
                    try {
                        const roleData = {
                            ...values,
                            permissions: this.selectedPermissions
                        }

                        if (this.isEdit) {
                            // 更新角色
                        } else {
                            // 创建角色
                        }

                        this.$message.success(`角色${this.isEdit ? '更新' : '创建'}成功`)
                        this.modalVisible = false
                        this.loadData()
                    } catch (error) {
                        console.error('操作失败:', error)
                        this.$message.error('操作失败')
                    } finally {
                        this.confirmLoading = false
                    }
                }
            })
        },

        // 取消
        handleCancel () {
            this.modalVisible = false
            this.form.resetFields()
        },

        // 刷新权限缓存
        async refreshPermissions () {
            try {
                this.$message.loading('正在刷新权限缓存...', 2)
                // 这里调用刷新缓存的API
                this.$message.success('权限缓存刷新成功')
            } catch (error) {
                console.error('刷新失败:', error)
                this.$message.error('刷新失败')
            }
        }
    }
}
</script>

<style lang="less" scoped>
.role-permission-manager {
  .table-operator {
    margin-bottom: 16px;
  }

  .permission-grid {
    max-height: 200px;
    overflow-y: auto;
  }

  .permission-module {
    margin-bottom: 12px;
    padding: 8px;
    background: #fafafa;
    border-radius: 4px;

    .module-header {
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e8e8e8;
    }

    .permission-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
  }

  .permission-config {
    max-height: 400px;
    overflow-y: auto;
  }

  .ant-collapse-item {
    border: 1px solid #d9d9d9;
    margin-bottom: 8px;
    border-radius: 4px;
  }

  .ant-collapse-header {
    background: #fafafa !important;
  }
}
</style>
