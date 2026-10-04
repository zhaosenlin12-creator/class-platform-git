// 懒加载布局组件以优化首屏加载性能

const UserLayout = () => import('@/components/layouts/UserLayout')
const TabLayout = () => import('@/components/layouts/TabLayout')
const RouteView = () => import('@/components/layouts/RouteView')
const BlankLayout = () => import('@/components/layouts/BlankLayout')
const PageView = () => import('@/components/layouts/PageView')
const HomeLayout = () => import('@/views/home/layouts/HomeLayout')
const WorkLayout = () => import('@/views/home/layouts/WorkLayout')

/**
 * 走菜单，走权限控制
 * @type {[null,null]}
 */
export const asyncRouterMap = [
    {
        path: '/',
        name: 'dashboard',
        component: TabLayout,
        meta: { title: '管理后台' },
        redirect: '/dashboard/analysis',
        children: [
            {
                path: '/dashboard/analysis',
                name: 'analysis',
                component: () => import(/* webpackChunkName: "dashboard" */ '@/views/dashboard/Analysis'),
                meta: { title: '首页', icon: 'home', keepAlive: false }
            }
        ]
    }
]

// let sysConfig = store.getters.sysConfig

/**
 * 基础路由
 * @type { *[] }
 */
export const constantRouterMap = [
    // 门户首页路由 - 使用 /portal 前缀，避免与管理后台的 / 冲突
    {
        path: '/portal',
        component: HomeLayout,
        redirect: '/portal/home',
        children: [
            {
                path: 'home',
                name: 'portal-home',
                component: () => import(/* webpackChunkName: "home" */ '@/views/home/Home')
            },
            {
                path: 'index',
                name: 'portal-index',
                component: () => import(/* webpackChunkName: "home" */ '@/views/home/Index')
            },
            {
                path: 'workList',
                name: 'portal-workList',
                component: () => import(/* webpackChunkName: "home" */ '@/views/home/WorkList')
            },
            {
                path: 'courseList',
                name: 'portal-courseList',
                component: () => import(/* webpackChunkName: "home" */ '@/views/home/CourseList')
            },
            {
                path: 'newsList',
                name: 'portal-newsList',
                component: () => import(/* webpackChunkName: "home" */ '@/views/home/NewsList')
            },
            {
                path: 'news-detail',
                name: 'portal-newsDetail',
                component: () => import(/* webpackChunkName: "home" */ '@/views/home/NewsDetail')
            },
            {
                path: 'friend-detail',
                name: 'portal-friendDetail',
                component: () => import(/* webpackChunkName: "home" */ '@/views/home/FriendDetail')
            },
            {
                path: 'work-detail',
                name: 'portal-workDetail',
                component: () => import(/* webpackChunkName: "home" */ '@/views/home/WorkDetail')
            }
        ]
    },
    // 兼容旧的 /home 路径
    {
        path: '/home',
        redirect: '/portal/home'
    },
    // 根路径重定向到门户首页
    {
        path: '/',
        redirect: '/portal/home'
    },
    {
        path: '/user',
        component: UserLayout,
        redirect: '/home',
        hidden: true,
        children: [
            // 登录页面已删除，统一在首页登录
            // {
            //   path: 'login',
            //   name: 'login',
            //   component: () => import(/* webpackChunkName: "user" */ '@/views/user/Login')
            // },
            {
                path: 'register',
                name: 'register',
                component: () => import(/* webpackChunkName: "user" */ '@/views/user/Register')
            },
            {
                path: 'register-result',
                name: 'registerResult',
                component: () => import(/* webpackChunkName: "user" */ '@/views/user/RegisterResult')
            },
            {
                path: 'alteration',
                name: 'alteration',
                component: () => import(/* webpackChunkName: "user" */ '@/views/user/Alteration')
            }
        ]
    },
    {
        path: '/admin/course/units',
        name: 'course-units',
        component: () => import('@/views/course/CourseUnitManager'),
        meta: { title: '课节管理', keepAlive: false },
        hidden: true
    },
    {
        path: '/account',
        component: TabLayout,
        redirect: '/account/center',
        hidden: true,
        children: [
            {
                path: 'center',
                name: 'account-center',
                component: () => import('@/views/account/center/Index'),
                meta: { title: '个人中心', keepAlive: false }
            },
            {
                path: 'settings',
                name: 'account-settings',
                component: () => import('@/views/account/settings/Index'),
                redirect: '/account/settings/base',
                meta: { title: '账户设置', keepAlive: false },
                children: [
                    {
                        path: 'base',
                        name: 'account-settings-base',
                        component: () => import('@/views/account/settings/BaseSetting'),
                        meta: { title: '基本设置', keepAlive: false }
                    },
                    {
                        path: 'security',
                        name: 'account-settings-security',
                        component: () => import('@/views/account/settings/Security'),
                        meta: { title: '安全设置', keepAlive: false }
                    },
                    {
                        path: 'custom',
                        name: 'account-settings-custom',
                        component: () => import('@/views/account/settings/Custom'),
                        meta: { title: '个性化设置', keepAlive: false }
                    },
                    {
                        path: 'binding',
                        name: 'account-settings-binding',
                        component: () => import('@/views/account/settings/Binding'),
                        meta: { title: '账号绑定', keepAlive: false }
                    },
                    {
                        path: 'notification',
                        name: 'account-settings-notification',
                        component: () => import('@/views/account/settings/Notification'),
                        meta: { title: '消息通知', keepAlive: false }
                    }
                ]
            }
        ]
    },
    {
        path: '/admin',
        name: 'admin',
        component: TabLayout,
        meta: { title: '管理后台' },
        redirect: '/admin/dashboard',
        children: [
            {
                path: 'dashboard',
                name: 'admin-dashboard',
                component: () => import('@/views/dashboard/Analysis'),
                meta: { title: '管理首页', icon: 'home', keepAlive: false }
            },
            {
                path: 'course-content',
                name: 'admin-course-content',
                component: () => import('@/views/course/CourseContentManagement'),
                meta: { title: '课程内容管理', icon: 'folder-open', keepAlive: false }
            },
            {
                path: 'course',
                name: 'admin-course',
                component: () => import('@/views/teaching/CourseList'),
                meta: { title: '课程管理', icon: 'book', keepAlive: false }
            },
            {
                path: 'student',
                name: 'admin-student',
                component: () => import('@/views/management/StudentManagement'),
                meta: { title: '学员管理', icon: 'team', keepAlive: false }
            },
            {
                path: 'teacher',
                name: 'admin-teacher',
                component: () => import('@/views/management/TeacherManagement'),
                meta: { title: '教师管理', icon: 'user', keepAlive: false }
            },
            {
                path: 'homework-template',
                name: 'admin-homework-template',
                component: () => import('@/views/management/HomeworkTemplateManager'),
                meta: { title: '作业模板管理', icon: 'file-text', keepAlive: false }
            },
            {
                path: 'homework-assignment',
                name: 'admin-homework-assignment',
                component: () => import('@/views/management/HomeworkAssignment'),
                meta: { title: '作业分配', icon: 'deployment-unit', keepAlive: false }
            },
            {
                path: 'homework-submissions',
                name: 'admin-homework-submissions',
                component: () => import('@/views/management/HomeworkSubmissions'),
                meta: { title: '作业提交列表', hideInMenu: true }
            },
            {
                path: 'homework-statistics',
                name: 'admin-homework-statistics',
                component: () => import('@/views/management/HomeworkStatistics'),
                meta: { title: '作业统计', hideInMenu: true }
            },
            {
                path: 'resource',
                name: 'admin-resource',
                component: () => import('@/views/course/CourseContentManagement'),
                meta: { title: '资源库', icon: 'cloud-server', keepAlive: false }
            },
            {
                path: 'class-management',
                name: 'admin-class-management',
                component: () => import('@/views/management/ClassManagement'),
                meta: { title: '班级管理', icon: 'team', keepAlive: false }
            },
            {
                path: 'student-management',
                name: 'admin-student-management',
                component: () => import('@/views/management/StudentManagement'),
                meta: { title: '学员管理', icon: 'user', keepAlive: false }
            },
            {
                path: 'homework-manager',
                name: 'admin-homework-manager',
                component: () => import('@/views/management/HomeworkTemplateManager'),
                meta: { title: '作业模板管理', icon: 'file-text', keepAlive: false, hidden: true }
            },
            {
                path: 'classroom-manager',
                name: 'admin-classroom-manager',
                component: () => import('@/views/classroom/ClassroomManager'),
                meta: { title: '课堂管理', icon: 'video-camera', keepAlive: false }
            },
            {
                path: 'homework-grading/:homeworkId?',
                name: 'admin-homework-grading',
                component: () => import('@/views/homework/components/HomeworkGradingWorkspace'),
                meta: { title: '作业批改工作区', hideInMenu: true }
            },
            {
                path: 'course-content-admin',
                name: 'admin-course-resource',
                component: () => import('@/views/course/CourseContentManagement'),
                meta: { title: '课程资源管理', icon: 'folder-open', keepAlive: false }
            },
            {
                path: 'question-bank',
                name: 'admin-question-bank',
                component: () => import('@/views/exam/QuestionBank'),
                meta: { title: '题库管理', icon: 'database', keepAlive: false }
            },
            {
                path: 'exam-paper',
                name: 'admin-exam-paper',
                component: () => import('@/views/exam/ExamPaper'),
                meta: { title: '试卷管理', icon: 'file-text', keepAlive: false }
            },
            {
                path: 'exam-analysis/:paperId?',
                name: 'admin-exam-analysis',
                component: () => import('@/views/exam/ExamAnalysis'),
                meta: { title: '考试分析', hideInMenu: true }
            }
        ]
    },
    {
        path: '/teacher',
        name: 'teacher',
        component: TabLayout,
        meta: { title: '教师工作台' },
        redirect: '/teacher/dashboard',
        children: [
            {
                path: 'dashboard',
                name: 'teacher-dashboard',
                component: () => import('@/views/teacher/TeacherDashboard'),
                meta: { title: '教学首页', icon: 'home', keepAlive: false }
            },
            {
                path: 'course-management',
                name: 'teacher-course-management',
                component: () => import('@/views/teacher/TeacherCourseManagement'),
                meta: { title: '课程管理', icon: 'book', keepAlive: false }
            },
            {
                path: 'homework-review',
                name: 'teacher-homework-review',
                component: () => import('@/views/teacher/TeacherHomeworkReview'),
                meta: { title: '作业批改', icon: 'edit', keepAlive: false }
            },
            {
                path: 'student-management',
                name: 'teacher-student-management',
                component: () => import('@/views/teacher/TeacherStudentManagement'),
                meta: { title: '学生管理', icon: 'team', keepAlive: false }
            },
            {
                path: 'student-analytics',
                name: 'teacher-student-analytics',
                component: () => import('@/views/teacher/TeacherStudentAnalytics'),
                meta: { title: '学情分析', icon: 'bar-chart', keepAlive: false }
            },
            {
                path: 'exam-management',
                name: 'teacher-exam-management',
                component: () => import('@/views/teacher/TeacherExamManagement'),
                meta: { title: '考试管理', icon: 'file-text', keepAlive: false }
            },
            {
                path: 'resource-library',
                name: 'teacher-resource-library',
                component: () => import('@/views/teacher/TeacherResourceLibrary'),
                meta: { title: '教学资源', icon: 'cloud-server', keepAlive: false }
            },
            {
                path: 'course-content',
                name: 'teacher-course-content',
                component: () => import('@/views/course/CourseContentManagement'),
                meta: { title: '课程内容管理', icon: 'folder-open', keepAlive: false }
            },
            {
                path: 'classroom',
                name: 'teacher-classroom',
                component: () => import('@/views/classroom/ClassroomManager'),
                meta: { title: '课堂管理', icon: 'video-camera', keepAlive: false }
            },
            {
                path: 'teaching-room/:id',
                name: 'teacher-teaching-room',
                component: () => import('@/views/teacher/TeachingRoom'),
                meta: { title: '教学界面', hideInMenu: true }
            },
            {
                path: 'question-bank',
                name: 'teacher-question-bank',
                component: () => import('@/views/exam/QuestionBank'),
                meta: { title: '题库管理', icon: 'database', keepAlive: false }
            },
            {
                path: 'exam-paper',
                name: 'teacher-exam-paper',
                component: () => import('@/views/exam/ExamPaper'),
                meta: { title: '试卷管理', icon: 'file-text', keepAlive: false }
            },
            {
                path: 'exam-analysis/:paperId?',
                name: 'teacher-exam-analysis',
                component: () => import('@/views/exam/ExamAnalysis'),
                meta: { title: '考试分析', hideInMenu: true }
            }
        ]
    },
    {
        path: '/student',
        name: 'student',
        component: TabLayout,
        meta: { title: '学生学习平台' },
        redirect: '/student/home',
        children: [
            {
                path: 'home',
                name: 'student-home',
                component: () => import('@/views/student/Home'),
                meta: { title: '学习首页', icon: 'home', keepAlive: false }
            },
            {
                path: 'classrooms',
                name: 'student-classrooms',
                component: () => import('@/views/student/ClassroomList'),
                meta: { title: '我的课堂', icon: 'video-camera', keepAlive: false }
            },
            {
                path: 'homework',
                name: 'student-homework',
                component: () => import('@/views/student/Homework'),
                meta: { title: '我的作业', icon: 'file-text', keepAlive: false }
            },
            {
                path: 'programming',
                name: 'student-programming',
                component: () => import('@/views/student/Programming'),
                meta: { title: '编程环境', icon: 'code', keepAlive: false }
            },
            {
                path: 'programming-test/:testId?',
                name: 'student-programming-test',
                component: () => import('@/views/programming/Python'),
                meta: { title: '编程测试', hideInMenu: true }
            },
            {
                path: 'works',
                name: 'student-works',
                component: () => import('@/views/student/Works'),
                meta: { title: '作品资源库', icon: 'star', keepAlive: false }
            },
            {
                path: 'profile',
                name: 'student-profile',
                component: () => import('@/views/student/Profile'),
                meta: { title: '个人中心', icon: 'user', keepAlive: false }
            },
            {
                path: 'homework/:id/submit',
                name: 'homework-submit',
                component: () => import('@/views/student/HomeworkSubmit'),
                meta: { title: '提交作业', hideInMenu: true }
            },
            {
                path: 'homework/:id/view',
                name: 'homework-view',
                component: () => import('@/views/student/HomeworkView'),
                meta: { title: '查看作业', hideInMenu: true }
            },
            {
                path: 'exam/:examId',
                name: 'student-exam',
                component: () => import('@/views/exam/ExamTaking'),
                meta: { title: '在线考试', hideInMenu: true }
            },
            {
                path: 'exam-result/:recordId',
                name: 'student-exam-result',
                component: () => import('@/views/student/ExamResult'),
                meta: { title: '考试结果', hideInMenu: true }
            }
        ]
    },
    {
        path: '/classroom/online/:id',
        name: 'OnlineClassroom',
        component: () => import('@/views/classroom/OnlineClassroom'),
        hidden: true,
        meta: { title: '在线教室' }
    },
    {
        path: '/404',
        component: () => import(/* webpackChunkName: "fail" */ '@/views/exception/404')
    },
    {
        path: '*',
        redirect: '/404',
        hidden: true
    }
]
