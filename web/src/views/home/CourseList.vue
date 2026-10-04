<template>
  <div class="portal-course-center">
    <section class="hero-section">
      <div class="hero-panel">
        <div class="hero-copy">
          <div class="hero-badge">乐启享 · 完整课程体系</div>
          <h1>3岁到16岁的编程成长旅程</h1>
          <p>
            从启蒙搭建到算法与 AI 创作，课程体系覆盖兴趣培养、编程表达与项目实战。
            页面课程介绍参考官网完整课程页整理，当前公开课程列表继续与系统后端实时同步。
          </p>
          <div class="hero-actions">
            <a-button type="primary" size="large" @click="openOfficialCourses">
              查看完整课程体系
            </a-button>
            <a-button size="large" @click="handleStartLearning">
              进入学习空间
            </a-button>
            <a-button size="large" icon="desktop" @click="openAiClassroom">
              AI互动课堂
            </a-button>
          </div>
        </div>
        <div class="hero-timeline">
          <div
            v-for="item in ageTimeline"
            :key="item.label"
            class="timeline-card"
          >
            <span class="timeline-age">{{ item.label }}</span>
            <strong>{{ item.title }}</strong>
            <p>{{ item.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="stage-section">
      <div class="section-heading">
        <div>
          <span class="section-kicker">课程体系</span>
          <h2>完整课程阶段</h2>
          <p>点击卡片查看阶段说明、学习重点和适合学员，完整课程安排可直接跳转官网查看。</p>
        </div>
        <a-button size="large" @click="openOfficialCourses">
          查看完整课程体系
        </a-button>
      </div>
      <a-row :gutter="[18, 18]">
        <a-col
          v-for="stage in courseStages"
          :key="stage.id"
          :xs="24"
          :sm="12"
          :xl="8"
        >
          <button
            type="button"
            class="stage-card"
            @click="openStageDetail(stage)"
          >
            <span class="stage-accent" :style="{ background: stage.color }"></span>
            <div class="stage-meta">
              <span class="stage-age" :style="{ color: stage.color, backgroundColor: `${stage.color}14` }">
                {{ stage.ageRange }}
              </span>
              <span class="stage-badge">{{ stage.badge }}</span>
            </div>
            <h3>{{ stage.name }}</h3>
            <p class="stage-tagline">{{ stage.tagline }}</p>
            <p class="stage-description">{{ stage.description }}</p>
            <div class="stage-highlights">
              <span
                v-for="highlight in stage.highlights"
                :key="highlight"
              >
                {{ highlight }}
              </span>
            </div>
            <div class="stage-footer">
              <span>{{ stage.summary }}</span>
              <span class="stage-link">点击查看详情</span>
            </div>
          </button>
        </a-col>
      </a-row>
    </section>

    <section class="route-section">
      <div class="section-heading simple">
        <div>
          <span class="section-kicker">学习路线</span>
          <h2>推荐进阶路径</h2>
          <p>依据官网课程页的路线结构整理成两条清晰的学习主线，便于家长和学员快速理解成长节奏。</p>
        </div>
      </div>
      <a-row :gutter="[18, 18]">
        <a-col
          v-for="route in learningRoutes"
          :key="route.name"
          :xs="24"
          :lg="12"
        >
          <div class="route-card">
            <div class="route-head">
              <span class="route-name">{{ route.name }}</span>
              <p>{{ route.description }}</p>
            </div>
            <div class="route-steps">
              <div
                v-for="step in route.milestones"
                :key="`${route.name}-${step.stage}`"
                class="route-step"
              >
                <span class="route-step-age">{{ step.label }}</span>
                <strong>{{ step.stageName }}</strong>
                <p>{{ step.desc }}</p>
              </div>
            </div>
          </div>
        </a-col>
      </a-row>
    </section>

    <section class="feature-section">
      <div class="section-heading simple">
        <div>
          <span class="section-kicker">教学特色</span>
          <h2>课程设计重点</h2>
          <p>保留官网课程页里最核心的教学表达，只展示对家长最有价值的三项重点。</p>
        </div>
      </div>
      <a-row :gutter="[18, 18]">
        <a-col
          v-for="feature in teachingFeatures"
          :key="feature.title"
          :xs="24"
          :md="8"
        >
          <div class="feature-card">
            <div class="feature-icon">
              <a-icon :type="feature.icon" />
            </div>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
          </div>
        </a-col>
      </a-row>
    </section>

    <section class="course-toolbar-section">
      <div class="section-heading compact">
        <div>
          <span class="section-kicker">公开课程</span>
          <h2>系统同步课程</h2>
          <p>以下内容直接读取当前后端公开课程数据，方便不登录也能查看课程信息。</p>
        </div>
      </div>
      <div class="toolbar-card">
        <a-row :gutter="16">
          <a-col :xs="24" :sm="8">
            <a-select
              v-model="filters.courseCategory"
              placeholder="全部课程方向"
              allowClear
              style="width: 100%"
              @change="handleSearch"
            >
              <a-select-option v-for="item in courseCategoryOptions" :key="item" :value="item">
                {{ item }}
              </a-select-option>
            </a-select>
          </a-col>
          <a-col :xs="24" :sm="8">
            <a-select
              v-model="filters.courseType"
              placeholder="全部学习阶段"
              allowClear
              style="width: 100%"
              @change="handleSearch"
            >
              <a-select-option v-for="item in courseTypeOptions" :key="item" :value="item">
                {{ item }}
              </a-select-option>
            </a-select>
          </a-col>
          <a-col :xs="24" :sm="8">
            <a-input-search
              v-model="filters.courseName"
              placeholder="请输入课程名称"
              allowClear
              @search="handleSearch"
              @pressEnter="handleSearch"
            />
          </a-col>
        </a-row>
      </div>
    </section>

    <section class="course-list-section">
      <a-spin :spinning="loading">
        <a-empty v-if="!loading && courseList.length === 0" description="暂无公开课程" />
        <a-row v-else :gutter="[18, 18]">
          <a-col
            v-for="course in courseList"
            :key="course.id"
            :xs="24"
            :sm="12"
            :xl="8"
          >
            <div class="course-card">
              <div class="course-cover" :style="getCourseCoverStyle(course)">
                <span>{{ getCourseInitial(course) }}</span>
              </div>
              <div class="course-body">
                <div class="course-header">
                  <h3>{{ course.courseName }}</h3>
                  <a-tag :color="getStatusColor(course.status)">{{ getStatusText(course.status) }}</a-tag>
                </div>
                <p class="course-description">
                  {{ course.courseDesc || '课程简介暂未补充，登录后可进入系统查看课程详细安排。' }}
                </p>
                <div class="course-tags">
                  <a-tag color="geekblue">{{ getCourseCategoryLabel(course) }}</a-tag>
                  <a-tag color="cyan">{{ getCourseTypeLabel(course) }}</a-tag>
                </div>
                <div class="course-meta">
                  <span>课程编号：{{ course.courseCode || '未设置' }}</span>
                  <span>学员数：{{ course.studentCount || 0 }}</span>
                </div>
                <div class="course-meta">
                  <span>授课教师：{{ course.teacherName || '待分配' }}</span>
                  <span>创建时间：{{ formatDate(course.createTime) }}</span>
                </div>
                <div class="course-actions">
                  <a-button type="primary" @click="handleStartLearning">
                    {{ isLoggedIn ? '进入学习空间' : '登录后进入课堂' }}
                  </a-button>
                </div>
              </div>
            </div>
          </a-col>
        </a-row>
      </a-spin>
    </section>

    <transition name="detail-fade">
      <div
        v-if="selectedStage"
        class="stage-dialog-mask"
        @click.self="closeStageDetail"
      >
        <div class="stage-dialog">
          <button
            type="button"
            class="stage-dialog-close"
            @click="closeStageDetail"
          >
            <a-icon type="close" />
          </button>
          <div class="stage-dialog-hero" :style="{ background: getStageDialogBackground(selectedStage) }">
            <span class="stage-dialog-age">{{ selectedStage.ageRange }}</span>
            <h3>{{ selectedStage.name }}</h3>
            <p>{{ selectedStage.tagline }}</p>
          </div>
          <div class="stage-dialog-body">
            <p class="stage-dialog-description">{{ selectedStage.description }}</p>
            <div class="stage-dialog-grid">
              <div
                v-for="item in selectedStage.details"
                :key="item.label"
                class="stage-dialog-card"
              >
                <span>{{ item.label }}</span>
                <p>{{ item.value }}</p>
              </div>
            </div>
            <div class="stage-dialog-highlights">
              <span
                v-for="highlight in selectedStage.highlights"
                :key="highlight"
              >
                {{ highlight }}
              </span>
            </div>
            <div class="stage-dialog-actions">
              <a-button type="primary" size="large" @click="openOfficialCourses">
                查看官网完整课程
              </a-button>
              <a-button size="large" @click="handleStartLearning">
                进入学习空间
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { getAction } from '@/api/manage'
import { resolveTeachingAccess } from '@/utils/teachingAccess'

const OFFICIAL_COURSE_URL = 'https://codebn.cn/courses.html'
const AI_CLASSROOM_URL = 'https://ai.codebn.cn'

const COURSE_STAGES = [
    {
        id: 'lego-big',
        name: '乐高大颗粒创意搭建',
        ageRange: '3-6岁',
        badge: '启蒙搭建',
        color: '#42A5F5',
        tagline: '用积木打开认知世界的大门',
        description: '通过大颗粒乐高积木，引导幼儿在观察、理解与创造的循环中建立空间想象、动手能力和语言表达。',
        summary: '认知启蒙、结构搭建、故事表达同步推进',
        highlights: ['4个年龄段分层教学', '螺旋式上升课程体系', '搭建与故事双线并行'],
        details: [
            { label: '课程定位', value: '面向低龄启蒙阶段，先培养兴趣、表达与结构感，再逐步建立规则意识和合作能力。' },
            { label: '代表内容', value: '围绕生活认知、动物世界、基础结构和故事场景展开，课程主题更贴近儿童理解方式。' },
            { label: '学习收获', value: '重点提升观察力、空间想象、语言表达、情景讲述和初步协作能力。' }
        ]
    },
    {
        id: 'small-block',
        name: '小颗粒机械搭建',
        ageRange: '6-7岁',
        badge: '机械进阶',
        color: '#2196F3',
        tagline: '精密机械，工程思维启蒙',
        description: '通过小颗粒机械套件系统学习齿轮、杠杆、滑轮、连杆等核心机械结构，建立结构认知与力学分析能力。',
        summary: '20+机械结构，春秋两季系统进阶',
        highlights: ['20+核心机械结构', '故事驱动任务设计', '力学原理实验验证'],
        details: [
            { label: '课程定位', value: '把抽象机械原理做成孩子能动手验证的任务，让结构与功能形成直观连接。' },
            { label: '代表内容', value: '覆盖工程车、桥梁、城市系统、称重、拼图和规则挑战等多个工程主题。' },
            { label: '学习收获', value: '重点强化工程思维、结构分析、规则理解、实验验证和问题修复能力。' }
        ]
    },
    {
        id: 'wedo',
        name: 'WeDo编程启蒙',
        ageRange: '6-7岁',
        badge: '软硬结合',
        color: '#1E88E5',
        tagline: '搭建+编程，开启智能世界',
        description: '在机械搭建基础上加入传感器和图形化编程，让作品真正动起来、响应起来，建立输入、处理、输出的控制逻辑。',
        summary: '传感器、图形化编程与智能场景项目并行',
        highlights: ['传感器与编程结合', '图形化拖拽编程', '硬件软件协同调试'],
        details: [
            { label: '课程定位', value: '把机械结构升级为可感知、可控制、可反馈的智能作品，是低龄编程的重要过渡阶段。' },
            { label: '代表内容', value: '围绕传感器探索、智能场景、交互控制与创意工程等方向开展项目式学习。' },
            { label: '学习收获', value: '逐步建立编程逻辑、调试意识、任务拆解能力和软硬件协同思维。' }
        ]
    },
    {
        id: 'scratch',
        name: 'Scratch图形化编程',
        ageRange: '7-10岁',
        badge: '创意编程',
        color: '#1976D2',
        tagline: '拖拽积木式编程，创意无限',
        description: '通过 Scratch 图形化编程平台，从动画故事到互动游戏，分学期系统培养计算思维、逻辑推理和创意表达。',
        summary: '6学期持续进阶，每学期都有独立作品',
        highlights: ['6学期系统进阶', '游戏化项目驱动', '数学与编程融合'],
        details: [
            { label: '课程定位', value: '适合从启蒙走向完整编程表达的学员，用项目实践建立稳定的逻辑与创作能力。' },
            { label: '代表内容', value: '从动画世界、互动故事到游戏工坊、逻辑挑战，逐步提升作品复杂度与完成度。' },
            { label: '学习收获', value: '重点培养计算思维、流程设计、问题拆解、交互设计和独立作品输出能力。' }
        ]
    },
    {
        id: 'python',
        name: 'Python编程',
        ageRange: '10-15岁',
        badge: '代码实战',
        color: '#1565C0',
        tagline: '真正的代码编程，通往AI的钥匙',
        description: '从零开始学习 Python 编程语言，覆盖语法基础、项目实战、数据处理、Web 与 AI 入门，形成真实代码能力。',
        summary: '基础6学期 + 高阶4学期，软硬件穿插教学',
        highlights: ['基础6学期+高阶4学期', '真实项目驱动', '竞赛与实战并重'],
        details: [
            { label: '课程定位', value: '面向进入正式代码学习阶段的学员，兼顾编程基础、项目开发和 AI 时代应用能力。' },
            { label: '代表内容', value: '涵盖语法基础、数据结构、文件处理、Web 开发、AI 入门与硬件编程等方向。' },
            { label: '学习收获', value: '重点建立代码表达能力、项目实战习惯、工程意识和面向 AI 的继续学习能力。' }
        ]
    },
    {
        id: 'cpp',
        name: 'C++编程',
        ageRange: '需Python基础',
        badge: '算法竞赛',
        color: '#0D47A1',
        tagline: '算法竞赛，通往信奥之路',
        description: '面向已有 Python 基础的学员，系统学习 C++ 与算法竞赛内容，逐步衔接数据结构、真题训练和竞赛冲刺。',
        summary: '基础4学期 + 高阶4学期，对接 CSP / NOIP',
        highlights: ['竞赛导向课程设计', 'CSP/NOIP真题训练', '算法思维系统培养'],
        details: [
            { label: '课程定位', value: '适合希望继续提升算法能力、参加信息学相关赛事或向更高阶编程挑战发展的学员。' },
            { label: '代表内容', value: '从 C++ 语法、STL 与基础算法出发，逐步过渡到数据结构、专题训练和竞赛应用。' },
            { label: '学习收获', value: '重点提升算法建模、题目分析、代码实现、竞赛表达和持续训练能力。' }
        ]
    },
    {
        id: 'ai-camp',
        name: 'AI创赛营',
        ageRange: '有编程基础',
        badge: 'AI创作',
        color: '#283593',
        tagline: '7天×2小时，AI赋能创新',
        description: '面向具备编程基础的学员，结合 AI 工具和创赛目标进行短期高强度训练，在较短时间内完成完整创意项目。',
        summary: '适配创赛项目与成果展示场景',
        highlights: ['每天2小时高效集训', 'AI工具实战', '从0到完整作品'],
        details: [
            { label: '课程定位', value: '聚焦 AI 时代的创意项目表达，更强调作品呈现、问题解决和成果打磨。' },
            { label: '代表内容', value: '围绕 AI 工具协作、创意策划、快速开发、项目迭代和最终展示展开。' },
            { label: '学习收获', value: '重点强化 AI 工具使用、项目落地效率、创赛表达和成果展示能力。' }
        ]
    }
]

const LEARNING_ROUTES = [
    {
        name: '基础路线',
        description: '适合大多数学员的标准成长路径，从低龄启蒙逐步过渡到正式代码编程。',
        milestones: [
            { stage: 'lego-big', stageName: '乐高大颗粒', label: '3-6岁', desc: '认知启蒙与动手能力' },
            { stage: 'small-block', stageName: '小颗粒机械', label: '6-7岁', desc: '机械原理与工程思维' },
            { stage: 'wedo', stageName: 'WeDo编程', label: '6-7岁', desc: '软硬结合与编程启蒙' },
            { stage: 'scratch', stageName: 'Scratch', label: '7-10岁', desc: '图形化编程与创意开发' },
            { stage: 'python', stageName: 'Python', label: '10岁+', desc: '真实代码编程与 AI 入门' }
        ]
    },
    {
        name: '高阶路线',
        description: '适合有志于竞赛和深度项目训练的学员，在 Python 基础上继续冲刺算法与 AI 创赛。',
        milestones: [
            { stage: 'python', stageName: 'Python进阶', label: '进阶阶段', desc: '项目实战与高级应用' },
            { stage: 'cpp', stageName: 'C++算法', label: '竞赛阶段', desc: '数据结构与赛事训练' },
            { stage: 'ai-camp', stageName: 'AI创赛营', label: '成果阶段', desc: 'AI 项目与创赛表达' }
        ]
    }
]

const TEACHING_FEATURES = [
    {
        title: 'AI辅助创作',
        icon: 'bulb',
        description: '结合 AI 工具完成创意构思、项目实现和作品打磨，让孩子更早形成高效的人机协作习惯。'
    },
    {
        title: '软硬件穿插',
        icon: 'api',
        description: 'Python、Scratch 与硬件编程交替出现，把屏幕里的逻辑真正落到可见、可操作的实体项目。'
    },
    {
        title: '竞赛导向',
        icon: 'trophy',
        description: '课程和蓝桥杯、信息素养大赛、CSP / NOIP 等主流赛事衔接，每个阶段都有明确目标。'
    }
]

const AGE_TIMELINE = [
    { label: '3-6岁', title: '启蒙搭建', description: '从大颗粒创意搭建开启认知与表达。' },
    { label: '6-7岁', title: '机械与 WeDo', description: '机械结构与编程启蒙同步展开。' },
    { label: '7-10岁', title: 'Scratch', description: '用图形化编程建立系统创作能力。' },
    { label: '10岁+', title: 'Python', description: '进入正式代码编程与项目实践。' },
    { label: '进阶', title: 'C++ / AI', description: '算法竞赛与 AI 项目训练继续提升。' }
]

export default {
    name: 'PortalCourseList',
    data () {
        return {
            loading: false,
            courseList: [],
            totalCourses: 0,
            filters: {
                courseCategory: undefined,
                courseType: undefined,
                courseName: ''
            },
            courseStages: COURSE_STAGES,
            learningRoutes: LEARNING_ROUTES,
            teachingFeatures: TEACHING_FEATURES,
            ageTimeline: AGE_TIMELINE,
            selectedStage: null,
            bodyOverflow: ''
        }
    },
    computed: {
        token () {
            return this.$store.getters.token || ''
        },
        isLoggedIn () {
            return Boolean(this.token)
        },
        courseCategoryOptions () {
            return Array.from(new Set(this.courseList.map(item => String(item.courseCategory || '').trim()).filter(Boolean)))
        },
        courseTypeOptions () {
            return Array.from(new Set(this.courseList.map(item => String(item.courseType || '').trim()).filter(Boolean)))
        }
    },
    mounted () {
        this.loadCourseList()
        window.addEventListener('keydown', this.handleKeydown)
    },
    beforeDestroy () {
        window.removeEventListener('keydown', this.handleKeydown)
        this.restoreBodyScroll()
    },
    methods: {
        async loadCourseList () {
            this.loading = true
            try {
                const response = await getAction('/teaching/teachingCourse/getHomeCourse', {
                    pageNo: 1,
                    pageSize: 24,
                    courseCategory: this.filters.courseCategory || undefined,
                    courseType: this.filters.courseType || undefined,
                    courseName: (this.filters.courseName || '').trim() || undefined
                })

                if (response && response.success && response.result) {
                    this.courseList = response.result.records || []
                    this.totalCourses = Number(response.result.total) || this.courseList.length
                    return
                }

                this.courseList = []
                this.totalCourses = 0
            } catch (error) {
                this.courseList = []
                this.totalCourses = 0
                this.$message.error(error.message || '加载公开课程失败')
            } finally {
                this.loading = false
            }
        },
        handleSearch () {
            this.loadCourseList()
        },
        handleStartLearning () {
            if (!this.isLoggedIn) {
                window.scrollTo({ top: 0, behavior: 'smooth' })
                this.$message.info('请先在首页右侧完成登录，再进入学习空间')
                return
            }

            const access = resolveTeachingAccess({
                userRole: this.$store.getters.userRole,
                userType: this.$store.getters.userType,
                userInfo: this.$store.getters.userInfo
            })

            const targetPath = access.isStudent
                ? (access.classroomPath || access.homePath || '/portal/home')
                : (access.homePath || access.classroomPath || '/portal/home')

            this.$router.push(targetPath)
        },
        handleKeydown (event) {
            if (event.key === 'Escape' && this.selectedStage) {
                this.closeStageDetail()
            }
        },
        openStageDetail (stage) {
            if (!this.selectedStage) {
                this.bodyOverflow = document.body.style.overflow || ''
                document.body.style.overflow = 'hidden'
            }
            this.selectedStage = stage
        },
        closeStageDetail () {
            this.selectedStage = null
            this.restoreBodyScroll()
        },
        restoreBodyScroll () {
            document.body.style.overflow = this.bodyOverflow
        },
        openOfficialCourses () {
            window.open(OFFICIAL_COURSE_URL, '_blank')
        },
        openAiClassroom () {
            window.open(AI_CLASSROOM_URL, '_blank')
        },
        getStageDialogBackground (stage) {
            return `linear-gradient(135deg, ${stage.color} 0%, rgba(255, 255, 255, 0.96) 100%)`
        },
        getCourseInitial (course) {
            const title = String(course.courseName || '').trim()
            return title ? title.slice(0, 2) : '课程'
        },
        getCourseCoverStyle (course) {
            if (course.courseCover) {
                return {
                    backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.18), rgba(15, 23, 42, 0.12)), url(${course.courseCover})`
                }
            }

            return {
                backgroundImage: 'linear-gradient(135deg, #1677ff 0%, #69b1ff 52%, #dbeafe 100%)'
            }
        },
        getCourseCategoryLabel (course) {
            return course.courseCategory || '公开课程'
        },
        getCourseTypeLabel (course) {
            return course.courseType || '完整介绍'
        },
        getStatusColor (status) {
            return Number(status) === 1 ? 'green' : 'orange'
        },
        getStatusText (status) {
            return Number(status) === 1 ? '已发布' : '草稿'
        },
        formatDate (value) {
            if (!value) {
                return '-'
            }

            const date = new Date(value)
            if (Number.isNaN(date.getTime())) {
                return '-'
            }

            const year = date.getFullYear()
            const month = `${date.getMonth() + 1}`.padStart(2, '0')
            const day = `${date.getDate()}`.padStart(2, '0')
            return `${year}-${month}-${day}`
        }
    }
}
</script>

<style lang="less" scoped>
.portal-course-center {
  padding: 24px 0 52px;
}

.hero-section,
.stage-section,
.route-section,
.feature-section,
.course-toolbar-section,
.course-list-section {
  margin-bottom: 28px;
}

.hero-panel,
.stage-card,
.route-card,
.feature-card,
.toolbar-card,
.course-card,
.stage-dialog {
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
}

.hero-panel {
  position: relative;
  overflow: hidden;
  padding: 34px 34px 30px;
  background:
    radial-gradient(circle at top right, rgba(84, 164, 255, 0.24), transparent 34%),
    linear-gradient(135deg, #f5f9ff 0%, #edf5ff 48%, #ffffff 100%);
  border: 1px solid #deebff;

  &::before,
  &::after {
    content: '';
    position: absolute;
    border-radius: 999px;
    pointer-events: none;
  }

  &::before {
    right: -68px;
    top: -52px;
    width: 220px;
    height: 220px;
    background: rgba(22, 119, 255, 0.12);
  }

  &::after {
    left: 42%;
    bottom: -90px;
    width: 300px;
    height: 160px;
    background: rgba(141, 189, 255, 0.18);
    filter: blur(8px);
  }
}

.hero-copy,
.hero-timeline,
.stage-dialog-body {
  position: relative;
  z-index: 1;
}

.hero-badge,
.section-kicker {
  display: inline-flex;
  align-items: center;
  padding: 0 14px;
  height: 34px;
  border-radius: 999px;
  background: rgba(22, 119, 255, 0.1);
  color: #1677ff;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.hero-copy {
  max-width: 760px;

  h1 {
    margin: 18px 0 14px;
    font-size: 42px;
    line-height: 1.2;
    color: #102a43;
  }

  p {
    margin: 0;
    max-width: 720px;
    color: #4b5d73;
    font-size: 15px;
    line-height: 1.9;
  }
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.hero-timeline {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  margin-top: 28px;
}

.timeline-card {
  padding: 18px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(22, 119, 255, 0.08);
  backdrop-filter: blur(8px);

  strong {
    display: block;
    margin: 8px 0 6px;
    color: #102a43;
    font-size: 17px;
  }

  p {
    margin: 0;
    color: #6a7b90;
    line-height: 1.7;
    font-size: 13px;
  }
}

.timeline-age {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: #e8f2ff;
  color: #1677ff;
  font-size: 12px;
  font-weight: 700;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;

  h2 {
    margin: 10px 0 8px;
    color: #102a43;
    font-size: 32px;
    line-height: 1.2;
  }

  p {
    margin: 0;
    color: #5f7084;
    line-height: 1.8;
  }
}

.section-heading.simple,
.section-heading.compact {
  align-items: center;
}

.stage-card {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 24px;
  border: 1px solid #e8eef6;
  text-align: left;
  cursor: pointer;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;

  &:hover {
    transform: translateY(-4px);
    border-color: #d0def3;
    box-shadow: 0 24px 52px rgba(22, 119, 255, 0.12);
  }

  h3 {
    margin: 18px 0 8px;
    color: #102a43;
    font-size: 22px;
    line-height: 1.35;
  }
}

.stage-accent {
  position: absolute;
  left: 24px;
  top: 0;
  width: 72px;
  height: 5px;
  border-radius: 0 0 999px 999px;
}

.stage-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.stage-age,
.stage-badge {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.stage-badge {
  background: #f3f7fb;
  color: #5b6b7e;
}

.stage-tagline {
  margin: 0 0 10px;
  color: #1677ff;
  font-size: 15px;
  font-weight: 700;
}

.stage-description {
  min-height: 88px;
  margin: 0;
  color: #5b6c80;
  line-height: 1.85;
}

.stage-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;

  span {
    display: inline-flex;
    align-items: center;
    min-height: 34px;
    padding: 6px 12px;
    border-radius: 14px;
    background: #f5f9ff;
    color: #35506d;
    line-height: 1.5;
  }
}

.stage-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  color: #708296;
  line-height: 1.7;
}

.stage-link {
  flex-shrink: 0;
  color: #1677ff;
  font-weight: 700;
}

.route-card,
.feature-card,
.toolbar-card,
.course-card {
  border: 1px solid #e8eef6;
}

.route-card,
.feature-card {
  height: 100%;
  padding: 24px;
}

.route-name {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  background: #edf5ff;
  color: #1677ff;
  font-weight: 700;
}

.route-head {
  margin-bottom: 18px;

  p {
    margin: 14px 0 0;
    color: #5f7084;
    line-height: 1.8;
  }
}

.route-steps {
  display: grid;
  gap: 14px;
}

.route-step {
  padding: 16px 18px;
  border-radius: 18px;
  background: #f8fbff;
  border: 1px solid #e3edf9;

  strong {
    display: block;
    margin: 8px 0 6px;
    color: #102a43;
    font-size: 18px;
  }

  p {
    margin: 0;
    color: #66788d;
    line-height: 1.7;
  }
}

.route-step-age {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid #d7e6fb;
  color: #1677ff;
  font-size: 12px;
  font-weight: 700;
}

.feature-card {
  text-align: left;

  h3 {
    margin: 18px 0 10px;
    color: #102a43;
    font-size: 22px;
  }

  p {
    margin: 0;
    color: #5f7084;
    line-height: 1.85;
  }
}

.feature-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border-radius: 18px;
  background: linear-gradient(135deg, #1677ff, #6daeff);
  color: #fff;
  font-size: 24px;
}

.toolbar-card {
  padding: 22px 24px;
}

.course-card {
  overflow: hidden;
  height: 100%;
}

.course-cover {
  height: 178px;
  padding: 18px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;

  span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 74px;
    height: 42px;
    padding: 0 14px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.9);
    color: #102a43;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 1px;
  }
}

.course-body {
  padding: 22px 22px 24px;
}

.course-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;

  h3 {
    margin: 0;
    color: #102a43;
    font-size: 21px;
    line-height: 1.35;
  }
}

.course-description {
  min-height: 76px;
  margin: 0 0 12px;
  color: #5f7084;
  line-height: 1.8;
}

.course-tags {
  margin-bottom: 12px;
}

.course-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  color: #718398;
  font-size: 13px;
  line-height: 1.7;
}

.course-actions {
  margin-top: 18px;
}

.stage-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 1200;
  padding: 28px 18px;
  background: rgba(9, 18, 34, 0.35);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stage-dialog {
  position: relative;
  width: 100%;
  max-width: 940px;
  max-height: calc(100vh - 56px);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.48);
}

.stage-dialog-close {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 2;
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.88);
  color: #102a43;
  font-size: 18px;
  cursor: pointer;
}

.stage-dialog-hero {
  padding: 34px 34px 28px;

  h3 {
    margin: 16px 0 10px;
    color: #102a43;
    font-size: 34px;
    line-height: 1.2;
  }

  p {
    margin: 0;
    max-width: 640px;
    color: #28445f;
    font-size: 15px;
    line-height: 1.85;
    font-weight: 700;
  }
}

.stage-dialog-age {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: #17324d;
  font-size: 12px;
  font-weight: 700;
}

.stage-dialog-body {
  max-height: calc(100vh - 250px);
  overflow-y: auto;
  padding: 28px 34px 34px;
}

.stage-dialog-description {
  margin: 0 0 18px;
  color: #4d6177;
  font-size: 15px;
  line-height: 1.9;
}

.stage-dialog-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.stage-dialog-card {
  padding: 18px;
  border-radius: 18px;
  background: #f7faff;
  border: 1px solid #e2ebf8;

  span {
    display: inline-flex;
    margin-bottom: 10px;
    color: #1677ff;
    font-size: 13px;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: #51657c;
    line-height: 1.8;
  }
}

.stage-dialog-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;

  span {
    display: inline-flex;
    align-items: center;
    min-height: 36px;
    padding: 0 14px;
    border-radius: 999px;
    background: #edf5ff;
    color: #35506d;
    font-weight: 700;
  }
}

.stage-dialog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}

.detail-fade-enter-active,
.detail-fade-leave-active {
  transition: opacity 0.22s ease;
}

.detail-fade-enter,
.detail-fade-leave-to {
  opacity: 0;
}

@media (max-width: 1199px) {
  .hero-timeline {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 991px) {
  .section-heading,
  .section-heading.simple,
  .section-heading.compact {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-copy h1 {
    font-size: 34px;
  }

  .stage-dialog-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .portal-course-center {
    padding: 18px 0 36px;
  }

  .hero-panel,
  .toolbar-card,
  .stage-card,
  .route-card,
  .feature-card,
  .course-body,
  .stage-dialog-hero,
  .stage-dialog-body {
    padding-left: 18px;
    padding-right: 18px;
  }

  .hero-copy h1,
  .section-heading h2,
  .stage-dialog-hero h3 {
    font-size: 28px;
  }

  .hero-timeline {
    grid-template-columns: 1fr;
  }

  .stage-description,
  .course-description {
    min-height: auto;
  }

  .course-meta,
  .stage-footer {
    flex-direction: column;
    gap: 6px;
  }

  .stage-dialog-mask {
    padding: 16px 12px;
  }

  .stage-dialog {
    max-height: calc(100vh - 32px);
  }

  .stage-dialog-body {
    max-height: calc(100vh - 220px);
  }
}
</style>
