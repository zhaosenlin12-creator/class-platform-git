import Vue from 'vue'
import { getAction, postAction } from '@/api/manage'

// 初始状态
const getDefaultState = () => {
    return {
    // 考试基本信息
        currentExam: {
            id: null,
            paperId: null,
            title: '',
            description: '',
            duration: 0, // 分钟
            startTime: null,
            endTime: null,
            status: 'not_started', // not_started, active, paused, finished, expired
            timeRemaining: 0,
            autoSubmit: true,
            allowReview: false
        },

        // 试卷信息
        paper: {
            id: null,
            title: '',
            description: '',
            totalScore: 0,
            passScore: 0,
            questions: [],
            structure: {
                sections: [],
                questionCount: 0,
                timeLimit: 0
            }
        },

        // 答题状态
        answers: {},
        answeredCount: 0,
        flaggedQuestions: [],
        currentQuestionIndex: 0,
        reviewMode: false,

        // 时间控制
        timer: {
            startTime: null,
            currentTime: null,
            timeSpent: 0,
            timeRemaining: 0,
            isRunning: false,
            lastSyncTime: null,
            autoSaveInterval: null,
            warningThresholds: [300, 600, 1800] // 5分钟，10分钟，30分钟
        },

        // 考试进度
        progress: {
            overall: 0,
            bySection: {},
            timeProgress: 0,
            completedSections: [],
            currentSection: 0
        },

        // 实时监控
        monitoring: {
            // 防作弊监控
            antiCheat: {
                tabSwitchCount: 0,
                copyAttemptCount: 0,
                rightClickCount: 0,
                fullscreenExits: 0,
                suspiciousActivity: []
            },
            // 行为记录
            behavior: {
                mouseMovements: [],
                keystrokes: [],
                clickEvents: [],
                focusEvents: []
            },
            // 摄像头监控
            camera: {
                isEnabled: false,
                snapshots: [],
                violations: []
            }
        },

        // 网络状态
        network: {
            isOnline: true,
            connectionQuality: 'good', // poor, fair, good, excellent
            lastSyncTime: null,
            pendingSubmissions: [],
            retryCount: 0,
            maxRetries: 3
        },

        // 本地存储
        localStorage: {
            autoSaveEnabled: true,
            lastSaveTime: null,
            saveInterval: 30000, // 30秒
            storageKey: null
        },

        // 考试设置
        settings: {
            // 显示设置
            showQuestionNumbers: true,
            showProgress: true,
            showTimeRemaining: true,
            fontSize: 'medium', // small, medium, large
            theme: 'light', // light, dark
            // 导航设置
            allowQuestionNavigation: true,
            showQuestionPalette: true,
            confirmBeforeSubmit: true,
            // 安全设置
            preventCopy: true,
            preventRightClick: true,
            fullscreenMode: false,
            lockdownMode: false
        },

        // 提交状态
        submission: {
            isSubmitting: false,
            isSubmitted: false,
            submitTime: null,
            submissionId: null,
            finalAnswers: {},
            score: null,
            results: null
        },

        // 错误处理
        errors: {},
        notifications: [],

        // 加载状态
        loading: {
            exam: false,
            paper: false,
            questions: false,
            submission: false
        }
    }
}

