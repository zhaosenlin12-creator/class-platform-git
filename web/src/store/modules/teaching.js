import Vue from 'vue'
import { getAction, postAction, putAction, deleteAction } from '@/api/manage'

// 初始状态
const getDefaultState = () => {
    return {
    // 课程相关
        courses: {
            list: [],
            current: null,
            loading: false,
            pagination: {
                current: 1,
                pageSize: 10,
                total: 0
            }
        },

        // 学生相关
        students: {
            list: [],
            current: null,
            loading: false,
            pagination: {
                current: 1,
                pageSize: 10,
                total: 0
            }
        },

        // 课程内容相关
        courseContent: {
            chapters: [],
            currentChapter: null,
            lessons: [],
            currentLesson: null,
            resources: [],
            loading: false
        },

        // 作业相关
        assignments: {
            list: [],
            current: null,
            submissions: [],
            loading: false
        },

        // 学习分析数据
        analytics: {
            dashboard: null,
            courseStats: {},
            studentProgress: {},
            loading: false
        },

        // 缓存设置
        cache: {
            ttl: 5 * 60 * 1000, // 5分钟缓存
            lastUpdate: {}
        },

        // 错误状态
        errors: {}
    }
}

const teaching = {
    namespaced: true,

    state: getDefaultState(),

    mutations: {
    // 重置状态
        RESET_STATE: (state) => {
            Object.assign(state, getDefaultState())
        },

        // 课程相关mutations
        SET_COURSES_LOADING: (state, loading) => {
            state.courses.loading = loading
        },
        SET_COURSES_LIST: (state, { list, pagination }) => {
            state.courses.list = list
            if (pagination) {
                state.courses.pagination = { ...state.courses.pagination, ...pagination }
            }
        },
        SET_CURRENT_COURSE: (state, course) => {
            state.courses.current = course
        },
        ADD_COURSE: (state, course) => {
            state.courses.list.unshift(course)
        },
        UPDATE_COURSE: (state, course) => {
            const index = state.courses.list.findIndex(c => c.id === course.id)
            if (index !== -1) {
                Vue.set(state.courses.list, index, course)
            }
            if (state.courses.current && state.courses.current.id === course.id) {
                state.courses.current = course
            }
        },
        REMOVE_COURSE: (state, courseId) => {
            state.courses.list = state.courses.list.filter(c => c.id !== courseId)
            if (state.courses.current && state.courses.current.id === courseId) {
                state.courses.current = null
            }
        },

        // 学生相关mutations
        SET_STUDENTS_LOADING: (state, loading) => {
            state.students.loading = loading
        },
        SET_STUDENTS_LIST: (state, { list, pagination }) => {
            state.students.list = list
            if (pagination) {
                state.students.pagination = { ...state.students.pagination, ...pagination }
            }
        },
        SET_CURRENT_STUDENT: (state, student) => {
            state.students.current = student
        },
        ADD_STUDENT: (state, student) => {
            state.students.list.unshift(student)
        },
        UPDATE_STUDENT: (state, student) => {
            const index = state.students.list.findIndex(s => s.id === student.id)
            if (index !== -1) {
                Vue.set(state.students.list, index, student)
            }
        },
        REMOVE_STUDENT: (state, studentId) => {
            state.students.list = state.students.list.filter(s => s.id !== studentId)
        },

        // 课程内容相关mutations
        SET_CONTENT_LOADING: (state, loading) => {
            state.courseContent.loading = loading
        },
        SET_CHAPTERS: (state, chapters) => {
            state.courseContent.chapters = chapters
        },
        SET_CURRENT_CHAPTER: (state, chapter) => {
            state.courseContent.currentChapter = chapter
        },
        SET_LESSONS: (state, lessons) => {
            state.courseContent.lessons = lessons
        },
        SET_CURRENT_LESSON: (state, lesson) => {
            state.courseContent.currentLesson = lesson
        },
        SET_RESOURCES: (state, resources) => {
            state.courseContent.resources = resources
        },

        // 作业相关mutations
        SET_ASSIGNMENTS_LOADING: (state, loading) => {
            state.assignments.loading = loading
        },
        SET_ASSIGNMENTS: (state, assignments) => {
            state.assignments.list = assignments
        },
        SET_CURRENT_ASSIGNMENT: (state, assignment) => {
            state.assignments.current = assignment
        },
        SET_ASSIGNMENT_SUBMISSIONS: (state, submissions) => {
            state.assignments.submissions = submissions
        },

        // 学习分析相关mutations
        SET_ANALYTICS_LOADING: (state, loading) => {
            state.analytics.loading = loading
        },
        SET_DASHBOARD_DATA: (state, data) => {
            state.analytics.dashboard = data
        },
        SET_COURSE_STATS: (state, { courseId, stats }) => {
            Vue.set(state.analytics.courseStats, courseId, stats)
        },
        SET_STUDENT_PROGRESS: (state, { studentId, progress }) => {
            Vue.set(state.analytics.studentProgress, studentId, progress)
        },

        // 缓存相关
        UPDATE_CACHE_TIME: (state, key) => {
            Vue.set(state.cache.lastUpdate, key, Date.now())
        },

        // 错误处理
        SET_ERROR: (state, { key, error }) => {
            Vue.set(state.errors, key, error)
        },
        CLEAR_ERROR: (state, key) => {
            Vue.delete(state.errors, key)
        }
    },

    actions: {
    // 重置模块状态
        resetState ({ commit }) {
            commit('RESET_STATE')
        },

        // 课程相关actions
        async fetchCourses ({ commit, state }, { page = 1, pageSize = 10, ...params } = {}) {
            commit('SET_COURSES_LOADING', true)
            commit('CLEAR_ERROR', 'courses')

            try {
                const response = await getAction('/teaching/teachingCourse/list', {
                    pageNo: page,
                    pageSize,
                    ...params
                })

                if (response.success) {
                    commit('SET_COURSES_LIST', {
                        list: response.result.records || [],
                        pagination: {
                            current: page,
                            pageSize,
                            total: response.result.total || 0
                        }
                    })
                    commit('UPDATE_CACHE_TIME', 'courses')
                }
                return response
            } catch (error) {
                commit('SET_ERROR', { key: 'courses', error: error.message })
                throw error
            } finally {
                commit('SET_COURSES_LOADING', false)
            }
        },

        async createCourse ({ commit }, courseData) {
            commit('CLEAR_ERROR', 'createCourse')
            try {
                const response = await postAction('/teaching/teachingCourse', courseData)
                if (response.success) {
                    commit('ADD_COURSE', response.result)
                }
                return response
            } catch (error) {
                commit('SET_ERROR', { key: 'createCourse', error: error.message })
                throw error
            }
        },

        async updateCourse ({ commit }, { id, ...courseData }) {
            commit('CLEAR_ERROR', 'updateCourse')
            try {
                const response = await putAction('/teaching/teachingCourse', { id, ...courseData })
                if (response.success) {
                    commit('UPDATE_COURSE', { id, ...courseData })
                }
                return response
            } catch (error) {
                commit('SET_ERROR', { key: 'updateCourse', error: error.message })
                throw error
            }
        },

        async deleteCourse ({ commit }, courseId) {
            commit('CLEAR_ERROR', 'deleteCourse')
            try {
                const response = await deleteAction('/teaching/teachingCourse', { id: courseId })
                if (response.success) {
                    commit('REMOVE_COURSE', courseId)
                }
                return response
            } catch (error) {
                commit('SET_ERROR', { key: 'deleteCourse', error: error.message })
                throw error
            }
        },

        // 学生相关actions
        async fetchStudents ({ commit }, { courseId, page = 1, pageSize = 10, ...params } = {}) {
            commit('SET_STUDENTS_LOADING', true)
            commit('CLEAR_ERROR', 'students')

            try {
                const response = await getAction('/teaching/student/list', {
                    courseId,
                    pageNo: page,
                    pageSize,
                    ...params
                })

                if (response.success) {
                    commit('SET_STUDENTS_LIST', {
                        list: response.result.records || [],
                        pagination: {
                            current: page,
                            pageSize,
                            total: response.result.total || 0
                        }
                    })
                    commit('UPDATE_CACHE_TIME', 'students')
                }
                return response
            } catch (error) {
                commit('SET_ERROR', { key: 'students', error: error.message })
                throw error
            } finally {
                commit('SET_STUDENTS_LOADING', false)
            }
        },

        // 课程内容相关actions
        async fetchCourseContent ({ commit }, courseId) {
            commit('SET_CONTENT_LOADING', true)
            commit('CLEAR_ERROR', 'courseContent')

            try {
                const [chaptersResponse, resourcesResponse] = await Promise.all([
                    getAction('/teaching/courseChapter/list', { courseId }),
                    getAction('/teaching/courseResource/list', { courseId })
                ])

                if (chaptersResponse.success) {
                    commit('SET_CHAPTERS', chaptersResponse.result || [])
                }
                if (resourcesResponse.success) {
                    commit('SET_RESOURCES', resourcesResponse.result || [])
                }

                commit('UPDATE_CACHE_TIME', 'courseContent')
                return { chaptersResponse, resourcesResponse }
            } catch (error) {
                commit('SET_ERROR', { key: 'courseContent', error: error.message })
                throw error
            } finally {
                commit('SET_CONTENT_LOADING', false)
            }
        },

        // 作业相关actions
        async fetchAssignments ({ commit }, courseId) {
            commit('SET_ASSIGNMENTS_LOADING', true)
            commit('CLEAR_ERROR', 'assignments')

            try {
                const response = await getAction('/teaching/assignment/list', { courseId })
                if (response.success) {
                    commit('SET_ASSIGNMENTS', response.result || [])
                    commit('UPDATE_CACHE_TIME', 'assignments')
                }
                return response
            } catch (error) {
                commit('SET_ERROR', { key: 'assignments', error: error.message })
                throw error
            } finally {
                commit('SET_ASSIGNMENTS_LOADING', false)
            }
        },

        // 学习分析相关actions
        async fetchDashboardData ({ commit }, params = {}) {
            commit('SET_ANALYTICS_LOADING', true)
            commit('CLEAR_ERROR', 'analytics')

            try {
                const response = await getAction('/teaching/learningAnalytics/dashboard', params)
                if (response.success) {
                    commit('SET_DASHBOARD_DATA', response.result)
                    commit('UPDATE_CACHE_TIME', 'analytics')
                }
                return response
            } catch (error) {
                commit('SET_ERROR', { key: 'analytics', error: error.message })
                throw error
            } finally {
                commit('SET_ANALYTICS_LOADING', false)
            }
        },

        async fetchCourseStats ({ commit }, courseId) {
            try {
                const response = await getAction('/teaching/learningAnalytics/courseAnalytics', { courseId })
                if (response.success) {
                    commit('SET_COURSE_STATS', { courseId, stats: response.result })
                }
                return response
            } catch (error) {
                commit('SET_ERROR', { key: 'courseStats', error: error.message })
                throw error
            }
        },

        // 缓存管理
        checkCache ({ state }, key) {
            const lastUpdate = state.cache.lastUpdate[key]
            if (!lastUpdate) return false
            return (Date.now() - lastUpdate) < state.cache.ttl
        },

        // 清除特定缓存
        clearCache ({ commit }, key) {
            if (key) {
                commit('UPDATE_CACHE_TIME', key, 0)
            } else {
                // 清除所有缓存
                Object.keys(state.cache.lastUpdate).forEach(k => {
                    commit('UPDATE_CACHE_TIME', k, 0)
                })
            }
        }
    }

    // getters已移动到主getters.js以避免重复
}

export default teaching
