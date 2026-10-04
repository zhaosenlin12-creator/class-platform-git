<template>
  <a-modal
    title="模板预览"
    :width="1000"
    :visible="visible"
    :footer="null"
    @cancel="handleCancel">

    <div v-if="templateData">
      <!-- 模板头部信息 -->
      <a-card style="margin-bottom: 16px">
        <a-row :gutter="16">
          <a-col :span="4" v-if="templateData.templateCover">
            <img :src="getImgView(templateData.templateCover)" style="width: 100%; border-radius: 8px;" alt="模板封面"/>
          </a-col>
          <a-col :span="templateData.templateCover ? 20 : 24">
            <h2>{{ templateData.templateName }}</h2>
            <a-row :gutter="16" style="margin-bottom: 8px;">
              <a-col :span="6">
                <a-tag :color="getTypeColor(templateData.templateType)">{{ getTypeText(templateData.templateType) }}</a-tag>
              </a-col>
              <a-col :span="6">
                <a-tag color="blue">{{ getGradeLevelText(templateData.gradeLevel) }}</a-tag>
              </a-col>
              <a-col :span="6">
                <span>难度：</span><a-rate :value="templateData.difficulty" disabled :count="5" />
              </a-col>
              <a-col :span="6">
                <span>预计时长：{{ templateData.estimatedTime }}分钟</span>
              </a-col>
            </a-row>
            <p>{{ templateData.templateDescription }}</p>
          </a-col>
        </a-row>
      </a-card>

      <!-- 模板内容 -->
      <a-tabs defaultActiveKey="objectives">
        <!-- 学习目标 -->
        <a-tab-pane key="objectives" tab="学习目标">
          <a-card title="学习目标" size="small">
            <p>{{ templateData.learningObjectives || '暂无学习目标' }}</p>

            <div v-if="templateData.skillRequirements && templateData.skillRequirements.length > 0" style="margin-top: 16px;">
              <h4>技能要求：</h4>
              <a-tag v-for="skill in skillRequirements" :key="skill" color="geekblue" style="margin-bottom: 4px;">
                {{ skill }}
              </a-tag>
            </div>
          </a-card>
        </a-tab-pane>

        <!-- 任务内容 -->
        <a-tab-pane key="content" tab="任务内容">
          <a-card title="任务说明" size="small" style="margin-bottom: 16px;">
            <div v-html="templateData.taskContent || '暂无任务说明'"></div>
          </a-card>

          <a-card title="操作步骤" size="small" v-if="taskSteps && taskSteps.length > 0">
            <a-steps direction="vertical" :current="taskSteps.length">
              <a-step v-for="(step, index) in taskSteps" :key="index" :title="`步骤 ${index + 1}`" :description="step.content" />
            </a-steps>
          </a-card>
        </a-tab-pane>

        <!-- 评分标准 -->
        <a-tab-pane key="grading" tab="评分标准">
          <a-card title="评分方式" size="small">
            <a-tag :color="getGradingMethodColor(templateData.gradingMethod)">
              {{ getGradingMethodText(templateData.gradingMethod) }}
            </a-tag>

            <!-- 分项评分 -->
            <div v-if="templateData.gradingMethod === 'criteria' && gradingCriteria && gradingCriteria.length > 0" style="margin-top: 16px;">
              <h4>评分项目：</h4>
              <a-table :columns="criteriaColumns" :dataSource="gradingCriteria" :pagination="false" size="small">
                <template slot="weight" slot-scope="text">
                  {{ text }}%
                </template>
              </a-table>
            </div>

            <!-- 自动评分 -->
            <div v-if="templateData.gradingMethod === 'auto'" style="margin-top: 16px;">
              <h4>自动评分规则：</h4>
              <pre style="background: #f5f5f5; padding: 12px; border-radius: 4px;">{{ templateData.autoGradingRules || '暂无自动评分规则' }}</pre>
            </div>
          </a-card>
        </a-tab-pane>

        <!-- 资源素材 -->
        <a-tab-pane key="resources" tab="资源素材">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-card title="参考资料" size="small" style="margin-bottom: 16px;">
                <div v-if="referenceFiles && referenceFiles.length > 0">
                  <a-list :dataSource="referenceFiles" size="small">
                    <a-list-item slot="renderItem" slot-scope="item">
                      <a-button type="link" @click="downloadFile(item)">
                        <a-icon type="download" /> {{ getFileName(item) }}
                      </a-button>
                    </a-list-item>
                  </a-list>
                </div>
                <p v-else style="color: #999;">暂无参考资料</p>
              </a-card>
            </a-col>

            <a-col :span="12">
              <a-card title="示例文件" size="small" style="margin-bottom: 16px;">
                <div v-if="exampleFiles && exampleFiles.length > 0">
                  <a-list :dataSource="exampleFiles" size="small">
                    <a-list-item slot="renderItem" slot-scope="item">
                      <a-button type="link" @click="downloadFile(item)">
                        <a-icon type="download" /> {{ getFileName(item) }}
                      </a-button>
                    </a-list-item>
                  </a-list>
                </div>
                <p v-else style="color: #999;">暂无示例文件</p>
              </a-card>
            </a-col>

            <a-col :span="24" v-if="templateData.starterTemplate">
              <a-card title="起始模板" size="small">
                <a-button type="primary" @click="downloadFile(templateData.starterTemplate)">
                  <a-icon type="download" /> 下载起始模板
                </a-button>
              </a-card>
            </a-col>
          </a-row>
        </a-tab-pane>
      </a-tabs>

      <!-- 底部操作按钮 -->
      <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e8e8e8;">
        <a-button @click="handleEdit" type="primary" icon="edit" style="margin-right: 8px;">编辑模板</a-button>
        <a-button @click="handleUseTemplate" type="default" icon="plus">使用模板</a-button>
      </div>
    </div>
  </a-modal>
