// 资源库管理 - Mock数据
export const resourceData = {
    // 文件夹数据
    folders: [
        {
            id: 'folder001',
            name: 'Scratch课程资源',
            parentId: null,
            description: 'Scratch编程相关的教学资源',
            createTime: '2024-01-10 10:00:00',
            childCount: 15
        },
        {
            id: 'folder002',
            name: 'Python课程资源',
            parentId: null,
            description: 'Python编程相关的教学资源',
            createTime: '2024-01-10 10:00:00',
            childCount: 23
        },
        {
            id: 'folder003',
            name: 'Web开发资源',
            parentId: null,
            description: 'Web前端开发相关的教学资源',
            createTime: '2024-01-10 10:00:00',
            childCount: 18
        },
        {
            id: 'folder004',
            name: '基础教程',
            parentId: 'folder001',
            description: 'Scratch基础教学视频',
            createTime: '2024-01-12 14:30:00',
            childCount: 8
        },
        {
            id: 'folder005',
            name: '进阶项目',
            parentId: 'folder001',
            description: 'Scratch进阶项目案例',
            createTime: '2024-01-12 14:30:00',
            childCount: 7
        },
        {
            id: 'folder006',
            name: '基础语法',
            parentId: 'folder002',
            description: 'Python基础语法教学资源',
            createTime: '2024-01-15 09:15:00',
            childCount: 12
        },
        {
            id: 'folder007',
            name: '项目实战',
            parentId: 'folder002',
            description: 'Python项目实战案例',
            createTime: '2024-01-15 09:15:00',
            childCount: 11
        }
    ],

    // 资源文件数据
    resources: [
    // Scratch基础教程资源
        {
            id: 'res001',
            name: 'Scratch入门指南.pdf',
            originalName: 'Scratch入门指南.pdf',
            size: 2456789,
            type: 'document',
            folderId: 'folder004',
            permission: 'public',
            description: 'Scratch编程入门完整指南，包含基础概念和操作步骤',
            uploadTime: '2024-01-12 15:30:00',
            downloadCount: 156,
            uploader: 'teacher001',
            uploaderName: '张老师',
            fileUrl: '/uploads/resources/scratch-guide.pdf'
        },
        {
            id: 'res002',
            name: 'Scratch界面介绍.mp4',
            originalName: 'Scratch界面介绍.mp4',
            size: 45678901,
            type: 'video',
            folderId: 'folder004',
            permission: 'shared',
            description: 'Scratch软件界面详细介绍视频教程',
            uploadTime: '2024-01-13 10:20:00',
            downloadCount: 89,
            uploader: 'teacher001',
            uploaderName: '张老师',
            fileUrl: '/uploads/resources/scratch-interface.mp4'
        },
        {
            id: 'res003',
            name: '第一个动画项目.sb3',
            originalName: '第一个动画项目.sb3',
            size: 123456,
            type: 'code',
            folderId: 'folder004',
            permission: 'public',
            description: '简单的Scratch动画项目示例，适合初学者',
            uploadTime: '2024-01-13 14:45:00',
            downloadCount: 234,
            uploader: 'teacher001',
            uploaderName: '张老师',
            fileUrl: '/uploads/resources/first-animation.sb3'
        },
        {
            id: 'res004',
            name: 'Scratch积木块说明.docx',
            originalName: 'Scratch积木块说明.docx',
            size: 987654,
            type: 'document',
            folderId: 'folder004',
            permission: 'public',
            description: '详细说明各种Scratch积木块的用法',
            uploadTime: '2024-01-14 09:30:00',
            downloadCount: 178,
            uploader: 'teacher001',
            uploaderName: '张老师',
            fileUrl: '/uploads/resources/scratch-blocks.docx'
        },

        // Scratch进阶项目资源
        {
            id: 'res005',
            name: '小猫捉老鼠游戏.sb3',
            originalName: '小猫捉老鼠游戏.sb3',
            size: 567890,
            type: 'code',
            folderId: 'folder005',
            permission: 'shared',
            description: '经典的小猫捉老鼠游戏项目，包含碰撞检测',
            uploadTime: '2024-01-15 16:20:00',
            downloadCount: 312,
            uploader: 'teacher001',
            uploaderName: '张老师',
            fileUrl: '/uploads/resources/cat-mouse-game.sb3'
        },
        {
            id: 'res006',
            name: '项目制作教程.mp4',
            originalName: '项目制作教程.mp4',
            size: 78901234,
            type: 'video',
            folderId: 'folder005',
            permission: 'shared',
            description: '详细的项目制作过程录屏教程',
            uploadTime: '2024-01-16 11:15:00',
            downloadCount: 145,
            uploader: 'teacher001',
            uploaderName: '张老师',
            fileUrl: '/uploads/resources/project-tutorial.mp4'
        },

        // Python基础语法资源
        {
            id: 'res007',
            name: 'Python基础语法.pptx',
            originalName: 'Python基础语法.pptx',
            size: 3456789,
            type: 'document',
            folderId: 'folder006',
            permission: 'public',
            description: 'Python基础语法PPT课件，包含变量、数据类型、控制结构等',
            uploadTime: '2024-01-18 14:00:00',
            downloadCount: 267,
            uploader: 'teacher002',
            uploaderName: '李老师',
            fileUrl: '/uploads/resources/python-basics.pptx'
        },
        {
            id: 'res008',
            name: 'hello_world.py',
            originalName: 'hello_world.py',
            size: 1024,
            type: 'code',
            folderId: 'folder006',
            permission: 'public',
            description: 'Python第一个程序示例代码',
            uploadTime: '2024-01-18 14:30:00',
            downloadCount: 189,
            uploader: 'teacher002',
            uploaderName: '李老师',
            fileUrl: '/uploads/resources/hello_world.py'
        },
        {
            id: 'res009',
            name: '变量和数据类型.py',
            originalName: '变量和数据类型.py',
            size: 2048,
            type: 'code',
            folderId: 'folder006',
            permission: 'public',
            description: 'Python变量和数据类型演示代码',
            uploadTime: '2024-01-19 10:15:00',
            downloadCount: 156,
            uploader: 'teacher002',
            uploaderName: '李老师',
            fileUrl: '/uploads/resources/variables_datatypes.py'
        },

        // Python项目实战资源
        {
            id: 'res010',
            name: '计算器项目.py',
            originalName: '计算器项目.py',
            size: 4567,
            type: 'code',
            folderId: 'folder007',
            permission: 'shared',
            description: '简单计算器项目完整代码',
            uploadTime: '2024-01-20 15:45:00',
            downloadCount: 234,
            uploader: 'teacher002',
            uploaderName: '李老师',
            fileUrl: '/uploads/resources/calculator.py'
        },
        {
            id: 'res011',
            name: '猜数字游戏.py',
            originalName: '猜数字游戏.py',
            size: 3456,
            type: 'code',
            folderId: 'folder007',
            permission: 'shared',
            description: '有趣的猜数字游戏项目',
            uploadTime: '2024-01-21 09:30:00',
            downloadCount: 178,
            uploader: 'teacher002',
            uploaderName: '李老师',
            fileUrl: '/uploads/resources/guess_number.py'
        },

        // Web开发资源
        {
            id: 'res012',
            name: 'HTML基础教程.pdf',
            originalName: 'HTML基础教程.pdf',
            size: 1234567,
            type: 'document',
            folderId: 'folder003',
            permission: 'public',
            description: 'HTML标签和结构基础教程',
            uploadTime: '2024-01-22 13:20:00',
            downloadCount: 145,
            uploader: 'teacher003',
            uploaderName: '王老师',
            fileUrl: '/uploads/resources/html-basics.pdf'
        },
        {
            id: 'res013',
            name: '第一个网页.html',
            originalName: '第一个网页.html',
            size: 2048,
            type: 'code',
            folderId: 'folder003',
            permission: 'public',
            description: '简单的HTML网页示例',
            uploadTime: '2024-01-22 14:00:00',
            downloadCount: 198,
            uploader: 'teacher003',
            uploaderName: '王老师',
            fileUrl: '/uploads/resources/first-webpage.html'
        },
        {
            id: 'res014',
            name: 'CSS样式入门.zip',
            originalName: 'CSS样式入门.zip',
            size: 5678901,
            type: 'archive',
            folderId: 'folder003',
            permission: 'shared',
            description: 'CSS基础样式示例文件包',
            uploadTime: '2024-01-23 10:45:00',
            downloadCount: 87,
            uploader: 'teacher003',
            uploaderName: '王老师',
            fileUrl: '/uploads/resources/css-basics.zip'
        },

        // 通用资源
        {
            id: 'res015',
            name: '编程思维导图.png',
            originalName: '编程思维导图.png',
            size: 876543,
            type: 'image',
            folderId: null,
            permission: 'public',
            description: '编程学习思维导图，帮助理解编程概念',
            uploadTime: '2024-01-24 16:30:00',
            downloadCount: 267,
            uploader: 'admin',
            uploaderName: '管理员',
            fileUrl: '/uploads/resources/programming-mindmap.png'
        },
        {
            id: 'res016',
            name: '学习计划模板.xlsx',
            originalName: '学习计划模板.xlsx',
            size: 234567,
            type: 'document',
            folderId: null,
            permission: 'public',
            description: '学生学习计划制定模板',
            uploadTime: '2024-01-25 11:20:00',
            downloadCount: 123,
            uploader: 'admin',
            uploaderName: '管理员',
            fileUrl: '/uploads/resources/study-plan-template.xlsx'
        }
    ],

    // 资源分享记录
    resourceShares: [
        {
            id: 'share001',
            resourceId: 'res001',
            resourceName: 'Scratch入门指南.pdf',
            shareMode: 'class',
            targetClasses: ['class001', 'class002'],
            targetStudents: [],
            shareLink: 'https://example.com/share/res001/abc123',
            expiryDate: '2024-06-30',
            createTime: '2024-01-15 14:30:00',
            createdBy: 'teacher001',
            accessCount: 45
        },
        {
            id: 'share002',
            resourceId: 'res005',
            resourceName: '小猫捉老鼠游戏.sb3',
            shareMode: 'student',
            targetClasses: [],
            targetStudents: ['s001', 's002', 's003'],
            shareLink: 'https://example.com/share/res005/def456',
            expiryDate: '2024-03-15',
            createTime: '2024-01-16 10:15:00',
            createdBy: 'teacher001',
            accessCount: 12
        },
        {
            id: 'share003',
            resourceId: 'res010',
            resourceName: '计算器项目.py',
            shareMode: 'link',
            targetClasses: [],
            targetStudents: [],
            shareLink: 'https://example.com/share/res010/ghi789',
            expiryDate: null,
            createTime: '2024-01-20 16:45:00',
            createdBy: 'teacher002',
            accessCount: 89
        }
    ],

    // 资源统计数据
    resourceStats: {
        total: 156,
        totalSize: 2580.5, // MB
        sharedCount: 89,
        monthlyDownloads: 342,
        typeDistribution: {
            video: 45,
            document: 67,
            code: 28,
            image: 12,
            archive: 4
        },
        popularResources: [
            { id: 'res005', name: '小猫捉老鼠游戏.sb3', downloadCount: 312 },
            { id: 'res007', name: 'Python基础语法.pptx', downloadCount: 267 },
            { id: 'res015', name: '编程思维导图.png', downloadCount: 267 },
            { id: 'res003', name: '第一个动画项目.sb3', downloadCount: 234 },
            { id: 'res010', name: '计算器项目.py', downloadCount: 234 }
        ]
    }
}

