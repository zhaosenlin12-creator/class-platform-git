<template>
  <div class="student-profile">
    <a-row :gutter="16">
      <a-col :span="8">
        <a-card>
          <div class="profile-header">
            <a-avatar size="large" :src="profileInfo.avatar || userInfo.avatar" icon="user" />
            <h3>{{ displayName }}</h3>
            <p>学号：{{ displayWorkNo }}</p>
            <p>班级：{{ displayDepartName }}</p>
          </div>
          <a-divider />
          <div class="profile-stats">
            <a-statistic title="学习天数" :value="stats.studyDays" suffix="天" />
            <a-statistic title="总学时" :value="stats.totalHours" suffix="小时" />
            <a-statistic title="完成课程" :value="stats.completedCourses" suffix="门" />
          </div>
        </a-card>
      </a-col>

      <a-col :span="16">
        <a-card>
          <a-tabs v-model="activeTab">
            <a-tab-pane key="info" tab="个人信息">
              <a-form layout="vertical" :form="form">
                <a-row :gutter="16">
                  <a-col :span="12">
                    <a-form-item label="真实姓名">
                      <a-input v-model="editForm.realName" :disabled="!editMode" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="性别">
                      <a-select v-model="editForm.sex" :disabled="!editMode">
                        <a-select-option :value="1">男</a-select-option>
                        <a-select-option :value="2">女</a-select-option>
                      </a-select>
                    </a-form-item>
                  </a-col>
                </a-row>
                <a-row :gutter="16">
                  <a-col :span="12">
                    <a-form-item label="出生日期">
                      <a-date-picker v-model="editForm.birthday" :disabled="!editMode" style="width: 100%" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="联系电话">
                      <a-input v-model="editForm.phone" :disabled="!editMode" />
                    </a-form-item>
                  </a-col>
                </a-row>
                <a-form-item label="邮箱">
                  <a-input v-model="editForm.email" :disabled="!editMode" />
                </a-form-item>
                <a-form-item>
                  <a-button v-if="!editMode" type="primary" @click="toggleEdit">编辑信息</a-button>
                  <template v-else>
                    <a-button type="primary" :loading="saveLoading" @click="saveProfile" style="margin-right: 8px">保存</a-button>
                    <a-button @click="cancelEdit">取消</a-button>
                  </template>
                </a-form-item>
              </a-form>
            </a-tab-pane>

            <a-tab-pane key="learning" tab="学习记录">
              <a-timeline>
                <a-timeline-item v-for="record in learningRecords" :key="record.id">
                  <div class="learning-record">
                    <h4>{{ record.title }}</h4>
                    <p>{{ record.description }}</p>
                    <small>{{ record.time }}</small>
                  </div>
                </a-timeline-item>
              </a-timeline>
            </a-tab-pane>

            <a-tab-pane key="achievements" tab="成就">
              <a-row :gutter="16">
                <a-col :span="8" v-for="achievement in achievements" :key="achievement.id">
                  <a-card class="achievement-card" :class="{ earned: achievement.earned }">
                    <a-icon :type="achievement.icon" :style="{ fontSize: '32px', color: achievement.earned ? '#52c41a' : '#d9d9d9' }" />
                    <h4>{{ achievement.title }}</h4>
                    <p>{{ achievement.description }}</p>
                    <a-tag v-if="achievement.earned" color="green">已获得</a-tag>
                    <a-tag v-else color="gray">未获得</a-tag>
                  </a-card>
                </a-col>
              </a-row>
            </a-tab-pane>
          </a-tabs>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import Vue from 'vue'
import { mapGetters } from 'vuex'
import moment from 'moment'
import { getAction, putAction } from '@/api/manage'
import { USER_INFO } from '@/store/mutation-types'

