<template>
  <div class="class-management">
    <a-card :bordered="false">
      <div class="page-header">
        <h2>班级管理</h2>
      </div>

      <div class="toolbar">
        <a-row :gutter="16">
          <a-col :xs="24" :sm="8" :md="6">
            <a-select
              v-model="filters.status"
              placeholder="班级状态"
              allowClear
              style="width: 100%"
              @change="handleFilterChange"
            >
              <a-select-option value="active">进行中</a-select-option>
              <a-select-option value="suspended">已暂停</a-select-option>
              <a-select-option value="finished">已归档</a-select-option>
            </a-select>
          </a-col>
          <a-col :xs="24" :sm="16" :md="18" class="toolbar-actions">
            <a-button type="primary" @click="showCreateModal">新建班级</a-button>
            <a-button style="margin-left: 8px" @click="exportClassList">导出班级</a-button>
          </a-col>
        </a-row>
      </div>

      <a-table
        :columns="columns"
        :dataSource="classList"
        :loading="loading"
        :pagination="pagination"
        rowKey="id"
        @change="handleTableChange"
      >
        <template slot="status" slot-scope="text, record">
          <a-tag :color="getStatusColor(resolveStatus(record))">
            {{ getStatusText(resolveStatus(record)) }}
          </a-tag>
        </template>

        <template slot="studentCount" slot-scope="text, record">
          {{ record.enrolledCount || 0 }}/{{ record.capacity || 0 }}
        </template>

        <template slot="action" slot-scope="text, record">
          <a-button type="link" size="small" @click="editClass(record)">编辑</a-button>
          <a-button type="link" size="small" @click="manageStudents(record)">学员</a-button>
          <a-button
            type="link"
            size="small"
            :disabled="resolveStatus(record) === 'finished'"
            @click="archiveClass(record)"
          >
            归档
          </a-button>
          <a-button type="link" size="small" @click="deleteClass(record)">删除</a-button>
        </template>
      </a-table>
    </a-card>

    <a-modal
      :title="editingClass ? '编辑班级' : '新建班级'"
      :visible="modalVisible"
      :confirmLoading="modalLoading"
      @ok="handleModalOk"
      @cancel="handleModalCancel"
    >
      <a-form :form="form" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="班级名称">
          <a-input
            v-decorator="['name', { rules: [{ required: true, message: '请输入班级名称' }] }]"
            placeholder="请输入班级名称"
          />
        </a-form-item>
        <a-form-item label="班级编号">
          <a-input
            v-decorator="['code']"
            placeholder="请输入班级编号"
          />
        </a-form-item>
        <a-form-item label="教师">
          <a-select
            v-decorator="['teacherId']"
            placeholder="请选择教师"
            allowClear
          >
            <a-select-option
              v-for="teacher in teachers"
              :key="teacher.id"
              :value="teacher.id"
            >
              {{ teacher.realname }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="人数上限">
          <a-input-number
            v-decorator="['capacity']"
            :min="1"
            :max="200"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="开始时间">
          <a-date-picker
            v-decorator="['startDate']"
            style="width: 100%"
            format="YYYY-MM-DD"
          />
        </a-form-item>
        <a-form-item label="结束时间">
          <a-date-picker
            v-decorator="['endDate']"
            style="width: 100%"
            format="YYYY-MM-DD"
          />
        </a-form-item>
        <a-form-item label="上课地点">
          <a-input
            v-decorator="['location']"
            placeholder="请输入上课地点"
          />
        </a-form-item>
        <a-form-item label="班级说明">
          <a-textarea
            v-decorator="['description']"
            :rows="3"
            placeholder="请输入班级说明"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      :title="studentModalTitle"
      :visible="studentListVisible"
      :footer="null"
      :width="920"
      @cancel="closeStudentModal"
    >
      <div v-if="currentClass" class="class-summary">
        <a-alert
          type="info"
          show-icon
          :message="`${currentClass.name}（${currentClass.code || '未设置编号'}）`"
          :description="`当前 ${currentClass.enrolledCount || 0}/${currentClass.capacity || 0} 人，剩余 ${Math.max((currentClass.capacity || 0) - (currentClass.enrolledCount || 0), 0)} 个名额。`"
        />
      </div>

      <div class="student-modal-actions">
        <a-button type="primary" @click="openExistingStudentModal">添加已有学员</a-button>
        <a-button style="margin-left: 8px" @click="openCreateStudentModal">新建并加入本班</a-button>
      </div>

      <a-table
        :columns="studentColumns"
        :dataSource="classStudents"
        :loading="studentListLoading"
        :pagination="false"
        rowKey="id"
        size="small"
      >
        <template slot="joinDate" slot-scope="text, record">
          {{ formatDate(record.joinDate) }}
        </template>

        <template slot="action" slot-scope="text, record">
          <a-button type="link" size="small" @click="removeStudent(record)">移出</a-button>
        </template>
      </a-table>
    </a-modal>

    <a-modal
      title="添加已有学员"
      :visible="existingStudentVisible"
      :width="960"
      :confirmLoading="existingStudentSaving"
      @ok="confirmAddExistingStudents"
      @cancel="closeExistingStudentModal"
    >
      <div class="existing-student-toolbar">
        <a-input-search
          v-model="existingStudentKeyword"
          placeholder="搜索学号或姓名"
          style="width: 280px"
          allowClear
          @search="handleExistingStudentSearch"
        />
      </div>

      <a-table
        :columns="existingStudentColumns"
        :dataSource="existingStudentList"
        :loading="existingStudentLoading"
        :pagination="existingStudentPagination"
        :rowSelection="{ selectedRowKeys: selectedExistingStudentKeys, onChange: onExistingStudentSelectChange }"
        rowKey="id"
        size="small"
        @change="handleExistingStudentTableChange"
      >
        <template slot="gender" slot-scope="text, record">
          {{ getGenderText(record.gender || record.sex) }}
        </template>

        <template slot="status" slot-scope="text, record">
          <a-tag :color="getStudentStatusColor(record.status)">
            {{ getStudentStatusText(record.status) }}
          </a-tag>
        </template>
      </a-table>
    </a-modal>

    <a-modal
      title="新建并加入本班"
      :visible="createStudentVisible"
      :confirmLoading="createStudentSaving"
      @ok="confirmCreateStudent"
      @cancel="closeCreateStudentModal"
    >
      <a-form layout="vertical">
        <a-form-item label="学号">
          <a-input v-model.trim="createStudentForm.studentNo" placeholder="请输入学号" />
        </a-form-item>
        <a-form-item label="用户名">
          <a-input v-model.trim="createStudentForm.username" placeholder="不填默认使用学号" />
        </a-form-item>
        <a-form-item label="姓名">
          <a-input v-model.trim="createStudentForm.realname" placeholder="请输入姓名" />
        </a-form-item>
        <a-form-item label="性别">
          <a-select v-model="createStudentForm.gender" allowClear placeholder="请选择性别">
            <a-select-option value="male">男</a-select-option>
            <a-select-option value="female">女</a-select-option>
            <a-select-option value="other">其他</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="手机号">
          <a-input v-model.trim="createStudentForm.phone" placeholder="请输入手机号" />
        </a-form-item>
        <a-form-item label="邮箱">
          <a-input v-model.trim="createStudentForm.email" placeholder="请输入邮箱" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model="createStudentForm.status" placeholder="请选择状态">
            <a-select-option value="active">在读</a-select-option>
            <a-select-option value="suspended">暂停</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import moment from 'moment'
import { deleteAction, getAction, httpAction, postAction } from '@/api/manage'

function normalizeStatusValue (status, statusKey) {
    if (statusKey) {
        return statusKey
    }

    const numericStatus = Number(status)
    if (numericStatus === 3) {
        return 'finished'
    }
    if (numericStatus === 2) {
        return 'suspended'
    }
    return 'active'
}

function downloadCsv (filename, rows) {
    const csv = rows
        .map(columns => columns.map(value => {
            const text = String(value === undefined || value === null ? '' : value)
            const escaped = text.replace(/"/g, '""')
            return `"${escaped}"`
        }).join(','))
        .join('\r\n')

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = window.URL.createObjectURL(blob)
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
}

export default {
    name: 'ClassManagement',
    data () {
        return {
            loading: false,
            classList: [],
            filters: {
                status: undefined
            },
            pagination: {
                current: 1,
                pageSize: 10,
                total: 0,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: total => `共 ${total} 条记录`
            },
            modalVisible: false,
            modalLoading: false,
            editingClass: null,
            form: this.$form.createForm(this),
            teachers: [],
            studentListVisible: false,
            studentListLoading: false,
            currentClass: null,
            classStudents: [],
            existingStudentVisible: false,
            existingStudentLoading: false,
            existingStudentSaving: false,
            existingStudentKeyword: '',
            existingStudentList: [],
            selectedExistingStudentKeys: [],
            existingStudentPagination: {
                current: 1,
                pageSize: 10,
                total: 0,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: total => `共 ${total} 条记录`
            },
            createStudentVisible: false,
            createStudentSaving: false,
            createStudentForm: {
                studentNo: '',
                username: '',
                realname: '',
                gender: undefined,
                phone: '',
                email: '',
                status: 'active'
            },
            columns: [
                {
                    title: '班级名称',
                    dataIndex: 'name',
                    key: 'name'
                },
                {
                    title: '班级编号',
                    dataIndex: 'code',
                    key: 'code'
                },
                {
                    title: '状态',
                    key: 'status',
                    width: 120,
                    scopedSlots: { customRender: 'status' }
                },
                {
                    title: '人数',
                    key: 'studentCount',
                    width: 120,
                    scopedSlots: { customRender: 'studentCount' }
                },
                {
                    title: '教师',
                    dataIndex: 'teacherName',
                    key: 'teacherName',
                    customRender: text => text || '-'
                },
                {
                    title: '开始时间',
                    dataIndex: 'startDate',
                    key: 'startDate',
                    width: 140,
                    customRender: text => text || '-'
                },
                {
                    title: '操作',
                    key: 'action',
                    width: 220,
                    scopedSlots: { customRender: 'action' }
                }
            ],
            studentColumns: [
                {
                    title: '学号',
                    dataIndex: 'student_no',
                    key: 'studentNo',
                    customRender: (text, record) => record.studentNo || record.student_no || '-'
                },
                {
                    title: '姓名',
                    dataIndex: 'realname',
                    key: 'realname'
                },
                {
                    title: '加入时间',
                    key: 'joinDate',
                    width: 180,
                    scopedSlots: { customRender: 'joinDate' }
                },
                {
                    title: '操作',
                    key: 'action',
                    width: 100,
                    scopedSlots: { customRender: 'action' }
                }
            ],
            existingStudentColumns: [
                {
                    title: '学号',
                    dataIndex: 'studentNo',
                    key: 'studentNo',
                    customRender: (text, record) => record.studentNo || record.studentNumber || '-'
                },
                {
                    title: '姓名',
                    dataIndex: 'realname',
                    key: 'realname',
                    customRender: (text, record) => record.realname || record.name || '-'
                },
                {
                    title: '性别',
                    key: 'gender',
                    width: 100,
                    scopedSlots: { customRender: 'gender' }
                },
                {
                    title: '状态',
                    key: 'status',
                    width: 100,
                    scopedSlots: { customRender: 'status' }
                },
                {
                    title: '联系方式',
                    dataIndex: 'phone',
                    key: 'phone',
                    customRender: text => text || '-'
                }
            ]
        }
    },
    computed: {
        studentModalTitle () {
            return this.currentClass ? `${this.currentClass.name} - 学员列表` : '学员列表'
        }
    },
    mounted () {
        this.loadClassList()
        this.loadTeachers()
    },
    methods: {
        resolveStatus (record) {
            return normalizeStatusValue(record.status, record.statusKey)
        },
        resolveStudentStatus (status) {
            const normalized = String(status || '').toLowerCase()
            if (normalized === '2' || normalized === 'suspended' || normalized === 'inactive') {
                return 'suspended'
            }
            return 'active'
        },
        async loadClassList () {
            this.loading = true
            try {
                const response = await this.$http.get('/teaching/class/list', {
                    params: {
                        pageNo: this.pagination.current,
                        pageSize: this.pagination.pageSize,
                        status: this.filters.status || undefined
                    }
                })

                if (response && response.success) {
                    this.classList = response.result.records || []
                    this.pagination.total = response.result.total || 0
                } else {
                    this.classList = []
                    this.pagination.total = 0
                    this.$message.error((response && response.message) || '加载班级列表失败')
                }
            } catch (error) {
                this.classList = []
                this.pagination.total = 0
                this.$message.error(error.message || '加载班级列表失败')
            } finally {
                this.loading = false
            }
        },
        async loadTeachers () {
            try {
                const response = await this.$http.get('/sys/user/teacherList', {
                    params: { pageNo: 1, pageSize: 1000 }
                })
                if (response && response.success) {
                    const records = response.result.records || response.result || []
                    this.teachers = records.map(item => ({
                        id: item.id,
                        realname: item.realname || item.username || '未命名教师'
                    }))
                }
            } catch (error) {
                this.teachers = []
            }
        },
        handleFilterChange () {
            this.pagination.current = 1
            this.loadClassList()
        },
        handleTableChange (pagination) {
            this.pagination = {
                ...this.pagination,
                current: pagination.current,
                pageSize: pagination.pageSize
            }
            this.loadClassList()
        },
        showCreateModal () {
            this.editingClass = null
            this.modalVisible = true
            this.$nextTick(() => {
                this.form.resetFields()
                this.form.setFieldsValue({
                    capacity: 30
                })
            })
        },
        editClass (record) {
            this.editingClass = record
            this.modalVisible = true
            this.$nextTick(() => {
                this.form.setFieldsValue({
                    name: record.name,
                    code: record.code,
                    teacherId: record.teacherId || undefined,
                    capacity: record.capacity || 30,
                    startDate: record.startDate ? moment(record.startDate) : null,
                    endDate: record.endDate ? moment(record.endDate) : null,
                    location: record.location || undefined,
                    description: record.description || undefined
                })
            })
        },
        handleModalCancel () {
            this.modalVisible = false
            this.editingClass = null
        },
        handleModalOk () {
            this.form.validateFields(async (err, values) => {
                if (err) {
                    return
                }

                const payload = {
                    className: values.name,
                    classNo: values.code || '',
                    teacherId: values.teacherId || null,
                    maxStudents: values.capacity || 30,
                    classroom: values.location || null,
                    description: values.description || null,
                    startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : null,
                    endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : null
                }

                this.modalLoading = true
                try {
                    const url = this.editingClass
                        ? `/teaching/class/${this.editingClass.id}`
                        : '/teaching/class'
                    const method = this.editingClass ? 'put' : 'post'
                    const response = await httpAction(url, payload, method)

                    if (response && response.success) {
                        this.$message.success(this.editingClass ? '班级更新成功' : '班级创建成功')
                        this.modalVisible = false
                        this.editingClass = null
                        await this.loadClassList()
                    } else {
                        this.$message.error((response && response.message) || '保存班级失败')
                    }
                } catch (error) {
                    this.$message.error(error.message || '保存班级失败')
                } finally {
                    this.modalLoading = false
                }
            })
        },
        async manageStudents (record) {
            this.currentClass = { ...record }
            this.studentListVisible = true
            await this.loadClassStudents(record.id)
        },
        async loadClassStudents (classId) {
            this.studentListLoading = true
            try {
                const response = await getAction(`/class/${classId}/students`)
                if (response && response.success) {
                    this.classStudents = response.result || []
                } else {
                    this.classStudents = []
                    this.$message.error((response && response.message) || '加载班级学员失败')
                }
            } catch (error) {
                this.classStudents = []
                this.$message.error(error.message || '加载班级学员失败')
            } finally {
                this.studentListLoading = false
            }
        },
        closeStudentModal () {
            this.studentListVisible = false
            this.closeExistingStudentModal()
            this.closeCreateStudentModal()
        },
        openExistingStudentModal () {
            this.selectedExistingStudentKeys = []
            this.existingStudentKeyword = ''
            this.existingStudentPagination.current = 1
            this.existingStudentVisible = true
            this.loadExistingStudents()
        },
        closeExistingStudentModal () {
            this.existingStudentVisible = false
            this.selectedExistingStudentKeys = []
        },
        handleExistingStudentSearch () {
            this.existingStudentPagination.current = 1
            this.loadExistingStudents()
        },
        handleExistingStudentTableChange (pagination) {
            this.existingStudentPagination = {
                ...this.existingStudentPagination,
                current: pagination.current,
                pageSize: pagination.pageSize
            }
            this.loadExistingStudents()
        },
        onExistingStudentSelectChange (selectedRowKeys) {
            this.selectedExistingStudentKeys = selectedRowKeys
        },
        async loadExistingStudents () {
            if (!this.currentClass) {
                return
            }

            this.existingStudentLoading = true
            try {
                const response = await getAction('/teaching/student/list', {
                    pageNo: this.existingStudentPagination.current,
                    pageSize: this.existingStudentPagination.pageSize,
                    keyword: this.existingStudentKeyword || undefined,
                    excludeClassId: this.currentClass.id
                })

                if (response && response.success) {
                    const result = response.result || {}
                    this.existingStudentList = result.records || []
                    this.existingStudentPagination.total = result.total || 0
                } else {
                    this.existingStudentList = []
                    this.existingStudentPagination.total = 0
                    this.$message.error((response && response.message) || '加载可选学员失败')
                }
            } catch (error) {
                this.existingStudentList = []
                this.existingStudentPagination.total = 0
                this.$message.error(error.message || '加载可选学员失败')
            } finally {
                this.existingStudentLoading = false
            }
        },
        async confirmAddExistingStudents () {
            if (!this.currentClass) {
                return
            }

            if (this.selectedExistingStudentKeys.length === 0) {
                this.$message.warning('请至少选择一名学员')
                return
            }

            this.existingStudentSaving = true
            try {
                const response = await postAction(`/class/${this.currentClass.id}/students`, {
                    studentIds: this.selectedExistingStudentKeys
                })

                if (response && response.success) {
                    this.$message.success('学员添加成功')
                    this.closeExistingStudentModal()
                    await this.loadClassStudents(this.currentClass.id)
                    await this.loadClassList()
                    this.syncCurrentClassCount()
                } else {
                    this.$message.error((response && response.message) || '添加学员失败')
                }
            } catch (error) {
                this.$message.error(error.message || '添加学员失败')
            } finally {
                this.existingStudentSaving = false
            }
        },
        openCreateStudentModal () {
            this.resetCreateStudentForm()
            this.createStudentVisible = true
        },
        closeCreateStudentModal () {
            this.createStudentVisible = false
            this.resetCreateStudentForm()
        },
        resetCreateStudentForm () {
            this.createStudentForm = {
                studentNo: '',
                username: '',
                realname: '',
                gender: undefined,
                phone: '',
                email: '',
                status: 'active'
            }
        },
        async confirmCreateStudent () {
            if (!this.currentClass) {
                return
            }

            if (!this.createStudentForm.studentNo || !this.createStudentForm.realname) {
                this.$message.warning('请填写学号和姓名')
                return
            }

            this.createStudentSaving = true
            try {
                const createResponse = await postAction('/student', {
                    studentNo: this.createStudentForm.studentNo,
                    username: this.createStudentForm.username || this.createStudentForm.studentNo,
                    realname: this.createStudentForm.realname,
                    sex: this.mapGenderToSex(this.createStudentForm.gender),
                    phone: this.createStudentForm.phone || null,
                    email: this.createStudentForm.email || null,
                    status: this.createStudentForm.status || 'active'
                })

                if (!createResponse || !createResponse.success || !createResponse.result || !createResponse.result.id) {
                    throw new Error((createResponse && createResponse.message) || '创建学员失败')
                }

                const addResponse = await postAction(`/class/${this.currentClass.id}/students`, {
                    studentIds: [createResponse.result.id]
                })

                if (!addResponse || !addResponse.success) {
                    throw new Error((addResponse && addResponse.message) || '加入班级失败')
                }

                this.$message.success('学员创建并加入班级成功')
                this.closeCreateStudentModal()
                await this.loadClassStudents(this.currentClass.id)
                await this.loadClassList()
                this.syncCurrentClassCount()
            } catch (error) {
                this.$message.error(error.message || '创建学员失败')
            } finally {
                this.createStudentSaving = false
            }
        },
        syncCurrentClassCount () {
            if (!this.currentClass) {
                return
            }

            const latest = this.classList.find(item => item.id === this.currentClass.id)
            if (latest) {
                this.currentClass = { ...latest }
            }
        },
        removeStudent (record) {
            if (!this.currentClass) {
                return
            }

            this.$confirm({
                title: '确认移出学员',
                content: `确定将学员“${record.realname}”从班级中移出吗？`,
                onOk: async () => {
                    try {
                        const response = await deleteAction(`/class/${this.currentClass.id}/students/${record.id}`)
                        if (response && response.success) {
                            this.$message.success('学员已移出')
                            await this.loadClassStudents(this.currentClass.id)
                            await this.loadClassList()
                            this.syncCurrentClassCount()
                        } else {
                            this.$message.error((response && response.message) || '移出学员失败')
                        }
                    } catch (error) {
                        this.$message.error(error.message || '移出学员失败')
                    }
                }
            })
        },
        archiveClass (record) {
            this.$confirm({
                title: '确认归档班级',
                content: `确定归档班级“${record.name}”吗？`,
                onOk: async () => {
                    try {
                        const response = await httpAction(`/teaching/class/${record.id}/archive`, {}, 'put')
                        if (response && response.success) {
                            this.$message.success('班级已归档')
                            await this.loadClassList()
                        } else {
                            this.$message.error((response && response.message) || '归档班级失败')
                        }
                    } catch (error) {
                        this.$message.error(error.message || '归档班级失败')
                    }
                }
            })
        },
        deleteClass (record) {
            this.$confirm({
                title: '确认删除班级',
                content: `确定删除班级“${record.name}”吗？`,
                onOk: async () => {
                    try {
                        const response = await deleteAction(`/teaching/class/${record.id}`)
                        if (response && response.success) {
                            this.$message.success('班级删除成功')
                            await this.loadClassList()
                        } else {
                            this.$message.error((response && response.message) || '删除班级失败')
                        }
                    } catch (error) {
                        this.$message.error(error.message || '删除班级失败')
                    }
                }
            })
        },
        exportClassList () {
            const rows = [
                ['班级名称', '班级编号', '状态', '人数', '教师', '开始时间']
            ]

            this.classList.forEach(record => {
                rows.push([
                    record.name || '',
                    record.code || '',
                    this.getStatusText(this.resolveStatus(record)),
                    `${record.enrolledCount || 0}/${record.capacity || 0}`,
                    record.teacherName || '',
                    record.startDate || ''
                ])
            })

            downloadCsv(`班级列表_${moment().format('YYYY-MM-DD')}.csv`, rows)
            this.$message.success('班级列表已导出')
        },
        formatDate (value) {
            if (!value) {
                return '-'
            }

            const date = moment(value)
            if (!date.isValid()) {
                return String(value)
            }
            return date.format('YYYY-MM-DD')
        },
        getStatusColor (status) {
            const colors = {
                active: 'green',
                suspended: 'orange',
                finished: 'default'
            }
            return colors[status] || 'default'
        },
        getStatusText (status) {
            const texts = {
                active: '进行中',
                suspended: '已暂停',
                finished: '已归档'
            }
            return texts[status] || '进行中'
        },
        getStudentStatusColor (status) {
            return this.resolveStudentStatus(status) === 'suspended' ? 'orange' : 'green'
        },
        getStudentStatusText (status) {
            return this.resolveStudentStatus(status) === 'suspended' ? '暂停' : '在读'
        },
        getGenderText (value) {
            const normalized = String(value === undefined || value === null ? '' : value).toLowerCase()
            if (normalized === '1' || normalized === 'male') {
                return '男'
            }
            if (normalized === '2' || normalized === 'female') {
                return '女'
            }
            if (normalized === 'other' || normalized === '0') {
                return '其他'
            }
            return '-'
        },
        mapGenderToSex (gender) {
            if (gender === 'male') return 1
            if (gender === 'female') return 2
            if (gender === 'other') return 0
            return null
        }
    }
}
</script>

<style scoped>
.class-management {
  padding: 24px;
}

.page-header {
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
}

.toolbar {
  margin-bottom: 16px;
}

.toolbar-actions {
  text-align: right;
}

.class-summary {
  margin-bottom: 16px;
}

.student-modal-actions,
.existing-student-toolbar {
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .class-management {
    padding: 16px;
  }

  .toolbar-actions {
    margin-top: 12px;
    text-align: left;
  }
}
</style>
