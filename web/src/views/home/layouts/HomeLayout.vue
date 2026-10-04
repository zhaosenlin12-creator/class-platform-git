<template>
  <div
    class="container"
    :style="{
      backgroundColor: sysConfig.homeBgColor,
      backgroundImage: sysConfig.file_homeBg ? 'url(' + getFileAccessHttpUrl(sysConfig.file_homeBg) + ')' : '',
      backgroundRepeat: sysConfig.homeBgRepeat ? sysConfig.homeBgRepeat : '',
    }"
  >
    <a-layout>
      <a-layout-header>
        <Header />
      </a-layout-header>
      <a-layout>
        <a-layout-content>
          <a-row type="flex" justify="space-between">
            <a-col :xs="24" :sm="24" :md="16" :lg="16" :xl="17">
              <Banner />
            </a-col>
            <a-col :xs="24" :sm="24" :md="8" :lg="8" :xl="7">
              <div class="user-enter">
                <div v-if="token">
                  <a-avatar shape="square" class="avatar" :size="80" :style="{ backgroundColor: '#1890ff' }">
                    <a-icon type="user" :style="{ fontSize: '40px' }" />
                  </a-avatar>
                  <h3>欢迎您，{{ nickname() }}</h3>
                  <a-button type="primary" class="btn-my-work" @click="enter(1)">我的作品</a-button>
                  <a-divider type="vertical"></a-divider>
                  <a-button type="primary" class="btn-my-course" @click="enter(2)">我的课堂</a-button>
                </div>
                <div v-else class="login-form-section">
                  <div class="login-logo">
                    <img :src="logo2" alt="logo" class="logo-img" @error="handleBrandImageError('logo2')" />
                  </div>
                  <h3 class="welcome">欢迎来到{{ brandName }}</h3>

                  <!-- 登录表单 -->
                  <a-form :form="loginForm" class="home-login-form">
                    <a-form-item>
                      <div class="login-type-switch">
                        <a-button :type="activeLoginType === 'student' ? 'primary' : 'default'" @click="setLoginType('student')">
                          学生
                        </a-button>
                        <a-button :type="activeLoginType === 'teacher' ? 'primary' : 'default'" @click="setLoginType('teacher')">
                          教师
                        </a-button>
                      </div>
                      <a-input v-show="false" v-decorator="['loginType', { initialValue: 'student' }]" />
                    </a-form-item>

                    <a-form-item>
                      <a-input
                        v-decorator="['username', { rules: [{ required: true, message: '请输入账号' }] }]"
                        size="large"
                        placeholder="请输入账号"
                        autocomplete="off"
                      >
                        <a-icon slot="prefix" type="user" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                      </a-input>
                    </a-form-item>

                    <a-form-item>
                      <a-input
                        v-decorator="['password', { rules: [{ required: true, message: '请输入密码' }] }]"
                        size="large"
                        type="password"
                        placeholder="请输入密码"
                        autocomplete="off"
                        @pressEnter="handleLogin"
                      >
                        <a-icon slot="prefix" type="lock" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                      </a-input>
                    </a-form-item>

                    <a-form-item>
                      <a-row :gutter="8" class="captcha-row">
                        <a-col :span="14">
                          <a-input
                            v-decorator="['captcha', { rules: [{ required: true, message: '请输入验证码' }] }]"
                            size="large"
                            placeholder="请输入验证码"
                            autocomplete="off"
                            inputmode="numeric"
                            pattern="[0-9]*"
                            maxlength="4"
                            @input="normalizeCaptchaInput"
                            @pressEnter="handleLogin"
                          >
                            <a-icon slot="prefix" type="safety-certificate" :style="{ color: 'rgba(0,0,0,.25)' }"/>
                          </a-input>
                        </a-col>
                        <a-col :span="10">
                          <div
                            class="captcha-image"
                            role="button"
                            tabindex="0"
                            aria-label="验证码，点击刷新"
                            title="看不清？点击刷新"
                            @click="refreshCaptcha"
                            @keydown.enter.prevent="refreshCaptcha"
                            @keydown.space.prevent="refreshCaptcha"
                            v-html="captchaImage"
                            v-if="captchaImage"></div>
                          <div v-else class="captcha-loading">
                            <a-spin size="small" />
                          </div>
                        </a-col>
                      </a-row>
                    </a-form-item>

                    <a-form-item>
                      <a-button
                        type="primary"
                        size="large"
                        :loading="loginLoading"
                        @click="handleLogin"
                        block
                        class="login-button"
                      >
                        立即登录
                      </a-button>
                    </a-form-item>
                  </a-form>
                </div>
              </div>
            </a-col>
          </a-row>
          <router-view />
        </a-layout-content>
      </a-layout>
      <a-layout-footer>
        <Footer />
      </a-layout-footer>
    </a-layout>
  </div>
