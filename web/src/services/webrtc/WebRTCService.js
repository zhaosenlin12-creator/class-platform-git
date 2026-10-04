/**
 * WebRTC服务类
 * 处理实时音视频通信、信令连接和媒体流管理
 */

import io from 'socket.io-client'
import EventEmitter from 'events'

class WebRTCService extends EventEmitter {
    constructor () {
        super()

        // 连接配置
        this.signalingSocket = null
        this.signalingUrl = process.env.VUE_APP_WEBRTC_URL || 'http://localhost:3003'

        // WebRTC配置
        this.rtcConfiguration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ],
            iceCandidatePoolSize: 10
        }

        // 连接管理
        this.peerConnections = new Map() // socketId -> RTCPeerConnection
        this.localStream = null
        this.localScreenStream = null

        // 状态管理
        this.isConnected = false
        this.currentRoom = null
        this.userRole = null
        this.userId = null

        // 媒体状态
        this.mediaState = {
            audioEnabled: true,
            videoEnabled: true,
            screenSharing: false
        }

        // 远程流存储
        this.remoteStreams = new Map() // socketId -> MediaStream
    }

    /**
   * 连接到信令服务器
   */
    async connectToSignalingServer () {
        return new Promise((resolve, reject) => {
            try {
                this.signalingSocket = io(this.signalingUrl, {
                    transports: ['websocket', 'polling'],
                    cors: {
                        origin: window.location.origin,
                        credentials: true
                    }
                })

                this.signalingSocket.on('connect', () => {
                    this.isConnected = true
                    this.setupSignalingListeners()
                    resolve()
                })

                this.signalingSocket.on('connect_error', (error) => {
                    console.error('[WebRTC] 信令服务器连接失败:', error)
                    this.isConnected = false
                    reject(error)
                })

                this.signalingSocket.on('disconnect', () => {
                    this.isConnected = false
                    this.emit('disconnected')
                })
            } catch (error) {
                reject(error)
            }
        })
    }

    /**
   * 设置信令监听器
   */
    setupSignalingListeners () {
    // 用户加入房间
        this.signalingSocket.on('user-joined', (data) => {
            this.emit('userJoined', data)

            // 如果是老师，主动向新学生发送offer
            if (this.userRole === 'teacher') {
                this.createOfferForUser(data.socketId)
            }
        })

        // 用户离开房间
        this.signalingSocket.on('user-left', (data) => {
            this.removePeerConnection(data.socketId)
            this.emit('userLeft', data)
        })

        // WebRTC信令消息
        this.signalingSocket.on('webrtc-offer', async (data) => {
            await this.handleOffer(data)
        })

        this.signalingSocket.on('webrtc-answer', async (data) => {
            await this.handleAnswer(data)
        })

        this.signalingSocket.on('webrtc-ice-candidate', async (data) => {
            await this.handleIceCandidate(data)
        })

        // 媒体状态变更
        this.signalingSocket.on('user-media-change', (data) => {
            this.emit('userMediaChange', data)
        })

        // 屏幕共享事件
        this.signalingSocket.on('screen-share-started', (data) => {
            this.emit('screenShareStarted', data)
        })

        this.signalingSocket.on('screen-share-stopped', (data) => {
            this.emit('screenShareStopped', data)
        })

        // 房间设置更新
        this.signalingSocket.on('room-settings-updated', (settings) => {
            this.emit('roomSettingsUpdated', settings)
        })

        // 课堂关闭
        this.signalingSocket.on('classroom-closed', (data) => {
            this.emit('classroomClosed', data)
            this.leaveClassroom()
        })

        // 错误处理
        this.signalingSocket.on('error', (error) => {
            console.error('[WebRTC] 信令错误:', error)
            this.emit('error', error)
        })
    }

    /**
   * 加入教室
   */
    async joinClassroom (roomId, userId, userRole, userInfo = {}) {
        if (!this.isConnected) {
            await this.connectToSignalingServer()
        }

        this.currentRoom = roomId
        this.userId = userId
        this.userRole = userRole

        return new Promise((resolve, reject) => {
            this.signalingSocket.emit('join-classroom', {
                roomId,
                userId,
                userRole,
                userInfo
            })

            this.signalingSocket.once('joined-classroom', (data) => {
                this.emit('joinedClassroom', data)
                resolve(data)
            })

            this.signalingSocket.once('error', (error) => {
                reject(error)
            })
        })
    }

    /**
   * 离开教室
   */
    leaveClassroom () {
    // 清理所有连接
        for (const [socketId, pc] of this.peerConnections) {
            pc.close()
        }
        this.peerConnections.clear()
        this.remoteStreams.clear()

        // 停止本地流
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop())
            this.localStream = null
        }

        if (this.localScreenStream) {
            this.localScreenStream.getTracks().forEach(track => track.stop())
            this.localScreenStream = null
        }

        // 重置状态
        this.currentRoom = null
        this.userId = null
        this.userRole = null
        this.mediaState.screenSharing = false

        this.emit('leftClassroom')
    }

    /**
   * 初始化本地媒体流
   */
    async initializeLocalStream (constraints = { video: true, audio: true }) {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints)

            this.emit('localStreamReady', this.localStream)

            return this.localStream
        } catch (error) {
            console.error('[WebRTC] 获取本地媒体流失败:', error)
            throw error
        }
    }

    /**
   * 创建peer connection
   */
    createPeerConnection (socketId) {
        const pc = new RTCPeerConnection(this.rtcConfiguration)

        // 添加本地流
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream)
            })
        }

        // 处理远程流
        pc.ontrack = (event) => {
            const remoteStream = event.streams[0]
            this.remoteStreams.set(socketId, remoteStream)
            this.emit('remoteStreamAdded', { socketId, stream: remoteStream })
        }

        // 处理ICE候选者
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.signalingSocket.emit('webrtc-ice-candidate', {
                    targetSocketId: socketId,
                    candidate: event.candidate
                })
            }
        }

        // 连接状态监控
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                this.removePeerConnection(socketId)
            }
        }

        this.peerConnections.set(socketId, pc)
        return pc
    }

    /**
   * 为用户创建offer
   */
    async createOfferForUser (socketId) {
        try {
            const pc = this.createPeerConnection(socketId)
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)

            this.signalingSocket.emit('webrtc-offer', {
                targetUserId: socketId,
                offer
            })
        } catch (error) {
            console.error('[WebRTC] 创建offer失败:', error)
        }
    }

    /**
   * 处理offer
   */
    async handleOffer (data) {
        try {
            const { fromSocketId, offer } = data
            const pc = this.createPeerConnection(fromSocketId)

            await pc.setRemoteDescription(new RTCSessionDescription(offer))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            this.signalingSocket.emit('webrtc-answer', {
                targetSocketId: fromSocketId,
                answer
            })
        } catch (error) {
            console.error('[WebRTC] 处理offer失败:', error)
        }
    }

    /**
   * 处理answer
   */
    async handleAnswer (data) {
        try {
            const { fromSocketId, answer } = data
            const pc = this.peerConnections.get(fromSocketId)

            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer))
            }
        } catch (error) {
            console.error('[WebRTC] 处理answer失败:', error)
        }
    }

    /**
   * 处理ICE候选者
   */
    async handleIceCandidate (data) {
        try {
            const { fromSocketId, candidate } = data
            const pc = this.peerConnections.get(fromSocketId)

            if (pc && candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate))
            }
        } catch (error) {
            console.error('[WebRTC] 处理ICE候选者失败:', error)
        }
    }

    /**
   * 移除peer connection
   */
    removePeerConnection (socketId) {
        const pc = this.peerConnections.get(socketId)
        if (pc) {
            pc.close()
            this.peerConnections.delete(socketId)
        }

        const remoteStream = this.remoteStreams.get(socketId)
        if (remoteStream) {
            remoteStream.getTracks().forEach(track => track.stop())
            this.remoteStreams.delete(socketId)
            this.emit('remoteStreamRemoved', { socketId })
        }
    }

    /**
   * 切换音频状态
   */
    toggleAudio () {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0]
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled
                this.mediaState.audioEnabled = audioTrack.enabled

                this.signalingSocket.emit('media-state-change', {
                    audioEnabled: this.mediaState.audioEnabled,
                    videoEnabled: this.mediaState.videoEnabled
                })

                this.emit('mediaStateChanged', this.mediaState)
            }
        }
    }

    /**
   * 切换视频状态
   */
    toggleVideo () {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0]
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled
                this.mediaState.videoEnabled = videoTrack.enabled

                this.signalingSocket.emit('media-state-change', {
                    audioEnabled: this.mediaState.audioEnabled,
                    videoEnabled: this.mediaState.videoEnabled
                })

                this.emit('mediaStateChanged', this.mediaState)
            }
        }
    }

    /**
   * 开始屏幕共享
   */
    async startScreenShare () {
        try {
            this.localScreenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                },
                audio: true
            })

            // 替换视频轨道
            const videoTrack = this.localScreenStream.getVideoTracks()[0]
            for (const [socketId, pc] of this.peerConnections) {
                const sender = pc.getSenders().find(s =>
                    s.track && s.track.kind === 'video'
                )
                if (sender) {
                    await sender.replaceTrack(videoTrack)
                }
            }

            // 监听屏幕共享结束
            videoTrack.onended = () => {
                this.stopScreenShare()
            }

            this.mediaState.screenSharing = true
            this.signalingSocket.emit('screen-share-start')
            this.emit('screenShareStarted', { local: true })

            return this.localScreenStream
        } catch (error) {
            console.error('[WebRTC] 屏幕共享启动失败:', error)
            throw error
        }
    }

    /**
   * 停止屏幕共享
   */
    async stopScreenShare () {
        if (this.localScreenStream) {
            // 停止屏幕流
            this.localScreenStream.getTracks().forEach(track => track.stop())
            this.localScreenStream = null

            // 恢复摄像头视频
            if (this.localStream) {
                const videoTrack = this.localStream.getVideoTracks()[0]
                if (videoTrack) {
                    for (const [socketId, pc] of this.peerConnections) {
                        const sender = pc.getSenders().find(s =>
                            s.track && s.track.kind === 'video'
                        )
                        if (sender) {
                            await sender.replaceTrack(videoTrack)
                        }
                    }
                }
            }

            this.mediaState.screenSharing = false
            this.signalingSocket.emit('screen-share-stop')
            this.emit('screenShareStopped', { local: true })
        }
    }

    /**
   * 更新房间设置（仅老师）
   */
    updateRoomSettings (settings) {
        if (this.userRole === 'teacher' && this.signalingSocket) {
            this.signalingSocket.emit('update-room-settings', settings)
        }
    }

    /**
   * 获取连接状态统计
   */
    getConnectionStats () {
        const stats = {
            connectedPeers: this.peerConnections.size,
            remoteStreams: this.remoteStreams.size,
            localStreamActive: !!this.localStream,
            screenSharingActive: this.mediaState.screenSharing,
            signalingConnected: this.isConnected
        }

        return stats
    }

    /**
   * 销毁服务
   */
    destroy () {
        this.leaveClassroom()

        if (this.signalingSocket) {
            this.signalingSocket.disconnect()
            this.signalingSocket = null
        }

        this.removeAllListeners()
    }
}

// 单例模式导出
export default new WebRTCService()
