<template>
  <div class="analytics-main">
    <a-layout>
      <a-layout-sider
        v-model="collapsed"
        :trigger="null"
        collapsible
        width="240"
        style="background: #fff; min-height: calc(100vh - 64px)"
      >
        <a-menu
          v-model="selectedKeys"
          mode="inline"
          :inline-collapsed="collapsed"
          style="border-right: 0"
          @click="onMenuClick"
        >
          <a-menu-item key="dashboard">
            <a-icon type="dashboard" />
            <span>学习仪表板</span>
          </a-menu-item>
          <a-menu-item key="path">
            <a-icon type="node-index" />
            <span>学习路径</span>
          </a-menu-item>
          <a-menu-item key="behavior">
            <a-icon type="bar-chart" />
            <span>行为分析</span>
          </a-menu-item>
          <a-menu-item key="warning">
            <a-icon type="alert" />
            <span>学习预警</span>
          </a-menu-item>
          <a-menu-item key="report">
            <a-icon type="file-text" />
            <span>学习报告</span>
          </a-menu-item>
        </a-menu>
      </a-layout-sider>

      <a-layout-content style="margin: 0; padding: 24px; background: #f0f2f5">
        <div style="background: #fff; min-height: 360px">
          <!-- 学习仪表板 -->
          <learning-analytics-dashboard
            v-if="currentView === 'dashboard'"
            :key="dashboardKey"
          />

          <!-- 学习路径分析 -->
          <learning-path-analysis
            v-if="currentView === 'path'"
            :key="pathKey"
          />

          <!-- 行为分析 -->
          <div v-if="currentView === 'behavior'" class="behavior-analysis">
            <a-card title="学习行为分析" :bordered="false">
              <a-empty description="行为分析功能开发中..." />
            </a-card>
          </div>

          <!-- 学习预警 -->
          <div v-if="currentView === 'warning'" class="warning-management">
            <a-card title="学习预警管理" :bordered="false">
              <learning-warning-list />
            </a-card>
          </div>

          <!-- 学习报告 -->
          <div v-if="currentView === 'report'" class="report-management">
            <a-card title="学习报告" :bordered="false">
              <a-empty description="学习报告功能开发中..." />
            </a-card>
          </div>
        </div>
      </a-layout-content>
    </a-layout>
  </div>
</template>

<script>
import LearningAnalyticsDashboard from './LearningAnalyticsDashboard.vue'
import LearningPathAnalysis from './LearningPathAnalysis.vue'

export default {
    name: 'AnalyticsMain',
    components: {
        LearningAnalyticsDashboard,
        LearningPathAnalysis
    },
    data () {
        return {
            collapsed: false,
            selectedKeys: ['dashboard'],
            currentView: 'dashboard',
            dashboardKey: 1,
            pathKey: 1
        }
    },
    methods: {
        onMenuClick ({ key }) {
            this.currentView = key
            this.selectedKeys = [key]

            // 刷新组件
            if (key === 'dashboard') {
                this.dashboardKey++
            } else if (key === 'path') {
                this.pathKey++
            }
        },

        toggleCollapsed () {
            this.collapsed = !this.collapsed
        }
    }
}
</script>

<style lang="less" scoped>
.analytics-main {
  height: 100%;

  .ant-layout-sider {
    .ant-menu {
      height: 100%;
      border-right: 0;

      .ant-menu-item {
        margin: 0;
        width: 100%;
        height: 40px;
        line-height: 40px;

        &:hover {
          color: #1890ff;
        }

        &.ant-menu-item-selected {
          background-color: #e6f7ff;
          border-right: 3px solid #1890ff;
          color: #1890ff;
        }
      }
    }
  }

  .ant-layout-content {
    overflow-y: auto;

    .behavior-analysis,
    .warning-management,
    .report-management {
      padding: 24px;
    }
  }
}
</style>
