import Vue from 'vue'
import router from './router'

import NProgress from 'nprogress' // progress bar
import 'nprogress/nprogress.css' // progress bar style

import { ACCESS_TOKEN } from '@/store/mutation-types'

NProgress.configure({ showSpinner: false }) // NProgress Configuration

const whiteList = [
    '/user/register',
    '/user/register-result',
    '/user/alteration',
    '/home',
    '/index',
    '/workList',
    '/courseList',
    '/friend-detail',
    '/work-detail',
    '/newsList',
    '/news-detail'
] // no redirect whitelist - 登录统一在首页

router.beforeEach((to, from, next) => {
    NProgress.start() // start progress bar

    if (Vue.ls.get(ACCESS_TOKEN)) {
    /* has token */
    // 已删除 /user/login 路由，统一在首页登录
    // if (to.path === '/user/login') {
    //   next({ path: INDEX_MAIN_PAGE_PATH })
    //   NProgress.done()
    // } else {
        // 简化权限检查，直接允许访问
        next()
        NProgress.done()
    // }
    } else {
        if (whiteList.includes(to.path)) {
            // 在免登录白名单，直接进入
            next()
            NProgress.done()
        } else {
            next({ path: '/home', query: { redirect: to.fullPath } })
            NProgress.done() // if current page is login will not trigger afterEach hook, so manually handle it
        }
    }
})

router.afterEach(() => {
    NProgress.done() // finish progress bar
})
