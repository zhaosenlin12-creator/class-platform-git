<template>
  <a-layout class="layout" :class="[device, userIdentity]">

    <template v-if="layoutMode === 'sidemenu'">
      <a-drawer
        v-if="device === 'mobile'"
        :wrapClassName="'drawer-sider ' + navTheme"
        placement="left"
        @close="() => this.collapsed = false"
        :closable="false"
        :visible="collapsed"
        width="200px"
      >
        <side-menu
          mode="inline"
          :menus="menus"
          @menuSelect="menuSelect"
          :theme="navTheme"
          :collapsed="false"
          :collapsible="true"></side-menu>
      </a-drawer>

      <side-menu
        v-else
        mode="inline"
        :menus="menus"
        @menuSelect="myMenuSelect"
        :theme="navTheme"
        :collapsed="collapsed"
        :collapsible="true"></side-menu>
    </template>
    <!-- 下次优化这些代码 -->
    <template v-else>
      <a-drawer
        v-if="device === 'mobile'"
        :wrapClassName="'drawer-sider ' + navTheme"
        placement="left"
        @close="() => this.collapsed = false"
        :closable="false"
        :visible="collapsed"
        width="200px"
      >
        <side-menu
          mode="inline"
          :menus="menus"
          @menuSelect="menuSelect"
          :theme="navTheme"
          :collapsed="false"
          :collapsible="true"></side-menu>
      </a-drawer>
    </template>

    <a-layout
      :class="[layoutMode, `content-width-${contentWidth}`]"
      :style="{ paddingLeft: fixSiderbar && isDesktop() ? `${sidebarOpened ? 200 : 80}px` : '0' }">
      <!-- layout header -->
      <global-header
        :mode="layoutMode"
        :menus="menus"
        :theme="navTheme"
        :collapsed="collapsed"
        :device="device"
        @toggle="toggle"
      />

      <!-- layout content -->
      <a-layout-content :style="{ height: '100%', paddingTop: fixedHeader ? '59px' : '0' }">
        <slot></slot>
      </a-layout-content>

      <!-- layout footer -->
      <a-layout-footer style="padding: 0px">
        <global-footer/>
      </a-layout-footer>
    </a-layout>

    <!-- 在线帮助组件 - 暂时隐藏，待完善后开启 -->
    <!-- <online-help /> -->

    <!-- update-start---- author:os_chengtgen -- date:20190830 --  for:issues/463 -编译主题颜色已生效，但还一直转圈，显示主题 正在编译 ---- -->
    <!--<setting-drawer></setting-drawer>-->
    <!-- update-end---- author:os_chengtgen -- date:20190830 --  for:issues/463 -编译主题颜色已生效，但还一直转圈，显示主题 正在编译 ---- -->
  </a-layout>
</template>

<script>
import SideMenu from '@/components/menu/SideMenu'
import GlobalHeader from '@/components/page/GlobalHeader'
import GlobalFooter from '@/components/page/GlobalFooter'
import OnlineHelp from '@/components/help/OnlineHelp'
// update-start---- author:os_chengtgen -- date:20190830 --  for:issues/463 -编译主题颜色已生效，但还一直转圈，显示主题 正在编译 ------
// import SettingDrawer from '@/components/setting/SettingDrawer'
// 注释这个因为在个人设置模块已经加载了SettingDrawer页面
// update-end ---- author:os_chengtgen -- date:20190830 --  for:issues/463 -编译主题颜色已生效，但还一直转圈，显示主题 正在编译 ------

import { triggerWindowResizeEvent } from '@/utils/util'
import { mapState, mapActions } from 'vuex'
import { mixin, mixinDevice } from '@/utils/mixin.js'
import { initMobileOptimization, mobileOptimizationMixin } from '@/utils/mobileOptimization'

