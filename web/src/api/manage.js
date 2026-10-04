import Vue from 'vue'
import { axios } from '@/utils/request'
import { getConfiguredBaseUrl } from '@/utils/runtimeBaseUrl'

import store from '../store/'

const api = {
    user: '/api/user',
    role: '/api/role',
    service: '/api/service',
    permission: '/api/permission',
    permissionNoPager: '/api/permission/no-pager'
}

export default api

// post
export function postAction (url, parameter) {
    return axios({
        url: url,
        method: 'post',
        data: parameter
    })
}

// post method= {post | put}
export function httpAction (url, parameter, method) {
    return axios({
        url: url,
        method: method,
        data: parameter
    })
}

// put
export function putAction (url, parameter) {
    return axios({
        url: url,
        method: 'put',
        data: parameter
    })
}

// get
export function getAction (url, parameter) {
    return axios({
        url: url,
        method: 'get',
        params: parameter
    })
}

// deleteAction
export function deleteAction (url, parameter) {
    return axios({
        url: url,
        method: 'delete',
        params: parameter
    })
}

export function getUserList (parameter) {
    return axios({
        url: api.user,
        method: 'get',
        params: parameter
    })
}

export function getRoleList (parameter) {
    return axios({
        url: api.role,
        method: 'get',
        params: parameter
    })
}

export function getServiceList (parameter) {
    return axios({
        url: api.service,
        method: 'get',
        params: parameter
    })
}

export function getPermissions (parameter) {
    return axios({
        url: api.permissionNoPager,
        method: 'get',
        params: parameter
    })
}

// id == 0 add     post
// id != 0 update  put
export function saveService (parameter) {
    return axios({
        url: api.service,
        method: Number(parameter.id) === 0 ? 'post' : 'put',
        data: parameter
    })
}

/**
 * 婵炴垶鎸搁鍫澝归崶顒€妫橀柛銉檮椤?闂佹椿娼块崝瀣姳閻炵幙cel闁诲海鏁搁崢褔宕?
 * @param url
 * @param parameter
 * @returns {*}
 */
export function downFile (url, parameter) {
    return axios({
        url: url,
        params: parameter,
        method: 'get',
        responseType: 'blob'
    })
}

/**
 * 婵炴垶鎸搁鍫澝归崶顒€妫橀柛銉檮椤?
 * @param url 闂佸搫鍊稿ú锝呪枎閵忋垺宕夋い鏍ㄦ皑缁?
 * @param fileName 闂佸搫鍊稿ú锝呪枎閵忋倕瑙?
 * @param parameter
 * @returns {*}
 */
export function downloadFile (url, fileName, parameter) {
    return downFile(url, parameter).then((data) => {
        if (!data || data.size === 0) {
            Vue.prototype['$message'].warning('闂佸搫鍊稿ú锝呪枎閵忥紕鈻旈悗锝庡幗缁佹澘顭块幆鎵翱閻?')
            return
        }
        if (typeof window.navigator.msSaveBlob !== 'undefined') {
            window.navigator.msSaveBlob(new Blob([data]), fileName)
        } else {
            let url = window.URL.createObjectURL(new Blob([data]))
            let link = document.createElement('a')
            link.style.display = 'none'
            link.href = url
            link.setAttribute('download', fileName)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link) // 婵炴垶鎸搁鍫澝归崶鈹惧亾閻熺増婀伴柛銊︽皑缁梹绻濆顓犲綉闂佺绻愰崯鎵矆?
            window.URL.revokeObjectURL(url) // 闂備焦褰冮敃銉╁棘娓氣偓楠炴帗绻呴埡鈺玝闁诲海鏁搁、濠囨寘?
        }
    })
}

/**
 * 闂佸搫鍊稿ú锝呪枎閵忥紕鈻斿┑鐘辫兌閻?闂佹椿娼块崝瀣姳椤掑倵鍋撻棃娑欐拱闁哄鍟村鐢割敄鐠恒劎鎲繛纾嬪亹婵潙霉濮椻偓閹?
 * @param url
 * @param parameter
 * @returns {*}
 */
export function uploadAction (url, parameter) {
    return axios({
        url: url,
        data: parameter,
        method: 'post'
    })
}

/**
 * 闂佸吋鍎抽崲鑼躲亹閸ヮ剙妫橀柛銉檮椤愪粙鏌￠崼婵埿㈠┑顔惧枔閹峰宕稿Δ渚婄椽闁荤姳璀﹂崹鎵?
 * @param avatar
 * @param subStr
 * @returns {*}
 */
export function getFileAccessHttpUrl (path, subStr) {
    if (!subStr) subStr = 'http'
    if (path && (/^(data:|blob:|https?:\/\/|\/\/)/i.test(path) || path.startsWith(subStr))) {
        return path
    } else {
        if (path && path.length > 0 && path.indexOf('[') === -1) {
            // 濠电儑缍€椤曆勬叏閻愮數鐭氶柛婵嗗閸嬫捇宕楃喊杈ㄢ挄闂佸搫琚崕鑽ゆ濠靛鈷撻柛娆忣樈閸撻箖姊洪弶璺ㄐら柣銈呮瀵敻顢旈崟顐奖闁哄鍋犳慨銈咁渻閸岀偛绠柕澶嗘櫆閺?
            const sysConfig = store.getters.sysConfig || {}
            const normalizedPath = String(path).replace(/^\/+/, '')
            if (sysConfig.uploadType === 'qiniu') {
                return `${(sysConfig.qiniuDomain || '').replace(/\/+$/, '')}/${normalizedPath}`
            } else {
                const baseUrl = getConfiguredBaseUrl(sysConfig.staticDomain)
                return `${baseUrl}/${normalizedPath}`
            }
        }
    }
}

/**
 * 闂佸吋鍎抽崲鑼躲亹閸ヮ剙妫橀柛銉檮椤愯棄螞閺夊灝顏い?
 * @param path
 */
export function getFilePrevew (path) {
    if (!path) return null
    let ssl = ''
    if (path.startsWith('aes:')) {
        path = path.slice(4)
    } else if (path.startsWith('aess:')) {
        path = path.slice(5)
        ssl = '&ssl=1'
    } else if (!/^(data:|blob:|http:|https:)/i.test(path)) {
        path = getFileAccessHttpUrl(path)
    }
    switch (store.getters.sysConfig.filePreview) {
    case 'ow365':
        return `http://ow365.cn/?i=${store.getters.sysConfig.owId}${ssl}&n=5&furl=` + path
    case 'officeapps':
        return 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(path)
    case 'kkfileview':
        return location.protocol + '//' + location.host + `:8012/preview/onlinePreview?url=` + encodeURIComponent(window.btoa(unescape(encodeURIComponent(path))))
    default:
        return path
    }
}

// 闂佸吋鍎抽崲鑼躲亹閸ヮ亗浜归柟鎯у暱椤ゅ懘姊洪弶璺ㄐら柣?
export function getSysConfig () {
    return axios({
        url: '/sys/config/getCurrentConfig'
    })
}
// 闂佸吋鍎抽崲鑼躲亹閸ヮ剚鍤曟繝濠傚暙缁€?
export function getMenu () {
    return axios({
        url: '/teaching/menu/getUserMenu'
    })
}
