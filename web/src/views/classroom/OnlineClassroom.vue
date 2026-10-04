<template>
  <div class="online-classroom">
    <!-- 课堂头部信息 -->
    <div class="classroom-header">
      <a-card size="small">
        <a-row type="flex" justify="space-between" align="middle">
          <a-col>
            <h2>
              <a-icon type="desktop" />
              {{ classroomInfo.title }} - {{ isTeacher ? '教师演示台' : '学生工作台' }}
            </h2>
            <p>
              <a-tag color="blue">{{ classroomInfo.subject }}</a-tag>
              <a-tag v-if="classroomInfo.status === 'active'" color="green">正在上课</a-tag>
              <a-tag v-else-if="classroomInfo.status === 'ended'" color="orange">已结束（仍可访问）</a-tag>
              <a-tag v-else-if="classroomInfo.status === 'archived'" color="default">历史记录</a-tag>
              <a-tag v-else-if="classroomInfo.status === 'scheduled'" color="cyan">待开始</a-tag>
              <a-tag v-if="isReplayMode" color="purple">
                <a-icon type="history" />
                回放模式
              </a-tag>
              <a-tag
                class="connection-status-tag"
                :color="socketConnectionTagColor"
                :title="socketLastDisconnectReason || socketConnectionTagText"
              >
                <a-icon :type="socketConnectionTagIcon" />
                {{ socketConnectionTagText }}
              </a-tag>
              <span>教师：{{ classroomInfo.teacherName }}</span>
              <span style="margin-left: 16px">课堂学生：{{ onlineStudents.length }}人</span>
              <span v-if="isTeacher" style="margin-left: 16px">
                <a-tag :color="projectorMode ? 'green' : 'default'">
                  {{ projectorMode ? '投影仪模式已开启' : '投影仪模式关闭' }}
                </a-tag>
              </span>
            </p>
          </a-col>
          <a-col>
            <a-button-group>
              <a-button v-if="isTeacher && classroomInfo.status === 'scheduled'" type="primary" @click="startClassroom">
                <a-icon type="play-circle" />
                开始课堂
              </a-button>
              <a-button v-if="isTeacher && classroomInfo.status === 'active'" :type="projectorMode ? 'primary' : 'default'" @click="toggleProjectorMode">
                <a-icon type="desktop" />
                {{ projectorMode ? '投影模式' : '启用投影' }}
              </a-button>
              <a-button v-if="isTeacher && classroomInfo.status === 'active'" :type="broadcasting ? 'danger' : 'primary'" :disabled="selectedLanguage === 'ai_package'" @click="toggleBroadcast">
                <a-icon :type="broadcasting ? 'pause-circle' : 'play-circle'" />
                {{ broadcasting ? '停止演示' : '开始演示' }}
              </a-button>
              <a-button v-if="currentPPT && currentPPT.viewUrl && (isTeacher || isReplayMode)" type="default" @click="openPPTPreview">
                <a-icon type="file-ppt" />
                预览PPT
              </a-button>
              <a-button type="default" @click="openAiClassroomWorkspace">
                <a-icon type="link" />
                AI互动课堂
              </a-button>
              <a-button v-if="aiPackageDownloadUrl" type="default" @click="downloadAiResourcePackage">
                <a-icon type="download" />
                下载资源包
              </a-button>
              <a-button v-if="isTeacher && classroomInfo.status === 'active'" type="danger" @click="endClassroom">
                <a-icon type="stop" />
                结束课堂
              </a-button>
              <a-button v-if="isStudent && classroomInfo.status === 'active'" :type="followMode ? 'primary' : 'default'" @click="toggleFollowMode">
                <a-icon type="eye" />
                {{ followMode ? '退出跟随' : '跟随老师' }}
              </a-button>
              <a-button type="danger" @click="exitClassroom">
                <a-icon type="logout" />
                退出课堂
              </a-button>
            </a-button-group>
          </a-col>
        </a-row>
      </a-card>
    </div>

    <a-alert
      v-if="shouldShowSocketAlert"
      class="socket-status-alert"
      :type="socketAlertType"
      show-icon
      :message="socketAlertMessage"
      :description="socketAlertDescription"
    >
      <template slot="action">
        <a-space>
          <a-button v-if="canRetrySocketConnection" size="small" type="primary" @click="retrySocketConnection">
            重新连接
          </a-button>
          <a-button v-if="socketConnectionStatus === 'denied'" size="small" @click="returnToClassroomList">
            返回列表
          </a-button>
        </a-space>
      </template>
    </a-alert>

    <!-- 主要内容区域 -->
    <a-row :gutter="16" class="classroom-content">
      <!-- 左侧：教师演示区 / 学生演示区 -->
      <a-col :span="isTeacher ? 18 : 16">
        <!-- 演示区（PPT和课堂内容） -->
        <a-card :title="isTeacher ? '教师演示区' : '演示区'" size="small" style="margin-bottom: 16px;">
          <!-- 教学环境选择（教师可操作，回放模式学生也可切换查看） -->
          <div class="toolbar" slot="extra">
            <a-select v-if="isTeacher || isReplayMode" v-model="selectedLanguage" style="width: 140px; margin-right: 8px" @change="switchLanguage">
              <a-select-option value="ppt">PPT展示</a-select-option>
              <a-select-option value="ai_package">AI互动课堂</a-select-option>
              <a-select-option value="scratch">Scratch</a-select-option>
              <a-select-option value="python">Python</a-select-option>
              <a-select-option value="javascript">JavaScript</a-select-option>
              <a-select-option value="html">HTML/CSS</a-select-option>
            </a-select>
            <span v-else style="color: #666; margin-right: 8px;">{{ getLanguageLabel(selectedLanguage) }}</span>
            <a-button v-if="isTeacher && selectedLanguage === 'ppt'" size="small" @click="uploadPPT">
              <a-icon type="upload" />
              上传PPT
            </a-button>
            <a-button v-if="isTeacher && isCodeLanguage(selectedLanguage)" size="small" :loading="savingDemo" @click="manualSaveDemo" :type="demoSaved ? 'link' : 'default'">
              <a-icon :type="demoSaved ? 'check-circle' : 'save'" :theme="demoSaved ? 'twoTone' : 'outlined'" twoToneColor="#52c41a" />
              {{ demoSaved ? '已保存' : '保存内容' }}
            </a-button>
            <a-button v-if="isTeacher && selectedLanguage !== 'ai_package'" size="small" @click="openFullEditor">
              <a-icon type="fullscreen" />
              全屏模式
            </a-button>
          </div>

          <!-- 编程界面 -->
          <div class="programming-area">
            <!-- PPT展示区域 -->
            <div v-if="selectedLanguage === 'ppt'" class="ppt-area" style="height: auto;">
              <div v-if="currentPPT.file" class="ppt-viewer">
                <div class="ppt-header">
                  <h4>{{ currentPPT.name }}</h4>
                  <div class="ppt-controls">
                    <a-button-group size="small">
                      <a-button @click="previousSlide" :disabled="currentSlide <= 1">
                        <a-icon type="left" />
                        上一页
                      </a-button>
                      <a-button disabled>
                        {{ currentSlide }} / {{ currentPPT.totalSlides }}
                      </a-button>
                      <a-button @click="nextSlide" :disabled="currentSlide >= currentPPT.totalSlides">
                        下一页
                        <a-icon type="right" />
                      </a-button>
                    </a-button-group>
                  </div>
                </div>
                <div class="ppt-content">
                  <!-- PPT预览区域 -->
                  <div class="ppt-preview-placeholder" style="text-align: center; padding: 60px 20px; background: #f5f5f5; border-radius: 8px;">
                    <a-icon type="file-ppt" style="font-size: 72px; color: #d04a02; margin-bottom: 20px;" />
                    <h3 style="margin-bottom: 8px;">{{ currentPPT.name }}</h3>
                    <p v-if="isTeacher" style="color: #666; margin-bottom: 24px;">{{ currentPPT.isOSS ? '点击下方按钮在线预览PPT' : '本地文件无法在线预览，请下载后查看' }}</p>
                    <p v-else-if="!isReplayMode" style="color: #666; margin-bottom: 24px;">正在同步教师演示内容...</p>
                    <p v-else style="color: #666; margin-bottom: 24px;">课堂已结束，可预览或下载PPT</p>
                    <!-- 教师、回放模式、课堂结束后可预览/下载 -->
                    <a-space v-if="isTeacher || isReplayMode">
                      <a-button v-if="currentPPT.viewUrl" type="primary" size="large" @click="openPPTPreview">
                        <a-icon type="eye" /> 在线预览
                      </a-button>
                      <a-button v-if="currentPPT.rawUrl" size="large" @click="downloadPPT">
                        <a-icon type="download" /> 下载文件
                      </a-button>
                    </a-space>
                  </div>
                </div>
              </div>
              <div v-else class="no-ppt">
                <a-empty description="请上传PPT文件">
                  <a-button type="primary" @click="uploadPPT">
                    <a-icon type="upload" />
                    上传PPT
                  </a-button>
                </a-empty>
              </div>
            </div>

            <!-- Scratch编程区域 -->
            <div v-else-if="selectedLanguage === 'scratch'" class="scratch-area">
              <div v-if="currentProject && currentProject.name" class="scratch-project">
                <h4>{{ currentProject.name }}</h4>
              </div>
              <iframe
                :src="getScratchFrameSrc()"
                width="100%"
                height="500"
                frameborder="0"
                @load="onScratchLoad"
              ></iframe>
            </div>

            <div v-else-if="selectedLanguage === 'ai_package'" class="ai-package-area">
              <div class="ppt-preview-placeholder" style="text-align: center; padding: 60px 20px; background: #f5f5f5; border-radius: 8px;">
                <a-icon type="inbox" style="font-size: 72px; color: #2f54eb; margin-bottom: 20px;" />
                <h3 style="margin-bottom: 8px;">{{ canOpenAiClassroom ? aiResourceDisplayName : 'AI互动课堂' }}</h3>
                <p style="color: #666; margin-bottom: 24px;">
                  {{ canOpenAiClassroom
                    ? '当前课堂已绑定 AI 资源包。你可以直接打开 AI 互动课堂继续导入使用，也可以先下载资源包手动导入。'
                    : '当前课堂暂未绑定 AI 资源包，你仍然可以直接进入 AI 互动课堂开始使用。后续如果课堂关联了资源包，也会自动带入。' }}
                </p>
                <a-space>
                  <a-button type="primary" size="large" @click="openAiClassroomWorkspace">
                    <a-icon type="link" /> 打开 AI 互动课堂
                  </a-button>
                  <a-button v-if="aiPackageDownloadUrl" size="large" @click="downloadAiResourcePackage">
                    <a-icon type="download" /> 下载资源包
                  </a-button>
                </a-space>
              </div>
            </div>

            <!-- 代码编程区域 -->
            <div v-else class="code-area">
              <!-- 教师端或回放模式：可编辑/查看 -->
              <textarea
                v-if="isTeacher || isReplayMode"
                v-model="currentCode"
                @input="onCodeChange(currentCode)"
                :readonly="isReplayMode && isStudent"
                style="width: 100%; height: 500px; font-family: Monaco, Menlo, Ubuntu Mono, monospace; font-size: 14px; padding: 12px; border: 1px solid #d9d9d9; border-radius: 4px; background: #1e1e1e; color: #d4d4d4; resize: none; outline: none;"
                :placeholder="isReplayMode ? '课堂回放 - 查看教师演示代码' : `在这里编写${selectedLanguage}代码...`"
              ></textarea>
              <!-- 学生端课堂进行中：只读显示教师代码 -->
              <div v-else style="width: 100%; height: 500px; border: 1px solid #d9d9d9; border-radius: 4px; background: #1e1e1e; overflow: auto;">
                <pre style="margin: 0; padding: 12px; font-family: Monaco, Menlo, Ubuntu Mono, monospace; font-size: 14px; color: #d4d4d4; white-space: pre-wrap; word-wrap: break-word;">{{ currentCode || '等待教师演示代码...' }}</pre>
              </div>
            </div>
          </div>

          <!-- 学生端:操作按钮区 -->
          <div v-if="isStudent" class="student-action-buttons" style="margin-top: 16px;">
            <a-button
              :type="needHelp ? 'danger' : 'default'"
              size="large"
              @click="toggleHelp"
              block
            >
              <a-icon type="question-circle" />
              {{ needHelp ? '取消求助' : '举手求助' }}
            </a-button>
          </div>
        </a-card>

        <!-- 创作工具区 -->
        <a-card title="创作工具" size="small" style="margin-top: 16px;">
          <template slot="extra">
            <a-icon type="tool" />
          </template>
          <div class="editor-buttons-container">
            <a-row :gutter="12">
              <a-col :span="6">
                <div class="editor-button-card scratchjr" @click="openEditor('scratchjr')">
                  <div class="editor-icon">
                    <a-icon type="build" style="font-size: 36px; color: #4fb5ff;" />
                  </div>
                  <h3>ScratchJr</h3>
                  <p>图形化编程入门</p>
                  <a-button type="primary" block>
                    <a-icon type="thunderbolt" />
                    开始创作
                  </a-button>
                </div>
              </a-col>
              <a-col :span="6">
                <div class="editor-button-card scratch" @click="openEditor('scratch')">
                  <div class="editor-icon">
                    <a-icon type="build" style="font-size: 36px; color: #ffaa30;" />
                  </div>
                  <h3>Scratch</h3>
                  <p>图形化编程进阶</p>
                  <a-button type="primary" block style="background: #ffaa30; border-color: #ffaa30;">
                    <a-icon type="thunderbolt" />
                    开始创作
                  </a-button>
                </div>
              </a-col>
              <a-col :span="6">
                <div class="editor-button-card python" @click="openEditor('python')">
                  <div class="editor-icon">
                    <a-icon type="code" style="font-size: 36px; color: #f35981;" />
                  </div>
                  <h3>Python</h3>
                  <p>代码编程环境</p>
                  <a-button type="primary" block style="background: #f35981; border-color: #f35981;">
                    <a-icon type="thunderbolt" />
                    开始创作
                  </a-button>
                </div>
              </a-col>
              <a-col :span="6">
                <div class="editor-button-card ai-classroom" @click="openAiClassroomWorkspace">
                  <div class="editor-icon">
                    <a-icon type="rocket" style="font-size: 36px; color: #2f54eb;" />
                  </div>
                  <h3>AI互动课堂</h3>
                  <p>{{ canOpenAiClassroom ? '带资源包一键打开' : '直接进入课堂主页' }}</p>
                  <a-button type="primary" block style="background: #2f54eb; border-color: #2f54eb;">
                    <a-icon type="thunderbolt" />
                    立即打开
                  </a-button>
                </div>
              </a-col>
            </a-row>
          </div>
        </a-card>
      </a-col>

      <!-- 右侧：教师广播观看区 / 课堂互动区 -->
      <a-col :span="isTeacher ? 6 : 8">
        <!-- 课堂讨论 - 移到顶部 -->
        <a-card title="课堂讨论" size="small" style="margin-bottom: 16px">
          <div class="chat-container">
            <div class="chat-messages" ref="chatMessages">
              <div v-if="chatMessages.length === 0" class="empty-chat">
                <a-empty :description="chatEmptyDescription" :image-style="{ height: '60px' }" />
              </div>
              <div v-for="msg in chatMessages" :key="msg.id" class="chat-message">
                <div class="message-header">
                  <a-avatar size="small" :src="msg.avatar || (msg.sender && msg.sender.avatar)">
                    {{ getMessageSenderInitial(msg) }}
                  </a-avatar>
                  <span class="sender-name">{{ getMessageSenderName(msg) }}</span>
                  <span class="message-time">{{ formatTime(msg.time || msg.timestamp) }}</span>
                </div>
                <div class="message-content">
                  <template v-if="msg.type === 'file'">
                    <a-icon type="paper-clip" style="margin-right: 8px" />
                    <a :href="msg.fileUrl" :download="msg.fileName" class="file-link">
                      {{ msg.fileName }}
                    </a>
                    <span class="file-size">({{ formatFileSize(msg.fileSize) }})</span>
                  </template>
                  <template v-else>
                    {{ msg.content }}
                  </template>
                </div>
              </div>
            </div>
            <div class="chat-input">
              <a-upload
                :before-upload="handleFileSelect"
                :custom-request="noopAntUploadRequest"
                :show-upload-list="false"
                accept=".zip,.rar,.7z,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.sb3,.sb2,.py,.js,.html,.css,.json,.mp4,.mp3,.wav,.jpg,.jpeg,.png,.gif,.webp"
              >
                <a-button size="small" icon="paper-clip" style="margin-right: 8px" title="发送文件">
                  发文件
                </a-button>
              </a-upload>
              <a-input
                v-model="newMessage"
                placeholder="输入消息..."
                @pressEnter="sendMessage"
                style="flex: 1"
              >
                <a-button slot="suffix" type="link" @click="sendMessage" :disabled="!newMessage.trim()">
                  <a-icon type="send" />
                </a-button>
              </a-input>
            </div>
          </div>
        </a-card>

        <!-- 学生列表和状态 -->
        <a-card title="课堂学生" size="small" style="margin-bottom: 16px;">
          <div class="students-list">
            <div v-for="student in onlineStudents" :key="student.id" class="student-item">
              <a-avatar size="small" :src="student.avatar">{{ student.name.charAt(0) }}</a-avatar>
              <span class="student-name">{{ student.name }}</span>
              <div class="student-status">
                <a-tag :color="getStatusColor(student.status)" size="small">
                  {{ getStatusText(student.status) }}
                </a-tag>
                <a-icon
                  v-if="student.needHelp"
                  type="question-circle"
                  style="color: #f5222d; margin-left: 4px"
                  title="学生需要帮助"
                />
              </div>
              <!-- 教师端：远程协助按钮 -->
              <a-button
                v-if="isTeacher"
                type="link"
                size="small"
                @click="assistStudent(student)"
              >
                协助
              </a-button>
            </div>
          </div>
        </a-card>

        <!-- 学生端：课堂笔记区 -->
        <a-card v-if="isStudent" title="课堂笔记" size="small">
          <template slot="extra">
            <a-button-group size="small">
              <a-button @click="saveNotes" :loading="savingNotes">
                <a-icon type="save" />
                {{ savingNotes ? '保存中...' : '保存笔记' }}
              </a-button>
            </a-button-group>
          </template>
          <div class="notes-area">
            <a-textarea
              v-model="classroomNotes"
              placeholder="在这里记录课堂笔记..."
              :auto-size="{ minRows: 8, maxRows: 12 }"
              @change="onNotesChange"
              :style="{
                fontFamily: 'Microsoft YaHei, Arial, sans-serif',
                fontSize: '14px',
                lineHeight: '1.6'
              }"
            />
            <div class="notes-info">
              <a-tag color="blue" v-if="lastSaveTime">
                <a-icon type="clock-circle" />
                上次保存：{{ formatTime(lastSaveTime) }}
              </a-tag>
              <a-tag color="orange" v-if="notesChanged">
                <a-icon type="edit" />
                有未保存的修改
              </a-tag>
            </div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- 项目保存/加载模态框 -->
    <a-modal
      title="保存作品"
      :visible="saveModalVisible"
      @cancel="saveModalVisible = false"
      @ok="confirmSave"
    >
      <a-form layout="vertical">
        <a-form-item label="作品名称">
          <a-input v-model="saveForm.name" placeholder="为您的作品起个名字" />
        </a-form-item>
        <a-form-item label="作品描述">
          <a-textarea v-model="saveForm.description" placeholder="描述您的作品" :rows="3" />
        </a-form-item>
        <a-form-item label="保存类型">
          <a-radio-group v-model="saveForm.type">
            <a-radio value="draft">草稿（仅自己可见）</a-radio>
            <a-radio value="share">分享（课堂内可见）</a-radio>
            <a-radio value="public">公开（所有人可见）</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 全屏编辑器 -->
    <a-modal
      title="全屏编程环境"
      :visible="fullEditorVisible"
      @cancel="fullEditorVisible = false"
      :footer="null"
      :width="'95%'"
      :bodyStyle="{ height: '80vh', padding: 0 }"
    >
      <textarea
        v-if="fullEditorVisible && selectedLanguage !== 'scratch' && selectedLanguage !== 'ai_package'"
        v-model="currentCode"
        @input="onCodeChange(currentCode)"
        :style="{
          width: '100%',
          height: '100%',
          fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
          fontSize: '16px',
          padding: '16px',
          border: 'none',
          background: '#1e1e1e',
          color: '#d4d4d4',
          resize: 'none',
          outline: 'none'
        }"
        :placeholder="`在这里编写${selectedLanguage}代码...`"
      ></textarea>
      <iframe
        v-else-if="fullEditorVisible && selectedLanguage === 'scratch'"
        :src="getScratchFrameSrc()"
        width="100%"
        height="100%"
        frameborder="0"
      ></iframe>
    </a-modal>

    <!-- PPT上传模态框 -->
    <a-modal
      title="上传PPT文件"
      :visible="pptUploadVisible"
      @cancel="pptUploadVisible = false"
      @ok="confirmPPTUpload"
      width="600px"
    >
      <a-form layout="vertical">
        <a-form-item label="PPT文件">
          <a-upload
            :file-list="pptFileList"
            :before-upload="beforePPTUpload"
            @change="handlePPTUpload"
            accept=".ppt,.pptx,.pdf"
          >
            <a-button>
              <a-icon type="upload" />
              选择PPT文件
            </a-button>
            <span style="margin-left: 8px; color: #999;">支持 .ppt, .pptx, .pdf 格式</span>
          </a-upload>
        </a-form-item>
        <a-form-item label="PPT名称">
          <a-input v-model="pptForm.name" placeholder="为PPT起个名字" />
        </a-form-item>
        <a-form-item label="PPT描述">
          <a-textarea v-model="pptForm.description" placeholder="描述PPT内容" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 作品加载模态框 -->
    <a-modal
      title="打开作品"
      :visible="loadWorkVisible"
      @cancel="loadWorkVisible = false"
      @ok="confirmLoadWork"
      width="800px"
    >
      <div class="work-list">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-card size="small" title="筛选条件">
              <a-form layout="vertical">
                <a-form-item label="作品类型">
                  <a-select v-model="workFilter.type" placeholder="选择类型">
                    <a-select-option value="">全部类型</a-select-option>
                    <a-select-option value="scratch">Scratch</a-select-option>
                    <a-select-option value="python">Python</a-select-option>
                    <a-select-option value="javascript">JavaScript</a-select-option>
                    <a-select-option value="html">HTML/CSS</a-select-option>
                  </a-select>
                </a-form-item>
                <a-form-item label="保存状态">
                  <a-select v-model="workFilter.status" placeholder="选择状态">
                    <a-select-option value="">全部状态</a-select-option>
                    <a-select-option value="draft">草稿</a-select-option>
                    <a-select-option value="share">已分享</a-select-option>
                    <a-select-option value="public">已公开</a-select-option>
                  </a-select>
                </a-form-item>
                <a-form-item>
                  <a-input-search
                    v-model="workFilter.keyword"
                    placeholder="搜索作品名称"
                    @search="filterWorks"
                  />
                </a-form-item>
              </a-form>
            </a-card>
          </a-col>
          <a-col :span="16">
            <div class="works-grid">
              <a-list
                :grid="{ gutter: 16, column: 2 }"
                :data-source="filteredWorks"
                :loading="loadingWorks"
              >
                <a-list-item slot="renderItem" slot-scope="item">
                  <a-card
                    size="small"
                    :class="{ 'selected-work': selectedWork && selectedWork.id === item.id }"
                    @click="selectWork(item)"
                    hoverable
                  >
                    <div class="work-preview">
                      <a-icon :type="getLanguageIcon(item.language)" style="font-size: 24px;" />
                    </div>
                    <a-card-meta
                      :title="item.name"
                      :description="item.description || '无描述'"
                    />
                    <div class="work-info">
                      <a-tag :color="getWorkStatusColor(item.status)" size="small">
                        {{ getWorkStatusText(item.status) }}
                      </a-tag>
                      <span class="work-time">{{ formatTime(item.updatedAt) }}</span>
                    </div>
                  </a-card>
                </a-list-item>
              </a-list>
            </div>
          </a-col>
        </a-row>
      </div>
    </a-modal>
  </div>