export default {
    name: 'StudentProfile',
    data () {
        return {
            activeTab: 'info',
            editMode: false,
            saveLoading: false,
            form: this.$form.createForm(this),
            profileInfo: {},
            editForm: {
                realName: '',
                sex: 1,
                birthday: null,
                phone: '',
                email: ''
            },
            stats: {
                studyDays: 45,
                totalHours: 68,
                completedCourses: 3
            },
            learningRecords: [
                {
                    id: '1',
                    title: '完成课程：Scratch入门编程',
                    description: '恭喜你完成了Scratch编程的学习！',
                    time: '2024-01-20 14:30'
                },
                {
                    id: '2',
                    title: '提交作业：制作小猫追球游戏',
                    description: '作业得分：95分',
                    time: '2024-01-18 16:45'
                },
                {
                    id: '3',
                    title: '开始学习：Python基础教程',
                    description: '开始了新的编程语言学习之旅',
                    time: '2024-01-15 10:20'
                }
            ],
            achievements: [
                {
                    id: '1',
                    title: '编程新手',
                    description: '完成第一个Scratch项目',
                    icon: 'star',
                    earned: true
                },
                {
                    id: '2',
                    title: '坚持学习',
                    description: '连续学习7天',
                    icon: 'trophy',
                    earned: true
                },
                {
                    id: '3',
                    title: '编程达人',
                    description: '完成5门编程课程',
                    icon: 'crown',
                    earned: false
                },
                {
                    id: '4',
                    title: '作业之星',
                    description: '10个作业得分超过90分',
                    icon: 'medal',
                    earned: false
                }
            ]
        }
    },
    computed: {
        ...mapGetters(['userInfo']),
        displayName () {
            return this.profileInfo.realName || this.profileInfo.realname || this.userInfo.realName || this.userInfo.realname || this.userInfo.username || ''
        },
        displayWorkNo () {
            return this.profileInfo.workNo || this.profileInfo.studentNo || this.profileInfo.student_no || this.userInfo.workNo || this.userInfo.studentNo || this.userInfo.student_no || '-'
        },
        displayDepartName () {
            return this.profileInfo.departName || this.profileInfo.className || this.userInfo.departName || this.userInfo.className || '-'
        }
    },
    created () {
        this.profileInfo = this.normalizeProfileInfo(this.userInfo || {})
        this.initEditForm()
        this.loadProfile()
    },
    methods: {
        normalizeProfileInfo (profile = {}) {
            const realname = profile.realname || profile.realName || profile.username || ''
            return {
                ...profile,
                realname,
                realName: realname,
                avatar: profile.avatar || this.userInfo.avatar || ''
            }
        },
        applyProfileInfo (profile = {}) {
            this.profileInfo = this.normalizeProfileInfo(profile)
            this.editForm = {
                realName: this.profileInfo.realName || '',
                sex: this.profileInfo.sex !== undefined && this.profileInfo.sex !== null ? this.profileInfo.sex : 1,
                birthday: this.profileInfo.birthday ? moment(this.profileInfo.birthday) : null,
                phone: this.profileInfo.phone || '',
                email: this.profileInfo.email || ''
            }
        },
        async loadProfile () {
            try {
                const response = await getAction('/teaching/user/info')
                if (response && response.success && response.result) {
                    this.applyProfileInfo(response.result)
                    this.persistUserInfo(response.result)
                }
            } catch (_error) {
                this.applyProfileInfo(this.userInfo || {})
            }
        },
        initEditForm () {
            this.applyProfileInfo(this.profileInfo && Object.keys(this.profileInfo).length > 0 ? this.profileInfo : (this.userInfo || {}))
        },
        toggleEdit () {
            this.editMode = true
        },
        persistUserInfo (profile = {}) {
            const nextUserInfo = this.normalizeProfileInfo({
                ...(this.userInfo || {}),
                ...profile
            })
            const expire = 7 * 24 * 60 * 60 * 1000
            this.$store.commit('SET_INFO', nextUserInfo)
            Vue.ls.set(USER_INFO, nextUserInfo, expire)
        },
        async saveProfile () {
            if (this.saveLoading) {
                return
            }

            this.saveLoading = true
            try {
                const payload = {
                    realname: String(this.editForm.realName || '').trim(),
                    sex: this.editForm.sex,
                    birthday: this.editForm.birthday ? this.editForm.birthday.format('YYYY-MM-DD') : '',
                    phone: String(this.editForm.phone || '').trim() || null,
                    email: String(this.editForm.email || '').trim() || null
                }

                const response = await putAction('/teaching/user/edit', payload)
                if (!response || !response.success) {
                    throw new Error((response && response.message) || '个人信息保存失败')
                }

                const latestProfile = this.normalizeProfileInfo({
                    ...this.profileInfo,
                    ...payload,
                    ...(response.result || {})
                })
                this.applyProfileInfo(latestProfile)
                this.persistUserInfo(latestProfile)
                this.editMode = false
                this.$message.success(response.message || '个人信息保存成功')
            } catch (error) {
                this.$message.error(error.message || '个人信息保存失败')
            } finally {
                this.saveLoading = false
            }
        },
        cancelEdit () {
            this.initEditForm()
            this.editMode = false
        }
    }
}
</script>

<style scoped lang="less">
.student-profile {
  padding: 24px;

  .profile-header {
    text-align: center;
    padding: 24px 0;

    h3 {
      margin: 16px 0 8px 0;
      color: #1890ff;
    }

    p {
      margin: 4px 0;
      color: #666;
    }
  }

  .profile-stats {
    .ant-statistic {
      text-align: center;
      margin-bottom: 16px;
    }
  }

  .learning-record {
    h4 {
      margin: 0 0 8px 0;
      color: #1890ff;
    }

    p {
      margin: 0 0 4px 0;
      color: #666;
    }

    small {
      color: #999;
    }
  }

  .achievement-card {
    text-align: center;
    margin-bottom: 16px;
    padding: 16px;

    &.earned {
      background: #f6ffed;
      border-color: #52c41a;
    }

    h4 {
      margin: 12px 0 8px 0;
    }

    p {
      color: #666;
      margin-bottom: 12px;
    }
  }
}
</style>
