<template>
  <div class="work-list-redirect">
    <a-spin tip="正在跳转到作品资源库..." />
  </div>
</template>

<script>
export default {
    name: 'PortalWorkListRedirect',
    mounted () {
        const tab = this.$route.query.tab === 'my' ? 'my' : 'all'
        this.$router.replace({
            path: '/student/works',
            query: {
                ...this.$route.query,
                tab
            }
        })
    }
}
</script>

<style scoped>
.work-list-redirect {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 320px;
}
</style>
