<template>
  <div class="teacher-resource-library">
    <a-card title="教学资源库" class="resource-card">
      <div class="coming-soon">
        <a-empty description="教学资源库功能开发中">
          <a-button type="primary" @click="$router.push('/teacher/dashboard')">
            返回工作台
          </a-button>
        </a-empty>
      </div>
    </a-card>
  </div>
</template>

<script>
export default {
    name: 'TeacherResourceLibrary'
}
</script>

<style lang="less" scoped>
.teacher-resource-library {
  padding: 24px;
  min-height: 100vh;
  background: #f0f2f5;

  .resource-card {
    .coming-soon {
      text-align: center;
      padding: 60px 0;
    }
  }
}
</style>
