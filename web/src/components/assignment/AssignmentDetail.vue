<template>
  <div class="assignment-detail">
    <div class="detail-header">
      <div class="assignment-meta">
        <h3>{{ assignment.title }}</h3>
        <div class="meta-tags">
          <el-tag :type="getSubjectTagType(assignment.subject)">
            {{ getSubjectName(assignment.subject) }}
          </el-tag>
          <el-tag :type="getStatusTagType(assignment.status)">
            {{ getStatusName(assignment.status) }}
          </el-tag>
        </div>
      </div>
      <div class="detail-actions">
        <el-button size="small" @click="$emit('edit', assignment)">
          <i class="el-icon-edit"></i> 编辑
        </el-button>
        <el-button size="small" type="primary" @click="$emit('grade', assignment)">
          <i class="el-icon-s-check"></i> 批改
        </el-button>
      </div>
    </div>

    <el-descriptions :column="2" border>
      <el-descriptions-item label="创建时间">
        {{ formatTime(assignment.createTime) }}
      </el-descriptions-item>
      <el-descriptions-item label="开始时间">
        {{ formatTime(assignment.startTime) }}
      </el-descriptions-item>
      <el-descriptions-item label="截止时间">
        <span :class="{ 'text-danger': isOverdue(assignment.dueTime) }">
          {{ formatTime(assignment.dueTime) }}
        </span>
      </el-descriptions-item>
      <el-descriptions-item label="总分">
        {{ assignment.totalScore }}分
      </el-descriptions-item>
      <el-descriptions-item label="作业类型">
        {{ getTypeName(assignment.type) }}
      </el-descriptions-item>
      <el-descriptions-item label="目标班级">
        {{ getClassNames(assignment.classIds) }}
      </el-descriptions-item>
    </el-descriptions>

    <div class="assignment-description" v-if="assignment.description">
      <h4>作业说明</h4>
      <p>{{ assignment.description }}</p>
    </div>

    <div v-if="assignment.type === 'online' || assignment.type === 'mixed'" class="questions-preview">
      <h4>题目预览</h4>
      <div
        v-for="(question, index) in assignment.questions"
        :key="index"
        class="question-item"
      >
        <div class="question-header">
          <span class="question-number">{{ index + 1 }}.</span>
          <span class="question-type">{{ getQuestionTypeName(question.type) }}</span>
          <span class="question-score">({{ question.score }}分)</span>
        </div>
        <div class="question-content">{{ question.content }}</div>

        <div v-if="question.type === 'single_choice' || question.type === 'multiple_choice'" class="question-options">
          <div
            v-for="(option, optionIndex) in question.options"
            :key="optionIndex"
            class="option-item"
            :class="{ correct: option.isCorrect }"
          >
            {{ String.fromCharCode(65 + optionIndex) }}. {{ option.content }}
            <i v-if="option.isCorrect" class="el-icon-check correct-mark"></i>
          </div>
        </div>

        <div v-if="question.type === 'true_false'" class="correct-answer">
          正确答案: {{ question.correctAnswer ? '正确' : '错误' }}
        </div>

        <div v-if="question.type === 'fill_blank'" class="correct-answer">
          标准答案: {{ question.correctAnswer }}
        </div>

        <div v-if="question.type === 'essay'" class="grading-criteria">
          评分标准: {{ question.gradingCriteria }}
        </div>
      </div>
    </div>

    <div v-if="assignment.type === 'file' || assignment.type === 'mixed'" class="file-requirements">
      <h4>文件要求</h4>
      <div class="requirement-item">
        <label>文件要求:</label>
        <p>{{ assignment.fileRequirement || '无特殊要求' }}</p>
      </div>
      <div class="requirement-item">
        <label>文件大小限制:</label>
        <span>{{ assignment.maxFileSize || 100 }}MB</span>
      </div>
      <div class="requirement-item">
        <label>允许文件类型:</label>
        <span>{{ getAllowedFileTypesText() }}</span>
      </div>
    </div>

    <div class="assignment-settings">
      <h4>作业设置</h4>
      <el-tag
        v-for="setting in getSettingsDisplay()"
        :key="setting"
        size="small"
        style="margin-right: 10px; margin-bottom: 5px;"
      >
        {{ setting }}
      </el-tag>
    </div>

    <div v-if="assignment.remark" class="assignment-remark">
      <h4>备注</h4>
      <p>{{ assignment.remark }}</p>
    </div>
  </div>
