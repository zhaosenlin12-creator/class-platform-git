import { axios } from '@/utils/request'
import { handleApiError, showSuccess } from '@/utils/errorHandler'
import loadingManager from '@/utils/loadingManager'

// 统一的API请求包装器
const apiWrapper = async (apiCall, options = {}) => {
    const {
        showLoading = false,
        loadingKey = 'default',
        loadingText = '加载中...',
        showError = true,
        showSuccess: showSuccessMsg = false,
        successMessage = '操作成功'
    } = options

    let loadingHandle = null
    try {
        if (showLoading) {
            loadingHandle = loadingManager.startLoading(loadingKey, loadingText)
        }

        const response = await apiCall()

        if (response.success) {
            if (showSuccessMsg) {
                showSuccess(successMessage)
            }
        } else {
            // 业务逻辑失败，显示服务器返回的错误消息
            if (showError) {
                handleApiError({
                    response: {
                        status: 400,
                        data: { message: response.message || '操作失败' }
                    }
                })
            }
        }

        return response
    } catch (error) {
        if (showError) {
            handleApiError(error)
        }
        throw error
    } finally {
        if (showLoading && loadingHandle) {
            loadingManager.stopLoading(loadingHandle)
        }
    }
}

// 教师统计相关API
export const teacherStatsApi = {

    // 获取仪表板统计数据
    getDashboardStats (params = {}) {
        return apiWrapper(() => axios({
            url: '/teaching/teacher/statistics/dashboard',
            method: 'get',
            params
        }), {
            showLoading: true,
            loadingKey: 'dashboard-stats',
            loadingText: '加载仪表板数据...'
        })
    },

    // 获取教学活动数据
    getTeachingActivities (params = {}) {
        return apiWrapper(() => axios({
            url: '/teaching/teacher/statistics/activities',
            method: 'get',
            params
        }), {
            showLoading: true,
            loadingKey: 'teaching-activities',
            loadingText: '加载活动数据...'
        })
    },

    // 获取学生分析数据
    getStudentAnalysis (params = {}) {
        return axios({
            url: '/teaching/teacher/statistics/student-analysis',
            method: 'get',
            params
        })
    },

    // 获取成绩分析数据
    getGradeAnalysis (params = {}) {
        return axios({
            url: '/teaching/teacher/statistics/grade-analysis',
            method: 'get',
            params
        })
    },

    // 获取课程完成统计
    getCourseCompletion (params = {}) {
        return axios({
            url: '/teaching/teacher/statistics/course-completion',
            method: 'get',
            params
        })
    },

    // 获取教学效果分析
    getTeachingEffectiveness (params = {}) {
        return axios({
            url: '/teaching/teacher/statistics/teaching-effectiveness',
            method: 'get',
            params
        })
    },

    // 获取学习进度跟踪
    getLearningProgress (params = {}) {
        return axios({
            url: '/teaching/teacher/statistics/learning-progress',
            method: 'get',
            params
        })
    },

    // 导出统计报告
    exportStatisticsReport (params = {}) {
        return axios({
            url: '/teaching/teacher/statistics/export-report',
            method: 'post',
            data: params,
            responseType: 'blob'
        })
    }
}