</template>

<script>
import { getFileAccessHttpUrl } from '@/api/manage'
import { mapActions, mapGetters } from 'vuex'
import Header from '../modules/Header'
import Banner from '../modules/Banner'
import Footer from '../modules/Footer'
import { timeFix } from '@/utils/util'
import { resolveTeachingAccess } from '@/utils/teachingAccess'
import { resolveBrandAssetUrl } from '@/utils/brandAssets'
import { getConfiguredBaseUrl } from '@/utils/runtimeBaseUrl'

export default {
    name: 'HomeLayout',
    components: {
        Header,
        Footer,
        Banner
    },
    data () {
        const sysConfig = this.$store.getters.sysConfig || {}
        return {
            brandName: sysConfig.brandName || '乐启享',
            logo: '/logo11.png',
            logo2: '/logo11.png',
            avatarUrl: '/logo11.png',
            sysConfig: sysConfig,
            loginForm: this.$form.createForm(this),
            loginLoading: false,
            activeLoginType: 'student',
            captchaImage: '',
            captchaKey: '',
            currdatetime: new Date().getTime()
        }
    },
    computed: {
        token () {
            return this.$store.getters.token || ''
        }
    },
    created () {
        const config = this.$store.getters.sysConfig || {}
        this.sysConfig = config

        if (!this.token) {
            this.loadCaptcha()
        }

        this.logo = resolveBrandAssetUrl(config, config.logo, '/logo11.png')
        this.logo2 = resolveBrandAssetUrl(config, config.logo2, '/logo11.png')
        this.avatarUrl = resolveBrandAssetUrl(config, config.avatar, this.logo)
        if (this.avatar && this.avatar() && this.getFileAccessHttpUrl(this.avatar())) {
            this.avatarUrl = this.getFileAccessHttpUrl(this.avatar())
        }
    },
    watch: {
        token (nextToken, previousToken) {
            if (!nextToken && previousToken) {
                this.$nextTick(() => {
                    this.refreshCaptcha()
                })
            }
        }
    },
    methods: {
        getFileAccessHttpUrl,
        resolveBrandAssetUrl,
        ...mapActions(['Logout', 'Login']),
        ...mapGetters(['nickname', 'avatar', 'userInfo']),
        handleBrandImageError (target) {
            this[target] = '/logo11.png'
        },
        resolveCurrentTeachingAccess () {
            const currentUserInfo = this.$store.getters.userInfo || {}
            return resolveTeachingAccess({
                userRole: this.$store.getters.userRole || [],
                userType: this.$store.getters.userType || currentUserInfo.userType || '',
                userInfo: currentUserInfo
            })
        },
        checkLoginStatus () {
            return Boolean(this.token)
        },
        loadCaptcha () {
            this.currdatetime = new Date().getTime()
            this.captchaImage = '' // 清空当前验证码
            this.captchaKey = '' // 清空key

            const apiUrl = getConfiguredBaseUrl(window._CONFIG && window._CONFIG.domianURL)
            const url = `${apiUrl}/sys/randomImage/${this.currdatetime}`

            // 直接使用fetch避免axios拦截器处理
            fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                cache: 'no-cache' // 确保每次都获取新的验证码
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                    }
                    return response.json()
                })
                .then(res => {
                    if (res.success) {
                        // 优先使用result字段（SVG数据），如果没有则使用data或img
                        const svgData = res.result || res.data || res.img

                        if (svgData && typeof svgData === 'string' && svgData.includes('<svg')) {
                            // 是SVG数据，直接使用
                            this.captchaImage = svgData
                            this.captchaKey = res.code || res.checkKey || ''
                        } else if (res.code && (!svgData || !svgData.includes('<svg'))) {
                            // 如果只有code但没有SVG数据，使用客户端生成（备用方案）
                            const clientCaptcha = this.createSimpleCaptcha()
                            this.captchaImage = clientCaptcha.svg
                            this.captchaKey = clientCaptcha.key
                        } else {
                            // 使用客户端生成作为备用
                            const clientCaptcha = this.createSimpleCaptcha()
                            this.captchaImage = clientCaptcha.svg
                            this.captchaKey = clientCaptcha.key
                        }
                    } else {
                        // 使用客户端生成作为备用
                        const clientCaptcha = this.createSimpleCaptcha()
                        this.captchaImage = clientCaptcha.svg
                        this.captchaKey = clientCaptcha.key
                    }
                })
                .catch(() => {
                    // 使用客户端生成作为备用
                    const clientCaptcha = this.createSimpleCaptcha()
                    this.captchaImage = clientCaptcha.svg
                    this.captchaKey = clientCaptcha.key
                })
        },
        // 直接生成验证码（备用方案）
        generateCaptchaDirect () {
            // 如果API返回有问题，使用备用方案
            const svgCaptcha = this.createSimpleCaptcha()
            this.captchaImage = svgCaptcha.svg
            this.captchaKey = svgCaptcha.key
        },
        // 创建简单验证码（客户端生成，仅用于应急）
        createSimpleCaptcha () {
            // 备用验证码也使用同一套易读数字，保持输入规则一致。
            const chars = '2345679'
            const code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
            const key = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

            // 生成每个字符的位置和颜色
            const positions = []
            const colors = ['#1f2937', '#174a7e', '#234e70']
            let xPos = 18

            for (let i = 0; i < 4; i++) {
                const char = code[i]
                const yOffset = Math.random() * 4 - 2
                const rotation = Math.random() * 8 - 4
                const color = colors[Math.floor(Math.random() * colors.length)]
                positions.push({ char, x: xPos, y: 37 + yOffset, rotation, color })
                xPos += 30
            }

            // 生成干扰线
            const lines = []
            // 保留极少量浅色线条，避免干扰数字轮廓。
            lines.push('<line x1="8" y1="45" x2="124" y2="8" stroke="#c8d6e5" stroke-width="1" opacity="0.45"/>')

            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="132" height="52" viewBox="0,0,132,52">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f5f5f5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#ffffff;stop-opacity:1" />
          </linearGradient>
        </defs>
            <rect width="132" height="52" fill="url(#bg)" stroke="#b9c9d8" stroke-width="1"/>
        ${lines.join('')}
        ${positions.map((p) =>
        `<text x="${p.x}" y="${p.y}" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="${p.color}" transform="rotate(${p.rotation} ${p.x} ${p.y})" text-anchor="middle">${p.char}</text>`
    ).join('')}
      </svg>`

            // 存储验证码到服务端（通过API）
            // 临时存储到window（仅用于应急，生产环境应该使用服务端存储）
            if (!window.captchaStore) window.captchaStore = new Map()
            window.captchaStore.set(key, { text: code.toLowerCase(), expireTime: Date.now() + 5 * 60 * 1000 })

            // 同时尝试发送到后端存储（如果后端支持）
            this.saveCaptchaToServer(key, code.toLowerCase())

            return { svg, key, code }
        },
        // 保存验证码到服务器（备用方案）
        saveCaptchaToServer (_key, _text) {
            // 这里可以调用一个API将验证码保存到服务器
            // 暂时跳过，因为客户端生成的验证码主要用于应急
        },
        // 刷新验证码
        refreshCaptcha () {
            this.loadCaptcha()
        },
        normalizeCaptchaInput (event) {
            const input = event && event.target ? event.target.value : ''
            const normalized = String(input).replace(/\D/g, '').slice(0, 4)
            if (normalized !== input) {
                this.loginForm.setFieldsValue({ captcha: normalized })
            }
        },
        setLoginType (loginType) {
            this.activeLoginType = loginType
            this.loginForm.setFieldsValue({ loginType })
        },
        redirectAfterLogin (userType, userRole) {
            const teachingAccess = this.resolveCurrentTeachingAccess()
            let targetPath = teachingAccess.homePath || '/portal/home'
            const menuList = this.$store.getters.menuList || []
            if (menuList && menuList.length > 0) {
                const firstMenu = menuList.find(m => m.path || m.url)
                if (firstMenu) {
                    targetPath = firstMenu.path || firstMenu.url
                }
            }

            if (userType === 'student' || userRole.includes('student')) {
                targetPath = '/student/home'
            } else if (teachingAccess.isAdmin) {
                targetPath = '/admin/dashboard'
            }

            if (this.$route.path === targetPath) {
                return
            }

            this.$router.push(targetPath).then(() => {
                this.$message.success('登录成功')
            }).catch(err => {
                if (err.name !== 'NavigationDuplicated') {
                    setTimeout(() => {
                        window.location.href = targetPath
                    }, 100)
                }
            })
        },
        // 首页登录处理
        handleLogin () {
            this.loginForm.validateFields((err, values) => {
                if (!err) {
                    // 验证验证码
                    const captchaValue = String(values.captcha || '').replace(/\D/g, '').slice(0, 4)
                    if (captchaValue.length !== 4 || !this.captchaKey) {
                        this.$message.error('请输入4位数字验证码')
                        return
                    }

                    // 验证客户端生成的验证码（如果使用的是客户端验证码）
                    if (window.captchaStore && window.captchaStore.has(this.captchaKey)) {
                        const stored = window.captchaStore.get(this.captchaKey)
                        if (Date.now() > stored.expireTime) {
                            this.$message.error('验证码已过期，请刷新')
                            this.refreshCaptcha()
                            return
                        }
                        if (stored.text !== captchaValue) {
                            this.$message.error('验证码错误，请重新输入')
                            this.refreshCaptcha()
                            return
                        }
                        // 验证通过，删除客户端存储的验证码
                        window.captchaStore.delete(this.captchaKey)
                    }

                    this.loginLoading = true
                    // 登录类型映射：teacher包含管理员和教师，student为学生
                    // 后端会根据账号user_identity判断是管理员还是教师
                    const loginParams = {
                        username: values.username,
                        password: values.password,
                        loginType: values.loginType || 'student', // teacher或student
                        captcha: captchaValue,
                        checkKey: this.captchaKey
                    }

                    this.Login(loginParams).then((res) => {
                        this.loginLoading = false

                        // 检查登录是否成功（Vuex action已经处理了code=='200'的情况）
                        if (res && (res.success || Number(res.code) === 200) && res.result) {
                            const result = res.result
                            const userInfo = result.userInfo

                            // 显示成功通知
                            this.$notification.success({
                                message: '登录成功',
                                description: `${timeFix()}，欢迎回来 ${userInfo.realname || userInfo.username}`,
                                duration: 2
                            })

                            // 登录成功后不跳转，停留在首页显示欢迎信息
                            // 用户可以通过点击菜单自行导航
                        } else {
                            // 登录返回了非成功状态
                            const errorMsg = (res && res.message) || '登录失败，请检查账号密码'
                            this.$notification.error({
                                message: '登录失败',
                                description: errorMsg,
                                duration: 4
                            })
                            this.refreshCaptcha()
                        }
                    }).catch((err) => {
                        this.loginLoading = false

                        // 提取错误信息
                        let errorMsg = '登录失败，请检查账号密码'
                        if (err.response && err.response.data) {
                            errorMsg = err.response.data.message || errorMsg
                        } else if (err.message) {
                            errorMsg = err.message
                        } else if (err && err.message) {
                            errorMsg = err.message
                        }

                        // 根据错误类型显示具体的错误提示
                        if (errorMsg.includes('验证码') || errorMsg.includes('captcha')) {
                            this.$message.error('验证码错误，请重新输入')
                        } else if (errorMsg.includes('密码') || errorMsg.includes('password')) {
                            this.$message.error('密码错误，请重新输入')
                        } else if (errorMsg.includes('用户不存在') || errorMsg.includes('username')) {
                            this.$message.error('账号不存在，请检查账号')
                        } else {
                            this.$notification.error({
                                message: '登录失败',
                                description: errorMsg,
                                duration: 4
                            })
                        }

                        this.refreshCaptcha()
                    })
                }
            })
        },
        enter (type) {
            const teachingAccess = this.resolveCurrentTeachingAccess()
            const isStudent = teachingAccess.isStudent

            switch (type) {
            case 0:
                // 如果未登录，滚动到登录表单
                if (!this.token) {
                    const loginSection = document.querySelector('.login-form-section')
                    if (loginSection) {
                        loginSection.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                } else {
                    this.$router.push(teachingAccess.homePath || '/portal/home')
                }
                break
            case 1:
                // 我的作品：根据角色跳转不同页面
                this.$router.push(teachingAccess.workPath || '/student/works')
                break
            case 2:
                // 我的课程/课堂
                this.$router.push(teachingAccess.classroomPath || '/student/classrooms')
                break
            default:
                this.$router.push(teachingAccess.homePath || (isStudent ? '/student/home' : '/admin/dashboard'))
                break
            }
        },
        changeAccount () {
            const that = this
            this.$confirm({
                title: '提示',
                content: '确定要退出当前账号并登录新的账号吗 ?',
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
.container {
  background: url(/img/bg_blue.png) no-repeat;
  background-color: #f6f6f6;
  background-size: 100% auto;
}
.ant-layout-header,
.ant-layout-content,
.ant-layout-sider,
.ant-layout-sider-children,
.ant-layout-footer {
  background: transparent;
}
.ant-layout {
  background: transparent;
  min-height: calc(100vh - 200px);
}
.ant-layout-header {
  height: auto;
  min-height: 50px;
  width: 100%;
  margin-bottom: 10px;
  padding: 0;
  /deep/.banner {
    border-radius: 10px;
    overflow: hidden;
  }
}

.ant-layout-has-sider {
  max-width: 1600px;
  min-width: 800px;
  margin: -100px auto 0;
}
.ant-layout-sider {
  z-index: 99;
}
  .ant-layout-content {
    padding: 20px 20px 0 20px;
    max-width: 1300px;
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
    .user-enter {
      background: #fff;
      border: 1px solid #eee;
      border-radius: 20px;
    width: 100%;
    max-width: 360px;
    min-height: 300px;
    text-align: center;
    line-height: 50px;
    float: none;
    margin: 0 0 24px auto;
    padding: 30px 20px;
    box-sizing: border-box;

    .login-form-section {
      .login-logo {
        text-align: center;
        margin-bottom: 15px;

        .logo-img {
          max-width: 200px;
          max-height: 80px;
          object-fit: contain;
          width: auto;
          height: auto;
        }
      }

      .welcome {
        margin: 15px 0 20px 0;
        font-size: 20px;
        color: #333;
        font-weight: 500;
        text-align: center;
      }

      .home-login-form {
        text-align: left;
        margin-top: 15px;
        width: 100%;

        .ant-form-item {
          margin-bottom: 16px;
        }

        .login-type-switch {
          display: flex;
          gap: 8px;

          .ant-btn {
            flex: 1;
          }
        }

        .login-button {
          margin-top: 10px;
          height: 44px;
          font-size: 16px;
          font-weight: 500;
        }

        .captcha-row {
          align-items: center;

          .ant-input {
            letter-spacing: 0.18em;
            font-weight: 600;
          }
        }

        .captcha-image {
          height: 52px;
          min-width: 112px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          background: #f7fbff;
          overflow: hidden;
          transition: all 0.3s;

          &:hover {
            border-color: #40a9ff;
            box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
          }

          /deep/ svg {
            width: 100%;
            height: 100%;
            display: block;
          }
        }

        .captcha-loading {
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #d9d9d9;
          border-radius: 4px;
          background: #fafafa;
        }
      }
    }
  }
}
.ant-layout-sider {
  margin-left: 30px;
  max-width: 300px !important;
  width: 300px !important;
}

@media (max-width: 991px) {
  .ant-layout-content {
    .user-enter {
      max-width: 420px;
      margin: 24px auto;
    }
  }
}

@media (max-width: 575px) {
  .ant-layout-content {
    padding: 16px 12px 0;

    .user-enter {
      border-radius: 16px;
      padding: 24px 16px;
    }
  }
}
</style>