// 资源库API模拟
export const resourceAPI = {
    // 获取资源列表
    '/resource/list': (params) => {
        const { folderId, pageNo = 1, pageSize = 10 } = params || {}

        // 根据文件夹ID过滤资源
        let filteredResources = resourceData.resources.filter(resource => {
            return resource.folderId === folderId
        })

        // 添加文件夹到结果中（如果在根目录）
        if (!folderId) {
            const rootFolders = resourceData.folders
                .filter(folder => !folder.parentId)
                .map(folder => ({
                    ...folder,
                    isFolder: true,
                    type: 'folder',
                    size: 0,
                    permission: 'private',
                    downloadCount: 0,
                    uploadTime: folder.createTime
                }))
            filteredResources = [...rootFolders, ...filteredResources]
        } else {
            const subFolders = resourceData.folders
                .filter(folder => folder.parentId === folderId)
                .map(folder => ({
                    ...folder,
                    isFolder: true,
                    type: 'folder',
                    size: 0,
                    permission: 'private',
                    downloadCount: 0,
                    uploadTime: folder.createTime
                }))
            filteredResources = [...subFolders, ...filteredResources]
        }

        // 分页处理
        const start = (pageNo - 1) * pageSize
        const end = start + pageSize
        const pagedResources = filteredResources.slice(start, end)

        return {
            success: true,
            message: '操作成功',
            code: 200,
            result: {
                records: pagedResources,
                total: filteredResources.length,
                current: pageNo,
                size: pageSize
            }
        }
    },

    // 获取文件夹列表
    '/resource/folders': () => {
        return {
            success: true,
            message: '操作成功',
            code: 200,
            result: resourceData.folders
        }
    },

    // 获取资源统计
    '/resource/stats': () => {
        return {
            success: true,
            message: '操作成功',
            code: 200,
            result: resourceData.resourceStats
        }
    },

    // 上传资源
    '/resource/upload': (params) => {
        const newResource = {
            id: 'res' + Date.now(),
            ...params,
            uploadTime: new Date().toISOString(),
            downloadCount: 0,
            uploader: 'current_user',
            uploaderName: '当前用户',
            fileUrl: `/uploads/resources/${params.name}`
        }

        resourceData.resources.unshift(newResource)

        // 更新统计
        resourceData.resourceStats.total += 1
        resourceData.resourceStats.totalSize += (params.size / (1024 * 1024))

        return {
            success: true,
            message: '资源上传成功',
            code: 200,
            result: newResource
        }
    },

    // 创建文件夹
    '/resource/createFolder': (params) => {
        const newFolder = {
            id: 'folder' + Date.now(),
            ...params,
            createTime: new Date().toISOString(),
            childCount: 0
        }

        resourceData.folders.push(newFolder)

        return {
            success: true,
            message: '文件夹创建成功',
            code: 200,
            result: newFolder
        }
    },

    // 删除资源
    '/resource/delete': (params) => {
        const { resourceId } = params
        const resourceIndex = resourceData.resources.findIndex(r => r.id === resourceId)

        if (resourceIndex !== -1) {
            const deletedResource = resourceData.resources.splice(resourceIndex, 1)[0]

            // 更新统计
            resourceData.resourceStats.total -= 1
            resourceData.resourceStats.totalSize -= (deletedResource.size / (1024 * 1024))

            return {
                success: true,
                message: '资源删除成功',
                code: 200,
                result: { deletedId: resourceId }
            }
        }

        return {
            success: false,
            message: '资源不存在',
            code: 404
        }
    },

    // 下载资源
    '/resource/download': (params) => {
        const { resourceId } = params
        const resource = resourceData.resources.find(r => r.id === resourceId)

        if (resource) {
            // 增加下载次数
            resource.downloadCount += 1

            // 更新统计
            resourceData.resourceStats.monthlyDownloads += 1

            return {
                success: true,
                message: '下载记录成功',
                code: 200,
                result: {
                    downloadUrl: resource.fileUrl,
                    downloadCount: resource.downloadCount
                }
            }
        }

        return {
            success: false,
            message: '资源不存在',
            code: 404
        }
    },

    // 分享资源
    '/resource/share': (params) => {
        const shareRecord = {
            id: 'share' + Date.now(),
            ...params,
            shareLink: `${window.location.origin}/share/resource/${params.resourceId}/${Math.random().toString(36).substr(2, 9)}`,
            createTime: new Date().toISOString(),
            createdBy: 'current_user',
            accessCount: 0
        }

        resourceData.resourceShares.push(shareRecord)

        // 如果是共享或公开资源，更新统计
        if (params.shareMode !== 'private') {
            resourceData.resourceStats.sharedCount += 1
        }

        return {
            success: true,
            message: '资源分享成功',
            code: 200,
            result: shareRecord
        }
    },

    // 获取分享记录
    '/resource/shares': () => {
        return {
            success: true,
            message: '操作成功',
            code: 200,
            result: resourceData.resourceShares
        }
    }
}