// 学生管理相关API
export const studentApi = {

    // 获取学生列表
    getStudentList (params = {}) {
        return apiWrapper(() => axios({
            url: '/teaching/student/list',
            method: 'get',
            params
        }), {
            showLoading: false // 禁用loading，让组件自己管理
        })
    },

    // 获取班级列表
    getClassList (params = {}) {
        return axios({
            url: '/teaching/student/classes',
            method: 'get',
            params
        })
    },

    // 获取学生详细信息
    getStudentDetails (studentId) {
        return axios({
            url: `/teaching/student/details/${studentId}`,
            method: 'get'
        })
    },

    // 获取学生学习进度
    getStudentProgress (studentId, params = {}) {
        return axios({
            url: `/teaching/student/progress/${studentId}`,
            method: 'get',
            params
        })
    },

    // 获取学生作业情况
    getStudentHomework (studentId, params = {}) {
        return axios({
            url: `/teaching/student/homework/${studentId}`,
            method: 'get',
            params
        })
    },

    // 更新学生信息
    updateStudentInfo (studentId, data) {
        return axios({
            url: `/teaching/student/update/${studentId}`,
            method: 'put',
            data
        })
    },

    // 批量更新学生状态
    batchUpdateStudentStatus (data) {
        return axios({
            url: '/teaching/student/batch-update-status',
            method: 'post',
            data
        })
    },

    // 创建学习标记
    createLearningMark (data) {
        return axios({
            url: '/teaching/student/create-learning-mark',
            method: 'post',
            data
        })
    },

    // 获取学生统计数据
    getStudentStatistics (params = {}) {
        return axios({
            url: '/teaching/student/statistics',
            method: 'get',
            params
        })
    },

    // 导出学生数据
    exportStudentData (params = {}) {
        return axios({
            url: '/teaching/student/export',
            method: 'post',
            data: params,
            responseType: 'blob'
        })
    }
}

// 课程计划相关API
export const scheduleApi = {

    // 获取课程计划列表
    getScheduleList (params = {}) {
        return axios({
            url: '/teaching/teacher/schedule/list',
            method: 'get',
            params
        })
    },

    // 获取今日课程计划
    getTodaySchedule () {
        return axios({
            url: '/teaching/teacher/schedule/today',
            method: 'get'
        })
    },

    // 获取本周课程计划
    getWeekSchedule () {
        return axios({
            url: '/teaching/teacher/schedule/week',
            method: 'get'
        })
    },

    // 创建课程计划
    createSchedule (data) {
        return apiWrapper(() => axios({
            url: '/teaching/teacher/schedule/create',
            method: 'post',
            data
        }), {
            showLoading: true,
            loadingText: '创建课程安排中...',
            showSuccess: true,
            successMessage: '课程安排创建成功'
        })
    },

    // 更新课程计划
    updateSchedule (data) {
        return axios({
            url: '/teaching/teacher/schedule/update',
            method: 'put',
            data
        })
    },

    // 开始课程
    startCourse (scheduleId) {
        return axios({
            url: `/teaching/teacher/schedule/start/${scheduleId}`,
            method: 'post'
        })
    },

    // 完成课程
    completeCourse (scheduleId, data) {
        return axios({
            url: `/teaching/teacher/schedule/complete/${scheduleId}`,
            method: 'post',
            data
        })
    },

    // 获取课程统计
    getScheduleStatistics (params = {}) {
        return axios({
            url: '/teaching/teacher/schedule/statistics',
            method: 'get',
            params
        })
    },

    // 获取课程日历数据
    getScheduleCalendar (params = {}) {
        return axios({
            url: '/teaching/teacher/schedule/calendar',
            method: 'get',
            params
        })
    }
}

// 任务管理相关API
export const actionsApi = {

    // 获取任务列表
    getActionsList (params = {}) {
        return axios({
            url: '/teaching/teacher/actions/list',
            method: 'get',
            params
        })
    },

    // 获取待处理任务
    getPendingActions () {
        return axios({
            url: '/teaching/teacher/actions/pending',
            method: 'get'
        })
    },

    // 获取紧急任务
    getUrgentActions () {
        return axios({
            url: '/teaching/teacher/actions/urgent',
            method: 'get'
        })
    },

    // 创建快速操作任务
    createQuickAction (data) {
        return axios({
            url: '/teaching/teacher/actions/create-quick',
            method: 'post',
            data
        })
    },

    // 开始处理任务
    startAction (actionId) {
        return axios({
            url: `/teaching/teacher/actions/start/${actionId}`,
            method: 'post'
        })
    },

    // 完成任务
    completeAction (actionId, data) {
        return axios({
            url: `/teaching/teacher/actions/complete/${actionId}`,
            method: 'post',
            data
        })
    },

    // 取消任务
    cancelAction (actionId, data) {
        return axios({
            url: `/teaching/teacher/actions/cancel/${actionId}`,
            method: 'post',
            data
        })
    },

    // 更新任务优先级
    updatePriority (actionId, priority) {
        return axios({
            url: `/teaching/teacher/actions/priority/${actionId}`,
            method: 'put',
            params: { priority }
        })
    },

    // 获取任务统计
    getActionStatistics () {
        return axios({
            url: '/teaching/teacher/actions/statistics',
            method: 'get'
        })
    },

    // 批量更新任务状态
    batchUpdateActions (data) {
        return axios({
            url: '/teaching/teacher/actions/batch-update',
            method: 'post',
            data
        })
    }
}

