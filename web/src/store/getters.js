import Vue from 'vue'
import { ENHANCE_PRE } from '@/store/mutation-types'

const getters = {
    // ============= 应用状态相关 =============
    device: state => state.app.device,
    theme: state => state.app.theme,
    color: state => state.app.color,

    // ============= 用户状态相关 =============
    token: state => state.user.token,
    avatar: state => state.user.avatar || '/logo.png',
    username: state => state.user.username,
    nickname: state => state.user.realname || (state.user.info && (state.user.info.realname || state.user.info.realName)) || '',
    welcome: state => state.user.welcome,
    userInfo: state => state.user.info || null,

    // 用户类型和权限
    userType: state => state.user.userType,
    isTeacher: state => state.user.userType === 'teacher',
    isStudent: state => state.user.userType === 'student',
    isLoggedIn: state => state.user.loginStatus === 'logged_in',
    isLoggingIn: state => state.user.loginStatus === 'logging_in',

    // 权限和菜单
    permissionList: state => state.user.permissionList,
    menuList: state => state.user.menuList || [],
    userRole: state => state.user.userRole,
    hasRole: state => role => state.user.userRole.includes(role),

    // 系统配置
    sysConfig: state => state.user.sysConfig || {},
    userPreferences: state => state.user.preferences,
    currentLanguage: state => state.user.preferences.language,
    currentTheme: state => state.user.preferences.theme,

    // ============= 权限路由相关 =============
    addRouters: state => state.permission.addRouters,

    // ============= 增强功能相关 =============
    enhanceJs: (state) => (code) => {
        state.enhance.enhanceJs[code] = Vue.ls.get(ENHANCE_PRE + code)
        return state.enhance.enhanceJs[code]
    },

    // ============= 教学数据相关 =============
    // 课程相关
    coursesList: state => (state.teaching && state.teaching.courses && state.teaching.courses.list) || [],
    currentCourse: state => (state.teaching && state.teaching.courses && state.teaching.courses.current) || null,
    coursesLoading: state => (state.teaching && state.teaching.courses && state.teaching.courses.loading) || false,
    coursesPagination: state => (state.teaching && state.teaching.courses && state.teaching.courses.pagination) || {},

    // 学生相关
    studentsList: state => (state.teaching && state.teaching.students && state.teaching.students.list) || [],
    currentStudent: state => (state.teaching && state.teaching.students && state.teaching.students.current) || null,
    studentsLoading: state => (state.teaching && state.teaching.students && state.teaching.students.loading) || false,
    studentsCount: state => (state.teaching && state.teaching.students && state.teaching.students.list && state.teaching.students.list.length) || 0,

    // 课程内容相关
    chapters: state => (state.teaching && state.teaching.courseContent && state.teaching.courseContent.chapters) || [],
    currentChapter: state => (state.teaching && state.teaching.courseContent && state.teaching.courseContent.currentChapter) || null,
    lessons: state => (state.teaching && state.teaching.courseContent && state.teaching.courseContent.lessons) || [],
    currentLesson: state => (state.teaching && state.teaching.courseContent && state.teaching.courseContent.currentLesson) || null,
    resources: state => (state.teaching && state.teaching.courseContent && state.teaching.courseContent.resources) || [],
    contentLoading: state => (state.teaching && state.teaching.courseContent && state.teaching.courseContent.loading) || false,

    // 作业相关
    assignments: state => (state.teaching && state.teaching.assignments && state.teaching.assignments.list) || [],
    currentAssignment: state => (state.teaching && state.teaching.assignments && state.teaching.assignments.current) || null,
    assignmentSubmissions: state => (state.teaching && state.teaching.assignments && state.teaching.assignments.submissions) || [],
    assignmentsLoading: state => (state.teaching && state.teaching.assignments && state.teaching.assignments.loading) || false,

    // 学习分析相关
    dashboardData: state => (state.teaching && state.teaching.analytics && state.teaching.analytics.dashboard) || null,
    analyticsLoading: state => (state.teaching && state.teaching.analytics && state.teaching.analytics.loading) || false,
    courseStats: state => courseId => (state.teaching && state.teaching.analytics && state.teaching.analytics.courseStats && state.teaching.analytics.courseStats[courseId]) || null,
    studentProgress: state => studentId => (state.teaching && state.teaching.analytics && state.teaching.analytics.studentProgress && state.teaching.analytics.studentProgress[studentId]) || null,

    // 教学错误处理
    teachingHasError: state => key => !!(state.teaching && state.teaching.errors && state.teaching.errors[key]),
    teachingError: state => key => (state.teaching && state.teaching.errors && state.teaching.errors[key]) || null,

    // ============= 课堂状态相关 =============
    // 连接状态
    isClassroomConnected: state => (state.classroom && state.classroom.connection && state.classroom.connection.isConnected) || false,
    classroomConnectionQuality: state => {
        const connection = state.classroom && state.classroom.connection
        if (!connection || !connection.isConnected) return 'disconnected'
        if (connection.reconnectAttempts > 0) return 'poor'
        if (!connection.lastPing) return 'unknown'

        const timeSinceLastPing = Date.now() - connection.lastPing
        if (timeSinceLastPing < 5000) return 'excellent'
        if (timeSinceLastPing < 10000) return 'good'
        return 'fair'
    },

    // 课堂会话
    classroomSession: state => (state.classroom && state.classroom.session) || {},
    isClassroomActive: state => (state.classroom && state.classroom.session && state.classroom.session.status === 'active') || false,
    classroomStatus: state => (state.classroom && state.classroom.session && state.classroom.session.status) || 'inactive',

    // 参与者相关
    classroomParticipants: state => (state.classroom && state.classroom.participants && state.classroom.participants.online) || [],
    classroomParticipantCount: state => (state.classroom && state.classroom.participants && state.classroom.participants.total) || 0,
    classroomTeacherCount: state => (state.classroom && state.classroom.participants && state.classroom.participants.teachers && state.classroom.participants.teachers.length) || 0,
    classroomStudentCount: state => (state.classroom && state.classroom.participants && state.classroom.participants.students && state.classroom.participants.students.length) || 0,

    // 交互功能
    handsUpCount: state => (state.classroom && state.classroom.interactions && state.classroom.interactions.handsUp && state.classroom.interactions.handsUp.length) || 0,
    currentQA: state => (state.classroom && state.classroom.interactions && state.classroom.interactions.qa && state.classroom.interactions.qa.current) || null,
    currentPoll: state => (state.classroom && state.classroom.interactions && state.classroom.interactions.polls && state.classroom.interactions.polls.current) || null,
    recentMessages: state => (state.classroom && state.classroom.interactions && state.classroom.interactions.messages && state.classroom.interactions.messages.slice(-50)) || [],
    whiteboardState: state => (state.classroom && state.classroom.interactions && state.classroom.interactions.whiteboard) || {},

    // 媒体状态
    localMediaState: state => (state.classroom && state.classroom.media && state.classroom.media.local) || { video: false, audio: false, screenShare: false },
    remoteMediaState: state => participantId => (state.classroom && state.classroom.media && state.classroom.media.remote && state.classroom.media.remote[participantId]) || null,
    screenShareState: state => (state.classroom && state.classroom.screenShare) || { isSharing: false, sharerInfo: null },

    // 课堂控制
    classroomPermissions: state => (state.classroom && state.classroom.controls && state.classroom.controls.permissions) || {},
    isClassroomLocked: state => (state.classroom && state.classroom.controls && state.classroom.controls.isLocked) || false,
    classroomMode: state => (state.classroom && state.classroom.controls && state.classroom.controls.mode) || 'lecture',

    // 课堂通知和错误
    classroomNotifications: state => (state.classroom && state.classroom.notifications && state.classroom.notifications.slice(-10)) || [],
    classroomHasError: state => key => !!(state.classroom && state.classroom.errors && state.classroom.errors[key]),

    // ============= 考试状态相关 =============
    // 考试基本信息
    currentExam: state => (state.exam && state.exam.currentExam) || null,
    currentPaper: state => (state.exam && state.exam.paper) || null,
    isExamActive: state => (state.exam && state.exam.currentExam && state.exam.currentExam.status === 'active') || false,
    isExamFinished: state => (state.exam && state.exam.currentExam && ['finished', 'submitted'].includes(state.exam.currentExam.status)) || false,
    examStatus: state => (state.exam && state.exam.currentExam && state.exam.currentExam.status) || 'not_started',

    // 答题状态
    currentQuestion: state => {
        const paper = state.exam && state.exam.paper
        const index = (state.exam && state.exam.currentQuestionIndex) || 0
        return (paper && paper.questions && paper.questions[index]) || null
    },
    examAnsweredCount: state => (state.exam && state.exam.answeredCount) || 0,
    examTotalQuestions: state => (state.exam && state.exam.paper && state.exam.paper.questions && state.exam.paper.questions.length) || 0,
    examProgress: state => (state.exam && state.exam.progress && state.exam.progress.overall) || 0,
    examFlaggedCount: state => (state.exam && state.exam.flaggedQuestions && state.exam.flaggedQuestions.length) || 0,

    // 时间状态
    examTimeRemaining: state => (state.exam && state.exam.timer && state.exam.timer.timeRemaining) || 0,
    examTimeSpent: state => (state.exam && state.exam.timer && state.exam.timer.timeSpent) || 0,
    examFormattedTimeRemaining: state => {
        const timeRemaining = (state.exam && state.exam.timer && state.exam.timer.timeRemaining) || 0
        const seconds = Math.ceil(timeRemaining / 1000)
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`
    },

    // 监控状态
    examSuspiciousActivityCount: state => (state.exam && state.exam.monitoring && state.exam.monitoring.antiCheat && state.exam.monitoring.antiCheat.suspiciousActivity && state.exam.monitoring.antiCheat.suspiciousActivity.length) || 0,
    examIsMonitored: state => (state.exam && state.exam.monitoring && state.exam.monitoring.camera && state.exam.monitoring.camera.isEnabled) || false,
    examTabSwitchCount: state => (state.exam && state.exam.monitoring && state.exam.monitoring.antiCheat && state.exam.monitoring.antiCheat.tabSwitchCount) || 0,

    // 网络和同步状态
    examIsOnline: state => (state.exam && state.exam.network && state.exam.network.isOnline !== false) || true,
    examHasPendingSubmissions: state => (state.exam && state.exam.network && state.exam.network.pendingSubmissions && state.exam.network.pendingSubmissions.length > 0) || false,
    examConnectionQuality: state => (state.exam && state.exam.network && state.exam.network.connectionQuality) || 'unknown',

    // 提交状态
    examCanSubmit: state => {
        const exam = state.exam
        return (exam && exam.currentExam && exam.currentExam.status === 'active') &&
           !(exam && exam.submission && exam.submission.isSubmitting) &&
           !(exam && exam.submission && exam.submission.isSubmitted)
    },
    examIsSubmitting: state => (state.exam && state.exam.submission && state.exam.submission.isSubmitting) || false,
    examIsSubmitted: state => (state.exam && state.exam.submission && state.exam.submission.isSubmitted) || false,
    examSubmissionResults: state => (state.exam && state.exam.submission && state.exam.submission.results) || null,

    // 考试错误状态
    examHasError: state => key => !!(state.exam && state.exam.errors && state.exam.errors[key]),
    examError: state => key => (state.exam && state.exam.errors && state.exam.errors[key]) || null,
    examNotifications: state => (state.exam && state.exam.notifications && state.exam.notifications.slice(-5)) || [],

    // ============= 全局状态聚合 =============
    // 全局加载状态
    isGlobalLoading: state => {
        return (state.teaching && state.teaching.courses && state.teaching.courses.loading) ||
           (state.teaching && state.teaching.students && state.teaching.students.loading) ||
           (state.teaching && state.teaching.courseContent && state.teaching.courseContent.loading) ||
           (state.teaching && state.teaching.assignments && state.teaching.assignments.loading) ||
           (state.teaching && state.teaching.analytics && state.teaching.analytics.loading) ||
           (state.exam && state.exam.loading && state.exam.loading.exam) ||
           (state.exam && state.exam.loading && state.exam.loading.paper) ||
           (state.exam && state.exam.loading && state.exam.loading.submission)
    },

    // 全局错误状态
    hasGlobalErrors: state => {
        const teachingErrors = Object.keys((state.teaching && state.teaching.errors) || {}).length > 0
        const classroomErrors = Object.keys((state.classroom && state.classroom.errors) || {}).length > 0
        const examErrors = Object.keys((state.exam && state.exam.errors) || {}).length > 0
        return teachingErrors || classroomErrors || examErrors
    },

    // 全局通知汇总
    allNotifications: state => {
        const classroomNotifications = (state.classroom && state.classroom.notifications) || []
        const examNotifications = (state.exam && state.exam.notifications) || []
        return [...classroomNotifications, ...examNotifications]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 20)
    },

    // 系统状态概览
    systemStatus: state => {
        const hasConnections = (state.classroom && state.classroom.connection && state.classroom.connection.isConnected)
        const hasActiveExam = (state.exam && state.exam.currentExam && state.exam.currentExam.status === 'active')
        const hasActiveClassroom = (state.classroom && state.classroom.session && state.classroom.session.status === 'active')
        const hasErrors = Object.keys({
            ...((state.teaching && state.teaching.errors) || {}),
            ...((state.classroom && state.classroom.errors) || {}),
            ...((state.exam && state.exam.errors) || {})
        }).length > 0

        if (hasErrors) return 'error'
        if (hasActiveExam || hasActiveClassroom) return 'active'
        if (hasConnections) return 'connected'
        return 'idle'
    }
}

export default getters
