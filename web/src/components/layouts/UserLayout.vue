<template>
  <div id="userLayout" :class="['user-layout-wrapper', device]">
    <div class="container">
      <div class="top">
        <div class="header">
          <img :src="logo" class="logo" alt="logo">
          <h3 class="title">{{ brandName }}</h3>
        </div>
        <div class="desc">
          {{ brandDesc }}
        </div>
      </div>

      <route-view></route-view>

      <div class="footer" v-html="footer">
      </div>
    </div>
  </div>
</template>

<script>
import RouteView from '@/components/layouts/RouteView'
import { mixinDevice } from '@/utils/mixin.js'
import { getFileAccessHttpUrl } from '@/api/manage'
export default {
    name: 'UserLayout',
    components: { RouteView },
    mixins: [mixinDevice],
    data () {
        const sysConfig = this.$store.getters.sysConfig || {}
        return {
            brandName: sysConfig.brandName || '乐启享',
            brandDesc: sysConfig.brandDesc || '青少年编程教学平台',
            logo: '/logo11.png',
            footer: sysConfig.footer || 'Copyright  2025 Teaching Open'
        }
    },
    created () {
        const sysConfig = this.$store.getters.sysConfig || {}
        if (sysConfig.logo) {
            this.logo = getFileAccessHttpUrl(sysConfig.logo)
        } else {
            this.logo = '/logo11.png'
        }
    },
    mounted () {
        document.body.classList.add('userLayout')
    },
    beforeDestroy () {
        document.body.classList.remove('userLayout')
    }
}
</script>

<style lang="less" scoped>
  #userLayout.user-layout-wrapper {
    height: 100%;

    &.mobile {
      .container {
        .main {
          max-width: 368px;
          width: 98%;
        }
      }
    }

    .container {
      width: 100%;
      min-height: 100%;
      background: #f0f2f5 url(~@/assets/background.svg) no-repeat 50%;
      background-size: 100%;
      padding: 50px 0 44px;
      position: relative;

      a {
        text-decoration: none;
      }

      .top {
        text-align: center;

        .header {
          max-height: 144px;
          line-height: 44px;

          .logo {
            height: 44px;
            max-width: 100%;
            object-fit: contain;
            vertical-align: top;
            margin-right: 16px;
            border-style: none;
          }

          .title {
            font-size: 33px;
            color: rgba(0, 0, 0, .85);
            font-family: "Chinese Quote", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
            font-weight: 600;
            position: relative;
            top: 2px;
          }
        }
        .desc {
          font-size: 14px;
          color: rgba(0, 0, 0, 0.45);
          margin-top: 12px;
          margin-bottom: 40px;
        }
      }

      .main {
        min-width: 260px;
        width: 368px;
        margin: 0 auto 60px;
      }

      .footer {
        position: absolute;
        width: 100%;
        bottom: 0;
        padding: 0 16px;
        margin: 48px 0 24px;
        text-align: center;

        .links {
          margin-bottom: 8px;
          font-size: 14px;
          a {
            color: rgba(0, 0, 0, 0.45);
            transition: all 0.3s;
            &:not(:last-child) {
              margin-right: 40px;
            }
          }
        }
        .copyright {
          color: rgba(0, 0, 0, 0.45);
          font-size: 14px;
        }
      }
    }
  }
</style>
