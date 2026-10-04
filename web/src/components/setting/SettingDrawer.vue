<template>
  <div class="setting-drawer">
    <a-drawer
      width="300"
      placement="right"
      :closable="false"
      @close="onClose"
      :visible="visible"
      :style="{}"
    >
      <div class="setting-drawer-index-content">

        <div :style="{ marginBottom: '24px' }">
          <h3 class="setting-drawer-index-title">主题设置</h3>

          <div class="setting-drawer-index-blockChecbox">
            <a-tooltip>
              <template slot="title">
                深色主题
              </template>
              <div class="setting-drawer-index-item" @click="handleMenuTheme('dark')">
                <img src="https://gw.alipayobjects.com/zos/rmsportal/LCkqqYNmvBEbokSDscrm.svg" alt="dark">
                <div class="setting-drawer-index-selectIcon" v-if="navTheme === 'dark'">
                  <a-icon type="check"/>
                </div>
              </div>
            </a-tooltip>

            <a-tooltip>
              <template slot="title">
                浅色主题
              </template>
              <div class="setting-drawer-index-item" @click="handleMenuTheme('light')">
                <img src="https://gw.alipayobjects.com/zos/rmsportal/jpRkZQMyYRryryPNtyIC.svg" alt="light">
                <div class="setting-drawer-index-selectIcon" v-if="navTheme !== 'dark'">
                  <a-icon type="check"/>
                </div>
              </div>
            </a-tooltip>
          </div>
        </div>

      </div>
      <div class="setting-drawer-index-handle" @click="toggle" v-if="visible">
        <a-icon type="close" />
      </div>
    </a-drawer>
  </div>
</template>

<script>
import { mixin, mixinDevice } from '@/utils/mixin.js'

export default {
    mixins: [mixin, mixinDevice],
    data () {
        return {
            visible: true
        }
    },
    mounted () {
        const vm = this
        setTimeout(() => {
            vm.visible = false
        }, 16)
    },
    methods: {
        showDrawer () {
            this.visible = true
        },
        onClose () {
            this.visible = false
        },
        toggle () {
            this.visible = !this.visible
        },
        handleMenuTheme (theme) {
            this.$store.dispatch('ToggleTheme', theme)
            this.$message.success(`已切换到${theme === 'dark' ? '深色' : '浅色'}主题`)
        }
    }
}
</script>

<style lang="less" scoped>

  .setting-drawer-index-content {

    .setting-drawer-index-blockChecbox {
      display: flex;

      .setting-drawer-index-item {
        margin-right: 16px;
        position: relative;
        border-radius: 4px;
        cursor: pointer;

        img {
          width: 48px;
        }

        .setting-drawer-index-selectIcon {
          position: absolute;
          top: 0;
          right: 0;
          width: 100%;
          padding-top: 15px;
          padding-left: 24px;
          height: 100%;
          color: #1890ff;
          font-size: 14px;
          font-weight: 700;
        }
      }
    }
    .setting-drawer-theme-color-colorBlock {
      width: 20px;
      height: 20px;
      border-radius: 2px;
      float: left;
      cursor: pointer;
      margin-right: 8px;
      padding-left: 0px;
      padding-right: 0px;
      text-align: center;
      color: #fff;
      font-weight: 700;

      i {
        font-size: 14px;
      }
    }
  }

  .setting-drawer-index-handle {
    position: absolute;
    top: 240px;
    background: #1890ff;
    width: 48px;
    height: 48px;
    right: 300px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    pointer-events: auto;
    z-index: 1001;
    text-align: center;
    font-size: 16px;
    border-radius: 4px 0 0 4px;

    i {
      color: rgb(255, 255, 255);
      font-size: 20px;
    }
  }
</style>
