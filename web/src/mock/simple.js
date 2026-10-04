// 简化的Mock数据，用于快速修复系统问题
export const simpleMockData = {
    '/sys/permission/getUserPermissionByToken': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            menu: [
                {
                    id: '1',
                    name: 'analysis',
                    title: '首页',
                    key: 'dashboard',
                    icon: 'home',
                    path: '/dashboard/analysis',
                    component: 'dashboard/Analysis',
                    meta: {
                        title: '首页',
                        icon: 'home',
                        url: ''
                    },
                    children: []
                },
                {
                    id: '2',
                    name: 'programming',
                    title: '编程环境',
                    key: 'programming',
                    icon: 'code',
                    path: '/programming',
                    component: 'layouts/RouteView',
                    meta: {
                        title: '编程环境',
                        icon: 'code',
                        url: ''
                    },
                    children: [
                        {
                            id: '21',
                            name: 'scratch',
                            title: 'Scratch编程',
                            key: 'scratch',
                            path: '/programming/scratch',
                            component: 'programming/Scratch',
                            meta: {
                                title: 'Scratch编程',
                                url: ''
                            }
                        },
                        {
                            id: '22',
                            name: 'python',
                            title: 'Python编程',
                            key: 'python',
                            path: '/programming/python',
                            component: 'programming/Python',
                            meta: {
                                title: 'Python编程',
                                url: ''
                            }
                        }
                    ]
                },
                {
                    id: '3',
                    name: 'course',
                    title: '课程管理',
                    key: 'course',
                    icon: 'book',
                    path: '/course',
                    component: 'layouts/RouteView',
                    meta: {
                        title: '课程管理',
                        icon: 'book',
                        url: ''
                    },
                    children: [
                        {
                            id: '31',
                            name: 'course-list',
                            title: '课程列表',
                            key: 'course-list',
                            path: '/course/list',
                            component: 'test/CourseTest',
                            meta: {
                                title: '课程列表',
                                url: ''
                            }
                        },
                        {
                            id: '32',
                            name: 'course-unit',
                            title: '课程单元',
                            key: 'course-unit',
                            path: '/course/unit',
                            component: 'test/CourseTest',
                            meta: {
                                title: '课程单元',
                                url: ''
                            }
                        }
                    ]
                },
                {
                    id: '4',
                    name: 'student',
                    title: '学员管理',
                    key: 'student',
                    icon: 'team',
                    path: '/student',
                    component: 'layouts/RouteView',
                    meta: {
                        title: '学员管理',
                        icon: 'team',
                        url: ''
                    },
                    children: [
                        {
                            id: '41',
                            name: 'student-list',
                            title: '学员列表',
                            key: 'student-list',
                            path: '/student/list',
                            component: 'test/StudentTest',
                            meta: {
                                title: '学员列表',
                                url: ''
                            }
                        },
                        {
                            id: '42',
                            name: 'student-progress',
                            title: '学习进度',
                            key: 'student-progress',
                            path: '/student/progress',
                            component: 'test/StudentTest',
                            meta: {
                                title: '学习进度',
                                url: ''
                            }
                        }
                    ]
                },
                {
                    id: '5',
                    name: 'homework',
                    title: '作业管理',
                    key: 'homework',
                    icon: 'file-text',
                    path: '/homework',
                    component: 'layouts/RouteView',
                    meta: {
                        title: '作业管理',
                        icon: 'file-text',
                        url: ''
                    },
                    children: [
                        {
                            id: '51',
                            name: 'homework-list',
                            title: '作业列表',
                            key: 'homework-list',
                            path: '/homework/list',
                            component: 'test/HomeworkTest',
                            meta: {
                                title: '作业列表',
                                url: ''
                            }
                        },
                        {
                            id: '52',
                            name: 'homework-grade',
                            title: '作业评分',
                            key: 'homework-grade',
                            path: '/homework/grade',
                            component: 'test/HomeworkTest',
                            meta: {
                                title: '作业评分',
                                url: ''
                            }
                        }
                    ]
                }
            ],
            auth: [],
            allAuth: []
        }
    }
}
