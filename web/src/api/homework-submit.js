import request from '@/utils/request'

// ... 其他导出

/**
 * 提交作业
 */
export function submitHomework (data) {
    return request({
        url: '/homework/submit',
        method: 'post',
        data
    })
}
