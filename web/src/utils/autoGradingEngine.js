/**
 * 自动评分引擎
 * 基于多维度算法的智能代码评分系统
 */

// 评分算法类型
export const GRADING_ALGORITHMS = {
    SYNTAX_ANALYSIS: 'syntax_analysis',
    LOGIC_ANALYSIS: 'logic_analysis',
    PERFORMANCE_ANALYSIS: 'performance_analysis',
    STYLE_ANALYSIS: 'style_analysis',
    TEST_DRIVEN: 'test_driven',
    AI_COMPREHENSIVE: 'ai_comprehensive'
}

// 评分标准权重配置
export const DEFAULT_WEIGHTS = {
    correctness: 0.4, // 正确性 40%
    performance: 0.25, // 性能 25%
    style: 0.2, // 代码风格 20%
    innovation: 0.15 // 创新性 15%
}

/**
 * 自动评分引擎主类
 */
export class AutoGradingEngine {
    constructor (config = {}) {
        this.config = {
            maxScore: 100,
            passingScore: 60,
            weights: { ...DEFAULT_WEIGHTS, ...config.weights },
            timeout: 10000,
            ...config
        }

        this.analysisResults = {}
        this.finalScore = 0
        this.gradingReport = {}
    }

    /**
   * 执行自动评分
   * @param {Object} submission 提交的代码和相关信息
   * @returns {Promise<Object>} 评分结果
   */
    async grade (submission) {
        const { code, language, testCases, requirements } = submission

        try {
            // 初始化评分报告
            this.initGradingReport(submission)

            // 1. 语法分析
            const syntaxResult = await this.analyzeSyntax(code, language)
            this.analysisResults.syntax = syntaxResult

            // 2. 逻辑正确性分析
            const logicResult = await this.analyzeLogic(code, testCases)
            this.analysisResults.logic = logicResult

            // 3. 性能分析
            const performanceResult = await this.analyzePerformance(code)
            this.analysisResults.performance = performanceResult

            // 4. 代码风格分析
            const styleResult = await this.analyzeStyle(code, language)
            this.analysisResults.style = styleResult

            // 5. 创新性分析
            const innovationResult = await this.analyzeInnovation(code, requirements)
            this.analysisResults.innovation = innovationResult

            // 6. 相似度检测
            const similarityResult = await this.checkSimilarity(code)
            this.analysisResults.similarity = similarityResult

            // 7. 计算综合得分
            this.calculateFinalScore()

            // 8. 生成详细报告
            this.generateDetailedReport()

            return this.getFinalResult()
        } catch (error) {
            console.error('评分过程中发生错误:', error)
            return this.getErrorResult(error)
        }
    }

    /**
   * 语法分析
   */
    async analyzeSyntax (code, language) {
        const result = {
            score: 0,
            maxScore: 20,
            issues: [],
            suggestions: []
        }

        try {
            // Python语法检查
            if (language === 'python') {
                const syntaxIssues = this.checkPythonSyntax(code)
                result.issues = syntaxIssues

                // 基础语法正确性得分
                const errorCount = syntaxIssues.filter(issue => issue.severity === 'error').length
                const warningCount = syntaxIssues.filter(issue => issue.severity === 'warning').length

                result.score = Math.max(0, result.maxScore - (errorCount * 5) - (warningCount * 2))
            }

            // Scratch语法检查
            else if (language === 'scratch') {
                result.score = this.checkScratchStructure(code)
            }
        } catch (error) {
            result.score = 0
            result.issues.push({
                type: 'error',
                message: '语法分析失败: ' + error.message,
                line: 0
            })
        }

        return result
    }

