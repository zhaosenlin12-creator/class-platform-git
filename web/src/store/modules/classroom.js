import Vue from 'vue'

// 初始状态
const getDefaultState = () => {
    return {
    // 课堂基本信息
        session: {
            id: null,
            courseId: null,
            teacherId: null,
            title: '',
            status: 'inactive', // inactive, preparing, active, paused, ended
            startTime: null,
            endTime: null,
            participants: []
        },

        // 实时连接状态
        connection: {
            isConnected: false,
            reconnectAttempts: 0,
            maxReconnectAttempts: 5,
            socket: null,
            lastPing: null
        },

        // 参与者管理
        participants: {
            online: [],
            offline: [],
            total: 0,
            teachers: [],
            students: []
        },

        // 课堂互动
        interactions: {
            // 举手发言
            handsUp: [],
            // 实时问答
            qa: {
                current: null,
                history: [],
                responses: []
            },
            // 投票
            polls: {
                current: null,
                history: [],
                results: {}
            },
            // 弹幕/消息
            messages: [],
            // 白板状态
            whiteboard: {
                isActive: false,
                currentPage: 1,
                totalPages: 1,
                content: null
            }
        },

        // 屏幕共享
        screenShare: {
            isSharing: false,
            sharerInfo: null,
            viewerCount: 0
        },

        // 音视频状态
        media: {
            // 本地媒体状态
            local: {
                video: false,
                audio: false,
                screenShare: false
            },
            // 远程媒体状态
            remote: {},
            // 媒体设备
            devices: {
                cameras: [],
                microphones: [],
                speakers: []
            }
        },

        // 课堂控制
        controls: {
            // 权限设置
            permissions: {
                studentCanUnmute: true,
                studentCanShare: false,
                studentCanUseWhiteboard: false
            },
            // 课堂模式
            mode: 'lecture', // lecture, discussion, group_work, presentation
            // 静音控制
            muteAll: false,
            // 锁定课堂
            isLocked: false
        },

        // 课堂记录
        recording: {
            isRecording: false,
            startTime: null,
            duration: 0,
            recordId: null
        },

        // 同步状态
        sync: {
            lastSyncTime: null,
            pendingUpdates: [],
            conflictResolution: 'teacher_priority' // teacher_priority, latest_wins, manual
        },

        // 错误和通知
        notifications: [],
        errors: {}
    }
}