// 作业相关API
export const homeworkApi = {

    // 获取作业列表
    getHomeworkList (params = {}) {
        return axios({
            url: '/teaching/homework/list',
            method: 'get',
            params
        })
    },

    // 获取待批改作业
    getPendingHomework (params = {}) {
        return axios({
            url: '/teaching/homework/pending',
            method: 'get',
            params
        })
    },

    getReviewList (params = {}) {
        return axios({
            url: '/teaching/homework-review/list',
            method: 'get',
            params
        })
    },

    getReviewStats (params = {}) {
        return axios({
            url: '/teaching/homework-review/stats',
            method: 'get',
            params
        })
    },

    // 批改作业
    gradeHomework (homeworkId, data) {
        return apiWrapper(() => axios({
            url: `/teaching/homework/grade/${homeworkId}`,
            method: 'post',
            data
        }), {
            showLoading: true,
            loadingText: '提交评分中...',
            showSuccess: true,
            successMessage: '作业评分成功'
        })
    },

    // 获取作业详情
    getHomeworkDetails (homeworkId) {
        return axios({
            url: `/teaching/homework/details/${homeworkId}`,
            method: 'get'
        })
    },

    // 自动批改代码作业
    autoGradeCode (homeworkId, data) {
        return axios({
            url: `/teaching/homework/auto-grade/${homeworkId}`,
            method: 'post',
            data
        })
    },

    // 导出作业统计
    exportHomeworkStats (params = {}) {
        return axios({
            url: '/teaching/homework/export-stats',
            method: 'post',
            data: params,
            responseType: 'blob'
        })
    },

    // 执行代码
    executeCode (data) {
        return axios({
            url: '/teaching/homework/execute-code',
            method: 'post',
            data
        })
    },

    // 获取评语模板
    getCommentTemplates () {
        return axios({
            url: '/teaching/homework/comment-templates',
            method: 'get'
        })
    },

    // 获取作业评分统计
    getGradingStats (homeworkId) {
        return axios({
            url: `/teaching/homework/grading-stats/${homeworkId}`,
            method: 'get'
        })
    },

    // =============================================
    // 作业模板管理API
    // =============================================

    // 获取作业模板列表
    getTemplateList (params = {}) {
        return axios({
            url: '/homework/templates',
            method: 'get',
            params
        })
    },

    // 创建作业模板
    createTemplate (data) {
        return axios({
            url: '/homework/templates',
            method: 'post',
            data
        })
    },

    // 更新作业模板
    updateTemplate (id, data) {
        return axios({
            url: `/homework/templates/${id}`,
            method: 'put',
            data
        })
    },

    // 删除作业模板
    deleteTemplate (id) {
        return axios({
            url: `/homework/templates/${id}`,
            method: 'delete'
        })
    },

    // 获取作业模板详情
    getTemplateDetail (id) {
        return axios({
            url: `/homework/templates/${id}`,
            method: 'get'
        })
    },

    // =============================================
    // 作业分配API
    // =============================================

    // 分配作业
    assignHomework (data) {
        return axios({
            url: '/homework/assign',
            method: 'post',
            data
        })
    },

    // 获取已分配作业列表
    getAssignmentList (params = {}) {
        return axios({
            url: '/homework/assignments',
            method: 'get',
            params
        })
    },

    // 取消作业分配
    cancelAssignment (id) {
        return axios({
            url: `/homework/assignments/${id}`,
            method: 'delete'
        })
    }
}

