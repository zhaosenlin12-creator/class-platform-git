<template>
  <div class="user-enter">
    <div v-if="token">
      <a-avatar shape="square" class="avatar" :size="100" :src="avatarUrl" />
      <h3>欢迎您，{{ nickname() }}</h3>
      <a-button type="primary" @click="enter">进入系统</a-button>
      <a-button type="dashed" @click="changeAccount">切换账号</a-button>
    </div>
    <div v-else>
      <img class="logo-img" :src="logo2" alt="logo" @error="handleBrandImageError('logo2')" />
      <h3 class="welcome">欢迎来到{{ brandName }}</h3>
      <a-button type="dashed" @click="login">登录/注册</a-button>
    </div>
  </div>
</template>
<script>
import { mapActions, mapGetters } from 'vuex'
import { getFileAccessHttpUrl } from '@/api/manage'
import { resolveBrandAssetUrl } from '@/utils/brandAssets'
export default {
    data () {
        const sysConfig = this.$store.getters.sysConfig || {}
        return {
            brandName: sysConfig.brandName || '乐启享',
            logo: '/logo11.png',
            logo2: '/logo11.png',
            avatarUrl: '/logo11.png'
        }
    },
    computed: {
        token () {
            return this.$store.getters.token || ''
        }
    },
    created () {
        const sysConfig = this.$store.getters.sysConfig || {}
        this.logo2 = resolveBrandAssetUrl(sysConfig, sysConfig.logo2, '/logo11.png')
        this.avatarUrl = resolveBrandAssetUrl(sysConfig, sysConfig.avatar, '/logo11.png')
        if (this.getFileAccessHttpUrl(this.avatar())) {
            this.avatarUrl = this.getFileAccessHttpUrl(this.avatar())
        }
    },
    methods: {
        ...mapActions(['Logout']),
        ...mapGetters(['nickname', 'avatar', 'userInfo']),
        getFileAccessHttpUrl,
        resolveBrandAssetUrl,
        handleBrandImageError (target) {
            this[target] = '/logo11.png'
        },
        login () {
            this.$router.push('/portal/home')
        },
        enter () {
            this.$router.push('/student/works') // 跳转到我的作品
        },
        changeAccount () {
            const that = this
            this.$confirm({
                title: '提示',
                content: '确定要退出当前账号并登录新的账号吗 ?',
                onOk () {
                    return that.Logout({}).then(() => {
                        window.location.href = '/portal/home'
                    }).catch(err => {
                        that.$message.error({
                            title: '错误',
                            description: err.message
                        })
                    })
                },
                onCancel () {
                }
            })
        }
    }
}
</script>
<style scoped>
.user-enter {
  background: url(/img/login-bg.png) no-repeat;
  background-size: 100% 100%;
  border-radius: 10px;
  width: 250px;
  min-height: 360px;
  text-align: center;
  padding-top: 110px;
  padding-bottom: 20px;
  line-height: 50px;
}
.ant-btn {
  width: 80%;
}
.welcome{
  padding: 0 20px;
  line-height: 30px;
}
.logo-img {
  max-width: 200px;
  max-height: 80px;
  object-fit: contain;
  margin: 0 auto 15px auto;
  display: block;
}
</style>
