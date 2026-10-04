<template>
  <div class="skeleton-loader">
    <a-skeleton
      :loading="loading"
      :active="active"
      :avatar="avatar"
      :paragraph="paragraph"
      :title="title"
    >
      <slot></slot>
    </a-skeleton>
  </div>
</template>

<script>
export default {
    name: 'SkeletonLoader',
    props: {
        loading: {
            type: Boolean,
            default: true
        },
        active: {
            type: Boolean,
            default: true
        },
        avatar: {
            type: [Boolean, Object],
            default: false
        },
        paragraph: {
            type: [Boolean, Object],
            default: () => ({ rows: 4 })
        },
        title: {
            type: [Boolean, Object],
            default: true
        }
    }
}
</script>

<style scoped>
.skeleton-loader {
  padding: 24px;
}
</style>
