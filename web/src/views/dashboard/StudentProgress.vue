<template>
  <div class="student-progress">
    <a-card title="学生学习进度报告" :bordered="false">
      <!-- 筛选条件 -->
      <div class="filter-section">
        <a-form layout="inline">
          <a-form-item label="班级">
            <a-select v-model="filters.classId" style="width: 150px;" allowClear @change="loadStudents">
              <a-select-option value="">全部班级</a-select-option>
              <a-select-option v-for="cls in classList" :key="cls.id" :value="cls.id">
                {{ cls.name }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="课程">
            <a-select v-model="filters.courseId" style="width: 150px;" allowClear @change="loadData">
              <a-select-option value="">全部课程</a-select-option>
              <a-select-option v-for="course in courseList" :key="course.id" :value="course.id">
                {{ course.name }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="时间范围">
            <a-range-picker v-model="filters.dateRange" @change="loadData" />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" @click="loadData">
              <a-icon type="search" />
              查询
            </a-button>
          </a-form-item>
        </a-form>
      </div>

      <!-- 学生列表 -->
      <a-table
        :columns="columns"
        :dataSource="studentList"
        :pagination="pagination"
        :loading="loading"
        @change="handleTableChange"
        :expandedRowRender="expandedRowRender"
        :scroll="{ x: 1200 }"
      >
        <template slot="avatar" slot-scope="text, record">
          <a-avatar :src="record.avatar" size="small">
            {{ record.name.charAt(0) }}
          </a-avatar>
        </template>

        <template slot="overallProgress" slot-scope="text">
          <a-progress :percent="text" size="small" :status="getProgressStatus(text)" />
        </template>

        <template slot="homeworkCompletion" slot-scope="text">
          <span :style="{ color: getCompletionColor(text) }">
            {{ text }}%
          </span>
        </template>

        <template slot="avgScore" slot-scope="text">
          <a-tag :color="getScoreColor(text)">
            {{ text }}分
          </a-tag>
        </template>

        <template slot="status" slot-scope="text">
          <a-badge
            :status="getStudentStatusBadge(text)"
            :text="getStudentStatusText(text)"
          />
        </template>

        <template slot="action" slot-scope="text, record">
          <a-button-group size="small">
            <a-button type="primary" @click="viewStudentDetail(record)">
              详情
            </a-button>
            <a-button @click="generateStudentReport(record)">
              报告
            </a-button>
            <a-button @click="contactStudent(record)">
              联系
            </a-button>
          </a-button-group>
        </template>
      </a-table>
    </a-card>

    <!-- 学生详情模态框 -->
    <a-modal
      title="学生学习详情"
      :visible="detailVisible"
      :width="1000"
      @cancel="detailVisible = false"
      :footer="null"
    >
      <div v-if="selectedStudent" class="student-detail">
        <!-- 基本信息 -->
        <a-descriptions :title="selectedStudent.name" bordered>
          <a-descriptions-item label="学号">{{ selectedStudent.studentId }}</a-descriptions-item>
          <a-descriptions-item label="班级">{{ selectedStudent.className }}</a-descriptions-item>
          <a-descriptions-item label="入学时间">{{ selectedStudent.enrollDate }}</a-descriptions-item>
          <a-descriptions-item label="总体进度">
            <a-progress :percent="selectedStudent.overallProgress" size="small" />
          </a-descriptions-item>
          <a-descriptions-item label="平均分数">
            <a-tag :color="getScoreColor(selectedStudent.avgScore)">
              {{ selectedStudent.avgScore }}分
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="学习状态">
            <a-badge
              :status="getStudentStatusBadge(selectedStudent.status)"
              :text="getStudentStatusText(selectedStudent.status)"
            />
          </a-descriptions-item>
        </a-descriptions>

        <!-- 学习数据图表 -->
        <div class="detail-charts">
          <a-row :gutter="16">
            <a-col :span="12">
              <h4>学习进度趋势</h4>
              <div id="studentProgressChart" style="height: 300px;"></div>
            </a-col>
            <a-col :span="12">
              <h4>各科目成绩分布</h4>
              <div id="studentScoreChart" style="height: 300px;"></div>
            </a-col>
          </a-row>
        </div>

        <!-- 作业完成情况 -->
        <div class="homework-status">
          <h4>作业完成情况</h4>
          <a-table
            :columns="homeworkColumns"
            :dataSource="selectedStudent.homeworkList"
            :pagination="false"
            size="small"
            :scroll="{ y: 200 }"
          >
            <template slot="status" slot-scope="text">
              <a-tag :color="getHomeworkStatusColor(text)">
                {{ getHomeworkStatusText(text) }}
              </a-tag>
            </template>
            <template slot="score" slot-scope="text">
              <span v-if="text !== null">{{ text }}分</span>
              <span v-else style="color: #999;">待评分</span>
            </template>
          </a-table>
        </div>

        <!-- 学习建议 -->
        <div class="learning-suggestions">
          <h4>学习建议</h4>
          <a-alert
            v-for="suggestion in selectedStudent.suggestions"
            :key="suggestion.id"
            :message="suggestion.title"
            :description="suggestion.content"
            :type="suggestion.type"
            show-icon
            style="margin-bottom: 8px;"
          />
        </div>
      </div>
    </a-modal>

    <!-- 报告生成模态框 -->
    <a-modal
      title="生成学习报告"
      :visible="reportVisible"
      @ok="generateReport"
      @cancel="reportVisible = false"
      :confirmLoading="reportLoading"
    >
      <a-form :form="reportForm" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="报告类型">
          <a-select v-decorator="['reportType', { initialValue: 'comprehensive' }]">
            <a-select-option value="comprehensive">综合报告</a-select-option>
            <a-select-option value="progress">学习进度报告</a-select-option>
            <a-select-option value="homework">作业完成报告</a-select-option>
            <a-select-option value="performance">成绩分析报告</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="时间范围">
          <a-range-picker v-decorator="['dateRange', { rules: [{ required: true, message: '请选择时间范围' }] }]" />
        </a-form-item>
        <a-form-item label="包含内容">
          <a-checkbox-group v-decorator="['includeItems', { initialValue: ['basic', 'progress', 'homework'] }]">
            <a-checkbox value="basic">基本信息</a-checkbox>
            <a-checkbox value="progress">学习进度</a-checkbox>
            <a-checkbox value="homework">作业情况</a-checkbox>
            <a-checkbox value="scores">成绩分析</a-checkbox>
            <a-checkbox value="suggestions">学习建议</a-checkbox>
          </a-checkbox-group>
        </a-form-item>
        <a-form-item label="输出格式">
          <a-radio-group v-decorator="['format', { initialValue: 'pdf' }]">
            <a-radio value="pdf">PDF</a-radio>
            <a-radio value="word">Word</a-radio>
            <a-radio value="html">网页</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>

import { permissionMixin } from '@/directive/permission'
import * as echarts from 'echarts'
import moment from 'moment'

export default {
    name: 'StudentProgress',
    mixins: [permissionMixin],

    data () {
        return {
            loading: false,

            // 筛选条件
            filters: {
                classId: '',
                courseId: '',
                dateRange: []
            },

            // 基础数据
            classList: [
                { id: '1', name: '编程启蒙班' },
                { id: '2', name: 'Python基础班' },
                { id: '3', name: 'Web开发班' }
            ],

            courseList: [
                { id: '1', name: 'Scratch编程' },
                { id: '2', name: 'Python基础' },
                { id: '3', name: 'Web前端' },
                { id: '4', name: '算法思维' }
            ],

            // 表格配置
            columns: [
                {
                    title: '头像',
                    key: 'avatar',
                    width: 60,
                    scopedSlots: { customRender: 'avatar' }
                },
                {
                    title: '姓名',
                    dataIndex: 'name',
                    key: 'name',
                    width: 100,
                    fixed: 'left'
                },
                {
                    title: '学号',
                    dataIndex: 'studentId',
                    key: 'studentId',
                    width: 120
                },
                {
                    title: '班级',
                    dataIndex: 'className',
                    key: 'className',
                    width: 100
                },
                {
                    title: '总体进度',
                    dataIndex: 'overallProgress',
                    key: 'overallProgress',
                    width: 120,
                    scopedSlots: { customRender: 'overallProgress' }
                },
                {
                    title: '作业完成率',
                    dataIndex: 'homeworkCompletion',
                    key: 'homeworkCompletion',
                    width: 100,
                    scopedSlots: { customRender: 'homeworkCompletion' }
                },
                {
                    title: '平均分',
                    dataIndex: 'avgScore',
                    key: 'avgScore',
                    width: 80,
                    scopedSlots: { customRender: 'avgScore' }
                },
                {
                    title: '在线时长',
                    dataIndex: 'onlineHours',
                    key: 'onlineHours',
                    width: 100,
                    render: (text) => `${text}小时`
                },
                {
                    title: '状态',
                    dataIndex: 'status',
                    key: 'status',
                    width: 100,
                    scopedSlots: { customRender: 'status' }
                },
                {
                    title: '操作',
                    key: 'action',
                    width: 150,
                    fixed: 'right',
                    scopedSlots: { customRender: 'action' }
                }
            ],

            studentList: [],
            pagination: {
                current: 1,
                pageSize: 10,
                total: 0,
                showQuickJumper: true,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条记录`
            },

            // 作业列表配置
            homeworkColumns: [
                { title: '作业名称', dataIndex: 'title', key: 'title' },
                { title: '课程', dataIndex: 'course', key: 'course', width: 100 },
                { title: '提交时间', dataIndex: 'submitTime', key: 'submitTime', width: 150 },
                { title: '状态', dataIndex: 'status', key: 'status', width: 80, scopedSlots: { customRender: 'status' } },
                { title: '分数', dataIndex: 'score', key: 'score', width: 80, scopedSlots: { customRender: 'score' } }
            ],

            // 模态框
            detailVisible: false,
            selectedStudent: null,

            reportVisible: false,
            reportLoading: false,
            reportForm: this.$form.createForm(this),

            // 图表实例
            charts: {}
        }
    },

    mounted () {
        this.loadData()
    },

    beforeDestroy () {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.dispose()
            }
        })
    },

    methods: {
    // 加载数据
        async loadData () {
            this.loading = true
            try {
                // 模拟学生数据
                this.studentList = [
                    {
                        key: '1',
                        name: '张小明',
                        studentId: 'S2024001',
                        className: '编程启蒙班',
                        overallProgress: 85,
                        homeworkCompletion: 92,
                        avgScore: 88.5,
                        onlineHours: 45,
                        status: 'active',
                        avatar: '/avatars/student001.jpg',
                        enrollDate: '2024-01-15',
                        lastActivity: '2024-01-20 10:30:00',
                        homeworkList: [
                            { key: '1', title: 'Scratch动画制作', course: 'Scratch', submitTime: '2024-01-18 16:30', status: 'completed', score: 95 },
                            { key: '2', title: '小游戏设计', course: 'Scratch', submitTime: '2024-01-19 20:15', status: 'completed', score: 88 },
                            { key: '3', title: '条件语句练习', course: 'Scratch', submitTime: null, status: 'pending', score: null }
                        ],
                        suggestions: [
                            { id: '1', type: 'success', title: '学习进度良好', content: '继续保持当前的学习节奏，可以尝试更有挑战性的项目。' },
                            { id: '2', type: 'info', title: '建议增加练习', content: '在循环结构方面可以多做一些练习题。' }
                        ]
                    },
                    {
                        key: '2',
                        name: '李小红',
                        studentId: 'S2024002',
                        className: 'Python基础班',
                        overallProgress: 78,
                        homeworkCompletion: 85,
                        avgScore: 82.3,
                        onlineHours: 38,
                        status: 'active',
                        avatar: '/avatars/student002.jpg',
                        enrollDate: '2024-01-10',
                        lastActivity: '2024-01-20 09:15:00',
                        homeworkList: [
                            { key: '1', title: 'Python基础语法', course: 'Python', submitTime: '2024-01-17 14:20', status: 'completed', score: 85 },
                            { key: '2', title: '函数定义练习', course: 'Python', submitTime: '2024-01-19 11:45', status: 'completed', score: 78 },
                            { key: '3', title: '面向对象编程', course: 'Python', submitTime: null, status: 'pending', score: null }
                        ],
                        suggestions: [
                            { id: '1', type: 'warning', title: '需要加强理解', content: '在面向对象编程概念上需要多花时间理解。' },
                            { id: '2', type: 'info', title: '增加实践', content: '建议多做编程实践项目。' }
                        ]
                    },
                    {
                        key: '3',
                        name: '王小刚',
                        studentId: 'S2024003',
                        className: 'Web开发班',
                        overallProgress: 65,
                        homeworkCompletion: 72,
                        avgScore: 75.8,
                        onlineHours: 28,
                        status: 'warning',
                        avatar: '/avatars/student003.jpg',
                        enrollDate: '2024-01-08',
                        lastActivity: '2024-01-19 15:20:00',
                        homeworkList: [
                            { key: '1', title: 'HTML基础结构', course: 'Web', submitTime: '2024-01-16 19:30', status: 'completed', score: 80 },
                            { key: '2', title: 'CSS样式设计', course: 'Web', submitTime: '2024-01-18 21:10', status: 'late', score: 70 },
                            { key: '3', title: 'JavaScript交互', course: 'Web', submitTime: null, status: 'overdue', score: null }
                        ],
                        suggestions: [
                            { id: '1', type: 'error', title: '学习进度落后', content: '当前进度明显落后，建议增加学习时间。' },
                            { id: '2', type: 'warning', title: '作业提交延迟', content: '最近几次作业都有延迟提交，请注意时间管理。' }
                        ]
                    }
                ]

                this.pagination.total = this.studentList.length
            } catch (error) {
                console.error('加载数据失败:', error)
                this.$message.error('数据加载失败')
            } finally {
                this.loading = false
            }
        },

        // 加载学生列表
        loadStudents () {
            this.loadData()
        },

        // 表格变化处理
        handleTableChange (pagination) {
            this.pagination = pagination
            this.loadData()
        },

        // 展开行渲染
        expandedRowRender (record) {
            return this.$createElement('div', { style: { padding: '16px', background: '#fafafa' } }, [
                this.$createElement('a-row', { props: { gutter: 16 } }, [
                    this.$createElement('a-col', { props: { span: 8 } }, [
                        this.$createElement('h5', '最近活动'),
                        this.$createElement('p', `最后登录：${record.lastActivity || '未知'}`),
                        this.$createElement('p', `入学时间：${record.enrollDate || '未知'}`)
                    ]),
                    this.$createElement('a-col', { props: { span: 8 } }, [
                        this.$createElement('h5', '学习统计'),
                        this.$createElement('p', `在线时长：${record.onlineHours}小时`),
                        this.$createElement('p', `完成作业：${Math.round(record.homeworkCompletion * record.homeworkList.length / 100)}/${record.homeworkList.length}`)
                    ]),
                    this.$createElement('a-col', { props: { span: 8 } }, [
                        this.$createElement('h5', '快速操作'),
                        this.$createElement('a-button-group', { props: { size: 'small' } }, [
                            this.$createElement('a-button', { on: { click: () => this.sendMessage(record) } }, '发消息'),
                            this.$createElement('a-button', { on: { click: () => this.scheduleClass(record) } }, '约课')
                        ])
                    ])
                ])
            ])
        },

        // 获取进度状态
        getProgressStatus (progress) {
            if (progress >= 80) return 'success'
            if (progress >= 60) return 'active'
            return 'exception'
        },

        // 获取完成率颜色
        getCompletionColor (completion) {
            if (completion >= 90) return '#52c41a'
            if (completion >= 70) return '#faad14'
            return '#f5222d'
        },

        // 获取分数颜色
        getScoreColor (score) {
            if (score >= 90) return 'green'
            if (score >= 80) return 'blue'
            if (score >= 70) return 'orange'
            return 'red'
        },

        // 获取学生状态徽章
        getStudentStatusBadge (status) {
            const statusMap = {
                active: 'processing',
                warning: 'warning',
                inactive: 'default'
            }
            return statusMap[status] || 'default'
        },

        // 获取学生状态文本
        getStudentStatusText (status) {
            const statusMap = {
                active: '学习中',
                warning: '需关注',
                inactive: '未活跃'
            }
            return statusMap[status] || '未知'
        },

        // 获取作业状态颜色
        getHomeworkStatusColor (status) {
            const colorMap = {
                completed: 'green',
                pending: 'blue',
                late: 'orange',
                overdue: 'red'
            }
            return colorMap[status] || 'default'
        },

        // 获取作业状态文本
        getHomeworkStatusText (status) {
            const textMap = {
                completed: '已完成',
                pending: '进行中',
                late: '迟交',
                overdue: '逾期'
            }
            return textMap[status] || '未知'
        },

        // 查看学生详情
        async viewStudentDetail (student) {
            this.selectedStudent = student
            this.detailVisible = true

            this.$nextTick(() => {
                this.initStudentCharts()
            })
        },

        // 初始化学生详情图表
        initStudentCharts () {
            this.initStudentProgressChart()
            this.initStudentScoreChart()
        },

        // 学生进度图表
        initStudentProgressChart () {
            const chartDom = document.getElementById('studentProgressChart')
            if (!chartDom) return

            if (this.charts.studentProgress) {
                this.charts.studentProgress.dispose()
            }

            this.charts.studentProgress = echarts.init(chartDom)

            const option = {
                tooltip: { trigger: 'axis' },
                xAxis: {
                    type: 'category',
                    data: ['第1周', '第2周', '第3周', '第4周', '第5周', '第6周']
                },
                yAxis: { type: 'value', max: 100 },
                series: [{
                    name: '学习进度',
                    type: 'line',
                    data: [20, 35, 50, 65, 75, 85],
                    smooth: true,
                    areaStyle: { opacity: 0.3 }
                }]
            }

            this.charts.studentProgress.setOption(option)
        },

        // 学生成绩图表
        initStudentScoreChart () {
            const chartDom = document.getElementById('studentScoreChart')
            if (!chartDom) return

            if (this.charts.studentScore) {
                this.charts.studentScore.dispose()
            }

            this.charts.studentScore = echarts.init(chartDom)

            const option = {
                tooltip: { trigger: 'item' },
                series: [{
                    name: '各科成绩',
                    type: 'pie',
                    radius: '60%',
                    data: [
                        { value: 95, name: 'Scratch' },
                        { value: 88, name: 'Python' },
                        { value: 82, name: 'Web开发' },
                        { value: 78, name: '算法思维' }
                    ]
                }]
            }

            this.charts.studentScore.setOption(option)
        },

        // 生成学生报告
        generateStudentReport (student) {
            this.selectedStudent = student
            this.reportVisible = true
        },

        // 生成报告
        generateReport () {
            this.reportForm.validateFields(async (err, values) => {
                if (!err) {
                    this.reportLoading = true
                    try {
                        // 模拟报告生成
                        await new Promise(resolve => setTimeout(resolve, 2000))

                        const reportData = {
                            student: this.selectedStudent,
                            ...values,
                            generateTime: moment().format('YYYY-MM-DD HH:mm:ss')
                        }

                        // 下载报告
                        this.downloadReport(reportData)
                        this.$message.success('报告生成成功')
                        this.reportVisible = false
                    } catch (error) {
                        console.error('报告生成失败:', error)
                        this.$message.error('报告生成失败')
                    } finally {
                        this.reportLoading = false
                    }
                }
            })
        },

        // 下载报告
        downloadReport (reportData) {
            const fileName = `学习报告_${reportData.student.name}_${moment().format('YYYY-MM-DD')}.${reportData.format}`
            const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = fileName
            link.click()
            window.URL.revokeObjectURL(url)
        },

        // 联系学生
        contactStudent (student) {
            this.$message.info(`联系学生：${student.name}`)
        },

        // 发送消息
        sendMessage (student) {
            this.$message.info(`发送消息给：${student.name}`)
        },

        // 约课
        scheduleClass (student) {
            this.$message.info(`为 ${student.name} 安排课程`)
        }
    }
}
</script>

<style lang="less" scoped>
.student-progress {
  .filter-section {
    margin-bottom: 16px;
    padding: 16px;
    background: #fafafa;
    border-radius: 4px;
  }

  .student-detail {
    .detail-charts {
      margin: 24px 0;

      h4 {
        margin-bottom: 16px;
        color: #1890ff;
      }
    }

    .homework-status {
      margin: 24px 0;

      h4 {
        margin-bottom: 16px;
        color: #1890ff;
      }
    }

    .learning-suggestions {
      margin-top: 24px;

      h4 {
        margin-bottom: 16px;
        color: #1890ff;
      }
    }
  }
}
</style>
