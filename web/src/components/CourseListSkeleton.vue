<template>
  <div class="course-list-skeleton">
    <a-row :gutter="16">
      <a-col
        v-for="i in count"
        :key="i"
        :xs="24"
        :sm="12"
        :md="8"
        :lg="6"
      >
        <a-card :bordered="false" class="course-card-skeleton">
          <a-skeleton active :paragraph="{ rows: 3 }">
            <template #avatar>
              <div class="skeleton-image"></div>
            </template>
          </a-skeleton>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script>
export default {
    name: 'CourseListSkeleton',
    props: {
        count: {
            type: Number,
            default: 8
        }
    }
}
</script>

<style scoped>
.course-list-skeleton {
  padding: 16px;
}

.course-card-skeleton {
  margin-bottom: 16px;
}

.skeleton-image {
  width: 100%;
  height: 180px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s ease-in-out infinite;
  border-radius: 4px;
  margin-bottom: 16px;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
