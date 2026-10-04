// 补充Mock数据
export const additionalMockData = {
    // 学生作品信息
    '/teaching/teachingWork/studentWorkInfo': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            id: 1,
            workName: 'Scratch小游戏',
            studentName: '张小明',
            createTime: '2024-09-19',
            description: '这是一个简单的Scratch小游戏',
            score: 95,
            status: '已提交',
            workContent: '{"scripts":[{"name":"main","blocks":["move 10 steps","turn right 15 degrees"]}]}',
            previewImage: '/preview.jpg'
        }
    },

    // 作品评论
    '/teaching/teachingWork/getWorkComments': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            records: [
                {
                    id: 1,
                    content: '作品很棒，创意很好！',
                    createTime: '2024-09-19 14:30:00',
                    userName: '李老师',
                    userAvatar: '/avatar1.jpg'
                },
                {
                    id: 2,
                    content: '逻辑清晰，代码规范',
                    createTime: '2024-09-19 15:20:00',
                    userName: '王老师',
                    userAvatar: '/avatar2.jpg'
                }
            ],
            total: 2
        }
    },

    // 系统配置
    '/sys/config/getConfig': {
        success: true,
        message: '操作成功',
        code: 200,
        result: '<div class="work-share-content"><h3>作品分享</h3><p>这里是作品分享的HTML内容</p><div class="share-buttons"><button>分享到微信</button><button>复制链接</button></div></div>'
    },

    // 作业作品详情
    '/teaching/teachingWork/workDetail': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            id: 1,
            title: '第一章：Scratch基础',
            description: '学习Scratch编程基础知识',
            workContent: '请创建一个简单的动画',
            submittedCount: 25,
            totalCount: 30,
            deadline: '2024-09-25'
        }
    },

    // 教学资源
    '/teaching/resource/list': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            records: [
                {
                    id: 1,
                    name: 'Scratch编程教程.pdf',
                    type: 'pdf',
                    size: '2.5MB',
                    uploadTime: '2024-09-18'
                },
                {
                    id: 2,
                    name: 'Python基础视频',
                    type: 'video',
                    size: '125MB',
                    uploadTime: '2024-09-17'
                }
            ],
            total: 2
        }
    },

    // 班级信息
    '/teaching/class/info': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            id: 1,
            className: '计算机编程班',
            teacherName: '张老师',
            studentCount: 30,
            createTime: '2024-09-01',
            description: '面向初学者的编程入门班级'
        }
    },

    // 学习进度
    '/teaching/progress/student': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            totalCourses: 10,
            completedCourses: 6,
            completionRate: 60,
            currentCourse: 'Scratch进阶',
            nextCourse: 'Python入门',
            weeklyProgress: [
                { week: '第1周', progress: 20 },
                { week: '第2周', progress: 35 },
                { week: '第3周', progress: 50 },
                { week: '第4周', progress: 60 }
            ]
        }
    }
}
