<template>
  <div class="homework-detail-view">
    <!-- 作业头部信息 -->
    <div class="homework-header">
      <div class="header-content">
        <div class="homework-basic-info">
          <h2 class="homework-title">
            {{ homework.title }}
            <a-tag :color="getStatusColor(homework.status)">
              {{ getStatusText(homework.status) }}
            </a-tag>
          </h2>

          <div class="homework-meta">
            <div class="meta-row">
              <span class="meta-item">
                <a-icon type="book" />
                {{ getSubjectText(homework.subject) }}
              </span>
              <span class="meta-item">
                <a-icon type="signal" />
                {{ getDifficultyText(homework.difficulty) }}
              </span>
              <span class="meta-item">
                <a-icon type="clock-circle" />
                截止时间：{{ formatDeadline(homework.deadline) }}
              </span>
            </div>
            <div class="meta-row">
              <span class="meta-item">
                <a-icon type="calendar" />
                发布时间：{{ formatTime(homework.publishTime) }}
              </span>
              <span class="meta-item">
                <a-icon type="star" />
                总分：{{ homework.totalScore }}分
              </span>
            </div>
          </div>

          <div class="homework-description">
            {{ homework.description }}
          </div>
        </div>

        <div class="homework-actions">
          <a-button-group>
            <a-button icon="edit" @click="$emit('edit', homework)">
              编辑作业
            </a-button>
            <a-button icon="form" @click="$emit('grade', homework)">
              评分管理
            </a-button>
            <a-button icon="download" @click="exportData">
              导出数据
            </a-button>
          </a-button-group>
        </div>
      </div>

      <!-- 进度统计 -->
      <div class="progress-stats">
        <a-row :gutter="16">
          <a-col :span="6">
            <a-statistic title="目标学生" :value="homework.totalStudents" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="已提交" :value="homework.submissionCount" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="已评分" :value="homework.gradedCount" />
          </a-col>
          <a-col :span="6">
            <a-statistic title="平均分" :value="homework.averageScore" suffix="分" />
          </a-col>
        </a-row>

        <div class="progress-bars">
          <div class="progress-item">
            <span class="progress-label">提交进度</span>
            <a-progress
              :percent="getSubmissionProgress()"
              status="active"
              :format="percent => `${homework.submissionCount}/${homework.totalStudents}`"
            />
          </div>
          <div class="progress-item">
            <span class="progress-label">评分进度</span>
            <a-progress
              :percent="getGradingProgress()"
              status="active"
              :format="percent => `${homework.gradedCount}/${homework.submissionCount}`"
            />
          </div>
        </div>
      </div>
    </div>

    <a-divider />

    <!-- 详细内容标签页 -->
    <a-tabs v-model="activeTab" size="large">
      <!-- 作业要求 -->
      <a-tab-pane key="requirements" tab="作业要求">
        <div class="requirements-content">
          <div class="section">
            <h4>详细要求</h4>
            <div class="requirements-text">
              {{ homework.requirements || '暂无详细要求说明' }}
            </div>
          </div>

          <div class="section" v-if="homework.gradingCriteria && homework.gradingCriteria.length > 0">
            <h4>评分标准</h4>
            <a-table
              :columns="criteriaColumns"
              :data-source="homework.gradingCriteria"
              :pagination="false"
              size="small"
            >
              <template #score="text">
                {{ text }}分
              </template>
            </a-table>
          </div>

          <div class="section" v-if="homework.allowedFormats && homework.allowedFormats.length > 0">
            <h4>提交要求</h4>
            <div class="submission-requirements">
              <div class="requirement-item">
                <strong>允许文件格式：</strong>
                <a-tag v-for="format in homework.allowedFormats" :key="format" style="margin-left: 4px;">
                  {{ getFormatText(format) }}
                </a-tag>
              </div>
              <div class="requirement-item">
                <strong>文件大小限制：</strong>
                {{ homework.maxFileSize }}MB
              </div>
              <div class="requirement-item">
                <strong>最多文件数：</strong>
                {{ homework.maxFiles }}个
              </div>
              <div class="requirement-item" v-if="homework.submissionLimit === 'limited'">
                <strong>提交次数限制：</strong>
                最多{{ homework.maxSubmissions }}次
              </div>
            </div>
          </div>

          <div class="section" v-if="homework.referenceFiles && homework.referenceFiles.length > 0">
            <h4>参考资料</h4>
            <div class="reference-files">
              <div
                v-for="file in homework.referenceFiles"
                :key="file.uid"
                class="file-item"
                @click="downloadFile(file)"
              >
                <a-icon type="file" />
                <span class="file-name">{{ file.name }}</span>
                <span class="file-size">{{ formatFileSize(file.size) }}</span>
              </div>
            </div>
          </div>
        </div>
      </a-tab-pane>

      <!-- 提交情况 -->
      <a-tab-pane key="submissions" tab="提交情况">
        <div class="submissions-content">
          <!-- 筛选工具栏 -->
          <div class="submission-filters">
            <a-row :gutter="16">
              <a-col :span="8">
                <a-input-search
                  v-model="submissionSearch"
                  placeholder="搜索学生姓名或学号"
                  @search="filterSubmissions"
                />
              </a-col>
              <a-col :span="6">
                <a-select
                  v-model="submissionStatus"
                  placeholder="提交状态"
                  style="width: 100%"
                  allow-clear
                  @change="filterSubmissions"
                >
                  <a-select-option value="">全部状态</a-select-option>
                  <a-select-option value="submitted">已提交</a-select-option>
                  <a-select-option value="not_submitted">未提交</a-select-option>
                  <a-select-option value="late">迟交</a-select-option>
                  <a-select-option value="graded">已评分</a-select-option>
                </a-select>
              </a-col>
              <a-col :span="6">
                <a-select
                  v-model="submissionClass"
                  placeholder="班级筛选"
                  style="width: 100%"
                  allow-clear
                  @change="filterSubmissions"
                >
                  <a-select-option value="">全部班级</a-select-option>
                  <a-select-option value="class1">一年级1班</a-select-option>
                  <a-select-option value="class2">一年级2班</a-select-option>
                  <a-select-option value="class3">二年级1班</a-select-option>
                </a-select>
              </a-col>
              <a-col :span="4">
                <a-button type="primary" @click="batchGrade">
                  批量评分
                </a-button>
              </a-col>
            </a-row>
          </div>

          <!-- 提交列表 -->
          <a-table
            :columns="submissionColumns"
            :data-source="filteredSubmissions"
            :pagination="submissionPagination"
            row-key="id"
            :row-selection="submissionRowSelection"
          >
            <template #studentName="text, record">
              <div class="student-info">
                <a-avatar size="small" :src="record.avatar">
                  {{ record.studentName[0] }}
                </a-avatar>
                <div class="student-details">
                  <div class="student-name">{{ record.studentName }}</div>
                  <div class="student-id">{{ record.studentId }}</div>
                </div>
              </div>
            </template>

            <template #status="text, record">
              <a-tag :color="getSubmissionStatusColor(record.status)">
                {{ getSubmissionStatusText(record.status) }}
              </a-tag>
            </template>

            <template #submitTime="text">
              {{ text ? formatTime(text) : '-' }}
            </template>

            <template #score="text, record">
              <span v-if="record.score !== null" :class="getScoreClass(record.score)">
                {{ record.score }}分
              </span>
              <span v-else class="no-score">未评分</span>
            </template>

            <template #actions="text, record">
              <a-button-group size="small">
                <a-button
                  v-if="record.status === 'submitted' || record.status === 'graded'"
                  icon="file-text"
                  @click="viewSubmission(record)"
                >
                  查看
                </a-button>
                <a-button
                  v-if="record.status === 'submitted' || record.status === 'graded'"
                  icon="edit"
                  @click="gradeSubmission(record)"
                >
                  评分
                </a-button>
                <a-button
                  v-if="record.status === 'not_submitted'"
                  icon="message"
                  @click="sendReminder(record)"
                >
                  提醒
                </a-button>
              </a-button-group>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- 统计分析 -->
      <a-tab-pane key="statistics" tab="统计分析">
        <div class="statistics-content">
          <!-- 总体统计 -->
          <div class="stats-overview">
            <a-row :gutter="16">
              <a-col :span="6">
                <a-card size="small">
                  <a-statistic
                    title="提交率"
                    :value="getSubmissionRate()"
                    suffix="%"
                    :value-style="{ color: getSubmissionRate() >= 80 ? '#3f8600' : '#cf1322' }"
                  />
                </a-card>
              </a-col>
              <a-col :span="6">
                <a-card size="small">
                  <a-statistic
                    title="及格率"
                    :value="getPassRate()"
                    suffix="%"
                    :value-style="{ color: getPassRate() >= 70 ? '#3f8600' : '#cf1322' }"
                  />
                </a-card>
              </a-col>
              <a-col :span="6">
                <a-card size="small">
                  <a-statistic
                    title="优秀率"
                    :value="getExcellentRate()"
                    suffix="%"
                    :value-style="{ color: '#1890ff' }"
                  />
                </a-card>
              </a-col>
              <a-col :span="6">
                <a-card size="small">
                  <a-statistic
                    title="迟交人数"
                    :value="getLateSubmissionCount()"
                    :value-style="{ color: '#cf1322' }"
                  />
                </a-card>
              </a-col>
            </a-row>
          </div>

          <!-- 成绩分布图表 -->
          <div class="score-distribution">
            <h4>成绩分布</h4>
            <div class="chart-container">
              <!-- 这里可以集成图表库如ECharts -->
              <div class="chart-placeholder">
                <a-icon type="bar-chart" style="font-size: 48px; color: #ccc;" />
                <p>成绩分布图表</p>
              </div>
            </div>
          </div>

          <!-- 班级对比 -->
          <div class="class-comparison">
            <h4>班级对比</h4>
            <a-table
              :columns="classComparisonColumns"
              :data-source="classStats"
              :pagination="false"
              size="small"
            >
              <template #average="text">
                {{ text.toFixed(1) }}分
              </template>
              <template #rate="text">
                {{ text.toFixed(1) }}%
              </template>
            </a-table>
          </div>
        </div>
      </a-tab-pane>

      <!-- 作业设置 -->
      <a-tab-pane key="settings" tab="作业设置">
        <div class="settings-content">
          <a-descriptions title="基本设置" :column="2" bordered>
            <a-descriptions-item label="作业类型">
              {{ getTypeText(homework.type) }}
            </a-descriptions-item>
            <a-descriptions-item label="评分方式">
              {{ getGradingMethodText(homework.gradingMethod) }}
            </a-descriptions-item>
            <a-descriptions-item label="可见性">
              {{ getVisibilityText(homework.visibility) }}
            </a-descriptions-item>
            <a-descriptions-item label="迟交扣分">
              {{ homework.penaltyEnabled ? `${homework.penaltyPerDay}分/天` : '不扣分' }}
            </a-descriptions-item>
            <a-descriptions-item label="提交限制">
              {{ homework.submissionLimit === 'unlimited' ? '不限制' : `最多${homework.maxSubmissions}次` }}
            </a-descriptions-item>
            <a-descriptions-item label="目标班级">
              {{ homework.classes ? homework.classes.join(', ') : '未设置' }}
            </a-descriptions-item>
          </a-descriptions>

          <a-descriptions title="权限设置" :column="1" bordered style="margin-top: 24px;">
            <a-descriptions-item label="学生权限">
              <a-tag v-for="permission in homework.studentPermissions" :key="permission" style="margin-right: 8px;">
                {{ getPermissionText(permission) }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="提醒设置">
              <a-tag v-for="reminder in homework.reminderSettings" :key="reminder" style="margin-right: 8px;">
                {{ getReminderText(reminder) }}
              </a-tag>
            </a-descriptions-item>
          </a-descriptions>
        </div>
      </a-tab-pane>
    </a-tabs>

    <!-- 查看提交详情模态框 -->
    <a-modal
      title="作业提交详情"
      :visible="viewVisible"
      @cancel="viewVisible = false"
      width="800px"
      footer=""
    >
      <div v-if="currentSubmission">
        <a-descriptions bordered>
          <a-descriptions-item label="学生姓名">
            {{ currentSubmission.studentName }}
          </a-descriptions-item>
          <a-descriptions-item label="提交时间">
            {{ formatTime(currentSubmission.submitTime) }}
          </a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="getSubmissionStatusColor(currentSubmission.status)">
              {{ getSubmissionStatusText(currentSubmission.status) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="得分" v-if="currentSubmission.score !== null">
            {{ currentSubmission.score }}分
          </a-descriptions-item>
        </a-descriptions>

        <a-divider>提交内容</a-divider>
        <div class="submission-content">
          <p v-if="currentSubmission.content" class="text-content">{{ currentSubmission.content }}</p>
          <div v-else class="empty-text">暂无文字说明</div>
        </div>

        <a-divider>附件列表</a-divider>
        <div class="attachment-list" v-if="currentSubmission.attachments && currentSubmission.attachments.length > 0">
          <div v-for="(file, index) in currentSubmission.attachments" :key="index" class="attachment-item">
            <a-icon type="file" />
            <span class="file-name">{{ file.name }}</span>
            <a-button type="link" size="small" @click="downloadAttachment(file)">
              下载
            </a-button>
            <a-button v-if="file.url" type="link" size="small" :href="file.url" target="_blank">
              预览
            </a-button>
          </div>
        </div>
        <div v-else class="empty-text">无附件</div>

        <div class="modal-actions" style="text-align: center; margin-top: 24px;">
          <a-button @click="viewVisible = false" style="margin-right: 8px;">关闭</a-button>
          <a-button type="primary" @click="openGradeModal(currentSubmission)">去评分</a-button>
        </div>
      </div>
    </a-modal>

    <!-- 评分模态框 -->
    <a-modal
      title="作业评分"
      :visible="gradeVisible"
      @cancel="gradeVisible = false"
      @ok="submitGrade"
      :confirmLoading="grading"
    >
      <a-form-model ref="gradeForm" :model="gradeForm" :rules="gradeRules" :label-col="{ span: 4 }" :wrapper-col="{ span: 18 }">
        <a-form-model-item label="得分" prop="score">
          <a-input-number v-model="gradeForm.score" :min="0" :max="100" style="width: 100%" />
        </a-form-model-item>
        <a-form-model-item label="评语" prop="feedback">
          <a-textarea v-model="gradeForm.feedback" :rows="4" placeholder="请输入评语" />
        </a-form-model-item>
      </a-form-model>
    </a-modal>
  </div>
</template>

<script>
import { reviewHomework } from '@/api/homework'

export default {
    // ...
    data () {
        return {
            // ...
            viewVisible: false,
            gradeVisible: false,
            grading: false,
            currentSubmission: null,
            gradeForm: {
                score: 80,
                feedback: ''
            },
            gradeRules: {
                score: [{ required: true, message: '请输入分数', trigger: 'blur' }]
            }
            // ...
        }
    },
    methods: {
    // ...
        viewSubmission (submission) {
            this.currentSubmission = submission
            this.viewVisible = true
        },
        gradeSubmission (submission) {
            this.openGradeModal(submission)
        },
        openGradeModal (submission) {
            this.currentSubmission = submission
            this.gradeForm = {
                score: submission.score !== null ? submission.score : 80,
                feedback: submission.feedback || ''
            }
            this.viewVisible = false
            this.gradeVisible = true
        },
        submitGrade () {
            this.$refs.gradeForm.validate(valid => {
                if (valid) {
                    this.grading = true
                    reviewHomework({
                        submissionId: this.currentSubmission.id,
                        score: this.gradeForm.score,
                        feedback: this.gradeForm.feedback
                    }).then(res => {
                        if (res.success) {
                            this.$message.success('评分成功')
                            this.gradeVisible = false
                            this.loadSubmissions() // 刷新列表
                        } else {
                            this.$message.warning(res.message || '评分失败')
                        }
                    }).catch(err => {
                        this.$message.error('系统错误')
                    }).finally(() => {
                        this.grading = false
                    })
                }
            })
        },
        downloadAttachment (file) {
            if (file.url) {
                window.open(file.url, '_blank')
            } else {
                this.$message.warning('文件链接无效')
            }
        },
        sendReminder (submission) {
            this.$message.success(`已向${submission.studentName}发送提醒`)
        },
        batchGrade () {
            if (this.selectedSubmissions.length === 0) {
                this.$message.warning('请选择要评分的作业')
                return
            }
            this.$message.info(`批量评分${this.selectedSubmissions.length}份作业`)
        },
        downloadFile (file) {
            this.$message.success(`下载文件：${file.name}`)
        },
        exportData () {
            this.$message.success('正在导出作业数据...')
        }
    }
}
</script>

<style scoped>
.homework-detail-view {
  padding: 0;
}

.homework-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 32px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.homework-basic-info {
  flex: 1;
}

.homework-title {
  margin: 0 0 16px 0;
  color: white;
  font-size: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.homework-meta {
  margin-bottom: 16px;
}

.meta-row {
  display: flex;
  gap: 32px;
  margin-bottom: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.homework-description {
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
  font-size: 15px;
}

.homework-actions {
  flex-shrink: 0;
}

.progress-stats {
  background: rgba(255, 255, 255, 0.1);
  padding: 24px;
  border-radius: 8px;
}

.progress-bars {
  margin-top: 16px;
}

.progress-item {
  margin-bottom: 12px;
}

.progress-label {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  margin-bottom: 4px;
}

.requirements-content {
  padding: 16px 0;
}

.section {
  margin-bottom: 32px;
}

.section h4 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 16px;
}

.requirements-text {
  color: #666;
  line-height: 1.6;
  white-space: pre-wrap;
  background: #fafafa;
  padding: 16px;
  border-radius: 6px;
}

.submission-requirements {
  background: #fafafa;
  padding: 16px;
  border-radius: 6px;
}

.requirement-item {
  margin-bottom: 12px;
  color: #666;
}

.reference-files {
  background: #fafafa;
  padding: 16px;
  border-radius: 6px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.file-item:hover {
  background: rgba(24, 144, 255, 0.1);
}

.file-name {
  flex: 1;
  color: #333;
}

.file-size {
  color: #999;
  font-size: 12px;
}

.submissions-content {
  padding: 16px 0;
}

.submission-filters {
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
}

.student-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.student-details {
  flex: 1;
}

.student-name {
  font-weight: 500;
  color: #333;
}

.student-id {
  font-size: 12px;
  color: #999;
}

.score-excellent {
  color: #52c41a;
  font-weight: 500;
}

.score-good {
  color: #1890ff;
  font-weight: 500;
}

.score-pass {
  color: #faad14;
}

.score-fail {
  color: #ff4d4f;
}

.no-score {
  color: #999;
}

.statistics-content {
  padding: 16px 0;
}

.stats-overview {
  margin-bottom: 32px;
}

.score-distribution {
  margin-bottom: 32px;
}

.score-distribution h4 {
  margin: 0 0 16px 0;
  color: #333;
}

.chart-container {
  height: 300px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.chart-placeholder {
  text-align: center;
  color: #999;
}

.chart-placeholder p {
  margin: 8px 0 0 0;
}

.class-comparison h4 {
  margin: 0 0 16px 0;
  color: #333;
}

.settings-content {
  padding: 16px 0;
}
</style>