const exam = {
    namespaced: true,

    state: getDefaultState(),

    mutations: {
    // 重置状态
        RESET_STATE: (state) => {
            Object.assign(state, getDefaultState())
        },

        // 考试信息设置
        SET_CURRENT_EXAM: (state, exam) => {
            state.currentExam = { ...state.currentExam, ...exam }
            if (exam.id) {
                state.localStorage.storageKey = `exam_${exam.id}`
            }
        },
        UPDATE_EXAM_STATUS: (state, status) => {
            state.currentExam.status = status
        },
        SET_TIME_REMAINING: (state, time) => {
            state.currentExam.timeRemaining = time
            state.timer.timeRemaining = time
        },

        // 试卷设置
        SET_PAPER: (state, paper) => {
            state.paper = { ...state.paper, ...paper }
            if (paper.questions) {
                state.progress.overall = 0
                state.answeredCount = 0
                // 初始化答案对象
                paper.questions.forEach(q => {
                    Vue.set(state.answers, q.id, null)
                })
            }
        },

        // 答题状态管理
        SET_ANSWER: (state, { questionId, answer }) => {
            const previousAnswer = state.answers[questionId]
            Vue.set(state.answers, questionId, answer)

            // 更新已答题数量
            if (answer !== null && previousAnswer === null) {
                state.answeredCount++
            } else if (answer === null && previousAnswer !== null) {
                state.answeredCount--
            }

            // 更新进度
            if (state.paper.questions.length > 0) {
                state.progress.overall = (state.answeredCount / state.paper.questions.length) * 100
            }
        },
        SET_CURRENT_QUESTION: (state, index) => {
            state.currentQuestionIndex = index
        },
        TOGGLE_QUESTION_FLAG: (state, questionId) => {
            const flagIndex = state.flaggedQuestions.indexOf(questionId)
            if (flagIndex === -1) {
                state.flaggedQuestions.push(questionId)
            } else {
                state.flaggedQuestions.splice(flagIndex, 1)
            }
        },
        SET_REVIEW_MODE: (state, enabled) => {
            state.reviewMode = enabled
        },

        // 时间控制
        START_TIMER: (state) => {
            state.timer.isRunning = true
            state.timer.startTime = Date.now()
            state.timer.currentTime = Date.now()
        },
        STOP_TIMER: (state) => {
            state.timer.isRunning = false
        },
        UPDATE_TIMER: (state) => {
            if (state.timer.isRunning) {
                const now = Date.now()
                state.timer.currentTime = now
                state.timer.timeSpent = now - state.timer.startTime

                const remaining = Math.max(0, state.currentExam.duration * 60000 - state.timer.timeSpent)
                state.timer.timeRemaining = remaining
                state.currentExam.timeRemaining = Math.ceil(remaining / 1000)

                // 更新时间进度
                if (state.currentExam.duration > 0) {
                    state.progress.timeProgress = ((state.currentExam.duration * 60000 - remaining) / (state.currentExam.duration * 60000)) * 100
                }
            }
        },
        SET_AUTO_SAVE_INTERVAL: (state, intervalId) => {
            state.timer.autoSaveInterval = intervalId
        },

        // 监控相关
        INCREMENT_TAB_SWITCH: (state) => {
            state.monitoring.antiCheat.tabSwitchCount++
            state.monitoring.antiCheat.suspiciousActivity.push({
                type: 'tab_switch',
                timestamp: Date.now()
            })
        },
        INCREMENT_COPY_ATTEMPT: (state) => {
            state.monitoring.antiCheat.copyAttemptCount++
            state.monitoring.antiCheat.suspiciousActivity.push({
                type: 'copy_attempt',
                timestamp: Date.now()
            })
        },
        INCREMENT_RIGHT_CLICK: (state) => {
            state.monitoring.antiCheat.rightClickCount++
        },
        INCREMENT_FULLSCREEN_EXIT: (state) => {
            state.monitoring.antiCheat.fullscreenExits++
            state.monitoring.antiCheat.suspiciousActivity.push({
                type: 'fullscreen_exit',
                timestamp: Date.now()
            })
        },
        ADD_BEHAVIOR_RECORD: (state, { type, data }) => {
            if (state.monitoring.behavior[type]) {
                state.monitoring.behavior[type].push({
                    ...data,
                    timestamp: Date.now()
                })
                // 保持记录数量在合理范围内
                if (state.monitoring.behavior[type].length > 1000) {
                    state.monitoring.behavior[type] = state.monitoring.behavior[type].slice(-500)
                }
            }
        },

        // 网络状态
        SET_NETWORK_STATUS: (state, isOnline) => {
            state.network.isOnline = isOnline
        },
        SET_CONNECTION_QUALITY: (state, quality) => {
            state.network.connectionQuality = quality
        },
        UPDATE_LAST_SYNC_TIME: (state) => {
            state.network.lastSyncTime = Date.now()
        },
        ADD_PENDING_SUBMISSION: (state, submission) => {
            state.network.pendingSubmissions.push(submission)
        },
        REMOVE_PENDING_SUBMISSION: (state, submissionId) => {
            state.network.pendingSubmissions = state.network.pendingSubmissions.filter(s => s.id !== submissionId)
        },

        // 本地存储
        UPDATE_LAST_SAVE_TIME: (state) => {
            state.localStorage.lastSaveTime = Date.now()
        },

        // 设置管理
        UPDATE_SETTINGS: (state, settings) => {
            state.settings = { ...state.settings, ...settings }
        },

        // 提交状态
        SET_SUBMITTING: (state, isSubmitting) => {
            state.submission.isSubmitting = isSubmitting
        },
        SET_SUBMITTED: (state, submissionData) => {
            state.submission.isSubmitted = true
            state.submission.submitTime = Date.now()
            if (submissionData) {
                state.submission.submissionId = submissionData.id
                state.submission.finalAnswers = { ...state.answers }
                if (submissionData.score !== undefined) {
                    state.submission.score = submissionData.score
                }
                if (submissionData.results) {
                    state.submission.results = submissionData.results
                }
            }
        },

        // 加载状态
        SET_LOADING: (state, { key, loading }) => {
            Vue.set(state.loading, key, loading)
        },

        // 错误处理
        SET_ERROR: (state, { key, error }) => {
            Vue.set(state.errors, key, error)
        },
        CLEAR_ERROR: (state, key) => {
            Vue.delete(state.errors, key)
        },

        // 通知
        ADD_NOTIFICATION: (state, notification) => {
            state.notifications.push({
                ...notification,
                id: notification.id || Date.now() + Math.random(),
                timestamp: notification.timestamp || Date.now()
            })
        },
        REMOVE_NOTIFICATION: (state, notificationId) => {
            state.notifications = state.notifications.filter(n => n.id !== notificationId)
        }
    },

    actions: {
    // 初始化考试
        async initExam ({ commit, dispatch }, examId) {
            commit('SET_LOADING', { key: 'exam', loading: true })
            commit('CLEAR_ERROR', 'exam')

            try {
                // 获取考试信息
                const examResponse = await getAction(`/teaching/exam/${examId}`)
                if (examResponse.success) {
                    commit('SET_CURRENT_EXAM', examResponse.result)

                    // 获取试卷信息
                    if (examResponse.result.paperId) {
                        await dispatch('loadPaper', examResponse.result.paperId)
                    }

                    // 初始化本地存储
                    await dispatch('initLocalStorage')

                    // 设置监控
                    await dispatch('initMonitoring')

                    return examResponse.result
                }
            } catch (error) {
                commit('SET_ERROR', { key: 'exam', error: error.message })
                throw error
            } finally {
                commit('SET_LOADING', { key: 'exam', loading: false })
            }
        },

        // 加载试卷
        async loadPaper ({ commit }, paperId) {
            commit('SET_LOADING', { key: 'paper', loading: true })
            commit('CLEAR_ERROR', 'paper')

            try {
                const paperResponse = await getAction(`/teaching/examPaper/${paperId}`)
                if (paperResponse.success) {
                    commit('SET_PAPER', paperResponse.result)
                    return paperResponse.result
                }
            } catch (error) {
                commit('SET_ERROR', { key: 'paper', error: error.message })
                throw error
            } finally {
                commit('SET_LOADING', { key: 'paper', loading: false })
            }
        },

        // 开始考试
        async startExam ({ commit, state, dispatch }) {
            try {
                // 验证考试状态
                if (state.currentExam.status !== 'not_started') {
                    throw new Error('考试已经开始或已结束')
                }

                // 开始计时
                commit('START_TIMER')
                commit('UPDATE_EXAM_STATUS', 'active')

                // 开启自动保存
                await dispatch('startAutoSave')

                // 记录开始时间
                await dispatch('recordExamStart')

                commit('ADD_NOTIFICATION', {
                    type: 'success',
                    message: '考试已开始，请认真答题'
                })

                return true
            } catch (error) {
                commit('SET_ERROR', { key: 'start', error: error.message })
                throw error
            }
        },

        // 暂停考试
        pauseExam ({ commit }) {
            commit('STOP_TIMER')
            commit('UPDATE_EXAM_STATUS', 'paused')
            commit('ADD_NOTIFICATION', {
                type: 'warning',
                message: '考试已暂停'
            })
        },

        // 恢复考试
        resumeExam ({ commit, dispatch }) {
            commit('START_TIMER')
            commit('UPDATE_EXAM_STATUS', 'active')
            dispatch('startAutoSave')
            commit('ADD_NOTIFICATION', {
                type: 'info',
                message: '考试已恢复'
            })
        },

        // 提交答案
        async submitAnswer ({ commit, dispatch }, { questionId, answer }) {
            commit('SET_ANSWER', { questionId, answer })

            // 保存到本地存储
            await dispatch('saveToLocal')

            // 同步到服务器
            await dispatch('syncToServer', { questionId, answer })
        },

        // 提交考试
        async submitExam ({ commit, state, dispatch }) {
            if (state.submission.isSubmitting) {
                return
            }

            commit('SET_SUBMITTING', true)
            commit('CLEAR_ERROR', 'submit')

            try {
                // 停止计时器
                commit('STOP_TIMER')

                // 清理自动保存
                if (state.timer.autoSaveInterval) {
                    clearInterval(state.timer.autoSaveInterval)
                }

                // 准备提交数据
                const submissionData = {
                    examId: state.currentExam.id,
                    answers: state.answers,
                    timeSpent: state.timer.timeSpent,
                    flaggedQuestions: state.flaggedQuestions,
                    monitoringData: state.monitoring
                }

                // 提交到服务器
                const response = await postAction('/teaching/examSubmission', submissionData)

                if (response.success) {
                    commit('SET_SUBMITTED', response.result)
                    commit('UPDATE_EXAM_STATUS', 'finished')

                    // 清理本地存储
                    await dispatch('clearLocalStorage')

                    commit('ADD_NOTIFICATION', {
                        type: 'success',
                        message: '考试提交成功'
                    })

                    return response.result
                }
            } catch (error) {
                commit('SET_ERROR', { key: 'submit', error: error.message })

                // 如果网络问题，添加到待提交队列
                if (error.message.includes('网络') || error.message.includes('Network')) {
                    commit('ADD_PENDING_SUBMISSION', {
                        id: Date.now(),
                        data: state.answers,
                        timestamp: Date.now()
                    })
                }

                throw error
            } finally {
                commit('SET_SUBMITTING', false)
            }
        },

        // 自动保存
        startAutoSave ({ commit, dispatch, state }) {
            if (state.timer.autoSaveInterval) {
                clearInterval(state.timer.autoSaveInterval)
            }

            const intervalId = setInterval(async () => {
                if (state.currentExam.status === 'active') {
                    await dispatch('saveToLocal')
                    await dispatch('syncToServer')
                }
            }, state.localStorage.saveInterval)

            commit('SET_AUTO_SAVE_INTERVAL', intervalId)
        },

        // 本地存储
        async saveToLocal ({ commit, state }) {
            if (!state.localStorage.autoSaveEnabled) return

            try {
                const saveData = {
                    examId: state.currentExam.id,
                    answers: state.answers,
                    currentQuestionIndex: state.currentQuestionIndex,
                    flaggedQuestions: state.flaggedQuestions,
                    timeSpent: state.timer.timeSpent,
                    saveTime: Date.now()
                }

                localStorage.setItem(state.localStorage.storageKey, JSON.stringify(saveData))
                commit('UPDATE_LAST_SAVE_TIME')
            } catch (error) {
                commit('SET_ERROR', { key: 'localStorage', error: error.message })
            }
        },

        // 从本地存储恢复
        async loadFromLocal ({ commit, state }) {
            try {
                const savedData = localStorage.getItem(state.localStorage.storageKey)
                if (savedData) {
                    const data = JSON.parse(savedData)

                    // 恢复答案
                    Object.keys(data.answers).forEach(questionId => {
                        if (data.answers[questionId] !== null) {
                            commit('SET_ANSWER', { questionId, answer: data.answers[questionId] })
                        }
                    })

                    // 恢复其他状态
                    commit('SET_CURRENT_QUESTION', data.currentQuestionIndex || 0)
                    if (data.flaggedQuestions) {
                        state.flaggedQuestions = [...data.flaggedQuestions]
                    }

                    commit('ADD_NOTIFICATION', {
                        type: 'info',
                        message: '已恢复本地保存的答题记录'
                    })
                }
            } catch (error) {
                commit('SET_ERROR', { key: 'loadLocal', error: error.message })
            }
        },

        // 同步到服务器
        async syncToServer ({ commit, state }, specificData = null) {
            if (!state.network.isOnline) return

            try {
                const syncData = specificData || {
                    examId: state.currentExam.id,
                    answers: state.answers,
                    progress: state.progress
                }

                await postAction('/teaching/examSync', syncData)
                commit('UPDATE_LAST_SYNC_TIME')
            } catch (error) {
                // 网络错误时不显示错误，只记录
                console.warn('同步失败:', error)
            }
        },

        // 初始化监控
        initMonitoring ({ commit, dispatch }) {
            // 监听页面可见性变化
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    commit('INCREMENT_TAB_SWITCH')
                }
            })

            // 监听复制事件
            document.addEventListener('copy', () => {
                commit('INCREMENT_COPY_ATTEMPT')
            })

            // 监听右键事件
            document.addEventListener('contextmenu', (e) => {
                commit('INCREMENT_RIGHT_CLICK')
                if (state.settings.preventRightClick) {
                    e.preventDefault()
                }
            })

            // 监听全屏事件
            document.addEventListener('fullscreenchange', () => {
                if (!document.fullscreenElement) {
                    commit('INCREMENT_FULLSCREEN_EXIT')
                }
            })

            // 网络状态监听
            window.addEventListener('online', () => {
                commit('SET_NETWORK_STATUS', true)
                dispatch('processPendingSubmissions')
            })

            window.addEventListener('offline', () => {
                commit('SET_NETWORK_STATUS', false)
                commit('ADD_NOTIFICATION', {
                    type: 'warning',
                    message: '网络连接中断，答题记录将保存在本地'
                })
            })
        },

        // 处理待提交的数据
        async processPendingSubmissions ({ commit, state }) {
            for (const submission of state.network.pendingSubmissions) {
                try {
                    await postAction('/teaching/examSubmission', submission.data)
                    commit('REMOVE_PENDING_SUBMISSION', submission.id)
                } catch (error) {
                    console.error('处理待提交数据失败:', error)
                }
            }
        },

        // 初始化本地存储
        initLocalStorage ({ dispatch, state }) {
            if (state.localStorage.storageKey) {
                dispatch('loadFromLocal')
            }
        },

        // 清理本地存储
        clearLocalStorage ({ state }) {
            if (state.localStorage.storageKey) {
                localStorage.removeItem(state.localStorage.storageKey)
            }
        },

        // 定时更新
        startTimerUpdate ({ commit, dispatch }) {
            const updateInterval = setInterval(() => {
                commit('UPDATE_TIMER')

                // 检查时间警告
                const remaining = state.timer.timeRemaining
                for (const threshold of state.timer.warningThresholds) {
                    if (remaining <= threshold * 1000 && remaining > (threshold - 60) * 1000) {
                        commit('ADD_NOTIFICATION', {
                            type: 'warning',
                            message: `剩余时间不足${Math.ceil(threshold / 60)}分钟`
                        })
                    }
                }

                // 时间到自动提交
                if (remaining <= 0 && state.currentExam.autoSubmit) {
                    dispatch('submitExam')
                    clearInterval(updateInterval)
                }
            }, 1000)

            return updateInterval
        }
    }

    // getters已移动到主getters.js以避免重复
}

export default exam
