<template>
  <div class="student-management">
    <a-card :bordered="false">
      <div class="page-header">
        <h2>学员管理</h2>
      </div>

      <div class="toolbar">
        <a-row :gutter="16">
          <a-col :xs="24" :sm="8" :md="6">
            <a-select
              v-model="filters.classId"
              placeholder="全部班级"
              allowClear
              style="width: 100%"
              @change="handleSearch"
            >
              <a-select-option
                v-for="item in classList"
                :key="item.id"
                :value="item.id"
              >
                {{ item.name }}
              </a-select-option>
            </a-select>
          </a-col>
          <a-col :xs="24" :sm="8" :md="6">
            <a-select
              v-model="filters.status"
              placeholder="全部状态"
              allowClear
              style="width: 100%"
              @change="handleSearch"
            >
              <a-select-option value="active">在读</a-select-option>
              <a-select-option value="suspended">暂停</a-select-option>
              <a-select-option value="need_attention">需关注</a-select-option>
            </a-select>
          </a-col>
          <a-col :xs="24" :sm="8" :md="12" class="toolbar-actions">
            <a-button type="primary" @click="showCreateModal">
              添加学员
            </a-button>
            <a-button style="margin-left: 8px" @click="showBatchImportModal">
              批量导入
            </a-button>
            <a-button style="margin-left: 8px" @click="exportStudents">
              导出数据
            </a-button>
          </a-col>
        </a-row>
      </div>

      <a-table
        :columns="columns"
        :dataSource="studentList"
        :loading="loading"
        :pagination="pagination"
        rowKey="id"
        @change="handleTableChange"
      >
        <template slot="avatar" slot-scope="text, record">
          <a-avatar :src="record.avatar" icon="user" />
        </template>

        <template slot="gender" slot-scope="text, record">
          {{ getGenderText(record.gender || record.sex) }}
        </template>

        <template slot="status" slot-scope="text, record">
          <a-tag :color="getStatusColor(record.status)">
            {{ getStatusText(record.status) }}
          </a-tag>
        </template>

        <template slot="classInfo" slot-scope="text, record">
          <div v-if="record.classes && record.classes.length > 0">
            <div
              v-for="item in record.classes"
              :key="`${record.id}-${item.id || item.className}`"
              class="class-item"
            >
              <div>{{ item.name || item.className }}</div>
              <div v-if="item.joinDate" class="class-date">{{ item.joinDate }}</div>
            </div>
          </div>
          <span v-else class="placeholder-text">未分班</span>
        </template>

        <template slot="contact" slot-scope="text, record">
          {{ record.phone || '-' }}
        </template>

        <template slot="performance" slot-scope="text, record">
          <div>课程完成率：{{ record.completionRate || 0 }}%</div>
          <div>已完成课程：{{ record.completedCourses || 0 }}/{{ record.totalCourses || 0 }}</div>
        </template>

        <template slot="action" slot-scope="text, record">
          <a-button type="link" size="small" @click="viewStudentDetail(record)">
            详 情
          </a-button>
          <a-button type="link" size="small" @click="assignClass(record)">
            分 班
          </a-button>
          <a-button type="link" size="small" @click="resetStudentPassword(record)">
            重置密码
          </a-button>
          <a-button type="link" size="small" @click="editStudent(record)">
            编 辑
          </a-button>
          <a-button type="link" size="small" @click="deleteStudent(record)">
            删 除
          </a-button>
        </template>
      </a-table>
    </a-card>

    <a-modal
      :title="editingStudent ? '编辑学员' : '添加学员'"
      :visible="modalVisible"
      :confirmLoading="modalLoading"
      :width="760"
      @ok="handleModalOk"
      @cancel="handleModalCancel"
    >
      <a-form :form="form" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="学号">
          <a-input
            v-decorator="['studentNo', { rules: [{ required: true, message: '请输入学号' }] }]"
            placeholder="请输入学号"
          />
        </a-form-item>
        <a-form-item label="用户名">
          <a-input
            v-decorator="['username']"
            placeholder="不填则默认使用学号"
          />
        </a-form-item>
        <a-form-item label="姓名">
          <a-input
            v-decorator="['realname', { rules: [{ required: true, message: '请输入姓名' }] }]"
            placeholder="请输入姓名"
          />
        </a-form-item>
        <a-form-item label="性别">
          <a-select v-decorator="['gender']" placeholder="请选择性别" allowClear>
            <a-select-option value="male">男</a-select-option>
            <a-select-option value="female">女</a-select-option>
            <a-select-option value="other">其他</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="手机号">
          <a-input
            v-decorator="['phone']"
            placeholder="请输入手机号"
          />
        </a-form-item>
        <a-form-item label="邮箱">
          <a-input
            v-decorator="['email']"
            placeholder="请输入邮箱"
          />
        </a-form-item>
        <a-form-item label="所属班级">
          <a-select v-decorator="['classId']" placeholder="请选择班级" allowClear>
            <a-select-option
              v-for="item in classList"
              :key="item.id"
              :value="item.id"
            >
              {{ item.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-decorator="['status']" placeholder="请选择状态" allowClear>
            <a-select-option value="active">在读</a-select-option>
            <a-select-option value="suspended">暂停</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      title="学员详情"
      :visible="detailVisible"
      :footer="null"
      :width="880"
      @cancel="detailVisible = false"
    >
      <div v-if="selectedStudent">
        <a-descriptions bordered :column="2">
          <a-descriptions-item label="学号">
            {{ selectedStudent.studentNo || selectedStudent.studentNumber || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="姓名">
            {{ selectedStudent.realname || selectedStudent.name || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="用户名">
            {{ selectedStudent.username || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="性别">
            {{ getGenderText(selectedStudent.gender || selectedStudent.sex) }}
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="getStatusColor(selectedStudent.status)">
              {{ getStatusText(selectedStudent.status) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="联系方式">
            {{ selectedStudent.phone || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="班级信息" :span="2">
            <div v-if="selectedStudent.classes && selectedStudent.classes.length > 0">
              <div
                v-for="item in selectedStudent.classes"
                :key="`${selectedStudent.id}-detail-${item.id || item.className}`"
              >
                {{ item.name || item.className }}
                <span v-if="item.joinDate"> {{ item.joinDate }}</span>
              </div>
            </div>
            <span v-else>未分班</span>
          </a-descriptions-item>
          <a-descriptions-item label="学习表现" :span="2">
            课程完成率：{{ selectedStudent.completionRate || 0 }}%，已完成课程：{{ selectedStudent.completedCourses || 0 }}/{{ selectedStudent.totalCourses || 0 }}
          </a-descriptions-item>
        </a-descriptions>
      </div>
    </a-modal>

    <a-modal
      title="分班"
      :visible="assignClassVisible"
      :confirmLoading="assignClassLoading"
      @ok="handleAssignClassOk"
      @cancel="assignClassVisible = false"
    >
      <div v-if="selectedStudentForAssign" style="margin-bottom: 16px;">
        为学员 {{ selectedStudentForAssign.realname || selectedStudentForAssign.name }} 分配班级
      </div>
      <a-checkbox-group v-model="selectedClassIds" style="width: 100%;">
        <a-row>
          <a-col
            v-for="item in classList"
            :key="item.id"
            :span="12"
            style="margin-bottom: 8px;"
          >
            <a-checkbox :value="item.id">
              {{ item.name }}
            </a-checkbox>
          </a-col>
        </a-row>
      </a-checkbox-group>
    </a-modal>

    <a-modal
      title="批量导入学员"
      :visible="importVisible"
      :confirmLoading="importLoading"
      :okButtonProps="{disabled: importFileList.length === 0}"
        @ok="handleImportOk"
      @cancel="importVisible = false"
    >
      <a-upload-dragger
        :fileList="importFileList"
        :beforeUpload="handleUploadFile"
        @remove="handleRemoveFile"
        accept=".xlsx,.xls,.csv"
      >
        <p class="ant-upload-drag-icon">
          <a-icon type="inbox" />
        </p>
        <p class="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p class="ant-upload-hint">支持 Excel 格式（.xlsx、.xls）和 CSV 格式</p>
      </a-upload-dragger>
      <div style="margin-top: 16px;">
        <a @click="downloadTemplate">下载模板文件</a>
      </div>
    </a-modal>
  </div>
</template>

<script>
import moment from 'moment'
import { deleteAction, getAction, postAction, putAction, uploadAction } from '@/api/manage'

function downloadCsv (filename, rows) {
    const csv = rows
        .map(columns => columns.map(value => {
            const text = String(value === undefined || value === null ? '' : value)
            return `"${text.replace(/"/g, '""')}"`
        }).join(','))
        .join('\r\n')

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
}

export default {
    name: 'StudentManagement',
    data () {
        return {
            loading: false,
            studentList: [],
            classList: [],
            filters: {
                classId: undefined,
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
            editingStudent: null,
            form: this.$form.createForm(this),
            detailVisible: false,
            selectedStudent: null,
            assignClassVisible: false,
            assignClassLoading: false,
            selectedStudentForAssign: null,
            selectedClassIds: [],
            importVisible: false,
            importLoading: false,
            importFileList: [],
            columns: [
                {
                    title: '头像',
                    key: 'avatar',
                    width: 72,
                    scopedSlots: { customRender: 'avatar' }
                },
                {
                    title: '学号',
                    dataIndex: 'studentNo',
                    key: 'studentNo',
                    customRender: (text, record) => record.studentNo || record.studentNumber || '-'
                },
                {
                    title: '姓名',
                    dataIndex: 'realname',
                    key: 'realname'
                },
                {
                    title: '性别',
                    key: 'gender',
                    width: 80,
                    scopedSlots: { customRender: 'gender' }
                },
                {
                    title: '状态',
                    key: 'status',
                    width: 100,
                    scopedSlots: { customRender: 'status' }
                },
                {
                    title: '班级信息',
                    key: 'classInfo',
                    width: 220,
                    scopedSlots: { customRender: 'classInfo' }
                },
                {
                    title: '联系方式',
                    key: 'contact',
                    width: 120,
                    scopedSlots: { customRender: 'contact' }
                },
                {
                    title: '学习表现',
                    key: 'performance',
                    width: 180,
                    scopedSlots: { customRender: 'performance' }
                },
                {
                    title: '操作',
                    key: 'action',
                    width: 280,
                    scopedSlots: { customRender: 'action' }
                }
            ]
        }
    },
    mounted () {
        this.loadClassList()
        this.loadStudentList()
    },
    methods: {
        async loadStudentList () {
            this.loading = true
            try {
                const response = await this.$http.get('/teaching/student/list', {
                    params: {
                        pageNo: this.pagination.current,
                        pageSize: this.pagination.pageSize,
                        classId: this.filters.classId || undefined,
                        status: this.filters.status || undefined
                    }
                })

                if (response && response.success) {
                    this.studentList = response.result.records || []
                    this.pagination.total = response.result.total || 0
                } else {
                    this.studentList = []
                    this.pagination.total = 0
                    this.$message.error((response && response.message) || '加载学员列表失败')
                }
            } catch (error) {
                this.studentList = []
                this.pagination.total = 0
                this.$message.error(error.message || '加载学员列表失败')
            } finally {
                this.loading = false
            }
        },
        async loadClassList () {
            try {
                const response = await getAction('/teaching/class/list', {
                    pageNo: 1,
                    pageSize: 200
                })
                if (response && response.success) {
                    this.classList = (response.result.records || []).map(item => ({
                        id: item.id,
                        name: item.name,
                        code: item.code,
                        capacity: item.capacity,
                        enrolledCount: item.enrolledCount
                    }))
                }
            } catch (error) {
                this.classList = []
            }
        },
        handleSearch () {
            this.pagination.current = 1
            this.loadStudentList()
        },
        handleTableChange (pagination) {
            this.pagination = {
                ...this.pagination,
                current: pagination.current,
                pageSize: pagination.pageSize
            }
            this.loadStudentList()
        },
        showCreateModal () {
            this.editingStudent = null
            this.modalVisible = true
            this.$nextTick(() => {
                this.form.resetFields()
                this.form.setFieldsValue({
                    status: 'active'
                })
            })
        },
        editStudent (record) {
            this.editingStudent = record
            this.modalVisible = true
            this.$nextTick(() => {
                this.form.setFieldsValue({
                    studentNo: record.studentNo || record.studentNumber,
                    username: record.username,
                    realname: record.realname || record.name,
                    gender: record.gender || this.mapSexToGender(record.sex),
                    phone: record.phone || undefined,
                    email: record.email || undefined,
                    classId: record.currentClass ? record.currentClass.id : undefined,
                    status: this.getEditableStatus(record)
                })
            })
        },
        handleModalCancel () {
            this.modalVisible = false
            this.editingStudent = null
        },
        handleModalOk () {
            this.form.validateFields(async (err, values) => {
                if (err) {
                    return
                }

                this.modalLoading = true
                const isEditing = Boolean(this.editingStudent)
                try {
                    const lifecycle = this.mapUiStatusToLifecycle(values.status)
                    const payload = {
                        studentNo: values.studentNo,
                        username: values.username || values.studentNo,
                        realname: values.realname,
                        sex: this.mapGenderToSex(values.gender),
                        phone: values.phone || null,
                        email: values.email || null,
                        status: lifecycle.status,
                        learningStatus: lifecycle.learningStatus
                    }

                    let studentId = ''
                    if (isEditing) {
                        const updateResponse = await putAction(`/student/${this.editingStudent.id}`, {
                            ...payload,
                            id: this.editingStudent.id
                        })
                        if (!updateResponse || !updateResponse.success) {
                            throw new Error((updateResponse && updateResponse.message) || '更新学员失败')
                        }
                        studentId = this.editingStudent.id
                    } else {
                        const createResponse = await postAction('/student', payload)
                        if (!createResponse || !createResponse.success) {
                            throw new Error((createResponse && createResponse.message) || '创建学员失败')
                        }
                        studentId = createResponse.result.id
                    }

                    if (values.classId) {
                        await postAction('/student/assignClass', {
                            studentId,
                            classIds: [values.classId]
                        })
                    }

                    this.modalVisible = false
                    this.editingStudent = null
                    this.$message.success(isEditing ? '学员更新成功' : '学员添加成功')
                    await this.loadStudentList()
                } catch (error) {
                    this.$message.error(error.message || '保存学员失败')
                } finally {
                    this.modalLoading = false
                }
            })
        },
        viewStudentDetail (record) {
            this.selectedStudent = record
            this.detailVisible = true
        },
        assignClass (record) {
            this.selectedStudentForAssign = record
            this.selectedClassIds = (record.classes || []).map(item => item.id).filter(Boolean)
            this.assignClassVisible = true
        },
        async handleAssignClassOk () {
            if (!this.selectedStudentForAssign || this.selectedClassIds.length === 0) {
                this.$message.warning('请选择至少一个班级')
                return
            }

            this.assignClassLoading = true
            try {
                const response = await postAction('/student/assignClass', {
                    studentId: this.selectedStudentForAssign.id,
                    classIds: this.selectedClassIds
                })

                if (response && response.success) {
                    this.$message.success('分班成功')
                    this.assignClassVisible = false
                    await this.loadStudentList()
                } else {
                    this.$message.error((response && response.message) || '分班失败')
                }
            } catch (error) {
                this.$message.error(error.message || '分班失败')
            } finally {
                this.assignClassLoading = false
            }
        },
        deleteStudent (record) {
            this.$confirm({
                title: '确认删除学员',
                content: `确定删除学员“${record.realname || record.name}”吗？`,
                onOk: async () => {
                    try {
                        const response = await deleteAction(`/student/${record.id}`)
                        if (response && response.success) {
                            this.$message.success('学员删除成功')
                            await this.loadStudentList()
                        } else {
                            this.$message.error((response && response.message) || '删除学员失败')
                        }
                    } catch (error) {
                        this.$message.error(error.message || '删除学员失败')
                    }
                }
            })
        },
        resetStudentPassword (record) {
            const displayName = record.realname || record.name || record.username || record.studentNo || '该学员'
            this.$confirm({
                title: '重置密码',
                content: `确定要将 ${displayName} 的密码重置为 123456 吗？`,
                onOk: async () => {
                    try {
                        const response = await putAction(`/student/${record.id}/reset-password`, {
                            password: '123456'
                        })
                        if (response && response.success) {
                            this.$message.success('密码已重置为：123456')
                        } else {
                            this.$message.error((response && response.message) || '重置密码失败')
                        }
                    } catch (error) {
                        this.$message.error(error.message || '重置密码失败')
                    }
                }
            })
        },
        showBatchImportModal () {
            this.importVisible = true
            this.importFileList = []
        },
        handleUploadFile (file) {
            this.importFileList = [file]
            return false
        },
        handleRemoveFile () {
            this.importFileList = []
        },
        async handleImportOk () {
            if (this.importFileList.length === 0) {
                this.$message.warning('请选择导入文件')
                return
            }
            const file = this.importFileList[0]
            const formData = new FormData()
            formData.append('file', file.originFileObj || file)
            this.importLoading = true
            try {
                const response = await uploadAction('/student/batch-import', formData)
                if (response && response.success) {
                    const data = response.result || {}
                    const success = data.success || 0
                    const failed = data.failed || 0
                    const skipped = data.skipped || 0
                    const total = data.total || (success + failed + skipped)
                    this.$message.success('导入完成：共 ' + total + ' 条，成功 ' + success + '，失败 ' + failed + '，跳过 ' + skipped)
                    if (success > 0) {
                        this.importVisible = false
                        this.importFileList = []
                        this.loadStudentList()
                    }
                } else {
                    this.$message.error((response && response.message) || '导入失败')
                }
            } catch (error) {
                this.$message.error(error.message || '导入失败，请检查文件格式')
            } finally {
                this.importLoading = false
            }
        },
        downloadTemplate () {
            const rows = [
                ['学号', '用户名', '姓名', '性别(male/female/other)', '手机号', '邮箱']
            ]
            downloadCsv('学员导入模板.csv', rows)
        },
        exportStudents () {
            const rows = [
                ['学号', '姓名', '性别', '状态', '班级信息', '联系方式', '课程完成率', '已完成课程']
            ]

            this.studentList.forEach(record => {
                rows.push([
                    record.studentNo || record.studentNumber || '',
                    record.realname || record.name || '',
                    this.getGenderText(record.gender || record.sex),
                    this.getStatusText(record.status),
                    (record.classes || []).map(item => item.name || item.className).join('；'),
                    record.phone || '',
                    `${record.completionRate || 0}%`,
                    `${record.completedCourses || 0}/${record.totalCourses || 0}`
                ])
            })

            downloadCsv(`学员列表_${moment().format('YYYY-MM-DD')}.csv`, rows)
            this.$message.success('学员数据已导出')
        },
        getStatusColor (status) {
            const normalized = String(status || '').toLowerCase()
            if (normalized === '2' || normalized === 'paused' || normalized === 'suspended' || normalized === 'inactive') {
                return 'orange'
            }
            if (normalized === '3' || normalized === 'need_attention') {
                return 'red'
            }
            return 'green'
        },
        getStatusText (status) {
            const normalized = String(status || '').toLowerCase()
            if (normalized === '2' || normalized === 'paused' || normalized === 'suspended' || normalized === 'inactive') {
                return '暂停'
            }
            if (normalized === '3' || normalized === 'need_attention') {
                return '需关注'
            }
            return '在读'
        },
        getEditableStatus (record) {
            const learningStatus = String(record && record.learningStatus ? record.learningStatus : '').trim().toLowerCase()
            if (learningStatus === 'need_attention') {
                return 'need_attention'
            }
            if (learningStatus === 'paused' || learningStatus === 'suspended') {
                return 'suspended'
            }

            const normalizedStatus = String(record && record.status ? record.status : '').trim().toLowerCase()
            if (normalizedStatus === 'need_attention' || normalizedStatus === 'suspended') {
                return normalizedStatus
            }
            if (normalizedStatus === '2') {
                return 'suspended'
            }
            if (normalizedStatus === '3') {
                return 'need_attention'
            }
            return 'active'
        },
        mapUiStatusToLifecycle (status) {
            const normalized = String(status || 'active').trim().toLowerCase()
            if (normalized === 'need_attention') {
                return {
                    status: 3,
                    learningStatus: 'need_attention'
                }
            }
            if (normalized === 'paused' || normalized === 'suspended' || normalized === 'inactive') {
                return {
                    status: 2,
                    learningStatus: 'paused'
                }
            }
            return {
                status: 1,
                learningStatus: 'normal'
            }
        },
        getGenderText (value) {
            const normalized = String(value === undefined || value === null ? '' : value).toLowerCase()
            if (normalized === '1' || normalized === 'male') {
                return '男'
            }
            if (normalized === '2' || normalized === 'female') {
                return '女'
            }
            if (normalized === '0' || normalized === 'other') {
                return '其他'
            }
            return '-'
        },
        mapGenderToSex (gender) {
            if (gender === 'male') return 1
            if (gender === 'female') return 2
            if (gender === 'other') return 0
            return null
        },
        mapSexToGender (sex) {
            const normalized = Number(sex)
            if (normalized === 1) return 'male'
            if (normalized === 2) return 'female'
            if (normalized === 0) return 'other'
            return undefined
        }
    }
}
</script>

<style scoped>
.student-management {
  padding: 24px;
}

.page-header h2 {
  margin-bottom: 0;
}

.toolbar {
  margin: 16px 0;
}

.toolbar-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.class-item + .class-item {
  margin-top: 6px;
}

.class-date {
  color: #999;
  font-size: 12px;
}

.placeholder-text {
  color: #999;
}
</style>
