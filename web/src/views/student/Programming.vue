<template>
  <div class="student-programming">
    <!-- 编辑器入口 - 完全复制Home页面样式 -->
    <a-row :gutter="[24,24]" class="editor-nav">
      <a-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
        <div class="editor-card editor-sjr" style="background: linear-gradient(-30deg,#4fb5ff,#60bcff);">
          <a-row type="flex" justify="space-around" align="middle">
            <a-col :span="10">
              <img src="@/assets/sjr.png" alt="">
            </a-col>
            <a-col :span="14">
              <h2>ScratchJr编辑器</h2>
              <a-button size="large" @click="toEditor(2)">开始创作</a-button>
            </a-col>
          </a-row>
        </div>
      </a-col>
      <a-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
        <div class="editor-card editor-sc" style="background: linear-gradient(-60deg,#ffaa30,#ffbf35);">
          <a-row type="flex" justify="space-around" align="middle">
            <a-col :span="10">
              <img src="@/assets/scratch.png" alt="">
            </a-col>
            <a-col :span="14">
              <h2>Scratch编辑器</h2>
              <a-button size="large" @click="toEditor(1)">开始创作</a-button>
            </a-col>
          </a-row>
        </div>
      </a-col>
      <a-col :xs="24" :sm="24" :md="8" :lg="8" :xl="8">
        <div class="editor-card editor-py" style="background: linear-gradient(-30deg,#f35981,#fb7397);">
          <a-row type="flex" justify="space-around" align="middle">
            <a-col :span="10">
              <img src="@/assets/python.png" alt="">
            </a-col>
            <a-col :span="14">
              <h2>Python编辑器</h2>
              <a-button size="large" @click="toEditor(3)">开始创作</a-button>
            </a-col>
          </a-row>
        </div>
      </a-col>
    </a-row>

    <!-- 编程提示 -->
    <a-card style="margin-top: 24px;">
      <a-alert
        message="编程提示"
        description="点击上方卡片即可进入对应的编程环境。ScratchJr适合低龄儿童，Scratch适合初学者，Python适合进阶学习。"
        type="info"
        show-icon
      />
    </a-card>
  </div>
</template>

<script>
export default {
    name: 'StudentProgramming',
    methods: {
    // 与Home页面完全一致的编辑器打开方法
        toEditor (type) {
            switch (type) {
            case 1:
                window.open('/scratch3/index.html?scene=create')
                break
            case 2:
                window.open('/scratchjr/home.html')
                break
            case 3:
                window.open('/python/index.html')
                break
            }
        }
    }
}
</script>

<style lang="less" scoped>
.student-programming {
  padding: 24px;
}

// 编辑器卡片 - 完全复制Home页面样式
.editor-card {
  width: 100%;
  height: 220px;
  margin: 0 auto;
  padding: 30px;
  background: linear-gradient(-30deg, #4fb5ff, #60bcff);
  border-radius: 20px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  }

  .ant-row-flex {
    height: 100%;
  }

  img {
    width: auto;
    height: 110px;
  }

  h2 {
    color: white;
    text-align: center;
    font-size: 24px;
    margin-bottom: 15px;
  }

  .ant-btn {
    border-radius: 50px;
    display: block;
    margin: 12px auto;
    font-size: 16px;
  }
}
</style>