export default {
    name: 'GlobalLayout',
    components: {
        SideMenu,
        GlobalHeader,
        GlobalFooter,
        OnlineHelp
        // update-start---- author:os_chengtgen -- date:20190830 --  for:issues/463 -编译主题颜色已生效，但还一直转圈，显示主题 正在编译 ------
        // // SettingDrawer
        // 注释这个因为在个人设置模块已经加载了SettingDrawer页面
        // update-end ---- author:os_chengtgen -- date:20190830 --  for:issues/463 -编译主题颜色已生效，但还一直转圈，显示主题 正在编译 ------

    },
    mixins: [mixin, mixinDevice, mobileOptimizationMixin],
    data () {
        return {
            collapsed: false,
            activeMenu: {},
            menus: [],
            userIdentity: 'student' // student admin
        }
    },
    computed: {
        ...mapState({
        // 主路由
            mainRouters: state => state.permission.addRouters,
            // 后台菜单
            permissionMenuList: state => state.user.permissionList
        })
    },
    watch: {
        sidebarOpened (val) {
            this.collapsed = !val
        }
    },
    created () {
        if (this.$store.getters.userInfo && this.$store.getters.userInfo.userIdentity == 2) {
            this.userIdentity = 'admin'
        } else {
            this.userIdentity = 'student'
        }
        // --update-begin----author:scott---date:20190320------for:根据后台菜单配置，判断是否路由菜单字段，动态选择是否生成路由（为了支持参数URL菜单）------
        // this.menus = this.mainRouters.find((item) => item.path === '/').children;
        this.menus = this.permissionMenuList
        // 根据后台配置菜单，重新排序加载路由信息
        // --update-end----author:scott---date:20190320------for:根据后台菜单配置，判断是否路由菜单字段，动态选择是否生成路由（为了支持参数URL菜单）------
    },
    mounted () {
        // 初始化移动端优化
        if (this.isMobile() || this.isTablet()) {
            initMobileOptimization()
            this.setupMobileGestures()
        }
    },
    methods: {
        ...mapActions(['setSidebar']),
        toggle () {
            this.collapsed = !this.collapsed
            this.setSidebar(!this.collapsed)
            triggerWindowResizeEvent()
        },
        menuSelect () {
            if (!this.isDesktop()) {
                this.collapsed = false
            }
        },
        // update-begin-author:taoyan date:20190430 for:动态路由title显示配置的菜单title而不是其对应路由的title
        myMenuSelect (value) {
        // 此处触发动态路由被点击事件
            this.findMenuBykey(this.menus, value.key)
            this.$emit('dynamicRouterShow', value.key, this.activeMenu.meta.title)
            // update-begin-author:sunjianlei date:20191223 for: 修复刷新后菜单Tab名字显示异常
            let storeKey = 'route:title:' + this.activeMenu.path
            this.$ls.set(storeKey, this.activeMenu.meta.title)
        // update-end-author:sunjianlei date:20191223 for: 修复刷新后菜单Tab名字显示异常
        },
        findMenuBykey (menus, key) {
            for (let i of menus) {
                if (i.path == key) {
                    this.activeMenu = { ...i }
                } else if (i.children && i.children.length > 0) {
                    this.findMenuBykey(i.children, key)
                }
            }
        },
        // update-end-author:taoyan date:20190430 for:动态路由title显示配置的菜单title而不是其对应路由的title

        // 移动端手势支持
        setupMobileGestures () {
        // 监听移动端侧边栏手势
            document.addEventListener('mobile:openSidebar', () => {
                if (this.isMobile() && !this.collapsed) {
                    this.collapsed = false
                    this.setSidebar(true)
                }
            })

            document.addEventListener('mobile:closeSidebar', () => {
                if (this.isMobile() && this.collapsed) {
                    this.collapsed = true
                    this.setSidebar(false)
                }
            })

            // 监听滑动手势
            document.addEventListener('swipegesture', (e) => {
                if (!this.isMobile()) return

                const { direction, distance } = e.detail

                // 右滑打开侧边栏
                if (direction === 'right' && distance > 100 && !this.collapsed) {
                    this.collapsed = false
                    this.setSidebar(true)
                }
                // 左滑关闭侧边栏
                else if (direction === 'left' && distance > 100 && this.collapsed) {
                    this.collapsed = true
                    this.setSidebar(false)
                }
            })
        },

        // 优化触摸事件
        handleTouchOptimization () {
            if (!this.isTouchDevice()) return

            // 为重要按钮添加触摸反馈
            const buttons = document.querySelectorAll('.ant-btn, .ant-menu-item')
            buttons.forEach(button => {
                button.addEventListener('touchstart', (e) => {
                    button.classList.add('touch-feedback')
                }, { passive: true })

                button.addEventListener('touchend', (e) => {
                    setTimeout(() => {
                        button.classList.remove('touch-feedback')
                    }, 150)
                }, { passive: true })
            })
        }
    }
}