</template>

<script>
// import CodeEditor from '@/components/CodeEditor'  // 暂时注释掉
import { courseResourceApi } from '@/api/teaching'
import { io } from 'socket.io-client'
import { resolveTeachingAccess } from '@/utils/teachingAccess'
import { getConfiguredBaseUrl } from '@/utils/runtimeBaseUrl'
import { getStoredAccessToken, resolveSocketUrl, shouldAttachTokenToUrl } from '@/utils/trustedApi'

const AI_CLASSROOM_BASE_URL = 'https://ai.codebn.cn'
const runtimeConsole = typeof window !== 'undefined' && window.console
    ? window.console
    : global.console

const console = typeof window !== 'undefined' && window.__APP_DEBUG__ === true
    ? runtimeConsole
    : {
        log () {},
        warn () {},
        error (...args) {
            return runtimeConsole && runtimeConsole.error
                ? runtimeConsole.error(...args)
                : undefined
        }
    }

// 节流函数：限制函数执行频率
function throttle (fn, delay) {
    let lastTime = 0
    let timer = null
    return function (...args) {
        const now = Date.now()
        const remaining = delay - (now - lastTime)
        if (remaining <= 0) {
            if (timer) {
                clearTimeout(timer)
                timer = null
            }
            lastTime = now
            fn.apply(this, args)
        } else if (!timer) {
            timer = setTimeout(() => {
                lastTime = Date.now()
                timer = null
                fn.apply(this, args)
            }, remaining)
        }
    }
}

