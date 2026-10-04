<template>
  <div class="homework-statistics">
    <a-card>
      <div slot="title">
        <a-icon type="bar-chart" /> 作业统计
        <span v-if="statistics && statistics.homework" class="title-extra">- {{ statistics.homework.homework_title }}</span>
      </div>
      <div slot="extra">
        <a-button @click="goBack">
          <a-icon type="arrow-left" /> 返回
        </a-button>
      </div>

      <a-spin :spinning="loading">
        <div v-if="statistics">
          <a-row :gutter="16">
            <a-col :span="6">
              <a-card class="stat-card" bordered="{false}">
                <div class="stat-title">总人数</div>
                <div class="stat-value">{{ statistics.statistics.total_students }}</div>
              </a-card>
            </a-col>
            <a-col :span="6">
              <a-card class="stat-card" bordered="{false}">
                <div class="stat-title">已提交</div>
                <div class="stat-value">{{ statistics.statistics.submitted_count }}</div>
              </a-card>
            </a-col>
            <a-col :span="6">
              <a-card class="stat-card" bordered="{false}">
                <div class="stat-title">已批改</div>
                <div class="stat-value">{{ statistics.statistics.graded_count }}</div>
              </a-card>
            </a-col>
            <a-col :span="6">
              <a-card class="stat-card" bordered="{false}">
                <div class="stat-title">提交率</div>
                <div class="stat-value">{{ statistics.statistics.submission_rate }}</div>
              </a-card>
            </a-col>
          </a-row>

          <a-row :gutter="16" style="margin-top: 24px;">
            <a-col :span="12">
              <a-card title="提交进度">
                <a-progress
                  type="dashboard"
                  :percent="getSubmitPercent(statistics.statistics)"
                  :format="percent => percent + '% (已提交)'"
                />
              </a-card>
            </a-col>
            <a-col :span="12">
              <a-card title="平均得分">
                <div class="avg-score">
                  <span class="value">{{ statistics.statistics.avg_score }}</span>
                  <span class="label">分</span>
                </div>
              </a-card>
            </a-col>
          </a-row>

          <a-card title="分数分布" style="margin-top: 24px;">
            <a-row :gutter="16">
              <a-col v-for="(value, key) in statistics.statistics.score_distribution" :key="key" :span="4">
                <div class="score-bar">
                  <div class="label">{{ getScoreLabel(key) }}</div>
                  <a-progress :percent="getScorePercent(value)" :show-info="false" />
                  <div class="value">{{ value }} 人</div>
                </div>
              </a-col>
            </a-row>
          </a-card>
        </div>
      </a-spin>
    </a-card>
  </div>
</template>

<script>
import { getHomeworkStatistics } from '@/api/homework'

export default {
    name: 'HomeworkStatistics',
    data () {
        return {
            homeworkId: this.$route.query.homeworkId,
            statistics: null,
            loading: false
        }
    },
    created () {
        if (!this.homeworkId) {
            this.$message.error('未提供作业ID')
            this.goBack()
            return
        }
        this.loadStatistics()
    },
    methods: {
        async loadStatistics () {
            this.loading = true
            try {
                const res = await getHomeworkStatistics(this.homeworkId)
                if (res.success) {
                    this.statistics = res.result
                } else {
                    this.$message.error(res.message || '加载统计失败')
                }
            } catch (error) {
                this.$message.error(error.message || '加载统计失败')
            } finally {
                this.loading = false
            }
        },
        getSubmitPercent (stat) {
            if (!stat || !stat.total_students) return 0
            return Math.round((stat.submitted_count / stat.total_students) * 100)
        },
        getScoreLabel (key) {
            const map = {
                excellent: '90-100',
                good: '80-89',
                medium: '70-79',
                pass: '60-69',
                fail: '0-59'
            }
            return map[key] || key
        },
        getScorePercent (value) {
            if (!this.statistics) return 0
            const total = this.statistics.statistics.total_students || 0
            if (!total) return 0
            return Math.round((value / total) * 100)
        },
        goBack () {
            this.$router.push('/admin/homework-assignment')
        }
    }
}
</script>

<style scoped lang="less">
.homework-statistics {
  padding: 24px;

  .title-extra {
    margin-left: 8px;
    color: #666;
    font-size: 14px;
  }

  .stat-card {
    text-align: center;

    .stat-title {
      color: #999;
      font-size: 14px;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 600;
    }
  }

  .avg-score {
    text-align: center;

    .value {
      font-size: 48px;
      font-weight: 700;
      color: #1890ff;
    }

    .label {
      margin-left: 8px;
      font-size: 18px;
      color: #999;
    }
  }

  .score-bar {
    .label {
      font-weight: 600;
      margin-bottom: 8px;
    }

    .value {
      margin-top: 6px;
      color: #666;
    }
  }
}
</style>
