<template>
  <div class="student-progress-dashboard">
    <a-card :bordered="false">
      <!-- 学生信息头部 -->
      <div class="student-header">
        <div class="student-info">
          <a-avatar size="large" :src="studentInfo.avatar">
            {{ studentInfo.name[0] }}
          </a-avatar>
          <div class="info-details">
            <h2>{{ studentInfo.name }}</h2>
            <p>学号：{{ studentInfo.studentId }} | 班级：{{ studentInfo.className }}</p>
            <p>入学时间：{{ studentInfo.enrollDate }} | 学习天数：{{ studentInfo.studyDays }}天</p>
          </div>
        </div>
        <div class="quick-stats">
          <a-row :gutter="16">
            <a-col :span="6">
              <a-statistic title="总学习时长" :value="studentInfo.totalStudyTime" suffix="小时" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="完成作业" :value="studentInfo.completedHomeworks" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="平均分" :value="studentInfo.averageScore" suffix="分" />
            </a-col>
            <a-col :span="6">
              <a-statistic title="班级排名" :value="studentInfo.classRank" />
            </a-col>
          </a-row>
        </div>
      </div>

      <!-- 学习概览 -->
      <div class="learning-overview">
        <a-row :gutter="16">
          <!-- 学习进度 -->
          <a-col :span="12">
            <a-card title="学习进度" size="small">
              <div class="progress-items">
                <div
                  v-for="subject in learningProgress"
                  :key="subject.name"
                  class="progress-item"
                >
                  <div class="progress-header">
                    <span class="subject-name">{{ subject.name }}</span>
                    <span class="progress-percent">{{ subject.progress }}%</span>
                  </div>
                  <a-progress
                    :percent="subject.progress"
                    :stroke-color="getProgressColor(subject.progress)"
                    :trail-color="'#f0f0f0'"
                  />
                  <div class="progress-details">
                    <span>已完成：{{ subject.completed }}/{{ subject.total }}</span>
                    <span>最近学习：{{ formatTime(subject.lastStudy) }}</span>
                  </div>
                </div>
              </div>
            </a-card>
          </a-col>

          <!-- 学习目标 -->
          <a-col :span="12">
            <a-card title="学习目标" size="small">
              <div class="goals-section">
                <div
                  v-for="goal in learningGoals"
                  :key="goal.id"
                  class="goal-item"
                  :class="{ completed: goal.completed }"
                >
                  <div class="goal-header">
                    <a-icon
                      :type="goal.completed ? 'check-circle' : 'clock-circle'"
                      :style="{ color: goal.completed ? '#52c41a' : '#faad14' }"
                    />
                    <span class="goal-title">{{ goal.title }}</span>
                    <a-tag :color="getGoalTypeColor(goal.type)" size="small">
                      {{ getGoalTypeText(goal.type) }}
                    </a-tag>
                  </div>
                  <div class="goal-progress">
                    <a-progress
                      :percent="goal.progress"
                      size="small"
                      :show-info="false"
                    />
                    <span class="goal-deadline">{{ formatDeadline(goal.deadline) }}</span>
                  </div>
                </div>

                <a-button type="dashed" block icon="plus" @click="showGoalModal = true">
                  设置新目标
                </a-button>
              </div>
            </a-card>
          </a-col>
        </a-row>
      </div>

      <!-- 详细统计 -->
      <div class="detailed-stats">
        <a-tabs v-model="activeStatsTab" size="large">
          <!-- 学习记录 -->
          <a-tab-pane key="records" tab="学习记录">
            <div class="study-records">
              <!-- 时间筛选 -->
              <div class="time-filter">
                <a-radio-group v-model="timeRange" @change="updateRecords">
                  <a-radio-button value="week">最近一周</a-radio-button>
                  <a-radio-button value="month">最近一月</a-radio-button>
                  <a-radio-button value="semester">本学期</a-radio-button>
                  <a-radio-button value="all">全部</a-radio-button>
                </a-radio-group>
              </div>

              <!-- 学习时长图表 -->
              <div class="study-time-chart">
                <h4>学习时长统计</h4>
                <div class="chart-container">
                  <div class="time-bars">
                    <div
                      v-for="(day, index) in studyTimeData"
                      :key="index"
                      class="time-bar-item"
                    >
                      <div class="bar-container">
                        <div
                          class="time-bar"
                          :style="{
                            height: `${(day.hours / maxStudyHours) * 100}%`,
                            backgroundColor: getTimeBarColor(day.hours)
                          }"
                        ></div>
                      </div>
                      <div class="bar-label">{{ day.date }}</div>
                      <div class="bar-value">{{ day.hours }}h</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 学习活动时间线 -->
              <div class="activity-timeline">
                <h4>学习活动</h4>
                <a-timeline>
                  <a-timeline-item
                    v-for="activity in recentActivities"
                    :key="activity.id"
                    :color="getActivityColor(activity.type)"
                  >
                    <div class="activity-item">
                      <div class="activity-header">
                        <span class="activity-title">{{ activity.title }}</span>
                        <span class="activity-time">{{ formatTime(activity.time) }}</span>
                      </div>
                      <div class="activity-details">
                        <a-tag :color="getActivityTypeColor(activity.type)" size="small">
                          {{ getActivityTypeText(activity.type) }}
                        </a-tag>
                        <span class="activity-duration">用时：{{ activity.duration }}分钟</span>
                        <span v-if="activity.score" class="activity-score">得分：{{ activity.score }}分</span>
                      </div>
                    </div>
                  </a-timeline-item>
                </a-timeline>
              </div>
            </div>
          </a-tab-pane>

          <!-- 成绩分析 -->
          <a-tab-pane key="grades" tab="成绩分析">
            <div class="grade-analysis">
              <!-- 成绩概览 -->
              <div class="grade-overview">
                <a-row :gutter="16">
                  <a-col :span="6">
                    <a-card size="small" class="grade-card">
                      <a-statistic
                        title="平均成绩"
                        :value="gradeStats.average"
                        suffix="分"
                        :precision="1"
                        :value-style="{ color: getScoreColor(gradeStats.average) }"
                      />
                    </a-card>
                  </a-col>
                  <a-col :span="6">
                    <a-card size="small" class="grade-card">
                      <a-statistic
                        title="最高成绩"
                        :value="gradeStats.highest"
                        suffix="分"
                        :value-style="{ color: '#52c41a' }"
                      />
                    </a-card>
                  </a-col>
                  <a-col :span="6">
                    <a-card size="small" class="grade-card">
                      <a-statistic
                        title="最低成绩"
                        :value="gradeStats.lowest"
                        suffix="分"
                        :value-style="{ color: '#ff4d4f' }"
                      />
                    </a-card>
                  </a-col>
                  <a-col :span="6">
                    <a-card size="small" class="grade-card">
                      <a-statistic
                        title="成绩趋势"
                        :value="gradeStats.trend"
                        :prefix="gradeStats.trend > 0 ? '↗' : gradeStats.trend < 0 ? '↘' : '→'"
                        :value-style="{ color: gradeStats.trend > 0 ? '#52c41a' : gradeStats.trend < 0 ? '#ff4d4f' : '#faad14' }"
                      />
                    </a-card>
                  </a-col>
                </a-row>
              </div>

              <!-- 成绩趋势图 -->
              <div class="grade-trend">
                <h4>成绩趋势</h4>
                <div class="trend-chart">
                  <div class="trend-line">
                    <div
                      v-for="(score, index) in gradeTrendData"
                      :key="index"
                      class="trend-point"
                      :style="{
                        left: `${(index / (gradeTrendData.length - 1)) * 100}%`,
                        bottom: `${(score / 100) * 100}%`
                      }"
                      :title="`${score}分`"
                    ></div>
                  </div>
                </div>
              </div>

              <!-- 各科成绩对比 -->
              <div class="subject-comparison">
                <h4>各科成绩对比</h4>
                <div class="radar-chart">
                  <div class="radar-container">
                    <!-- 这里可以集成雷达图组件 -->
                    <div class="radar-placeholder">
                      <a-icon type="radar-chart" style="font-size: 48px; color: #ccc;" />
                      <p>各科成绩雷达图</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </a-tab-pane>

          <!-- 能力评估 -->
          <a-tab-pane key="skills" tab="能力评估">
            <div class="skill-assessment">
              <!-- 技能雷达图 -->
              <div class="skill-radar">
                <h4>编程技能评估</h4>
                <a-row :gutter="16">
                  <a-col :span="12">
                    <div class="skill-chart">
                      <!-- 技能雷达图占位 -->
                      <div class="chart-placeholder">
                        <a-icon type="radar-chart" style="font-size: 48px; color: #ccc;" />
                        <p>技能雷达图</p>
                      </div>
                    </div>
                  </a-col>
                  <a-col :span="12">
                    <div class="skill-details">
                      <div
                        v-for="skill in skillAssessment"
                        :key="skill.name"
                        class="skill-item"
                      >
                        <div class="skill-header">
                          <span class="skill-name">{{ skill.name }}</span>
                          <span class="skill-level">{{ getSkillLevel(skill.score) }}</span>
                        </div>
                        <div class="skill-progress">
                          <a-progress
                            :percent="skill.score"
                            :stroke-color="getSkillColor(skill.score)"
                            :trail-color="'#f0f0f0'"
                            size="small"
                          />
                        </div>
                        <div class="skill-description">
                          {{ skill.description }}
                        </div>
                      </div>
                    </div>
                  </a-col>
                </a-row>
              </div>

              <!-- 成长建议 -->
              <div class="growth-suggestions">
                <h4>成长建议</h4>
                <div class="suggestions-list">
                  <a-card
                    v-for="suggestion in growthSuggestions"
                    :key="suggestion.id"
                    size="small"
                    class="suggestion-card"
                    :title="suggestion.title"
                  >
                    <p>{{ suggestion.content }}</p>
                    <div class="suggestion-actions">
                      <a-tag :color="getSuggestionTypeColor(suggestion.type)">
                        {{ getSuggestionTypeText(suggestion.type) }}
                      </a-tag>
                      <a-button size="small" type="link" @click="applySuggestion(suggestion)">
                        应用建议
                      </a-button>
                    </div>
                  </a-card>
                </div>
              </div>
            </div>
          </a-tab-pane>

          <!-- 证书成就 -->
          <a-tab-pane key="achievements" tab="证书成就">
            <div class="achievements-section">
              <!-- 成就统计 -->
              <div class="achievement-stats">
                <a-row :gutter="16">
                  <a-col :span="8">
                    <a-statistic title="获得成就" :value="achievementStats.total" />
                  </a-col>
                  <a-col :span="8">
                    <a-statistic title="金牌成就" :value="achievementStats.gold" />
                  </a-col>
                  <a-col :span="8">
                    <a-statistic title="成就点数" :value="achievementStats.points" />
                  </a-col>
                </a-row>
              </div>

              <!-- 成就展示 -->
              <div class="achievements-grid">
                <div
                  v-for="achievement in achievements"
                  :key="achievement.id"
                  class="achievement-item"
                  :class="{ unlocked: achievement.unlocked }"
                  @click="viewAchievement(achievement)"
                >
                  <div class="achievement-icon">
                    <a-icon
                      :type="achievement.icon"
                      :style="{
                        fontSize: '32px',
                        color: achievement.unlocked ? achievement.color : '#ccc'
                      }"
                    />
                  </div>
                  <div class="achievement-title">{{ achievement.title }}</div>
                  <div class="achievement-description">{{ achievement.description }}</div>
                  <div v-if="achievement.unlocked" class="achievement-date">
                    {{ formatTime(achievement.unlockDate) }}
                  </div>
                  <div v-else class="achievement-progress">
                    <a-progress
                      :percent="achievement.progress"
                      size="small"
                      :show-info="false"
                    />
                    <span class="progress-text">{{ achievement.progress }}%</span>
                  </div>
                </div>
              </div>

              <!-- 证书展示 -->
              <div class="certificates-section">
                <h4>获得证书</h4>
                <div class="certificates-grid">
                  <div
                    v-for="certificate in certificates"
                    :key="certificate.id"
                    class="certificate-item"
                    @click="viewCertificate(certificate)"
                  >
                    <div class="certificate-image">
                      <img :src="certificate.image" :alt="certificate.title" />
                    </div>
                    <div class="certificate-info">
                      <h5>{{ certificate.title }}</h5>
                      <p>{{ certificate.description }}</p>
                      <div class="certificate-date">
                        颁发时间：{{ formatTime(certificate.issueDate) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>
    </a-card>

    <!-- 设置目标弹窗 -->
    <a-modal
      title="设置学习目标"
      :visible="showGoalModal"
      :width="600"
      @ok="addGoal"
      @cancel="showGoalModal = false"
    >
      <a-form layout="vertical">
        <a-form-item label="目标标题">
          <a-input v-model="newGoal.title" placeholder="请输入目标标题" />
        </a-form-item>
        <a-form-item label="目标类型">
          <a-radio-group v-model="newGoal.type">
            <a-radio value="study">学习目标</a-radio>
            <a-radio value="grade">成绩目标</a-radio>
            <a-radio value="skill">技能目标</a-radio>
            <a-radio value="project">项目目标</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="目标描述">
          <a-textarea v-model="newGoal.description" placeholder="详细描述目标内容" :rows="3" />
        </a-form-item>
        <a-form-item label="截止时间">
          <a-date-picker v-model="newGoal.deadline" style="width: 100%;" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
export default {
    name: 'StudentProgressDashboard',
    data () {
        return {
            activeStatsTab: 'records',
            timeRange: 'week',
            showGoalModal: false,

            newGoal: {
                title: '',
                type: 'study',
                description: '',
                deadline: null
            },

            studentInfo: {
                name: '张小明',
                studentId: 'S001',
                className: '一年级1班',
                avatar: '/images/avatars/student1.jpg',
                enrollDate: '2023-09-01',
                studyDays: 120,
                totalStudyTime: 45.5,
                completedHomeworks: 15,
                averageScore: 85.2,
                classRank: 3
            },

            learningProgress: [
                {
                    name: 'Scratch编程',
                    progress: 85,
                    completed: 17,
                    total: 20,
                    lastStudy: '2024-01-25 15:30:00'
                },
                {
                    name: 'Python入门',
                    progress: 60,
                    completed: 12,
                    total: 20,
                    lastStudy: '2024-01-24 10:15:00'
                },
                {
                    name: '算法思维',
                    progress: 45,
                    completed: 9,
                    total: 20,
                    lastStudy: '2024-01-23 14:20:00'
                },
                {
                    name: '项目实践',
                    progress: 30,
                    completed: 3,
                    total: 10,
                    lastStudy: '2024-01-22 16:45:00'
                }
            ],

            learningGoals: [
                {
                    id: '1',
                    title: '完成Scratch基础课程',
                    type: 'study',
                    progress: 85,
                    deadline: '2024-02-01',
                    completed: false
                },
                {
                    id: '2',
                    title: '期末考试达到90分以上',
                    type: 'grade',
                    progress: 70,
                    deadline: '2024-02-15',
                    completed: false
                },
                {
                    id: '3',
                    title: '掌握Python基础语法',
                    type: 'skill',
                    progress: 100,
                    deadline: '2024-01-20',
                    completed: true
                }
            ],

            studyTimeData: [
                { date: '01-19', hours: 2.5 },
                { date: '01-20', hours: 3.0 },
                { date: '01-21', hours: 1.5 },
                { date: '01-22', hours: 2.8 },
                { date: '01-23', hours: 3.2 },
                { date: '01-24', hours: 2.0 },
                { date: '01-25', hours: 2.7 }
            ],

            recentActivities: [
                {
                    id: '1',
                    title: '完成Scratch动画作业',
                    type: 'homework',
                    time: '2024-01-25 15:30:00',
                    duration: 45,
                    score: 88
                },
                {
                    id: '2',
                    title: '学习Python循环结构',
                    type: 'lesson',
                    time: '2024-01-25 10:15:00',
                    duration: 30
                },
                {
                    id: '3',
                    title: '练习Scratch游戏制作',
                    type: 'practice',
                    time: '2024-01-24 16:20:00',
                    duration: 60
                }
            ],

            gradeStats: {
                average: 85.2,
                highest: 95,
                lowest: 68,
                trend: 2.5
            },

            gradeTrendData: [78, 82, 85, 88, 85, 90, 88, 92],

            skillAssessment: [
                {
                    name: '逻辑思维',
                    score: 85,
                    description: '能够很好地分析和解决问题'
                },
                {
                    name: '代码编写',
                    score: 78,
                    description: '代码基础扎实，需要提高规范性'
                },
                {
                    name: '创意设计',
                    score: 90,
                    description: '具有很强的创意和想象力'
                },
                {
                    name: '调试能力',
                    score: 70,
                    description: '基本掌握调试方法，需要更多练习'
                },
                {
                    name: '协作沟通',
                    score: 82,
                    description: '能够很好地与同学协作学习'
                }
            ],

            growthSuggestions: [
                {
                    id: '1',
                    type: 'skill',
                    title: '提高代码调试能力',
                    content: '建议多做一些有bug的代码练习，学会使用调试工具，培养发现和解决问题的能力。'
                },
                {
                    id: '2',
                    type: 'practice',
                    title: '增加项目实践',
                    content: '可以尝试制作一些小游戏或实用工具，将所学知识应用到实际项目中。'
                },
                {
                    id: '3',
                    type: 'theory',
                    title: '加强算法基础',
                    content: '建议学习一些基础算法，如排序、查找等，提高编程思维能力。'
                }
            ],

            achievementStats: {
                total: 12,
                gold: 3,
                points: 1250
            },

            achievements: [
                {
                    id: '1',
                    title: '编程新手',
                    description: '完成第一个编程作业',
                    icon: 'star',
                    color: '#faad14',
                    unlocked: true,
                    unlockDate: '2023-09-15 10:30:00',
                    progress: 100
                },
                {
                    id: '2',
                    title: 'Scratch大师',
                    description: '完成10个Scratch项目',
                    icon: 'trophy',
                    color: '#52c41a',
                    unlocked: true,
                    unlockDate: '2023-12-20 14:15:00',
                    progress: 100
                },
                {
                    id: '3',
                    title: 'Python探索者',
                    description: '学习Python基础语法',
                    icon: 'code',
                    color: '#1890ff',
                    unlocked: false,
                    progress: 75
                }
            ],

            certificates: [
                {
                    id: '1',
                    title: 'Scratch编程基础证书',
                    description: '完成Scratch编程基础课程',
                    image: '/images/certificates/scratch-basic.png',
                    issueDate: '2023-12-25 10:00:00'
                }
            ]
        }
    },
    computed: {
        maxStudyHours () {
            return Math.max(...this.studyTimeData.map(day => day.hours))
        }
    },
    methods: {
        getProgressColor (progress) {
            if (progress >= 80) return '#52c41a'
            if (progress >= 60) return '#1890ff'
            if (progress >= 40) return '#faad14'
            return '#ff4d4f'
        },

        getGoalTypeColor (type) {
            const colorMap = {
                'study': 'blue',
                'grade': 'green',
                'skill': 'purple',
                'project': 'orange'
            }
            return colorMap[type] || 'default'
        },

        getGoalTypeText (type) {
            const textMap = {
                'study': '学习',
                'grade': '成绩',
                'skill': '技能',
                'project': '项目'
            }
            return textMap[type] || '其他'
        },

        formatTime (time) {
            return new Date(time).toLocaleString()
        },

        formatDeadline (deadline) {
            const date = new Date(deadline)
            const now = new Date()
            const diff = date - now
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

            if (days < 0) return '已过期'
            if (days === 0) return '今天截止'
            if (days === 1) return '明天截止'
            return `${days}天后截止`
        },

        getTimeBarColor (hours) {
            if (hours >= 3) return '#52c41a'
            if (hours >= 2) return '#1890ff'
            if (hours >= 1) return '#faad14'
            return '#ff4d4f'
        },

        getActivityColor (type) {
            const colorMap = {
                'homework': 'green',
                'lesson': 'blue',
                'practice': 'orange',
                'exam': 'red'
            }
            return colorMap[type] || 'default'
        },

        getActivityTypeColor (type) {
            const colorMap = {
                'homework': 'green',
                'lesson': 'blue',
                'practice': 'orange',
                'exam': 'red'
            }
            return colorMap[type] || 'default'
        },

        getActivityTypeText (type) {
            const textMap = {
                'homework': '作业',
                'lesson': '课程',
                'practice': '练习',
                'exam': '考试'
            }
            return textMap[type] || '其他'
        },

        getScoreColor (score) {
            if (score >= 90) return '#52c41a'
            if (score >= 80) return '#1890ff'
            if (score >= 60) return '#faad14'
            return '#ff4d4f'
        },

        getSkillLevel (score) {
            if (score >= 90) return '优秀'
            if (score >= 80) return '良好'
            if (score >= 60) return '合格'
            return '待提高'
        },

        getSkillColor (score) {
            if (score >= 90) return '#52c41a'
            if (score >= 80) return '#1890ff'
            if (score >= 60) return '#faad14'
            return '#ff4d4f'
        },

        getSuggestionTypeColor (type) {
            const colorMap = {
                'skill': 'purple',
                'practice': 'orange',
                'theory': 'blue'
            }
            return colorMap[type] || 'default'
        },

        getSuggestionTypeText (type) {
            const textMap = {
                'skill': '技能提升',
                'practice': '实践建议',
                'theory': '理论学习'
            }
            return textMap[type] || '其他'
        },

        updateRecords () {
            // 根据时间范围更新学习记录
            this.$message.info(`切换到${this.timeRange}范围`)
        },

        applySuggestion (suggestion) {
            this.$message.success(`已应用建议：${suggestion.title}`)
        },

        viewAchievement (achievement) {
            this.$message.info(`查看成就：${achievement.title}`)
        },

        viewCertificate (certificate) {
            this.$message.info(`查看证书：${certificate.title}`)
        },

        addGoal () {
            const goal = {
                id: Date.now().toString(),
                title: this.newGoal.title,
                type: this.newGoal.type,
                progress: 0,
                deadline: this.newGoal.deadline,
                completed: false
            }

            this.learningGoals.push(goal)
            this.showGoalModal = false
            this.newGoal = {
                title: '',
                type: 'study',
                description: '',
                deadline: null
            }
            this.$message.success('学习目标设置成功')
        }
    }
}
</script>

<style scoped>
.student-progress-dashboard {
  padding: 24px;
}

.student-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 32px;
  border-radius: 12px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.student-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.info-details h2 {
  margin: 0;
  color: white;
  font-size: 24px;
}

.info-details p {
  margin: 4px 0 0 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.quick-stats {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 8px;
  min-width: 400px;
}

.learning-overview {
  margin-bottom: 24px;
}

.progress-items {
  padding: 16px 0;
}

.progress-item {
  margin-bottom: 24px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.subject-name {
  font-weight: 500;
  color: #333;
}

.progress-percent {
  font-weight: 500;
  color: #1890ff;
}

.progress-details {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}

.goals-section {
  padding: 16px 0;
}

.goal-item {
  margin-bottom: 16px;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.goal-item:hover {
  background: #fafafa;
}

.goal-item.completed {
  background: #f6ffed;
  border-color: #b7eb8f;
}

.goal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.goal-title {
  flex: 1;
  font-weight: 500;
  color: #333;
}

.goal-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.goal-deadline {
  font-size: 12px;
  color: #666;
}

.detailed-stats {
  margin-top: 24px;
}

.time-filter {
  margin-bottom: 24px;
  text-align: center;
}

.study-time-chart {
  margin-bottom: 32px;
}

.study-time-chart h4,
.activity-timeline h4 {
  margin: 0 0 16px 0;
  color: #333;
}

.chart-container {
  background: #fafafa;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.time-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 150px;
  gap: 8px;
}

.time-bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}

.bar-container {
  flex: 1;
  width: 30px;
  display: flex;
  align-items: flex-end;
  margin-bottom: 8px;
}

.time-bar {
  width: 100%;
  min-height: 4px;
  border-radius: 2px;
  transition: height 0.3s;
}

.bar-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.bar-value {
  font-size: 12px;
  font-weight: 500;
  color: #333;
}

.activity-item {
  margin-bottom: 8px;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.activity-title {
  font-weight: 500;
  color: #333;
}

.activity-time {
  font-size: 12px;
  color: #999;
}

.activity-details {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
}

.activity-duration,
.activity-score {
  color: #666;
}

.grade-overview {
  margin-bottom: 32px;
}

.grade-card {
  text-align: center;
}

.grade-trend {
  margin-bottom: 32px;
}

.grade-trend h4 {
  margin: 0 0 16px 0;
  color: #333;
}

.trend-chart {
  height: 200px;
  background: #fafafa;
  border-radius: 8px;
  position: relative;
  padding: 20px;
}

.trend-line {
  position: relative;
  height: 100%;
  width: 100%;
}

.trend-point {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #1890ff;
  border-radius: 50%;
  cursor: pointer;
}

.subject-comparison h4 {
  margin: 0 0 16px 0;
  color: #333;
}

.radar-chart {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radar-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
  border-radius: 8px;
}

.radar-placeholder,
.chart-placeholder {
  text-align: center;
  color: #999;
}

.radar-placeholder p,
.chart-placeholder p {
  margin: 8px 0 0 0;
}

.skill-assessment .skill-radar {
  margin-bottom: 32px;
}

.skill-radar h4 {
  margin: 0 0 16px 0;
  color: #333;
}

.skill-details {
  padding: 16px 0;
}

.skill-item {
  margin-bottom: 20px;
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.skill-name {
  font-weight: 500;
  color: #333;
}

.skill-level {
  font-size: 12px;
  color: #666;
}

.skill-progress {
  margin-bottom: 8px;
}

.skill-description {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

.growth-suggestions h4 {
  margin: 0 0 16px 0;
  color: #333;
}

.suggestions-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.suggestion-card {
  border-radius: 8px;
}

.suggestion-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.achievement-stats {
  margin-bottom: 24px;
  text-align: center;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.achievement-item {
  padding: 20px;
  border: 2px solid #f0f0f0;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.achievement-item:hover {
  border-color: #1890ff;
  transform: translateY(-2px);
}

.achievement-item.unlocked {
  border-color: #52c41a;
  background: #f6ffed;
}

.achievement-icon {
  margin-bottom: 12px;
}

.achievement-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.achievement-description {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.achievement-date {
  font-size: 12px;
  color: #52c41a;
}

.achievement-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-text {
  font-size: 12px;
  color: #666;
}

.certificates-section h4 {
  margin: 0 0 16px 0;
  color: #333;
}

.certificates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.certificate-item {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
}

.certificate-item:hover {
  border-color: #1890ff;
  transform: translateY(-2px);
}

.certificate-image {
  height: 150px;
  overflow: hidden;
}

.certificate-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.certificate-info {
  padding: 16px;
}

.certificate-info h5 {
  margin: 0 0 8px 0;
  color: #333;
}

.certificate-info p {
  margin: 0 0 8px 0;
  color: #666;
  font-size: 13px;
}

.certificate-date {
  font-size: 12px;
  color: #999;
}
</style>
