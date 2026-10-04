<template>
  <div class="homework-view">
    <a-card>
      <div slot="title">
        <a-icon type="file-text" />
        作业详情
      </div>
      <div slot="extra">
        <a-button @click="goBack">返回</a-button>
      </div>

      <div v-if="homework">
        <a-row :gutter="16">
          <a-col :span="16">
            <a-card title="作业信息" style="margin-bottom: 16px;">
              <a-descriptions :column="2" bordered>
                <a-descriptions-item label="作业标题">{{ safe(homework.homeworkTitle) }}</a-descriptions-item>
                <a-descriptions-item label="课程名称">{{ safe(homework.courseName) }}</a-descriptions-item>
                <a-descriptions-item label="提交时间">{{ safe(homework.submitTime) }}</a-descriptions-item>
                <a-descriptions-item label="批改时间">{{ safe(homework.gradeTime) || '待批改' }}</a-descriptions-item>
                <a-descriptions-item label="得分" v-if="homework.score !== undefined">
                  <span :style="{ color: getScoreColor(homework.score), fontSize: '18px', fontWeight: 'bold' }">
                    {{ homework.score }}/100
                  </span>
                </a-descriptions-item>
                <a-descriptions-item label="状态" v-else>
                  <a-tag color="blue">批改中</a-tag>
                </a-descriptions-item>
              </a-descriptions>
            </a-card>

            <a-card title="提交内容" style="margin-bottom: 16px;">
              <a-descriptions>
                <a-descriptions-item label="作业说明">
                  {{ safe(homework.description) }}
                </a-descriptions-item>
                <a-descriptions-item label="提交文件" v-if="homework.files && homework.files.length > 0">
                  <ul style="margin: 0; padding-left: 20px;">
                    <li v-for="file in homework.files" :key="file.id">
                      <a-icon type="file" />
                      {{ safe(file.name) }}
                      <a-button size="small" type="link" @click="downloadFile(file)">下载</a-button>
                    </li>
                  </ul>
                </a-descriptions-item>
                <a-descriptions-item label="作品链接" v-if="homework.url">
                  <a :href="sanitizeUrl(homework.url)" target="_blank" rel="noopener noreferrer">{{ safe(homework.url) }}</a>
                </a-descriptions-item>
              </a-descriptions>
            </a-card>

            <a-card title="教师反馈" v-if="homework.feedback">
              <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; border-left: 4px solid #1890ff;">
                <a-icon type="message" style="margin-right: 8px;" />
                {{ safe(homework.feedback) }}
              </div>
            </a-card>

            <a-card title="教师反馈" v-else>
              <a-empty description="暂无教师反馈">
                <span slot="description">作业批改完成后将显示教师反馈</span>
              </a-empty>
            </a-card>
          </a-col>

          <a-col :span="8">
            <a-card title="作业统计" size="small">
              <a-statistic
                title="得分"
                :value="homework.score || 0"
                suffix="/100"
                :value-style="{ color: getScoreColor(homework.score || 0) }"
                v-if="homework.score !== undefined"
              />
              <a-statistic
                title="状态"
                value="批改中"
                :value-style="{ color: '#1890ff' }"
                v-else
              />
            </a-card>

            <a-card title="操作" size="small" style="margin-top: 16px;">
              <a-button block style="margin-bottom: 8px;" @click="downloadAllFiles" v-if="homework.files && homework.files.length > 0">
                <a-icon type="download" />
                下载所有文件
              </a-button>
              <a-button block style="margin-bottom: 8px;" @click="printResult" v-if="homework.score !== undefined">
                <a-icon type="printer" />
                打印成绩单
              </a-button>
              <a-button block @click="resubmit" v-if="isResubmitAllowed">
                <a-icon type="reload" />
                重新提交
              </a-button>
            </a-card>

            <a-card title="评分标准" size="small" style="margin-top: 16px;" v-if="homework.gradingCriteria">
              <ul style="margin: 0; padding-left: 20px; font-size: 12px;">
                <li v-for="criteria in homework.gradingCriteria" :key="criteria.id">
                  {{ safe(criteria.item) }}:{{ criteria.score }}分
                </li>
              </ul>
            </a-card>

            <a-card title="同学作品" size="small" style="margin-top: 16px;">
              <a-list size="small" :data-source="relatedWorks">
                <a-list-item slot="renderItem" slot-scope="item">
                  <a-list-item-meta>
                    <div slot="title" style="font-size: 12px;">{{ safe(item.author) }}</div>
                    <div slot="description" style="font-size: 11px;">得分:{{ item.score }}/100</div>
                  </a-list-item-meta>
                  <template slot="actions">
                    <a style="font-size: 11px;" @click="viewOtherWork(item)">查看</a>
                  </template>
                </a-list-item>
              </a-list>
            </a-card>
          </a-col>
        </a-row>
      </div>

      <div v-else>
        <a-result
          status="404"
          title="作业不存在"
          sub-title="未找到指定的作业信息"
        >
          <template #extra>
            <a-button type="primary" @click="goBack">返回作业列表</a-button>
          </template>
        </a-result>
      </div>
    </a-card>
  </div>
