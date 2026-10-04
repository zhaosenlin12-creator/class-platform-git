<template>
  <a-input-search
    v-model="localValue"
    :placeholder="placeholder"
    :style="style"
    :size="size"
    :allow-clear="allowClear"
    :loading="isSearching"
    @search="handleImmediateSearch"
    @change="handleInputChange"
    @pressEnter="handleImmediateSearch"
  >
    <a-icon v-if="customIcon" slot="prefix" :type="customIcon" />
  </a-input-search>
</template>

<script>
import { sanitizeInput, sanitizeSQLInput } from '@/utils/security'

export default {
    name: 'DebouncedSearch',
    props: {
        value: {
            type: String,
            default: ''
        },
        placeholder: {
            type: String,
            default: '请输入搜索关键词'
        },
        delay: {
            type: Number,
            default: 300
        },
        style: {
            type: [String, Object],
            default: 'width: 200px'
        },
        size: {
            type: String,
            default: 'default',
            validator: value => ['small', 'default', 'large'].includes(value)
        },
        allowClear: {
            type: Boolean,
            default: true
        },
        customIcon: {
            type: String,
            default: ''
        },
        // 安全选项
        sanitize: {
            type: Boolean,
            default: true
        },
        sanitizeSQL: {
            type: Boolean,
            default: false
        },
        maxLength: {
            type: Number,
            default: 100
        },
        minLength: {
            type: Number,
            default: 0
        }
    },
    data () {
        return {
            localValue: this.value,
            searchDebounceTimer: null,
            isSearching: false
        }
    },
    watch: {
        value (newVal) {
            this.localValue = newVal
        }
    },
    methods: {
    /**
     * 输入变化处理 - 防抖搜索
     */
        handleInputChange (e) {
            const value = e.target.value

            // 清除之前的定时器
            if (this.searchDebounceTimer) {
                clearTimeout(this.searchDebounceTimer)
            }

            // 设置新的防抖定时器
            this.searchDebounceTimer = setTimeout(() => {
                this.performSearch(value)
            }, this.delay)
        },

        /**
     * 立即搜索 (点击搜索按钮或回车)
     */
        handleImmediateSearch () {
            // 清除防抖定时器
            if (this.searchDebounceTimer) {
                clearTimeout(this.searchDebounceTimer)
            }
            this.performSearch(this.localValue)
        },

        /**
     * 执行搜索
     */
        performSearch (value) {
            // 1. 长度验证
            if (this.minLength > 0 && value.length < this.minLength && value.length > 0) {
                this.$message.warning(`搜索关键词至少需要${this.minLength}个字符`)
                return
            }

            // 2. 安全清理
            let cleanedValue = value

            if (this.sanitize) {
                if (this.sanitizeSQL) {
                    // SQL注入防护
                    cleanedValue = sanitizeSQLInput(value)
                } else {
                    // 普通XSS防护
                    cleanedValue = sanitizeInput(value, {
                        maxLength: this.maxLength,
                        allowSpaces: true
                    })
                }

                // 检查清理后是否有变化
                if (cleanedValue !== value && value.length > 0) {
                    this.$message.warning('搜索关键词包含非法字符,已自动过滤')
                    this.localValue = cleanedValue
                }
            }

            // 3. 触发搜索事件
            this.isSearching = true

            this.$emit('input', cleanedValue)
            this.$emit('search', cleanedValue)

            // 模拟搜索延迟 (实际项目中由父组件处理)
            setTimeout(() => {
                this.isSearching = false
            }, 500)
        },

        /**
     * 清空搜索
     */
        clearSearch () {
            this.localValue = ''
            this.performSearch('')
        }
    },
    beforeDestroy () {
    // 清理定时器
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer)
        }
    }
}
</script>

<style scoped>
/* 可选:添加加载动画样式 */
</style>