</template>

<script>
export default {
    name: 'AssignmentDetail',
    props: {
        assignment: {
            type: Object,
            required: true
        }
    },
    methods: {
        getSubjectTagType (subject) {
            const types = {
                math: 'primary',
                chinese: 'success',
                english: 'info',
                physics: 'warning',
                chemistry: 'danger'
            }
            return types[subject] || ''
        },

        getSubjectName (subject) {
            const names = {
                math: '数学',
                chinese: '语文',
                english: '英语',
                physics: '物理',
                chemistry: '化学'
            }
            return names[subject] || subject
        },

        getStatusTagType (status) {
            const types = {
                draft: 'info',
                active: 'success',
                closed: 'danger'
            }
            return types[status] || ''
        },

        getStatusName (status) {
            const names = {
                draft: '未发布',
                active: '进行中',
                closed: '已截止'
            }
            return names[status] || status
        },

        getTypeName (type) {
            const names = {
                file: '文件提交',
                online: '在线答题',
                mixed: '混合模式'
            }
            return names[type] || type
        },

        getQuestionTypeName (type) {
            const names = {
                single_choice: '单选题',
                multiple_choice: '多选题',
                true_false: '判断题',
                fill_blank: '填空题',
                essay: '简答题'
            }
            return names[type] || type
        },

        getClassNames (classIds) {
            if (!classIds || classIds.length === 0) return '无'
            return '已选择班级'
        },

        getAllowedFileTypesText () {
            const typeNames = {
                docx: 'Word文档',
                pdf: 'PDF文档',
                image: '图片',
                archive: '压缩包',
                txt: '文本文件'
            }

            return (this.assignment.allowedFileTypes || [])
                .map(type => typeNames[type] || type)
                .join(', ') || '所有格式'
        },

        getSettingsDisplay () {
            const settingNames = {
                allowLateSubmission: '允许迟交',
                showGradeToStudent: '向学生显示成绩',
                allowResubmission: '允许重新提交',
                autoGrading: '自动批改'
            }

            return (this.assignment.settings || [])
                .map(setting => settingNames[setting] || setting)
        },

        formatTime (time) {
            if (!time) return '未设置'
            return new Date(time).toLocaleString('zh-CN')
        },

        isOverdue (dueTime) {
            if (!dueTime) return false
            return new Date(dueTime) < new Date()
        }
    }
}
</script>

<style scoped>
.assignment-detail {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.assignment-meta h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.meta-tags .el-tag {
  margin-right: 10px;
}

.assignment-description,
.questions-preview,
.file-requirements,
.assignment-settings,
.assignment-remark {
  margin-top: 30px;
}

.assignment-description h4,
.questions-preview h4,
.file-requirements h4,
.assignment-settings h4,
.assignment-remark h4 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
}

.assignment-description p,
.assignment-remark p {
  margin: 0;
  line-height: 1.6;
  color: #606266;
}

.question-item {
  margin-bottom: 25px;
  padding: 15px;
  border: 1px solid #e6ebf5;
  border-radius: 4px;
  background: #fafafa;
}

.question-header {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.question-number {
  font-weight: bold;
  color: #409eff;
  margin-right: 10px;
}

.question-type {
  background: #409eff;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-right: 10px;
}

.question-score {
  color: #909399;
  font-size: 14px;
  margin-left: auto;
}

.question-content {
  margin-bottom: 15px;
  font-size: 15px;
  line-height: 1.5;
  color: #333;
}

.question-options {
  margin-left: 20px;
}

.option-item {
  padding: 5px 0;
  display: flex;
  align-items: center;
  color: #606266;
}

.option-item.correct {
  color: #67c23a;
  font-weight: bold;
}

.correct-mark {
  margin-left: 10px;
  color: #67c23a;
}

.correct-answer,
.grading-criteria {
  margin-left: 20px;
  padding: 8px 12px;
  background: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 4px;
  font-size: 14px;
  color: #409eff;
}

.requirement-item {
  margin-bottom: 10px;
  display: flex;
  align-items: flex-start;
}

.requirement-item label {
  font-weight: bold;
  color: #606266;
  width: 120px;
  flex-shrink: 0;
}

.requirement-item p {
  margin: 0;
  color: #909399;
}

.requirement-item span {
  color: #909399;
}

.text-danger {
  color: #f56c6c;
}
</style>
