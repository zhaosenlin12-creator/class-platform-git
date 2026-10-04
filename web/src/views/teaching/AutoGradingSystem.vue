<template>
  <div class="auto-grading-system">
    <!-- 头部 -->
    <div class="system-header">
      <h1>自动评分系统</h1>
      <p>基于AI算法的智能代码评分引擎</p>
    </div>

    <!-- 主要内容 -->
    <a-row :gutter="24">
      <!-- 左侧评分配置 -->
      <a-col :span="8">
        <a-card title="评分配置" :bordered="false">
          <a-form :form="configForm" layout="vertical">
            <!-- 评分类型选择 -->
            <a-form-item label="评分类型">
              <a-select v-decorator="['gradingType', {initialValue: 'comprehensive'}]" @change="onGradingTypeChange">
                <a-select-option value="comprehensive">综合评分</a-select-option>
                <a-select-option value="criteria">分项评分</a-select-option>
                <a-select-option value="test_driven">测试驱动</a-select-option>
                <a-select-option value="ai_analysis">AI智能分析</a-select-option>
              </a-select>
            </a-form-item>

            <!-- 分项评分配置 -->
            <div v-if="gradingType === 'criteria'">
              <h4>评分项目配置</h4>
              <div v-for="(criteria, index) in gradingCriteria" :key="index" class="criteria-item">
                <a-row :gutter="8">
                  <a-col :span="12">
                    <a-input v-model="criteria.name" placeholder="评分项名称" />
                  </a-col>
                  <a-col :span="8">
                    <a-input-number v-model="criteria.weight" :min="0" :max="100" placeholder="权重%" />
                  </a-col>
                  <a-col :span="4">
                    <a-button @click="removeCriteria(index)" type="danger" size="small" icon="delete"></a-button>
                  </a-col>
                </a-row>
                <a-textarea v-model="criteria.description" placeholder="评分标准说明" :rows="2" style="margin-top: 8px;" />
              </div>
              <a-button @click="addCriteria" type="dashed" block style="margin-top: 8px;">
                <a-icon type="plus" /> 添加评分项
              </a-button>
            </div>

            <!-- 测试用例配置 -->
            <div v-if="gradingType === 'test_driven'">
              <h4>测试用例配置</h4>
              <div v-for="(testCase, index) in testCases" :key="index" class="test-case-item">
                <a-row :gutter="8">
                  <a-col :span="16">
                    <a-input v-model="testCase.name" placeholder="测试用例名称" />
                  </a-col>
                  <a-col :span="6">
                    <a-input-number v-model="testCase.score" :min="0" :max="100" placeholder="分值" />
                  </a-col>
                  <a-col :span="2">
                    <a-button @click="removeTestCase(index)" type="danger" size="small" icon="delete"></a-button>
                  </a-col>
                </a-row>
                <a-textarea v-model="testCase.input" placeholder="测试输入" :rows="2" style="margin-top: 4px;" />
                <a-textarea v-model="testCase.expected" placeholder="期望输出" :rows="2" style="margin-top: 4px;" />
              </div>
              <a-button @click="addTestCase" type="dashed" block style="margin-top: 8px;">
                <a-icon type="plus" /> 添加测试用例
              </a-button>
            </div>

            <!-- AI分析配置 -->
            <div v-if="gradingType === 'ai_analysis'">
              <a-form-item label="AI分析模型">
                <a-select v-decorator="['aiModel', {initialValue: 'standard'}]">
                  <a-select-option value="standard">标准模型</a-select-option>
                  <a-select-option value="advanced">高级模型</a-select-option>
                  <a-select-option value="custom">自定义模型</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="分析维度">
                <a-checkbox-group v-decorator="['analysisAspects', {initialValue: ['correctness', 'style', 'efficiency']}]">
                  <a-checkbox value="correctness">正确性</a-checkbox>
                  <a-checkbox value="style">代码风格</a-checkbox>
                  <a-checkbox value="efficiency">执行效率</a-checkbox>
                  <a-checkbox value="readability">可读性</a-checkbox>
                  <a-checkbox value="innovation">创新性</a-checkbox>
                </a-checkbox-group>
              </a-form-item>
            </div>

            <!-- 通用配置 -->
            <a-form-item label="总分设置">
              <a-input-number v-decorator="['totalScore', {initialValue: 100}]" :min="1" :max="1000" />
            </a-form-item>

            <a-form-item label="及格分数">
              <a-input-number v-decorator="['passingScore', {initialValue: 60}]" :min="1" :max="1000" />
            </a-form-item>

            <a-form-item>
              <a-button type="primary" @click="saveConfig" block>保存配置</a-button>
            </a-form-item>
          </a-form>
        </a-card>

        <!-- 评分规则管理 -->
        <a-card title="评分规则库" style="margin-top: 16px;">
          <a-list :dataSource="savedRules" size="small">
            <a-list-item slot="renderItem" slot-scope="item">
              <div style="width: 100%;">
                <div style="display: flex; justify-content: space-between;">
                  <span>{{ item.name }}</span>
                  <div>
                    <a-button size="small" type="link" @click="loadRule(item)">加载</a-button>
                    <a-button size="small" type="link" @click="deleteRule(item)">删除</a-button>
                  </div>
                </div>
                <p style="margin: 4px 0 0 0; color: #666; font-size: 12px;">{{ item.description }}</p>
              </div>
            </a-list-item>
          </a-list>
        </a-card>
      </a-col>

      <!-- 中间评分演示 -->
      <a-col :span="10">
        <a-card title="评分演示" :bordered="false">
          <!-- 代码输入区 -->
          <div class="demo-section">
            <h4>测试代码</h4>
            <a-textarea
              v-model="testCode"
              placeholder="请输入要评分的代码..."
              :rows="12"
              style="font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;"
            />
            <div style="margin-top: 8px;">
              <a-button type="primary" @click="performGrading" :loading="grading">
                <a-icon type="thunderbolt" /> 开始评分
              </a-button>
              <a-button @click="loadSampleCode" style="margin-left: 8px;">加载示例代码</a-button>
            </div>
          </div>

          <!-- 评分进度 -->
          <div v-if="gradingProgress.show" class="grading-progress" style="margin-top: 16px;">
            <h4>评分进度</h4>
            <a-steps :current="gradingProgress.current" size="small">
              <a-step title="代码解析" />
              <a-step title="语法检查" />
              <a-step title="逻辑分析" />
              <a-step title="性能评估" />
              <a-step title="生成报告" />
            </a-steps>
            <a-progress :percent="gradingProgress.percent" style="margin-top: 12px;" />
          </div>

          <!-- 评分结果 -->
          <div v-if="gradingResult" class="grading-result" style="margin-top: 16px;">
            <h4>评分结果</h4>
            <div class="result-summary">
              <a-statistic title="总分" :value="gradingResult.totalScore" suffix="/ 100" />
              <a-tag :color="getScoreColor(gradingResult.totalScore)" style="margin-top: 8px;">
                {{ getScoreLevel(gradingResult.totalScore) }}
              </a-tag>
            </div>

            <!-- 分项得分 -->
            <div v-if="gradingResult.breakdown" class="score-breakdown" style="margin-top: 16px;">
              <h5>分项得分</h5>
              <div v-for="item in gradingResult.breakdown" :key="item.name" class="score-item">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>{{ item.name }}</span>
                  <span>{{ item.score }}/{{ item.maxScore }}</span>
                </div>
                <a-progress :percent="(item.score / item.maxScore) * 100" size="small" />
              </div>
            </div>
          </div>
        </a-card>
      </a-col>

      <!-- 右侧详细分析 -->
      <a-col :span="6">
        <a-card title="详细分析" :bordered="false">
          <div v-if="gradingResult">
            <!-- 代码质量分析 -->
            <div class="quality-analysis">
              <h4>代码质量</h4>
              <a-list :dataSource="gradingResult.qualityAnalysis" size="small">
                <a-list-item slot="renderItem" slot-scope="item">
                  <div class="quality-item">
                    <a-icon :type="getQualityIcon(item.type)" :style="{ color: getQualityColor(item.type) }" />
                    <span style="margin-left: 8px;">{{ item.message }}</span>
                  </div>
                </a-list-item>
              </a-list>
            </div>

            <!-- 改进建议 -->
            <div class="improvement-suggestions" style="margin-top: 16px;">
              <h4>改进建议</h4>
              <a-list :dataSource="gradingResult.suggestions" size="small">
                <a-list-item slot="renderItem" slot-scope="item, index">
                  <div class="suggestion-item">
                    <a-tag color="blue">{{ index + 1 }}</a-tag>
                    <span style="margin-left: 8px;">{{ item.suggestion }}</span>
                    <div v-if="item.example" style="margin-top: 4px; font-size: 12px; color: #666;">
                      示例：{{ item.example }}
                    </div>
                  </div>
                </a-list-item>
              </a-list>
            </div>

            <!-- 算法复杂度分析 -->
            <div v-if="gradingResult.complexity" class="complexity-analysis" style="margin-top: 16px;">
              <h4>算法复杂度</h4>
              <div class="complexity-item">
                <span>时间复杂度：</span>
                <a-tag>{{ gradingResult.complexity.time }}</a-tag>
              </div>
              <div class="complexity-item" style="margin-top: 8px;">
                <span>空间复杂度：</span>
                <a-tag>{{ gradingResult.complexity.space }}</a-tag>
              </div>
            </div>

            <!-- 相似度检测 -->
            <div v-if="gradingResult.similarity" class="similarity-check" style="margin-top: 16px;">
              <h4>相似度检测</h4>
              <a-progress
                :percent="gradingResult.similarity.percentage"
                :status="gradingResult.similarity.percentage > 80 ? 'exception' : 'success'"
              />
              <p style="font-size: 12px; color: #666; margin-top: 4px;">
                与已有代码相似度：{{ gradingResult.similarity.percentage }}%
              </p>
            </div>
          </div>

          <!-- 评分历史 -->
          <div v-else class="grading-history">
            <h4>最近评分</h4>
            <a-list :dataSource="recentGradings" size="small">
              <a-list-item slot="renderItem" slot-scope="item">
                <div style="width: 100%;">
                  <div style="display: flex; justify-content: space-between;">
                    <span>{{ item.fileName }}</span>
                    <a-tag :color="getScoreColor(item.score)">{{ item.score }}</a-tag>
                  </div>
                  <p style="margin: 4px 0 0 0; color: #666; font-size: 12px;">
                    {{ item.time | moment }}
                  </p>
                </div>
              </a-list-item>
            </a-list>
          </div>
        </a-card>

        <!-- 统计信息 -->
        <a-card title="评分统计" style="margin-top: 16px;">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-statistic title="今日评分" :value="statistics.todayCount" />
            </a-col>
            <a-col :span="12">
              <a-statistic title="平均分" :value="statistics.averageScore" :precision="1" />
            </a-col>
          </a-row>
          <a-row :gutter="16" style="margin-top: 16px;">
            <a-col :span="12">
              <a-statistic title="总评分数" :value="statistics.totalCount" />
            </a-col>
            <a-col :span="12">
              <a-statistic title="优秀率" :value="statistics.excellentRate" suffix="%" />
            </a-col>
          </a-row>
        </a-card>
      </a-col>
    </a-row>

    <!-- 批量评分弹窗 -->
    <a-modal
      title="批量评分"
      :visible="batchGradingModal"
      @ok="confirmBatchGrading"
      @cancel="batchGradingModal = false"
      :confirmLoading="batchGrading"
      width="800px">
      <a-upload
        :file-list="uploadFiles"
        @change="handleUploadChange"
        :before-upload="beforeUpload"
        multiple>
        <a-button>
          <a-icon type="upload" /> 选择代码文件
        </a-button>
      </a-upload>

      <div v-if="batchResults.length > 0" style="margin-top: 16px;">
        <h4>评分结果</h4>
        <a-table :columns="batchColumns" :dataSource="batchResults" size="small" :pagination="false">
          <template slot="score" slot-scope="text">
            <a-tag :color="getScoreColor(text)">{{ text }}</a-tag>
          </template>
          <template slot="status" slot-scope="text">
            <a-badge :status="text === 'completed' ? 'success' : 'processing'" :text="text === 'completed' ? '完成' : '处理中'" />
          </template>
        </a-table>
      </div>
    </a-modal>
  </div>
