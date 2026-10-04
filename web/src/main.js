import Vue from 'vue'
import App from './App.vue'
import Storage from 'vue-ls'
import router from './router'
import store from './store/'

import { VueAxios } from '@/utils/request'

import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/antd.less' // or 'ant-design-vue/dist/antd.less'

import '@/permission' // permission control
import '@/router/permission-guard' // route permission guard

import '@/utils/filter' // base filter
import permissionDirective from '@/directive/permission' // permission directive
import LazyLoad from '@/directive/lazyload' // 图片懒加载指令
import moment from 'moment'
import 'moment/locale/zh-cn'
/* import '@babel/polyfill' */

// swiper
// Swiper 5.x CSS 路径调整（某些环境下不再提供 dist 目录）

import {
    ACCESS_TOKEN,
    DEFAULT_COLOR,
    DEFAULT_THEME,
    DEFAULT_LAYOUT_MODE,
    DEFAULT_COLOR_WEAK,
    SIDEBAR_TYPE,
    DEFAULT_FIXED_HEADER,
    DEFAULT_FIXED_HEADER_HIDDEN,
    DEFAULT_FIXED_SIDEMENU,
    DEFAULT_CONTENT_WIDTH_TYPE,
    DEFAULT_MULTI_PAGE,
    SYS_CONFIG,
    MENU,
    USER_INFO,

    USER_ROLE
} from '@/store/mutation-types'
import config from '@/defaultSettings'

import JDictSelectTag from './components/dict/index.js'
import hasPermission from '@/utils/hasPermission'
import vueBus from '@/utils/vueBus'
import JeecgComponents from '@/components/jeecg/index'
import { ErrorHandler } from '@/utils/errorHandler'
import { getSysConfig, getMenu } from '@/api/manage'

// 导入性能监控和懒加载工具
import { PerformanceMonitorPlugin } from '@/utils/performanceMonitor'

// 引入全局错误处理和用户友好提示
import GlobalHandlers from '@/plugins/globalHandlers'
// 颜色选择器
import { resolveTeachingAccess } from '@/utils/teachingAccess'
moment.locale('zh-cn')

const runtimeConsole = typeof window !== 'undefined' && window.console
    ? window.console
    : global.console

const console = typeof window !== 'undefined' && window.__APP_DEBUG__ === true
    ? runtimeConsole
    : {
        log () {},
        warn () {},
        error (...args) {
            return runtimeConsole && runtimeConsole.error
                ? runtimeConsole.error(...args)
                : undefined
        }
    }

const resolvePersistedUserType = ({ token = '', userInfo = {}, userRole = [] } = {}) => {
    const access = resolveTeachingAccess({
        userRole,
        userType: userInfo && (userInfo.userType || userInfo.type) ? (userInfo.userType || userInfo.type) : '',
        userInfo: userInfo || {}
    })

    if (access.isStudent) {
        return 'student'
    }

    if (access.isAdmin) {
        return 'admin'
    }

    if (token || access.hasRole) {
        return 'teacher'
    }

    return ''
}


Vue.config.productionTip = false

// 注册权限指令
Vue.directive('permission', permissionDirective)

// 注册优化版懒加载指令
Vue.use(LazyLoad)

Vue.use(Storage, config.storageOptions)
Vue.use(Antd)
Vue.use(VueAxios, router)
Vue.use(hasPermission)
Vue.use(JDictSelectTag)
Vue.use(vueBus)
Vue.use(JeecgComponents)

// 注册moment为全局属性
Vue.prototype.$moment = moment

// 使用性能监控插件
Vue.use(PerformanceMonitorPlugin, {
    enableConsoleLog: process.env.NODE_ENV === 'development',
    enableAnalytics: process.env.NODE_ENV === 'production',
    sampleRate: 0.1
})
Vue.use(GlobalHandlers)

let cacheTime = 1800000 // 缓存时间