// 课程相关API
export const courseApi = {

    // 获取课程列表
    getCourseList (params = {}) {
        return axios({
            url: '/teaching/course/list',
            method: 'get',
            params
        })
    },

    // 创建课程
    createCourse (data) {
        return axios({
            url: '/teaching/teachingCourse/create',
            method: 'post',
            data
        })
    },

    // 更新课程
    updateCourse (courseId, data) {
        return axios({
            url: '/teaching/teachingCourse/update',
            method: 'post',
            data: {
                ...data,
                id: courseId
            }
        })
    },

    // 删除课程
    deleteCourse (courseId) {
        return axios({
            url: `/teaching/teachingCourse/delete/${courseId}`,
            method: 'delete'
        })
    },

    // 发布课程
    publishCourse (courseId) {
        return axios({
            url: `/teaching/teachingCourse/publish/${courseId}`,
            method: 'post'
        })
    },

    // 获取课程统计
    getCourseStatistics (courseId) {
        return axios({
            url: `/teaching/teachingCourse/statistics/${courseId}`,
            method: 'get'
        })
    }
}

// 课程资源相关API
export const courseResourceApi = {

    // 获取课程资源列表
    getResourceList (params = {}) {
        return apiWrapper(() => axios({
            url: '/teaching/course/resources/list',
            method: 'get',
            params
        }), {
            showLoading: true,
            loadingText: '加载课程资源...'
        })
    },

    // 按类型获取资源
    getResourcesByType (type, params = {}) {
        return axios({
            url: `/teaching/course/resources/type/${type}`,
            method: 'get',
            params
        })
    },

    // 获取资源详情
    getResourceDetails (resourceId) {
        return axios({
            url: `/teaching/course/resources/details/${resourceId}`,
            method: 'get'
        })
    },

    // 上传课程资源
    uploadResource (data) {
        return apiWrapper(() => axios({
            url: '/teaching/course/resources/upload',
            method: 'post',
            data,
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        }), {
            showLoading: true,
            loadingText: '上传资源中...',
            showSuccess: true,
            successMessage: '资源上传成功'
        })
    },

    // 获取资源上传令牌 (OSS直传)
    getResourceUploadToken (data) {
        return axios({
            url: '/course/resource/upload-token',
            method: 'post',
            data
        })
    },

    // 保存资源元数据 (OSS直传后)
    saveResourceMetadata (data) {
        return axios({
            url: '/course/resource/metadata',
            method: 'post',
            data
        })
    },

    // 更新资源信息
    updateResource (resourceId, data) {
        return apiWrapper(() => axios({
            url: `/teaching/course/resources/update/${resourceId}`,
            method: 'put',
            data
        }), {
            showLoading: true,
            loadingText: '更新资源信息...',
            showSuccess: true,
            successMessage: '资源更新成功'
        })
    },

    // 删除资源
    deleteResource (resourceId) {
        return apiWrapper(() => axios({
            url: `/teaching/course/resources/delete/${resourceId}`,
            method: 'delete'
        }), {
            showLoading: true,
            loadingText: '删除资源中...',
            showSuccess: true,
            successMessage: '资源删除成功'
        })
    },

    // 批量删除资源
    batchDeleteResources (resourceIds) {
        return apiWrapper(() => axios({
            url: '/teaching/course/resources/batch-delete',
            method: 'post',
            data: { resourceIds }
        }), {
            showLoading: true,
            loadingText: '批量删除中...',
            showSuccess: true,
            successMessage: '批量删除成功'
        })
    },

    // 下载资源
    downloadResource (resourceId) {
        return axios({
            url: `/teaching/course/resources/download/${resourceId}`,
            method: 'get',
            responseType: 'blob'
        })
    },

    // 预览资源
    getResourceDownloadUrl (resourceId) {
        return axios({
            url: `/teaching/course/resources/download-url/${resourceId}`,
            method: 'get'
        })
    },

    previewResource (resourceId) {
        return axios({
            url: `/teaching/course/resources/preview/${resourceId}`,
            method: 'get'
        })
    },

    // 搜索资源
    searchResources (keyword, params = {}) {
        return axios({
            url: '/teaching/course/resources/search',
            method: 'get',
            params: { keyword, ...params }
        })
    },

    // 获取资源统计信息
    getResourceStatistics (params = {}) {
        return axios({
            url: '/teaching/course/resources/statistics',
            method: 'get',
            params
        })
    },

    // 收藏/取消收藏资源
    toggleFavorite (resourceId) {
        return axios({
            url: `/teaching/course/resources/favorite/${resourceId}`,
            method: 'post'
        })
    },

    // 获取收藏的资源
    getFavoriteResources (params = {}) {
        return axios({
            url: '/teaching/course/resources/favorites',
            method: 'get',
            params
        })
    },

    // 分享资源
    shareResource (resourceId, data) {
        return axios({
            url: `/teaching/course/resources/share/${resourceId}`,
            method: 'post',
            data
        })
    },

    // 获取分享链接
    getShareLink (resourceId, params = {}) {
        return axios({
            url: `/teaching/course/resources/share-link/${resourceId}`,
            method: 'get',
            params
        })
    },

    // 获取章节列表
    getClassroomShareLink (classroomId, resourceId, params = {}) {
        return axios({
            url: `/teaching/classroom/classrooms/${classroomId}/resources/${resourceId}/share-link`,
            method: 'get',
            params
        })
    },

    getChapterList (courseId) {
        return axios({
            url: `/teaching/course/chapters/${courseId}`,
            method: 'get'
        })
    },

    // 创建章节
    createChapter (courseId, data) {
        return apiWrapper(() => axios({
            url: `/teaching/course/chapters/${courseId}/create`,
            method: 'post',
            data
        }), {
            showLoading: true,
            loadingText: '创建章节中...',
            showSuccess: true,
            successMessage: '章节创建成功'
        })
    },

    // 更新章节
    updateChapter (chapterId, data) {
        return axios({
            url: `/teaching/course/chapters/update/${chapterId}`,
            method: 'put',
            data
        })
    },

    // 删除章节
    deleteChapter (chapterId) {
        return axios({
            url: `/teaching/course/chapters/delete/${chapterId}`,
            method: 'delete'
        })
    }
}

