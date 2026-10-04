// 作业管理相关的完整Mock数据
export const homeworkData = {
    // 作业列表API
    '/teaching/teachingWork/list': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            records: [
                {
                    id: '1',
                    title: 'Scratch动画制作',
                    description: '制作一个包含多个角色和背景的动画故事，要求至少3个场景转换',
                    type: '1', // 1:Scratch 2:Python 3:Web 4:其他
                    courseId: '1',
                    courseName: 'Scratch入门编程',
                    classId: 'class001',
                    className: '编程入门班A',
                    teacherId: 'teacher001',
                    teacherName: '王老师',
                    totalScore: 100,
                    difficulty: 2, // 1-5难度等级
                    estimatedTime: 120, // 预计完成时间（分钟）
                    status: '1', // 1:进行中 2:已截止 3:未发布 4:已完成
                    publishTime: '2024-01-15 09:00:00',
                    deadline: '2024-01-25 23:59:59',
                    submitStartTime: '2024-01-15 09:00:00',
                    submitEndTime: '2024-01-25 23:59:59',
                    totalStudents: 45,
                    submittedCount: 38,
                    gradedCount: 32,
                    submissionRate: 84,
                    avgScore: 85.6,
                    maxScore: 98,
                    minScore: 67,
                    tags: ['动画', '创意', '故事'],
                    requirements: [
                        '至少包含3个角色',
                        '包含背景音乐',
                        '有完整的故事情节',
                        '运行时长不少于30秒'
                    ],
                    attachments: [
                        {
                            name: '作业要求.pdf',
                            url: '/homework/requirements/hw001.pdf',
                            size: '2.3MB'
                        },
                        {
                            name: '参考素材.zip',
                            url: '/homework/materials/hw001_materials.zip',
                            size: '15.8MB'
                        }
                    ],
                    rubric: {
                        creativity: { weight: 30, description: '创意性和原创性' },
                        technical: { weight: 40, description: '技术实现质量' },
                        presentation: { weight: 20, description: '作品展示效果' },
                        completion: { weight: 10, description: '完成度' }
                    },
                    autoGrade: false,
                    allowLateSubmit: true,
                    lateSubmitPenalty: 10, // 迟交扣分百分比
                    createTime: '2024-01-14',
                    updateTime: '2024-01-15'
                },
                {
                    id: '2',
                    title: 'Python计算器程序',
                    description: '编写一个支持基本四则运算的计算器程序，要求有用户界面',
                    type: '2',
                    courseId: '2',
                    courseName: 'Python基础教程',
                    classId: 'class002',
                    className: 'Python基础班',
                    teacherId: 'teacher002',
                    teacherName: '李老师',
                    totalScore: 100,
                    difficulty: 3,
                    estimatedTime: 180,
                    status: '2',
                    publishTime: '2024-01-10 09:00:00',
                    deadline: '2024-01-20 23:59:59',
                    submitStartTime: '2024-01-10 09:00:00',
                    submitEndTime: '2024-01-20 23:59:59',
                    totalStudents: 38,
                    submittedCount: 35,
                    gradedCount: 35,
                    submissionRate: 92,
                    avgScore: 88.9,
                    maxScore: 100,
                    minScore: 72,
                    tags: ['Python', 'GUI', '数学'],
                    requirements: [
                        '支持加减乘除运算',
                        '有图形用户界面',
                        '支持连续计算',
                        '有错误处理机制'
                    ],
                    attachments: [
                        {
                            name: '作业说明.docx',
                            url: '/homework/requirements/hw002.docx',
                            size: '1.8MB'
                        },
                        {
                            name: '示例代码.py',
                            url: '/homework/examples/calculator_example.py',
                            size: '3.2KB'
                        }
                    ],
                    rubric: {
                        functionality: { weight: 50, description: '功能实现完整性' },
                        codeQuality: { weight: 25, description: '代码质量和规范' },
                        userInterface: { weight: 15, description: '用户界面设计' },
                        documentation: { weight: 10, description: '代码注释和文档' }
                    },
                    autoGrade: true,
                    allowLateSubmit: false,
                    lateSubmitPenalty: 0,
                    createTime: '2024-01-08',
                    updateTime: '2024-01-10'
                },
                {
                    id: '3',
                    title: '个人网页设计',
                    description: '设计并制作一个个人介绍网页，要求使用HTML、CSS和JavaScript',
                    type: '3',
                    courseId: '3',
                    courseName: 'Web前端开发入门',
                    classId: 'class003',
                    className: 'Web前端开发班',
                    teacherId: 'teacher003',
                    teacherName: '张老师',
                    totalScore: 100,
                    difficulty: 4,
                    estimatedTime: 240,
                    status: '4',
                    publishTime: '2024-01-05 09:00:00',
                    deadline: '2024-01-15 23:59:59',
                    submitStartTime: '2024-01-05 09:00:00',
                    submitEndTime: '2024-01-15 23:59:59',
                    totalStudents: 52,
                    submittedCount: 52,
                    gradedCount: 52,
                    submissionRate: 100,
                    avgScore: 91.8,
                    maxScore: 99,
                    minScore: 78,
                    tags: ['HTML', 'CSS', 'JavaScript', '设计'],
                    requirements: [
                        '包含个人信息展示',
                        '至少3个页面栏目',
                        '响应式设计',
                        '有JavaScript交互效果'
                    ],
                    attachments: [
                        {
                            name: '设计要求.pdf',
                            url: '/homework/requirements/hw003.pdf',
                            size: '3.1MB'
                        },
                        {
                            name: '网页模板.zip',
                            url: '/homework/templates/webpage_template.zip',
                            size: '8.5MB'
                        }
                    ],
                    rubric: {
                        design: { weight: 30, description: '页面设计美观度' },
                        responsive: { weight: 25, description: '响应式设计实现' },
                        functionality: { weight: 25, description: 'JavaScript功能' },
                        codeStructure: { weight: 20, description: '代码结构规范' }
                    },
                    autoGrade: false,
                    allowLateSubmit: true,
                    lateSubmitPenalty: 15,
                    createTime: '2024-01-03',
                    updateTime: '2024-01-05'
                }
            ],
            total: 3,
            size: 10,
            current: 1
        }
    },

    // 学生作业提交列表API
    '/teaching/teachingWork/submissions': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            records: [
                {
                    id: 'sub001',
                    homeworkId: '1',
                    homeworkTitle: 'Scratch动画制作',
                    studentId: '1',
                    studentName: '张小明',
                    studentNumber: '2024001',
                    submitTime: '2024-01-22 18:30:00',
                    submitStatus: '2', // 1:未提交 2:已提交 3:已评分 4:需重做
                    score: 89,
                    totalScore: 100,
                    isLate: false,
                    submitCount: 1, // 提交次数
                    workFiles: [
                        {
                            name: '我的动画作品.sb3',
                            url: '/submissions/student001/homework001/animation.sb3',
                            size: '2.5MB',
                            type: 'sb3'
                        },
                        {
                            name: '作品说明.txt',
                            url: '/submissions/student001/homework001/description.txt',
                            size: '1.2KB',
                            type: 'txt'
                        }
                    ],
                    screenshots: [
                        '/submissions/student001/homework001/screenshot1.png',
                        '/submissions/student001/homework001/screenshot2.png'
                    ],
                    workDescription: '这是一个关于小猫历险的动画故事，包含了森林、城堡和海边三个场景。',
                    teacherComment: '创意很好，动画效果流畅，但可以增加更多的角色互动。',
                    gradeDetails: {
                        creativity: { score: 28, maxScore: 30, comment: '创意丰富，故事有趣' },
                        technical: { score: 35, maxScore: 40, comment: '技术实现良好，但有些细节可以优化' },
                        presentation: { score: 18, maxScore: 20, comment: '展示效果很棒' },
                        completion: { score: 8, maxScore: 10, comment: '基本完成要求' }
                    },
                    gradeTime: '2024-01-23 14:20:00',
                    graderId: 'teacher001',
                    graderName: '王老师'
                },
                {
                    id: 'sub002',
                    homeworkId: '1',
                    homeworkTitle: 'Scratch动画制作',
                    studentId: '2',
                    studentName: '李小红',
                    studentNumber: '2024002',
                    submitTime: '2024-01-24 16:45:00',
                    submitStatus: '2',
                    score: null,
                    totalScore: 100,
                    isLate: false,
                    submitCount: 1,
                    workFiles: [
                        {
                            name: '公主冒险记.sb3',
                            url: '/submissions/student002/homework001/princess_adventure.sb3',
                            size: '3.8MB',
                            type: 'sb3'
                        }
                    ],
                    screenshots: [
                        '/submissions/student002/homework001/screenshot1.png'
                    ],
                    workDescription: '公主在魔法森林中的冒险故事，有魔法元素和音效。',
                    teacherComment: null,
                    gradeDetails: null,
                    gradeTime: null,
                    graderId: null,
                    graderName: null
                },
                {
                    id: 'sub003',
                    homeworkId: '2',
                    homeworkTitle: 'Python计算器程序',
                    studentId: '3',
                    studentName: '王小华',
                    studentNumber: '2024003',
                    submitTime: '2024-01-19 21:15:00',
                    submitStatus: '3',
                    score: 95,
                    totalScore: 100,
                    isLate: false,
                    submitCount: 2,
                    workFiles: [
                        {
                            name: 'calculator.py',
                            url: '/submissions/student003/homework002/calculator.py',
                            size: '5.8KB',
                            type: 'py'
                        },
                        {
                            name: 'requirements.txt',
                            url: '/submissions/student003/homework002/requirements.txt',
                            size: '156B',
                            type: 'txt'
                        },
                        {
                            name: 'README.md',
                            url: '/submissions/student003/homework002/README.md',
                            size: '1.8KB',
                            type: 'md'
                        }
                    ],
                    screenshots: [
                        '/submissions/student003/homework002/calculator_ui.png'
                    ],
                    workDescription: '使用tkinter制作的图形界面计算器，支持基本运算和历史记录功能。',
                    teacherComment: '优秀！代码结构清晰，功能完善，UI设计美观。',
                    gradeDetails: {
                        functionality: { score: 48, maxScore: 50, comment: '功能实现完整，超出基本要求' },
                        codeQuality: { score: 24, maxScore: 25, comment: '代码规范，注释详细' },
                        userInterface: { score: 14, maxScore: 15, comment: '界面美观易用' },
                        documentation: { score: 9, maxScore: 10, comment: '文档完善' }
                    },
                    gradeTime: '2024-01-20 10:30:00',
                    graderId: 'teacher002',
                    graderName: '李老师'
                }
            ],
            total: 3,
            size: 10,
            current: 1
        }
    },

    // 作业提交管理列表API
    '/teaching/teachingWorkSubmission/list': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            records: [
                {
                    id: '1',
                    homeworkId: '1',
                    homeworkTitle: 'Scratch动画制作',
                    studentId: '1',
                    studentName: '张小明',
                    studentAvatar: '/avatars/student1.jpg',
                    submitTime: '2024-09-18 14:30:00',
                    score: 92,
                    submissionStatus: '2',
                    workPath: '/uploads/homework/1_1.sb3',
                    comment: '动画故事完整，角色设计有创意',
                    content: '我制作了一个关于小猫冒险的动画故事，包含了3个不同的场景：森林、城堡和海边。每个场景都有独特的背景音乐和角色互动。',
                    feedback: '作品很有创意，故事情节完整，角色设计生动。建议可以增加更多的动画效果和声音元素。',
                    files: [
                        {
                            name: '小猫冒险.sb3',
                            type: 'Scratch项目文件',
                            size: 2048576,
                            url: '/uploads/homework/1_1.sb3'
                        },
                        {
                            name: '设计说明.docx',
                            type: '文档',
                            size: 1024000,
                            url: '/uploads/homework/1_1_description.docx'
                        }
                    ]
                },
                {
                    id: '2',
                    homeworkId: '1',
                    homeworkTitle: 'Scratch动画制作',
                    studentId: '2',
                    studentName: '李小红',
                    studentAvatar: '/avatars/student2.jpg',
                    submitTime: '2024-09-19 09:15:00',
                    score: 88,
                    submissionStatus: '2',
                    workPath: '/uploads/homework/1_2.sb3',
                    comment: '动画流畅，但故事情节可以更丰富',
                    content: '我做了一个关于太空探险的动画，主角是一个宇航员，他要在不同的星球上收集宝石。',
                    feedback: '动画制作技术很棒，流畅度很好。建议增加更多的故事情节和角色对话，让故事更吸引人。',
                    files: [
                        {
                            name: '太空探险.sb3',
                            type: 'Scratch项目文件',
                            size: 1890432,
                            url: '/uploads/homework/1_2.sb3'
                        }
                    ]
                },
                {
                    id: '3',
                    homeworkId: '1',
                    homeworkTitle: 'Scratch动画制作',
                    studentId: '3',
                    studentName: '王小华',
                    studentAvatar: '/avatars/student3.jpg',
                    submitTime: '2024-09-17 16:45:00',
                    score: 85,
                    submissionStatus: '2',
                    workPath: '/uploads/homework/1_3.sb3',
                    comment: '基本功能完成，角色互动还需加强',
                    content: '我制作了一个关于小鸟飞行的游戏，玩家可以控制小鸟避开障碍物并收集分数。游戏有3个关卡，每个关卡难度递增。',
                    feedback: '游戏逻辑清晰，关卡设计合理。建议增加更多的角色动画和交互效果，让游戏更生动。',
                    files: [
                        {
                            name: '飞鸟游戏.sb3',
                            type: 'Scratch项目文件',
                            size: 2456789,
                            url: '/uploads/homework/1_3.sb3'
                        },
                        {
                            name: '游戏截图.png',
                            type: '图片',
                            size: 512000,
                            url: '/uploads/homework/1_3_screenshot.png'
                        }
                    ]
                },
                {
                    id: '4',
                    homeworkId: '2',
                    homeworkTitle: 'Python计算器程序',
                    studentId: '4',
                    studentName: '陈小东',
                    studentAvatar: '/avatars/student4.jpg',
                    submitTime: '2024-09-19 20:30:00',
                    score: 95,
                    submissionStatus: '2',
                    workPath: '/uploads/homework/2_4.py',
                    comment: '功能完整，代码规范，有良好的错误处理',
                    content: '我用Python制作了一个功能完整的计算器程序，使用tkinter创建图形界面。程序支持四则运算、括号运算、小数运算等，还添加了历史记录功能。',
                    feedback: '程序功能完整，代码结构清晰，注释详细。界面设计美观，用户体验良好。建议可以增加更多高级功能如科学计算。',
                    files: [
                        {
                            name: 'calculator.py',
                            type: 'Python源文件',
                            size: 12288,
                            url: '/uploads/homework/2_4.py'
                        },
                        {
                            name: '界面截图.png',
                            type: '图片',
                            size: 384000,
                            url: '/uploads/homework/2_4_screenshot.png'
                        }
                    ]
                },
                {
                    id: '5',
                    homeworkId: '2',
                    homeworkTitle: 'Python计算器程序',
                    studentId: '5',
                    studentName: '刘小芳',
                    studentAvatar: '/avatars/student5.jpg',
                    submitTime: '2024-09-18 11:20:00',
                    score: 78,
                    submissionStatus: '2',
                    workPath: '/uploads/homework/2_5.py',
                    comment: '基本功能实现，但缺少异常处理'
                },
                {
                    id: '6',
                    homeworkId: '3',
                    homeworkTitle: '个人网页设计',
                    studentId: '6',
                    studentName: '周小强',
                    studentAvatar: '/avatars/student6.jpg',
                    submitTime: '2024-09-14 19:45:00',
                    score: 90,
                    submissionStatus: '2',
                    workPath: '/uploads/homework/3_6.html',
                    comment: '页面布局美观，CSS样式运用得当'
                },
                {
                    id: '7',
                    homeworkId: '3',
                    homeworkTitle: '个人网页设计',
                    studentId: '7',
                    studentName: '吴小丽',
                    studentAvatar: '/avatars/student7.jpg',
                    submitTime: '2024-09-13 14:20:00',
                    score: 93,
                    submissionStatus: '2',
                    workPath: '/uploads/homework/3_7.html',
                    comment: '创意十足，响应式设计做得很好'
                },
                {
                    id: '8',
                    homeworkId: '1',
                    homeworkTitle: 'Scratch动画制作',
                    studentId: '8',
                    studentName: '赵小龙',
                    studentAvatar: '/avatars/student8.jpg',
                    submitTime: '2024-09-20 22:10:00',
                    score: null,
                    submissionStatus: '1',
                    workPath: '/uploads/homework/1_8.sb3',
                    comment: null,
                    content: '我制作了一个关于恐龙世界的互动故事，用户可以选择不同的路径来探索不同的恐龙和环境。故事包含了教育元素，介绍了各种恐龙的特点。',
                    feedback: null,
                    files: [
                        {
                            name: '恐龙世界.sb3',
                            type: 'Scratch项目文件',
                            size: 3145728,
                            url: '/uploads/homework/1_8.sb3'
                        },
                        {
                            name: '故事脚本.docx',
                            type: '文档',
                            size: 768000,
                            url: '/uploads/homework/1_8_script.docx'
                        },
                        {
                            name: '角色设计图.png',
                            type: '图片',
                            size: 1024000,
                            url: '/uploads/homework/1_8_design.png'
                        }
                    ]
                },
                {
                    id: '9',
                    homeworkId: '1',
                    homeworkTitle: 'Scratch动画制作',
                    studentId: '9',
                    studentName: '孙小梅',
                    studentAvatar: '/avatars/student9.jpg',
                    submitTime: '2024-09-21 15:30:00',
                    score: null,
                    submissionStatus: '1',
                    workPath: '/uploads/homework/1_9.sb3',
                    comment: null
                },
                {
                    id: '10',
                    homeworkId: '2',
                    homeworkTitle: 'Python计算器程序',
                    studentId: '10',
                    studentName: '郑小涛',
                    studentAvatar: '/avatars/student10.jpg',
                    submitTime: '2024-09-08 23:45:00',
                    score: 72,
                    submissionStatus: '4',
                    workPath: '/uploads/homework/2_10.py',
                    comment: '逾期提交，但基本功能正确'
                },
                {
                    id: '11',
                    homeworkId: '3',
                    homeworkTitle: '个人网页设计',
                    studentId: '11',
                    studentName: '林小燕',
                    studentAvatar: '/avatars/student11.jpg',
                    submitTime: '2024-09-22 16:20:00',
                    score: 87,
                    submissionStatus: '2',
                    workPath: '/uploads/homework/3_11.html',
                    comment: '网页设计简洁，但交互效果可以更丰富'
                },
                {
                    id: '12',
                    homeworkId: '2',
                    homeworkTitle: 'Python计算器程序',
                    studentId: '12',
                    studentName: '黄小宇',
                    studentAvatar: '/avatars/student12.jpg',
                    submitTime: '2024-09-23 12:40:00',
                    score: null,
                    submissionStatus: '1',
                    workPath: '/uploads/homework/2_12.py',
                    comment: null
                },
                {
                    id: '13',
                    homeworkId: '3',
                    homeworkTitle: '个人网页设计',
                    studentId: '13',
                    studentName: '杨小兰',
                    studentAvatar: '/avatars/student13.jpg',
                    submitTime: '2024-09-22 18:55:00',
                    score: 91,
                    submissionStatus: '2',
                    workPath: '/uploads/homework/3_13.html',
                    comment: '设计有创意，代码结构规范'
                },
                {
                    id: '14',
                    homeworkId: '1',
                    homeworkTitle: 'Scratch动画制作',
                    studentId: '14',
                    studentName: '马小军',
                    studentAvatar: '/avatars/student14.jpg',
                    submitTime: '2024-09-09 21:15:00',
                    score: 83,
                    submissionStatus: '2',
                    workPath: '/uploads/homework/1_14.sb3',
                    comment: '动画创意不错，但技术实现需要改进'
                },
                {
                    id: '15',
                    homeworkId: '2',
                    homeworkTitle: 'Python计算器程序',
                    studentId: '15',
                    studentName: '田小敏',
                    studentAvatar: '/avatars/student15.jpg',
                    submitTime: '2024-09-10 10:30:00',
                    score: 79,
                    submissionStatus: '2',
                    workPath: '/uploads/homework/2_15.py',
                    comment: '基本功能实现，界面可以更美观'
                },
                {
                    id: '16',
                    homeworkId: '3',
                    homeworkTitle: '个人网页设计',
                    studentId: '16',
                    studentName: '刘小强',
                    studentAvatar: '/avatars/student16.jpg',
                    submitTime: '2024-09-25 20:10:00',
                    score: null,
                    submissionStatus: '3',
                    workPath: null,
                    comment: '需要补交作业'
                },
                {
                    id: '17',
                    homeworkId: '1',
                    homeworkTitle: 'Scratch动画制作',
                    studentId: '17',
                    studentName: '胡小峰',
                    studentAvatar: '/avatars/student17.jpg',
                    submitTime: '2024-09-24 11:45:00',
                    score: 94,
                    submissionStatus: '2',
                    workPath: '/uploads/homework/1_17.sb3',
                    comment: '优秀作品！创意和技术都很出色'
                },
                {
                    id: '18',
                    homeworkId: '2',
                    homeworkTitle: 'Python计算器程序',
                    studentId: '18',
                    studentName: '何小青',
                    studentAvatar: '/avatars/student18.jpg',
                    submitTime: '2024-09-15 14:25:00',
                    score: 86,
                    submissionStatus: '2',
                    workPath: '/uploads/homework/2_18.py',
                    comment: '功能完整，代码清晰易懂'
                }
            ],
            total: 18,
            size: 10,
            current: 1,
            pages: 2
        }
    },

    // 作业统计API
    '/teaching/teachingWork/statistics': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            totalHomework: 25,
            activeHomework: 8,
            completedHomework: 17,
            avgSubmissionRate: 87.5,
            avgScore: 86.8,
            totalSubmissions: 1250,
            pendingGrading: 45,
            typeDistribution: {
                'Scratch': 12,
                'Python': 8,
                'Web': 5
            },
            monthlyStats: [
                {
                    month: '2024-01',
                    published: 8,
                    submitted: 156,
                    avgScore: 85.6
                },
                {
                    month: '2024-02',
                    published: 6,
                    submitted: 134,
                    avgScore: 87.9
                }
            ],
            difficultyStats: {
                '简单': { count: 8, avgScore: 91.2 },
                '中等': { count: 12, avgScore: 85.8 },
                '困难': { count: 5, avgScore: 78.4 }
            }
        }
    },

    // 作业模板API
    '/teaching/teachingWork/templates': {
        success: true,
        message: '操作成功',
        code: 200,
        result: {
            records: [
                {
                    id: 'template001',
                    name: 'Scratch动画制作模板',
                    description: '标准的Scratch动画作业模板，包含基础要求和评分标准',
                    type: '1',
                    difficulty: 2,
                    estimatedTime: 120,
                    requirements: [
                        '至少包含2个角色',
                        '包含背景音乐',
                        '有完整的故事情节'
                    ],
                    rubric: {
                        creativity: { weight: 30, description: '创意性和原创性' },
                        technical: { weight: 40, description: '技术实现质量' },
                        presentation: { weight: 20, description: '作品展示效果' },
                        completion: { weight: 10, description: '完成度' }
                    },
                    usageCount: 15,
                    createTime: '2023-12-01'
                },
                {
                    id: 'template002',
                    name: 'Python编程练习模板',
                    description: 'Python基础编程作业模板，适合初学者',
                    type: '2',
                    difficulty: 3,
                    estimatedTime: 180,
                    requirements: [
                        '代码结构清晰',
                        '有适当的注释',
                        '包含错误处理'
                    ],
                    rubric: {
                        functionality: { weight: 50, description: '功能实现完整性' },
                        codeQuality: { weight: 30, description: '代码质量和规范' },
                        documentation: { weight: 20, description: '代码注释和文档' }
                    },
                    usageCount: 23,
                    createTime: '2023-11-15'
                }
            ],
            total: 2,
            size: 10,
            current: 1
        }
    },

    // 创建新作业API
    '/teaching/teachingWork/add': {
        success: true,
        message: '作业创建成功',
        code: 200,
        result: {
            id: Date.now().toString(), // 使用时间戳作为新ID
            message: '作业已成功创建'
        }
    },

    // 更新作业API
    '/teaching/teachingWork/update': {
        success: true,
        message: '作业更新成功',
        code: 200,
        result: {
            message: '作业信息已成功更新'
        }
    },

    // 删除作业API
    '/teaching/teachingWork/delete': {
        success: true,
        message: '作业删除成功',
        code: 200,
        result: {
            message: '作业已成功删除'
        }
    }
}
