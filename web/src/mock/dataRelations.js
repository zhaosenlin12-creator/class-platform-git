// 数据关联管理 - 建立课程、学员、作业之间的数据流连通
export const dataRelations = {
    // 课程-学生关联表
    courseStudentRelations: [
        {
            id: 'rel001',
            courseId: '1', // Scratch入门编程
            studentId: 's001',
            studentName: '张小明',
            enrollTime: '2024-01-15',
            progress: 75, // 学习进度百分比
            status: 'active', // active/completed/dropped
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
        },
        {
            id: 'rel003',
            courseId: '2', // Python基础教程
            studentId: 's001',
            studentName: '张小明',
            enrollTime: '2024-01-20',
            progress: 30,
            status: 'active',
            lastAccessTime: '2024-01-21 09:15:00'
        }
    ],

    // 课程-班级关联表
    courseClassRelations: [
        {
            id: 'ccrel001',
            courseId: '1',
            courseName: 'Scratch入门编程',
            classId: 'class001',
            className: '计算机1班',
            assignedBy: 'teacher001',
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
            assignedBy: 'teacher001',
            assignedTime: '2024-01-15',
            deadline: '2024-04-15',
            status: 'active'
        },
        {
            id: 'ccrel003',
            courseId: '3',
            courseName: 'Web开发入门',
            classId: 'class002',
            className: '计算机2班',
            assignedBy: 'teacher002',
            assignedTime: '2024-01-05',
            deadline: '2024-04-05',
            status: 'active'
        }
    ],

    // 作业-课程关联表
    homeworkCourseRelations: [
        {
            id: 'hcrel001',
            homeworkId: 'hw001',
            homeworkTitle: 'Scratch动画制作',
            courseId: '1',
            courseName: 'Scratch入门编程',
            courseUnitId: 'unit001',
            unitName: '第一章：基础语法',
            createdBy: 'teacher001',
            assignedClasses: ['class001'],
            totalStudents: 45,
            submittedCount: 32,
            gradedCount: 28,
            dueDate: '2024-02-15',
            status: 'active'
        },
        {
            id: 'hcrel002',
            homeworkId: 'hw002',
            homeworkTitle: 'Python计算器',
            courseId: '2',
            courseName: 'Python基础教程',
            courseUnitId: 'unit003',
            unitName: '第三章：条件判断',
            createdBy: 'teacher001',
            assignedClasses: ['class001'],
            totalStudents: 38,
            submittedCount: 25,
            gradedCount: 20,
            dueDate: '2024-02-20',
            status: 'active'
        }
    ],

    // 学生作业提交记录
    studentHomeworkSubmissions: [
        {
            id: 'sub001',
            homeworkId: 'hw001',
            studentId: 's001',
            studentName: '张小明',
            courseId: '1',
            classId: 'class001',
            submissionTime: '2024-02-10 15:30:00',
            submissionFile: '/uploads/submissions/s001_hw001.sb3',
            status: 'submitted', // draft/submitted/graded/returned
            score: 85,
            feedback: '作品很有创意，动画效果流畅。建议增加更多互动元素。',
            gradedBy: 'teacher001',
            gradedTime: '2024-02-12 10:20:00'
        },
        {
            id: 'sub002',
            homeworkId: 'hw001',
            studentId: 's002',
            studentName: '李小红',
            courseId: '1',
            classId: 'class001',
            submissionTime: '2024-02-12 14:45:00',
            submissionFile: '/uploads/submissions/s002_hw001.sb3',
            status: 'submitted',
            score: null,
            feedback: null,
            gradedBy: null,
            gradedTime: null
        }
    ],

    // 学习进度跟踪
    learningProgress: [
        {
            id: 'progress001',
            studentId: 's001',
            courseId: '1',
            unitId: 'unit001',
            unitName: '第一章：基础语法',
            completionStatus: 'completed',
            completionTime: '2024-01-25 16:00:00',
            timeSpent: 120, // 分钟
            exercises: {
                total: 5,
                completed: 5,
                correct: 4
            }
        },
        {
            id: 'progress002',
            studentId: 's001',
            courseId: '1',
            unitId: 'unit002',
            unitName: '第二章：循环结构',
            completionStatus: 'in_progress',
            startTime: '2024-01-26 10:00:00',
            timeSpent: 60,
            exercises: {
                total: 8,
                completed: 3,
                correct: 2
            }
        }
    ]
}

