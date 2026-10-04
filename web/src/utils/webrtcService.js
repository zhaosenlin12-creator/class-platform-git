/**
 * 简化的WebRTC服务类 - 减少内存占用
 */
import io from 'socket.io-client'

class WebRTCService {
    constructor () {
        this.socket = null
        this.localStream = null
        this.remoteStreams = new Map()
        this.peerConnections = new Map()

        // 简化的配置
        this.pcConfig = {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        }

        this.events = new Map()
    }

    // 事件处理
    on (event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, [])
        }
        this.events.get(event).push(callback)
    }

    emit (event, data) {
        if (this.events.has(event)) {
            this.events.get(event).forEach(callback => callback(data))
        }
    }

    // 连接到信令服务器
    async connect (signalServerUrl, roomId, userId, userRole, userInfo) {
        try {
            this.socket = io(signalServerUrl)
            this.userInfo = { userId, userRole, userInfo }

            // 监听连接事件
            this.socket.on('connect', () => {
                this.emit('connected')

                // 加入教室房间
                this.socket.emit('join-classroom', {
                    roomId,
                    userId,
                    userRole,
                    userInfo
                })
            })

            // 监听房间事件
            this.socket.on('joined-classroom', (data) => {
                this.emit('joinedClassroom', data)
            })

            this.socket.on('user-joined', (data) => {
                this.emit('userJoined', data)
            })

            // WebRTC信令处理
            this.socket.on('webrtc-offer', (data) => {
                this.handleOffer(data)
            })

            this.socket.on('webrtc-answer', (data) => {
                this.handleAnswer(data)
            })

            this.socket.on('webrtc-ice-candidate', (data) => {
                this.handleIceCandidate(data)
            })

            return true
        } catch (error) {
            console.error('WebRTC连接失败:', error)
            return false
        }
    }

    // 获取本地媒体流
    async getLocalStream (constraints = { video: true, audio: true }) {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
            this.emit('localStream', { stream: this.localStream })
            return this.localStream
        } catch (error) {
            console.error('获取媒体流失败:', error)
            this.emit('error', { message: '无法访问摄像头或麦克风' })
            return null
        }
    }

    // 创建对等连接
    async createPeerConnection (userId) {
        try {
            const pc = new RTCPeerConnection(this.pcConfig)

            // 添加本地流
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    pc.addTrack(track, this.localStream)
                })
            }

            // ICE候选处理
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    this.socket.emit('webrtc-ice-candidate', {
                        targetUserId: userId,
                        candidate: event.candidate
                    })
                }
            }

            // 远程流处理
            pc.ontrack = (event) => {
                const [remoteStream] = event.streams
                this.remoteStreams.set(userId, remoteStream)
                this.emit('remoteStream', { userId, stream: remoteStream })
            }

            this.peerConnections.set(userId, { pc, socketId: null })
            return pc
        } catch (error) {
            console.error('创建对等连接失败:', error)
            return null
        }
    }

    // 处理Offer
    async handleOffer (data) {
        const { fromUserId, fromSocketId, offer } = data

        try {
            let connection = this.peerConnections.get(fromUserId)
            if (!connection) {
                await this.createPeerConnection(fromUserId)
                connection = this.peerConnections.get(fromUserId)
            }

            connection.socketId = fromSocketId

            await connection.pc.setRemoteDescription(offer)
            const answer = await connection.pc.createAnswer()
            await connection.pc.setLocalDescription(answer)

            this.socket.emit('webrtc-answer', {
                targetSocketId: fromSocketId,
                answer
            })
        } catch (error) {
            console.error('处理Offer失败:', error)
        }
    }

    // 处理Answer
    async handleAnswer (data) {
        const { fromUserId, fromSocketId, answer } = data

        try {
            const connection = this.peerConnections.get(fromUserId)
            if (connection && connection.pc) {
                connection.socketId = fromSocketId
                await connection.pc.setRemoteDescription(answer)
            }
        } catch (error) {
            console.error('处理Answer失败:', error)
        }
    }

    // 处理ICE候选
    async handleIceCandidate (data) {
        const { fromSocketId, candidate } = data

        try {
            // 找到对应的连接
            const foundConnection = Array.from(this.peerConnections.entries())
                .find(([_, conn]) => conn.socketId === fromSocketId)
            const targetUserId = foundConnection && foundConnection[0]

            if (targetUserId) {
                const connection = this.peerConnections.get(targetUserId)
                if (connection && connection.pc.remoteDescription) {
                    await connection.pc.addIceCandidate(candidate)
                }
            }
        } catch (error) {
            console.error('处理ICE候选失败:', error)
        }
    }

    // 发起呼叫
    async makeCall (targetUserId) {
        try {
            let connection = this.peerConnections.get(targetUserId)
            if (!connection) {
                await this.createPeerConnection(targetUserId)
                connection = this.peerConnections.get(targetUserId)
            }

            const offer = await connection.pc.createOffer()
            await connection.pc.setLocalDescription(offer)

            this.socket.emit('webrtc-offer', {
                targetUserId,
                offer
            })
        } catch (error) {
            console.error('发起呼叫失败:', error)
        }
    }

    // 切换音频状态
    toggleAudio () {
        if (this.localStream) {
            const audioTracks = this.localStream.getAudioTracks()
            audioTracks.forEach(track => {
                track.enabled = !track.enabled
            })
            return (audioTracks[0] && audioTracks[0].enabled) || false
        }
        return false
    }

    // 切换视频状态
    toggleVideo () {
        if (this.localStream) {
            const videoTracks = this.localStream.getVideoTracks()
            videoTracks.forEach(track => {
                track.enabled = !track.enabled
            })
            return (videoTracks[0] && videoTracks[0].enabled) || false
        }
        return false
    }

    // 断开连接
    disconnect () {
    // 关闭所有对等连接
        this.peerConnections.forEach((connection) => {
            if (connection.pc) {
                connection.pc.close()
            }
        })
        this.peerConnections.clear()

        // 停止本地流
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop())
            this.localStream = null
        }

        // 断开socket连接
        if (this.socket) {
            this.socket.disconnect()
            this.socket = null
        }

        this.remoteStreams.clear()
        this.events.clear()
    }
}

export default WebRTCService
