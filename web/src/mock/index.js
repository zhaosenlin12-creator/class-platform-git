// 本地模拟API数据
import { additionalMockData } from './additional'
import { simpleMockData } from './simple'
import { courseData } from './courseData'
import { studentData } from './studentData'
import { homeworkData } from './homeworkData'
import { dataSyncOperations } from './dataRelations'
import { resourceAPI } from './resourceData'

export const mockResponses = {
    // 学生登录API
    '/student/login': {
        success: true,
        message: '登录成功',
        code: 200,
        result: {
            token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.student_token',
            userInfo: {
                id: 'student001',
                username: 'student01',
                realName: '张小明',
                realname: '张小明',
                avatar: '/avatars/student001.jpg',
                email: 'student01@example.com',
                phone: '13812345678',
                status: 1,
                delFlag: 0,
                workNo: 'S2024001',
                post: '学生',
                telephone: '',
                sex: 1,
                birthday: '2010-05-15',
                departId: 'dept001',
                departIds: 'dept001',
                departName: '一年级三班'
            },
            role: ['student']
        }
    },

    // 学生菜单API
    '/student/getStudentMenu': {
        success: true,
        message: '操作成功',
        code: 200,
        result: [
            {
                id: '1',
                title: '学习首页',
                key: 'student-home',
                icon: 'home',
                path: '/student/home',
                component: 'student/Home',
                meta: {
                    title: '学习首页',
                    url: '/student/home'
                },
                children: []
            },
            {
                id: '2',
                title: '我的课堂',
                key: 'student-classrooms',
                icon: 'video-camera',
                path: '/student/classrooms',
                component: 'student/ClassroomList',
                meta: {
                    title: '我的课堂',
                    url: '/student/classrooms'
                },
                children: []
            },
            {
                id: '3',
                title: '我的作业',
                key: 'student-homework',
                icon: 'file-text',
                path: '/student/homework',
                component: 'student/Homework',
                meta: {
                    title: '我的作业',
                    url: '/student/homework'
                },
                children: []
            },
            {
                id: '5',
                title: '编程环境',
                key: 'student-programming',
                icon: 'code',
                path: '/student/programming',
                component: 'student/Programming',
                meta: {
                    title: '编程环境',
                    url: '/student/programming'
                },
                children: [
                    {
                        id: '51',
                        title: 'Scratch编程',
                        key: 'student-scratch',
                        path: '/student/programming/scratch',
                        component: 'student/Scratch',
                        meta: {
                            title: 'Scratch编程',
                            url: '/student/programming/scratch'
                        }
                    },
                    {
                        id: '52',
                        title: 'Python编程',
                        key: 'student-python',
                        path: '/student/programming/python',
                        component: 'student/Python',
                        meta: {
                            title: 'Python编程',
                            url: '/student/programming/python'
                        }
                    }
                ]
            },
            {
                id: '6',
                title: '作品展示',
                key: 'student-works',
                icon: 'star',
                path: '/student/works',
                component: 'student/Works',
                meta: {
                    title: '作品展示',
                    url: '/student/works'
                },
                children: []
            },
            {
                id: '7',
                title: '个人中心',
                key: 'student-profile',
                icon: 'user',
                path: '/student/profile',
                component: 'student/Profile',
                meta: {
                    title: '个人中心',
                    url: '/student/profile'
                },
                children: []
            }
        ]
    },

    '/sys/config/getCurrentConfig': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            systemName: 'Teaching Open',
            logo: '/logo.png',
            indexPath: '/dashboard/analysis',
            version: '2.8.0'
        }
    },

    '/sys/menu/getAuthMenu': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            menu: [
                {
                    id: '1',
                    title: '首页',
                    key: 'dashboard',
                    icon: 'home',
                    path: '/dashboard/analysis',
                    component: 'dashboard/Analysis',
                    meta: {
                        title: '首页',
                        url: ''
                    },
                    children: []
                },
                {
                    id: '2',
                    title: '编程环境',
                    key: 'programming',
                    icon: 'code',
                    path: '/programming',
                    component: 'dashboard/Analysis',
                    meta: {
                        title: '编程环境',
                        url: ''
                    },
                    children: [
                        {
                            id: '21',
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
                }
            ],
            auth: [],
            allAuth: []
        }
    },

    '/teaching/menu/getUserMenu': {
        success: true,
        message: '操作成功',
        code: 200,
        result: [
            {
                id: '1',
                title: '首页',
                key: 'dashboard',
                icon: 'home',
                path: '/dashboard/analysis',
                component: 'layouts/RouteView',
                meta: {
                    title: '首页',
                    url: ''
                },
                children: []
            },
            {
                id: '2',
                title: '编程环境',
                key: 'programming',
                icon: 'code',
                path: '/programming',
                component: 'layouts/RouteView',
                meta: {
                    title: '编程环境',
                    url: ''
                },
                children: [
                    {
                        id: '21',
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
                title: '课程管理',
                key: 'course',
                icon: 'book',
                path: '/course',
                component: 'layouts/RouteView',
                meta: {
                    title: '课程管理',
                    url: ''
                },
                children: [
                    {
                        id: '31',
                        title: '课程列表',
                        key: 'course-list',
                        path: '/course/list',
                        component: 'teaching/TeachingCourseList',
                        meta: {
                            title: '课程列表',
                            url: ''
                        }
                    },
                    {
                        id: '32',
                        title: '课程单元',
                        key: 'course-unit',
                        path: '/course/unit',
                        component: 'teaching/TeachingCourseUnitList',
                        meta: {
                            title: '课程单元',
                            url: ''
                        }
                    },
                    {
                        id: '33',
                        title: '授权部门',
                        key: 'course-dept',
                        path: '/course/dept',
                        component: 'teaching/TeachingCourseDeptList',
                        meta: {
                            title: '授权部门',
                            url: ''
                        }
                    }
                ]
            },
            {
                id: '4',
                title: '学员管理',
                key: 'student',
                icon: 'team',
                path: '/student',
                component: 'layouts/RouteView',
                meta: {
                    title: '学员管理',
                    url: ''
                },
                children: [
                    {
                        id: '41',
                        title: '用户管理',
                        key: 'student-list',
                        path: '/student/list',
                        component: 'system/UserList',
                        meta: {
                            title: '用户管理',
                            url: ''
                        }
                    },
                    {
                        id: '42',
                        title: '部门管理',
                        key: 'dept-manage',
                        path: '/student/dept',
                        component: 'system/DepartList',
                        meta: {
                            title: '部门管理',
                            url: ''
                        }
                    },
                    {
                        id: '43',
                        title: '角色管理',
                        key: 'role-manage',
                        path: '/student/role',
                        component: 'system/RoleList',
                        meta: {
                            title: '角色管理',
                            url: ''
                        }
                    }
                ]
            },
            {
                id: '5',
                title: '作业管理',
                key: 'homework',
                icon: 'file-text',
                path: '/homework',
                component: 'layouts/RouteView',
                meta: {
                    title: '作业管理',
                    url: ''
                },
                children: [
                    {
                        id: '51',
                        title: '作品管理',
                        key: 'homework-list',
                        path: '/homework/list',
                        component: 'teaching/TeachingWorkList',
                        meta: {
                            title: '作品管理',
                            url: ''
                        }
                    },
                    {
                        id: '52',
                        title: '额外作业',
                        key: 'homework-additional',
                        path: '/homework/additional',
                        component: 'teaching/TeachingAdditionalWorkList',
                        meta: {
                            title: '额外作业',
                            url: ''
                        }
                    },
                    {
                        id: '53',
                        title: '素材管理',
                        key: 'homework-assets',
                        path: '/homework/assets',
                        component: 'teaching/TeachingScratchAssetsList',
                        meta: {
                            title: '素材管理',
                            url: ''
                        }
                    }
                ]
            },
            {
                id: '6',
                title: '资源库',
                key: 'resource',
                icon: 'cloud-server',
                path: '/resource',
                component: 'layouts/RouteView',
                meta: {
                    title: '资源库',
                    url: ''
                },
                children: [
                    {
                        id: '61',
                        title: '资源管理',
                        key: 'resource-manage',
                        path: '/resource/manage',
                        component: 'test/ResourceTest',
                        meta: {
                            title: '资源管理',
                            url: ''
                        }
                    },
                    {
                        id: '62',
                        title: '共享中心',
                        key: 'resource-share',
                        path: '/resource/share',
                        component: 'resource/ShareCenter',
                        meta: {
                            title: '共享中心',
                            url: ''
                        }
                    }
                ]
            },
            {
                id: '7',
                title: '统计分析',
                key: 'analytics',
                icon: 'bar-chart',
                path: '/analytics',
                component: 'layouts/RouteView',
                meta: {
                    title: '统计分析',
                    url: ''
                },
                children: [
                    {
                        id: '71',
                        title: '订单统计',
                        key: 'order-stats',
                        path: '/analytics/order',
                        component: 'teaching/TeachingOrderList',
                        meta: {
                            title: '订单统计',
                            url: ''
                        }
                    },
                    {
                        id: '72',
                        title: '新闻管理',
                        key: 'news-manage',
                        path: '/analytics/news',
                        component: 'teaching/TeachingNewsList',
                        meta: {
                            title: '新闻管理',
                            url: ''
                        }
                    },
                    {
                        id: '73',
                        title: '菜单管理',
                        key: 'menu-manage',
                        path: '/analytics/menu',
                        component: 'teaching/TeachingMenuList',
                        meta: {
                            title: '菜单管理',
                            url: ''
                        }
                    }
                ]
            },
            {
                id: '8',
                title: '系统管理',
                key: 'system',
                icon: 'setting',
                path: '/system',
                component: 'layouts/RouteView',
                meta: {
                    title: '系统管理',
                    url: ''
                },
                children: [
                    {
                        id: '81',
                        title: '权限管理',
                        key: 'permission-manage',
                        path: '/system/permission',
                        component: 'system/PermissionList',
                        meta: {
                            title: '权限管理',
                            url: ''
                        }
                    },
                    {
                        id: '82',
                        title: '系统配置',
                        key: 'system-config',
                        path: '/system/config',
                        component: 'system/SysConfig',
                        meta: {
                            title: '系统配置',
                            url: ''
                        }
                    },
                    {
                        id: '83',
                        title: '数据字典',
                        key: 'dict-manage',
                        path: '/system/dict',
                        component: 'system/DictList',
                        meta: {
                            title: '数据字典',
                            url: ''
                        }
                    }
                ]
            }
        ]
    },

    '/sys/user/info': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            id: '1',
            username: 'admin',
            realName: '管理员',
            avatar: '/logo.png',
            status: 1,
            telephone: '',
            email: '',
            roles: ['admin']
        }
    },

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
                    title: '课程管理',
                    key: 'course',
                    icon: 'book',
                    path: '/course',
                    component: 'dashboard/Analysis',
                    meta: {
                        title: '课程管理',
                        url: ''
                    },
                    children: [
                        {
                            id: '31',
                            title: '课程列表',
                            key: 'course-list',
                            path: '/course/list',
                            component: 'dashboard/Analysis',
                            meta: {
                                title: '课程列表',
                                url: ''
                            }
                        },
                        {
                            id: '32',
                            title: '创建课程',
                            key: 'course-create',
                            path: '/course/create',
                            component: 'dashboard/Analysis',
                            meta: {
                                title: '创建课程',
                                url: ''
                            }
                        },
                        {
                            id: '33',
                            title: '课程设置',
                            key: 'course-settings',
                            path: '/course/settings',
                            component: 'dashboard/Analysis',
                            meta: {
                                title: '课程设置',
                                url: ''
                            }
                        }
                    ]
                },
                {
                    id: '4',
                    title: '学员管理',
                    key: 'student',
                    icon: 'team',
                    path: '/student',
                    component: 'dashboard/Analysis',
                    meta: {
                        title: '学员管理',
                        url: ''
                    },
                    children: [
                        {
                            id: '41',
                            title: '学员列表',
                            key: 'student-list',
                            path: '/student/list',
                            component: 'dashboard/Analysis',
                            meta: {
                                title: '学员列表',
                                url: ''
                            }
                        },
                        {
                            id: '42',
                            title: '班级管理',
                            key: 'class-manage',
                            path: '/student/class',
                            component: 'dashboard/Analysis',
                            meta: {
                                title: '班级管理',
                                url: ''
                            }
                        },
                        {
                            id: '43',
                            title: '学习进度',
                            key: 'student-progress',
                            path: '/student/progress',
                            component: 'dashboard/Analysis',
                            meta: {
                                title: '学习进度',
                                url: ''
                            }
                        }
                    ]
                },
                {
                    id: '5',
                    title: '作业管理',
                    key: 'homework',
                    icon: 'file-text',
                    path: '/homework',
                    component: 'dashboard/Analysis',
                    meta: {
                        title: '作业管理',
                        url: ''
                    },
                    children: [
                        {
                            id: '51',
                            title: '作业列表',
                            key: 'homework-list',
                            path: '/homework/list',
                            component: 'dashboard/Analysis',
                            meta: {
                                title: '作业列表',
                                url: ''
                            }
                        },
                        {
                            id: '52',
                            title: '发布作业',
                            key: 'homework-create',
                            path: '/homework/create',
                            component: 'dashboard/Analysis',
                            meta: {
                                title: '发布作业',
                                url: ''
                            }
                        },
                        {
                            id: '53',
                            title: '作业评分',
                            key: 'homework-grade',
                            path: '/homework/grade',
                            component: 'dashboard/Analysis',
                            meta: {
                                title: '作业评分',
                                url: ''
                            }
                        }
                    ]
                },
                {
                    id: '6',
                    title: '统计分析',
                    key: 'analytics',
                    icon: 'bar-chart',
                    path: '/analytics',
                    component: 'dashboard/Analysis',
                    meta: {
                        title: '统计分析',
                        url: ''
                    },
                    children: [
                        {
                            id: '61',
                            title: '学习统计',
                            key: 'learning-stats',
                            path: '/analytics/learning',
                            component: 'dashboard/Analysis',
                            meta: {
                                title: '学习统计',
                                url: ''
                            }
                        },
                        {
                            id: '62',
                            title: '成绩分析',
                            key: 'grade-analysis',
                            path: '/analytics/grades',
                            component: 'dashboard/Analysis',
                            meta: {
                                title: '成绩分析',
                                url: ''
                            }
                        },
                        {
                            id: '63',
                            title: '活跃度分析',
                            key: 'activity-analysis',
                            path: '/analytics/activity',
                            component: 'dashboard/Analysis',
                            meta: {
                                title: '活跃度分析',
                                url: ''
                            }
                        }
                    ]
                },
                {
                    id: '7',
                    title: '系统管理',
                    key: 'system',
                    icon: 'setting',
                    path: '/system',
                    component: 'dashboard/Analysis',
                    meta: {
                        title: '系统管理',
                        url: ''
                    },
                    children: [
                        {
                            id: '71',
                            title: '用户管理',
                            key: 'user-manage',
                            path: '/system/user',
                            component: 'dashboard/Analysis',
                            meta: {
                                title: '用户管理',
                                url: ''
                            }
                        },
                        {
                            id: '72',
                            title: '权限设置',
                            key: 'permission-manage',
                            path: '/system/permission',
                            component: 'dashboard/Analysis',
                            meta: {
                                title: '权限设置',
                                url: ''
                            }
                        },
                        {
                            id: '73',
                            title: '系统设置',
                            key: 'system-settings',
                            path: '/system/settings',
                            component: 'dashboard/Analysis',
                            meta: {
                                title: '系统设置',
                                url: ''
                            }
                        }
                    ]
                }
            ],
            constRoutes: [
                {
                    path: '/',
                    name: 'dashboard',
                    component: 'layouts/TabLayout',
                    meta: { title: '管理后台' },
                    redirect: '/dashboard/analysis',
                    children: [
                        {
                            path: '/dashboard/analysis',
                            name: 'analysis',
                            component: 'dashboard/Analysis',
                            meta: { title: '首页', icon: 'home', keepAlive: false }
                        },
                        {
                            path: '/programming',
                            name: 'programming',
                            component: 'layouts/RouteView',
                            meta: { title: '编程环境', icon: 'code' },
                            children: [
                                {
                                    path: '/programming/scratch',
                                    name: 'scratch',
                                    component: 'programming/Scratch',
                                    meta: { title: 'Scratch编程' }
                                },
                                {
                                    path: '/programming/python',
                                    name: 'python',
                                    component: 'programming/Python',
                                    meta: { title: 'Python编程' }
                                }
                            ]
                        },
                        {
                            path: '/course',
                            name: 'course',
                            component: 'layouts/RouteView',
                            meta: { title: '课程管理', icon: 'book' },
                            children: [
                                {
                                    path: '/course/list',
                                    name: 'course-list',
                                    component: 'teaching/TeachingCourseList',
                                    meta: { title: '课程列表' }
                                },
                                {
                                    path: '/course/unit',
                                    name: 'course-unit',
                                    component: 'teaching/TeachingCourseUnitList',
                                    meta: { title: '课程单元' }
                                },
                                {
                                    path: '/course/dept',
                                    name: 'course-dept',
                                    component: 'teaching/TeachingCourseDeptList',
                                    meta: { title: '授权部门' }
                                }
                            ]
                        },
                        {
                            path: '/student',
                            name: 'student',
                            component: 'layouts/RouteView',
                            meta: { title: '学员管理', icon: 'team' },
                            children: [
                                {
                                    path: '/student/list',
                                    name: 'student-list',
                                    component: 'system/UserList',
                                    meta: { title: '用户管理' }
                                },
                                {
                                    path: '/student/dept',
                                    name: 'dept-manage',
                                    component: 'system/DepartList',
                                    meta: { title: '部门管理' }
                                },
                                {
                                    path: '/student/role',
                                    name: 'role-manage',
                                    component: 'system/RoleList',
                                    meta: { title: '角色管理' }
                                }
                            ]
                        },
                        {
                            path: '/homework',
                            name: 'homework',
                            component: 'layouts/RouteView',
                            meta: { title: '作业管理', icon: 'file-text' },
                            children: [
                                {
                                    path: '/homework/list',
                                    name: 'homework-list',
                                    component: 'teaching/TeachingWorkList',
                                    meta: { title: '作品管理' }
                                },
                                {
                                    path: '/homework/additional',
                                    name: 'homework-additional',
                                    component: 'teaching/TeachingAdditionalWorkList',
                                    meta: { title: '额外作业' }
                                },
                                {
                                    path: '/homework/assets',
                                    name: 'homework-assets',
                                    component: 'teaching/TeachingScratchAssetsList',
                                    meta: { title: '素材管理' }
                                }
                            ]
                        },
                        {
                            path: '/analytics',
                            name: 'analytics',
                            component: 'layouts/RouteView',
                            meta: { title: '统计分析', icon: 'bar-chart' },
                            children: [
                                {
                                    path: '/analytics/order',
                                    name: 'order-stats',
                                    component: 'teaching/TeachingOrderList',
                                    meta: { title: '订单统计' }
                                },
                                {
                                    path: '/analytics/news',
                                    name: 'news-manage',
                                    component: 'teaching/TeachingNewsList',
                                    meta: { title: '新闻管理' }
                                },
                                {
                                    path: '/analytics/menu',
                                    name: 'menu-manage',
                                    component: 'teaching/TeachingMenuList',
                                    meta: { title: '菜单管理' }
                                }
                            ]
                        },
                        {
                            path: '/system',
                            name: 'system',
                            component: 'layouts/RouteView',
                            meta: { title: '系统管理', icon: 'setting' },
                            children: [
                                {
                                    path: '/system/permission',
                                    name: 'permission-manage',
                                    component: 'system/PermissionList',
                                    meta: { title: '权限管理' }
                                },
                                {
                                    path: '/system/config',
                                    name: 'system-config',
                                    component: 'system/SysConfig',
                                    meta: { title: '系统配置' }
                                },
                                {
                                    path: '/system/dict',
                                    name: 'dict-manage',
                                    component: 'system/DictList',
                                    meta: { title: '数据字典' }
                                }
                            ]
                        }
                    ]
                }
            ],
            auth: [],
            allAuth: []
        }
    },

    '/sys/logout': {
        success: true,
        message: '退出成功',
        code: 200,
        result: {}
    },

    '/sys/login': {
        success: true,
        message: '登录成功',
        code: 200,
        result: {
            token: 'mock-token-123456',
            userInfo: {
                id: '1',
                username: 'admin',
                realName: '管理员',
                avatar: '/logo.png',
                status: 1,
                telephone: '',
                email: '',
                roles: ['admin']
            },
            role: ['admin']
        }
    },

    // 学生登录API
    '/student/login': {
        success: true,
        message: '学生登录成功',
        code: 200,
        result: {
            token: 'mock-student-token-789',
            userInfo: {
                id: 's001',
                username: 'student001',
                realName: '张小明',
                avatar: '/default-student.png',
                status: 1,
                telephone: '13800138001',
                email: 'student001@example.com',
                classId: 'class001',
                className: '计算机1班',
                studentId: '2024001',
                roles: ['student']
            },
            role: ['student']
        }
    },

    // 学生注册API
    '/student/register': {
        success: true,
        message: '学生注册成功',
        code: 200,
        result: {
            id: Date.now().toString(),
            username: '',
            message: '学生账号创建成功，请使用用户名和密码登录'
        }
    },

    // 批量创建学生账号API
    '/student/batchCreate': {
        success: true,
        message: '批量创建学生账号成功',
        code: 200,
        result: {
            successCount: 0,
            failCount: 0,
            accounts: []
        }
    },

    '/sys/user/checkOnlyUser': {
        success: true,
        message: '校验通过',
        code: 200,
        result: true
    },

    // 学生用户名检查API
    '/student/checkUsername': {
        success: true,
        message: '用户名可用',
        code: 200,
        result: true
    },

    // 学生班级列表API
    '/student/classList': {
        success: true,
        message: '操作成功',
        code: 200,
        result: [
            {
                id: 'class001',
                className: '计算机1班',
                departName: '计算机学院',
                teacherName: '王老师',
                courseName: '计算机基础',
                studentCount: 45,
                maxStudents: 50,
                currentStudents: 45,
                status: '1',
                completionRate: 75,
                avgScore: 85,
                schedule: [
                    { day: '周一', time: '14:00-16:00' },
                    { day: '周三', time: '14:00-16:00' }
                ],
                createTime: '2024-01-01'
            },
            {
                id: 'class002',
                className: '计算机2班',
                departName: '计算机学院',
                teacherName: '李老师',
                courseName: 'Python编程',
                studentCount: 38,
                maxStudents: 50,
                currentStudents: 38,
                status: '1',
                completionRate: 68,
                avgScore: 78,
                schedule: [
                    { day: '周二', time: '10:00-12:00' },
                    { day: '周四', time: '10:00-12:00' }
                ],
                createTime: '2024-01-01'
            },
            {
                id: 'class003',
                className: '软件1班',
                departName: '软件学院',
                teacherName: '张老师',
                courseName: 'Web前端开发',
                studentCount: 42,
                maxStudents: 50,
                currentStudents: 42,
                status: '1',
                completionRate: 82,
                avgScore: 88,
                schedule: [
                    { day: '周五', time: '14:00-17:00' }
                ],
                createTime: '2024-01-01'
            }
        ]
    },

    '/student/class/list': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            records: [
                {
                    id: 'class001',
                    className: '计算机1班',
                    departName: '计算机学院',
                    teacherName: '王老师',
                    courseName: '计算机基础',
                    studentCount: 45,
                    maxStudents: 50,
                    currentStudents: 45,
                    status: '1',
                    completionRate: 75,
                    avgScore: 85,
                    schedule: [
                        { day: '周一', time: '14:00-16:00' },
                        { day: '周三', time: '14:00-16:00' }
                    ],
                    createTime: '2024-01-01'
                },
                {
                    id: 'class002',
                    className: '计算机2班',
                    departName: '计算机学院',
                    teacherName: '李老师',
                    courseName: 'Python编程',
                    studentCount: 38,
                    maxStudents: 50,
                    currentStudents: 38,
                    status: '1',
                    completionRate: 68,
                    avgScore: 78,
                    schedule: [
                        { day: '周二', time: '10:00-12:00' },
                        { day: '周四', time: '10:00-12:00' }
                    ],
                    createTime: '2024-01-01'
                },
                {
                    id: 'class003',
                    className: '软件1班',
                    departName: '软件学院',
                    teacherName: '张老师',
                    courseName: 'Web前端开发',
                    studentCount: 42,
                    maxStudents: 50,
                    currentStudents: 42,
                    status: '1',
                    completionRate: 82,
                    avgScore: 88,
                    schedule: [
                        { day: '周五', time: '14:00-17:00' }
                    ],
                    createTime: '2024-01-01'
                }
            ],
            total: 3,
            size: 10,
            current: 1
        }
    },

    '/student/progress/list': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            records: [
                {
                    studentId: 'student001',
                    studentName: '张小明',
                    courseName: '计算机基础',
                    className: '计算机1班',
                    completionRate: 75,
                    isLagging: false,
                    status: 'learning',
                    lastStudyTime: '2024-01-28 14:30',
                    avgScore: 85
                },
                {
                    studentId: 'student002',
                    studentName: '李小红',
                    courseName: 'Python编程',
                    className: '计算机2班',
                    completionRate: 60,
                    isLagging: true,
                    status: 'learning',
                    lastStudyTime: '2024-01-26 10:15',
                    avgScore: 78
                },
                {
                    studentId: 'student003',
                    studentName: '王小强',
                    courseName: 'Web前端开发',
                    className: '软件1班',
                    completionRate: 90,
                    isLagging: false,
                    status: 'learning',
                    lastStudyTime: '2024-01-29 16:45',
                    avgScore: 92
                }
            ],
            total: 3
        }
    },

    '/sys/sms': {
        success: true,
        message: '验证码发送成功',
        code: 200,
        result: {}
    },

    '/teaching/teachingWork/leaderboard': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            records: [
                {
                    id: '1',
                    title: 'Scratch动画制作',
                    description: '制作一个简单的动画作品',
                    coverFileKey_url: '/logo.png',
                    authorName: '张三',
                    star: 15,
                    createTime: '2024-01-15',
                    workStatus: 4
                },
                {
                    id: '2',
                    title: 'Python计算器',
                    description: '使用Python制作计算器程序',
                    coverFileKey_url: '/logo.png',
                    authorName: '李四',
                    star: 12,
                    createTime: '2024-01-14',
                    workStatus: 4
                },
                {
                    id: '3',
                    title: '小游戏开发',
                    description: '制作一个简单的小游戏',
                    coverFileKey_url: '/logo.png',
                    authorName: '王五',
                    star: 8,
                    createTime: '2024-01-13',
                    workStatus: 4
                },
                {
                    id: '4',
                    title: '数学计算程序',
                    description: '编写数学计算相关的程序',
                    coverFileKey_url: '/logo.png',
                    authorName: '赵六',
                    star: 10,
                    createTime: '2024-01-12',
                    workStatus: 4
                }
            ],
            total: 4,
            size: 10,
            current: 1
        }
    },

    // 课程管理相关API
    '/teaching/teachingCourse/list': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            records: [
                {
                    id: '1',
                    courseName: 'Scratch入门编程',
                    courseType: '1',
                    courseStatus: '1',
                    departName: '计算机学院',
                    teacherName: '王老师',
                    studentCount: 45,
                    createTime: '2024-01-10'
                },
                {
                    id: '2',
                    courseName: 'Python基础教程',
                    courseType: '2',
                    courseStatus: '1',
                    departName: '计算机学院',
                    teacherName: '李老师',
                    studentCount: 38,
                    createTime: '2024-01-08'
                },
                {
                    id: '3',
                    courseName: 'Web开发入门',
                    courseType: '3',
                    courseStatus: '2',
                    departName: '软件学院',
                    teacherName: '张老师',
                    studentCount: 52,
                    createTime: '2024-01-05'
                }
            ],
            total: 3,
            size: 10,
            current: 1
        }
    },

    '/teaching/teachingCourseUnit/list': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            records: [
                {
                    id: '1',
                    unitName: '第一章：基础语法',
                    courseName: 'Scratch入门编程',
                    orderNum: 1,
                    unitType: '1',
                    status: '1',
                    createTime: '2024-01-10'
                },
                {
                    id: '2',
                    unitName: '第二章：循环结构',
                    courseName: 'Scratch入门编程',
                    orderNum: 2,
                    unitType: '1',
                    status: '1',
                    createTime: '2024-01-12'
                },
                {
                    id: '3',
                    unitName: '第三章：条件判断',
                    courseName: 'Python基础教程',
                    orderNum: 3,
                    unitType: '2',
                    status: '1',
                    createTime: '2024-01-15'
                }
            ],
            total: 3,
            size: 10,
            current: 1
        }
    },

    '/system/user/list': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            records: [
                {
                    id: '1',
                    username: 'student001',
                    realname: '张小明',
                    phone: '13800138001',
                    email: 'student001@example.com',
                    status: 1,
                    departName: '计算机学院',
                    createTime: '2024-01-01'
                },
                {
                    id: '2',
                    username: 'student002',
                    realname: '李小红',
                    phone: '13800138002',
                    email: 'student002@example.com',
                    status: 1,
                    departName: '计算机学院',
                    createTime: '2024-01-02'
                },
                {
                    id: '3',
                    username: 'teacher001',
                    realname: '王老师',
                    phone: '13800138003',
                    email: 'teacher001@example.com',
                    status: 1,
                    departName: '计算机学院',
                    createTime: '2023-12-15'
                }
            ],
            total: 3,
            size: 10,
            current: 1
        }
    },

    '/system/sysDepart/list': {
        success: true,
        message: '操作成功',
        code: 200,
        result: [
            {
                id: '1',
                departName: '计算机学院',
                departNameEn: 'Computer Science',
                departOrder: 1,
                description: '计算机科学与技术学院',
                orgCategory: '1',
                orgType: '1',
                status: '1',
                createTime: '2023-01-01'
            },
            {
                id: '2',
                departName: '软件学院',
                departNameEn: 'Software Engineering',
                departOrder: 2,
                description: '软件工程学院',
                orgCategory: '1',
                orgType: '1',
                status: '1',
                createTime: '2023-01-01'
            }
        ]
    },

    '/system/role/list': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            records: [
                {
                    id: '1',
                    roleCode: 'admin',
                    roleName: '管理员',
                    description: '系统管理员',
                    createTime: '2023-01-01'
                },
                {
                    id: '2',
                    roleCode: 'teacher',
                    roleName: '教师',
                    description: '任课教师',
                    createTime: '2023-01-01'
                },
                {
                    id: '3',
                    roleCode: 'student',
                    roleName: '学生',
                    description: '在校学生',
                    createTime: '2023-01-01'
                }
            ],
            total: 3,
            size: 10,
            current: 1
        }
    },

    '/teaching/teachingAdditionalWork/list': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            records: [
                {
                    id: '1',
                    workName: '额外练习1：循环应用',
                    courseName: 'Scratch入门编程',
                    workType: '1',
                    deadline: '2024-02-01',
                    submitCount: 28,
                    totalCount: 45,
                    status: '1',
                    createTime: '2024-01-20'
                },
                {
                    id: '2',
                    workName: '额外练习2：函数设计',
                    courseName: 'Python基础教程',
                    workType: '2',
                    deadline: '2024-02-05',
                    submitCount: 15,
                    totalCount: 38,
                    status: '1',
                    createTime: '2024-01-22'
                }
            ],
            total: 2,
            size: 10,
            current: 1
        }
    },

    // 学生菜单API
    '/student/getStudentMenu': {
        success: true,
        message: '操作成功',
        code: 200,
        result: [
            {
                id: '1',
                title: '学习中心',
                key: 'learning',
                icon: 'book',
                path: '/learning',
                component: 'layouts/RouteView',
                meta: {
                    title: '学习中心',
                    url: ''
                },
                children: [
                    {
                        id: '11',
                        title: '我的课程',
                        key: 'my-courses',
                        path: '/learning/courses',
                        component: 'student/MyCourses',
                        meta: {
                            title: '我的课程',
                            url: ''
                        }
                    },
                    {
                        id: '12',
                        title: '学习进度',
                        key: 'learning-progress',
                        path: '/learning/progress',
                        component: 'student/LearningProgress',
                        meta: {
                            title: '学习进度',
                            url: ''
                        }
                    }
                ]
            },
            {
                id: '2',
                title: '编程环境',
                key: 'programming',
                icon: 'code',
                path: '/programming',
                component: 'layouts/RouteView',
                meta: {
                    title: '编程环境',
                    url: ''
                },
                children: [
                    {
                        id: '21',
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
                title: '作业中心',
                key: 'homework',
                icon: 'file-text',
                path: '/homework',
                component: 'layouts/RouteView',
                meta: {
                    title: '作业中心',
                    url: ''
                },
                children: [
                    {
                        id: '31',
                        title: '待完成作业',
                        key: 'pending-homework',
                        path: '/homework/pending',
                        component: 'student/PendingHomework',
                        meta: {
                            title: '待完成作业',
                            url: ''
                        }
                    },
                    {
                        id: '32',
                        title: '已提交作业',
                        key: 'submitted-homework',
                        path: '/homework/submitted',
                        component: 'student/SubmittedHomework',
                        meta: {
                            title: '已提交作业',
                            url: ''
                        }
                    },
                    {
                        id: '33',
                        title: '作业成绩',
                        key: 'homework-grades',
                        path: '/homework/grades',
                        component: 'student/HomeworkGrades',
                        meta: {
                            title: '作业成绩',
                            url: ''
                        }
                    }
                ]
            },
            {
                id: '4',
                title: '个人中心',
                key: 'profile',
                icon: 'user',
                path: '/profile',
                component: 'layouts/RouteView',
                meta: {
                    title: '个人中心',
                    url: ''
                },
                children: [
                    {
                        id: '41',
                        title: '个人信息',
                        key: 'profile-info',
                        path: '/profile/info',
                        component: 'student/ProfileInfo',
                        meta: {
                            title: '个人信息',
                            url: ''
                        }
                    },
                    {
                        id: '42',
                        title: '修改密码',
                        key: 'change-password',
                        path: '/profile/password',
                        component: 'student/ChangePassword',
                        meta: {
                            title: '修改密码',
                            url: ''
                        }
                    }
                ]
            }
        ]
    },

    // 数据关联查询API
    '/relation/getStudentsByCourse': {
        success: true,
        message: '操作成功',
        code: 200,
        result: [
            {
                id: 'rel001',
                courseId: '1',
                studentId: 's001',
                studentName: '张小明',
                enrollTime: '2024-01-15',
                progress: 75,
                status: 'active',
                lastAccessTime: '2024-01-20 14:30:00'
            },
            {
                id: 'rel002',
                courseId: '1',
                studentId: 's002',
                studentName: '李小红',
                enrollTime: '2024-01-15',
                progress: 60,
                status: 'active',
                lastAccessTime: '2024-01-19 16:20:00'
            }
        ]
    },

    '/relation/getCoursesByStudent': {
        success: true,
        message: '操作成功',
        code: 200,
        result: [
            {
                id: 'rel001',
                courseId: '1',
                courseName: 'Scratch入门编程',
                studentId: 's001',
                enrollTime: '2024-01-15',
                progress: 75,
                status: 'active'
            },
            {
                id: 'rel003',
                courseId: '2',
                courseName: 'Python基础教程',
                studentId: 's001',
                enrollTime: '2024-01-20',
                progress: 30,
                status: 'active'
            }
        ]
    },

    '/relation/getHomeworkByCourse': {
        success: true,
        message: '操作成功',
        code: 200,
        result: [
            {
                id: 'hcrel001',
                homeworkId: 'hw001',
                homeworkTitle: 'Scratch动画制作',
                courseId: '1',
                courseName: 'Scratch入门编程',
                totalStudents: 45,
                submittedCount: 32,
                gradedCount: 28,
                dueDate: '2024-02-15',
                status: 'active'
            }
        ]
    },

    '/relation/getCoursesByClass': {
        success: true,
        message: '操作成功',
        code: 200,
        result: [
            {
                id: 'ccrel001',
                courseId: '1',
                courseName: 'Scratch入门编程',
                classId: 'class001',
                className: '计算机1班',
                assignedTime: '2024-01-10',
                deadline: '2024-03-10',
                status: 'active'
            },
            {
                id: 'ccrel002',
                courseId: '2',
                courseName: 'Python基础教程',
                classId: 'class001',
                className: '计算机1班',
                assignedTime: '2024-01-15',
                deadline: '2024-04-15',
                status: 'active'
            }
        ]
    },

    '/relation/getStudentSubmissions': {
        success: true,
        message: '操作成功',
        code: 200,
        result: [
            {
                id: 'sub001',
                homeworkId: 'hw001',
                homeworkTitle: 'Scratch动画制作',
                studentId: 's001',
                courseId: '1',
                submissionTime: '2024-02-10 15:30:00',
                status: 'graded',
                score: 85,
                feedback: '作品很有创意，动画效果流畅。'
            }
        ]
    },

    // 课程编辑和上传API
    '/teaching/teachingCourse/update': {
        success: true,
        message: '课程更新成功',
        code: 200,
        result: {
            id: Date.now().toString(),
            updateTime: new Date().toISOString()
        }
    },

    '/teaching/teachingCourse/upload': {
        success: true,
        message: '文件上传成功',
        code: 200,
        result: {
            fileId: Date.now().toString(),
            fileName: '',
            fileUrl: '/uploads/courses/' + Date.now() + '.file',
            fileSize: 0,
            uploadTime: new Date().toISOString()
        }
    },

    '/teaching/teachingCourse/create': {
        success: true,
        message: '课程创建成功',
        code: 200,
        result: {
            id: Date.now().toString(),
            courseName: '',
            createTime: new Date().toISOString(),
            status: 'draft'
        }
    },

    '/teaching/teachingCourse/publish': {
        success: true,
        message: '课程发布成功',
        code: 200,
        result: {
            publishTime: new Date().toISOString(),
            status: 'published'
        }
    },

    // 资源库管理API
    '/resource/list': (params) => resourceAPI['/resource/list'](params),
    '/resource/folders': () => resourceAPI['/resource/folders'](),
    '/resource/stats': () => resourceAPI['/resource/stats'](),
    '/resource/upload': (params) => resourceAPI['/resource/upload'](params),
    '/resource/createFolder': (params) => resourceAPI['/resource/createFolder'](params),
    '/resource/delete': (params) => resourceAPI['/resource/delete'](params),
    '/resource/download': (params) => resourceAPI['/resource/download'](params),
    '/resource/share': (params) => resourceAPI['/resource/share'](params),
    '/resource/shares': () => resourceAPI['/resource/shares'](),

    // 学生作业API
    '/student/homework/list': {
        success: true,
        message: '获取作业列表成功',
        code: 200,
        result: {
            records: [
                {
                    id: '1',
                    homeworkTitle: '制作小猫追球游戏',
                    courseName: 'Scratch入门编程',
                    deadline: '2024-01-25',
                    description: '使用Scratch制作一个小猫追球的互动游戏',
                    requirements: '<p>1. 创建一个小猫角色和一个球角色</p><p>2. 实现小猫跟随鼠标移动</p><p>3. 球在舞台上随机移动</p><p>4. 小猫碰到球时得分</p><p>5. 添加背景音乐和音效</p>',
                    type: 'Scratch项目',
                    totalScore: 100,
                    status: 'pending',
                    resources: [
                        { id: '1', name: 'Scratch入门教程', url: '#' },
                        { id: '2', name: '游戏制作示例', url: '#' }
                    ]
                },
                {
                    id: '2',
                    homeworkTitle: 'Python变量练习',
                    courseName: 'Python基础教程',
                    deadline: '2024-01-27',
                    description: '完成Python变量定义和使用的练习题',
                    requirements: '<p>1. 定义不同类型的变量（字符串、整数、浮点数）</p><p>2. 实现变量的算术运算</p><p>3. 使用input()函数获取用户输入</p><p>4. 输出格式化的结果</p>',
                    type: 'Python代码',
                    totalScore: 100,
                    status: 'pending',
                    resources: [
                        { id: '1', name: 'Python变量教程', url: '#' }
                    ]
                }
            ],
            total: 2,
            current: 1,
            size: 10
        }
    },

    '/student/homework/submitted': {
        success: true,
        message: '获取已提交作业成功',
        code: 200,
        result: {
            records: [
                {
                    id: '6',
                    homeworkTitle: '贪吃蛇游戏',
                    courseName: 'Python进阶编程',
                    submitTime: '2024-01-22 18:30',
                    description: '使用pygame库制作的贪吃蛇游戏，包含计分和游戏结束功能。',
                    fileName: 'snake_game.py',
                    status: 'submitted',
                    files: [
                        { id: '3', name: 'snake_game.py', url: '#' },
                        { id: '4', name: 'game_sounds.zip', url: '#' }
                    ]
                }
            ],
            total: 1,
            current: 1,
            size: 10
        }
    },

    '/student/homework/completed': {
        success: true,
        message: '获取已完成作业成功',
        code: 200,
        result: {
            records: [
                {
                    id: '4',
                    homeworkTitle: '制作自我介绍动画',
                    courseName: 'Scratch入门编程',
                    submitTime: '2024-01-20 15:30',
                    gradeTime: '2024-01-21 10:15',
                    score: 95,
                    feedback: '作品很棒！动画流畅，创意丰富。建议可以增加更多的互动元素。',
                    description: '我制作了一个介绍自己的动画，包含了我的爱好和特长。',
                    url: 'https://scratch.mit.edu/projects/123456',
                    status: 'completed',
                    files: [
                        { id: '1', name: '自我介绍动画.sb3', url: '#' }
                    ],
                    gradingCriteria: [
                        { id: '1', item: '创意性', score: 25 },
                        { id: '2', item: '技术实现', score: 25 },
                        { id: '3', item: '界面设计', score: 25 },
                        { id: '4', item: '完整性', score: 25 }
                    ]
                },
                {
                    id: '5',
                    homeworkTitle: '简单计算器',
                    courseName: 'Python基础教程',
                    submitTime: '2024-01-18 20:45',
                    gradeTime: '2024-01-19 14:20',
                    score: 88,
                    feedback: '代码逻辑正确，但可以增加异常处理。界面可以更加美观。',
                    description: '实现了加减乘除四种基本运算功能。',
                    status: 'completed',
                    files: [
                        { id: '2', name: 'calculator.py', url: '#' }
                    ],
                    gradingCriteria: [
                        { id: '1', item: '功能完整性', score: 30 },
                        { id: '2', item: '代码规范', score: 25 },
                        { id: '3', item: '异常处理', score: 20 },
                        { id: '4', item: '用户体验', score: 25 }
                    ]
                }
            ],
            total: 2,
            current: 1,
            size: 10
        }
    },

    '/student/homework/submit': {
        success: true,
        message: '作业提交成功',
        code: 200,
        result: {
            submissionId: Date.now().toString(),
            submitTime: new Date().toLocaleString()
        }
    },

    '/student/homework/detail': {
        success: true,
        message: '获取作业详情成功',
        code: 200,
        result: {
            id: '1',
            homeworkTitle: '制作小猫追球游戏',
            courseName: 'Scratch入门编程',
            deadline: '2024-01-25',
            description: '使用Scratch制作一个小猫追球的互动游戏',
            requirements: '<p>1. 创建一个小猫角色和一个球角色</p><p>2. 实现小猫跟随鼠标移动</p><p>3. 球在舞台上随机移动</p><p>4. 小猫碰到球时得分</p><p>5. 添加背景音乐和音效</p>',
            type: 'Scratch项目',
            totalScore: 100,
            resources: [
                { id: '1', name: 'Scratch入门教程', url: '#' },
                { id: '2', name: '游戏制作示例', url: '#' }
            ]
        }
    },

    // 教师作业管理API
    '/teacher/homework/list': {
        success: true,
        message: '获取作业列表成功',
        code: 200,
        result: {
            records: [
                {
                    id: '1',
                    homeworkTitle: '制作小猫追球游戏',
                    courseName: 'Scratch入门编程',
                    courseId: 'course001',
                    deadline: '2024-01-25',
                    createTime: '2024-01-15',
                    totalScore: 100,
                    submitCount: 15,
                    gradeCount: 8,
                    status: 'published'
                },
                {
                    id: '2',
                    homeworkTitle: 'Python变量练习',
                    courseName: 'Python基础教程',
                    courseId: 'course002',
                    deadline: '2024-01-27',
                    createTime: '2024-01-18',
                    totalScore: 100,
                    submitCount: 12,
                    gradeCount: 12,
                    status: 'published'
                }
            ],
            total: 2,
            current: 1,
            size: 10
        }
    },

    '/teacher/homework/create': {
        success: true,
        message: '作业创建成功',
        code: 200,
        result: {
            id: Date.now().toString()
        }
    },

    '/teacher/homework/update': {
        success: true,
        message: '作业更新成功',
        code: 200,
        result: true
    },

    '/teacher/homework/delete': {
        success: true,
        message: '作业删除成功',
        code: 200,
        result: true
    },

    '/teacher/homework/submissions': {
        success: true,
        message: '获取作业提交列表成功',
        code: 200,
        result: {
            records: [
                {
                    id: 'sub001',
                    studentId: 'student001',
                    studentName: '张小明',
                    homeworkId: '1',
                    homeworkTitle: '制作小猫追球游戏',
                    submitTime: '2024-01-22 18:30',
                    description: '使用Scratch制作的小猫追球游戏，包含得分系统。',
                    files: [
                        { id: '1', name: '小猫追球游戏.sb3', url: '#' }
                    ],
                    url: 'https://scratch.mit.edu/projects/789012',
                    score: null,
                    feedback: '',
                    status: 'submitted'
                },
                {
                    id: 'sub002',
                    studentId: 'student002',
                    studentName: '李小红',
                    homeworkId: '1',
                    homeworkTitle: '制作小猫追球游戏',
                    submitTime: '2024-01-21 15:20',
                    description: '制作了一个小猫追球的游戏，添加了音效。',
                    files: [
                        { id: '2', name: '追球游戏.sb3', url: '#' }
                    ],
                    score: 88,
                    feedback: '游戏制作得很好，但可以增加更多互动元素。',
                    gradeTime: '2024-01-23 10:15',
                    status: 'graded'
                }
            ],
            total: 2,
            current: 1,
            size: 10
        }
    },

    '/teacher/homework/grade': {
        success: true,
        message: '作业批改成功',
        code: 200,
        result: true
    },

    '/teacher/homework/stats': {
        success: true,
        message: '获取作业统计成功',
        code: 200,
        result: {
            totalHomework: 25,
            pendingGrade: 8,
            totalSubmissions: 156,
            averageScore: 85.5,
            gradeDistribution: [
                { range: '90-100', count: 45, percentage: 28.8 },
                { range: '80-89', count: 52, percentage: 33.3 },
                { range: '70-79', count: 38, percentage: 24.4 },
                { range: '60-69', count: 15, percentage: 9.6 },
                { range: '0-59', count: 6, percentage: 3.8 }
            ]
        }
    },

    // 学员管理API
    '/student/list': {
        success: true,
        message: '获取学员列表成功',
        code: 200,
        result: {
            records: [
                {
                    id: 'student001',
                    realname: '张小明',
                    realName: '张小明',
                    name: '张小明',
                    studentNumber: 'S2024001',
                    workNo: 'S2024001',
                    age: 12,
                    sex: '1',
                    gender: '1',
                    classId: 'class001',
                    departId: 'class001',
                    className: '编程入门班A',
                    departName: '编程入门班A',
                    level: 2,
                    status: 1,
                    avatar: '/avatars/student001.jpg',
                    createTime: '2024-01-15',
                    lastLoginTime: '2024-01-23 09:30:00',
                    enrollTime: '2024-01-10'
                },
                {
                    id: 'student002',
                    realname: '李小红',
                    realName: '李小红',
                    name: '李小红',
                    studentNumber: 'S2024002',
                    workNo: 'S2024002',
                    age: 13,
                    sex: '2',
                    gender: '2',
                    classId: 'class002',
                    departId: 'class002',
                    className: 'Python基础班',
                    departName: 'Python基础班',
                    level: 3,
                    status: 1,
                    avatar: '/avatars/student002.jpg',
                    createTime: '2024-01-12',
                    lastLoginTime: '2024-01-22 15:20:00',
                    enrollTime: '2024-01-08'
                }
            ],
            total: 2,
            current: 1,
            size: 10
        }
    },

    '/student/add': {
        success: true,
        message: '学员添加成功',
        code: 200,
        result: {
            id: Date.now().toString()
        }
    },

    '/student/update': {
        success: true,
        message: '学员信息更新成功',
        code: 200,
        result: true
    },

    '/student/delete': {
        success: true,
        message: '学员删除成功',
        code: 200,
        result: true
    },

    '/student/checkUsername': {
        success: true,
        message: '用户名可用',
        code: 200,
        result: true
    },

    // 班级管理API
    '/student/class/list': {
        success: true,
        message: '获取班级列表成功',
        code: 200,
        result: {
            records: [
                {
                    id: 'class001',
                    className: '编程入门班A',
                    name: '编程入门班A',
                    courseName: 'Scratch编程入门',
                    course: 'Scratch编程入门',
                    teacherName: '张老师',
                    teacher: '张老师',
                    currentStudents: 15,
                    studentCount: 15,
                    maxStudents: 30,
                    status: '1',
                    completionRate: 78,
                    avgScore: 85,
                    createTime: '2024-01-10'
                },
                {
                    id: 'class002',
                    className: 'Python基础班',
                    name: 'Python基础班',
                    courseName: 'Python编程基础',
                    course: 'Python编程基础',
                    teacherName: '李老师',
                    teacher: '李老师',
                    currentStudents: 12,
                    studentCount: 12,
                    maxStudents: 25,
                    status: '1',
                    completionRate: 82,
                    avgScore: 88,
                    createTime: '2024-01-05'
                }
            ],
            total: 2,
            current: 1,
            size: 10
        }
    },

    '/student/class/create': {
        success: true,
        message: '班级创建成功',
        code: 200,
        result: {
            id: Date.now().toString()
        }
    },

    '/student/class/update': {
        success: true,
        message: '班级更新成功',
        code: 200,
        result: true
    },

    '/student/class/delete': {
        success: true,
        message: '班级删除成功',
        code: 200,
        result: true
    },

    // 学习进度API
    '/student/progress/list': {
        success: true,
        message: '获取学习进度成功',
        code: 200,
        result: {
            records: [
                {
                    id: 'prog001',
                    studentId: 'student001',
                    studentName: '张小明',
                    courseName: 'Scratch编程入门',
                    progress: 75,
                    status: 'learning',
                    lastStudyTime: '2024-01-23 09:30:00',
                    totalTime: 24,
                    completedLessons: 6,
                    totalLessons: 8
                },
                {
                    id: 'prog002',
                    studentId: 'student002',
                    studentName: '李小红',
                    courseName: 'Python编程基础',
                    progress: 90,
                    status: 'completed',
                    lastStudyTime: '2024-01-22 15:20:00',
                    totalTime: 36,
                    completedLessons: 9,
                    totalLessons: 10
                }
            ],
            total: 2,
            current: 1,
            size: 10
        }
    },

    // 课程管理API
    '/course/list': {
        success: true,
        message: '获取课程列表成功',
        code: 200,
        result: {
            records: [
                {
                    id: 'course001',
                    courseName: 'Scratch编程入门',
                    name: 'Scratch编程入门',
                    courseDesc: '适合6-12岁儿童的图形化编程入门课程，通过拖拽积木的方式学习编程思维。',
                    description: '适合6-12岁儿童的图形化编程入门课程，通过拖拽积木的方式学习编程思维。',
                    courseType: '1',
                    type: '1',
                    price: 299,
                    duration: 30,
                    level: '初级',
                    tags: ['儿童编程', '图形化', 'MIT'],
                    courseCover: '/covers/scratch-intro.jpg',
                    cover: '/covers/scratch-intro.jpg',
                    status: '1',
                    courseStatus: '1',
                    studentCount: 156,
                    avgRating: 4.8,
                    createTime: '2024-01-10',
                    updateTime: '2024-01-20',
                    teacher: '张老师',
                    associatedResources: [
                        { id: 'res001', name: 'Scratch入门教程.pdf', type: 'pdf' },
                        { id: 'res002', name: '编程练习素材.zip', type: 'zip' }
                    ]
                },
                {
                    id: 'course002',
                    courseName: 'Python编程基础',
                    name: 'Python编程基础',
                    courseDesc: '面向青少年的Python编程基础课程，学习变量、循环、函数等基础概念。',
                    description: '面向青少年的Python编程基础课程，学习变量、循环、函数等基础概念。',
                    courseType: '2',
                    type: '2',
                    price: 499,
                    duration: 45,
                    level: '中级',
                    tags: ['Python', '编程基础', '逻辑思维'],
                    courseCover: '/covers/python-basic.jpg',
                    cover: '/covers/python-basic.jpg',
                    status: '1',
                    courseStatus: '1',
                    studentCount: 98,
                    avgRating: 4.6,
                    createTime: '2024-01-05',
                    updateTime: '2024-01-18',
                    teacher: '李老师'
                }
            ],
            total: 2,
            current: 1,
            size: 10
        }
    },

    '/course/add': {
        success: true,
        message: '课程创建成功',
        code: 200,
        result: {
            id: Date.now().toString()
        }
    },

    '/course/update': {
        success: true,
        message: '课程更新成功',
        code: 200,
        result: true
    },

    '/course/delete': {
        success: true,
        message: '课程删除成功',
        code: 200,
        result: true
    },

    '/course/publish': {
        success: true,
        message: '课程发布成功',
        code: 200,
        result: true
    },

    '/relation/getStudentsByCourse': {
        success: true,
        message: '获取课程学员成功',
        code: 200,
        result: [
            {
                id: 'student001',
                name: '张小明',
                avatar: '/avatars/student001.jpg',
                enrollDate: '2024-01-10',
                progress: 75,
                status: 'active'
            },
            {
                id: 'student002',
                name: '李小红',
                avatar: '/avatars/student002.jpg',
                enrollDate: '2024-01-08',
                progress: 90,
                status: 'active'
            }
        ]
    }
}

// 拦截axios请求并返回mock数据
export function setupMock (axiosInstance) {
    // 添加请求拦截器
    axiosInstance.interceptors.request.use(
        config => {
            return config
        },
        error => {
            return Promise.reject(error)
        }
    )

    // 添加响应拦截器
    axiosInstance.interceptors.response.use(
        response => {
            return response
        },
        error => {
            // 提取URL路径
            let url = error.config.url
            if (error.config.baseURL) {
                url = url.replace(error.config.baseURL, '')
            }

            // 移除查询参数
            url = url.split('?')[0]

            // 合并主Mock数据和补充数据
            const allMockData = {
                ...mockResponses,
                ...additionalMockData,
                ...simpleMockData,
                ...courseData,
                ...studentData,
                ...homeworkData,
                ...dataSyncOperations
            }
            const mockData = allMockData[url]

            if (mockData) {
                return Promise.resolve({ data: mockData })
            }

            // 如果没有mock数据，返回默认成功响应
            if (url.startsWith('/sys/') || url.startsWith('/api/') || url.startsWith('/teaching/') || url.startsWith('/student/')) {
                return Promise.resolve({
                    data: {
                        success: true,
                        message: '操作成功',
                        code: 200,
                        result: []
                    }
                })
            }

            // 对于其他错误，也返回默认响应避免页面崩溃
            return Promise.resolve({
                data: {
                    success: true,
                    message: '操作成功',
                    code: 200,
                    result: {}
                }
            })
        }
    )
}
