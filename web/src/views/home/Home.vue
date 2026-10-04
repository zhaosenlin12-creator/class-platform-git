<template>
  <div>
    <a-row :gutter="[24, 24]" class="editor-nav">
      <a-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
        <div class="editor-card editor-sjr" style="background: linear-gradient(-30deg,#4fb5ff,#60bcff);">
          <a-row type="flex" justify="space-around" align="middle">
            <a-col :span="10">
              <img src="@assets/sjr.png" alt="">
            </a-col>
            <a-col :span="14">
              <h2>ScratchJr编辑器</h2>
              <a-button size="large" @click="toEditor(2)">开始创作</a-button>
            </a-col>
          </a-row>
        </div>
      </a-col>
      <a-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
        <div class="editor-card editor-sc" style="background: linear-gradient(-60deg,#ffaa30,#ffbf35);">
          <a-row type="flex" justify="space-around" align="middle">
            <a-col :span="10">
              <img src="@assets/scratch.png" alt="">
            </a-col>
            <a-col :span="14">
              <h2>Scratch编辑器</h2>
              <a-button size="large" @click="toEditor(1)">开始创作</a-button>
            </a-col>
          </a-row>
        </div>
      </a-col>
      <a-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
        <div class="editor-card editor-py" style="background: linear-gradient(-30deg,#f35981,#fb7397);">
          <a-row type="flex" justify="space-around" align="middle">
            <a-col :span="10">
              <img src="@assets/python.png" alt="">
            </a-col>
            <a-col :span="14">
              <h2>Python编辑器</h2>
              <a-button size="large" @click="toEditor(3)">开始创作</a-button>
            </a-col>
          </a-row>
        </div>
      </a-col>
      <a-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
        <div class="editor-card editor-turtle" style="background: linear-gradient(-30deg,#4caf50,#66bb6a);">
          <a-row type="flex" justify="space-around" align="middle">
            <a-col :span="10">
              <img src="@assets/turtle.png" alt="">
            </a-col>
            <a-col :span="14">
              <h2>海龟编辑器</h2>
              <a-button size="large" @click="toEditor(4)">开始创作</a-button>
            </a-col>
          </a-row>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import { getFileAccessHttpUrl } from '@/api/manage'
import { mapActions, mapGetters } from 'vuex'
import Header from './modules/Header'
import Banner from './modules/Banner'
import Footer from './modules/Footer'
import UserEnter from './modules/UserEnter'
import QrCode from '@/components/tools/QrCode'

export default {
    name: 'PublicWorkList',
    components: {
        qrcode: QrCode,
        Header,
        Footer,
        UserEnter,
        Banner
    },
    data () {
        const sysConfig = this.$store.getters.sysConfig || {}
        return {
            brandName: sysConfig.brandName || '乐启享',
            logo: '/logo.png',
            avatarUrl: '/logo.png'
        }
    },
    created () {
        const sysConfig = this.$store.getters.sysConfig || {}
        if (sysConfig.logo && sysConfig.qiniuDomain) {
            this.logo = sysConfig.qiniuDomain + '/' + sysConfig.logo
        }
        if (this.getFileAccessHttpUrl(this.avatar())) {
            this.avatarUrl = this.getFileAccessHttpUrl(this.avatar())
        }
    },
    methods: {
        getFileAccessHttpUrl,
        ...mapActions(['Logout']),
        ...mapGetters(['nickname', 'avatar', 'userInfo']),
        enter (type) {
            switch (type) {
            case 0:
                this.$router.push('/portal/home')
                break
            case 1:
                this.$router.push('/student/works')
                break
            case 2:
                this.$router.push('/student/classrooms')
                break
            default:
                this.$router.push('/student/works')
                break
            }
        },
        changeAccount () {
            const that = this
            this.$confirm({
                title: '提示',
                content: '确定要退出当前账号并登录新的账号吗？',
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
                onCancel () {}
            })
        },
        toDetail (id) {
            const route = this.$router.resolve({
                path: '/work-detail',
                query: {
                    id: id
                }
            })
            window.open(route.href, '_blank')
        },
        toFriend (id) {
            const route = this.$router.resolve({
                path: '/friend-detail',
                query: {
                    id: id
                }
            })
            window.open(route.href, '_blank')
        },
        toCourseDetail (id) {
            this.$router.push('/teaching/mineCourse/courseUnitCard?id=' + id)
        },
        toEditor (type) {
            switch (type) {
            case 1:
                window.open('/scratch3/index.html?scene=create')
                break
            case 2:
                window.open('/scratchjr/home.html')
                break
            case 3:
                window.open('/python/index.html')
                break
            case 4:
                window.open('https://turtle.codemao.cn/home')
                break
            }
        },
        _isMobile () {
            return (
                navigator.userAgent.match(
                    /(phone|pad|pod|iPhone|iPod|ios|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i
                ) != null
            )
        }
    }
}
</script>

<style lang="less" scoped>
.editor-card {
  width: 100%;
  height: 220px;
  margin: 30px auto;
  padding: 30px;
  background: linear-gradient(-30deg, #4fb5ff, #60bcff);
  border-radius: 20px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  }

  .ant-row-flex {
    height: 100%;
  }

  img {
    width: auto;
    height: 110px;
  }

  h2 {
    color: white;
    text-align: center;
    font-size: 24px;
    margin-bottom: 15px;
  }

  .ant-btn {
    border-radius: 50px;
    display: block;
    margin: 12px auto;
    font-size: 16px;
  }
}
</style>
