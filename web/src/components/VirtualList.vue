<template>
  <div class="virtual-list" :style="{ height: containerHeight + 'px' }" @scroll="onScroll">
    <div class="virtual-list-phantom" :style="{ height: totalHeight + 'px' }"></div>
    <div
      class="virtual-list-content"
      ref="content"
      :style="{ transform: `translateY(${offset}px)` }"
    >
      <div
        v-for="(item, index) in visibleData"
        :key="startIndex + index"
        :class="itemClass"
        :style="{ height: itemHeight + 'px' }"
      >
        <slot :item="item" :index="startIndex + index"></slot>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * 虚拟滚动列表组件
 * 用于大数据量列表的性能优化
 * 只渲染可视区域内的元素，大大提升渲染性能
 *
 * @author Teaching-Open System
 * @since 2024
 */
export default {
    name: 'VirtualList',
    props: {
    // 列表数据
        items: {
            type: Array,
            required: true,
            default: () => []
        },
        // 每个列表项的高度
        itemHeight: {
            type: Number,
            required: true,
            default: 50
        },
        // 容器高度
        containerHeight: {
            type: Number,
            required: true,
            default: 400
        },
        // 预渲染的缓冲区大小
        bufferSize: {
            type: Number,
            default: 5
        },
        // 列表项的CSS类名
        itemClass: {
            type: String,
            default: 'virtual-list-item'
        }
    },
    data () {
        return {
            startIndex: 0,
            endIndex: 0,
            offset: 0
        }
    },
    computed: {
    // 总高度
        totalHeight () {
            return this.items.length * this.itemHeight
        },
        // 可视区域内能显示的元素数量
        visibleCount () {
            return Math.ceil(this.containerHeight / this.itemHeight)
        },
        // 可视区域内的数据
        visibleData () {
            const start = Math.max(0, this.startIndex - this.bufferSize)
            const end = Math.min(this.items.length, this.endIndex + this.bufferSize)
            return this.items.slice(start, end)
        }
    },
    mounted () {
        this.updateVisibleData()
    },
    watch: {
        items: {
            handler () {
                this.updateVisibleData()
            },
            immediate: true
        }
    },
    methods: {
        onScroll (event) {
            const scrollTop = event.target.scrollTop
            this.updateVisibleData(scrollTop)
        },
        updateVisibleData (scrollTop = 0) {
            // 计算开始索引
            this.startIndex = Math.floor(scrollTop / this.itemHeight)
            // 计算结束索引
            this.endIndex = this.startIndex + this.visibleCount
            // 计算偏移量
            this.offset = this.startIndex * this.itemHeight
        },
        // 滚动到指定索引
        scrollToIndex (index) {
            if (index < 0 || index >= this.items.length) return

            const scrollTop = index * this.itemHeight
            this.$el.scrollTop = scrollTop
            this.updateVisibleData(scrollTop)
        },
        // 滚动到顶部
        scrollToTop () {
            this.scrollToIndex(0)
        },
        // 滚动到底部
        scrollToBottom () {
            this.scrollToIndex(this.items.length - 1)
        }
    }
}
</script>

<style lang="less" scoped>
.virtual-list {
  overflow-y: auto;
  position: relative;

  .virtual-list-phantom {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: -1;
  }

  .virtual-list-content {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
  }

  .virtual-list-item {
    border-bottom: 1px solid #f0f0f0;
    padding: 8px 16px;
    display: flex;
    align-items: center;

    &:hover {
      background-color: #f5f5f5;
    }
  }
}

// 滚动条美化
.virtual-list::-webkit-scrollbar {
  width: 6px;
}

.virtual-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.virtual-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;

  &:hover {
    background: #a8a8a8;
  }
}
</style>