// 数据关联查询API
export const relationQueries = {
    // 根据课程ID获取学生列表
    '/relation/getStudentsByCourse': (courseId) => {
        const relations = dataRelations.courseStudentRelations.filter(rel => rel.courseId === courseId)
        return {
            success: true,
            message: '操作成功',
            code: 200,
            result: relations
        }
    },

    // 根据学生ID获取课程列表
    '/relation/getCoursesByStudent': (studentId) => {
        const relations = dataRelations.courseStudentRelations.filter(rel => rel.studentId === studentId)
        return {
            success: true,
            message: '操作成功',
            code: 200,
            result: relations
        }
    },

    // 根据课程ID获取作业列表
    '/relation/getHomeworkByCourse': (courseId) => {
        const homework = dataRelations.homeworkCourseRelations.filter(rel => rel.courseId === courseId)
        return {
            success: true,
            message: '操作成功',
            code: 200,
            result: homework
        }
    },

    // 根据班级ID获取课程分配情况
    '/relation/getCoursesByClass': (classId) => {
        const courses = dataRelations.courseClassRelations.filter(rel => rel.classId === classId)
        return {
            success: true,
            message: '操作成功',
            code: 200,
            result: courses
        }
    },

    // 获取学生作业提交情况
    '/relation/getStudentSubmissions': (studentId, courseId = null) => {
        let submissions = dataRelations.studentHomeworkSubmissions.filter(sub => sub.studentId === studentId)
        if (courseId) {
            submissions = submissions.filter(sub => sub.courseId === courseId)
        }
        return {
            success: true,
            message: '操作成功',
            code: 200,
            result: submissions
        }
    },

    // 获取作业提交统计
    '/relation/getHomeworkStats': (homeworkId) => {
        const submissions = dataRelations.studentHomeworkSubmissions.filter(sub => sub.homeworkId === homeworkId)
        const totalSubmissions = submissions.length
        const gradedSubmissions = submissions.filter(sub => sub.status === 'graded').length
        const avgScore = submissions
            .filter(sub => sub.score !== null)
            .reduce((sum, sub, _, arr) => sum + sub.score / arr.length, 0)

        return {
            success: true,
            message: '操作成功',
            code: 200,
            result: {
                homeworkId,
                totalSubmissions,
                gradedSubmissions,
                avgScore: Math.round(avgScore * 100) / 100,
                submissionRate: totalSubmissions > 0 ? Math.round((totalSubmissions / submissions.length) * 100) : 0
            }
        }
    },

    // 获取学生学习进度
    '/relation/getStudentProgress': (studentId, courseId = null) => {
        let progress = dataRelations.learningProgress.filter(p => p.studentId === studentId)
        if (courseId) {
            progress = progress.filter(p => p.courseId === courseId)
        }
        return {
            success: true,
            message: '操作成功',
            code: 200,
            result: progress
        }
    }
}

// 数据同步操作API
export const dataSyncOperations = {
    // 学生选课
    '/sync/enrollStudentToCourse': {
        success: true,
        message: '学生选课成功',
        code: 200,
        result: {
            id: Date.now().toString(),
            enrollTime: new Date().toISOString(),
            status: 'active',
            progress: 0
        }
    },

    // 课程分配给班级
    '/sync/assignCourseToClass': {
        success: true,
        message: '课程分配成功',
        code: 200,
        result: {
            id: Date.now().toString(),
            assignedTime: new Date().toISOString(),
            status: 'active'
        }
    },

    // 发布作业
    '/sync/publishHomework': {
        success: true,
        message: '作业发布成功',
        code: 200,
        result: {
            id: Date.now().toString(),
            publishTime: new Date().toISOString(),
            status: 'published'
        }
    },

    // 提交作业
    '/sync/submitHomework': {
        success: true,
        message: '作业提交成功',
        code: 200,
        result: {
            id: Date.now().toString(),
            submissionTime: new Date().toISOString(),
            status: 'submitted'
        }
    },

    // 批改作业
    '/sync/gradeHomework': {
        success: true,
        message: '作业批改成功',
        code: 200,
        result: {
            gradedTime: new Date().toISOString(),
            status: 'graded'
        }
    },

    // 更新学习进度
    '/sync/updateLearningProgress': {
        success: true,
        message: '学习进度更新成功',
        code: 200,
        result: {
            lastUpdateTime: new Date().toISOString()
        }
    }
}