// 班级管理相关API
export const classApi = {

    // 获取班级列表
    getClassList (params = {}) {
        return apiWrapper(() => axios({
            url: '/teaching/class/list',
            method: 'get',
            params
        }), {
            showLoading: true,
            loadingText: '加载班级数据...'
        })
    },

    // 创建班级
    createClass (data) {
        return apiWrapper(() => axios({
            url: '/teaching/class',
            method: 'post',
            data
        }), {
            showLoading: true,
            loadingText: '创建班级中...',
            showSuccess: true,
            successMessage: '班级创建成功'
        })
    },

    // 更新班级
    updateClass (data) {
        return apiWrapper(() => axios({
            url: '/teaching/class',
            method: 'put',
            data
        }), {
            showLoading: true,
            loadingText: '更新班级中...',
            showSuccess: true,
            successMessage: '班级更新成功'
        })
    },

    // 删除班级
    deleteClass (classId) {
        return apiWrapper(() => axios({
            url: `/teaching/class/${classId}`,
            method: 'delete'
        }), {
            showLoading: true,
            loadingText: '删除班级中...',
            showSuccess: true,
            successMessage: '班级删除成功'
        })
    },

    // 获取教师班级列表
    getTeacherClasses (teacherId) {
        return axios({
            url: `/teaching/teacher-classes/${teacherId}`,
            method: 'get'
        })
    },

    // 获取学生班级关联
    getStudentClassList (params = {}) {
        return axios({
            url: '/teaching/student-class/list',
            method: 'get',
            params
        })
    },

    // 添加学生到班级
    addStudentToClass (data) {
        return apiWrapper(() => axios({
            url: '/teaching/student-class',
            method: 'post',
            data
        }), {
            showLoading: true,
            loadingText: '添加学生中...',
            showSuccess: true,
            successMessage: '学生添加成功'
        })
    }
}

