<template>
  <div :class="['header', menuFixed ? 'menu-fixed' : '']">
    <router-link :to="{ path: '/portal/home' }">
      <img class="logo" :src="logo" alt="" @error="handleBrandImageError('logo')" />
    </router-link>
    <t-menu class="menu" mode="horizontal" :menu="menus"></t-menu>
    <div class="header-avatar">
      <img class="avatar" :src="avatarUrl" @click="enter" alt="" />
      <span v-if="$store.state.user.info">
        <span @click="enter">{{ $store.state.user.info.realname || $store.state.user.info.realName }}</span>
        <a-divider type="vertical" />
        <span @click="handleLogout">退出</span>
      </span>
      <span v-else>
        <!-- 登录入口已经迁移到首页右侧登录区域 -->
      </span>
    </div>
  </div>
</template>

<script>
import { mapActions, mapGetters } from 'vuex'
import TMenu from '@/components/menu/tmenu'
import { getFileAccessHttpUrl } from '@/api/manage'
import { resolveTeachingAccess } from '@/utils/teachingAccess'
import { resolveBrandAssetUrl } from '@/utils/brandAssets'

export default {
    components: {
        TMenu
    },
    data () {
        return {
            menus: [],
            logo: '/logo11.png',
            logo2: '/logo11.png',
            avatarUrl: '/logo11.png',
            menuFixed: false
        }
    },
    created () {
        this.menus = [
            {
                id: '1',
                title: '首页',
                key: 'home',
                icon: 'home',
                path: '/portal/home',
                url: '/portal/home',
                route: true,
                internalOrExternal: false,
                component: 'portal/Home',
                meta: {
                    title: '首页',
                    url: '/portal/home'
                },
                children: []
            },
            {
                id: '2',
                title: '课程中心',
                key: 'classrooms',
                icon: 'book',
                path: '/portal/courseList',
                url: '/portal/courseList',
                route: true,
                internalOrExternal: false,
                component: 'portal/CourseList',
                meta: {
                    title: '课程中心',
                    url: '/portal/courseList'
                },
                children: []
            },
            {
                id: '3',
                title: '作品资源库',
                key: 'works',
                icon: 'star',
                path: '/portal/workList',
                url: '/portal/workList',
                route: true,
                internalOrExternal: false,
                component: 'portal/WorkList',
                meta: {
                    title: '作品资源库',
                    url: '/portal/workList'
                },
                children: []
            },
            {
                id: '4',
                title: '乐启宠物',
                key: 'camp',
                icon: 'appstore',
                path: 'https://camp.codebn.cn',
                url: 'https://camp.codebn.cn',
                route: false,
                internalOrExternal: true,
                meta: {
                    title: '乐启宠物',
                    url: 'https://camp.codebn.cn'
                },
                children: []
            },
            {
                id: '5',
                title: 'AI互动课堂',
                key: 'ai-classroom',
                icon: 'desktop',
                path: 'https://ai.codebn.cn',
                url: 'https://ai.codebn.cn',
                route: false,
                internalOrExternal: true,
                meta: {
                    title: 'AI互动课堂',
                    url: 'https://ai.codebn.cn'
                },
                children: []
            },
            {
                id: '6',
                title: 'Python冒险岛',
                key: 'python-adventure',
                icon: 'rocket',
                path: 'https://game.codebn.cn',
                url: 'https://game.codebn.cn',
                route: false,
                internalOrExternal: true,
                meta: {
                    title: 'Python冒险岛',
                    url: 'https://game.codebn.cn'
                },
                children: []
            },
            {
                id: '7',
                title: '模型训练',
                key: 'model-training',
                icon: 'experiment',
                path: 'https://www.aibase.com/de/tool/12518',
                url: 'https://www.aibase.com/de/tool/12518',
                route: false,
                internalOrExternal: true,
                meta: {
                    title: '模型训练',
                    url: 'https://www.aibase.com/de/tool/12518'
                },
                children: []
            },
            {
                id: '8',
                title: '仿真模拟',
                key: 'virtual-simulation',
                icon: 'global',
                path: 'https://phet.colorado.edu/zh_CN/',
                url: 'https://phet.colorado.edu/zh_CN/',
                route: false,
                internalOrExternal: true,
                meta: {
                    title: '仿真模拟',
                    url: 'https://phet.colorado.edu/zh_CN/'
                },
                children: []
            },
            {
                id: '9',
                title: '穿越',
                key: 'crossing',
                icon: 'compass',
                path: 'https://htwins.net/scale2/',
                url: 'https://htwins.net/scale2/',
                route: false,
                internalOrExternal: true,
                meta: {
                    title: '穿越',
                    url: 'https://htwins.net/scale2/'
                },
                children: []
            }
        ]

        const sysConfig = this.$store.getters.sysConfig || {}
        this.logo = resolveBrandAssetUrl(sysConfig, sysConfig.logo, '/logo11.png')
        this.logo2 = resolveBrandAssetUrl(sysConfig, sysConfig.logo2, '/logo11.png')
        this.avatarUrl = resolveBrandAssetUrl(sysConfig, sysConfig.avatar, this.logo)
        if (this.getFileAccessHttpUrl(this.avatar())) {
            this.avatarUrl = this.getFileAccessHttpUrl(this.avatar())
        }
    },
    mounted () {
        window.addEventListener('scroll', this.handleScroll)
    },
    beforeDestroy () {
        window.removeEventListener('scroll', this.handleScroll)
    },
    methods: {
        ...mapActions(['Logout']),
        ...mapGetters(['nickname', 'avatar', 'userInfo']),
        getFileAccessHttpUrl,
        resolveBrandAssetUrl,
        handleBrandImageError (target) {
            this[target] = '/logo11.png'
        },
        handleScroll () {
            const scrollTop = document.documentElement.scrollTop
            this.menuFixed = scrollTop >= 105
        },
        enter () {
            if (this.$store.state.user.info) {
                const teachingAccess = resolveTeachingAccess({
                    userRole: this.$store.getters.userRole,
                    userType: this.$store.getters.userType,
                    userInfo: this.$store.state.user.info
                })
                this.$router.push(teachingAccess.homePath || '/portal/home')
                return
            }

            this.$router.push('/portal/home')
        },
        goToStudentLogin () {
            this.$router.push('/portal/home')
        },
        goToTeacherLogin () {
            this.$router.push('/portal/home')
        },
        handleLogout () {
            const that = this
            this.$confirm({
                title: '提示',
                content: '真的要注销登录吗？',
                onOk () {
                    return that
                        .Logout({})
                        .then(() => {
                            window.location.href = '/portal/home'
                        })
                        .catch((err) => {
                            that.$message.error({
                                title: '错误',
                                description: err.message
                            })
                        })
                },
                onCancel () {}
            })
        }
    }
}
</script>

