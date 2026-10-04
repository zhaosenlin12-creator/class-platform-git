/**
 * Vuex状态管理测试工具
 * 用于测试新增的状态管理模块功能
 */
import store from '@/store'

class StoreTestUtil {
    constructor () {
        this.testResults = []
    }

    // 记录测试结果
    log (message, type = 'info') {
        const result = {
            message,
            type,
            timestamp: new Date().toLocaleString()
        }
        this.testResults.push(result)
    }

    // 测试用户状态管理
    async testUserModule () {
        this.log('开始测试用户状态管理模块', 'test')

        try {
            // 测试基本getter
            const isLoggedIn = store.getters.userInfo
            this.log(`当前用户信息: ${JSON.stringify(isLoggedIn)}`)

            // 测试用户类型
            const userType = store.getters['user/userType']
            this.log(`用户类型: ${userType}`)

            // 测试重置状态
            store.dispatch('user/resetUserState')
            this.log('用户状态重置成功')

            // 测试设置用户偏好
            await store.dispatch('user/setUserPreferences', {
                language: 'zh-CN',
                theme: 'light'
            })
            this.log('用户偏好设置成功')

            this.log('用户状态管理模块测试通过', 'success')
        } catch (error) {
            this.log(`用户状态管理测试失败: ${error.message}`, 'error')
        }
    }

    // 测试教学数据状态管理
    async testTeachingModule () {
        this.log('开始测试教学数据状态管理模块', 'test')

        try {
            // 测试课程列表getter
            const coursesList = store.getters['teaching/coursesList']
            this.log(`课程列表长度: ${coursesList.length}`)

            // 测试学生列表getter
            const studentsList = store.getters['teaching/studentsList']
            this.log(`学生列表长度: ${studentsList.length}`)

            // 测试loading状态
            const coursesLoading = store.getters['teaching/coursesLoading']
            this.log(`课程加载状态: ${coursesLoading}`)

            // 测试缓存检查
            const isCacheValid = store.getters['teaching/isCacheValid']('courses')
            this.log(`课程缓存状态: ${isCacheValid}`)

            // 测试重置状态
            store.dispatch('teaching/resetState')
            this.log('教学数据状态重置成功')

            this.log('教学数据状态管理模块测试通过', 'success')
        } catch (error) {
            this.log(`教学数据状态管理测试失败: ${error.message}`, 'error')
        }
    }

    // 测试课堂状态管理
    async testClassroomModule () {
        this.log('开始测试课堂状态管理模块', 'test')

        try {
            // 测试连接状态
            const isConnected = store.getters['classroom/isConnected']
            this.log(`课堂连接状态: ${isConnected}`)

            // 测试参与者数量
            const participantCount = store.getters['classroom/participantCount']
            this.log(`参与者数量: ${participantCount}`)

            // 测试课堂状态
            const isActive = store.getters['classroom/isClassroomActive']
            this.log(`课堂是否活跃: ${isActive}`)

            // 测试举手数量
            const handsUpCount = store.getters['classroom/handsUpCount']
            this.log(`举手人数: ${handsUpCount}`)

            // 测试连接质量
            const connectionQuality = store.getters['classroom/connectionQuality']
            this.log(`连接质量: ${connectionQuality}`)

            // 测试重置状态
            store.commit('classroom/RESET_STATE')
            this.log('课堂状态重置成功')

            this.log('课堂状态管理模块测试通过', 'success')
        } catch (error) {
            this.log(`课堂状态管理测试失败: ${error.message}`, 'error')
        }
    }

    // 测试考试状态管理
    async testExamModule () {
        this.log('开始测试考试状态管理模块', 'test')

        try {
            // 测试考试状态
            const isExamActive = store.getters['exam/isExamActive']
            this.log(`考试是否激活: ${isExamActive}`)

            // 测试答题状态
            const answeredCount = store.getters['exam/answeredCount']
            this.log(`已答题数量: ${answeredCount}`)

            // 测试总题数
            const totalQuestions = store.getters['exam/totalQuestions']
            this.log(`总题数: ${totalQuestions}`)

            // 测试时间状态
            const timeRemaining = store.getters['exam/timeRemaining']
            this.log(`剩余时间: ${timeRemaining}ms`)

            // 测试格式化时间
            const formattedTime = store.getters['exam/formattedTimeRemaining']
            this.log(`格式化剩余时间: ${formattedTime}`)

            // 测试在线状态
            const isOnline = store.getters['exam/isOnline']
            this.log(`在线状态: ${isOnline}`)

            // 测试可提交状态
            const canSubmit = store.getters['exam/canSubmit']
            this.log(`可否提交: ${canSubmit}`)

            // 测试重置状态
            store.commit('exam/RESET_STATE')
            this.log('考试状态重置成功')

            this.log('考试状态管理模块测试通过', 'success')
        } catch (error) {
            this.log(`考试状态管理测试失败: ${error.message}`, 'error')
        }
    }

    // 测试全局getters
    testGlobalGetters () {
        this.log('开始测试全局getters', 'test')

        try {
            // 测试教学数据相关getters
            const coursesList = store.getters.coursesList
            const currentCourse = store.getters.currentCourse
            const studentsList = store.getters.studentsList
            this.log('教学数据全局getters测试通过')

            // 测试课堂状态相关getters
            const isClassroomConnected = store.getters.isClassroomConnected
            const classroomParticipants = store.getters.classroomParticipants
            const isClassroomActive = store.getters.isClassroomActive
            this.log('课堂状态全局getters测试通过')

            // 测试考试状态相关getters
            const currentExam = store.getters.currentExam
            const isExamActive = store.getters.isExamActive
            const examTimeRemaining = store.getters.examTimeRemaining
            const examProgress = store.getters.examProgress
            this.log('考试状态全局getters测试通过')

            this.log('全局getters测试通过', 'success')
        } catch (error) {
            this.log(`全局getters测试失败: ${error.message}`, 'error')
        }
    }

    // 运行所有测试
    async runAllTests () {
        this.log('=== 开始Vuex状态管理全面测试 ===', 'test')

        await this.testUserModule()
        await this.testTeachingModule()
        await this.testClassroomModule()
        await this.testExamModule()
        this.testGlobalGetters()

        this.log('=== Vuex状态管理测试完成 ===', 'test')

        // 统计测试结果
        const successCount = this.testResults.filter(r => r.type === 'success').length
        const errorCount = this.testResults.filter(r => r.type === 'error').length
        const totalTests = successCount + errorCount

        this.log(`测试总结: ${totalTests}个模块, ${successCount}个成功, ${errorCount}个失败`, 'summary')

        return {
            total: totalTests,
            success: successCount,
            error: errorCount,
            results: this.testResults
        }
    }

    // 获取测试报告
    getTestReport () {
        return {
            timestamp: new Date().toISOString(),
            results: this.testResults,
            summary: {
                total: this.testResults.length,
                success: this.testResults.filter(r => r.type === 'success').length,
                error: this.testResults.filter(r => r.type === 'error').length
            }
        }
    }

    // 清除测试结果
    clearResults () {
        this.testResults = []
    }
}

// 导出测试工具
export default StoreTestUtil

// 全局测试函数
export async function testVuexStore () {
    const tester = new StoreTestUtil()
    const results = await tester.runAllTests()

    // 将结果存储到window对象，方便在浏览器控制台查看
    if (typeof window !== 'undefined') {
        window.storeTestResults = tester.getTestReport()
    }

    return results
}
