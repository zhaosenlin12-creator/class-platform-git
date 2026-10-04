<template>
  <div class="main">
    <div class="student-login-header">
      <h2>学生登录</h2>
      <p>欢迎来到编程教育平台</p>
    </div>

    <a-form :form="form" class="user-layout-login" ref="formLogin" id="formLogin">
      <a-form-item>
        <a-input
          size="large"
          v-decorator="['username',{initialValue:'', rules: [{ required: true, message: '请输入用户名!' }]}]"
          type="text"
          autocomplete="off"
          placeholder="请输入学生用户名">
          <a-icon slot="prefix" type="user" :style="{ color: 'rgba(0,0,0,.25)' }"/>
        </a-input>
      </a-form-item>

      <a-form-item>
        <a-input
          v-decorator="['password',{initialValue:'', rules: [{ required: true, message: '请输入密码!' }]}]"
          size="large"
          type="password"
          autocomplete="off"
          placeholder="请输入密码">
          <a-icon slot="prefix" type="lock" :style="{ color: 'rgba(0,0,0,.25)' }"/>
        </a-input>
      </a-form-item>

      <a-form-item>
        <a-checkbox v-decorator="['rememberMe', {initialValue: true, valuePropName: 'checked'}]">记住我</a-checkbox>
        <router-link :to="{ name: 'user-login'}" class="teacher-login" style="float: right;">
          教师登录
        </router-link>
      </a-form-item>

      <a-form-item style="margin-top:24px">
        <div class="role-switch-container">
          <a-button-group size="large" style="width: 100%;">
            <a-button
              type="primary"
              style="width: 50%;"
              :loading="loginBtn"
              htmlType="submit"
              @click.stop.prevent="handleSubmit"
              :disabled="loginBtn">
              <a-icon type="user" />
              学生登录
            </a-button>
            <a-button
              style="width: 50%;"
              @click="switchToTeacherLogin">
              <a-icon type="crown" />
              切换到教师登录
            </a-button>
          </a-button-group>
        </div>
      </a-form-item>

      <div class="register-link">
        <span>还没有账号？请联系教师为您创建账号</span>
      </div>
    </a-form>
  </div>
</template>

<script>
import { mapActions } from 'vuex'
import { timeFix } from '@/utils/util'
import Vue from 'vue'
import { ACCESS_TOKEN } from '@/store/mutation-types'

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
    data () {
        return {
            loginBtn: false,
            form: this.$form.createForm(this)
        }
    },
    created () {
    // 只有在非redirect参数的情况下才清除token（即用户主动访问登录页）
        if (!this.$route.query.redirect) {
            console.log('[StudentLogin] 主动访问登录页，清除旧token')
            Vue.ls.remove(ACCESS_TOKEN)
        } else {
            console.log('[StudentLogin] 重定向到登录页，token可能已失效')
        }
        this.getRouterData()
    },
    methods: {
        ...mapActions([ 'StudentLogin', 'Logout' ]),

        handleSubmit () {
            let that = this
            let loginParams = {}
            that.loginBtn = true

            that.form.validateFields([ 'username', 'password', 'rememberMe' ], { force: true }, (err, values) => {
                if (!err) {
                    loginParams.username = values.username
                    loginParams.password = values.password
                    loginParams.remember_me = values.rememberMe

                    that.StudentLogin(loginParams).then((res) => {
                        this.loginSuccess()
                    }).catch((err) => {
                        that.requestFailed(err)
                    })
                } else {
                    that.loginBtn = false
                }
            })
        },

        loginSuccess () {
            // 学生登录成功后跳转到学生主页
            this.$router.push({ path: '/student/home' })
            this.$notification.success({
                message: '欢迎',
                description: `${timeFix()}，欢迎回来`
            })
        },

        requestFailed (err) {
            // 优先使用服务器返回的友好消息
            const serverMsg = (err.response && err.response.data && err.response.data.message) || ''
            // 如果服务器消息是中文且不包含技术性内容，直接使用
            const isFriendlyMsg = serverMsg && /^[\u4e00-\u9fa5]/.test(serverMsg) && !serverMsg.includes('Error')
            const description = isFriendlyMsg ? serverMsg : '登录失败，请检查用户名和密码是否正确'

            this.$notification[ 'error' ]({
                message: '登录失败',
                description: description,
                duration: 4
            })
            this.loginBtn = false
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

        switchToTeacherLogin () {
            this.$router.push({ name: 'user-login' })
        }
    }
}
</script>

<style lang="less" scoped>
.main {
  max-width: 400px;
  margin: 0 auto;
  padding: 40px 20px;
}

.student-login-header {
  text-align: center;
  margin-bottom: 40px;

  h2 {
    color: #1890ff;
    font-size: 28px;
    margin-bottom: 8px;
  }

  p {
    color: #666;
    font-size: 16px;
  }
}

.user-layout-login {
  label {
    font-size: 14px;
  }

  .teacher-login {
    color: #1890ff;
    font-size: 14px;
    text-decoration: none;

    &:hover {
      color: #40a9ff;
    }
  }

  button.login-button {
    padding: 0 15px;
    font-size: 16px;
    height: 40px;
    width: 100%;
    background: #1890ff;
    border-color: #1890ff;
  }
}

.register-link {
  text-align: center;
  margin-top: 20px;
  color: #999;
  font-size: 14px;
}

.role-switch-container {
  margin-top: 16px;
}
</style>
