<template>
  <div class="teacher-student-analytics">
    <a-card title="学情分析">
      <template slot="extra">
        <a-space>
          <a-select
            v-model="selectedCourse"
            placeholder="选择课程"
            style="width: 200px"
            @change="onCourseChange"
          >
            <a-select-option
              v-for="course in courseList"
              :key="course.id"
              :value="course.id"
            >
              {{ course.courseName }}
            </a-select-option>
          </a-select>
          <a-range-picker
            v-model="dateRange"
            @change="onDateRangeChange"
            format="YYYY-MM-DD"
          />
        </a-space>
      </template>

      <a-tabs v-model="activeTab" type="card" @change="onTabChange">
        <a-tab-pane key="overview" tab="概览">
          <learning-analytics-dashboard v-if="selectedCourse" :course-id="selectedCourse" />
        </a-tab-pane>

        <a-tab-pane key="path" tab="学习路径">
          <learning-path-analysis v-if="selectedCourse" :course-id="selectedCourse" />
        </a-tab-pane>

        <a-tab-pane key="behavior" tab="行为分析">
          <behavior-analytics v-if="selectedCourse" :course-id="selectedCourse" />
        </a-tab-pane>

        <a-tab-pane key="warning" tab="学习预警">
          <learning-warnings v-if="selectedCourse" :course-id="selectedCourse" />
        </a-tab-pane>

        <a-tab-pane key="report" tab="学习报告">
          <learning-reports v-if="selectedCourse" :course-id="selectedCourse" />
        </a-tab-pane>
      </a-tabs>

      <!-- 如果没有选择课程，显示提示 -->
      <div v-if="!selectedCourse" class="no-course-selected">
        <a-empty description="请先选择一个课程进行分析">
          <a-button type="primary" @click="loadCourseList">
            刷新课程列表
          </a-button>
        </a-empty>
      </div>
    </a-card>
  </div>
</template>

<script>
import { getAction } from '@/api/manage'
import LearningAnalyticsDashboard from '@/views/analytics/LearningAnalyticsDashboard.vue'
import LearningPathAnalysis from '@/views/analytics/LearningPathAnalysis.vue'
import moment from 'moment'

// 临时组件，用于展示其他分析功能
const BehaviorAnalytics = {
    props: ['courseId'],
    template: `
    <div class="behavior-analytics">
      <a-card title="学习行为分析" :bordered="false">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-card title="行为类型分布" size="small">
              <a-empty description="行为分析图表开发中..." />
            </a-card>
          </a-col>
          <a-col :span="12">
            <a-card title="活跃时段分析" size="small">
              <a-empty description="时段分析图表开发中..." />
            </a-card>
          </a-col>
        </a-row>
      </a-card>
    </div>
  `
}

const LearningWarnings = {
    props: ['courseId'],
    template: `
    <div class="learning-warnings">
      <a-card title="学习预警" :bordered="false">
        <a-alert
          message="学习时长不足预警"
          description="有3名学生本周学习时长少于2小时，建议关注"
          type="warning"
          show-icon
          style="margin-bottom: 16px"
        />
        <a-alert
          message="学习进度滞后预警"
          description="有5名学生学习进度明显滞后，建议个别辅导"
          type="error"
          show-icon
          style="margin-bottom: 16px"
        />
        <a-alert
          message="学习成绩下滑预警"
          description="有2名学生最近成绩有下滑趋势，需要重点关注"
          type="warning"
          show-icon
        />
      </a-card>
    </div>
  `
}

const LearningReports = {
    props: ['courseId'],
    template: `
    <div class="learning-reports">
      <a-card title="学习报告" :bordered="false">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-card title="周报" size="small" hoverable>
              <p>本周学习情况总结</p>
              <a-button type="primary" size="small">生成报告</a-button>
            </a-card>
          </a-col>
          <a-col :span="8">
            <a-card title="月报" size="small" hoverable>
              <p>本月学习情况分析</p>
              <a-button type="primary" size="small">生成报告</a-button>
            </a-card>
          </a-col>
          <a-col :span="8">
            <a-card title="期末报告" size="small" hoverable>
              <p>学期学习情况汇总</p>
              <a-button type="primary" size="small">生成报告</a-button>
            </a-card>
          </a-col>
        </a-row>
      </a-card>
    </div>
  `
}

export default {
    name: 'TeacherStudentAnalytics',
    components: {
        LearningAnalyticsDashboard,
        LearningPathAnalysis,
        BehaviorAnalytics,
        LearningWarnings,
        LearningReports
    },
    data () {
        return {
            activeTab: 'overview',
            selectedCourse: null,
            courseList: [],
            dateRange: [moment().subtract(30, 'days'), moment()],
            loading: false
        }
    },
    mounted () {
        this.loadCourseList()
    },
    methods: {
        async loadCourseList () {
            this.loading = true
            try {
                const res = await getAction('/teaching/teachingCourse/mineCourse')
                if (res.success) {
                    this.courseList = res.result || []
                    // 默认选择第一个课程
                    if (this.courseList.length > 0) {
                        this.selectedCourse = this.courseList[0].id
                    }
                }
            } catch (error) {
                console.error('加载课程列表失败:', error)
                this.$message.error('加载课程列表失败')
            } finally {
                this.loading = false
            }
        },

        onCourseChange (courseId) {
            this.selectedCourse = courseId
        },

        onDateRangeChange (dates) {
            this.dateRange = dates
        },

        onTabChange (key) {
            this.activeTab = key
        }
    }
}
</script>

<style lang="less" scoped>
.teacher-student-analytics {
  padding: 24px;
  min-height: 100vh;
  background: #f0f2f5;

  .no-course-selected {
    text-align: center;
    padding: 60px 0;
  }

  .ant-card {
    .ant-card-body {
      padding: 24px;
    }

    .ant-tabs {
      .ant-tabs-content {
        margin-top: 16px;
      }
    }
  }
}

// 各个分析组件的样式
.behavior-analytics,
.learning-warnings,
.learning-reports {
  .ant-card {
    margin-bottom: 16px;

    &.ant-card-small {
      .ant-card-head {
        min-height: 36px;
        padding: 0 12px;
        font-size: 14px;
      }

      .ant-card-body {
        padding: 12px;
      }
    }
  }
}
</style>
