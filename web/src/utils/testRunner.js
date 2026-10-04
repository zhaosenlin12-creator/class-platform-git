/**
 * 测试运行器 - 在Vue应用中执行Store测试
 */
import StoreTestUtil from './storeTest.js'

export class TestRunner {
    constructor () {
        this.testUtil = new StoreTestUtil()
        this.results = {
            storeArchitecture: null,
            userModule: null,
            teachingModule: null,
            classroomModule: null,
            examModule: null
        }
    }

    // 执行Store基础架构测试
    async testStoreArchitecture () {
        try {
            // 检查Store实例
            if (!this.$store) {
                throw new Error('Store实例不可用')
            }

            const result = {
                storeInstance: !!this.$store,
                modules: Object.keys(this.$store._modules.root._children),
                getters: Object.keys(this.$store.getters),
                state: Object.keys(this.$store.state),
                timestamp: new Date().toISOString()
            }

            // 检查预期模块
            const expectedModules = ['app', 'user', 'permission', 'enhance', 'teaching', 'classroom', 'exam']
            result.missingModules = expectedModules.filter(name => !result.modules.includes(name))
            result.extraModules = result.modules.filter(name => !expectedModules.includes(name))
            result.moduleIntegrityScore = (expectedModules.length - result.missingModules.length) / expectedModules.length

            this.results.storeArchitecture = result
            return result
        } catch (error) {
            console.error('❌ Store基础架构测试失败:', error.message)
            throw error
        }
    }

    // 快速连通性测试
    testConnectivity () {
        const tests = []

        // 测试各个模块的基本getters
        const gettersToTest = [
            'userInfo', 'username', 'avatar', // user模块
            'coursesList', 'currentCourse', 'studentsList', 'teachingLoading', // teaching模块
            'isClassroomConnected', 'classroomParticipants', 'isClassroomActive', // classroom模块
            'currentExam', 'isExamActive', 'examTimeRemaining', 'examProgress' // exam模块
        ]

        gettersToTest.forEach(getterName => {
            try {
                const value = this.$store.getters[getterName]
                tests.push({
                    getter: getterName,
                    success: true,
                    value: typeof value,
                    result: 'OK'
                })
            } catch (error) {
                tests.push({
                    getter: getterName,
                    success: false,
                    error: error.message,
                    result: 'FAILED'
                })
            }
        })

        const successCount = tests.filter(t => t.success).length
        const totalCount = tests.length
        const successRate = Math.round((successCount / totalCount) * 100)

        return {
            tests,
            successCount,
            totalCount,
            successRate,
            timestamp: new Date().toISOString()
        }
    }

    // 执行所有基础测试
    async runBasicTests () {
        try {
            // Store架构测试
            await this.testStoreArchitecture()

            // 连通性测试
            const connectivityResult = this.testConnectivity()

            const summary = {
                architecture: this.results.storeArchitecture,
                connectivity: connectivityResult,
                overall: {
                    success: this.results.storeArchitecture && connectivityResult.successRate > 80,
                    timestamp: new Date().toISOString()
                }
            }

            // 存储到全局对象以便调试
            if (typeof window !== 'undefined') {
                window.storeTestSummary = summary
            }

            return summary
        } catch (error) {
            console.error('❌ 基础测试执行失败:', error.message)
            throw error
        }
    }

    // 获取测试报告
    getTestReport () {
        return {
            timestamp: new Date().toISOString(),
            results: this.results,
            summary: this.generateSummary()
        }
    }

    // 生成测试摘要
    generateSummary () {
        const passedTests = Object.values(this.results).filter(result => result !== null).length
        const totalTests = Object.keys(this.results).length

        return {
            passedTests,
            totalTests,
            completionRate: Math.round((passedTests / totalTests) * 100),
            status: passedTests === totalTests ? 'ALL_PASSED' : 'PARTIAL'
        }
    }
}

// 导出便捷函数
export async function runStoreArchitectureTest () {
    const runner = new TestRunner()
    return await runner.runBasicTests()
}

export default TestRunner