</template>

<script>
export default {
    name: 'TeachingWorkTemplatePreview',
    data () {
        return {
            visible: false,
            templateData: null,
            criteriaColumns: [
                {
                    title: '评分项目',
                    dataIndex: 'name',
                    width: '30%'
                },
                {
                    title: '权重',
                    dataIndex: 'weight',
                    width: '20%',
                    scopedSlots: { customRender: 'weight' }
                },
                {
                    title: '评分说明',
                    dataIndex: 'description',
                    width: '50%'
                }
            ]
        }
    },
    computed: {
        skillRequirements () {
            if (!this.templateData || !this.templateData.skillRequirements) return []
            return typeof this.templateData.skillRequirements === 'string'
                ? JSON.parse(this.templateData.skillRequirements)
                : this.templateData.skillRequirements
        },
        taskSteps () {
            if (!this.templateData || !this.templateData.taskSteps) return []
            return typeof this.templateData.taskSteps === 'string'
                ? JSON.parse(this.templateData.taskSteps)
                : this.templateData.taskSteps
        },
        gradingCriteria () {
            if (!this.templateData || !this.templateData.gradingCriteria) return []
            return typeof this.templateData.gradingCriteria === 'string'
                ? JSON.parse(this.templateData.gradingCriteria)
                : this.templateData.gradingCriteria
        },
        referenceFiles () {
            if (!this.templateData || !this.templateData.referenceFiles) return []
            return typeof this.templateData.referenceFiles === 'string'
                ? this.templateData.referenceFiles.split(',')
                : this.templateData.referenceFiles
        },
        exampleFiles () {
            if (!this.templateData || !this.templateData.exampleFiles) return []
            return typeof this.templateData.exampleFiles === 'string'
                ? this.templateData.exampleFiles.split(',')
                : this.templateData.exampleFiles
        }
    },
    methods: {
        show (record) {
            this.templateData = record
            this.visible = true
        },

        handleCancel () {
            this.visible = false
        },

        handleEdit () {
            this.$emit('edit', this.templateData)
            this.visible = false
        },

        handleUseTemplate () {
            this.$emit('useTemplate', this.templateData)
            this.visible = false
        },

        getTypeColor (type) {
            const colors = {
                'scratch': 'orange',
                'python': 'green',
                'web': 'blue',
                'game': 'purple',
                'ai': 'red'
            }
            return colors[type] || 'default'
        },

        getTypeText (type) {
            const types = {
                'scratch': 'Scratch编程',
                'python': 'Python编程',
                'web': '网页设计',
                'game': '游戏开发',
                'ai': '人工智能'
            }
            return types[type] || type
        },

        getGradeLevelText (level) {
            const levels = {
                'grade1': '一年级',
                'grade2': '二年级',
                'grade3': '三年级',
                'grade4': '四年级',
                'grade5': '五年级',
                'grade6': '六年级',
                'junior': '初中',
                'senior': '高中'
            }
            return levels[level] || level
        },

        getGradingMethodColor (method) {
            const colors = {
                'comprehensive': 'blue',
                'criteria': 'green',
                'auto': 'orange'
            }
            return colors[method] || 'default'
        },

        getGradingMethodText (method) {
            const methods = {
                'comprehensive': '综合评分',
                'criteria': '分项评分',
                'auto': '自动评分'
            }
            return methods[method] || method
        },

        getFileName (filePath) {
            if (!filePath) return '未知文件'
            return filePath.split('/').pop() || filePath
        },

        downloadFile (filePath) {
            if (!filePath) return
            // 实现文件下载逻辑
            window.open(filePath, '_blank')
        },

        getImgView (path) {
            if (!path) return ''
            if (path.startsWith('http')) return path
            return window._CONFIG['domainURL'] + '/' + path
        }
    }
}
</script>

<style scoped>
.ant-card {
  border-radius: 8px;
}
.ant-card-head-title {
  font-weight: 600;
}
</style>
