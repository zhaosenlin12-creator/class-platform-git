/**
 * 作业管理API
 */
import request from '@/utils/request'

// =============================================
// 作业模板管理API
// =============================================

/**
 * 获取作业模板列表
 */
export function getTemplateList (params) {
    return request({
        url: '/homework/templates',
        method: 'get',
        params
    })
}

/**
 * 创建作业模板
 */
export function createTemplate (data) {
    return request({
        url: '/homework/templates',
        method: 'post',
        data
    })
}

/**
 * 更新作业模板
 */
export function updateTemplate (id, data) {
    return request({
        url: `/homework/templates/${id}`,
        method: 'put',
        data
    })
}

/**
 * 删除作业模板
 */
export function deleteTemplate (id) {
    return request({
        url: `/homework/templates/${id}`,
        method: 'delete'
    })
}

/**
 * 获取作业模板详情
 */
export function getTemplateDetail (id) {
    return request({
        url: `/homework/templates/${id}`,
        method: 'get'
    })
}

// =============================================
// 作业分配API
// =============================================

/**
 * 分配作业
 */
export function assignHomework (data) {
    return request({
        url: '/homework/assign',
        method: 'post',
        data
    })
}

/**
 * 获取已分配作业列表
 */
export function getAssignmentList (params) {
    return request({
        url: '/homework/assignments',
        method: 'get',
        params
    })
}

/**
 * 取消作业分配
 */
export function cancelAssignment (id) {
    return request({
        url: `/homework/assignments/${id}`,
        method: 'delete'
    })
}

// =============================================
// 班级管理API（用于作业分配）
// =============================================

/**
 * 获取班级列表
 */
export function getClassList (params) {
    return request({
        url: '/teaching/class/list',
        method: 'get',
        params
    })
}

// =============================================
// 学生作业 & 提交/统计 API
// =============================================

export function getStudentHomework (params) {
    return request({
        url: '/homework/student/my-homework',
        method: 'get',
        params
    })
}

export function getHomeworkSubmissions (homeworkId, params) {
    return request({
        url: `/homework/submissions/${homeworkId}`,
        method: 'get',
        params
    })
}

export function getHomeworkStatistics (homeworkId) {
    return request({
        url: `/homework/statistics/${homeworkId}`,
        method: 'get'
    })
}

/**
 * 提交作业
 */
export function submitHomework (data) {
    return request({
        url: '/homework/submit',
        method: 'post',
        data
    })
}

/**
 * 获取教师作业列表
 */
export function getTeacherHomeworks (params) {
    return request({
        url: '/teacher/homework/list',
        method: 'get',
        params
    })
}

/**
 * 批改作业
 */
export function reviewHomework (data) {
    return request({
        url: '/homework/review',
        method: 'post',
        data
    })
}
