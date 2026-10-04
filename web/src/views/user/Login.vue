<template>
  <div class="main">
    <!-- 欢迎页面 -->
    <div v-if="!showLoginForm" class="welcome-container">
      <div class="welcome-header">
        <h1 class="welcome-title">欢迎来到</h1>
        <h2 class="platform-name">乐启享编程教育平台</h2>
        <p class="welcome-subtitle">请选择您的身份进入系统</p>
      </div>

      <div class="role-buttons">
        <a-button
          type="primary"
          size="large"
          icon="user"
          class="role-btn teacher-btn"
          @click="showTeacherLogin">
          <span>教师登录</span>
        </a-button>

        <a-button
          type="default"
          size="large"
          icon="team"
          class="role-btn student-btn"
          @click="showStudentLogin">
          <span>学生登录</span>
        </a-button>
      </div>

      <div class="admin-link">
        <a @click="showAdminLogin" class="admin-text">管理员登录</a>
      </div>
    </div>

    <!-- 登录表单 -->
    <div v-if="showLoginForm" class="login-form-container">

      <!-- 返回按钮 -->
      <div class="back-button">
        <a-button @click="goBack" icon="arrow-left">返回</a-button>
      </div>

      <!-- 登录表单标题 -->
      <div class="login-header">
        <h3 class="login-title">{{ currentLoginType }}登录</h3>
        <p class="login-subtitle">请输入您的账号和密码</p>
      </div>

      <!-- 简化的登录表单 -->
      <a-form :form="form" class="simple-login-form">
        <a-form-item>
          <a-input
            size="large"
            v-decorator="['username',{initialValue:'', rules: validatorRules.username.rules}]"
            type="text"
            autocomplete="off"
            :placeholder="getUsernamePlaceholder()">
            <a-icon slot="prefix" type="user" :style="{ color: 'rgba(0,0,0,.25)' }"/>
          </a-input>
        </a-form-item>

        <a-form-item>
          <a-input
            v-decorator="['password',{initialValue:'', rules: validatorRules.password.rules}]"
            size="large"
            type="password"
            autocomplete="off"
            placeholder="请输入密码">
            <a-icon slot="prefix" type="lock" :style="{ color: 'rgba(0,0,0,.25)' }"/>
          </a-input>
        </a-form-item>

        <a-form-item>
          <a-button
            type="primary"
            size="large"
            :loading="loginBtn"
            @click="handleSubmit"
            class="login-button">
            立即登录
          </a-button>
        </a-form-item>

        <!-- 默认账号提示 -->
        <div class="default-account-hint">
          <p class="hint-text">默认账号：{{ getDefaultAccount() }}</p>
          <p class="hint-text">默认密码：123456</p>
        </div>
      </a-form>
    </div>

    <two-step-captcha
      v-if="requiredTwoStepCaptcha"
      :visible="stepCaptchaVisible"
      @success="stepCaptchaSuccess"
      @cancel="stepCaptchaCancel"></two-step-captcha>

    <a-modal
      title="登录部门选择"
      :width="450"
      :visible="departVisible"
      :closable="false"
      :maskClosable="false">

      <template slot="footer">
        <a-button type="primary" @click="departOk">确认</a-button>
      </template>

      <a-form>
        <a-form-item
          :labelCol="{span:4}"
          :wrapperCol="{span:20}"
          style="margin-bottom:10px"
          :validate-status="validate_status">
          <a-tooltip placement="topLeft" >
            <template slot="title">
              <span>您隶属于多部门，请选择登录部门</span>
            </template>
            <a-avatar style="backgroundColor:#87d068" icon="gold" />
          </a-tooltip>
          <a-select @change="departChange" :class="{'valid-error':validate_status=='error'}" placeholder="请选择登录部门" style="margin-left:10px;width: 80%">
            <a-icon slot="suffixIcon" type="gold" />
            <a-select-option
              v-for="d in departList"
              :key="d.id"
              :value="d.orgCode">
              {{ d.departName }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>

    </a-modal>

  </div>
</template>

<script>
// import md5 from "md5"

import TwoStepCaptcha from '@/components/tools/TwoStepCaptcha'
import { mapActions } from 'vuex'
import { timeFix } from '@/utils/util'
import Vue from 'vue'
import { ACCESS_TOKEN, ENCRYPTED_STRING, INDEX_MAIN_PAGE_PATH, USER_INFO } from '@/store/mutation-types'
import { putAction, postAction, getAction } from '@/api/manage'
import { getEncryptedString } from '@/utils/encryption/aesEncrypt'
import store from '@/store/'

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

export default {
    components: {
        TwoStepCaptcha
    },
    data () {
        return {
            showLoginForm: false, // 控制是否显示登录表单
            currentLoginType: '', // 当前登录类型：教师、学生、管理员
            customActiveKey: 'tab1',
            loginBtn: false,
            // login type: 0 email, 1 username, 2 telephone
            loginType: 0,
            requiredTwoStepCaptcha: false,
            stepCaptchaVisible: false,
            form: this.$form.createForm(this),
            encryptedString: {
                key: '',
                iv: ''
            },
            state: {
                time: 60,
                smsSendBtn: false
            },
            validatorRules: {
                username: { rules: [{ required: true, message: '请输入用户名!' }, { validator: this.handleUsernameOrEmail }] },
                password: { rules: [{ required: true, message: '请输入密码!', validator: 'click' }] },
                mobile: { rules: [{ validator: this.validateMobile }] },
                captcha: { rule: [{ required: true, message: '请输入验证码!' }] },
                inputCode: { rules: [{ required: true, message: '请输入验证码!' }] }
            },
            verifiedCode: '',
            inputCodeContent: '',
            inputCodeNull: true,

            departList: [],
            departVisible: false,
            departSelected: '',
            currentUsername: '',
            validate_status: '',
            currdatetime: '',
            randCodeImage: '',
            requestCodeSuccess: false
        }
    },
    created () {
        this.currdatetime = new Date().getTime()
        // 只有在非redirect参数的情况下才清除token（即用户主动访问登录页）
        // 如果是被重定向到登录页的，说明token已失效，此时再清除
        if (!this.$route.query.redirect) {
            console.log('[Login] 主动访问登录页，清除旧token')
            Vue.ls.remove(ACCESS_TOKEN)
        } else {
            console.log('[Login] 重定向到登录页，token可能已失效')
        }
        this.getRouterData()
        this.handleChangeCheckCode()
        // update-begin- --- author:scott ------ date:20190805 ---- for:密码加密逻辑暂时注释掉，有点问题
        // this.getEncrypte();
        // update-end- --- author:scott ------ date:20190805 ---- for:密码加密逻辑暂时注释掉，有点问题
    },
    methods: {
        ...mapActions([ 'Login', 'Logout', 'PhoneLogin', 'ThirdLogin' ]),
        // 显示教师登录表单
        showTeacherLogin () {
            this.currentLoginType = '教师'
            this.showLoginForm = true
            this.form.resetFields()
        },
        // 显示学生登录表单
        showStudentLogin () {
            this.currentLoginType = '学生'
            this.showLoginForm = true
            this.form.resetFields()
        },
        // 显示管理员登录表单
        showAdminLogin () {
            this.currentLoginType = '管理员'
            this.showLoginForm = true
            this.form.resetFields()
        },
        // 返回欢迎页面
        goBack () {
            this.showLoginForm = false
            this.form.resetFields()
        },
        // 获取用户名输入框提示文字
        getUsernamePlaceholder () {
            switch (this.currentLoginType) {
            case '教师': return '请输入教师账号'
            case '学生': return '请输入学生账号'
            case '管理员': return '请输入管理员账号'
            default: return '请输入账号'
            }
        },
        // 获取默认账号
        getDefaultAccount () {
            switch (this.currentLoginType) {
            case '教师': return 'teacher'
            case '学生': return 'student'
            case '管理员': return 'admin'
            default: return ''
            }
        },
        // 执行快速登录
        performQuickLogin (userType, userTypeName) {
            const loading = this.$message.loading(`正在${userTypeName}登录...`, 0)

            this.Login({
                username: userType,
                password: '123456',
                loginType: userType
            }).then((res) => {
                loading()
                this.$ls.set(ACCESS_TOKEN, res.token, 7 * 24 * 60 * 60 * 1000)
                this.$message.success(`${userTypeName}登录成功！`)

                // 跳转到主页
                this.$router.push({ path: INDEX_MAIN_PAGE_PATH || '/dashboard' })
            }).catch((err) => {
                loading()
                this.$message.error(`${userTypeName}登录失败`)
                console.error('快速登录失败:', err)
            })
        },
        // 切换到学生登录
        switchToStudentLogin () {
            this.$router.push({ name: 'student-login' })
        },
        // 第三方登录
        onThirdLogin (source) {
            let url = window._CONFIG['domianURL'] + `/thirdLogin/render/${source}`
            window.open(url, `login ${source}`, 'height=500, width=500, top=0, left=0, toolbar=no, menubar=no, scrollbars=no, resizable=no,location=n o, status=no')
            let that = this
            let receiveMessage = function (event) {
                var origin = event.origin

                let token = event.data
                that.ThirdLogin(token).then(res => {
                    if (res.success) {
                        that.loginSuccess()
                    } else {
                        that.requestFailed(res)
                    }
                })
            }
            window.addEventListener('message', receiveMessage, false)
        },
        // handler
        handleUsernameOrEmail (rule, value, callback) {
            const regex = /^([a-zA-Z0-9_-])+@([a-zA-Z0-9_-])+((\.[a-zA-Z0-9_-]{2,3}){1,2})$/
            if (regex.test(value)) {
                this.loginType = 0
            } else {
                this.loginType = 1
            }
            callback()
        },
        handleTabClick (key) {
            this.customActiveKey = key
        // this.form.resetFields()
        },
        handleSubmit () {
            let that = this
            let loginParams = {}
            that.loginBtn = true
            // 使用账户密码登陆
            if (that.customActiveKey === 'tab1') {
                that.form.validateFields([ 'username', 'password', 'rememberMe' ], { force: true }, (err, values) => {
                    if (!err) {
                        loginParams.username = values.username
                        loginParams.password = values.password
                        loginParams.remember_me = values.rememberMe
                        // 验证码已禁用
                        loginParams.captcha = 'skip'
                        loginParams.checkKey = 'skip'
                        that.Login(loginParams).then((res) => {
                            // this.departConfirm(res)
                            this.loginSuccess()
                        }).catch((err) => {
                            that.requestFailed(err)
                        })
                    } else {
                        that.loginBtn = false
                    }
                })
                // 使用手机号登陆
            } else {
                that.form.validateFields([ 'mobile', 'captcha', 'rememberMe' ], { force: true }, (err, values) => {
                    if (!err) {
                        loginParams.mobile = values.mobile
                        loginParams.captcha = values.captcha
                        loginParams.remember_me = values.rememberMe
                        that.PhoneLogin(loginParams).then((res) => {
                            // this.departConfirm(res)
                            this.loginSuccess()
                        }).catch((err) => {
                            that.requestFailed(err)
                        })
                    }
                })
            }
        },
        getCaptcha (e) {
            e.preventDefault()
            let that = this
            this.form.validateFields([ 'mobile' ], { force: true }, (err, values) => {
                if (!values.mobile) {
                    that.cmsFailed('请输入手机号')
                } else if (!err) {
                    this.state.smsSendBtn = true
                    let interval = window.setInterval(() => {
                        if (that.state.time-- <= 0) {
                            that.state.time = 60
                            that.state.smsSendBtn = false
                            window.clearInterval(interval)
                        }
                    }, 1000)

                    const hide = this.$message.loading('验证码发送中..', 0)
                    let smsParams = {}
                    smsParams.mobile = values.mobile
                    smsParams.smsmode = '0'
                    postAction('/sys/sms', smsParams)
                        .then(res => {
                            if (!res.success) {
                                setTimeout(hide, 0)
                                this.cmsFailed(res.message)
                            }
                            setTimeout(hide, 500)
                        })
                        .catch(err => {
                            setTimeout(hide, 1)
                            clearInterval(interval)
                            that.state.time = 60
                            that.state.smsSendBtn = false
                            this.requestFailed(err)
                        })
                }
            }
            )
        },
        stepCaptchaSuccess () {
            this.loginSuccess()
        },
        stepCaptchaCancel () {
            this.Logout().then(() => {
                this.loginBtn = false
                this.stepCaptchaVisible = false
            })
        },
        handleChangeCheckCode () {
            this.currdatetime = new Date().getTime()
            getAction(`/sys/randomImage/${this.currdatetime}`).then(res => {
                if (res.success) {
                    this.randCodeImage = res.result
                    this.requestCodeSuccess = true
                } else {
                    this.$message.error(res.message)
                    this.requestCodeSuccess = false
                }
            }).catch(() => {
                this.requestCodeSuccess = false
            })
        },
        loginSuccess () {
        // 立即显示成功通知
            this.$notification.success({
                message: '欢迎',
                description: `${timeFix()}，欢迎回来`
            })

            // 延迟一下确保store和菜单数据更新完成
            setTimeout(() => {
                // 根据用户角色跳转到不同页面
                const userInfo = this.$store.getters.userInfo || {}
                const userType = userInfo.userType || this.$store.getters.userType

                // 获取菜单数据，跳转到第一个菜单项
                const menuList = this.$store.getters.menuList

                if (menuList && menuList.length > 0) {
                    // 跳转到第一个菜单项的路径
                    const firstMenu = menuList[0]
                    const targetPath = firstMenu.path || firstMenu.url || '/dashboard'
                    console.log('[LOGIN] 跳转到菜单第一项:', targetPath, firstMenu)
                    this.$router.push({ path: targetPath }).catch(err => {
                        console.error('[LOGIN] 路由跳转失败:', err)
                        // 如果跳转失败，尝试跳转到默认首页
                        this.$router.push({ path: '/dashboard' })
                    })
                } else {
                    // 如果没有菜单数据，根据用户类型使用默认路径
                    let defaultPath = '/dashboard'

                    if (userType === 3 || userType === 'student') {
                        defaultPath = '/student/home'
                    }

                    console.log('[LOGIN] 没有菜单数据，使用默认路径:', defaultPath)
                    this.$router.push({ path: defaultPath }).catch(err => {
                        console.error('[LOGIN] 默认路由跳转失败:', err)
                    })
                }

                // 解除登录按钮禁用
                this.loginBtn = false
            }, 300) // 短延迟确保UI更新
        },
        cmsFailed (err) {
            this.$notification[ 'error' ]({
                message: '登录失败',
                description: err,
                duration: 4
            })
        },
        requestFailed (err) {
            this.$notification[ 'error' ]({
                message: '登录失败',
                description: ((err.response || {}).data || {}).message || err.message || '请求出现错误，请稍后再试',
                duration: 4
            })
            this.loginBtn = false
        },
        validateMobile (rule, value, callback) {
            if (!value || new RegExp(/^1([38][0-9]|4[579]|5[0-3,5-9]|6[6]|7[0135678]|9[89])\d{8}$/).test(value)) {
                callback()
            } else {
                callback('您的手机号码格式不正确!')
            }
        },
        validateInputCode (rule, value, callback) {
            if (!value || this.verifiedCode == this.inputCodeContent) {
                callback()
            } else {
                callback('您输入的验证码不正确!')
            }
        },
        generateCode (value) {
            this.verifiedCode = value.toLowerCase()
        },
        inputCodeChange (e) {
            this.inputCodeContent = e.target.value
        },
        departConfirm (res) {
            if (res.success) {
                let multi_depart = res.result.multi_depart
                // 0:无部门 1:一个部门 2:多个部门
                if (multi_depart == 0) {
                    this.loginSuccess()
                    this.$notification.warn({
                        message: '提示',
                        description: `您尚未归属部门,请确认账号信息`,
                        duration: 3
                    })
                } else if (multi_depart == 2) {
                    this.departVisible = true
                    this.currentUsername = this.form.getFieldValue('username')
                    this.departList = res.result.departs
                } else {
                    this.loginSuccess()
                }
            } else {
                this.requestFailed(res)
                this.Logout()
            }
        },
        departOk () {
            if (!this.departSelected) {
                this.validate_status = 'error'
                return false
            }
            let obj = {
                orgCode: this.departSelected,
                username: this.form.getFieldValue('username')
            }
            putAction('/sys/selectDepart', obj).then(res => {
                if (res.success) {
                    const userInfo = res.result.userInfo
                    Vue.ls.set(USER_INFO, userInfo, 7 * 24 * 60 * 60 * 1000)
                    store.commit('SET_INFO', userInfo)
                    //
                    this.departClear()
                    this.loginSuccess()
                } else {
                    this.requestFailed(res)
                    this.Logout().then(() => {
                        this.departClear()
                    })
                }
            })
        },
        departClear () {
            this.departList = []
            this.departSelected = ''
            this.currentUsername = ''
            this.departVisible = false
            this.validate_status = ''
        },
        departChange (value) {
            this.validate_status = 'success'
            this.departSelected = value
        },
        getRouterData () {
            this.$nextTick(() => {
                if (this.$route.params.username) {
                    this.form.setFieldsValue({
                        'username': this.$route.params.username
                    })
                }
            })
        },
        // 获取密码加密规则
        getEncrypte () {
            var encryptedString = Vue.ls.get(ENCRYPTED_STRING)
            if (encryptedString == null) {
                getEncryptedString().then((data) => {
                    this.encryptedString = data
                })
            } else {
                this.encryptedString = encryptedString
            }
        }
    }
}
</script>

<style lang="less" scoped>
  .main {
    max-width: 400px;
    margin: 0 auto;
    padding: 40px 20px;
    min-height: 500px;
  }

  /* 欢迎页面样式 */
  .welcome-container {
    text-align: center;
    padding: 60px 20px;
  }

  .welcome-header {
    margin-bottom: 50px;
  }

  .welcome-title {
    font-size: 36px;
    font-weight: 300;
    color: #1890ff;
    margin: 0 0 10px 0;
  }

  .platform-name {
    font-size: 24px;
    font-weight: 500;
    color: #333;
    margin: 0 0 15px 0;
  }

  .welcome-subtitle {
    font-size: 16px;
    color: #666;
    margin: 0;
  }

  .role-buttons {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 40px;
  }

  .role-btn {
    height: 60px;
    font-size: 18px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;

    &.teacher-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
      }
    }

    &.student-btn {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      border: none;
      color: white;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(240, 147, 251, 0.4);
      }
    }

    span {
      margin-left: 8px;
    }
  }

  .admin-link {
    margin-top: 30px;

    .admin-text {
      color: #999;
      font-size: 14px;
      text-decoration: none;
      transition: color 0.3s;

      &:hover {
        color: #1890ff;
        text-decoration: underline;
      }
    }
  }

  /* 登录表单样式 */
  .login-form-container {
    max-width: 350px;
    margin: 0 auto;
    padding: 40px 20px;
  }

  .back-button {
    margin-bottom: 30px;
    text-align: left;
  }

  .login-header {
    text-align: center;
    margin-bottom: 40px;
  }

  .login-title {
    font-size: 24px;
    color: #333;
    margin: 0 0 8px 0;
  }

  .login-subtitle {
    font-size: 14px;
    color: #666;
    margin: 0;
  }

  .simple-login-form {
    .login-button {
      width: 100%;
      height: 44px;
      font-size: 16px;
      border-radius: 6px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
    }
  }

  .default-account-hint {
    text-align: center;
    margin-top: 20px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 6px;

    .hint-text {
      margin: 4px 0;
      font-size: 13px;
      color: #666;
    }
  }

  .user-layout-login {
    label {
      font-size: 14px;
    }

    .getCaptcha {
      display: block;
      width: 100%;
      height: 40px;
    }

    .forge-password {
      font-size: 14px;
    }

    button.login-button {
      padding: 0 15px;
      font-size: 16px;
      height: 40px;
      width: 100%;
    }
  }

</style>
<style>
  .valid-error .ant-select-selection__placeholder{
    color: #f5222d;
  }

  .student-login-link {
    color: #1890ff;
    font-size: 14px;
    padding: 8px 16px;
    border: 1px solid #1890ff;
    border-radius: 4px;
    text-decoration: none;
    display: inline-block;
    transition: all 0.3s;
  }

  .student-login-link:hover {
    background-color: #1890ff;
    color: white;
    text-decoration: none;
  }

  .login-type-indicator {
    text-align: center;
    margin-bottom: 16px;
    padding: 8px;
    background: #f0f2f5;
    border-radius: 4px;
    color: #666;
    font-size: 13px;
  }

  .role-switch-container {
    margin-top: 16px;
  }

  .quick-login-area .ant-card-head {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .quick-login-area .ant-card-head-title {
    color: white;
    font-weight: 600;
  }
</style>