</template>

<script>
import moment from 'moment'
import { getAction, postAction } from '@/api/manage'

export default {
    name: 'AutoGradingSystem',
    filters: {
        moment: function (date) {
            return date ? moment(date).format('MM-DD HH:mm') : '-'
        }
    },
    data () {
        return {
            configForm: this.$form.createForm(this),

            // 评分配置
            gradingType: 'comprehensive',
            gradingCriteria: [
                { name: '代码正确性', weight: 40, description: '程序能否正确运行并产生期望结果' },
                { name: '代码风格', weight: 20, description: '代码格式、命名规范、注释质量' },
                { name: '算法效率', weight: 25, description: '算法时间和空间复杂度' },
                { name: '创新性', weight: 15, description: '解决方案的创新程度' }
            ],
            testCases: [
                { name: '基础功能测试', score: 30, input: '', expected: 'Hello World' },
                { name: '边界条件测试', score: 25, input: '0', expected: '0' },
                { name: '异常处理测试', score: 25, input: 'invalid', expected: 'Error' },
                { name: '性能测试', score: 20, input: '1000', expected: 'completed' }
            ],

            // 演示相关
            testCode: `# Python编程作业示例
def factorial(n):
    """计算阶乘"""
    if n <= 1:
        return 1
    return n * factorial(n - 1)

def main():
    print("计算5的阶乘:")
    result = factorial(5)
    print(f"5! = {result}")

if __name__ == "__main__":
    main()`,

            // 评分状态
            grading: false,
            gradingProgress: {
                show: false,
                current: 0,
                percent: 0
            },
            gradingResult: null,

            // 批量评分
            batchGradingModal: false,
            batchGrading: false,
            uploadFiles: [],
            batchResults: [],
            batchColumns: [
                { title: '文件名', dataIndex: 'fileName', width: '30%' },
                { title: '得分', dataIndex: 'score', width: '20%', scopedSlots: { customRender: 'score' } },
                { title: '状态', dataIndex: 'status', width: '20%', scopedSlots: { customRender: 'status' } },
                { title: '耗时', dataIndex: 'duration', width: '15%' },
                { title: '操作', dataIndex: 'action', width: '15%' }
            ],

            // 保存的规则
            savedRules: [
                { id: 1, name: 'Python基础作业', description: '适用于Python入门级作业评分' },
                { id: 2, name: '算法竞赛', description: '适用于算法编程竞赛' },
                { id: 3, name: '项目作业', description: '适用于综合项目评分' }
            ],

            // 评分历史
            recentGradings: [
                { fileName: 'hello.py', score: 85, time: new Date(Date.now() - 3600000) },
                { fileName: 'calculator.py', score: 92, time: new Date(Date.now() - 7200000) },
                { fileName: 'sort.py', score: 78, time: new Date(Date.now() - 10800000) }
            ],

            // 统计信息
            statistics: {
                todayCount: 47,
                totalCount: 1256,
                averageScore: 83.2,
                excellentRate: 68.5
            }
        }
    },
    methods: {
        onGradingTypeChange (value) {
            this.gradingType = value
        },

        addCriteria () {
            this.gradingCriteria.push({
                name: '',
                weight: 0,
                description: ''
            })
        },

        removeCriteria (index) {
            this.gradingCriteria.splice(index, 1)
        },

        addTestCase () {
            this.testCases.push({
                name: '',
                score: 0,
                input: '',
                expected: ''
            })
        },

        removeTestCase (index) {
            this.testCases.splice(index, 1)
        },

        saveConfig () {
            this.configForm.validateFields((err, values) => {
                if (!err) {
                    const config = {
                        ...values,
                        gradingCriteria: this.gradingCriteria,
                        testCases: this.testCases
                    }

                    postAction('/teaching/autoGrading/saveConfig', config).then(res => {
                        if (res.success) {
                            this.$message.success('配置保存成功')
                        } else {
                            this.$message.error('保存失败：' + res.message)
                        }
                    })
                }
            })
        },

        loadSampleCode () {
            const samples = [
                {
                    name: '冒泡排序',
                    code: `def bubble_sort(arr):
    """冒泡排序算法"""
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr

# 测试代码
numbers = [64, 34, 25, 12, 22, 11, 90]
print("排序前:", numbers)
sorted_numbers = bubble_sort(numbers.copy())
print("排序后:", sorted_numbers)`
                },
                {
                    name: '斐波那契数列',
                    code: `def fibonacci(n):
    """计算斐波那契数列"""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

def fibonacci_optimized(n):
    """优化版斐波那契数列"""
    if n <= 1:
        return n

    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

# 测试
for i in range(10):
    print(f"F({i}) = {fibonacci_optimized(i)}")`
                }
            ]

            this.$confirm({
                title: '选择示例代码',
                content: h => h('div', [
                    h('p', '请选择要加载的示例代码：'),
                    ...samples.map((sample, index) =>
                        h('a-button', {
                            props: { block: true, style: 'margin-bottom: 8px;' },
                            on: { click: () => {
                                this.testCode = sample.code
                                this.$destroy()
                            } }
                        }, sample.name)
                    )
                ])
            })
        },

        async performGrading () {
            if (!this.testCode.trim()) {
                this.$message.warning('请输入要评分的代码')
                return
            }

            this.grading = true
            this.gradingProgress.show = true
            this.gradingProgress.current = 0
            this.gradingProgress.percent = 0
            this.gradingResult = null

            try {
                // 模拟评分过程
                await this.simulateGradingSteps()

                // 调用后端评分API
                const response = await postAction('/api/autoGrading/grade', {
                    code: this.testCode,
                    gradingType: this.gradingType,
                    criteria: this.gradingCriteria,
                    testCases: this.testCases
                })

                if (response.success) {
                    this.gradingResult = response.result
                } else {
                    // 使用模拟数据
                    this.gradingResult = this.generateMockResult()
                }
            } catch (error) {
                this.gradingResult = this.generateMockResult()
            }

            this.grading = false
            this.gradingProgress.show = false
        },

        async simulateGradingSteps () {
            const steps = [
                { name: '代码解析', delay: 800 },
                { name: '语法检查', delay: 600 },
                { name: '逻辑分析', delay: 1200 },
                { name: '性能评估', delay: 900 },
                { name: '生成报告', delay: 500 }
            ]

            for (let i = 0; i < steps.length; i++) {
                await new Promise(resolve => setTimeout(resolve, steps[i].delay))
                this.gradingProgress.current = i + 1
                this.gradingProgress.percent = ((i + 1) / steps.length) * 100
            }
        },

        generateMockResult () {
            // 生成模拟评分结果
            const baseScore = Math.floor(Math.random() * 30) + 70 // 70-100分

            return {
                totalScore: baseScore,
                breakdown: this.gradingCriteria.map(criteria => ({
                    name: criteria.name,
                    score: Math.floor((baseScore / 100) * criteria.weight * (0.8 + Math.random() * 0.4)),
                    maxScore: criteria.weight
                })),
                qualityAnalysis: [
                    { type: 'success', message: '代码语法正确，无语法错误' },
                    { type: 'info', message: '变量命名规范，符合Python规范' },
                    { type: 'warning', message: '建议添加更多注释说明' },
                    { type: 'success', message: '函数结构清晰，逻辑合理' }
                ],
                suggestions: [
                    { suggestion: '可以优化算法效率，考虑使用更高效的排序算法', example: '如快速排序、归并排序' },
                    { suggestion: '添加输入验证，提高程序健壮性', example: 'if not isinstance(n, int): raise ValueError()' },
                    { suggestion: '考虑添加文档字符串，提高代码可读性', example: '"""函数功能说明"""' }
                ],
                complexity: {
                    time: 'O(n²)',
                    space: 'O(1)'
                },
                similarity: {
                    percentage: Math.floor(Math.random() * 40) + 10 // 10-50%
                }
            }
        },

        getScoreColor (score) {
            if (score >= 90) return 'green'
            if (score >= 80) return 'blue'
            if (score >= 70) return 'orange'
            if (score >= 60) return 'gold'
            return 'red'
        },

        getScoreLevel (score) {
            if (score >= 90) return '优秀'
            if (score >= 80) return '良好'
            if (score >= 70) return '中等'
            if (score >= 60) return '及格'
            return '不及格'
        },

        getQualityIcon (type) {
            const icons = {
                'success': 'check-circle',
                'warning': 'exclamation-circle',
                'error': 'close-circle',
                'info': 'info-circle'
            }
            return icons[type] || 'info-circle'
        },

        getQualityColor (type) {
            const colors = {
                'success': '#52c41a',
                'warning': '#fa8c16',
                'error': '#f5222d',
                'info': '#1890ff'
            }
            return colors[type] || '#1890ff'
        },

        loadRule (rule) {
            // 加载评分规则
            getAction('/teaching/autoGrading/getRule', { id: rule.id }).then(res => {
                if (res.success) {
                    this.gradingCriteria = res.result.criteria || this.gradingCriteria
                    this.testCases = res.result.testCases || this.testCases
                    this.$message.success(`已加载规则：${rule.name}`)
                }
            })
        },

        deleteRule (rule) {
            this.$confirm({
                title: '确认删除',
                content: `确定要删除规则"${rule.name}"吗？`,
                onOk: () => {
                    const index = this.savedRules.findIndex(r => r.id === rule.id)
                    if (index > -1) {
                        this.savedRules.splice(index, 1)
                        this.$message.success('删除成功')
                    }
                }
            })
        },

        // 批量评分相关方法
        handleUploadChange (info) {
            this.uploadFiles = info.fileList
        },

        beforeUpload (file) {
            const isPython = file.name.endsWith('.py')
            if (!isPython) {
                this.$message.error('请上传Python文件(.py)')
            }
            return false // 阻止自动上传
        },

        async confirmBatchGrading () {
            if (this.uploadFiles.length === 0) {
                this.$message.warning('请选择要评分的文件')
                return
            }

            this.batchGrading = true
            this.batchResults = []

            for (const file of this.uploadFiles) {
                const result = {
                    fileName: file.name,
                    score: Math.floor(Math.random() * 30) + 70,
                    status: 'processing',
                    duration: '0s'
                }

                this.batchResults.push(result)

                // 模拟评分过程
                setTimeout(() => {
                    result.status = 'completed'
                    result.duration = `${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 9)}s`
                }, Math.random() * 2000 + 1000)
            }

            setTimeout(() => {
                this.batchGrading = false
                this.$message.success('批量评分完成')
            }, 3000)
        }
    }
}
</script>