const start = async () => {
    if (typeof window !== 'undefined') {
        window.__LOGGING_OUT__ = false
    }
    // 初始化网络状态监控
    ErrorHandler.initNetworkMonitoring()

    // ========== 【关键】在任何操作之前，先恢复登录状态到store ==========
    const savedToken = Vue.ls.get(ACCESS_TOKEN)
    const savedUserInfo = Vue.ls.get(USER_INFO)
    const savedUserRole = Vue.ls.get(USER_ROLE)
    const restoredUserType = resolvePersistedUserType({
        token: savedToken,
        userInfo: savedUserInfo,
        userRole: savedUserRole
    })

    if (savedToken) {
        console.log('🔄 [INIT] 恢复Token到Store...')
        store.commit('SET_TOKEN', savedToken)

        if (savedUserInfo) {
            store.commit('SET_INFO', savedUserInfo)
            store.commit('SET_NAME', {
                username: savedUserInfo.username,
                realname: savedUserInfo.realname || savedUserInfo.realName,
                welcome: '欢迎回来'
            })
            store.commit('SET_AVATAR', savedUserInfo.avatar)
        }

        if (savedUserRole) {
            store.commit('SET_USER_ROLE', savedUserRole)
        }

        if (restoredUserType) {
            store.commit('SET_USER_TYPE', restoredUserType)
        }

        store.commit('SET_LOGIN_STATUS', 'logged_in')
        console.log('✅ [INIT] 登录状态已恢复')
    }

    // 获取配置
    let sysConfig = store.getters.sysConfig
    let getConfigCallback = function (res) {
        if (res.success) {
            sysConfig = res.result
            Vue.ls.set(SYS_CONFIG, sysConfig, cacheTime)
            store.commit('SET_SYS_CONFIG', sysConfig)
        }
    }
    if (!sysConfig) {
        await getSysConfig().then(getConfigCallback).catch(err => {
            console.warn('获取系统配置失败,使用默认配置:', err.message)
        })
    } else {
        getSysConfig().then(getConfigCallback).catch(err => {
            console.warn('获取系统配置失败,使用默认配置:', err.message)
        })
    }
    // 获取菜单 - 仅在已登录时获取
    const token = Vue.ls.get(ACCESS_TOKEN)
    if (token) {
    // 用户已登录，获取菜单
        if (store.getters.menuList == null) {
            await getMenu().then(res => {
                const menuData = (res && res.result && Array.isArray(res.result.menu))
                    ? res.result.menu
                    : []
                Vue.ls.set(MENU, menuData, cacheTime)
                store.commit('SET_MENU', menuData)
            }).catch(err => {
                console.warn('获取菜单失败,将使用Mock数据:', err.message)
                // 注意：不要在这里清除token，因为这可能是网络错误而非token过期
                // token过期应该由axios拦截器统一处理
            })
        } else {
            getMenu().then(res => {
                const menuData = (res && res.result && Array.isArray(res.result.menu))
                    ? res.result.menu
                    : []
                Vue.ls.set(MENU, menuData, cacheTime)
                store.commit('SET_MENU', menuData)
            }).catch(err => {
                console.warn('获取菜单失败,将使用Mock数据:', err.message)
                // 注意：不要在这里清除token，因为这可能是网络错误而非token过期
                // token过期应该由axios拦截器统一处理
            })
        }
    } else {
        console.log('用户未登录，跳过菜单获取')
    }

    new Vue({
        router,
        store,
        created () {
            const config = sysConfig || store.getters.sysConfig || {}
            if (config.brandName) {
                window.document.title = config.brandName
            }
            if (config.customJS) {
                let script = document.createElement('script')
                script.type = 'text/javascript'
                script.textContent = config.customJS
                document.head.appendChild(script)
            }
            if (config.customCss) {
                let style = document.createElement('style')
                style.type = 'text/css'
                style.textContent = config.customCss
                document.head.appendChild(style)
            }
        },
        mounted () {
            // 恢复UI配置
            store.commit('SET_SIDEBAR_TYPE', Vue.ls.get(SIDEBAR_TYPE, true))
            store.commit('TOGGLE_THEME', Vue.ls.get(DEFAULT_THEME, config.navTheme))
            store.commit('TOGGLE_LAYOUT_MODE', Vue.ls.get(DEFAULT_LAYOUT_MODE, config.layout))
            store.commit('TOGGLE_FIXED_HEADER', Vue.ls.get(DEFAULT_FIXED_HEADER, config.fixedHeader))
            store.commit('TOGGLE_FIXED_SIDERBAR', Vue.ls.get(DEFAULT_FIXED_SIDEMENU, config.fixSiderbar))
            store.commit('TOGGLE_CONTENT_WIDTH', Vue.ls.get(DEFAULT_CONTENT_WIDTH_TYPE, config.contentWidth))
            store.commit('TOGGLE_FIXED_HEADER_HIDDEN', Vue.ls.get(DEFAULT_FIXED_HEADER_HIDDEN, config.autoHideHeader))
            store.commit('TOGGLE_WEAK', Vue.ls.get(DEFAULT_COLOR_WEAK, config.colorWeak))
            store.commit('TOGGLE_COLOR', Vue.ls.get(DEFAULT_COLOR, config.primaryColor))
            store.commit('SET_MULTI_PAGE', Vue.ls.get(DEFAULT_MULTI_PAGE, config.multipage))
            // 注意：登录状态恢复已移至 start() 函数开头，确保在任何API请求之前完成
        },
        render: h => h(App)
    }).$mount('#app')
}

start()