<style scoped lang="less">
.header {
  padding: 15px;
  line-height: 30px;
}
.logo {
  height: 48px;
  max-width: 200px;
  object-fit: contain;
  margin-right: 20px;
  display: inline-block;
}
.brand {
  display: inline-block;
  vertical-align: middle;
}
.brand-title {
  color: white;
  font-size: 30px;
  text-shadow: 0 0 5px #282828;
  margin-bottom: 10px;
}
.brand-desc {
  color: white;
  font-size: 18px;
  font-style: italic;
}
.menu-fixed {
  position: fixed;
  top: 0;
  z-index: 99;
  padding-bottom: 10px;
  width: 100%;
  background: radial-gradient(ellipse at top left, #005dff 10%, #23aeffd9 67%);
}
.menu {
  display: inline-block;
  background: transparent;
  max-width: 1200px;
  margin: auto;
  .ant-menu-submenu,
  /deep/.ant-menu-item > a,
  /deep/.ant-menu-submenu-title > a {
    font-family: 'Microsoft YaHei', sans-serif;
    font-weight: 600;
    font-size: 16px;
    color: white;
  }
  .ant-menu-submenu-active,
  .ant-menu-item-active {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 15px;
    border-bottom: none !important;
  }
}
.ant-menu-horizontal {
  border-bottom: none;
}

.header-avatar {
  padding: 5px 20px;
  float: right;
  cursor: pointer;
  .ant-avatar {
    margin-right: 5px;
  }
  .avatar {
    margin-right: 5px;
    margin-bottom: 5px;
    max-height: 30px;
  }
  span {
    color: #fff;
    font-weight: 700;
  }
}
</style>
