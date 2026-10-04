// 课程管理相关的完整Mock数据
export const courseData = {
    // 课程列表API
    '/teaching/teachingCourse/list': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            records: [
                {
                    id: '1',
                    courseName: 'Scratch入门编程',
                    courseDesc: '适合7-12岁儿童的图形化编程启蒙课程，通过拖拽积木的方式学习编程基础概念',
                    courseType: '1', // 1:Scratch 2:Python 3:Web 4:其他
                    courseLevel: '1', // 1:入门 2:初级 3:中级 4:高级
                    courseStatus: '1', // 1:进行中 2:已结束 3:未开始
                    courseCover: '/course-covers/scratch-basic.jpg',
                    departName: '计算机学院',
                    teacherName: '王老师',
                    teacherId: 'teacher001',
                    studentCount: 45,
                    maxStudentCount: 50,
                    duration: 60, // 课程时长（小时）
                    unitCount: 12, // 单元数量
                    price: 299.00,
                    originalPrice: 399.00,
                    difficulty: 2, // 难度系数1-5
                    tags: ['图形化编程', '逻辑思维', '创意启发'],
                    startTime: '2024-01-10',
                    endTime: '2024-04-10',
                    createTime: '2024-01-05',
                    updateTime: '2024-01-15',
                    viewCount: 1250,
                    likeCount: 89,
                    avgRating: 4.7,
                    ratingCount: 23,
                    associatedResources: [
                        {
                            id: 'res001',
                            name: 'Scratch入门指南.pdf',
                            type: 'document',
                            size: 2456789,
                            permission: 'public',
                            associateTime: '2024-01-10T10:00:00Z'
                        },
                        {
                            id: 'res002',
                            name: 'Scratch界面介绍.mp4',
                            type: 'video',
                            size: 45678901,
                            permission: 'shared',
                            associateTime: '2024-01-10T10:30:00Z'
                        },
                        {
                            id: 'res003',
                            name: '第一个动画项目.sb3',
                            type: 'code',
                            size: 123456,
                            permission: 'public',
                            associateTime: '2024-01-10T11:00:00Z'
                        }
                    ]
                },
                {
                    id: '2',
                    courseName: 'Python基础教程',
                    courseDesc: '从零开始学习Python编程语言，掌握基础语法、数据结构和面向对象编程',
                    courseType: '2',
                    courseLevel: '2',
                    courseStatus: '1',
                    courseCover: '/course-covers/python-basic.jpg',
                    departName: '计算机学院',
                    teacherName: '李老师',
                    teacherId: 'teacher002',
                    studentCount: 38,
                    maxStudentCount: 40,
                    duration: 80,
                    unitCount: 16,
                    price: 499.00,
                    originalPrice: 699.00,
                    difficulty: 3,
                    tags: ['Python', '编程基础', '数据处理'],
                    startTime: '2024-01-08',
                    endTime: '2024-05-08',
                    createTime: '2024-01-01',
                    updateTime: '2024-01-10',
                    viewCount: 2150,
                    likeCount: 156,
                    avgRating: 4.8,
                    ratingCount: 42,
                    associatedResources: [
                        {
                            id: 'res007',
                            name: 'Python基础语法.pptx',
                            type: 'document',
                            size: 3456789,
                            permission: 'public',
                            associateTime: '2024-01-08T14:00:00Z'
                        },
                        {
                            id: 'res008',
                            name: 'hello_world.py',
                            type: 'code',
                            size: 1024,
                            permission: 'public',
                            associateTime: '2024-01-08T14:30:00Z'
                        },
                        {
                            id: 'res010',
                            name: '计算器项目.py',
                            type: 'code',
                            size: 4567,
                            permission: 'shared',
                            associateTime: '2024-01-08T15:00:00Z'
                        }
                    ]
                },
                {
                    id: '3',
                    courseName: 'Web前端开发入门',
                    courseDesc: '学习HTML、CSS、JavaScript三大前端技术，制作美观的网页和交互效果',
                    courseType: '3',
                    courseLevel: '2',
                    courseStatus: '2',
                    courseCover: '/course-covers/web-frontend.jpg',
                    departName: '软件学院',
                    teacherName: '张老师',
                    teacherId: 'teacher003',
                    studentCount: 52,
                    maxStudentCount: 60,
                    duration: 100,
                    unitCount: 20,
                    price: 599.00,
                    originalPrice: 799.00,
                    difficulty: 3,
                    tags: ['HTML', 'CSS', 'JavaScript', '前端开发'],
                    startTime: '2024-01-05',
                    endTime: '2024-04-05',
                    createTime: '2023-12-25',
                    updateTime: '2024-01-08',
                    viewCount: 3280,
                    likeCount: 234,
                    avgRating: 4.9,
                    ratingCount: 67,
                    associatedResources: [
                        {
                            id: 'res012',
                            name: 'HTML基础教程.pdf',
                            type: 'document',
                            size: 1234567,
                            permission: 'public',
                            associateTime: '2024-01-05T13:20:00Z'
                        },
                        {
                            id: 'res013',
                            name: '第一个网页.html',
                            type: 'code',
                            size: 2048,
                            permission: 'public',
                            associateTime: '2024-01-05T14:00:00Z'
                        }
                    ]
                },
                {
                    id: '4',
                    courseName: 'Scratch进阶课程',
                    courseDesc: '深入学习Scratch高级功能，制作复杂的动画和游戏项目',
                    courseType: '1',
                    courseLevel: '3',
                    courseStatus: '3',
                    courseCover: '/course-covers/scratch-advanced.jpg',
                    departName: '计算机学院',
                    teacherName: '王老师',
                    teacherId: 'teacher001',
                    studentCount: 0,
                    maxStudentCount: 30,
                    duration: 45,
                    unitCount: 10,
                    price: 399.00,
                    originalPrice: 499.00,
                    difficulty: 4,
                    tags: ['Scratch进阶', '游戏开发', '动画制作'],
                    startTime: '2024-03-01',
                    endTime: '2024-05-01',
                    createTime: '2024-01-20',
                    updateTime: '2024-01-25',
                    viewCount: 580,
                    likeCount: 34,
                    avgRating: 4.6,
                    ratingCount: 8,
                    associatedResources: [
                        {
                            id: 'res005',
                            name: '小猫捉老鼠游戏.sb3',
                            type: 'code',
                            size: 567890,
                            permission: 'shared',
                            associateTime: '2024-01-25T16:20:00Z'
                        },
                        {
                            id: 'res006',
                            name: '项目制作教程.mp4',
                            type: 'video',
                            size: 78901234,
                            permission: 'shared',
                            associateTime: '2024-01-25T17:00:00Z'
                        }
                    ]
                },
                {
                    id: '5',
                    courseName: 'Python数据分析',
                    courseDesc: '使用Python进行数据处理、可视化分析，掌握pandas、matplotlib等库的使用',
                    courseType: '2',
                    courseLevel: '4',
                    courseStatus: '1',
                    courseCover: '/course-covers/python-data.jpg',
                    departName: '数据科学学院',
                    teacherName: '陈老师',
                    teacherId: 'teacher004',
                    studentCount: 25,
                    maxStudentCount: 30,
                    duration: 120,
                    unitCount: 24,
                    price: 799.00,
                    originalPrice: 999.00,
                    difficulty: 5,
                    tags: ['数据分析', 'Python', '可视化', '机器学习'],
                    startTime: '2024-02-01',
                    endTime: '2024-06-01',
                    createTime: '2024-01-15',
                    updateTime: '2024-02-05',
                    viewCount: 1890,
                    likeCount: 127,
                    avgRating: 4.8,
                    ratingCount: 31,
                    associatedResources: []
                },
                {
                    id: '6',
                    courseName: '移动应用开发基础',
                    courseDesc: '学习使用React Native开发跨平台移动应用，从零开始制作自己的手机App',
                    courseType: '4',
                    courseLevel: '3',
                    courseStatus: '1',
                    courseCover: '/course-covers/mobile-dev.jpg',
                    departName: '软件学院',
                    teacherName: '刘老师',
                    teacherId: 'teacher005',
                    studentCount: 18,
                    maxStudentCount: 25,
                    duration: 90,
                    unitCount: 18,
                    price: 699.00,
                    originalPrice: 899.00,
                    difficulty: 4,
                    tags: ['移动开发', 'React Native', 'App开发'],
                    startTime: '2024-01-15',
                    endTime: '2024-04-15',
                    createTime: '2024-01-08',
                    updateTime: '2024-01-20',
                    viewCount: 950,
                    likeCount: 78,
                    avgRating: 4.5,
                    ratingCount: 19,
                    associatedResources: []
                }
            ],
            total: 6,
            size: 10,
            current: 1
        }
    },

    // 课程单元列表API
    '/teaching/teachingCourseUnit/list': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            records: [
                {
                    id: '1',
                    unitName: '第一章：初识Scratch',
                    unitDesc: '了解Scratch界面，学会基本操作和创建第一个程序',
                    courseName: 'Scratch入门编程',
                    courseId: '1',
                    orderNum: 1,
                    unitType: '1', // 1:理论 2:实践 3:测验
                    status: '1', // 1:已发布 2:未发布
                    duration: 120, // 分钟
                    videoUrl: '/videos/scratch-unit1.mp4',
                    materialUrl: '/materials/scratch-unit1.pdf',
                    exerciseCount: 5,
                    completedCount: 42,
                    totalStudents: 45,
                    difficulty: 1,
                    createTime: '2024-01-10',
                    updateTime: '2024-01-12'
                },
                {
                    id: '2',
                    unitName: '第二章：角色与舞台',
                    unitDesc: '学习如何添加角色、更换背景，设置角色的基本属性',
                    courseName: 'Scratch入门编程',
                    courseId: '1',
                    orderNum: 2,
                    unitType: '2',
                    status: '1',
                    duration: 150,
                    videoUrl: '/videos/scratch-unit2.mp4',
                    materialUrl: '/materials/scratch-unit2.pdf',
                    exerciseCount: 8,
                    completedCount: 38,
                    totalStudents: 45,
                    difficulty: 2,
                    createTime: '2024-01-12',
                    updateTime: '2024-01-14'
                },
                {
                    id: '3',
                    unitName: '第三章：运动与坐标',
                    unitDesc: '掌握角色的移动控制，理解坐标系统的概念',
                    courseName: 'Scratch入门编程',
                    courseId: '1',
                    orderNum: 3,
                    unitType: '2',
                    status: '1',
                    duration: 180,
                    videoUrl: '/videos/scratch-unit3.mp4',
                    materialUrl: '/materials/scratch-unit3.pdf',
                    exerciseCount: 10,
                    completedCount: 35,
                    totalStudents: 45,
                    difficulty: 2,
                    createTime: '2024-01-15',
                    updateTime: '2024-01-17'
                },
                {
                    id: '4',
                    unitName: '第一章：Python环境搭建',
                    unitDesc: '安装Python开发环境，学习使用IDE进行编程',
                    courseName: 'Python基础教程',
                    courseId: '2',
                    orderNum: 1,
                    unitType: '1',
                    status: '1',
                    duration: 90,
                    videoUrl: '/videos/python-unit1.mp4',
                    materialUrl: '/materials/python-unit1.pdf',
                    exerciseCount: 3,
                    completedCount: 36,
                    totalStudents: 38,
                    difficulty: 2,
                    createTime: '2024-01-08',
                    updateTime: '2024-01-10'
                },
                {
                    id: '5',
                    unitName: '第二章：变量与数据类型',
                    unitDesc: '学习Python中的基本数据类型，掌握变量的使用方法',
                    courseName: 'Python基础教程',
                    courseId: '2',
                    orderNum: 2,
                    unitType: '2',
                    status: '1',
                    duration: 120,
                    videoUrl: '/videos/python-unit2.mp4',
                    materialUrl: '/materials/python-unit2.pdf',
                    exerciseCount: 12,
                    completedCount: 32,
                    totalStudents: 38,
                    difficulty: 3,
                    createTime: '2024-01-10',
                    updateTime: '2024-01-12'
                }
            ],
            total: 5,
            size: 10,
            current: 1
        }
    },

    // 课程详情API
    '/teaching/teachingCourse/detail': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            id: '1',
            courseName: 'Scratch入门编程',
            courseDesc: '适合7-12岁儿童的图形化编程启蒙课程，通过拖拽积木的方式学习编程基础概念',
            courseType: '1',
            courseLevel: '1',
            courseStatus: '1',
            courseCover: '/course-covers/scratch-basic.jpg',
            teacherInfo: {
                id: 'teacher001',
                name: '王老师',
                avatar: '/avatars/teacher001.jpg',
                title: '高级讲师',
                experience: '5年编程教学经验',
                description: '专注于少儿编程教育，擅长Scratch和Python教学'
            },
            courseStats: {
                studentCount: 45,
                maxStudentCount: 50,
                completionRate: 78,
                avgRating: 4.7,
                ratingCount: 23,
                viewCount: 1250,
                likeCount: 89
            },
            courseContent: {
                duration: 60,
                unitCount: 12,
                exerciseCount: 45,
                projectCount: 8
            },
            coursePlan: [
                {
                    week: 1,
                    title: 'Scratch基础操作',
                    units: ['初识Scratch', '角色与舞台', '基本移动']
                },
                {
                    week: 2,
                    title: '程序控制结构',
                    units: ['循环结构', '条件判断', '事件处理']
                },
                {
                    week: 3,
                    title: '进阶功能',
                    units: ['变量使用', '函数定义', '综合项目']
                }
            ],
            tags: ['图形化编程', '逻辑思维', '创意启发'],
            requirements: [
                '7-12岁年龄段',
                '具备基本的电脑操作能力',
                '对编程和创作有兴趣'
            ],
            objectives: [
                '掌握Scratch基本操作',
                '理解编程的基础概念',
                '能够独立完成简单的动画和游戏项目',
                '培养逻辑思维能力'
            ]
        }
    }
}