const classroom = {
    namespaced: true,

    state: getDefaultState(),

    mutations: {
    // 重置状态
        RESET_STATE: (state) => {
            // 保留连接信息，重置其他状态
            const connection = state.connection
            Object.assign(state, getDefaultState())
            state.connection = connection
        },

        // 课堂会话管理
        SET_SESSION: (state, session) => {
            state.session = { ...state.session, ...session }
        },
        UPDATE_SESSION_STATUS: (state, status) => {
            state.session.status = status
            if (status === 'active' && !state.session.startTime) {
                state.session.startTime = new Date()
            }
            if (status === 'ended' && !state.session.endTime) {
                state.session.endTime = new Date()
            }
        },

        // 连接状态管理
        SET_CONNECTION_STATUS: (state, isConnected) => {
            state.connection.isConnected = isConnected
            if (isConnected) {
                state.connection.reconnectAttempts = 0
            }
        },
        SET_SOCKET: (state, socket) => {
            state.connection.socket = socket
        },
        INCREMENT_RECONNECT_ATTEMPTS: (state) => {
            state.connection.reconnectAttempts++
        },
        UPDATE_LAST_PING: (state) => {
            state.connection.lastPing = Date.now()
        },

        // 参与者管理
        SET_PARTICIPANTS: (state, participants) => {
            state.participants.online = participants.filter(p => p.online)
            state.participants.offline = participants.filter(p => !p.online)
            state.participants.total = participants.length
            state.participants.teachers = participants.filter(p => p.role === 'teacher')
            state.participants.students = participants.filter(p => p.role === 'student')
            state.session.participants = participants
        },
        ADD_PARTICIPANT: (state, participant) => {
            const existing = state.session.participants.findIndex(p => p.id === participant.id)
            if (existing !== -1) {
                Vue.set(state.session.participants, existing, participant)
            } else {
                state.session.participants.push(participant)
            }
            // 更新分类列表
            const participants = state.session.participants
            state.participants.online = participants.filter(p => p.online)
            state.participants.offline = participants.filter(p => !p.online)
            state.participants.total = participants.length
            state.participants.teachers = participants.filter(p => p.role === 'teacher')
            state.participants.students = participants.filter(p => p.role === 'student')
        },
        REMOVE_PARTICIPANT: (state, participantId) => {
            state.session.participants = state.session.participants.filter(p => p.id !== participantId)
            // 同步更新分类
            const participants = state.session.participants
            state.participants.online = participants.filter(p => p.online)
            state.participants.offline = participants.filter(p => !p.online)
            state.participants.total = participants.length
        },
        UPDATE_PARTICIPANT_STATUS: (state, { participantId, online }) => {
            const participant = state.session.participants.find(p => p.id === participantId)
            if (participant) {
                participant.online = online
                // 重新分类
                const participants = state.session.participants
                state.participants.online = participants.filter(p => p.online)
                state.participants.offline = participants.filter(p => !p.online)
            }
        },

        // 交互功能
        ADD_HAND_UP: (state, { participantId, timestamp = Date.now() }) => {
            if (!state.interactions.handsUp.find(h => h.participantId === participantId)) {
                state.interactions.handsUp.push({ participantId, timestamp })
            }
        },
        REMOVE_HAND_UP: (state, participantId) => {
            state.interactions.handsUp = state.interactions.handsUp.filter(h => h.participantId !== participantId)
        },
        CLEAR_HANDS_UP: (state) => {
            state.interactions.handsUp = []
        },

        // 实时问答
        SET_CURRENT_QA: (state, qa) => {
            state.interactions.qa.current = qa
        },
        ADD_QA_RESPONSE: (state, response) => {
            state.interactions.qa.responses.push(response)
        },
        FINISH_QA: (state) => {
            if (state.interactions.qa.current) {
                state.interactions.qa.history.push({
                    ...state.interactions.qa.current,
                    responses: [...state.interactions.qa.responses],
                    endTime: Date.now()
                })
            }
            state.interactions.qa.current = null
            state.interactions.qa.responses = []
        },

        // 投票管理
        SET_CURRENT_POLL: (state, poll) => {
            state.interactions.polls.current = poll
        },
        UPDATE_POLL_RESULTS: (state, results) => {
            if (state.interactions.polls.current) {
                Vue.set(state.interactions.polls.results, state.interactions.polls.current.id, results)
            }
        },
        FINISH_POLL: (state) => {
            if (state.interactions.polls.current) {
                state.interactions.polls.history.push({
                    ...state.interactions.polls.current,
                    results: state.interactions.polls.results[state.interactions.polls.current.id],
                    endTime: Date.now()
                })
            }
            state.interactions.polls.current = null
        },

        // 消息管理
        ADD_MESSAGE: (state, message) => {
            state.interactions.messages.push({
                ...message,
                id: message.id || Date.now() + Math.random(),
                timestamp: message.timestamp || Date.now()
            })
            // 保持消息数量在合理范围内
            if (state.interactions.messages.length > 200) {
                state.interactions.messages = state.interactions.messages.slice(-150)
            }
        },
        CLEAR_MESSAGES: (state) => {
            state.interactions.messages = []
        },

        // 白板状态
        UPDATE_WHITEBOARD: (state, whiteboardData) => {
            state.interactions.whiteboard = { ...state.interactions.whiteboard, ...whiteboardData }
        },

        // 屏幕共享
        SET_SCREEN_SHARE: (state, { isSharing, sharerInfo = null }) => {
            state.screenShare.isSharing = isSharing
            state.screenShare.sharerInfo = sharerInfo
        },
        UPDATE_SCREEN_SHARE_VIEWERS: (state, count) => {
            state.screenShare.viewerCount = count
        },

        // 媒体状态管理
        SET_LOCAL_MEDIA: (state, { video, audio, screenShare }) => {
            if (video !== undefined) state.media.local.video = video
            if (audio !== undefined) state.media.local.audio = audio
            if (screenShare !== undefined) state.media.local.screenShare = screenShare
        },
        SET_REMOTE_MEDIA: (state, { participantId, mediaState }) => {
            Vue.set(state.media.remote, participantId, mediaState)
        },
        REMOVE_REMOTE_MEDIA: (state, participantId) => {
            Vue.delete(state.media.remote, participantId)
        },
        SET_MEDIA_DEVICES: (state, devices) => {
            state.media.devices = devices
        },

        // 课堂控制
        UPDATE_PERMISSIONS: (state, permissions) => {
            state.controls.permissions = { ...state.controls.permissions, ...permissions }
        },
        SET_CLASSROOM_MODE: (state, mode) => {
            state.controls.mode = mode
        },
        SET_MUTE_ALL: (state, muted) => {
            state.controls.muteAll = muted
        },
        SET_CLASSROOM_LOCK: (state, locked) => {
            state.controls.isLocked = locked
        },

        // 录制状态
        SET_RECORDING: (state, { isRecording, recordId = null }) => {
            state.recording.isRecording = isRecording
            if (isRecording) {
                state.recording.startTime = Date.now()
                state.recording.recordId = recordId
            } else {
                state.recording.startTime = null
                state.recording.recordId = null
            }
        },
        UPDATE_RECORDING_DURATION: (state, duration) => {
            state.recording.duration = duration
        },

        // 同步管理
        UPDATE_SYNC_TIME: (state) => {
            state.sync.lastSyncTime = Date.now()
        },
        ADD_PENDING_UPDATE: (state, update) => {
            state.sync.pendingUpdates.push(update)
        },
        CLEAR_PENDING_UPDATES: (state) => {
            state.sync.pendingUpdates = []
        },

        // 通知和错误
        ADD_NOTIFICATION: (state, notification) => {
            state.notifications.push({
                ...notification,
                id: notification.id || Date.now() + Math.random(),
                timestamp: notification.timestamp || Date.now()
            })
        },
        REMOVE_NOTIFICATION: (state, notificationId) => {
            state.notifications = state.notifications.filter(n => n.id !== notificationId)
        },
        SET_ERROR: (state, { key, error }) => {
            Vue.set(state.errors, key, error)
        },
        CLEAR_ERROR: (state, key) => {
            Vue.delete(state.errors, key)
        }
    },

    actions: {
    // 初始化课堂
        async initClassroom ({ commit, dispatch }, { sessionId, courseId }) {
            try {
                commit('SET_SESSION', { id: sessionId, courseId })

                // 建立WebSocket连接
                await dispatch('connectWebSocket')

                // 获取课堂信息
                await dispatch('fetchClassroomInfo', sessionId)

                // 初始化媒体设备
                await dispatch('initMediaDevices')

                return true
            } catch (error) {
                commit('SET_ERROR', { key: 'init', error: error.message })
                throw error
            }
        },

        // WebSocket连接管理
        connectWebSocket ({ commit, state, dispatch }) {
            return new Promise((resolve, reject) => {
                try {
                    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
                    const wsUrl = `${protocol}//${window.location.host}/ws/classroom/${state.session.id}`

                    const socket = new WebSocket(wsUrl)

                    socket.onopen = () => {
                        commit('SET_CONNECTION_STATUS', true)
                        commit('SET_SOCKET', socket)
                        dispatch('startHeartbeat')
                        resolve(socket)
                    }

                    socket.onmessage = (event) => {
                        dispatch('handleWebSocketMessage', JSON.parse(event.data))
                    }

                    socket.onclose = () => {
                        commit('SET_CONNECTION_STATUS', false)
                        dispatch('handleConnectionLoss')
                    }

                    socket.onerror = (error) => {
                        commit('SET_ERROR', { key: 'websocket', error: error.message })
                        reject(error)
                    }
                } catch (error) {
                    reject(error)
                }
            })
        },

        // 处理WebSocket消息
        handleWebSocketMessage ({ commit, dispatch }, message) {
            const { type, data } = message

            switch (type) {
            case 'participant_joined':
                commit('ADD_PARTICIPANT', data.participant)
                commit('ADD_NOTIFICATION', {
                    type: 'info',
                    message: `${data.participant.name} 加入了课堂`
                })
                break

            case 'participant_left':
                commit('REMOVE_PARTICIPANT', data.participantId)
                commit('ADD_NOTIFICATION', {
                    type: 'info',
                    message: `${data.participantName} 离开了课堂`
                })
                break

            case 'hand_up':
                commit('ADD_HAND_UP', data)
                break

            case 'hand_down':
                commit('REMOVE_HAND_UP', data.participantId)
                break

            case 'message':
                commit('ADD_MESSAGE', data)
                break

            case 'qa_started':
                commit('SET_CURRENT_QA', data.qa)
                break

            case 'qa_response':
                commit('ADD_QA_RESPONSE', data.response)
                break

            case 'poll_started':
                commit('SET_CURRENT_POLL', data.poll)
                break

            case 'poll_results':
                commit('UPDATE_POLL_RESULTS', data.results)
                break

            case 'media_state_changed':
                commit('SET_REMOTE_MEDIA', data)
                break

            case 'whiteboard_update':
                commit('UPDATE_WHITEBOARD', data)
                break

            case 'screen_share_started':
                commit('SET_SCREEN_SHARE', { isSharing: true, sharerInfo: data.sharer })
                break

            case 'screen_share_stopped':
                commit('SET_SCREEN_SHARE', { isSharing: false })
                break

            case 'classroom_locked':
                commit('SET_CLASSROOM_LOCK', data.locked)
                break

            case 'mute_all':
                commit('SET_MUTE_ALL', data.muted)
                break

            case 'sync_update':
                dispatch('handleSyncUpdate', data)
                break

            default:
                console.warn('未知的WebSocket消息类型:', type)
            }

            commit('UPDATE_SYNC_TIME')
        },

        // 发送WebSocket消息
        sendMessage ({ state }, message) {
            if (state.connection.isConnected && state.connection.socket) {
                state.connection.socket.send(JSON.stringify(message))
                return true
            }
            return false
        },

        // 心跳检测
        startHeartbeat ({ commit, dispatch, state }) {
            setInterval(() => {
                if (state.connection.isConnected) {
                    dispatch('sendMessage', { type: 'ping', timestamp: Date.now() })
                    commit('UPDATE_LAST_PING')
                }
            }, 30000) // 每30秒发送一次心跳
        },

        // 处理连接丢失
        async handleConnectionLoss ({ commit, state, dispatch }) {
            if (state.connection.reconnectAttempts < state.connection.maxReconnectAttempts) {
                commit('INCREMENT_RECONNECT_ATTEMPTS')
                commit('ADD_NOTIFICATION', {
                    type: 'warning',
                    message: `连接断开，正在重连... (${state.connection.reconnectAttempts}/${state.connection.maxReconnectAttempts})`
                })

                // 延迟重连
                setTimeout(() => {
                    dispatch('connectWebSocket')
                }, 2000 * state.connection.reconnectAttempts)
            } else {
                commit('ADD_NOTIFICATION', {
                    type: 'error',
                    message: '连接已断开，请刷新页面重试'
                })
            }
        },

        // 举手发言
        raiseHand ({ dispatch }) {
            return dispatch('sendMessage', { type: 'raise_hand' })
        },

        lowerHand ({ dispatch }) {
            return dispatch('sendMessage', { type: 'lower_hand' })
        },

        // 发送消息
        sendChatMessage ({ dispatch }, message) {
            return dispatch('sendMessage', {
                type: 'chat_message',
                data: { content: message }
            })
        },

        // 媒体控制
        toggleLocalVideo ({ commit, dispatch }, enabled) {
            commit('SET_LOCAL_MEDIA', { video: enabled })
            return dispatch('sendMessage', {
                type: 'media_state_change',
                data: { video: enabled }
            })
        },

        toggleLocalAudio ({ commit, dispatch }, enabled) {
            commit('SET_LOCAL_MEDIA', { audio: enabled })
            return dispatch('sendMessage', {
                type: 'media_state_change',
                data: { audio: enabled }
            })
        },

        // 初始化媒体设备
        async initMediaDevices ({ commit }) {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices()
                const cameras = devices.filter(d => d.kind === 'videoinput')
                const microphones = devices.filter(d => d.kind === 'audioinput')
                const speakers = devices.filter(d => d.kind === 'audiooutput')

                commit('SET_MEDIA_DEVICES', { cameras, microphones, speakers })
            } catch (error) {
                commit('SET_ERROR', { key: 'media_devices', error: error.message })
            }
        },

        // 课堂控制
        lockClassroom ({ dispatch }, locked) {
            return dispatch('sendMessage', {
                type: 'lock_classroom',
                data: { locked }
            })
        },

        muteAllStudents ({ dispatch }, muted) {
            return dispatch('sendMessage', {
                type: 'mute_all_students',
                data: { muted }
            })
        },

        // 清理资源
        async leaveClassroom ({ commit, state, dispatch }) {
            // 发送离开消息
            if (state.connection.isConnected) {
                dispatch('sendMessage', { type: 'leave_classroom' })
            }

            // 关闭WebSocket连接
            if (state.connection.socket) {
                state.connection.socket.close()
            }

            // 停止媒体流
            await dispatch('stopAllMedia')

            // 重置状态
            commit('RESET_STATE')
        },

        // 停止所有媒体
        async stopAllMedia ({ commit }) {
            // 这里应该停止所有正在使用的媒体流
            commit('SET_LOCAL_MEDIA', { video: false, audio: false, screenShare: false })
        }
    }

    // getters已移动到主getters.js以避免重复
}

export default classroom
