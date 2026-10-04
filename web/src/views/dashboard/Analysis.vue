<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <div>
        <h2>教学运营总览</h2>
        <p class="dashboard-subtitle">实时掌握课程、学员与课堂核心数据</p>
      </div>
      <a-button type="primary" icon="reload" @click="loadStats" :loading="loading">
        刷新数据
      </a-button>
    </div>

    <a-row :gutter="16" class="dashboard-row">
      <a-col :xs="24" :sm="12" :lg="6" v-for="card in primaryCards" :key="card.key">
        <a-card :loading="loading" class="stat-card">
          <div class="stat-card__icon" :class="'icon-' + card.key">
            <a-icon :type="card.icon" />
          </div>
          <div class="stat-card__content">
            <div class="stat-card__title">{{ card.title }}</div>
            <div class="stat-card__value">{{ card.formatter(stats[card.key]) }}</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" class="dashboard-row">
      <a-col :xs="24" :sm="12" :lg="6" v-for="card in secondaryCards" :key="card.key">
        <a-card :loading="loading" class="stat-card secondary">
          <div class="stat-card__title">{{ card.title }}</div>
          <div class="stat-card__value">{{ card.formatter(stats[card.key]) }}</div>
          <div class="stat-card__desc" v-if="card.description">{{ card.description }}</div>
        </a-card>
      </a-col>
    </a-row>

    <a-alert
      v-if="!loading && !stats.totalStudents && !stats.totalCourses"
      type="info"
      show-icon
      class="dashboard-empty"
      message="当前暂无统计数据"
      description="请先在课程、班级、学员模块中录入教学数据后再查看首页总览" />
  </div>
</template>

<script>
import { teacherStatsApi } from '@/api/teaching'

const numberFormatter = (value) => {
    if (value === null || value === undefined) {
        return '0'
    }

    if (typeof value === 'number') {
        return value.toLocaleString()
    }

    const parsed = Number(value)
    return Number.isNaN(parsed) ? '0' : parsed.toLocaleString()
}

const percentFormatter = (value) => {
    if (value === null || value === undefined) {
        return '0%'
    }

    const parsed = Number(value)
    if (Number.isNaN(parsed)) {
        return '0%'
    }
    return `${parsed.toFixed(1)}%`
}

export default {
    name: 'Analysis',
    data () {
        return {
            loading: false,
            stats: {
                totalCourses: 0,
                totalStudents: 0,
                totalClasses: 0,
                pendingHomework: 0,
                todayClasses: 0,
                activeStudents: 0,
                avgAttendance: 0,
                completionRate: 0
            },
            primaryCards: [
                { key: 'totalStudents', title: '学员总数', icon: 'team', formatter: numberFormatter },
                { key: 'totalCourses', title: '课程总数', icon: 'book', formatter: numberFormatter },
                { key: 'totalClasses', title: '班级数量', icon: 'apartment', formatter: numberFormatter },
                { key: 'pendingHomework', title: '待批改作业', icon: 'file-done', formatter: numberFormatter }
            ],
            secondaryCards: [
                { key: 'todayClasses', title: '今日课堂', description: '今日安排的课堂数量', formatter: numberFormatter },
                { key: 'activeStudents', title: '活跃学员', description: '活跃学生数量（近7日）', formatter: numberFormatter },
                { key: 'avgAttendance', title: '平均到课率', description: '课堂平均出勤比例', formatter: percentFormatter },
                { key: 'completionRate', title: '课程完成率', description: '课程平均完成进度', formatter: percentFormatter }
            ]
        }
    },
    created () {
        this.loadStats()
    },
    methods: {
        async loadStats () {
            this.loading = true
            try {
                const response = await teacherStatsApi.getDashboardStats()
                if (response && response.success && response.result) {
                    this.stats = {
                        ...this.stats,
                        ...response.result
                    }
                }
            } catch (error) {
                // 错误统一由apiWrapper处理，这里仅保持友好状态
            } finally {
                this.loading = false
            }
        }
    }
}
</script>

<style lang="less" scoped>
.dashboard-container {
  padding: 12px 0 24px;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;

  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }
}

.dashboard-subtitle {
  margin: 4px 0 0;
  color: rgba(0, 0, 0, 0.45);
}

.dashboard-row {
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  min-height: 130px;
  border-radius: 10px;
  box-shadow: 0 8px 20px -12px rgba(0, 0, 0, 0.3);

  &__icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    color: #fff;
    margin-right: 16px;

    &.icon-totalStudents {
      background: linear-gradient(135deg, #1890ff, #73c0ff);
    }

    &.icon-totalCourses {
      background: linear-gradient(135deg, #13c2c2, #87e8de);
    }

    &.icon-totalClasses {
      background: linear-gradient(135deg, #722ed1, #b37feb);
    }

    &.icon-pendingHomework {
      background: linear-gradient(135deg, #fa8c16, #ffc069);
    }
  }

  &__content {
    flex: 1;
  }

  &__title {
    font-size: 14px;
    color: rgba(0, 0, 0, 0.45);
    margin-bottom: 6px;
  }

  &__value {
    font-size: 26px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.85);
  }

  &.secondary {
    flex-direction: column;
    align-items: flex-start;
    min-height: 150px;

    .stat-card__value {
      font-size: 24px;
      margin: 8px 0;
    }

    .stat-card__desc {
      color: rgba(0, 0, 0, 0.45);
      font-size: 13px;
    }
  }
}

.dashboard-empty {
  margin-top: 16px;
}

@media (max-width: 576px) {
  .stat-card {
    min-height: 110px;

    &__icon {
      width: 48px;
      height: 48px;
      font-size: 24px;
    }

    &__value {
      font-size: 22px;
    }
  }
}
</style>
