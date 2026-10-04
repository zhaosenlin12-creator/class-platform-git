export const courseSystemOptions = [
    { value: 'python', label: 'Python' },
    { value: 'cpp', label: 'C++' },
    { value: 'scratch', label: 'Scratch' },
    { value: 'jcode', label: 'JCODE' },
    { value: 'small-block', label: '小颗粒' },
    { value: 'large-block', label: '大颗粒' }
]

export const stageOptions = [
    { value: 'phase-1', label: '第一阶段' },
    { value: 'phase-2', label: '第二阶段' },
    { value: 'phase-3', label: '第三阶段' },
    { value: 'phase-4', label: '第四阶段' },
    { value: 'phase-5', label: '第五阶段' },
    { value: 'phase-6', label: '第六阶段' },
    { value: 'foundation', label: '基础巩固' },
    { value: 'advanced', label: '能力进阶' },
    { value: 'project', label: '项目实战' },
    { value: 'extension', label: '综合拓展' }
]

export const resourceTypeOptions = [
    { value: 'all', label: '全部资源' },
    { value: 'ppt', label: 'PPT课件' },
    { value: 'document', label: '文档资料' },
    { value: 'video', label: '视频教程' },
    { value: 'code', label: '代码示例' },
    { value: 'pdf', label: 'PDF文档' },
    { value: 'image', label: '图片资源' },
    { value: 'audio', label: '音频资源' },
    { value: 'ai_package', label: 'AI资源包' }
]

const courseSystemMap = courseSystemOptions.reduce((acc, item) => {
    acc[item.value] = item.label
    return acc
}, {})

const stageMap = stageOptions.reduce((acc, item) => {
    acc[item.value] = item.label
    return acc
}, {})

const resourceTypeMap = resourceTypeOptions.reduce((acc, item) => {
    acc[item.value] = item.label
    return acc
}, {})

export function getCourseSystemLabel (value) {
    return courseSystemMap[value] || value || '未分类'
}

export function getCourseStageLabel (value) {
    return stageMap[value] || value || '未分阶段'
}

export function getResourceTypeLabel (value) {
    return resourceTypeMap[value] || value || '其他资源'
}
