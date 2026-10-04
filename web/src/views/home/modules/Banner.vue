<template>
  <div class="banner">
    <div
      class="carousel"
      @mouseenter="pauseAutoPlay"
      @mouseleave="startAutoPlay"
    >
      <img
        v-if="previousSlide"
        :src="previousSlide.src"
        :alt="previousSlide.alt"
        class="carousel-image carousel-image-previous"
        :class="{ 'is-fading-out': isTransitioning }"
        loading="eager"
        decoding="async"
      />

      <img
        :src="currentSlide.src"
        :alt="currentSlide.alt"
        class="carousel-image carousel-image-current"
        :class="{
          'is-visible': currentSlideLoaded,
          'is-loading': !currentSlideLoaded
        }"
        loading="eager"
        fetchpriority="high"
        decoding="async"
        @load="handleCurrentSlideLoad"
      />

      <button
        type="button"
        class="carousel-nav carousel-nav-prev"
        aria-label="上一张"
        @click="goToPrevious"
      >
        ‹
      </button>

      <button
        type="button"
        class="carousel-nav carousel-nav-next"
        aria-label="下一张"
        @click="goToNext"
      >
        ›
      </button>

      <div class="carousel-dots">
        <button
          v-for="(slide, index) in slides"
          :key="slide.src"
          type="button"
          class="carousel-dot"
          :class="{ active: index === activeSlideIndex }"
          :aria-label="`切换到第 ${index + 1} 张`"
          @click="goToSlide(index)"
        />
      </div>
    </div>
  </div>
</template>

<script>
const AUTO_PLAY_INTERVAL = 5000
const FADE_DURATION_MS = 420

export default {
    name: 'Banner',
    data () {
        return {
            activeSlideIndex: 0,
            displaySlideIndex: 0,
            currentSlideLoaded: false,
            isTransitioning: false,
            timerId: null,
            cleanupTimerId: null,
            slides: [
                { src: '/images/banner-1.jpg', alt: 'AI科学互动体验平台' },
                { src: '/images/banner-2.jpg', alt: '课程体系展示' },
                { src: '/images/banner-3.jpg', alt: '学员作品展示' }
            ]
        }
    },
    computed: {
        currentSlide () {
            return this.slides[this.activeSlideIndex]
        },
        previousSlide () {
            if (!this.isTransitioning || this.displaySlideIndex === this.activeSlideIndex) {
                return null
            }

            return this.slides[this.displaySlideIndex]
        }
    },
    mounted () {
        this.preloadAllImages()
        this.currentSlideLoaded = true
        this.startAutoPlay()
    },
    beforeDestroy () {
        this.pauseAutoPlay()
        this.clearCleanupTimer()
    },
    methods: {
        startAutoPlay () {
            if (this.timerId || this.slides.length <= 1) {
                return
            }

            this.timerId = window.setInterval(() => {
                this.goToNext()
            }, AUTO_PLAY_INTERVAL)
        },
        pauseAutoPlay () {
            if (this.timerId) {
                window.clearInterval(this.timerId)
                this.timerId = null
            }
        },
        goToNext () {
            this.requestSlide((this.activeSlideIndex + 1) % this.slides.length)
        },
        goToPrevious () {
            this.requestSlide((this.activeSlideIndex - 1 + this.slides.length) % this.slides.length)
        },
        goToSlide (index) {
            this.requestSlide(index)
        },
        requestSlide (index) {
            if (index === this.activeSlideIndex || !this.slides[index]) {
                return
            }

            this.clearCleanupTimer()
            this.displaySlideIndex = this.activeSlideIndex
            this.activeSlideIndex = index
            this.currentSlideLoaded = false
            this.isTransitioning = true
            this.preloadNeighborImages(index)
        },
        handleCurrentSlideLoad () {
            this.currentSlideLoaded = true

            if (!this.isTransitioning) {
                return
            }

            this.clearCleanupTimer()
            this.cleanupTimerId = window.setTimeout(() => {
                this.displaySlideIndex = this.activeSlideIndex
                this.isTransitioning = false
                this.cleanupTimerId = null
            }, FADE_DURATION_MS)
        },
        preloadAllImages () {
            this.slides.forEach((slide) => {
                const image = new window.Image()
                image.src = slide.src
            })
        },
        preloadNeighborImages (index) {
            const neighborIndexes = [
                (index + 1) % this.slides.length,
                (index - 1 + this.slides.length) % this.slides.length
            ]

            neighborIndexes.forEach((neighborIndex) => {
                const neighborSlide = this.slides[neighborIndex]
                if (!neighborSlide) {
                    return
                }

                const image = new window.Image()
                image.src = neighborSlide.src
            })
        },
        clearCleanupTimer () {
            if (this.cleanupTimerId) {
                window.clearTimeout(this.cleanupTimerId)
                this.cleanupTimerId = null
            }
        }
    }
}
</script>

<style lang="less" scoped>
.banner {
  margin-top: 20px;
}

.carousel {
  position: relative;
  height: 400px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  background: #dfe7f1;
}

.carousel-image {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  will-change: opacity;
}

.carousel-image-previous {
  z-index: 1;
  opacity: 1;

  &.is-fading-out {
    opacity: 0;
    transition: opacity 0.42s ease;
  }
}

.carousel-image-current {
  z-index: 2;
  opacity: 0;
  transition: opacity 0.42s ease;

  &.is-visible {
    opacity: 1;
  }

  &.is-loading {
    opacity: 0;
  }
}

.carousel-nav {
  position: absolute;
  top: 50%;
  z-index: 3;
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 999px;
  transform: translateY(-50%);
  background: rgba(16, 27, 45, 0.36);
  color: #fff;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;

  &:hover {
    background: rgba(16, 27, 45, 0.52);
    transform: translateY(-50%) scale(1.04);
  }
}

.carousel-nav-prev {
  left: 18px;
}

.carousel-nav-next {
  right: 18px;
}

.carousel-dots {
  position: absolute;
  left: 50%;
  bottom: 18px;
  z-index: 3;
  display: flex;
  gap: 10px;
  transform: translateX(-50%);
}

.carousel-dot {
  width: 12px;
  height: 12px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition: transform 0.2s ease, background-color 0.2s ease;

  &.active {
    background: #fff;
    transform: scale(1.15);
  }
}
</style>