</script>

<style lang="less">
  body {
    // 打开滚动条固定显示
    overflow-y: scroll;

    &.colorWeak {
      filter: invert(80%);
    }
  }

  .layout {
    min-height: 100vh !important;
    overflow-x: hidden;

    &.mobile {

      .ant-layout-content {

        .content {
          margin: 24px 0 0;
        }
      }

      /**
       * ant-table-wrapper
       * 覆盖的表格手机模式样式，如果想修改在手机上表格最低宽度，可以在这里改动
       */
      .ant-table-wrapper {
        .ant-table-content {
          overflow-y: auto;
        }
        .ant-table-body {
          min-width: 800px;
        }
      }
      .sidemenu {
        .ant-header-fixedHeader {

          &.ant-header-side-opened, &.ant-header-side-closed {
            width: 100%
          }
        }
      }

      .topmenu {
        /* 必须为 topmenu  才能启用流式布局 */
        &.content-width-Fluid {
          .header-index-wide {
            margin-left: 0;
          }
        }
      }
      .header, .top-nav-header-index {
        .user-wrapper .action {
          padding: 0 12px;
        }
      }
    }

    &.ant-layout-has-sider {
      flex-direction: row;
    }

    .trigger {
      font-size: 22px;
      line-height: 42px;
      padding: 0 18px;
      cursor: pointer;
      transition: color 300ms, background 300ms;

      &:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    }

    .topmenu {
      .ant-header-fixedHeader {
        position: fixed;
        top: 0;
        right: 0;
        z-index: 9;
        width: 100%;
        transition: width .2s;

        &.ant-header-side-opened {
          width: 100%;
        }

        &.ant-header-side-closed {
          width: 100%;
        }
      }
      /* 必须为 topmenu  才能启用流式布局 */
      &.content-width-Fluid {
        .header-index-wide {
          max-width: unset;
          margin-left: 24px;
        }

        .page-header-index-wide {
          max-width: unset;
        }
      }

    }

    .sidemenu {
      .ant-header-fixedHeader {
        position: fixed;
        top: 0;
        right: 0;
        z-index: 9;
        width: 100%;
        transition: width .2s;

        &.ant-header-side-opened {
          width: calc(100% - 200px)
        }

        &.ant-header-side-closed {
          width: calc(100% - 80px)
        }
      }
    }

    .header {
      height: 64px;
      padding: 0 12px 0 0;
      background: #fff;
      box-shadow: 0 1px 4px rgba(0, 21, 41, .08);
      position: relative;
    }

    .header, .top-nav-header-index {

      .user-wrapper {
        float: right;
        height: 100%;

        .action {
          cursor: pointer;
          padding: 0 14px;
          display: inline-block;
          transition: all .3s;

          height: 70%;
          line-height: 46px;

          &.action-full {
            height: 100%;
          }

          &:hover {
            background: rgba(255, 255, 255, 0.3);
          }

          .avatar {
            margin: 20px 10px 20px 0;
            color: #1890ff;
            background: hsla(0, 0%, 100%, .85);
            vertical-align: middle;
          }

          .icon {
            font-size: 16px;
            padding: 4px;
          }

          .anticon {
            color: white;
          }
        }
      }

      &.dark {
        .user-wrapper {

          .action {
            color: black;

            &:hover {
              background: rgba(0, 0, 0, 0.05);
            }

            .anticon {
              color: black;
            }
          }
        }
      }
    }

    &.mobile {
      .top-nav-header-index {

        .header-index-wide {

          .header-index-left {

            .trigger {
              color: rgba(255, 255, 255, 0.85);
              padding: 0 12px;
            }

            .logo.top-nav-header {
              text-align: center;
              width: 56px;
              line-height: 58px;
            }
          }
        }

        .user-wrapper .action .avatar {
          margin: 20px 0;
        }

        &.light {

          .header-index-wide {

            .header-index-left {
              .trigger {
                color: rgba(0, 0, 0, 0.65);
              }
            }
          }
          //
        }
      }
    }

    &.tablet {
      // overflow: hidden; text-overflow:ellipsis; white-space: nowrap;
      .top-nav-header-index {

        .header-index-wide {

          .header-index-left {
            .logo > a {
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }
        }
      }

    }

    .top-nav-header-index {
      box-shadow: 0 1px 4px rgba(0, 21, 41, .08);
      position: relative;
      transition: background .3s, width .2s;

      .header-index-wide {
        width: 100%;
        margin: auto;
        padding: 0 20px 0 0;
        display: flex;
        height: 59px;

        .ant-menu.ant-menu-horizontal {
          border: none;
          height: 64px;
          line-height: 64px;
        }

        .header-index-left {
          flex: 1 1;
          display: flex;

          .logo.top-nav-header {
            width: 165px;
            height: 64px;
            position: relative;
            line-height: 64px;
            transition: all .3s;
            overflow: hidden;

            img {
              display: inline-block;
              vertical-align: middle;
              height: 32px;
            }

            h1 {
              color: #fff;
              display: inline-block;
              vertical-align: top;
              font-size: 16px;
              margin: 0 0 0 12px;
              font-weight: 400;
            }
          }
        }

        .header-index-right {
          float: right;
          height: 59px;
          overflow: hidden;
          .action:hover {
            background-color: rgba(0, 0, 0, 0.05);
          }
        }
      }

      &.light {
        background-color: #fff;

        .header-index-wide {
          .header-index-left {
            .logo {
              h1 {
                color: #002140;
              }
            }
          }
        }
      }

      &.dark {

        .user-wrapper {

          .action {
            color: white;

            &:hover {
              background: rgba(255, 255, 255, 0.3);
            }
          }
        }
        .header-index-wide .header-index-left .trigger:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      }

    }

    // 内容区
    .layout-content {
      margin: 24px 24px 0px;
      height: 64px;
      padding: 0 12px 0 0;
    }

  }

  .topmenu {
    .page-header-index-wide {
      margin: 0 auto;
      width: 100%;
    }
  }

  // drawer-sider 自定义
  .ant-drawer.drawer-sider {
    .sider {
      box-shadow: none;
    }

    &.dark {
      .ant-drawer-content {
        background-color: rgb(0, 21, 41);
      }
    }
    &.light {
      box-shadow: none;
      .ant-drawer-content {
        background-color: #fff;
      }
    }

    .ant-drawer-body {
      padding: 0
    }
  }

  // 菜单样式
  .sider {
    box-shadow: 2px 116px 6px 0 rgba(0, 21, 41, .35);
    position: relative;
    z-index: 10;

    &.ant-fixed-sidemenu {
      position: fixed;
      height: 100%;
    }

    .logo {
      height: 64px;
      position: relative;
      line-height: 64px;
      padding-left: 24px;
      -webkit-transition: all .3s;
      transition: all .3s;
      background: #002140;
      overflow: hidden;

      img, h1 {
        display: inline-block;
        vertical-align: middle;
      }

      img {
        height: 32px;
      }

      h1 {
        color: #fff;
        font-size: 18px;
        margin: 0 0 0 8px;
        font-family: "Chinese Quote", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        font-weight: 600;
      }
    }

    &.light {
      background-color: #fff;
      box-shadow: 2px 116px 8px 0 rgba(29, 35, 41, 0.05);

      .logo {
        background: #fff;
        box-shadow: 1px 1px 0 0 #e8e8e8;

        h1 {
          color: unset;
        }
      }

      .ant-menu-light {
        border-right-color: transparent;
      }
    }

  }

  // 外置的样式控制
  .user-dropdown-menu-wrapper.ant-dropdown-menu {
    padding: 4px 0;

    .ant-dropdown-menu-item {
      width: 160px;
    }

    .ant-dropdown-menu-item > .anticon:first-child,
    .ant-dropdown-menu-item > a > .anticon:first-child,
    .ant-dropdown-menu-submenu-title > .anticon:first-child
    .ant-dropdown-menu-submenu-title > a > .anticon:first-child {
      min-width: 12px;
      margin-right: 8px;
    }

  }

  // 数据列表 样式
  .table-alert {
    margin-bottom: 16px;
  }

  .table-page-search-wrapper {

    .ant-form-inline {

      .ant-form-item {
        display: flex;
        margin-bottom: 24px;
        margin-right: 0;

        .ant-form-item-control-wrapper {
          flex: 1 1;
          display: inline-block;
          vertical-align: middle;
        }

        > .ant-form-item-label {
          line-height: 32px;
          padding-right: 8px;
          width: auto;
        }
        .ant-form-item-control {
          height: 32px;
          line-height: 32px;
        }
      }
    }

    .table-page-search-submitButtons {
      display: block;
      margin-bottom: 24px;
      white-space: nowrap;
    }

  }

  .content {

    .table-operator {
      margin-bottom: 18px;

      button {
        margin-right: 8px;
      }
    }
  }

  // 增强的移动端适配样式
  @media (max-width: 768px) {
    body {
      overflow-x: hidden;
    }

    // 虚拟键盘显示时的适配
    body.keyboard-visible {
      .ant-layout-footer {
        transition: bottom 0.3s ease;
      }
    }

    // 触摸反馈效果
    .touch-feedback {
      background-color: rgba(0, 0, 0, 0.05) !important;
      transform: scale(0.98);
      transition: all 0.1s ease;
    }

    // 增大触摸目标
    .ant-btn {
      min-height: 44px;
      min-width: 44px;
      padding: 8px 16px;
    }

    .ant-input,
    .ant-input-number,
    .ant-select-selector {
      min-height: 44px;
      font-size: 16px; // 防止iOS Safari缩放
    }

    .ant-menu-item,
    .ant-menu-submenu-title {
      min-height: 48px;
      line-height: 48px;
      padding: 0 24px;
    }

    // 表格在移动端的优化
    .ant-table-wrapper {
      .ant-table {
        font-size: 14px;
      }

      .ant-table-thead > tr > th,
      .ant-table-tbody > tr > td {
        padding: 12px 8px;
      }

      // 表格横向滚动提示
      .ant-table-content {
        position: relative;

        &::after {
          content: '← 左右滑动查看更多 →';
          position: absolute;
          bottom: 10px;
          left: 50%;
          transform: translateX(-50%);
          color: #999;
          font-size: 12px;
          pointer-events: none;
        }
      }
    }

    // 表单在移动端的优化
    .ant-form {
      .ant-form-item {
        margin-bottom: 16px;
      }

      .ant-form-item-label {
        text-align: left;
        padding-bottom: 4px;
      }
    }

    // 抽屉优化
    .ant-drawer {
      .ant-drawer-content-wrapper {
        box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
      }

      .ant-drawer-body {
        padding: 16px;
      }
    }

    // 卡片间距优化
    .ant-card {
      margin-bottom: 16px;

      .ant-card-body {
        padding: 16px;
      }
    }

    // 列表项优化
    .ant-list-item {
      padding: 16px;
    }

    // 搜索框优化
    .ant-input-search {
      .ant-input-search-button {
        min-width: 44px;
      }
    }

    // 页面头部优化
    .page-header-wrapper {
      padding: 16px;
    }

    // 分页组件优化
    .ant-pagination {
      text-align: center;
      margin: 16px 0;

      .ant-pagination-item,
      .ant-pagination-prev,
      .ant-pagination-next {
        min-width: 40px;
        height: 40px;
        line-height: 38px;
      }
    }
  }

  // 平板适配 (768px - 1024px)
  @media (min-width: 768px) and (max-width: 1024px) {
    .layout.tablet {
      .ant-layout-content {
        padding: 16px;
      }

      .ant-table-wrapper {
        .ant-table-body {
          min-width: auto;
        }
      }

      // 分栏布局优化
      .ant-col {
        margin-bottom: 16px;
      }
    }
  }

  // 安全区域适配 (iOS 刘海屏)
  @supports (padding-top: env(safe-area-inset-top)) {
    .layout {
      padding-top: env(safe-area-inset-top);
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
      padding-bottom: env(safe-area-inset-bottom);
    }

    .ant-layout-header {
      padding-top: calc(env(safe-area-inset-top) + 8px);
    }

    .ant-drawer-content-wrapper {
      padding-left: env(safe-area-inset-left);
    }
  }

  // 深色模式支持
  @media (prefers-color-scheme: dark) {
    .layout {
      &.auto-dark-mode {
        background-color: #141414;
        color: rgba(255, 255, 255, 0.85);

        .ant-layout-header {
          background-color: #1f1f1f;
          border-bottom: 1px solid #303030;
        }

        .ant-drawer-content {
          background-color: #1f1f1f;
        }
      }
    }
  }
</style>
