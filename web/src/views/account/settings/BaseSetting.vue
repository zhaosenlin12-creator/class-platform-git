<template>
  <div class="account-settings-info-view">
    <a-row :gutter="16">
      <a-col :md="24" :lg="16">
        <a-form layout="vertical" :form="form">
          <a-form-item label="真实姓名" :labelCol="labelCol" :wrapperCol="wrapperCol">
            <a-input
              placeholder="请输入真实姓名"
              v-decorator="['realname', validatorRules.realname]"
            />
          </a-form-item>

          <a-form-item label="头像" :labelCol="labelCol" :wrapperCol="wrapperCol">
            <div class="avatar-display">
              <a-avatar :size="64" :src="userInfo.avatar" icon="user" />
              <span class="avatar-tip">头像由系统自动分配，当前版本不支持手动修改。</span>
            </div>
          </a-form-item>

          <a-form-item label="生日" :labelCol="labelCol" :wrapperCol="wrapperCol">
            <a-date-picker
              style="width: 100%"
              placeholder="请选择生日"
              v-decorator="['birthday']"
            />
          </a-form-item>

          <a-form-item label="性别" :labelCol="labelCol" :wrapperCol="wrapperCol">
            <a-select v-decorator="['sex']" placeholder="请选择性别" allowClear>
              <a-select-option :value="1">男</a-select-option>
              <a-select-option :value="2">女</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="邮箱" :labelCol="labelCol" :wrapperCol="wrapperCol">
            <a-input
              placeholder="请输入邮箱"
              v-decorator="['email', validatorRules.email]"
            />
          </a-form-item>

          <a-form-item label="手机号" :labelCol="labelCol" :wrapperCol="wrapperCol">
            <a-input
              placeholder="请输入手机号"
              v-decorator="['phone', validatorRules.phone]"
            />
          </a-form-item>

          <a-form-item>
            <a-button type="primary" :loading="confirmLoading" @click="handleSubmit">
              提交
            </a-button>
          </a-form-item>
        </a-form>
      </a-col>
    </a-row>

    <avatar-modal ref="modal"></avatar-modal>
  </div>
</template>

<script>
import Vue from 'vue'
import moment from 'moment'
import pick from 'lodash.pick'
import AvatarModal from './AvatarModal'
import { duplicateCheck } from '@/api/api'
import { getAction, putAction } from '@/api/manage'
import { USER_INFO } from '@/store/mutation-types'

export default {
    components: {
        AvatarModal
    },
    data () {
        return {
            dateFormat: 'YYYY-MM-DD',
            labelCol: {
                xs: { span: 24 },
                sm: { span: 5 }
            },
            wrapperCol: {
                xs: { span: 24 },
                sm: { span: 16 }
            },
            confirmLoading: false,
            userId: '',
            userInfo: {},
            form: this.$form.createForm(this),
            validatorRules: {
                realname: { rules: [{ required: true, message: '请输入真实姓名' }] },
                phone: { rules: [{ validator: this.validatePhone }] },
                email: {
                    rules: [
                        {
                            validator: this.validateEmail
                        }
                    ]
                }
            },
            url: {
                userInfo: '/teaching/user/info',
                editUser: '/teaching/user/edit'
            }
        }
    },
    mounted () {
        this.getUserInfo()
    },
    methods: {
        moment,
        async getUserInfo () {
            const res = await getAction(this.url.userInfo)
            if (!res || !res.success) {
                return
            }

            this.userInfo = res.result || {}
            this.userId = this.userInfo.id || ''
            this.applyFormValues(this.userInfo)
        },
        applyFormValues (userInfo) {
            this.$nextTick(() => {
                this.form.setFieldsValue({
                    ...pick(userInfo, 'realname', 'sex', 'email', 'phone'),
                    birthday: userInfo.birthday ? moment(userInfo.birthday, this.dateFormat) : null
                })
            })
        },
        async handleSubmit () {
            this.form.validateFields(async (err, values) => {
                if (err) {
                    return
                }

                this.confirmLoading = true
                try {
                    const formData = {
                        realname: values.realname,
                        sex: values.sex,
                        email: values.email || null,
                        phone: values.phone || null,
                        birthday: values.birthday ? values.birthday.format(this.dateFormat) : ''
                    }

                    const res = await putAction(this.url.editUser, formData)
                    if (!res || !res.success) {
                        this.$message.warning((res && res.message) || '保存失败')
                        return
                    }

                    const latestUserInfo = {
                        ...this.userInfo,
                        ...formData,
                        ...(res.result || {})
                    }

                    this.userInfo = latestUserInfo
                    this.persistUserInfo(latestUserInfo)
                    this.applyFormValues(latestUserInfo)
                    this.$message.success(res.message || '更新成功')
                    this.$emit('ok')
                } finally {
                    this.confirmLoading = false
                }
            })
        },
        persistUserInfo (userInfo) {
            const expire = 7 * 24 * 60 * 60 * 1000
            this.$store.commit('SET_INFO', userInfo)
            Vue.ls.set(USER_INFO, userInfo, expire)
        },
        validatePhone (rule, value, callback) {
            if (!value) {
                callback()
                return
            }

            if (!/^1[3-9]\d{9}$/.test(value)) {
                callback(new Error('请输入正确格式的手机号'))
                return
            }

            duplicateCheck({
                tableName: 'sys_user',
                fieldName: 'phone',
                fieldVal: value,
                dataId: this.userId
            }).then(res => {
                if (res.success) {
                    callback()
                } else {
                    callback(new Error('手机号已存在'))
                }
            })
        },
        validateEmail (rule, value, callback) {
            if (!value) {
                callback()
                return
            }

            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailPattern.test(value)) {
                callback(new Error('请输入正确格式的邮箱'))
                return
            }

            duplicateCheck({
                tableName: 'sys_user',
                fieldName: 'email',
                fieldVal: value,
                dataId: this.userId
            }).then(res => {
                if (res.success) {
                    callback()
                } else {
                    callback(new Error('邮箱已存在'))
                }
            })
        }
    }
}
</script>

<style lang="less" scoped>
.avatar-display {
  display: flex;
  align-items: center;
  gap: 16px;

  .avatar-tip {
    color: #999;
    font-size: 12px;
  }
}

.avatar-upload-wrapper {
  height: 200px;
  width: 100%;
}

.ant-upload-preview {
  position: relative;
  margin: 0 auto;
  width: 100%;
  max-width: 180px;
  border-radius: 50%;
  box-shadow: 0 0 4px #ccc;

  .upload-icon {
    position: absolute;
    top: 0;
    right: 10px;
    font-size: 1.4rem;
    padding: 0.5rem;
    background: rgba(222, 221, 221, 0.7);
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.2);
  }

  .mask {
    opacity: 0;
    position: absolute;
    background: rgba(0, 0, 0, 0.4);
    cursor: pointer;
    transition: opacity 0.4s;
  }
}
</style>