// 在线教室相关API
export const classroomApi = {

    // 获取教室列表
    getClassroomList (params = {}) {
        return apiWrapper(() => axios({
            url: '/teaching/classroom/list',
            method: 'get',
            params
        }), {
            showLoading: true,
            loadingText: '加载教室数据...'
        })
    },

    // 创建教室
    createClassroom (data) {
        return apiWrapper(() => axios({
            url: '/teaching/classroom/create',
            method: 'post',
            data
        }), {
            showLoading: true,
            loadingText: '创建教室中...',
            showSuccess: true,
            successMessage: '教室创建成功'
        })
    },

    // 更新教室
    updateClassroom (classroomId, data) {
        return apiWrapper(() => axios({
            url: `/teaching/classroom/${classroomId}`,
            method: 'put',
            data
        }), {
            showLoading: true,
            loadingText: '更新教室中...',
            showSuccess: true,
            successMessage: '教室更新成功'
        })
    },

    // 删除教室
    deleteClassroom (classroomId) {
        return apiWrapper(() => axios({
            url: `/teaching/classroom/${classroomId}`,
            method: 'delete'
        }), {
            showLoading: true,
            loadingText: '删除教室中...',
            showSuccess: true,
            successMessage: '教室删除成功'
        })
    },

    // 开始课程
    startClassroom (classroomId) {
        return apiWrapper(() => axios({
            url: `/teaching/classroom/${classroomId}/start`,
            method: 'post'
        }), {
            showLoading: true,
            loadingText: '开始课程中...',
            showSuccess: true,
            successMessage: '课程开始成功'
        })
    },

    // 结束课程
    endClassroom (classroomId) {
        return apiWrapper(() => axios({
            url: `/teaching/classroom/${classroomId}/end`,
            method: 'post'
        }), {
            showLoading: true,
            loadingText: '结束课程中...',
            showSuccess: true,
            successMessage: '课程结束成功'
        })
    },

    // 获取课程安排列表
    getScheduleList (params = {}) {
        return axios({
            url: '/teaching/schedule/list',
            method: 'get',
            params
        })
    },

    // 创建课程安排
    createSchedule (data) {
        return apiWrapper(() => axios({
            url: '/teaching/schedule/create',
            method: 'post',
            data
        }), {
            showLoading: true,
            loadingText: '创建课程安排中...',
            showSuccess: true,
            successMessage: '课程安排成功'
        })
    },

    // 获取班级可选课程
    getClassCourses (classId) {
        return axios({
            url: `/teaching/class-courses/${classId}`,
            method: 'get'
        })
    }
}

// 学生作品展示 API
export const studentWorkApi = {
    // 获取公开作品列表（支持分页、搜索、类型筛选）
    getPublicWorks (params = {}) {
        return axios({
            url: '/teaching/student/works/public',
            method: 'get',
            params
        })
    },
    // 获取我的作品列表
    getMyWorks (params = {}) {
        return axios({
            url: '/teaching/student/works/my',
            method: 'get',
            params
        })
    },
    // 获取作品详情
    getWorkDetail (id) {
        return axios({
            url: `/teaching/student/works/${id}`,
            method: 'get'
        })
    }
}

// 通用教学API
export const teachingApi = {
    teacherStatsApi,
    studentApi,
    scheduleApi,
    actionsApi,
    homeworkApi,
    courseApi,
    courseResourceApi,
    classApi,
    classroomApi,
    studentWorkApi
}

export default teachingApi
