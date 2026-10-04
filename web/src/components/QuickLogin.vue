<template>
  <div class="quick-login">
    <a-card title="离线教学快速登录" style="width: 300px; margin: 20px auto;">
      <a-space direction="vertical" style="width: 100%;">
        <a-button type="primary" size="large" block @click="loginAsTeacher">
          <a-icon type="user" />
          教师登录
        </a-button>

        <a-button type="default" size="large" block @click="loginAsStudent">
          <a-icon type="team" />
          学生登录
        </a-button>

        <a-divider>当前登录状态</a-divider>

        <a-descriptions size="small" :column="1">
          <a-descriptions-item label="用户角色">
            {{ currentUser.userType === 'teacher' ? '教师' : '学生' }}
          </a-descriptions-item>
          <a-descriptions-item label="用户名">
            {{ currentUser.username }}
          </a-descriptions-item>
          <a-descriptions-item label="登录时间">
            {{ currentUser.loginTime }}
          </a-descriptions-item>
        </a-descriptions>

        <a-button type="link" size="small" @click="switchUser">
          切换用户
        </a-button>
      </a-space>
    </a-card>
  </div>
</template>

<script>
import { ACCESS_TOKEN } from '@/store/mutation-types'
import { resolveTeachingAccess } from '@/utils/teachingAccess'

export default {
    name: 'QuickLogin',
    data () {
        return {
            currentUser: {
                userType: 'teacher',
                username: 'teacher',
                loginTime: new Date().toLocaleString()
            }
        }
    },
    mounted () {
        this.getCurrentUserInfo()
    },
    methods: {
        loginAsTeacher () {
            this.performLogin('teacher', '教师')
        },

        loginAsStudent () {
            this.performLogin('student', '学生')
        },

        performLogin (userType, userTypeName) {
            this.$store.dispatch('Login', {
                username: userType,
                password: '123456',
                loginType: userType
            }).then((res) => {
                this.$ls.set(ACCESS_TOKEN, res.token, 7 * 24 * 60 * 60 * 1000)
                this.currentUser = {
                    userType: userType,
                    username: userType,
                    loginTime: new Date().toLocaleString()
                }
                this.$message.success(`${userTypeName}登录成功`)

                // 刷新权限和路由
                this.$store.dispatch('GetPermissionList').then(() => {
                    const userInfo = this.$store.getters.userInfo || {}
                    const access = resolveTeachingAccess({
                        userRole: this.$store.getters.userRole || [],
                        userType: this.$store.getters.userType || userInfo.userType || '',
                        userInfo
                    })
                    this.$router.push(access.homePath || '/portal/home')
                })
            }).catch((error) => {
                this.$message.error(`${userTypeName}登录失败`)
                console.error('Login failed:', error)
            })
        },

        switchUser () {
            this.$ls.remove(ACCESS_TOKEN)
            this.$store.dispatch('Logout').then(() => {
                this.$message.info('已退出登录')
                this.$router.push('/portal/home')
            })
        },

        getCurrentUserInfo () {
            const userInfo = this.$store.getters.userInfo
            if (userInfo && userInfo.username) {
                this.currentUser = {
                    userType: userInfo.userType || 'teacher',
                    username: userInfo.username,
                    loginTime: this.currentUser.loginTime
                }
            }
        }
    }
}
</script>

<style scoped>
.quick-login {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>