</template>

<script>
import { sanitizeInput } from '@/utils/security'

export default {
    name: 'HomeworkView',
    data () {
        return {
            homework: null,
            relatedWorks: [
                { id: '1', author: '张小明', score: 95 },
                { id: '2', author: '李小红', score: 88 },
                { id: '3', author: '王小强', score: 92 }
            ],
            homeworkData: [
                {
                    id: '4',
                    homeworkTitle: '制作自我介绍动画',
                    courseName: 'Scratch入门编程',
                    submitTime: '2024-01-20 15:30',
                    gradeTime: '2024-01-21 10:15',
                    score: 95,
                    feedback: '作品很棒!动画流畅,创意丰富。建议可以增加更多的互动元素。',
                    description: '我制作了一个介绍自己的动画,包含了我的爱好和特长。',
                    url: 'https://scratch.mit.edu/projects/123456',
                    files: [
                        { id: '1', name: '自我介绍动画.sb3', url: '#' }
                    ],
                    gradingCriteria: [
                        { id: '1', item: '创意性', score: 25 },
                        { id: '2', item: '技术实现', score: 25 },
                        { id: '3', item: '界面设计', score: 25 },
                        { id: '4', item: '完整性', score: 25 }
                    ]
                },
                {
                    id: '5',
                    homeworkTitle: '简单计算器',
                    courseName: 'Python基础教程',
                    submitTime: '2024-01-18 20:45',
                    gradeTime: '2024-01-19 14:20',
                    score: 88,
                    feedback: '代码逻辑正确,但可以增加异常处理。界面可以更加美观。',
                    description: '实现了加减乘除四种基本运算功能。',
                    files: [
                        { id: '2', name: 'calculator.py', url: '#' }
                    ],
                    gradingCriteria: [
                        { id: '1', item: '功能完整性', score: 30 },
                        { id: '2', item: '代码规范', score: 25 },
                        { id: '3', item: '异常处理', score: 20 },
                        { id: '4', item: '用户体验', score: 25 }
                    ]
                },
                {
                    id: '6',
                    homeworkTitle: '贪吃蛇游戏',
                    courseName: 'Python进阶编程',
                    submitTime: '2024-01-22 18:30',
                    description: '使用pygame库制作的贪吃蛇游戏,包含计分和游戏结束功能。',
                    files: [
                        { id: '3', name: 'snake_game.py', url: '#' },
                        { id: '4', name: 'game_sounds.zip', url: '#' }
                    ]
                }
            ]
        }
    },
    computed: {
        isResubmitAllowed () {
            // 如果还在截止时间内且允许重新提交
            return this.homework && !this.homework.gradeTime
        }
    },
    created () {
        this.loadHomework()
    },
    methods: {
    // XSS防护方法
        safe (text) {
            return sanitizeInput(text, { maxLength: 500 })
        },

        // URL安全化
        sanitizeUrl (url) {
            if (!url) return '#'
            // 只允许http和https协议
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return url
            }
            return '#'
        },

        loadHomework () {
            const homeworkId = this.$route.params.id
            this.homework = this.homeworkData.find(h => h.id === homeworkId)
        },

        goBack () {
            this.$router.push('/student/homework')
        },

        getScoreColor (score) {
            if (score >= 90) return '#52c41a'
            if (score >= 70) return '#1890ff'
            if (score >= 60) return '#fa8c16'
            return '#f5222d'
        },

        downloadFile (file) {
            this.$message.success(`下载文件:${this.safe(file.name)}`)
        },

        downloadAllFiles () {
            this.$message.success('正在下载所有文件...')
        },

        printResult () {
            this.$message.info('正在准备打印成绩单...')
        },

        resubmit () {
            this.$router.push(`/student/homework/${this.homework.id}/submit`)
        },

        viewOtherWork (work) {
            this.$message.info(`查看 ${this.safe(work.author)} 的作品`)
        }
    }
}
</script>

<style scoped lang="less">
.homework-view {
  padding: 24px;

  .ant-descriptions {
    margin-bottom: 16px;
  }

  .ant-card-head-title {
    font-weight: 600;
  }

  .ant-statistic {
    text-align: center;
  }

  .ant-list-item {
    padding: 8px 0;
  }
}
</style>
