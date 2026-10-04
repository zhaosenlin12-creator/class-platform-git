<template>
  <a-button
    v-bind="$attrs"
    v-on="$listeners"
    :loading="loading"
    @click="handleClick"
  >
    <slot />
  </a-button>
</template>

<script>
export default {
    name: 'LoadingButton',
    inheritAttrs: false,
    props: {
        asyncAction: {
            type: Function,
            default: null
        },
        confirmText: {
            type: String,
            default: null
        },
        successMessage: {
            type: String,
            default: '操作成功'
        },
        loadingText: {
            type: String,
            default: '处理中...'
        }
    },
    data () {
        return {
            loading: false
        }
    },
    methods: {
        async handleClick (event) {
            if (this.asyncAction) {
                let loadingHandle = null
                try {
                    if (this.confirmText) {
                        await this.$confirm(this.confirmText, '确认操作')
                    }

                    this.loading = true
                    const loadingKey = 'loadingButton'
                    loadingHandle = this.$loadingManager.startLoading(loadingKey, this.loadingText)

                    const result = await this.asyncAction()

                    if (result && result.success) {
                        this.$showSuccess('操作成功', this.successMessage)
                    }

                    this.$emit('success', result)
                } catch (error) {
                    if (error !== 'cancel') {
                        this.$handleApiError(error, '按钮操作')
                        this.$emit('error', error)
                    }
                } finally {
                    this.loading = false
                    if (loadingHandle) {
                        this.$loadingManager.stopLoading(loadingHandle)
                    }
                }
            } else {
                this.$emit('click', event)
            }
        }
    }
}
</script>