export default {
    name: 'OnlineClassroom',
    components: {
        // CodeEditor  // 暂时注释掉
    },
    data () {
        return {
            // 用户角色：teacher 或 student（初始值，实际使用computed中的computedUserRole）
            userRole: '',

            // 课堂信息
            classroomInfo: {
                id: this.$route.params.id || 'classroom_001',
                title: 'Scratch编程入门课',
                subject: 'Scratch编程',
                teacherName: '张老师'
            },

            // 编程环境
            selectedLanguage: 'scratch',
            currentCode: '',
            currentProject: null,
            scratchProjectId: null,
            // 保存每种语言的代码（切换时不丢失）
            savedCodes: {
                python: '',
                javascript: '',
                html: ''
            },
            // 自动保存相关
            savingDemo: false,
            demoSaved: true,
            autoSaveTimer: null,

            // 线下教学模式
            projectorMode: false,
            followMode: false,

            // 广播状态
            broadcasting: false,
            teacherBroadcast: {
                active: false,
                type: null, // 'ppt' | 'scratch' | 'code'
                language: '',
                code: '',
                scratchUrl: '',
                pptData: null
            },

            // PPT相关
            currentPPT: {
                file: null,
                name: '',
                totalSlides: 0,
                embedUrl: '',
                slideImages: []
            },
            currentSlide: 1,
            pptUploadVisible: false,
            pptFileList: [],
            pptForm: {
                name: '',
                description: ''
            },
            lessonInfo: null,
            resourceInfo: null,

            // 学生列表
            onlineStudents: [],

            // 学生状态
            needHelp: false,

            // 聊天消息
            chatMessages: [],
            newMessage: '',

            // 保存相关
            saving: false,
            saveModalVisible: false,
            saveForm: {
                name: '',
                description: '',
                type: 'draft'
            },

            // 全屏编辑器
            fullEditorVisible: false,

            // 作品加载相关
            loadWorkVisible: false,
            loadingWorks: false,
            selectedWork: null,
            workFilter: {
                type: '',
                status: '',
                keyword: ''
            },
            savedWorks: [],

            // WebSocket连接
            socket: null,
            socketConnectionStatus: 'connecting',
            socketReconnectAttempts: 0,
            socketLastDisconnectReason: '',
            hasSocketConnected: false,
            isIntentionalSocketClose: false,
            isExitingClassroom: false,
            studentLeaveInProgress: false,
            studentPresenceConfirmed: false,

            // 课堂笔记相关（学生端）
            classroomNotes: '',
            lastSaveTime: null,
            notesChanged: false,
            savingNotes: false,
            notesAutoSaveTimer: null,

            // 代码更新防抖定时器
            codeUpdateTimer: null
        }
    },

    computed: {
    // 获取当前用户信息
        userInfo () {
            return this.$store.state.user.info || {}
        },

        // 自动检测用户角色
        computedUserRole () {
            // 优先使用URL参数
            if (this.$route.query.role) {
                return this.$route.query.role
            }
            const userType =
                this.$store.getters.userType ||
                this.$store.state.user.userType ||
                (this.userInfo && this.userInfo.userType) ||
                null
            const userIdentity = Number((this.userInfo && (this.userInfo.userIdentity || this.userInfo.user_identity)) || 0)

            if (userType === 'student' || userIdentity === 3) {
                return 'student'
            }
            if (userType === 'teacher' || userIdentity === 1 || userIdentity === 2) {
                return 'teacher'
            }
            return this.userRole || 'teacher'
        },

        // 判断是否为教师
        isTeacher () {
            return this.computedUserRole === 'teacher'
        },

        // 判断是否为学生
        isStudent () {
            return this.computedUserRole === 'student'
        },

        // 判断是否为回放模式
        isReplayMode () {
            return this.$route.query.replay === 'true' || this.classroomInfo.status === 'ended' || this.classroomInfo.status === 'archived'
        },

        isAiPackageClassroom () {
            const selectedLanguage = String(this.classroomInfo.selectedLanguage || this.selectedLanguage || '').trim().toLowerCase()
            const resourceType = String((this.resourceInfo && this.resourceInfo.type) || '').trim().toLowerCase()
            const lessonType = String((this.lessonInfo && this.lessonInfo.contentType) || '').trim().toLowerCase()

            return selectedLanguage === 'ai_package' || resourceType === 'ai_package' || lessonType === 'ai_package'
        },

        canOpenAiClassroom () {
            return this.isAiPackageClassroom && Boolean(this.resourceInfo && this.resourceInfo.id)
        },

        aiPackageDownloadUrl () {
            return (this.canOpenAiClassroom && this.resourceInfo && this.resourceInfo.downloadUrl) || ''
        },

        aiResourceDisplayName () {
            return (this.resourceInfo && this.resourceInfo.name) || (this.lessonInfo && this.lessonInfo.unitName) || this.classroomInfo.title || 'AI资源包课堂'
        },

        chatEmptyDescription () {
            return '还没有讨论消息，发送文字或附件开始互动'
        },

        socketConnectionTagText () {
            if (this.socketConnectionStatus === 'reconnecting' && this.socketReconnectAttempts > 0) {
                return `重连中(${this.socketReconnectAttempts})`
            }

            const textMap = {
                connecting: '连接中',
                connected: '实时连接正常',
                reconnecting: '重连中',
                disconnected: '已断开',
                error: '连接异常',
                denied: '访问受限'
            }

            return textMap[this.socketConnectionStatus] || '连接中'
        },

        socketConnectionTagColor () {
            const colorMap = {
                connecting: 'cyan',
                connected: 'green',
                reconnecting: 'gold',
                disconnected: 'default',
                error: 'red',
                denied: 'volcano'
            }

            return colorMap[this.socketConnectionStatus] || 'cyan'
        },

        socketConnectionTagIcon () {
            const iconMap = {
                connecting: 'loading',
                connected: 'check-circle',
                reconnecting: 'loading',
                disconnected: 'pause-circle',
                error: 'warning',
                denied: 'close-circle'
            }

            return iconMap[this.socketConnectionStatus] || 'loading'
        },

        shouldShowSocketAlert () {
            return ['reconnecting', 'disconnected', 'error', 'denied'].includes(this.socketConnectionStatus)
        },

        socketAlertType () {
            const typeMap = {
                reconnecting: 'warning',
                disconnected: 'warning',
                error: 'error',
                denied: 'error'
            }

            return typeMap[this.socketConnectionStatus] || 'info'
        },

        socketAlertMessage () {
            const messageMap = {
                reconnecting: '课堂实时连接正在恢复',
                disconnected: '课堂实时连接已断开',
                error: '课堂实时连接异常',
                denied: '当前账号无权进入该课堂'
            }

            return messageMap[this.socketConnectionStatus] || '课堂连接状态异常'
        },

        socketAlertDescription () {
            if (this.socketConnectionStatus === 'reconnecting') {
                if (this.socketReconnectAttempts > 0) {
                    return `系统正在进行第 ${this.socketReconnectAttempts} 次重连，实时互动可能会短暂延迟。`
                }
                return '系统正在尝试恢复课堂实时连接，请稍候。'
            }

            if (this.socketConnectionStatus === 'denied') {
                return this.socketLastDisconnectReason || '请确认当前账号角色、班级归属和课堂访问权限。'
            }

            if (this.socketConnectionStatus === 'error') {
                return this.socketLastDisconnectReason || '当前无法建立稳定实时连接，请检查网络后重试。'
            }

            return this.socketLastDisconnectReason || '实时连接已经中断，可手动重试或稍后重新进入课堂。'
        },

        canRetrySocketConnection () {
            return ['disconnected', 'error', 'reconnecting'].includes(this.socketConnectionStatus)
        },

        // 过滤后的作品列表
        filteredWorks () {
            let result = [...this.savedWorks]

            if (this.workFilter.type) {
                result = result.filter(work => work.language === this.workFilter.type)
            }

            if (this.workFilter.status) {
                result = result.filter(work => work.status === this.workFilter.status)
            }

            if (this.workFilter.keyword) {
                result = result.filter(work =>
                    work.name.toLowerCase().includes(this.workFilter.keyword.toLowerCase()) ||
          work.description.toLowerCase().includes(this.workFilter.keyword.toLowerCase())
                )
            }

            return result
        }
    },

    watch: {
    // 监听代码变化，自动广播和保存
        currentCode (_newCode) {
            if (this.isTeacher) {
                this.demoSaved = false // 标记为未保存

                // 1. 广播逻辑 (仅在演示状态下)
                if (this.broadcasting && this.isCodeLanguage(this.selectedLanguage)) {
                    if (this.codeUpdateTimer) {
                        clearTimeout(this.codeUpdateTimer)
                    }
                    this.codeUpdateTimer = setTimeout(() => {
                        console.log('📝 [Teacher] 代码变化，广播更新')
                        this.broadcastCurrentContent()
                    }, 500)
                }

                // 2. 自动保存逻辑 (无论是否演示，都自动保存到数据库)
                if (this.autoSaveTimer) {
                    clearTimeout(this.autoSaveTimer)
                }
                this.autoSaveTimer = setTimeout(() => {
                    this.saveDemoContent()
                }, 2000) // 停止输入2秒后自动保存
            }
        },

        // 监听PPT页码变化，自动广播
        currentSlide (_newSlide) {
            if (this.isTeacher && this.broadcasting && this.selectedLanguage === 'ppt') {
                this.broadcastSlideChange()
            }
        }
    },

    async mounted () {
        await this.loadClassroomDetail()
        this.initClassroom()
        this.connectWebSocket()

        // 加载聊天历史记录
        await this.loadChatHistory()

        // 加载展示区历史内容（回顾模式或课堂已结束时）
        await this.loadDemoContent()

        // 学生端加载课堂笔记
        if (this.isStudent) {
            await this.loadClassroomNotes()
        }
    },

    beforeDestroy () {
        if (this.isTeacher) {
            this.persistClassroomViewState({ silent: true }).catch(() => {})
        }

        if (this.isStudent && !this.isReplayMode && !this.isExitingClassroom) {
            this.leaveStudentClassroom({ silent: true }).catch(() => {})
        }

        if (this.socket) {
            this.isIntentionalSocketClose = true
            this.socketConnectionStatus = 'disconnected'
            this.socket.disconnect()
        }

        // 清除笔记自动保存定时器
        if (this.notesAutoSaveTimer) {
            clearTimeout(this.notesAutoSaveTimer)
        }

        // 如果有未保存的笔记，尝试保存
        if (this.isStudent && this.notesChanged && this.classroomNotes) {
            this.saveNotes()
        }
    },

    methods: {
        getCurrentClassroomId () {
            return this.$route.params.id || this.$route.params.classroomId || this.$route.query.classroomId || this.classroomInfo.id
        },

        isCodeLanguage (language = this.selectedLanguage) {
            return !['', 'ppt', 'scratch', 'ai_package'].includes(String(language || '').trim().toLowerCase())
        },

        normalizeExternalUrl (value) {
            const url = String(value || '').trim()
            if (!url) {
                return AI_CLASSROOM_BASE_URL
            }
            if (/^https?:\/\//i.test(url)) {
                return url.replace(/\/+$/, '')
            }
            return `https://${url.replace(/^\/+/, '').replace(/\/+$/, '')}`
        },

        buildAiClassroomLaunchUrl (baseUrl, options = {}) {
            const url = new URL(this.normalizeExternalUrl(baseUrl))
            const importUrl = String(options.importUrl || '').trim()
            const resourceName = String(options.resourceName || '').trim()

            if (importUrl) {
                url.searchParams.set('importUrl', importUrl)
                url.searchParams.set('autoOpen', '1')
                url.searchParams.set('source', 'online-classroom')
                if (resourceName) {
                    url.searchParams.set('resourceName', resourceName)
                }
            }

            return url.toString()
        },

        normalizeDemoLanguage (language) {
            const normalized = String(language || '').trim().toLowerCase()
            if (!normalized) {
                return ''
            }
            if (['document', 'slides', 'powerpoint'].includes(normalized)) {
                return 'ppt'
            }
            if (normalized === 'scratch3') {
                return 'scratch'
            }
            return normalized
        },

        async getAiClassroomShareData () {
            if (!this.canOpenAiClassroom || !this.resourceInfo) {
                return {
                    baseUrl: AI_CLASSROOM_BASE_URL,
                    importUrl: '',
                    resourceName: this.aiResourceDisplayName
                }
            }

            try {
                const classroomId = this.getCurrentClassroomId()
                const response = classroomId
                    ? await courseResourceApi.getClassroomShareLink(classroomId, this.resourceInfo.id, { expireDays: 7 })
                    : await courseResourceApi.getShareLink(this.resourceInfo.id, { expireDays: 7 })
                const data =
                    (response && response.success && response.result) ||
                    (response && response.result) ||
                    (response && response.data && response.data.result) ||
                    {}

                return {
                    baseUrl: this.normalizeExternalUrl(data.openMaicHomeUrl),
                    importUrl: data.aiPackageDownloadUrl || data.downloadUrl || data.shareUrl || '',
                    resourceName: this.aiResourceDisplayName
                }
            } catch (error) {
                console.error('获取 AI 资源包分享链接失败:', error)
                return {
                    baseUrl: AI_CLASSROOM_BASE_URL,
                    importUrl: '',
                    resourceName: this.aiResourceDisplayName
                }
            }
        },

        async openAiClassroomWorkspace () {
            const shareData = await this.getAiClassroomShareData()
            const launchUrl = this.buildAiClassroomLaunchUrl(shareData.baseUrl, {
                importUrl: shareData.importUrl,
                resourceName: shareData.resourceName
            })
            const openedWindow = window.open(launchUrl, '_blank', 'noopener,noreferrer')

            if (!openedWindow) {
                this.$message.warning('浏览器拦截了新窗口，请允许弹窗后重试')
                return
            }

            if (shareData.importUrl) {
                this.$message.success('已打开 AI 互动课堂，并携带当前资源包自动导入')
            } else {
                this.$message.info('已打开 AI 互动课堂首页，可按需手动导入资源包')
            }
        },

        async downloadAiResourcePackage () {
            if (!this.canOpenAiClassroom || !this.resourceInfo) {
                this.$message.warning('当前课堂未绑定可下载的 AI 资源包')
                return
            }

            try {
                const shareData = await this.getAiClassroomShareData()
                const downloadUrl = shareData.importUrl || this.aiPackageDownloadUrl
                if (!downloadUrl) {
                    this.$message.warning('当前未获取到资源包下载地址')
                    return
                }

                window.open(downloadUrl, '_blank', 'noopener,noreferrer')
                this.$message.success('已开始下载资源包')
            } catch (error) {
                console.error('下载 AI 资源包失败:', error)
                this.$message.error('资源包下载失败，请稍后重试')
            }
        },

        getScratchEditorUrl () {
            const userInfo = this.userInfo || {}
            const classroomId = this.getCurrentClassroomId()
            const userId = userInfo.id || userInfo.username || ''
            const userName = userInfo.realname || userInfo.username || 'user'
            const params = ['scene=create']

            if (userId) {
                params.push(`userId=${encodeURIComponent(userId)}`)
            }
            if (userName) {
                params.push(`userName=${encodeURIComponent(userName)}`)
            }
            if (classroomId) {
                params.push(`classroomId=${encodeURIComponent(classroomId)}`)
            }

            return `/scratch3/index.html?${params.join('&')}`
        },

        normalizeScratchFrameUrl (value) {
            const url = String(value || '').trim()
            if (!url) {
                return this.getScratchEditorUrl()
            }

            if (/scratch\.mit\.edu/i.test(url)) {
                return this.getScratchEditorUrl()
            }

            if (/^(?:https?:)?\/\//i.test(url)) {
                if (typeof window === 'undefined' || !window.location) {
                    return this.getScratchEditorUrl()
                }

                try {
                    const parsedUrl = new URL(url, window.location.origin)
                    if (parsedUrl.origin !== window.location.origin) {
                        return this.getScratchEditorUrl()
                    }
                    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
                } catch (_) {
                    return this.getScratchEditorUrl()
                }
            }

            return url.startsWith('/') ? url : `/${url.replace(/^\/+/, '')}`
        },

        resolveScratchWorkUrl (work = {}) {
            const frameUrl = work.scratchUrl || work.previewUrl || work.frameUrl
            if (frameUrl) {
                return this.normalizeScratchFrameUrl(frameUrl)
            }

            const workId = work.workId || work.id || work.projectId
            if (workId) {
                return `/scratch3/player.html?workId=${encodeURIComponent(workId)}`
            }

            const workUrl = work.workUrl || work.workFileUrl || work.fileUrl || work.workFileKey_url
            if (workUrl) {
                return `/scratch3/player.html?workUrl=${encodeURIComponent(workUrl)}`
            }

            return this.getScratchEditorUrl()
        },

        getScratchFrameSrc () {
            if (this.isStudent && this.teacherBroadcast && this.teacherBroadcast.scratchUrl) {
                return this.normalizeScratchFrameUrl(this.teacherBroadcast.scratchUrl)
            }

            if (this.selectedLanguage === 'scratch' && this.selectedWork && this.selectedWork.language === 'scratch') {
                return this.resolveScratchWorkUrl(this.selectedWork)
            }

            return this.getScratchEditorUrl()
        },

        getScratchBroadcastUrl () {
            if (this.selectedWork && this.selectedWork.language === 'scratch') {
                return this.resolveScratchWorkUrl(this.selectedWork)
            }
            return this.getScratchEditorUrl()
        },

        extractScratchProjectId (value) {
            const match = String(value || '').match(/projects\/(\d+)/)
            return match ? match[1] : null
        },

        returnToClassroomList () {
            const teachingAccess = resolveTeachingAccess({
                userRole: this.$store.getters.userRole || this.$store.state.user.userRole || [],
                userType: this.$store.getters.userType || this.$store.state.user.userType || (this.userInfo && this.userInfo.userType) || '',
                userInfo: this.userInfo || this.$store.state.user.info || {}
            })
            this.$router.push(teachingAccess.classroomPath || '/student/classrooms')
        },

        retrySocketConnection () {
            if (!this.getCurrentClassroomId()) {
                this.$message.warning('当前未识别到有效课堂，无法重新连接')
                return
            }

            this.socketConnectionStatus = 'connecting'
            this.socketReconnectAttempts = 0
            this.socketLastDisconnectReason = ''

            if (this.socket) {
                this.isIntentionalSocketClose = true
                this.socket.disconnect()
                this.socket = null
            }

            this.$nextTick(() => {
                this.connectWebSocket()
            })
        },

        async joinStudentClassroom (options = {}) {
            if (!this.isStudent || this.isReplayMode) {
                return true
            }

            const classroomId = this.getCurrentClassroomId()
            if (!classroomId) {
                return false
            }

            try {
                const response = await this.$http.post(`/teaching/classroom/classrooms/${classroomId}/join`)
                const data = response.data || response
                if (!data || !data.success) {
                    throw new Error((data && data.message) || '加入课堂失败')
                }

                this.studentPresenceConfirmed = true
                return true
            } catch (error) {
                this.studentPresenceConfirmed = false
                const message =
                    (error && error.response && error.response.data && error.response.data.message) ||
                    (error && error.message) ||
                    '加入课堂失败'
                this.socketConnectionStatus = ['Classroom is full'].includes(message) ? 'error' : 'denied'
                this.socketLastDisconnectReason = message

                if (!options.silent) {
                    this.$notification.error({
                        message: '加入课堂失败',
                        description: message,
                        duration: 6
                    })
                }
                return false
            }
        },

        async leaveStudentClassroom (options = {}) {
            if (!this.isStudent || this.isReplayMode) {
                return true
            }

            if (!this.studentPresenceConfirmed && !options.force) {
                return true
            }

            if (this.studentLeaveInProgress) {
                return true
            }

            const classroomId = this.getCurrentClassroomId()
            if (!classroomId) {
                return false
            }

            try {
                this.studentLeaveInProgress = true
                await this.$http.post(`/teaching/classroom/classrooms/${classroomId}/leave`)
                this.studentPresenceConfirmed = false
                return true
            } catch (error) {
                if (!options.silent) {
                    const message =
                        (error && error.response && error.response.data && error.response.data.message) ||
                        (error && error.message) ||
                        '离开课堂失败'
                    this.$message.warning(message)
                }
                return false
            } finally {
                this.studentLeaveInProgress = false
            }
        },

        resolveClassroomDisplayLanguage (detail = {}, lesson = {}, resource = {}) {
            const inferredLanguage = this.normalizeDemoLanguage(this.inferLanguage(lesson || {}, resource || {}))
            const selectedLanguage = this.normalizeDemoLanguage(detail.selectedLanguage || detail.selected_language || '')

            if (inferredLanguage === 'ai_package') {
                return 'ai_package'
            }

            return selectedLanguage || inferredLanguage || 'scratch'
        },
        async loadClassroomDetail () {
            try {
                const classroomId = this.getCurrentClassroomId()
                if (!classroomId) {
                    return
                }

                const response = await this.$http.get(`/teaching/classroom/classrooms/${classroomId}`)
                const data = response.data || response

                if (!data.success) {
                    this.$message.error(data.message || '加载课堂详情失败')
                    return
                }

                const detail = data.result || {}
                const lesson = detail.lesson || {}
                const resource = detail.resource || {}

                this.classroomInfo = {
                    id: detail.id,
                    title: detail.classroomName || detail.title || '未命名课堂',
                    subject: detail.subject || detail.courseName || (detail.course && (detail.course.courseName || detail.course.course_name)) || '综合课程',
                    teacherName: detail.teacherName || detail.teacher_name || this.classroomInfo.teacherName,
                    courseId: detail.courseId || (detail.course && detail.course.id) || '',
                    classId: detail.classId || detail.class_id || '',
                    lessonName: detail.lessonName || (lesson && (lesson.unitName || lesson.unit_name)) || '',
                    selectedLanguage: detail.selectedLanguage || detail.selected_language || ''
                }

                this.lessonInfo = lesson && lesson.id ? this.normalizeLesson(lesson) : null
                this.resourceInfo = this.normalizeResource(resource, detail)
                if (!this.resourceInfo && this.lessonInfo) {
                    this.resourceInfo = this.normalizeResource(null, {
                        resourceId: this.lessonInfo.resourceId,
                        resourceName: this.lessonInfo.resourceName,
                        resourceUrl: this.lessonInfo.contentUrl,
                        contentType: this.lessonInfo.contentType
                    })
                }

                const inferredLanguage = this.resolveClassroomDisplayLanguage(detail, this.lessonInfo || lesson || {}, this.resourceInfo || resource || {})
                this.selectedLanguage = inferredLanguage
                this.classroomInfo.selectedLanguage = inferredLanguage

                // PPT资源处理（演示区默认用于PPT展示）
                // 优先使用OSS文件URL（fileUrl），否则使用预览/下载URL
                const ossFileUrl = (this.resourceInfo && this.resourceInfo.fileUrl) || (resource && resource.fileUrl) || (resource && resource.file_url)
                const rawUrl = ossFileUrl || (this.resourceInfo && this.resourceInfo.downloadUrl) || (this.resourceInfo && this.resourceInfo.previewUrl) || (this.lessonInfo && this.lessonInfo.contentUrl) || detail.resourceUrl || (resource && resource.previewUrl) || (resource && resource.downloadUrl)

                // 判断是否是OSS URL
                const isOSSUrl = rawUrl && (rawUrl.includes('aliyuncs.com') || rawUrl.includes('oss-cn-'))

                // 生成预览URL
                let viewUrl = ''
                let canPreview = false
                if (rawUrl) {
                    if (isOSSUrl) {
                        // OSS文件：使用Office Web Viewer（支持PPT在线预览）
                        viewUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawUrl)}`
                        canPreview = true
                        console.log('☁️ [PPT] 使用Office Web Viewer预览OSS文件')
                    } else {
                        // 非OSS文件：无法在线预览，只能下载
                        // 构建完整的下载URL
                        const baseUrl = window.location.origin
                        viewUrl = rawUrl.startsWith('http') ? rawUrl : `${baseUrl}${rawUrl}`
                        canPreview = false
                        console.log('📁 [PPT] 本地文件，仅支持下载:', viewUrl)
                    }
                }

                this.currentPPT = {
                    file: !!rawUrl,
                    name: (this.resourceInfo && this.resourceInfo.name) || (this.lessonInfo && this.lessonInfo.unitName) || detail.resourceName || detail.lessonName || '课堂资源',
                    totalSlides: rawUrl ? 1 : 0,
                    embedUrl: canPreview ? viewUrl : '',
                    viewUrl: canPreview ? viewUrl : '',
                    downloadUrl: rawUrl ? (rawUrl.startsWith('http') ? rawUrl : `${window.location.origin}${rawUrl}`) : '',
                    slideImages: [],
                    rawUrl: rawUrl,
                    isOSS: isOSSUrl,
                    canPreview: canPreview
                }

                if (rawUrl) {
                    console.log('✅ [PPT] 加载课堂资源:', {
                        name: this.currentPPT.name,
                        rawUrl: rawUrl,
                        viewUrl: viewUrl,
                        isOSS: isOSSUrl
                    })
                }

                if (inferredLanguage === 'scratch') {
                    this.currentProject = {
                        name: (this.resourceInfo && this.resourceInfo.name) || this.classroomInfo.title,
                        resourceId: this.resourceInfo ? this.resourceInfo.id : ''
                    }
                    this.scratchProjectId = null
                }

                if (detail.contentType) {
                    this.broadcasting = detail.contentType === 'broadcast'
                }

                if (typeof document !== 'undefined' && this.classroomInfo.title) {
                    document.title = `${this.classroomInfo.title} - 乐慧享智慧课堂`
                }
            } catch (error) {
                console.error('加载课堂详情失败:', error)
                this.$message.error('加载课堂详情失败')
            }
        },

        // 初始化课堂
        initClassroom () {
            // 根据角色设置初始状态
            if (this.isTeacher && !this.selectedLanguage) {
                this.selectedLanguage = 'scratch'
            }

            // 自动滚动聊天消息
            this.$nextTick(() => {
                this.scrollToBottom()
            })
        },

        inferLanguage (lesson, resource) {
            // 优先使用课节的contentType
            const lessonType = lesson.contentType || lesson.content_type
            if (lessonType) {
                const typeNormalized = lessonType.toLowerCase()
                if (['ai_package', 'ai-resource', 'ai_resource'].includes(typeNormalized)) {
                    return 'ai_package'
                }
                if (['ppt', 'document', 'slides', 'powerpoint'].includes(typeNormalized)) {
                    return 'ppt'
                }
                if (['python'].includes(typeNormalized)) {
                    return 'python'
                }
                if (['scratch', 'scratch3'].includes(typeNormalized)) {
                    return 'scratch'
                }
                if (['javascript', 'js'].includes(typeNormalized)) {
                    return 'javascript'
                }
                if (['html', 'web'].includes(typeNormalized)) {
                    return 'html'
                }
                // 如果是无效类型（如"lesson"），忽略，继续后续判断
            }

            // 其次检查资源类型
            const resourceType = resource.type || resource.resource_type
            if (resourceType) {
                const typeNormalized = resourceType.toLowerCase()
                if (['ai_package', 'ai-resource', 'ai_resource'].includes(typeNormalized)) {
                    return 'ai_package'
                }
                if (['ppt', 'document', 'slides', 'powerpoint'].includes(typeNormalized)) {
                    return 'ppt'
                }
            }

            // 最后通过文件名扩展名判断
            const name = (resource.name || resource.resource_name || lesson.unitName || lesson.unit_name || '').toLowerCase()
            if (/\.(pptx?|pdf)$/.test(name)) {
                return 'ppt'
            }
            if (/\.(py|python)$/.test(name)) {
                return 'python'
            }
            if (/\.(sb3|scratch)$/.test(name)) {
                return 'scratch'
            }
            if (/\.zip$/.test(name) && this.isAiPackageClassroom) {
                return 'ai_package'
            }
            if (/\.(js|javascript)$/.test(name)) {
                return 'javascript'
            }
            if (/\.(html?|htm)$/.test(name)) {
                return 'html'
            }

            // 默认返回ppt（演示区主要用于PPT展示）
            return 'ppt'
        },

        normalizeLesson (lesson) {
            if (!lesson) return null
            const resourceId = lesson.resourceId || lesson.resource_id
            return {
                id: lesson.id,
                unitName: lesson.unitName || lesson.unit_name || lesson.title || '',
                duration: lesson.duration || 30,
                contentType: lesson.contentType || lesson.content_type || '',
                contentUrl: lesson.contentUrl || lesson.content_url || (resourceId ? `/api/resource/preview/${resourceId}` : ''),
                resourceId,
                resourceName: lesson.resourceName || lesson.resource_name || '',
                resourceUrl: lesson.resourceUrl || lesson.resource_url || (resourceId ? `/api/resource/preview/${resourceId}` : '')
            }
        },

        normalizeResource (resource, fallback = {}) {
            if (!resource && !fallback) {
                return null
            }

            const id = (resource && (resource.id || resource.resource_id)) || fallback.resourceId || fallback.resource_id
            const name = (resource && (resource.name || resource.resource_name)) || fallback.resourceName || ''
            const type = (resource && (resource.type || resource.resource_type)) || fallback.contentType || ''

            // 获取OSS文件URL（用于在线预览）
            const fileUrl = (resource && (resource.fileUrl || resource.file_url)) || fallback.fileUrl || ''
            const storageType = (resource && (resource.storageType || resource.storage_type)) || fallback.storageType || 'local'

            // 使用正确的课程资源API路径
            const apiBaseUrl = getConfiguredBaseUrl(process.env.VUE_APP_API_BASE_URL)
            const previewUrl = (resource && (resource.previewUrl || resource.resource_url)) || fallback.resourceUrl || (id ? `${apiBaseUrl}/api/teaching/course/resources/preview/${id}` : '')
            const downloadUrl = (resource && (resource.downloadUrl || resource.download_url)) || (id ? `${apiBaseUrl}/api/teaching/course/resources/download/${id}` : '')

            if (!id && !previewUrl) {
                return null
            }

            return {
                id,
                name,
                type,
                fileUrl, // OSS文件URL，用于在线预览
                storageType, // 存储类型：oss 或 local
                previewUrl,
                downloadUrl
            }
        },

        // 连接WebSocket
        connectWebSocket () {
            const userInfo = this.$store.getters.userInfo || {}
            const classroomId = this.getCurrentClassroomId()

            // 优先使用环境变量配置的Socket地址，否则使用后端API地址
            const socketUrl = resolveSocketUrl()
            // 使用计算后的角色，而不是固定的this.userRole
            const currentRole = this.computedUserRole

            this.isIntentionalSocketClose = false
            this.socketConnectionStatus = 'connecting'
            this.socketReconnectAttempts = 0
            this.socketLastDisconnectReason = ''

            console.log('🔌 [WebSocket] 准备连接:', {
                classroomId,
                userRole: currentRole,
                userId: userInfo.id || userInfo.username,
                userName: userInfo.realname || userInfo.username
            })

            const accessToken =
                this.$store.getters.token ||
                (this.$ls && this.$ls.get && this.$ls.get('Access-Token')) ||
                getStoredAccessToken()

            const sendSocketCredentials = shouldAttachTokenToUrl(socketUrl)
            const socketToken = sendSocketCredentials ? accessToken : ''

            if (sendSocketCredentials && !socketToken) {
                console.warn('⚠️ [WebSocket] 未读取到有效登录Token，Socket鉴权可能失败')
            }

            this.socket = io(socketUrl, {
                auth: {
                    token: socketToken
                },
                withCredentials: sendSocketCredentials,
                query: {
                    classroomId: classroomId,
                    userRole: currentRole,
                    userId: userInfo.id || userInfo.username || 'anonymous',
                    userName: userInfo.realname || userInfo.username || '未知用户'
                },
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 8,
                reconnectionDelay: 2000,
                timeout: 20000
            })

            // 连接成功
            this.socket.on('connect', async () => {
                console.log('✅ [WebSocket] 连接成功，角色:', currentRole)
                this.socketConnectionStatus = 'connected'
                this.socketReconnectAttempts = 0
                this.socketLastDisconnectReason = ''

                if (this.isStudent) {
                    const joined = await this.joinStudentClassroom({ silent: this.hasSocketConnected })
                    if (!joined) {
                        if (this.socket) {
                            this.isIntentionalSocketClose = true
                            this.socket.disconnect()
                        }
                        this.returnToClassroomList()
                        return
                    }
                }

                if (!this.hasSocketConnected) {
                    this.$message.success('已连接到课堂服务器')
                }

                // 加入课堂房间
                this.socket.emit('join-classroom', {
                    classroomId: classroomId,
                    userRole: currentRole,
                    userId: userInfo.id || userInfo.username || 'anonymous',
                    userName: userInfo.realname || userInfo.username || '未知用户'
                })

                this.hasSocketConnected = true
            })

            // 连接失败
            this.socket.on('connect_error', (error) => {
                console.error('WebSocket连接失败:', error)
                const shouldNotify = !this.hasSocketConnected && this.socketConnectionStatus !== 'error'

                this.socketConnectionStatus = this.hasSocketConnected ? 'reconnecting' : 'error'
                this.socketLastDisconnectReason = error && error.message ? error.message : '课堂连接失败'

                if (shouldNotify) {
                    this.$notification.error({
                        message: '课堂连接失败',
                        description: '当前无法建立实时连接，部分互动功能可能暂时不可用。',
                        duration: 5
                    })
                }
            })

            this.socket.on('disconnect', (reason) => {
                console.warn('⚠️ [WebSocket] 连接断开:', reason)

                if (this.socketConnectionStatus === 'denied') {
                    return
                }

                if (this.isIntentionalSocketClose || reason === 'io client disconnect') {
                    this.socketConnectionStatus = 'disconnected'
                    return
                }

                this.socketConnectionStatus = 'reconnecting'
                this.socketLastDisconnectReason = reason || '连接已断开'

                this.$notification.warning({
                    message: '课堂连接中断',
                    description: '正在尝试重新连接课堂服务，实时互动可能会短暂延迟。',
                    duration: 4
                })
            })

            if (this.socket.io) {
                this.socket.io.on('reconnect_attempt', (attemptNumber) => {
                    if (this.isIntentionalSocketClose) {
                        return
                    }

                    this.socketConnectionStatus = 'reconnecting'
                    this.socketReconnectAttempts = attemptNumber
                })

                this.socket.io.on('reconnect', (attemptNumber) => {
                    if (this.isIntentionalSocketClose) {
                        return
                    }

                    this.socketConnectionStatus = 'connected'
                    this.socketReconnectAttempts = 0
                    this.socketLastDisconnectReason = ''

                    this.$notification.success({
                        message: '课堂连接已恢复',
                        description: `实时连接已在第${attemptNumber}次尝试后恢复。`,
                        duration: 4
                    })
                })

                this.socket.io.on('reconnect_failed', () => {
                    if (this.isIntentionalSocketClose) {
                        return
                    }

                    this.socketConnectionStatus = 'error'
                    this.socketLastDisconnectReason = '课堂连接多次重试后仍未恢复'

                    this.$notification.error({
                        message: '课堂连接恢复失败',
                        description: '已多次尝试重连但仍未成功，请检查网络后刷新页面重试。',
                        duration: 6
                    })
                })
            }

            this.socket.on('classroom-access-denied', (data) => {
                const message = (data && data.message) || '您无权进入当前课堂'
                this.socketConnectionStatus = 'denied'
                this.socketLastDisconnectReason = message
                this.$notification.error({
                    message: '课堂访问被拒绝',
                    description: message,
                    duration: 6
                })

                if (data && data.event === 'join-classroom' && this.socket) {
                    this.isIntentionalSocketClose = true
                    this.socket.disconnect()
                }
            })

            this.socket.on('classroom-action-denied', (data) => {
                const message = (data && data.message) || '当前操作未获授权'
                this.$message.warning(message)
            })

            this.socket.on('student-joined', (data) => {
                this.onStudentJoined(data)
            })

            // 学生离开
            this.socket.on('student-left', (data) => {
                this.onStudentLeft(data)
            })

            // 广播开始
            this.socket.on('broadcast-started', (data) => {
                this.onBroadcastStarted(data)
            })

            // ✅ 广播内容更新（教师切换内容时）
            this.socket.on('broadcast-content-update', (data) => {
                console.log('🔄 [Student] 收到内容更新:', data)
                this.onBroadcastStarted(data) // 复用广播开始的逻辑
            })

            // 广播停止
            this.socket.on('broadcast-stopped', () => {
                console.log('⏸️ [Student] 广播已停止')
                this.teacherBroadcast.active = false
                this.$message.info('教师已停止演示，您可以自由操作了')
            })

            // 代码更新
            this.socket.on('code-updated', (data) => {
                this.onCodeUpdated(data)
            })

            // 聊天消息
            this.socket.on('chat-message', (data) => {
                this.onChatMessage(data)
            })

            // 学生状态更新
            this.socket.on('student-status-updated', (data) => {
                this.onStudentStatusUpdated(data)
            })

            // 投影仪模式切换
            this.socket.on('projector-mode-changed', (data) => {
                if (this.isStudent) {
                    this.projectorMode = data.enabled
                    this.$message.info(data.enabled ? '教师开启了投影仪模式' : '教师关闭了投影仪模式')
                }
            })

            // 课堂开始
            this.socket.on('classroom-started', (data) => {
                console.log('📢 课堂已开始:', data)
                this.$message.success(data.message || '课堂已开始')
                this.classroomInfo.status = 'active'
            })

            // 课堂结束（但仍可访问）
            this.socket.on('classroom-ended', (data) => {
                console.log('📢 课堂已结束:', data)
                this.$notification.warning({
                    message: '课堂已结束',
                    description: data.message || '课堂已结束，但您仍可查看PPT和资源。30分钟后将自动归档。',
                    duration: 10
                })
                this.classroomInfo.status = 'ended'
            })

            // 课堂归档
            this.socket.on('classroom-archived', (data) => {
                console.log('📢 课堂已归档:', data)
                this.$notification.info({
                    message: '课堂已归档',
                    description: data.message || '课堂已归档为历史记录，您仍可查看所有内容。',
                    duration: 8
                })
                this.classroomInfo.status = 'archived'
            })

            // PPT同步
            this.socket.on('ppt-changed', (data) => {
                if (this.isStudent) {
                    console.log('📊 收到PPT同步:', data)
                    this.currentPPT = data.pptData
                    this.currentSlide = data.currentSlide
                    this.selectedLanguage = 'ppt'
                    this.$message.info('教师已切换PPT')
                }
            })

            // PPT页码同步
            this.socket.on('slide-changed', (data) => {
                if (this.isStudent) {
                    console.log('📄 收到PPT页码同步:', data)
                    this.currentSlide = data.currentSlide
                }
            })
        },

        // 切换投影仪模式
        toggleProjectorMode () {
            this.projectorMode = !this.projectorMode

            if (this.projectorMode) {
                this.$message.success('投影仪模式已开启，适合大屏幕展示')
                document.body.classList.add('projector-mode')
            } else {
                this.$message.info('投影仪模式已关闭')
                document.body.classList.remove('projector-mode')
            }

            // 教师端广播投影仪模式变化
            if (this.isTeacher && this.socket) {
                this.socket.emit('projector-mode-change', {
                    enabled: this.projectorMode
                })
            }
        },

        // 切换学生跟随模式
        toggleFollowMode () {
            this.followMode = !this.followMode

            if (this.followMode) {
                this.$message.success('跟随模式已开启，将同步老师的操作')
                // 自动同步老师的编程语言和内容
                this.syncWithTeacher()
            } else {
                this.$message.info('跟随模式已关闭，可以自由创作')
            }
        },

        // 同步老师内容
        syncWithTeacher () {
            if (this.teacherBroadcast.active && this.followMode) {
                this.selectedLanguage = this.teacherBroadcast.language
                if (this.teacherBroadcast.type === 'code') {
                    this.currentCode = this.teacherBroadcast.code
                }
            }
        },

        // 切换编程语言
        switchLanguage (language) {
            const oldLanguage = this.selectedLanguage

            if (this.codeUpdateTimer) {
                clearTimeout(this.codeUpdateTimer)
            }
            if (this.autoSaveTimer) {
                clearTimeout(this.autoSaveTimer)
            }

            if (this.isCodeLanguage(oldLanguage)) {
                this.savedCodes[oldLanguage] = this.currentCode
                if (this.isTeacher) {
                    this.persistDemoSnapshot({
                        content: this.savedCodes[oldLanguage] || this.currentCode,
                        language: oldLanguage
                    }).catch(() => {})
                }
            }

            this.selectedLanguage = language
            this.classroomInfo.selectedLanguage = language

            if (language === 'ppt') {
                if (!this.currentPPT.file) {
                    this.currentSlide = 1
                }
            } else if (language === 'scratch') {
            } else if (language === 'ai_package') {
                if (this.broadcasting) {
                    this.broadcasting = false
                    this.stopBroadcast()
                }
                this.currentCode = ''
                this.demoSaved = true
            } else {
                this.currentCode = this.savedCodes[language] || ''
            }

            if (this.isTeacher && this.socket) {
                console.log('🔄 [Teacher] 切换演示内容:', language)
                this.broadcastCurrentContent()
            }

            if (this.isTeacher) {
                this.persistClassroomViewState({ silent: true }).catch(() => {})
            }
        },

        // 获取语言标签（学生端显示用）
        getLanguageLabel (language) {
            const labels = {
                ppt: 'PPT展示',
                ai_package: 'AI互动课堂',
                scratch: 'Scratch',
                python: 'Python',
                javascript: 'JavaScript',
                html: 'HTML/CSS'
            }
            return labels[language] || language
        },

        // 获取模板代码
        getTemplateCode (language) {
            const templates = {
                python: '# Python编程示例\nprint("Hello, World!")\n',
                javascript: '// JavaScript编程示例\n\n',
                html: '<!DOCTYPE html>\n<html>\n<head>\n    <title>我的网页</title>\n</head>\n<body>\n    <h1>Hello, World!</h1>\n</body>\n</html>'
            }
            return templates[language] || ''
        },

        // 代码变化处理
        onCodeChange (code) {
            if (!this.isCodeLanguage()) {
                this.currentCode = ''
                return
            }

            this.currentCode = code

            if (this.isCodeLanguage()) {
                this.savedCodes[this.selectedLanguage] = code
            }

            if (this.isTeacher && this.socket) {
                this.throttledBroadcastCode(code)
            }
        },

        // 开始/停止广播
        toggleBroadcast () {
            if (this.selectedLanguage === 'ai_package') {
                this.$message.info('AI资源包课堂请直接打开 AI 互动课堂使用，当前模式不支持演示广播')
                return
            }

            this.broadcasting = !this.broadcasting

            if (this.broadcasting) {
                this.$message.success('开始广播演示')
                this.startBroadcast()
            } else {
                this.$message.info('停止广播演示')
                this.stopBroadcast()
            }
        },

        // 开始广播
        startBroadcast () {
            const broadcastData = {
                active: true,
                type: this.selectedLanguage,
                language: this.selectedLanguage
            }

            if (this.selectedLanguage === 'ppt') {
                broadcastData.type = 'ppt'
                broadcastData.pptData = this.currentPPT
                broadcastData.currentSlide = this.currentSlide
            } else if (this.selectedLanguage === 'scratch') {
                broadcastData.type = 'scratch'
                broadcastData.scratchUrl = this.getScratchBroadcastUrl()
            } else if (this.selectedLanguage === 'ai_package') {
                broadcastData.type = 'ai_package'
                broadcastData.resourceId = this.resourceInfo ? this.resourceInfo.id : ''
                broadcastData.resourceName = this.aiResourceDisplayName
                broadcastData.resourceInfo = this.resourceInfo
                    ? {
                        id: this.resourceInfo.id,
                        name: this.resourceInfo.name,
                        type: this.resourceInfo.type,
                        downloadUrl: this.resourceInfo.downloadUrl || ''
                    }
                    : null
            } else {
                broadcastData.type = 'code'
                broadcastData.code = this.currentCode
            }

            console.log('🔥 [Teacher] 开始广播:', broadcastData)

            // 发送广播数据到所有学生
            if (this.socket) {
                this.socket.emit('start-broadcast', broadcastData)
                // 如果是PPT，额外广播PPT数据
                if (this.selectedLanguage === 'ppt' && this.currentPPT.file) {
                    this.broadcastPPT()
                }
            }
        },

        // 停止广播
        stopBroadcast () {
            if (this.socket) {
                this.socket.emit('stop-broadcast')
            }
        },

        // ✅ 广播当前内容（统一方法）- 教师端始终同步到学生
        broadcastCurrentContent () {
            if (!this.isTeacher || !this.socket) {
                return
            }

            let broadcastData = {
                active: true,
                type: this.selectedLanguage,
                language: this.selectedLanguage
            }

            if (this.selectedLanguage === 'ppt') {
                broadcastData.type = 'ppt'
                broadcastData.pptData = this.currentPPT
                broadcastData.currentSlide = this.currentSlide
            } else if (this.selectedLanguage === 'scratch') {
                broadcastData.type = 'scratch'
                broadcastData.scratchUrl = this.getScratchBroadcastUrl()
            } else if (this.selectedLanguage === 'ai_package') {
                broadcastData.type = 'ai_package'
                broadcastData.resourceId = this.resourceInfo ? this.resourceInfo.id : ''
                broadcastData.resourceName = this.aiResourceDisplayName
                broadcastData.resourceInfo = this.resourceInfo
                    ? {
                        id: this.resourceInfo.id,
                        name: this.resourceInfo.name,
                        type: this.resourceInfo.type,
                        downloadUrl: this.resourceInfo.downloadUrl || ''
                    }
                    : null
            } else {
                broadcastData.type = 'code'
                broadcastData.code = this.currentCode
                broadcastData.language = this.selectedLanguage
            }

            console.log('📡 [Teacher] 广播当前内容:', broadcastData)

            // 发送内容更新广播
            this.socket.emit('broadcast-content-update', broadcastData)
        },

        // 广播代码（教师端始终同步，不依赖broadcasting状态）
        broadcastCode (code) {
            if (this.socket && this.isCodeLanguage()) {
                this.socket.emit('broadcast-code', {
                    language: this.selectedLanguage,
                    code: code
                })
            }
        },

        // 节流版本的广播代码（每500ms最多发送一次）
        throttledBroadcastCode: throttle(function (code) {
            this.broadcastCode(code)
        }, 500),

        // 广播语言切换
        broadcastLanguageSwitch (language) {
            if (this.socket) {
                this.socket.emit('broadcast-language-switch', {
                    language: language,
                    code: this.savedCodes[language] || ''
                })
            }
        },

        // 保存作品
        saveWork () {
            this.saveForm = {
                name: `我的${this.selectedLanguage}作品_${new Date().getTime()}`,
                description: '',
                type: 'draft'
            }
            this.saveModalVisible = true
        },

        // 确认保存
        async confirmSave () {
            if (!this.saveForm.name) {
                this.$message.error('请输入作品名称')
                return
            }

            this.saving = true

            try {
                const projectData = {
                    name: this.saveForm.name,
                    description: this.saveForm.description,
                    type: this.saveForm.type,
                    language: this.selectedLanguage,
                    code: this.currentCode,
                    scratchProjectId: this.scratchProjectId,
                    classroomId: this.classroomInfo.id
                }

                // 发送保存请求到服务器
                // await this.$http.post('/api/projects/save', projectData)

                this.$message.success('作品保存成功！')
                this.saveModalVisible = false

                // 如果是分享类型，通知其他人
                if (this.saveForm.type === 'share') {
                    this.shareWorkToClass(projectData)
                }
            } catch (error) {
                this.$message.error('保存失败：' + error.message)
            } finally {
                this.saving = false
            }
        },

        // 分享作品到班级
        shareWorkToClass (projectData) {
            if (this.socket) {
                this.socket.emit('share-work', projectData)
            }
        },

        // 学生举手求助
        toggleHelp () {
            this.needHelp = !this.needHelp

            if (this.socket) {
                const userInfo = this.$store.getters.userInfo || {}
                this.socket.emit('student-status-update', {
                    studentId: userInfo.id || userInfo.username || 'anonymous',
                    studentName: userInfo.realname || userInfo.username || '未知学生',
                    status: 'need_help',
                    needHelp: this.needHelp
                })
            }

            this.$message.info(this.needHelp ? '已向老师求助' : '取消求助')
        },

        // 教师协助学生
        assistStudent (student) {
            if (!student || !student.name) {
                this.$message.error('学生信息不完整')
                return
            }

            this.$message.info(`正在协助学生：${student.name}`)

            // 可以打开学生的作品进行远程协助
            this.$info({
                title: `协助学生 - ${student.name}`,
                content: `学生当前状态：${this.getStatusText(student.status)}`,
                width: 600
            })
        },

        // 打开编辑器（新窗口）
        openEditor (editorType) {
            const userInfo = this.$store.getters.userInfo || {}
            const classroomId = this.getCurrentClassroomId()
            const userId = userInfo.id || userInfo.username
            const userName = userInfo.realname || userInfo.username || '用户'

            let editorUrl = ''
            switch (editorType) {
            case 'scratchjr':
                editorUrl = `/scratchjr/home.html?userId=${userId}&userName=${encodeURIComponent(userName)}&classroomId=${classroomId}`
                break
            case 'scratch':
                editorUrl = `/scratch3/index.html?scene=create&userId=${userId}&userName=${encodeURIComponent(userName)}&classroomId=${classroomId}`
                break
            case 'python':
                editorUrl = `/python/index.html?userId=${userId}&userName=${encodeURIComponent(userName)}&classroomId=${classroomId}`
                break
            default:
                this.$message.error('未知的编辑器类型')
                return
            }

            // 在新窗口打开编辑器
            const editorWindow = window.open(editorUrl, `_blank_${editorType}_${Date.now()}`, 'width=1280,height=800')

            if (editorWindow) {
                this.$message.success(`正在打开${editorType}编辑器...`)
            } else {
                this.$message.error('无法打开编辑器窗口，请检查浏览器弹窗设置')
            }
        },

        // 发送聊天消息
        sendMessage () {
            if (!this.newMessage.trim()) return

            const userInfo = this.userInfo || {}
            const classroomId = this.getCurrentClassroomId()

            const message = {
                id: Date.now(),
                senderId: userInfo.id || userInfo.username || 'anonymous',
                senderName: userInfo.realname || userInfo.username || '未知用户',
                avatar: userInfo.avatar || null,
                content: this.newMessage,
                userRole: this.computedUserRole,
                time: new Date(),
                classroomId: classroomId,
                type: 'text'
            }

            // 不在本地添加消息，等待Socket.io广播返回
            // this.chatMessages.push(message)

            if (this.socket) {
                this.socket.emit('chat-message', message)
            }

            this.newMessage = ''
        },

        // 滚动到聊天底部
        scrollToBottom () {
            if (this.$refs.chatMessages) {
                this.$refs.chatMessages.scrollTop = this.$refs.chatMessages.scrollHeight
            }
        },

        // 处理文件选择 - OSS直传
        noopAntUploadRequest ({ onSuccess }) {
            // 统一走 handleFileSelect 手动上传，阻止 a-upload 默认 action 请求
            if (typeof onSuccess === 'function') {
                onSuccess({}, null)
            }
        },

        // 获取课堂文件签名访问链接（优先使用POST，避免 fileKey 路径编码问题）
        async resolveFileDownloadUrl (classroomId, fileKey) {
            if (!fileKey) return null
            if (/^https?:\/\//i.test(fileKey) || String(fileKey).startsWith('/uploads/')) {
                return fileKey
            }

            try {
                const urlRes = await this.$http.post(
                    `/teaching/classroom/classrooms/${classroomId}/file-url`,
                    { fileKey }
                )
                const urlData = urlRes.data || urlRes
                if (urlData && urlData.success && urlData.result) {
                    return urlData.result.fileUrl || urlData.result.url || null
                }
                return null
            } catch (error) {
                console.error('获取文件下载URL失败:', error)
                return null
            }
        },
        shouldFallbackToServerUpload (error) {
            if (!error) return false

            const message = String(error.message || '')
            const status = error.response && error.response.status

            if (status && [401, 403].includes(status)) {
                return false
            }

            return (
                message.includes('OSS上传失败') ||
                message.includes('OSS未配置') ||
                message.includes('上传凭证返回不完整') ||
                message.includes('获取上传凭证失败') ||
                message.includes('Failed to fetch') ||
                message.includes('NetworkError')
            )
        },

        async uploadFileViaServer (file) {
            const formData = new FormData()
            formData.append('file', file)
            const uploadRes = await this.$http.post('/sys/common/upload', formData)

            const uploadData = uploadRes.data || uploadRes
            if (!uploadData || !uploadData.success) {
                throw new Error((uploadData && uploadData.message) || '服务器上传失败')
            }

            const fileUrl = uploadData.message || uploadData.result
            if (!fileUrl) {
                throw new Error('服务器上传返回文件地址为空')
            }

            return { fileUrl }
        },

        // 处理文件选择 - OSS直传
        async handleFileSelect (file) {
            // 文件大小验证
            const maxSize = 100 * 1024 * 1024 // 100MB
            if (file.size > maxSize) {
                this.$message.error('文件大小超过限制（最大100MB），请压缩文件后重新上传')
                return false
            }

            // 显示上传中提示
            const hide = this.$message.loading('正在上传文件...', 0)
            let uploadUrl = ''
            let messageFileKey = ''
            let messageFileUrl = ''
            let usedServerFallback = false

            try {
                const classroomId = this.getCurrentClassroomId()
                if (!classroomId) {
                    throw new Error('课堂ID不能为空')
                }

                try {
                    // 1. 请求上传凭证
                    const tokenRes = await this.$http.post(
                        `/teaching/classroom/classrooms/${classroomId}/upload-token`,
                        {
                            fileName: file.name,
                            fileSize: file.size,
                            fileType: file.type
                        }
                    )
                    const tokenData = tokenRes.data || tokenRes
                    if (!tokenData || !tokenData.success || !tokenData.result) {
                        throw new Error((tokenData && tokenData.message) || '获取上传凭证失败')
                    }

                    const tokenResult = tokenData.result
                    uploadUrl = tokenResult.uploadUrl || (tokenResult.uploadToken && tokenResult.uploadToken.uploadUrl)
                    const fileKey = tokenResult.fileKey || tokenResult.ossPath || (tokenResult.uploadToken && tokenResult.uploadToken.ossPath)
                    if (!uploadUrl || !fileKey) {
                        throw new Error('上传凭证返回不完整')
                    }

                    // 2. 直接上传到OSS
                    const uploadResponse = await fetch(uploadUrl, {
                        method: 'PUT',
                        body: file,
                        headers: {
                            'Content-Type': file.type || 'application/octet-stream'
                        }
                    })

                    if (!uploadResponse.ok) {
                        throw new Error(`OSS上传失败: ${uploadResponse.status}`)
                    }

                    messageFileKey = fileKey // OSS文件key
                } catch (ossError) {
                    if (!this.shouldFallbackToServerUpload(ossError)) {
                        throw ossError
                    }

                    console.warn('OSS直传失败，切换服务器上传兜底:', ossError)
                    const fallbackResult = await this.uploadFileViaServer(file)
                    messageFileUrl = fallbackResult.fileUrl
                    messageFileKey = fallbackResult.fileUrl
                    usedServerFallback = true
                }

                // 3. 发送文件元数据via WebSocket
                const userInfo = this.userInfo || {}
                const fileMessage = {
                    id: `file_${Date.now()}`,
                    type: 'file',
                    senderId: userInfo.id || userInfo.username || 'anonymous',
                    senderName: userInfo.realname || userInfo.username || '未知用户',
                    avatar: userInfo.avatar || null,
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type,
                    content: file.name,
                    userRole: this.computedUserRole,
                    fileKey: messageFileKey,
                    time: new Date(),
                    classroomId: classroomId
                }
                if (messageFileUrl) {
                    fileMessage.fileUrl = messageFileUrl
                }

                // 通过WebSocket发送文件元数据
                if (this.socket) {
                    this.socket.emit('chat-message', fileMessage)
                } else {
                    throw new Error('课堂连接已断开，请刷新后重试')
                }

                hide()
                if (usedServerFallback) {
                    this.$message.warning('OSS上传异常，已自动切换服务器上传')
                }
                this.$message.success('文件发送成功')
                this.$nextTick(() => {
                    this.scrollToBottom()
                })
            } catch (error) {
                hide()
                console.error('文件上传失败:', error)

                // 用户友好的错误提示
                if (error.message.includes('获取上传凭证失败')) {
                    this.$message.error('获取上传凭证失败，请稍后重试')
                } else if (error.message.includes('服务器上传失败') || error.message.includes('服务器上传返回文件地址为空')) {
                    this.$message.error('云上传失败且服务器兜底上传也失败，请联系管理员')
                } else if (error.message.includes('没有上传文件')) {
                    this.$message.error('文件上传失败：未读取到文件内容，请重新选择文件后再试')
                } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                    this.$message.error('文件上传被云存储跨域策略拦截，请联系管理员检查 OSS CORS（class.codebn.cn）')
                } else if (error.message.includes('OSS上传失败: 405')) {
                    let uploadHost = ''
                    try {
                        uploadHost = uploadUrl ? new URL(uploadUrl).hostname : ''
                    } catch (_) {
                        uploadHost = ''
                    }
                    this.$message.error(`OSS上传地址返回405（${uploadHost || '未知主机'}），请检查OSS CORS与上传域名配置`)
                } else if (error.message.includes('OSS上传失败')) {
                    this.$message.error('文件上传失败，请检查网络连接后重试')
                } else {
                    this.$message.error('文件上传失败，请重试')
                }
            }

            return false // 阻止自动上传
        },

        // 格式化文件大小
        formatFileSize (bytes) {
            if (!bytes) return '0 B'
            const k = 1024
            const sizes = ['B', 'KB', 'MB', 'GB']
            const i = Math.floor(Math.log(bytes) / Math.log(k))
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
        },

        // 获取消息发送者名称
        getMessageSenderName (msg) {
            if (msg.senderName) return msg.senderName
            if (msg.sender && msg.sender.name) return msg.sender.name
            return '未知'
        },

        // 获取消息发送者首字母
        getMessageSenderInitial (msg) {
            const name = this.getMessageSenderName(msg)
            return name.charAt(0)
        },

        // 打开全屏编辑器
        openFullEditor () {
            if (this.isCodeLanguage() || this.selectedLanguage === 'scratch') {
                this.fullEditorVisible = true
                return
            }

            this.$message.info('当前内容不需要全屏代码编辑')
        },

        // 开始课堂
        async startClassroom () {
            try {
                const classroomId = this.getCurrentClassroomId()
                const { postAction } = require('@/api/manage')

                const res = await postAction(`/classroom/${classroomId}/start`)

                if (res && res.success) {
                    this.$message.success('课堂已开始！')

                    // 更新课堂状态
                    this.classroomInfo.status = 'active'
                    this.classroomInfo.startTime = new Date()

                    // 通知所有学生课堂已开始
                    if (this.socket) {
                        this.socket.emit('classroom-started', {
                            classroomId: classroomId,
                            message: '课堂已开始，欢迎大家！'
                        })
                    }
                }
            } catch (error) {
                console.error('开始课堂失败:', error)
                this.$message.error('开始课堂失败，请重试')
            }
        },

        // 结束课堂
        endClassroom () {
            this.$confirm({
                title: '确认结束课堂',
                content: '确定要结束本次课堂吗？结束后学生将无法继续访问，30分钟后课堂将自动归档为历史记录。',
                onOk: async () => {
                    try {
                        const classroomId = this.getCurrentClassroomId()
                        const classroomViewState = this.buildClassroomViewStatePayload()
                        await this.$http.post(
                            `/teaching/classroom/classrooms/${classroomId}/end`,
                            {
                                demoContent: Object.prototype.hasOwnProperty.call(classroomViewState || {}, 'content')
                                    ? classroomViewState.content
                                    : undefined,
                                demoLanguage: classroomViewState ? classroomViewState.language : ''
                            },
                            {
                                retry: 0,
                                retryDelay: 0
                            }
                        )

                        this.$message.success('课堂已结束，30分钟后将自动归档')
                        this.demoSaved = true

                        this.classroomInfo.status = 'ended'

                        if (this.socket) {
                            this.socket.emit('classroom-ended', {
                                classroomId: classroomId,
                                message: '教师已结束本次课堂，感谢大家的参与！'
                            })
                        }
                    } catch (error) {
                        console.error('结束课堂失败:', error)
                        this.$message.error('结束课堂失败，请重试')
                    }
                }
            })
        },

        // 退出课堂
        exitClassroom () {
            this.$confirm({
                title: '确认退出',
                content: '确定要退出课堂吗？未保存的作品将会丢失。',
                onOk: async () => {
                    this.isExitingClassroom = true

                    if (this.isTeacher) {
                        await this.persistClassroomViewState({ silent: true })
                    }

                    if (this.isStudent && !this.isReplayMode) {
                        await this.leaveStudentClassroom({ silent: true })
                    }

                    if (this.socket) {
                        this.socket.emit('leave-classroom', {
                            classroomId: this.getCurrentClassroomId()
                        })
                        this.isIntentionalSocketClose = true
                        this.socketConnectionStatus = 'disconnected'
                        this.socket.disconnect()
                    }

                    this.returnToClassroomList()
                }
            })
        },

        // 获取学生状态颜色
        getStatusColor (status) {
            const colors = {
                idle: 'default',
                coding: 'processing',
                completed: 'success',
                need_help: 'error'
            }
            return colors[status] || 'default'
        },

        // 获取学生状态文本
        getStatusText (status) {
            const texts = {
                idle: '空闲',
                coding: '编程中',
                completed: '已完成',
                need_help: '需要帮助'
            }
            return texts[status] || '未知'
        },

        // 格式化时间
        formatTime (time) {
            return new Date(time).toLocaleTimeString()
        },

        // Scratch加载完成
        onScratchLoad () {
        },

        // WebSocket事件处理
        onStudentJoined (data) {
            console.log('📥 [Socket] 收到student-joined事件:', data)

            // ✅ 只有学生才加入学生列表，教师不加入
            if (data.userRole && data.userRole !== 'student') {
                console.log('👨‍🏫 [Teacher] 教师加入课堂，不加入学生列表，角色:', data.userRole)
                return
            }

            // 检查学生是否已存在
            const studentId = data.userId || (data.student && data.student.id)
            const studentName = data.userName || (data.student && data.student.name) || '未知用户'

            console.log('👤 [Student] 处理学生数据:', { studentId, studentName, userRole: data.userRole })

            if (!studentId) {
                console.warn('⚠️ [Student] 学生ID为空，忽略')
                return
            }

            const exists = this.onlineStudents.find(s => s.id === studentId)
            if (!exists) {
                this.onlineStudents.push({
                    id: studentId,
                    name: studentName,
                    status: 'idle',
                    needHelp: false,
                    avatar: null
                })
                console.log('✅ [Student] 学生已加入列表:', studentName, '当前学生数:', this.onlineStudents.length)
                if (this.isTeacher) {
                    this.$message.info(`${studentName} 加入了课堂`)
                }
            } else {
                console.log('ℹ️ [Student] 学生已在列表中:', studentName)
            }
        },

        onStudentLeft (data) {
            const studentId = data.userId || data.studentId
            if (!studentId) return

            const index = this.onlineStudents.findIndex(s => s.id === studentId)
            if (index !== -1) {
                const student = this.onlineStudents[index]
                this.onlineStudents.splice(index, 1)
                this.$message.info(`${student.name} 离开了课堂`)
            }
        },

        onStudentStatusUpdated (data) {
            const student = this.onlineStudents.find(s => s.id === data.studentId)
            if (student) {
                student.status = data.status
                student.needHelp = data.needHelp
                if (this.isTeacher && data.needHelp) {
                    this.$message.warning(`${student.name} 需要帮助!`)
                }
            }
        },

        onBroadcastStarted (data) {
            if (!this.isStudent) return

            console.log('📺 [Student] 收到广播:', data)
            this.teacherBroadcast = data

            // ✅ 强制切换到教师的演示内容
            if (data.type === 'ppt' && data.pptData) {
                // PPT演示
                this.selectedLanguage = 'ppt'
                this.currentPPT = data.pptData
                this.currentSlide = data.currentSlide || 1
                console.log('📊 [Student] 切换到PPT演示')
                if (!data.isUpdate) {
                    this.$message.info('教师已开始PPT演示')
                }
            } else if (data.type === 'code' && data.code !== undefined) {
                // 代码演示
                this.selectedLanguage = data.language
                this.currentCode = data.code
                console.log(`💻 [Student] 切换到${data.language}代码演示`)
                if (!data.isUpdate) {
                    this.$message.info(`教师已开始${data.language}代码演示`)
                }
            } else if (data.type === 'ai_package' || data.language === 'ai_package') {
                this.selectedLanguage = 'ai_package'
                this.currentCode = ''
                if (data.resourceInfo && data.resourceInfo.id) {
                    this.resourceInfo = {
                        ...(this.resourceInfo || {}),
                        ...data.resourceInfo
                    }
                } else if (data.resourceId) {
                    this.resourceInfo = {
                        ...(this.resourceInfo || {}),
                        id: data.resourceId,
                        name: data.resourceName || this.aiResourceDisplayName
                    }
                }
                console.log('🤖 [Student] 切换到AI课堂资源')
                if (!data.isUpdate) {
                    this.$message.info('教师已切换到 AI 课堂资源')
                }
            } else if (data.type === 'scratch') {
                // Scratch演示
                this.selectedLanguage = 'scratch'
                if (data.scratchUrl) {
                    this.scratchProjectId = this.extractScratchProjectId(data.scratchUrl)
                }
                console.log('🎮 [Student] 切换到Scratch演示')
                if (!data.isUpdate) {
                    this.$message.info('教师已开始Scratch演示')
                }
            }
        },

        onCodeUpdated (data) {
            if (this.isStudent && this.isCodeLanguage(this.selectedLanguage)) {
                this.teacherBroadcast.code = data.code
                this.currentCode = data.code
                console.log('💻 [Student] 代码已同步')
            }
        },

        async onChatMessage (message) {
            // 避免重复添加自己发送的消息
            const exists = this.chatMessages.find(m => m.id === message.id)
            if (!exists) {
                // 如果是文件消息，生成下载URL
                if (message.type === 'file') {
                    const fileKey = message.fileKey || message.fileUrl
                    if (fileKey) {
                        const classroomId = this.getCurrentClassroomId()
                        message.fileUrl = await this.resolveFileDownloadUrl(classroomId, fileKey)
                        message.fileKey = fileKey
                    } else if (message.fileData) {
                        // 旧格式：Base64数据（向后兼容）
                        message.fileUrl = message.fileData
                    }
                }
                this.chatMessages.push(message)
                this.$nextTick(() => {
                    this.scrollToBottom()
                })
            }
        },

        // 加载聊天历史记录
        async loadChatHistory () {
            try {
                const classroomId = this.getCurrentClassroomId()
                if (!classroomId) {
                    console.warn('[CHAT] 无法加载聊天记录：缺少课堂ID')
                    return
                }

                console.log('[CHAT] 开始加载聊天历史记录，课堂ID:', classroomId)

                const response = await this.$http.get(`/teaching/classroom/${classroomId}/chat-history`, {
                    params: { pageNo: 1, pageSize: 100 }
                })

                const data = response.data || response

                if (data.success && data.result && data.result.records) {
                    // 转换后端数据格式
                    this.chatMessages = await Promise.all(data.result.records.map(async msg => {
                        const message = {
                            id: msg.id,
                            senderId: msg.userId,
                            senderName: msg.userName,
                            sender: {
                                id: msg.userId,
                                name: msg.userName,
                                avatar: msg.avatar
                            },
                            type: msg.type || 'text',
                            content: msg.content,
                            timestamp: msg.timestamp,
                            time: new Date(msg.timestamp).getTime()
                        }

                        // 处理文件消息
                        if (msg.type === 'file') {
                            message.fileName = msg.fileName || msg.content
                            message.fileSize = msg.fileSize
                            message.fileType = msg.fileType
                            message.fileKey = msg.fileKey || msg.fileUrl

                            // 如果有fileKey，生成签名下载URL
                            if (message.fileKey) {
                                message.fileUrl = await this.resolveFileDownloadUrl(classroomId, message.fileKey)
                            }
                        }

                        return message
                    }))

                    console.log('[CHAT] ✅ 加载聊天历史记录成功:', this.chatMessages.length, '条')

                    this.$nextTick(() => {
                        this.scrollToBottom()
                    })
                } else {
                    console.log('[CHAT] 没有历史聊天记录')
                }
            } catch (error) {
                console.error('[CHAT] ❌ 加载聊天历史记录失败:', error)
                // 失败时不影响其他功能
            }
        },

        // 加载展示区历史内容
        async loadDemoContent () {
            try {
                const classroomId = this.getCurrentClassroomId()
                if (!classroomId) {
                    return
                }

                console.log('[DEMO] 开始加载展示区内容，课堂ID:', classroomId)

                const response = await this.$http.get(`/teaching/classroom/${classroomId}/demo-content`)
                const data = response.data || response

                if (data.success && data.result) {
                    const selectedLanguage = this.normalizeDemoLanguage(
                        data.result.selectedLanguage || this.classroomInfo.selectedLanguage || this.selectedLanguage || ''
                    ) || 'python'
                    const contentLanguage = this.normalizeDemoLanguage(data.result.language || '')
                    const content = typeof data.result.content === 'string' ? data.result.content : ''

                    this.selectedLanguage = selectedLanguage
                    this.classroomInfo.selectedLanguage = selectedLanguage

                    if (this.isCodeLanguage(contentLanguage)) {
                        this.savedCodes[contentLanguage] = content
                    }

                    this.currentCode = this.isCodeLanguage(selectedLanguage)
                        ? (selectedLanguage === contentLanguage ? content : (this.savedCodes[selectedLanguage] || ''))
                        : ''
                    this.demoSaved = true

                    console.log('[DEMO] load state success:', {
                        selectedLanguage,
                        contentLanguage: contentLanguage || 'none',
                        hasContent: Boolean(content)
                    })
                }
            } catch (error) {
                console.error('[DEMO] ❌ 加载展示区内容失败:', error)
                // 失败时不影响其他功能
            }
        },

        // 手动保存展示区内容
        async manualSaveDemo () {
            await this.saveDemoContent()
        },

        buildClassroomViewStatePayload () {
            const language = this.normalizeDemoLanguage(this.selectedLanguage || this.classroomInfo.selectedLanguage || '')
            if (!language) {
                return null
            }

            const payload = { language }
            if (this.isCodeLanguage(language)) {
                payload.content = String(this.currentCode || '')
            }

            return payload
        },

        buildLatestDemoSnapshot () {
            const snapshots = []

            if (this.isCodeLanguage(this.selectedLanguage)) {
                snapshots.push({
                    language: this.selectedLanguage,
                    content: this.currentCode
                })
            }

            Object.keys(this.savedCodes || {}).forEach((language) => {
                if (this.isCodeLanguage(language)) {
                    snapshots.push({
                        language,
                        content: this.savedCodes[language]
                    })
                }
            })

            const latestSnapshot = snapshots.find(item => String(item.content || '').trim())
            if (!latestSnapshot) {
                return null
            }

            return {
                language: latestSnapshot.language || 'python',
                content: String(latestSnapshot.content || '')
            }
        },

        async persistClassroomViewState (options = {}) {
            const classroomId = this.getCurrentClassroomId()
            const payload = this.buildClassroomViewStatePayload()

            if (!classroomId || !payload) {
                return null
            }

            try {
                await this.$http.post(`/teaching/classroom/${classroomId}/demo-content`, payload, {
                    retry: 0,
                    retryDelay: 0
                })
                this.classroomInfo.selectedLanguage = payload.language
                this.demoSaved = true
                return payload
            } catch (error) {
                if (!options.silent) {
                    throw error
                }
                return null
            }
        },

        async persistDemoSnapshot (snapshot = this.buildLatestDemoSnapshot()) {
            const classroomId = this.getCurrentClassroomId()
            if (!classroomId || !snapshot || !this.isCodeLanguage(snapshot.language)) {
                return null
            }

            await this.$http.post(
                `/teaching/classroom/${classroomId}/demo-content`,
                {
                    content: snapshot.content,
                    language: snapshot.language
                },
                {
                    retry: 0,
                    retryDelay: 0
                }
            )

            this.demoSaved = true
            return snapshot
        },

        // 保存展示区内容
        async saveDemoContent () {
            try {
                const classroomId = this.getCurrentClassroomId()
                const payload = this.buildClassroomViewStatePayload()
                if (!classroomId || !payload) {
                    return
                }

                console.log('[DEMO] 保存展示区内容，课堂ID:', classroomId)
                this.savingDemo = true

                await this.persistClassroomViewState()
                this.demoSaved = true
                this.savingDemo = false
                console.log('[DEMO] ✅ 展示区内容保存成功')
            } catch (error) {
                console.error('[DEMO] ❌ 保存展示区内容失败:', error)
                this.savingDemo = false
                this.$message.error('保存失败，请重试')
            }
        },

        // PPT相关方法
        uploadPPT () {
            this.pptForm = {
                name: '',
                description: ''
            }
            this.pptFileList = []
            this.pptUploadVisible = true
        },

        beforePPTUpload () {
            return false // 阻止自动上传
        },

        handlePPTUpload (info) {
            this.pptFileList = info.fileList.slice(-1) // 只保留最新的文件
            if (this.pptFileList.length > 0) {
                const file = this.pptFileList[0]
                if (!this.pptForm.name) {
                    this.pptForm.name = file.name.replace(/\.[^/.]+$/, '')
                }
            }
        },

        async confirmPPTUpload () {
            if (this.pptFileList.length === 0) {
                this.$message.error('请选择PPT文件')
                return
            }

            if (!this.pptForm.name) {
                this.$message.error('请输入PPT名称')
                return
            }

            const hide = this.$message.loading('正在上传PPT文件...', 0)

            try {
                const file = this.pptFileList[0].originFileObj || this.pptFileList[0]

                // 创建FormData上传文件
                const formData = new FormData()
                formData.append('file', file)
                formData.append('name', this.pptForm.name)
                formData.append('description', this.pptForm.description || '')
                formData.append('classroomId', this.classroomInfo.id)

                // 上传文件到服务器
                const uploadRes = await this.$http.post('/sys/common/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                })
                const uploadData = uploadRes.data || uploadRes

                if (uploadData.success) {
                    const fileUrl = uploadData.message || uploadData.result

                    // 生成Office Web Viewer URL（国内可访问）
                    const baseUrl = window.location.origin
                    const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${baseUrl}${fileUrl}`
                    const viewUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`

                    this.currentPPT = {
                        file: true,
                        name: this.pptForm.name,
                        totalSlides: 1, // 默认1页，实际可能需要解析PDF
                        embedUrl: viewUrl,
                        viewUrl: viewUrl,
                        rawUrl: fullUrl,
                        slideImages: []
                    }

                    this.currentSlide = 1
                    this.pptUploadVisible = false

                    hide()
                    this.$message.success('PPT上传成功')

                    console.log('✅ [PPT] 上传成功:', {
                        name: this.currentPPT.name,
                        rawUrl: fullUrl,
                        viewUrl: viewUrl
                    })

                    // 如果正在广播，同步PPT到学生端
                    if (this.broadcasting) {
                        this.broadcastPPT()
                    }
                } else {
                    hide()
                    this.$message.error('PPT上传失败: ' + (uploadData.message || '未知错误'))
                }
            } catch (error) {
                hide()
                console.error('PPT上传失败:', error)
                this.$message.error('PPT上传失败，请重试')
            }
        },

        broadcastPPT () {
            if (this.socket && this.currentPPT.file) {
                this.socket.emit('broadcast-ppt', {
                    pptData: this.currentPPT,
                    currentSlide: this.currentSlide
                })
            }
        },

        previousSlide () {
            if (this.currentSlide > 1) {
                this.currentSlide--
                if (this.broadcasting) {
                    this.broadcastSlideChange()
                }
            }
        },

        nextSlide () {
            if (this.currentSlide < this.currentPPT.totalSlides) {
                this.currentSlide++
                if (this.broadcasting) {
                    this.broadcastSlideChange()
                }
            }
        },

        broadcastSlideChange () {
            if (this.socket) {
                this.socket.emit('broadcast-slide-change', {
                    currentSlide: this.currentSlide
                })
            }
        },

        // 在新窗口打开PPT预览
        openPPTPreview () {
            if (this.currentPPT && this.currentPPT.viewUrl) {
                window.open(this.currentPPT.viewUrl, '_blank')
            }
        },

        // 下载PPT文件
        downloadPPT () {
            if (this.currentPPT && this.currentPPT.rawUrl) {
                window.open(this.currentPPT.rawUrl, '_blank')
            }
        },

        // 作品管理相关方法
        loadWork () {
            this.selectedWork = null
            this.workFilter = {
                type: '',
                status: '',
                keyword: ''
            }
            this.loadWorkVisible = true
        },

        selectWork (work) {
            this.selectedWork = work
        },

        confirmLoadWork () {
            if (!this.selectedWork) {
                this.$message.error('请选择要打开的作品')
                return
            }

            // 加载作品内容
            this.selectedLanguage = this.selectedWork.language
            if (this.selectedWork.language === 'scratch' && this.selectedWork.scratchProjectId) {
                this.scratchProjectId = this.selectedWork.scratchProjectId
            } else {
                this.currentCode = this.selectedWork.code || this.getTemplateCode(this.selectedWork.language)
            }

            this.loadWorkVisible = false
            this.$message.success(`作品"${this.selectedWork.name}"已加载`)
        },

        filterWorks () {
            // 触发计算属性重新计算
            this.$forceUpdate()
        },

        getLanguageIcon (language) {
            const icons = {
                scratch: 'play-circle',
                python: 'code',
                javascript: 'code',
                html: 'file-text'
            }
            return icons[language] || 'file'
        },

        getWorkStatusColor (status) {
            const colors = {
                draft: 'default',
                share: 'blue',
                public: 'green'
            }
            return colors[status] || 'default'
        },

        getWorkStatusText (status) {
            const texts = {
                draft: '草稿',
                share: '已分享',
                public: '已公开'
            }
            return texts[status] || '未知'
        },

        // ========== 课堂笔记相关方法 ==========

        // 加载课堂笔记
        async loadClassroomNotes () {
            if (!this.isStudent) return

            try {
                const classroomId = this.getCurrentClassroomId()
                const userId = this.userInfo.id || this.userInfo.username

                console.log('📝 [NOTES] 加载笔记:', { classroomId, userId })

                const response = await this.$http.get(`/teaching/classroom/notes/${classroomId}`)
                const data = response.data || response

                if (data.success && data.result) {
                    this.classroomNotes = data.result.content || ''
                    this.lastSaveTime = data.result.updateTime ? new Date(data.result.updateTime) : null
                    this.notesChanged = false
                    console.log('✅ [NOTES] 笔记加载成功')
                } else {
                    console.log('ℹ️ [NOTES] 暂无笔记记录')
                }
            } catch (error) {
                console.error('❌ [NOTES] 加载笔记失败:', error)
                // 失败不提示用户，保持静默
            }
        },

        // 保存课堂笔记
        async saveNotes () {
            if (!this.isStudent) return

            this.savingNotes = true

            try {
                const classroomId = this.getCurrentClassroomId()
                const userId = this.userInfo.id || this.userInfo.username

                console.log('💾 [NOTES] 保存笔记:', { classroomId, userId, length: this.classroomNotes.length })

                const response = await this.$http.post('/teaching/classroom/notes', {
                    classroomId: classroomId,
                    content: this.classroomNotes,
                    studentId: userId
                })
                const data = response.data || response

                if (data.success) {
                    this.lastSaveTime = new Date()
                    this.notesChanged = false
                    this.$message.success('笔记保存成功')
                    console.log('✅ [NOTES] 笔记保存成功')
                } else {
                    this.$message.error('笔记保存失败: ' + (data.message || '未知错误'))
                }
            } catch (error) {
                console.error('❌ [NOTES] 保存笔记失败:', error)
                this.$message.error('笔记保存失败，请重试')
            } finally {
                this.savingNotes = false
            }
        },

        // 笔记内容变化
        onNotesChange () {
            this.notesChanged = true

            // 清除之前的自动保存定时器
            if (this.notesAutoSaveTimer) {
                clearTimeout(this.notesAutoSaveTimer)
            }

            // 30秒后自动保存
            this.notesAutoSaveTimer = setTimeout(() => {
                if (this.notesChanged && this.classroomNotes) {
                    console.log('🔄 [NOTES] 自动保存笔记')
                    this.saveNotes()
                }
            }, 30000)
        }
    }
}
</script>

<style scoped lang="less">
.online-classroom {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  padding-bottom: 20px;

  .classroom-header {
    margin-bottom: 16px;
    flex-shrink: 0;

    h2 {
      margin: 0;
      color: #1890ff;

      .anticon {
        margin-right: 8px;
      }
    }

    p {
      margin: 8px 0 0 0;
      color: #666;

      .connection-status-tag {
        margin-right: 8px;
      }

      span {
        margin-right: 16px;
      }
    }
  }

  .socket-status-alert {
    margin-bottom: 16px;
  }

  .classroom-content {
    flex: 1;
    overflow: visible;

    .programming-area {
      height: auto;
      min-height: 400px;

      .scratch-area, .code-area, .ai-package-area {
        height: 100%;
      }

      .scratch-project {
        h4 {
          margin-bottom: 8px;
          color: #1890ff;
        }
      }
    }

    .broadcast-viewer {
      .teacher-screen {
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        overflow: hidden;

        .broadcast-info {
          padding: 8px;
          background: #f0f2f5;
          text-align: center;
        }
      }
    }

    .students-list {
      max-height: 200px;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 4px;
      border: 1px solid #f0f0f0;
      border-radius: 4px;
      background: #fafafa;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-thumb {
        background: #d9d9d9;
        border-radius: 3px;
      }

      .student-item {
        display: flex;
        align-items: center;
        padding: 10px 8px;
        margin-bottom: 4px;
        border-radius: 4px;
        background: white;
        border-bottom: none;
        transition: background 0.3s;

        &:hover {
          background: #f5f5f5;
        }

        &:last-child {
          margin-bottom: 0;
        }

        .student-name {
          flex: 1;
          margin-left: 8px;
          font-size: 13px;
          font-weight: 500;
        }

        .student-status {
          display: flex;
          align-items: center;
          gap: 4px;
        }
      }
    }

    // 学生操作按钮样式(现在在左侧卡片底部)
    .student-action-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .chat-messages {
      flex: 1;
      height: 300px;
      max-height: 300px;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 8px;
      margin-bottom: 12px;
      border: 1px solid #f0f0f0;
      border-radius: 4px;
      background: #fafafa;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-thumb {
        background: #d9d9d9;
        border-radius: 3px;
      }

      &::-webkit-scrollbar-track {
        background: #f0f0f0;
      }

      .empty-chat {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
      }

      .chat-message {
        margin-bottom: 12px;
        padding: 10px;
        background: white;
        border-radius: 6px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        transition: box-shadow 0.3s;

        &:hover {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        }

        &:last-child {
          margin-bottom: 0;
        }

        .message-header {
          display: flex;
          align-items: center;
          margin-bottom: 6px;

          .sender-name {
            margin-left: 8px;
            font-weight: 600;
            font-size: 13px;
            color: #333;
          }

          .message-time {
            margin-left: auto;
            font-size: 10px;
            color: #999;
          }
        }

        .message-content {
          margin-left: 32px;
          font-size: 14px;
          color: #333;
          line-height: 1.5;
          word-wrap: break-word;

          .file-link {
            color: #1890ff;
            text-decoration: none;
            font-weight: 500;

            &:hover {
              text-decoration: underline;
            }
          }

          .file-size {
            margin-left: 8px;
            color: #999;
            font-size: 12px;
          }
        }
      }
    }

    .chat-input {
      display: flex;
      align-items: center;
      gap: 8px;

      .ant-input {
        border-radius: 16px;
      }
    }
  }

  .toolbar {
    display: flex;
    align-items: center;
  }

  // PPT展示区域样式
  .ppt-area {
    height: 100%;

    .ppt-viewer {
      height: 100%;
      display: flex;
      flex-direction: column;

      .ppt-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding: 8px 12px;
        background: #f0f2f5;
        border-radius: 4px;

        h4 {
          margin: 0;
          color: #1890ff;
        }
      }

      .ppt-content {
        flex: 1;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        overflow: hidden;

        .ppt-preview {
          height: 450px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fa;

          .no-preview {
            text-align: center;
            color: #999;

            p {
              margin-top: 8px;
            }
          }
        }
      }
    }

    .no-ppt {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  // 作品加载相关样式
  .work-list {
    .works-grid {
      max-height: 400px;
      overflow-y: auto;

      .selected-work {
        border-color: #1890ff;
        box-shadow: 0 0 8px rgba(24, 144, 255, 0.3);
      }

      .work-preview {
        text-align: center;
        padding: 16px 0;
        background: #f8f9fa;
        margin-bottom: 8px;
        border-radius: 4px;
      }

      .work-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 8px;

        .work-time {
          font-size: 12px;
          color: #999;
        }
      }
    }
  }

  // 创作工具区域样式
  .editor-buttons-container {
    .editor-button-card {
      text-align: center;
      padding: 20px 16px;
      border: 2px solid #f0f0f0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      background: #fafafa;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
        border-color: #1890ff;
      }

      .editor-icon {
        margin-bottom: 12px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      h3 {
        margin: 8px 0;
        font-size: 16px;
        color: #333;
        font-weight: 600;
      }

      p {
        color: #666;
        font-size: 13px;
        margin: 0 0 16px 0;
        min-height: 20px;
      }

      &.scratchjr {
        background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
        border-color: #91d5ff;

        &:hover {
          border-color: #40a9ff;
          box-shadow: 0 6px 20px rgba(64, 169, 255, 0.2);
        }
      }

      &.scratch {
        background: linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%);
        border-color: #ffd591;

        &:hover {
          border-color: #ffa940;
          box-shadow: 0 6px 20px rgba(255, 169, 64, 0.2);
        }
      }

      &.python {
        background: linear-gradient(135deg, #fff0f6 0%, #ffccc7 100%);
        border-color: #ffa39e;

        &:hover {
          border-color: #ff7875;
          box-shadow: 0 6px 20px rgba(255, 120, 117, 0.2);
        }
      }

      &.ai-classroom {
        background: linear-gradient(135deg, #eef4ff 0%, #d6e4ff 100%);
        border-color: #adc6ff;

        &:hover {
          border-color: #597ef7;
          box-shadow: 0 6px 20px rgba(89, 126, 247, 0.2);
        }
      }
    }
  }
}

// 投影仪模式样式
:global(.projector-mode) {
  .online-classroom {
    .programming-area {
      font-size: 16px;

      .ant-card-head-title {
        font-size: 20px;
        font-weight: 600;
      }
    }

    .ppt-content {
      font-size: 18px;
    }

    .students-list {
      .student-name {
        font-size: 16px;
      }
    }

    .chat-messages {
      .message-content {
        font-size: 16px;
      }
    }
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .online-classroom {
    .classroom-content {
      .ant-col:first-child {
        margin-bottom: 16px;
      }
    }
  }
}

// 笔记区样式
.notes-area {
  .notes-info {
    margin-top: 12px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  /deep/ .ant-input {
    border-radius: 4px;

    &:focus {
      border-color: #40a9ff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
    }
  }
}
</style>
