// 学员管理相关的完整Mock数据
export const studentData = {
    // 学员列表API
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
                    nickname: '小明同学',
                    phone: '13800138001',
                    email: 'student001@example.com',
                    avatar: '/avatars/student001.jpg',
                    gender: '1', // 1:男 2:女
                    age: 10,
                    birthday: '2014-03-15',
                    status: 1, // 1:正常 2:禁用
                    userType: 'student', // student:学生 teacher:教师 admin:管理员
                    departName: '计算机学院',
                    departId: '1',
                    className: '编程入门班A',
                    classId: 'class001',
                    studentNumber: '2024001',
                    enrollTime: '2024-01-01',
                    graduateTime: null,
                    totalCourses: 3, // 已报名课程数
                    completedCourses: 1, // 已完成课程数
                    totalStudyTime: 280, // 总学习时长（分钟）
                    totalHomework: 15, // 总作业数
                    completedHomework: 12, // 已完成作业数
                    avgScore: 85.5, // 平均成绩
                    level: 2, // 学员等级
                    points: 1250, // 积分
                    badges: ['初学者', '积极参与', '作业达人'], // 徽章
                    parentContact: '13900139001', // 家长联系方式
                    parentName: '张先生',
                    address: '北京市朝阳区某某小区',
                    school: '某某小学',
                    grade: '四年级',
                    interests: ['游戏', '动画', '机器人'],
                    createTime: '2024-01-01',
                    lastLoginTime: '2024-01-25 14:30:00',
                    isOnline: false
                },
                {
                    id: '2',
                    username: 'student002',
                    realname: '李小红',
                    nickname: '小红',
                    phone: '13800138002',
                    email: 'student002@example.com',
                    avatar: '/avatars/student002.jpg',
                    gender: '2',
                    age: 9,
                    birthday: '2015-06-20',
                    status: 1,
                    userType: 'student',
                    departName: '计算机学院',
                    departId: '1',
                    className: '编程入门班A',
                    classId: 'class001',
                    studentNumber: '2024002',
                    enrollTime: '2024-01-02',
                    graduateTime: null,
                    totalCourses: 2,
                    completedCourses: 0,
                    totalStudyTime: 180,
                    totalHomework: 10,
                    completedHomework: 9,
                    avgScore: 92.3,
                    level: 1,
                    points: 890,
                    badges: ['初学者', '优秀学员'],
                    parentContact: '13900139002',
                    parentName: '李女士',
                    address: '北京市海淀区某某花园',
                    school: '某某实验小学',
                    grade: '三年级',
                    interests: ['绘画', '音乐', '编程'],
                    createTime: '2024-01-02',
                    lastLoginTime: '2024-01-25 16:45:00',
                    isOnline: true
                },
                {
                    id: '3',
                    username: 'student003',
                    realname: '王小华',
                    nickname: '小华',
                    phone: '13800138003',
                    email: 'student003@example.com',
                    avatar: '/avatars/student003.jpg',
                    gender: '1',
                    age: 12,
                    birthday: '2012-11-08',
                    status: 1,
                    userType: 'student',
                    departName: '软件学院',
                    departId: '2',
                    className: 'Python基础班',
                    classId: 'class002',
                    studentNumber: '2024003',
                    enrollTime: '2024-01-03',
                    graduateTime: null,
                    totalCourses: 4,
                    completedCourses: 2,
                    totalStudyTime: 450,
                    totalHomework: 25,
                    completedHomework: 23,
                    avgScore: 88.7,
                    level: 3,
                    points: 1850,
                    badges: ['进步之星', '编程达人', '团队协作'],
                    parentContact: '13900139003',
                    parentName: '王先生',
                    address: '上海市浦东新区某某路',
                    school: '某某中学',
                    grade: '六年级',
                    interests: ['科技', '数学', '编程'],
                    createTime: '2024-01-03',
                    lastLoginTime: '2024-01-25 10:20:00',
                    isOnline: false
                },
                {
                    id: 'teacher001',
                    username: 'teacher001',
                    realname: '王老师',
                    nickname: '王老师',
                    phone: '13800138004',
                    email: 'teacher001@example.com',
                    avatar: '/avatars/teacher001.jpg',
                    gender: '1',
                    age: 32,
                    birthday: '1992-05-10',
                    status: 1,
                    userType: 'teacher',
                    departName: '计算机学院',
                    departId: '1',
                    title: '高级讲师',
                    experience: '5年',
                    specialty: ['Scratch编程', 'Python基础', '算法思维'],
                    totalCourses: 8,
                    activeCourses: 3,
                    totalStudents: 156,
                    avgRating: 4.8,
                    totalRatings: 89,
                    teachingHours: 2400,
                    certifications: ['高级程序员', '教师资格证', '少儿编程指导师'],
                    education: '计算机科学与技术 硕士',
                    university: '清华大学',
                    createTime: '2023-12-15',
                    lastLoginTime: '2024-01-25 08:45:00',
                    isOnline: true
                }
            ],
            total: 4,
            size: 10,
            current: 1
        }
    },

    // 班级列表API
    '/student/class/list': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            records: [
                {
                    id: 'class001',
                    className: '编程入门班A',
                    classCode: 'PROG-A-001',
                    courseId: '1',
                    courseName: 'Scratch入门编程',
                    teacherId: 'teacher001',
                    teacherName: '王老师',
                    maxStudents: 50,
                    currentStudents: 45,
                    startDate: '2024-01-10',
                    endDate: '2024-04-10',
                    status: '1', // 1:进行中 2:已结束 3:未开始
                    schedule: [
                        { day: '周二', time: '16:00-17:30' },
                        { day: '周四', time: '16:00-17:30' },
                        { day: '周六', time: '09:00-10:30' }
                    ],
                    classroom: '在线教室A',
                    description: '面向7-12岁儿童的Scratch图形化编程入门课程',
                    completionRate: 78,
                    avgScore: 86.5,
                    tags: ['入门', '图形化', '在线'],
                    createTime: '2024-01-05'
                },
                {
                    id: 'class002',
                    className: 'Python基础班',
                    classCode: 'PYTH-B-001',
                    courseId: '2',
                    courseName: 'Python基础教程',
                    teacherId: 'teacher002',
                    teacherName: '李老师',
                    maxStudents: 40,
                    currentStudents: 38,
                    startDate: '2024-01-08',
                    endDate: '2024-05-08',
                    status: '1',
                    schedule: [
                        { day: '周一', time: '19:00-20:30' },
                        { day: '周三', time: '19:00-20:30' },
                        { day: '周五', time: '19:00-20:30' }
                    ],
                    classroom: '在线教室B',
                    description: 'Python编程语言基础教学，适合有一定编程基础的学员',
                    completionRate: 82,
                    avgScore: 89.2,
                    tags: ['进阶', 'Python', '在线'],
                    createTime: '2024-01-01'
                },
                {
                    id: 'class003',
                    className: 'Web前端开发班',
                    classCode: 'WEB-C-001',
                    courseId: '3',
                    courseName: 'Web前端开发入门',
                    teacherId: 'teacher003',
                    teacherName: '张老师',
                    maxStudents: 60,
                    currentStudents: 52,
                    startDate: '2024-01-05',
                    endDate: '2024-04-05',
                    status: '2',
                    schedule: [
                        { day: '周二', time: '19:00-21:00' },
                        { day: '周四', time: '19:00-21:00' }
                    ],
                    classroom: '在线教室C',
                    description: 'HTML、CSS、JavaScript前端技术综合教学',
                    completionRate: 95,
                    avgScore: 91.8,
                    tags: ['前端', '综合', '已结束'],
                    createTime: '2023-12-25'
                }
            ],
            total: 3,
            size: 10,
            current: 1
        }
    },

    // 学习进度API
    '/student/progress/list': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            records: [
                {
                    studentId: '1',
                    studentName: '张小明',
                    courseId: '1',
                    courseName: 'Scratch入门编程',
                    classId: 'class001',
                    className: '编程入门班A',
                    totalUnits: 12,
                    completedUnits: 8,
                    completionRate: 67,
                    totalStudyTime: 280,
                    lastStudyTime: '2024-01-24 16:30:00',
                    currentUnit: '第九章：综合项目制作',
                    nextUnit: '第十章：作品分享与展示',
                    averageScore: 85.5,
                    homeworkCount: 12,
                    completedHomework: 10,
                    homeworkRate: 83,
                    attendance: 95, // 出勤率
                    status: 'learning', // learning:学习中 completed:已完成 paused:暂停
                    startDate: '2024-01-10',
                    expectedEndDate: '2024-04-10',
                    actualProgress: 67,
                    expectedProgress: 75, // 按时间计算的期望进度
                    isLagging: true, // 是否落后
                    strengths: ['逻辑思维强', '创意丰富'],
                    weaknesses: ['基础操作需加强'],
                    teacherComment: '学习积极性很高，但需要多练习基础操作'
                },
                {
                    studentId: '2',
                    studentName: '李小红',
                    courseId: '1',
                    courseName: 'Scratch入门编程',
                    classId: 'class001',
                    className: '编程入门班A',
                    totalUnits: 12,
                    completedUnits: 6,
                    completionRate: 50,
                    totalStudyTime: 180,
                    lastStudyTime: '2024-01-23 17:15:00',
                    currentUnit: '第七章：变量与计算',
                    nextUnit: '第八章：函数与模块',
                    averageScore: 92.3,
                    homeworkCount: 10,
                    completedHomework: 9,
                    homeworkRate: 90,
                    attendance: 100,
                    status: 'learning',
                    startDate: '2024-01-10',
                    expectedEndDate: '2024-04-10',
                    actualProgress: 50,
                    expectedProgress: 75,
                    isLagging: true,
                    strengths: ['理解能力强', '作业完成质量高'],
                    weaknesses: ['学习时间投入较少'],
                    teacherComment: '理解能力很强，建议增加学习时间'
                },
                {
                    studentId: '3',
                    studentName: '王小华',
                    courseId: '2',
                    courseName: 'Python基础教程',
                    classId: 'class002',
                    className: 'Python基础班',
                    totalUnits: 16,
                    completedUnits: 12,
                    completionRate: 75,
                    totalStudyTime: 450,
                    lastStudyTime: '2024-01-25 20:45:00',
                    currentUnit: '第十三章：面向对象编程',
                    nextUnit: '第十四章：文件操作',
                    averageScore: 88.7,
                    homeworkCount: 25,
                    completedHomework: 23,
                    homeworkRate: 92,
                    attendance: 88,
                    status: 'learning',
                    startDate: '2024-01-08',
                    expectedEndDate: '2024-05-08',
                    actualProgress: 75,
                    expectedProgress: 70,
                    isLagging: false,
                    strengths: ['编程思维好', '问题解决能力强'],
                    weaknesses: ['代码规范需改进'],
                    teacherComment: '进度超前，是班级里的佼佼者'
                }
            ],
            total: 3,
            size: 10,
            current: 1
        }
    },

    // 学员统计API
    '/student/statistics': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            totalStudents: 156,
            activeStudents: 89,
            newStudents: 23,
            graduatedStudents: 34,
            averageAge: 10.5,
            genderDistribution: {
                male: 89,
                female: 67
            },
            levelDistribution: {
                level1: 45,
                level2: 67,
                level3: 32,
                level4: 12
            },
            courseEnrollment: {
                'Scratch入门': 78,
                'Python基础': 45,
                'Web前端': 33
            },
            monthlyStats: [
                { month: '2024-01', newStudents: 23, activeStudents: 89 },
                { month: '2024-02', newStudents: 18, activeStudents: 95 },
                { month: '2024-03', newStudents: 15, activeStudents: 98 }
            ]
        }
    }
}