    /**
   * Python语法检查
   */
    checkPythonSyntax (code) {
        const issues = []
        const lines = code.split('\n')

        lines.forEach((line, index) => {
            const lineNumber = index + 1
            const trimmedLine = line.trim()

            // 检查常见语法问题
            if (trimmedLine.length === 0) return

            // 缩进检查
            if (line.length !== line.trimLeft().length) {
                const spaces = line.length - line.trimLeft().length
                if (spaces % 4 !== 0) {
                    issues.push({
                        type: 'warning',
                        severity: 'warning',
                        message: '建议使用4个空格进行缩进',
                        line: lineNumber,
                        column: 1
                    })
                }
            }

            // 命名规范检查
            const functionMatch = trimmedLine.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/)
            if (functionMatch) {
                const funcName = functionMatch[1]
                if (!/^[a-z_][a-z0-9_]*$/.test(funcName)) {
                    issues.push({
                        type: 'warning',
                        severity: 'warning',
                        message: '函数名建议使用小写字母和下划线',
                        line: lineNumber,
                        column: trimmedLine.indexOf(funcName)
                    })
                }
            }

            // 变量命名检查
            const varMatch = trimmedLine.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=/)
            if (varMatch) {
                const varName = varMatch[1]
                if (/^[A-Z]/.test(varName) && !/^[A-Z_]+$/.test(varName)) {
                    issues.push({
                        type: 'warning',
                        severity: 'warning',
                        message: '变量名建议使用小写字母',
                        line: lineNumber,
                        column: trimmedLine.indexOf(varName)
                    })
                }
            }

            // 行长度检查
            if (line.length > 120) {
                issues.push({
                    type: 'info',
                    severity: 'info',
                    message: '建议单行代码不超过120个字符',
                    line: lineNumber,
                    column: 120
                })
            }
        })

        return issues
    }

    /**
   * 逻辑正确性分析
   */
    async analyzeLogic (code, testCases = []) {
        const result = {
            score: 0,
            maxScore: 40,
            passedTests: 0,
            totalTests: testCases.length,
            testResults: [],
            coverage: 0
        }

        if (testCases.length === 0) {
            // 如果没有测试用例，进行基础逻辑分析
            result.score = this.analyzeBasicLogic(code)
            return result
        }

        try {
            // 执行测试用例
            for (const testCase of testCases) {
                const testResult = await this.executeTestCase(code, testCase)
                result.testResults.push(testResult)

                if (testResult.passed) {
                    result.passedTests++
                }
            }

            // 计算得分
            result.score = Math.round((result.passedTests / result.totalTests) * result.maxScore)
            result.coverage = Math.round((result.passedTests / result.totalTests) * 100)
        } catch (error) {
            result.score = 0
            console.error('逻辑分析失败:', error)
        }

        return result
    }

    /**
   * 基础逻辑分析（无测试用例时）
   */
    analyzeBasicLogic (code) {
        let score = 20 // 基础分

        // 检查是否有主要逻辑结构
        if (code.includes('def ')) score += 5 // 有函数定义
        if (code.includes('if ')) score += 5 // 有条件判断
        if (code.includes('for ') || code.includes('while ')) score += 5 // 有循环
        if (code.includes('try:') || code.includes('except:')) score += 5 // 有异常处理

        return Math.min(score, 40)
    }

    /**
   * 执行单个测试用例
   */
    async executeTestCase (code, testCase) {
        const result = {
            name: testCase.name || '测试用例',
            input: testCase.input,
            expected: testCase.expected,
            actual: '',
            passed: false,
            error: null,
            executionTime: 0
        }

        try {
            const startTime = Date.now()

            // 模拟代码执行
            const output = await this.simulateCodeExecution(code, testCase.input)
            result.actual = output
            result.executionTime = Date.now() - startTime

            // 比较输出结果
            result.passed = this.compareOutputs(result.expected, result.actual)
        } catch (error) {
            result.error = error.message
            result.passed = false
        }

        return result
    }

    /**
   * 模拟代码执行
   */
    async simulateCodeExecution (code, input) {
    // 这里应该调用后端的代码执行服务
    // 现在返回模拟结果

        if (code.includes('print("Hello')) {
            return 'Hello, World!'
        }

        if (code.includes('factorial')) {
            return '120' // 5的阶乘
        }

        if (code.includes('fibonacci')) {
            return '55' // 斐波那契数列第10项
        }

        return 'Output'
    }

    /**
   * 比较期望输出和实际输出
   */
    compareOutputs (expected, actual) {
    // 标准化输出字符串
        const normalize = (str) => {
            return str.toString().trim().toLowerCase().replace(/\s+/g, ' ')
        }

        return normalize(expected) === normalize(actual)
    }

    /**
   * 性能分析
   */
    async analyzePerformance (code) {
        const result = {
            score: 0,
            maxScore: 25,
            timeComplexity: 'O(n)',
            spaceComplexity: 'O(1)',
            optimizationSuggestions: []
        }

        try {
            // 分析算法复杂度
            const complexity = this.analyzeComplexity(code)
            result.timeComplexity = complexity.time
            result.spaceComplexity = complexity.space

            // 根据复杂度评分
            result.score = this.scoreComplexity(complexity)

            // 生成优化建议
            result.optimizationSuggestions = this.generateOptimizationSuggestions(code, complexity)
        } catch (error) {
            result.score = 15 // 默认中等分数
            console.error('性能分析失败:', error)
        }

        return result
    }

    /**
   * 分析算法复杂度
   */
    analyzeComplexity (code) {
        const result = {
            time: 'O(1)',
            space: 'O(1)'
        }

        // 检查嵌套循环
        const nestedLoops = (code.match(/for.*:\s*[\s\S]*?for/g) || []).length
        if (nestedLoops > 0) {
            result.time = nestedLoops === 1 ? 'O(n²)' : `O(n^${nestedLoops + 1})`
        } else if (code.includes('for ') || code.includes('while ')) {
            result.time = 'O(n)'
        }

        // 检查递归
        if (code.includes('return ') && code.match(/def\s+(\w+).*:\s*[\s\S]*?\1\(/)) {
            result.time = 'O(2^n)' // 简化的递归复杂度
        }

        // 检查空间使用
        if (code.includes('[]') || code.includes('{}') || code.includes('list(')) {
            result.space = 'O(n)'
        }

        return result
    }

    /**
   * 根据复杂度评分
   */
    scoreComplexity (complexity) {
        const timeScores = {
            'O(1)': 25,
            'O(log n)': 23,
            'O(n)': 20,
            'O(n log n)': 18,
            'O(n²)': 15,
            'O(n³)': 10,
            'O(2^n)': 5
        }

        return timeScores[complexity.time] || 15
    }

    /**
   * 代码风格分析
   */
    async analyzeStyle (code, language) {
        const result = {
            score: 0,
            maxScore: 20,
            styleIssues: [],
            readabilityScore: 0
        }

        try {
            if (language === 'python') {
                result.styleIssues = this.checkPythonStyle(code)
                result.readabilityScore = this.calculateReadabilityScore(code)

                // 计算风格得分
                const issueCount = result.styleIssues.length
                result.score = Math.max(0, result.maxScore - issueCount * 2)
            }
        } catch (error) {
            result.score = 10 // 默认中等分数
            console.error('代码风格分析失败:', error)
        }

        return result
    }

    /**
   * Python代码风格检查
   */
    checkPythonStyle (code) {
        const issues = []
        const lines = code.split('\n')

        lines.forEach((line, index) => {
            const lineNumber = index + 1
            const trimmedLine = line.trim()

            // 检查注释
            if (trimmedLine.startsWith('#')) {
                if (!trimmedLine.startsWith('# ')) {
                    issues.push({
                        type: 'style',
                        message: '注释符号后应该有空格',
                        line: lineNumber,
                        severity: 'minor'
                    })
                }
            }

            // 检查函数/类的文档字符串
            if (trimmedLine.startsWith('def ') || trimmedLine.startsWith('class ')) {
                const nextLineIndex = index + 1
                if (nextLineIndex < lines.length) {
                    const nextLine = lines[nextLineIndex].trim()
                    if (!nextLine.startsWith('"""') && !nextLine.startsWith("'''")) {
                        issues.push({
                            type: 'style',
                            message: '建议为函数/类添加文档字符串',
                            line: lineNumber,
                            severity: 'minor'
                        })
                    }
                }
            }

            // 检查导入语句
            if (trimmedLine.startsWith('import ') || trimmedLine.startsWith('from ')) {
                if (index > 0 && !lines[index - 1].trim().startsWith('import') && !lines[index - 1].trim().startsWith('from')) {
                    const prevLine = lines[index - 1].trim()
                    if (prevLine && !prevLine.startsWith('#')) {
                        issues.push({
                            type: 'style',
                            message: '导入语句应该放在文件顶部',
                            line: lineNumber,
                            severity: 'minor'
                        })
                    }
                }
            }
        })

        return issues
    }

    /**
   * 计算可读性得分
   */
    calculateReadabilityScore (code) {
        let score = 50 // 基础分

        // 检查注释比例
        const lines = code.split('\n')
        const commentLines = lines.filter(line => line.trim().startsWith('#')).length
        const commentRatio = commentLines / lines.length
        score += Math.min(20, commentRatio * 100) // 注释比例贡献最多20分

        // 检查函数长度
        const functions = code.match(/def\s+\w+.*?(?=def|\Z)/gs) || []
        const avgFuncLength = functions.reduce((sum, func) => {
            return sum + func.split('\n').length
        }, 0) / functions.length || 0

        if (avgFuncLength <= 20) score += 15
        else if (avgFuncLength <= 50) score += 10
        else score += 5

        // 检查变量命名
        const varNames = code.match(/\b[a-z_][a-z0-9_]*\b/g) || []
        const meaningfulNames = varNames.filter(name => name.length > 2 && !['i', 'j', 'k'].includes(name)).length
        const nameRatio = meaningfulNames / varNames.length || 0
        score += nameRatio * 15

        return Math.min(100, score)
    }

    /**
   * 创新性分析
   */
    async analyzeInnovation (code, requirements) {
        const result = {
            score: 0,
            maxScore: 15,
            innovativeFeatures: [],
            creativityScore: 0
        }

        try {
            // 检查创新特性
            result.innovativeFeatures = this.findInnovativeFeatures(code)
            result.creativityScore = this.calculateCreativityScore(code, requirements)

            result.score = Math.min(result.maxScore, result.innovativeFeatures.length * 3 + result.creativityScore)
        } catch (error) {
            result.score = 8 // 默认中等分数
            console.error('创新性分析失败:', error)
        }

        return result
    }

    /**
   * 查找创新特性
   */
    findInnovativeFeatures (code) {
        const features = []

        // 检查高级Python特性
        if (code.includes('lambda')) features.push('使用了lambda表达式')
        if (code.includes('yield')) features.push('使用了生成器')
        if (code.includes('with ')) features.push('使用了上下文管理器')
        if (code.includes('@')) features.push('使用了装饰器')
        if (code.includes('**kwargs')) features.push('使用了可变关键字参数')
        if (code.includes('*args')) features.push('使用了可变位置参数')

        // 检查设计模式
        if (code.includes('class') && code.includes('__init__')) features.push('使用了面向对象编程')
        if (code.match(/class.*\(.*\):/)) features.push('使用了继承')

        return features
    }

    /**
   * 计算创造力得分
   */
    calculateCreativityScore (code, requirements) {
        let score = 5 // 基础分

        // 检查是否超出基本要求
        if (requirements && requirements.length > 0) {
            // 这里应该有更复杂的逻辑来判断是否有创新
            score += 3
        }

        return score
    }

    /**
   * 相似度检测
   */
    async checkSimilarity (code) {
        const result = {
            percentage: 0,
            suspiciousMatches: [],
            originalityScore: 100
        }

        try {
            // 模拟相似度检测
            result.percentage = Math.floor(Math.random() * 30) + 10 // 10-40%
            result.originalityScore = Math.max(0, 100 - result.percentage)

            if (result.percentage > 50) {
                result.suspiciousMatches.push({
                    source: '已有提交记录',
                    similarity: result.percentage,
                    matchedLines: Math.floor(Math.random() * 10) + 5
                })
            }
        } catch (error) {
            console.error('相似度检测失败:', error)
        }

        return result
    }

    /**
   * 计算最终得分
   */
    calculateFinalScore () {
        const weights = this.config.weights
        const scores = this.analysisResults

        let weightedScore = 0
        let totalWeight = 0

        // 正确性得分（语法 + 逻辑）
        if (scores.syntax && scores.logic) {
            const correctnessScore = (scores.syntax.score / scores.syntax.maxScore * 0.3 +
                               scores.logic.score / scores.logic.maxScore * 0.7) * 100
            weightedScore += correctnessScore * weights.correctness
            totalWeight += weights.correctness
        }

        // 性能得分
        if (scores.performance) {
            const performanceScore = (scores.performance.score / scores.performance.maxScore) * 100
            weightedScore += performanceScore * weights.performance
            totalWeight += weights.performance
        }

        // 风格得分
        if (scores.style) {
            const styleScore = (scores.style.score / scores.style.maxScore) * 100
            weightedScore += styleScore * weights.style
            totalWeight += weights.style
        }

        // 创新性得分
        if (scores.innovation) {
            const innovationScore = (scores.innovation.score / scores.innovation.maxScore) * 100
            weightedScore += innovationScore * weights.innovation
            totalWeight += weights.innovation
        }

        // 相似度惩罚
        if (scores.similarity && scores.similarity.percentage > 50) {
            const penalty = (scores.similarity.percentage - 50) / 50 * 20
            weightedScore -= penalty
        }

        this.finalScore = Math.max(0, Math.min(this.config.maxScore, weightedScore / totalWeight))
    }

    /**
   * 生成详细报告
   */
    generateDetailedReport () {
        const scores = this.analysisResults

        this.gradingReport = {
            totalScore: Math.round(this.finalScore),
            maxScore: this.config.maxScore,
            passed: this.finalScore >= this.config.passingScore,

            breakdown: [
                {
                    category: '代码正确性',
                    score: scores.syntax && scores.logic
                        ? Math.round((scores.syntax.score + scores.logic.score) / (scores.syntax.maxScore + scores.logic.maxScore) * 100 * this.config.weights.correctness) : 0,
                    maxScore: Math.round(this.config.maxScore * this.config.weights.correctness),
                    details: {
                        syntax: scores.syntax,
                        logic: scores.logic
                    }
                },
                {
                    category: '性能效率',
                    score: scores.performance ? Math.round(scores.performance.score / scores.performance.maxScore * 100 * this.config.weights.performance) : 0,
                    maxScore: Math.round(this.config.maxScore * this.config.weights.performance),
                    details: scores.performance
                },
                {
                    category: '代码风格',
                    score: scores.style ? Math.round(scores.style.score / scores.style.maxScore * 100 * this.config.weights.style) : 0,
                    maxScore: Math.round(this.config.maxScore * this.config.weights.style),
                    details: scores.style
                },
                {
                    category: '创新性',
                    score: scores.innovation ? Math.round(scores.innovation.score / scores.innovation.maxScore * 100 * this.config.weights.innovation) : 0,
                    maxScore: Math.round(this.config.maxScore * this.config.weights.innovation),
                    details: scores.innovation
                }
            ],

            suggestions: this.generateSuggestions(),
            similarity: scores.similarity,

            timestamp: new Date(),
            engineVersion: '1.0.0'
        }
    }

    /**
   * 生成改进建议
   */
    generateSuggestions () {
        const suggestions = []
        const scores = this.analysisResults

        // 语法建议
        if (scores.syntax && scores.syntax.score < scores.syntax.maxScore * 0.8) {
            suggestions.push({
                category: '语法改进',
                priority: 'high',
                message: '代码存在语法问题，建议检查并修复',
                details: scores.syntax.issues
            })
        }

        // 逻辑建议
        if (scores.logic && scores.logic.passedTests < scores.logic.totalTests) {
            suggestions.push({
                category: '逻辑优化',
                priority: 'high',
                message: `测试用例通过率：${scores.logic.passedTests}/${scores.logic.totalTests}，建议检查算法逻辑`,
                details: scores.logic.testResults
            })
        }

        // 性能建议
        if (scores.performance && scores.performance.score < scores.performance.maxScore * 0.7) {
            suggestions.push({
                category: '性能优化',
                priority: 'medium',
                message: '算法效率有待提升，考虑优化时间复杂度',
                details: scores.performance.optimizationSuggestions
            })
        }

        // 风格建议
        if (scores.style && scores.style.styleIssues.length > 0) {
            suggestions.push({
                category: '代码规范',
                priority: 'low',
                message: '代码风格可以改进，建议遵循PEP8规范',
                details: scores.style.styleIssues
            })
        }

        return suggestions
    }

    /**
   * 初始化评分报告
   */
    initGradingReport (submission) {
        this.gradingReport = {
            submissionId: submission.id || Date.now(),
            language: submission.language || 'python',
            startTime: new Date(),
            status: 'processing'
        }
    }

    /**
   * 获取最终结果
   */
    getFinalResult () {
        return {
            success: true,
            score: this.gradingReport.totalScore,
            report: this.gradingReport,
            analysisResults: this.analysisResults
        }
    }

    /**
   * 获取错误结果
   */
    getErrorResult (error) {
        return {
            success: false,
            error: error.message,
            score: 0,
            report: {
                totalScore: 0,
                maxScore: this.config.maxScore,
                passed: false,
                error: error.message,
                timestamp: new Date()
            }
        }
    }
}

/**
 * 快速评分函数
 * @param {Object} submission 代码提交
 * @param {Object} config 评分配置
 * @returns {Promise<Object>} 评分结果
 */
export async function quickGrade (submission, config = {}) {
    const engine = new AutoGradingEngine(config)
    return await engine.grade(submission)
}

/**
   * 批量评分函数
   * @param {Array} submissions 代码提交数组
   * @param {Object} config 评分配置
   * @returns {Promise<Array>} 评分结果数组
   */
export async function batchGrade (submissions, config = {}) {
    const engine = new AutoGradingEngine(config)
    const results = []

    for (const submission of submissions) {
        try {
            const result = await engine.grade(submission)
            results.push(result)
        } catch (error) {
            results.push(engine.getErrorResult(error))
        }
    }

    return results
}

export default AutoGradingEngine
