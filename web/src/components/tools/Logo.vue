<template>
  <div class="logo">
    <router-link :to="{path:'/portal/home'}">
      <img :src="logo" alt="logo">
      <h1 v-if="showTitle">{{ brandName }}</h1>
    </router-link>
  </div>
</template>

<script>
import { mixin } from '@/utils/mixin.js'

export default {
    name: 'Logo',
    mixins: [mixin],
    props: {
        showTitle: {
            type: Boolean,
            default: true,
            required: false
        }
    },
    data () {
        const sysConfig = this.$store.getters.sysConfig || {}
        return {
            brandName: sysConfig.brandName || '乐启享',
            logo: '/logo11.png'
        }
    },
    created () {
        const sysConfig = this.$store.getters.sysConfig || {}
        if (sysConfig.logo && sysConfig.qiniuDomain) {
            this.logo = sysConfig.qiniuDomain + '/' + sysConfig.logo
        } else {
            this.logo = '/logo11.png'
        }
    }
}
</script>
<style lang="less" scoped>
  /*缩小首页布 局顶部的高度*/
  @height: 59px;

  .sider {
    box-shadow: none !important;
    .logo {
      height: @height !important;
      line-height: @height !important;
      box-shadow: none !important;
      transition: background 300ms;
      display: flex;
      align-items: center;
      padding-left: 24px;

      a {
        color: white;
        display: flex;
        align-items: center;
        width: 100%;
        &:hover {
          color: rgba(255, 255, 255, 0.8);
        }
      }

      img {
        height: 32px;
        max-width: 140px;
        object-fit: contain;
        margin-right: 12px;
      }

      h1 {
        margin: 0;
        font-size: 18px;
        color: white;
        font-weight: 600;
        // 允许长名称省略号
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    &.light .logo {
      background-color: @primary-color;
    }
  }
</style>
