<template>
  <div class="footer">
    <span class="brand">乐启享</span>
    <span class="divider">|</span>
    <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">鄂ICP备2025149404号-1</a>
  </div>
</template>

<script>
export default {
    name: 'LayoutFooter'
}
</script>

<style lang="less" scoped>
  .footer {
    padding: 16px;
    text-align: center;
    font-size: 12px;
    color: rgba(0, 0, 0, .45);

    .brand {
      color: rgba(0, 0, 0, .65);
    }

    .divider {
      margin: 0 8px;
      color: rgba(0, 0, 0, .25);
    }

    a {
      color: rgba(0, 0, 0, .45);
      text-decoration: none;

      &:hover {
        color: #1890ff;
      }
    }
  }
</style>