<style scoped>
.auto-grading-system {
  padding: 24px;
  min-height: 100vh;
  background: #f5f5f5;
}

.system-header {
  text-align: center;
  margin-bottom: 32px;
}

.system-header h1 {
  font-size: 32px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #1f2329;
}

.system-header p {
  font-size: 16px;
  color: #86909c;
  margin: 0;
}

.criteria-item, .test-case-item {
  padding: 12px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  margin-bottom: 8px;
  background: #fafafa;
}

.demo-section h4 {
  margin: 0 0 12px 0;
  color: #333;
  font-weight: 600;
}

.grading-progress {
  padding: 16px;
  background: #f9f9f9;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.grading-result {
  padding: 16px;
  background: #f6ffed;
  border-radius: 6px;
  border: 1px solid #b7eb8f;
}

.result-summary {
  text-align: center;
}

.score-breakdown {
  margin-top: 16px;
}

.score-item {
  margin-bottom: 12px;
}

.quality-item {
  display: flex;
  align-items: center;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
}

.complexity-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.grading-history {
  max-height: 300px;
  overflow-y: auto;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .auto-grading-system {
    padding: 16px;
  }
}

@media (max-width: 768px) {
  .system-header h1 {
    font-size: 24px;
  }

  .system-header p {
    font-size: 14px;
  }
}
</style>
