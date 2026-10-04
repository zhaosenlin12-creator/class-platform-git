/**
 * Socket.io服务器
 * 处理课堂实时通信和数据同步
 */

const { Server } = require('socket.io');
const util = require('util');
const { v4: uuidv4 } = require('uuid');
const jwtUtil = require('./utils/jwt');
const { extractAuthTokenFromCookieHeader } = require('./utils/authCookie');
const { logger } = require('./middleware/logger');
const avatarUtil = require('./utils/avatar');

let io = null;
let models = null;
const BASE_CHAT_COLUMNS = [
  'id',
  'classroom_id',
  'user_id',
  'user_name',
  'user_role',
  'message_type',
  'content',
  'avatar',
  'del_flag',
  'create_time'
];
let chatTableColumnsCache = null;

function formatLogArgs(args) {
  return args.map((arg) => {
    if (arg instanceof Error) {
      return arg.stack || arg.message;
    }
    if (typeof arg === 'string') {
      return arg;
    }
    return util.inspect(arg, { depth: 4, breakLength: Infinity });
  }).join(' ');
}

const console = {
  log: (...args) => logger.debug(formatLogArgs(args)),
  warn: (...args) => logger.warn(formatLogArgs(args)),
  error: (...args) => logger.error(formatLogArgs(args))
};

// 延迟加载models（避免循环依赖）
function getModels() {
  if (!models) {
    models = require('./models');
  }
  return models;
}

async function getAvailableChatTableColumns() {
  if (chatTableColumnsCache) {
    return chatTableColumnsCache;
  }

  try {
    const db = getModels();
    const tableSchema = await db.sequelize.getQueryInterface().describeTable('teaching_classroom_chat');
    chatTableColumnsCache = new Set(Object.keys(tableSchema || {}));
    return chatTableColumnsCache;
  } catch (error) {
    console.warn('[Socket] ⚠️ 读取 teaching_classroom_chat 表结构失败，回退到基础字段:', error.message);
    chatTableColumnsCache = new Set(BASE_CHAT_COLUMNS);
    return chatTableColumnsCache;
  }
}

function buildChatCreatePayload(rawData, availableColumns) {
  const payload = {};
  Object.keys(rawData).forEach((key) => {
    if (availableColumns.has(key) && rawData[key] !== undefined) {
      payload[key] = rawData[key];
    }
  });
  return payload;
}

// 节流函数：限制事件处理频率
const throttleMap = new Map();
const SOCKET_ROLE = {
  admin: 'admin',
  teacher: 'teacher',
  student: 'student'
};

const SOCKET_ERROR_CODE = {
  accessDenied: 'CLASSROOM_ACCESS_DENIED',
  actionDenied: 'CLASSROOM_ACTION_DENIED'
};

function normalizeRoleValue(role) {
  if (Array.isArray(role)) {
    return normalizeRoleValue(role[0]);
  }

  const normalized = String(role || '').toLowerCase();
  if (normalized === SOCKET_ROLE.admin) {
    return SOCKET_ROLE.admin;
  }
  if (normalized === SOCKET_ROLE.student) {
    return SOCKET_ROLE.student;
  }
  return SOCKET_ROLE.teacher;
}

function resolveSocketRole(decoded = {}) {
  const identityValue = decoded.userIdentity !== undefined && decoded.userIdentity !== null
    ? decoded.userIdentity
    : decoded.user_identity;
  const identity = Number(identityValue);

  if (identity === 1) {
    return SOCKET_ROLE.admin;
  }
  if (identity === 3) {
    return SOCKET_ROLE.student;
  }
  if (identity === 2) {
    return SOCKET_ROLE.teacher;
  }

  return normalizeRoleValue(decoded.role);
}

function getResolvedUserContext(socket, data = {}) {
  const identityValue = socket.userIdentity !== undefined && socket.userIdentity !== null
    ? socket.userIdentity
    : (data.userIdentity !== undefined && data.userIdentity !== null ? data.userIdentity : data.user_identity);
  const userIdentity = Number(identityValue);

  return {
    userId: socket.userId || data.userId || data.senderId || 'unknown',
    username: socket.username || data.userName || data.senderName || '匿名',
    userRole: normalizeRoleValue(socket.userRole || data.userRole || data.role),
    userIdentity: Number.isFinite(userIdentity) && userIdentity > 0 ? userIdentity : null,
    studentId: socket.studentId || null
  };
}

function getJoinedClassroomId(socket) {
  const classroomRoom = Array.from(socket.rooms).find(room => room.startsWith('classroom:'));
  return classroomRoom ? classroomRoom.replace('classroom:', '') : null;
}

function getRequestedClassroomId(socket, data = {}) {
  return data.classroomId || data.classroom_id || socket.currentClassroomId || getJoinedClassroomId(socket);
}

function emitSocketEventError(socket, eventName, code, message, classroomId) {
  const event = code === SOCKET_ERROR_CODE.accessDenied
    ? 'classroom-access-denied'
    : 'classroom-action-denied';

  const payload = {
    code,
    event: eventName,
    classroomId: classroomId || null,
    message,
    timestamp: new Date().toISOString()
  };

  if (code === SOCKET_ERROR_CODE.accessDenied) {
    console.warn(`[Socket] Access denied for ${eventName}: user=${socket.userId}, classroom=${classroomId || 'unknown'}, message=${message}`);
  } else {
    console.warn(`[Socket] Action denied for ${eventName}: user=${socket.userId}, classroom=${classroomId || 'unknown'}, message=${message}`);
  }

  socket.emit(event, payload);
}

async function resolveStudentRecord(db, userId, username) {
  if (!db || !db.TeachingStudent) {
    return null;
  }

  let student = null;

  if (userId) {
    student = await db.TeachingStudent.findOne({
      where: {
        id: userId,
        del_flag: 0
      }
    });
  }

  if (!student && username) {
    student = await db.TeachingStudent.findOne({
      where: {
        [db.Sequelize.Op.or]: [
          { username },
          { student_no: username }
        ],
        del_flag: 0
      }
    });
  }

  if (!student && userId && db.SysUser) {
    const sysUser = await db.SysUser.findOne({
      where: {
        id: userId,
        del_flag: 0
      }
    });

    if (sysUser && sysUser.username) {
      student = await db.TeachingStudent.findOne({
        where: {
          [db.Sequelize.Op.or]: [
            { username: sysUser.username },
            { student_no: sysUser.username }
          ],
          del_flag: 0
        }
      });
    }
  }

  return student;
}

async function getClassroomAccessContext(socket, classroomId) {
  if (!classroomId) {
    return {
      ok: false,
      reason: 'bad_request',
      message: '课堂ID不能为空'
    };
  }

  const db = getModels();
  if (!db || !db.TeachingClassroom) {
    return {
      ok: false,
      reason: 'server_error',
      message: '课堂服务初始化异常'
    };
  }

  const classroom = await db.TeachingClassroom.findOne({
    where: {
      id: classroomId,
      del_flag: 0
    },
    attributes: ['id', 'class_id', 'teacher_id', 'status']
  });

  if (!classroom) {
    return {
      ok: false,
      reason: 'not_found',
      message: '课堂不存在'
    };
  }

  const user = getResolvedUserContext(socket);
  const isAdmin = user.userIdentity === 1 || user.userRole === SOCKET_ROLE.admin;
  const isTeacherOwner = classroom.teacher_id && String(classroom.teacher_id) === String(user.userId);

  if (isAdmin || isTeacherOwner) {
    return {
      ok: true,
      classroom,
      accessRole: isAdmin ? SOCKET_ROLE.admin : SOCKET_ROLE.teacher,
      user
    };
  }

  const student = await resolveStudentRecord(db, user.userId, user.username);
  const candidateStudentIds = [];
  if (user.userId) {
    candidateStudentIds.push(String(user.userId));
  }
  if (student && student.id && String(student.id) !== String(user.userId)) {
    candidateStudentIds.push(String(student.id));
  }

  let isClassMember = false;
  if (student && classroom.class_id && db.TeachingClassStudent) {
    const classMember = await db.TeachingClassStudent.findOne({
      where: {
        class_id: classroom.class_id,
        student_id: student.id,
        del_flag: 0,
        status: 1
      },
      attributes: ['id']
    });
    isClassMember = Boolean(classMember);
  }

  let isClassroomMember = false;
  if (db.TeachingClassroomStudent && candidateStudentIds.length > 0) {
    const classroomMember = await db.TeachingClassroomStudent.findOne({
      where: {
        classroom_id: classroomId,
        student_id: candidateStudentIds.length === 1
          ? candidateStudentIds[0]
          : { [db.Sequelize.Op.in]: candidateStudentIds }
      },
      attributes: ['id']
    });
    isClassroomMember = Boolean(classroomMember);
  }

  if (isClassMember || isClassroomMember) {
    return {
      ok: true,
      classroom,
      accessRole: SOCKET_ROLE.student,
      user: {
        ...user,
        studentId: student && student.id ? student.id : user.userId
      }
    };
  }

  return {
    ok: false,
    reason: 'forbidden',
    message: '您不是该课堂成员，无法执行实时课堂操作',
    classroom
  };
}

async function syncSocketClassroomCurrentStudents(db, classroomId) {
  if (!db || !db.TeachingClassroomStudent || !db.TeachingClassroom || !classroomId) {
    return 0;
  }

  const onlineCount = await db.TeachingClassroomStudent.count({
    where: {
      classroom_id: classroomId,
      status: 'online'
    }
  });

  await db.TeachingClassroom.update(
    {
      current_students: onlineCount,
      update_time: new Date()
    },
    {
      where: {
        id: classroomId
      }
    }
  );

  return onlineCount;
}

async function markStudentOfflineFromSocket(socket, classroomId) {
  const db = getModels();
  if (!db || !db.TeachingClassroomStudent || !classroomId) {
    return null;
  }

  const access = await getClassroomAccessContext(socket, classroomId);
  if (!access.ok || access.accessRole !== SOCKET_ROLE.student) {
    return null;
  }

  const candidateStudentIds = Array.from(new Set(
    [access.user.studentId, access.user.userId]
      .filter(Boolean)
      .map(value => String(value))
  ));

  if (candidateStudentIds.length === 0) {
    return null;
  }

  const classroomStudent = await db.TeachingClassroomStudent.findOne({
    where: {
      classroom_id: classroomId,
      student_id: candidateStudentIds.length === 1
        ? candidateStudentIds[0]
        : { [db.Sequelize.Op.in]: candidateStudentIds },
      status: 'online'
    }
  });

  if (!classroomStudent) {
    await syncSocketClassroomCurrentStudents(db, classroomId);
    return null;
  }

  const studentId = access.user.studentId || classroomStudent.student_id || candidateStudentIds[0];
  const studentName = classroomStudent.student_name || access.user.username || null;
  const durationMinutes = classroomStudent.join_time
    ? Math.floor((Date.now() - new Date(classroomStudent.join_time).getTime()) / 60000)
    : 0;

  await classroomStudent.update({
    student_id: studentId,
    student_name: studentName,
    leave_time: new Date(),
    status: 'offline',
    duration: durationMinutes
  });

  const onlineCount = await syncSocketClassroomCurrentStudents(db, classroomId);
  return {
    studentId,
    studentName,
    onlineCount
  };
}

async function ensureSocketClassroomAccess(socket, eventName, data = {}, options = {}) {
  const {
    teacherOnly = false,
    studentOnly = false,
    requireJoinedRoom = eventName !== 'join-classroom'
  } = options;

  const classroomId = getRequestedClassroomId(socket, data);
  if (!classroomId) {
    emitSocketEventError(socket, eventName, SOCKET_ERROR_CODE.actionDenied, '课堂ID不能为空', classroomId);
    return null;
  }

  const room = `classroom:${classroomId}`;
  if (requireJoinedRoom && !socket.rooms.has(room)) {
    emitSocketEventError(socket, eventName, SOCKET_ERROR_CODE.actionDenied, '请先加入课堂后再执行此操作', classroomId);
    return null;
  }

  const access = await getClassroomAccessContext(socket, classroomId);
  if (!access.ok) {
    const errorCode = access.reason === 'forbidden'
      ? SOCKET_ERROR_CODE.accessDenied
      : SOCKET_ERROR_CODE.actionDenied;
    emitSocketEventError(socket, eventName, errorCode, access.message, classroomId);
    return null;
  }

  if (teacherOnly && ![SOCKET_ROLE.teacher, SOCKET_ROLE.admin].includes(access.accessRole)) {
    emitSocketEventError(socket, eventName, SOCKET_ERROR_CODE.actionDenied, '仅教师或管理员可执行该操作', classroomId);
    return null;
  }

  if (studentOnly && access.accessRole !== SOCKET_ROLE.student) {
    emitSocketEventError(socket, eventName, SOCKET_ERROR_CODE.actionDenied, '仅学生可执行该操作', classroomId);
    return null;
  }

  return {
    ...access,
    classroomId,
    room
  };
}

function wrapSocketHandler(socket, eventName, handler) {
  return async (data = {}) => {
    try {
      await handler(data || {});
    } catch (error) {
      const classroomId = getRequestedClassroomId(socket, data || {});
      console.error(`[Socket] ${eventName} handler failed:`, error);
      emitSocketEventError(socket, eventName, SOCKET_ERROR_CODE.actionDenied, '实时课堂操作失败，请稍后重试', classroomId);
    }
  };
}

function throttle(socketId, eventName, delay = 300) {
  const key = `${socketId}:${eventName}`;
  const now = Date.now();
  const lastTime = throttleMap.get(key) || 0;
  
  if (now - lastTime < delay) {
    return false; // 被节流
  }
  
  throttleMap.set(key, now);
  return true; // 允许执行
}

// 定期清理节流记录（防止内存泄漏）
setInterval(() => {
  const now = Date.now();
  for (const [key, time] of throttleMap.entries()) {
    if (now - time > 60000) { // 1分钟后清理
      throttleMap.delete(key);
    }
  }
}, 60000);

/**
 * 初始化Socket.io服务器
 */
function initSocketServer(server) {
  // 允许的源列表
  const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:8081',
    'http://192.168.1.8:8080',
    'http://192.168.1.8:8081',
    'http://192.168.1.5:8080',
    'http://192.168.1.5:8081',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8081'
  ];
  
  // 如果环境变量中有额外的源，也添加进去
  if (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*') {
    const envOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());
    envOrigins.forEach(origin => {
      if (!allowedOrigins.includes(origin)) {
        allowedOrigins.push(origin);
      }
    });
  }
  
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        // 允许没有origin的请求（比如移动应用、Postman等）
        if (!origin) return callback(null, true);
        
        // 开发环境：允许所有本地请求（localhost、127.0.0.1、192.168.x.x）
        const isLocalDev = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin);
        
        // 检查origin是否在允许列表中或是本地开发请求
        if (allowedOrigins.includes(origin) || isLocalDev || process.env.CORS_ORIGIN === '*') {
          callback(null, true);
        } else {
          console.log(`⚠️ [Socket.IO CORS] 拒绝来自 ${origin} 的连接`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    // 并发优化配置
    pingTimeout: 60000,           // ping超时时间（60秒）
    pingInterval: 25000,          // ping间隔（25秒）
    maxHttpBufferSize: 1e6,       // 最大HTTP缓冲区（1MB）
    connectTimeout: 45000,        // 连接超时（45秒）
    allowUpgrades: true,          // 允许传输升级
    perMessageDeflate: false      // 禁用压缩以提高性能
  });
  
  console.log(`✅ [Socket.IO] CORS配置已启用，允许的源:`, allowedOrigins);

  // WebSocket 认证中间件
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token
        || socket.handshake.query.token
        || extractAuthTokenFromCookieHeader(socket.handshake.headers && socket.handshake.headers.cookie);
      
      if (!token) {
        console.log(`⚠️ [Socket Auth] 连接被拒绝: 缺少认证token`);
        return next(new Error('Authentication error: No token provided'));
      }
      
      // 验证 JWT token
      const decoded = jwtUtil.verifyToken(String(token).replace(/^Bearer\s+/i, '').trim());
      
      // 将用户信息附加到 socket 对象
      socket.userId = decoded.id || decoded.userId;
      socket.username = decoded.realname || decoded.username;
      socket.loginName = decoded.username;
      socket.userIdentity = decoded.userIdentity !== undefined && decoded.userIdentity !== null
        ? Number(decoded.userIdentity)
        : (decoded.user_identity !== undefined && decoded.user_identity !== null ? Number(decoded.user_identity) : null);
      socket.userRole = resolveSocketRole(decoded);
      
      console.log(`✅ [Socket Auth] 用户认证成功: ${socket.username} (${socket.userId})`);
      next();
    } catch (error) {
      console.log(`❌ [Socket Auth] 认证失败:`, error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.id}, user=${socket.username} (${socket.userId})`);

    socket.on('join-classroom', wrapSocketHandler(socket, 'join-classroom', async (data = {}) => {
      const access = await ensureSocketClassroomAccess(socket, 'join-classroom', data, {
        requireJoinedRoom: false
      });
      if (!access) {
        return;
      }

      const resolvedUser = access.user;
      if (socket.currentClassroomId && socket.currentClassroomId !== access.classroomId) {
        socket.leave(`classroom:${socket.currentClassroomId}`);
      }

      socket.join(access.room);
      socket.currentClassroomId = access.classroomId;
      socket.currentClassroomRole = access.accessRole;
      socket.studentId = resolvedUser.studentId || null;

      console.log(`[Socket] User ${resolvedUser.username}(${resolvedUser.userId}) joined classroom ${access.classroomId} as ${access.accessRole}`);

      socket.to(access.room).emit('student-joined', {
        userId: resolvedUser.userId,
        userName: resolvedUser.username,
        userRole: access.accessRole,
        timestamp: new Date().toISOString()
      });

      socket.emit('joined-classroom', {
        classroomId: access.classroomId,
        role: access.accessRole,
        message: '已成功加入课堂'
      });
    }));

    socket.on('leave-classroom', wrapSocketHandler(socket, 'leave-classroom', async (data = {}) => {
      const classroomId = getRequestedClassroomId(socket, data);
      if (!classroomId) {
        return;
      }

      const room = `classroom:${classroomId}`;
      const resolvedUser = getResolvedUserContext(socket, data);
      const offlineResult = resolvedUser.userRole === SOCKET_ROLE.student
        ? await markStudentOfflineFromSocket(socket, classroomId)
        : null;

      socket.leave(room);
      if (socket.currentClassroomId === classroomId) {
        socket.currentClassroomId = null;
        socket.currentClassroomRole = null;
        socket.studentId = null;
      }

      console.log(`[Socket] User ${resolvedUser.username}(${resolvedUser.userId}) left classroom ${classroomId}`);

      socket.to(room).emit('student-left', {
        userId: (offlineResult && offlineResult.studentId) || resolvedUser.userId,
        userName: (offlineResult && offlineResult.studentName) || resolvedUser.username,
        timestamp: new Date().toISOString()
      });
    }));

    socket.on('code-sync', wrapSocketHandler(socket, 'code-sync', async (data = {}) => {
      if (!throttle(socket.id, 'code-sync', 300)) {
        return;
      }

      const access = await ensureSocketClassroomAccess(socket, 'code-sync', data, {
        teacherOnly: true
      });
      if (!access) {
        return;
      }

      socket.to(access.room).emit('code-updated', {
        code: data.code,
        language: data.language,
        userId: access.user.userId,
        timestamp: new Date().toISOString()
      });
    }));

    socket.on('resource-change', wrapSocketHandler(socket, 'resource-change', async (data = {}) => {
      const access = await ensureSocketClassroomAccess(socket, 'resource-change', data, {
        teacherOnly: true
      });
      if (!access) {
        return;
      }

      socket.to(access.room).emit('resource-changed', {
        resource: data.resource,
        resourceName: data.resource ? data.resource.name : null,
        timestamp: new Date().toISOString()
      });
    }));

    socket.on('resource-page-sync', wrapSocketHandler(socket, 'resource-page-sync', async (data = {}) => {
      if (!throttle(socket.id, 'resource-page-sync', 200)) {
        return;
      }

      const access = await ensureSocketClassroomAccess(socket, 'resource-page-sync', data, {
        teacherOnly: true
      });
      if (!access) {
        return;
      }

      socket.to(access.room).emit('resource-page-synced', {
        resourceId: data.resourceId,
        page: data.page,
        timestamp: new Date().toISOString()
      });
    }));

    socket.on('chat-message', wrapSocketHandler(socket, 'chat-message', async (data = {}) => {
      if (!throttle(socket.id, 'chat-message', 500)) {
        return;
      }

      const access = await ensureSocketClassroomAccess(socket, 'chat-message', data);
      if (!access) {
        return;
      }

      const messageType = data.type || data.message_type || 'text';
      const fileKey = data.fileKey || data.fileUrl || data.file_key || null;
      const isHttpFileUrl = typeof fileKey === 'string' && /^https?:\/\//i.test(fileKey);
      const messageContent = data.content || data.message || (messageType === 'file' ? (data.fileName || '') : '');
      const resolvedUserId = access.user.userId || 'unknown';
      const resolvedUserName = access.user.username || '匿名';
      const resolvedUserRole = access.accessRole;
      const messageId = uuidv4();
      const createTime = new Date();
      const normalizedAvatar = avatarUtil.normalizeAvatarUrl(data.avatar, resolvedUserName || resolvedUserId);

      try {
        const db = getModels();
        if (db && db.TeachingClassroomChat) {
          const availableColumns = await getAvailableChatTableColumns();
          const createPayload = buildChatCreatePayload({
            id: messageId,
            classroom_id: access.classroomId,
            user_id: resolvedUserId,
            user_name: resolvedUserName,
            user_role: resolvedUserRole,
            message_type: messageType,
            content: messageContent,
            file_name: data.fileName || null,
            file_size: data.fileSize || null,
            file_type: data.fileType || null,
            file_url: fileKey,
            avatar: normalizedAvatar,
            del_flag: 0,
            create_time: createTime
          }, availableColumns);

          await db.TeachingClassroomChat.create(createPayload);
          console.log(`[Socket] Chat saved: classroom=${access.classroomId}, type=${messageType}`);
        }
      } catch (err) {
        console.error('[Socket] Failed to save chat message:', err.message);
      }

      io.to(access.room).emit('chat-message', {
        ...data,
        id: messageId,
        type: messageType,
        content: messageContent,
        fileKey,
        fileUrl: data.fileUrl || (isHttpFileUrl ? fileKey : null),
        userId: resolvedUserId,
        userName: resolvedUserName,
        userRole: resolvedUserRole,
        avatar: normalizedAvatar,
        senderId: data.senderId || resolvedUserId,
        senderName: data.senderName || resolvedUserName,
        timestamp: createTime.toISOString()
      });
    }));

    socket.on('classroom:sendMessage', wrapSocketHandler(socket, 'classroom:sendMessage', async (data = {}) => {
      const access = await ensureSocketClassroomAccess(socket, 'classroom:sendMessage', data);
      if (!access) {
        return;
      }

      const { type, fileKey, fileName, fileSize, fileType, avatar } = data;
      const resolvedUserId = access.user.userId || 'unknown';
      const resolvedUserName = access.user.username || '匿名';
      const resolvedUserRole = access.accessRole;
      const normalizedAvatar = avatarUtil.normalizeAvatarUrl(avatar, resolvedUserName || resolvedUserId);

      if (type !== 'file') {
        emitSocketEventError(socket, 'classroom:sendMessage', SOCKET_ERROR_CODE.actionDenied, '仅支持文件消息', access.classroomId);
        return;
      }

      if (!fileKey || !fileName || !fileSize) {
        emitSocketEventError(socket, 'classroom:sendMessage', SOCKET_ERROR_CODE.actionDenied, '文件信息不完整', access.classroomId);
        return;
      }

      const messageId = uuidv4();
      const createTime = new Date();

      try {
        const db = getModels();
        if (db && db.TeachingClassroomChat) {
          const availableColumns = await getAvailableChatTableColumns();
          await db.TeachingClassroomChat.create(buildChatCreatePayload({
            id: messageId,
            classroom_id: access.classroomId,
            user_id: resolvedUserId,
            user_name: resolvedUserName,
            user_role: resolvedUserRole,
            message_type: 'file',
            content: fileName,
            file_name: fileName,
            file_size: fileSize,
            file_type: fileType,
            file_url: fileKey,
            avatar: normalizedAvatar,
            create_time: createTime,
            del_flag: 0
          }, availableColumns));

          console.log(`[Socket] File message saved: classroom=${access.classroomId}, file=${fileName}`);

          io.to(access.room).emit('classroom:newMessage', {
            id: messageId,
            classroom_id: access.classroomId,
            user_id: resolvedUserId,
            user_name: resolvedUserName,
            user_role: resolvedUserRole,
            message_type: 'file',
            content: fileName,
            file_name: fileName,
            file_size: fileSize,
            file_type: fileType,
            file_url: fileKey,
            avatar: normalizedAvatar,
            create_time: createTime.toISOString(),
            timestamp: createTime.toISOString()
          });
        }
      } catch (err) {
        console.error('[Socket] Failed to save file message:', err.message);
        emitSocketEventError(socket, 'classroom:sendMessage', SOCKET_ERROR_CODE.actionDenied, '文件消息保存失败，请重试', access.classroomId);
      }
    }));

    socket.on('start-broadcast', wrapSocketHandler(socket, 'start-broadcast', async (data = {}) => {
      const access = await ensureSocketClassroomAccess(socket, 'start-broadcast', data, {
        teacherOnly: true
      });
      if (!access) {
        return;
      }

      console.log(`[Socket] Broadcast started: classroom=${access.classroomId}, type=${data.type}`);
      socket.to(access.room).emit('broadcast-started', {
        ...data,
        timestamp: new Date().toISOString()
      });
    }));

    socket.on('broadcast-content-update', wrapSocketHandler(socket, 'broadcast-content-update', async (data = {}) => {
      const access = await ensureSocketClassroomAccess(socket, 'broadcast-content-update', data, {
        teacherOnly: true
      });
      if (!access) {
        return;
      }

      console.log(`[Socket] Broadcast content updated: classroom=${access.classroomId}, type=${data.type}`);
      socket.to(access.room).emit('broadcast-content-update', {
        ...data,
        isUpdate: true,
        timestamp: new Date().toISOString()
      });
    }));

    socket.on('broadcast-code', wrapSocketHandler(socket, 'broadcast-code', async (data = {}) => {
      if (!throttle(socket.id, 'broadcast-code', 300)) {
        return;
      }

      const access = await ensureSocketClassroomAccess(socket, 'broadcast-code', data, {
        teacherOnly: true
      });
      if (!access) {
        return;
      }

      socket.to(access.room).emit('code-updated', {
        code: data.code,
        language: data.language,
        timestamp: new Date().toISOString()
      });
    }));

    socket.on('broadcast-language-switch', wrapSocketHandler(socket, 'broadcast-language-switch', async (data = {}) => {
      const access = await ensureSocketClassroomAccess(socket, 'broadcast-language-switch', data, {
        teacherOnly: true
      });
      if (!access) {
        return;
      }

      socket.to(access.room).emit('broadcast-content-update', {
        active: true,
        type: 'code',
        language: data.language,
        code: data.code || '',
        isUpdate: true,
        timestamp: new Date().toISOString()
      });
    }));

    socket.on('share-work', wrapSocketHandler(socket, 'share-work', async (data = {}) => {
      const access = await ensureSocketClassroomAccess(socket, 'share-work', data);
      if (!access) {
        return;
      }

      const sharedWorkName = String(data.name || '').trim() || '未命名作品';
      const timestamp = new Date().toISOString();

      io.to(access.room).emit('chat-message', {
        id: `shared-work:${uuidv4()}`,
        type: 'system',
        senderId: access.user.userId,
        senderName: access.user.username,
        userName: access.user.username,
        userRole: access.accessRole,
        content: `${access.user.username} 分享了作品《${sharedWorkName}》`,
        sharedWork: {
          name: sharedWorkName,
          description: data.description || '',
          language: data.language || '',
          type: data.type || 'share'
        },
        timestamp,
        time: timestamp
      });
    }));

    socket.on('broadcast-screen', wrapSocketHandler(socket, 'broadcast-screen', async (data = {}) => {
      const access = await ensureSocketClassroomAccess(socket, 'broadcast-screen', data, {
        teacherOnly: true
      });
      if (!access) {
        return;
      }

      console.log(`[Socket] Screen broadcast started: classroom=${access.classroomId}`);
      io.to(access.room).emit('broadcast-started', {
        screenData: data.screenData,
        timestamp: new Date().toISOString()
      });
    }));

    socket.on('stop-broadcast', wrapSocketHandler(socket, 'stop-broadcast', async (data = {}) => {
      const access = await ensureSocketClassroomAccess(socket, 'stop-broadcast', data, {
        teacherOnly: true
      });
      if (!access) {
        return;
      }

      console.log(`[Socket] Broadcast stopped: classroom=${access.classroomId}`);
      io.to(access.room).emit('broadcast-stopped', {
        timestamp: new Date().toISOString()
      });
    }));

    socket.on('broadcast-ppt', wrapSocketHandler(socket, 'broadcast-ppt', async (data = {}) => {
      const access = await ensureSocketClassroomAccess(socket, 'broadcast-ppt', data, {
        teacherOnly: true
      });
      if (!access) {
        return;
      }

      console.log(`[Socket] PPT broadcast: classroom=${access.classroomId}, slide=${data.currentSlide}`);
      socket.to(access.room).emit('ppt-changed', {
        pptData: data.pptData,
        currentSlide: data.currentSlide,
        timestamp: new Date().toISOString()
      });
    }));

    socket.on('broadcast-slide-change', wrapSocketHandler(socket, 'broadcast-slide-change', async (data = {}) => {
      const access = await ensureSocketClassroomAccess(socket, 'broadcast-slide-change', data, {
        teacherOnly: true
      });
      if (!access) {
        return;
      }

      console.log(`[Socket] PPT slide changed: classroom=${access.classroomId}, slide=${data.currentSlide}`);
      socket.to(access.room).emit('slide-changed', {
        currentSlide: data.currentSlide,
        timestamp: new Date().toISOString()
      });
    }));

    socket.on('student-status-update', wrapSocketHandler(socket, 'student-status-update', async (data = {}) => {
      const access = await ensureSocketClassroomAccess(socket, 'student-status-update', data, {
        studentOnly: true
      });
      if (!access) {
        return;
      }

      const payload = {
        studentId: access.user.studentId || access.user.userId,
        studentName: access.user.username,
        status: data.status || (data.needHelp ? 'need_help' : 'idle'),
        needHelp: Boolean(data.needHelp),
        timestamp: new Date().toISOString()
      };

      io.to(access.room).emit('student-status-updated', payload);
    }));

    socket.on('projector-mode-change', wrapSocketHandler(socket, 'projector-mode-change', async (data = {}) => {
      const access = await ensureSocketClassroomAccess(socket, 'projector-mode-change', data, {
        teacherOnly: true
      });
      if (!access) {
        return;
      }

      io.to(access.room).emit('projector-mode-changed', {
        enabled: Boolean(data.enabled),
        classroomId: access.classroomId,
        timestamp: new Date().toISOString()
      });
    }));

    socket.on('raise-hand', wrapSocketHandler(socket, 'raise-hand', async (data = {}) => {
      const access = await ensureSocketClassroomAccess(socket, 'raise-hand', data, {
        studentOnly: true
      });
      if (!access) {
        return;
      }

      console.log(`[Socket] Student raised hand: ${access.user.username}(${access.user.userId})`);
      io.to(access.room).emit('hand-raised', {
        userId: access.user.userId,
        userName: access.user.username,
        timestamp: new Date().toISOString()
      });

      io.to(access.room).emit('student-status-updated', {
        studentId: access.user.studentId || access.user.userId,
        studentName: access.user.username,
        status: 'need_help',
        needHelp: true,
        timestamp: new Date().toISOString()
      });
    }));

    socket.on('disconnect', async () => {
      if (socket.currentClassroomId && socket.currentClassroomRole === SOCKET_ROLE.student) {
        try {
          const offlineResult = await markStudentOfflineFromSocket(socket, socket.currentClassroomId);
          if (offlineResult) {
            io.to(`classroom:${socket.currentClassroomId}`).emit('student-left', {
              userId: offlineResult.studentId,
              userName: offlineResult.studentName,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error(`[Socket] Failed to cleanup disconnected classroom member: ${socket.id}`, error.message);
        }
      }

      for (const key of throttleMap.keys()) {
        if (key.startsWith(socket.id + ':')) {
          throttleMap.delete(key);
        }
      }
    });

    socket.on('error', (error) => {
      console.error(`[Socket] Error: ${socket.id}`, error.message);
    });

    return;
    /*
      Legacy duplicate classroom socket handlers kept below were part of the
      pre-hardening implementation. They are intentionally disabled so the
      wrapped handlers above remain the only effective classroom event path.
    console.log(`[Socket] 客户端连接: ${socket.id}, 用户: ${socket.username} (${socket.userId})`);

    // 加入课堂房间
    socket.on('join-classroom', (data) => {
      const classroomId = data && data.classroomId;
      const resolvedUserId = socket.userId || (data && (data.userId || data.senderId)) || 'unknown';
      const resolvedUserName = socket.username || (data && (data.userName || data.senderName)) || '匿名';
      const resolvedUserRole = socket.userRole || (data && (data.userRole || data.role)) || 'student';
      const normalizedAvatar = avatarUtil.normalizeAvatarUrl(data && data.avatar, resolvedUserName || resolvedUserId);
      
      if (!classroomId) {
        socket.emit('error', { message: '课堂ID不能为空' });
        return;
      }

      const room = `classroom:${classroomId}`;
      socket.join(room);
      
      console.log(`[Socket] 用户 ${resolvedUserName}(${resolvedUserId}) 加入课堂 ${classroomId}，角色: ${resolvedUserRole}`);

      // 通知房间内其他用户
      socket.to(room).emit('student-joined', {
        userId: resolvedUserId,
        userName: resolvedUserName,
        userRole: resolvedUserRole,
        timestamp: new Date().toISOString()
      });

      // 确认加入成功
      socket.emit('joined-classroom', {
        classroomId,
        message: '已成功加入课堂'
      });
    });

    // 离开课堂房间
    socket.on('leave-classroom', (data) => {
      const classroomId = data && data.classroomId;
      const resolvedUserId = socket.userId || (data && (data.userId || data.senderId)) || 'unknown';
      const resolvedUserName = socket.username || (data && (data.userName || data.senderName)) || '匿名';

      if (!classroomId) return;
      const room = `classroom:${classroomId}`;
      
      socket.leave(room);
      console.log(`[Socket] 用户 ${resolvedUserName}(${resolvedUserId}) 离开课堂 ${classroomId}`);

      // 通知房间内其他用户
      socket.to(room).emit('student-left', {
        userId: resolvedUserId,
        userName: resolvedUserName,
        timestamp: new Date().toISOString()
      });
    });

    // 代码同步 - 添加节流
    socket.on('code-sync', (data) => {
      if (!throttle(socket.id, 'code-sync', 300)) return;
      
      const { classroomId, code, language } = data;
      const room = `classroom:${classroomId}`;
      
      socket.to(room).emit('code-updated', {
        code,
        language,
        userId: socket.id,
        timestamp: new Date().toISOString()
      });
    });

    // 资源切换同步
    socket.on('resource-change', (data) => {
      const { classroomId, resource } = data;
      const room = `classroom:${classroomId}`;
      
      socket.to(room).emit('resource-changed', {
        resource,
        resourceName: resource ? resource.name : null,
        timestamp: new Date().toISOString()
      });
    });

    // 资源页码同步 - 添加节流
    socket.on('resource-page-sync', (data) => {
      if (!throttle(socket.id, 'resource-page-sync', 200)) return;
      
      const { classroomId, resourceId, page } = data;
      const room = `classroom:${classroomId}`;
      
      socket.to(room).emit('resource-page-synced', {
        resourceId,
        page,
        timestamp: new Date().toISOString()
      });
    });

    // 聊天消息 - 添加节流防止刷屏，并保存到数据库
    socket.on('chat-message', async (data) => {
      // 节流：每500ms最多发送一条消息
      if (!throttle(socket.id, 'chat-message', 500)) return;
      
      let messageData = data;
      let classroomId = data.classroomId;
      const messageType = data.type || data.message_type || 'text';
      const fileKey = data.fileKey || data.fileUrl || data.file_key || null;
      const isHttpFileUrl = typeof fileKey === 'string' && /^https?:\/\//i.test(fileKey);
      const messageContent = data.content || data.message || (messageType === 'file' ? (data.fileName || '') : '');
      const resolvedUserId = socket.userId || data.userId || data.senderId || 'unknown';
      const resolvedUserName = socket.username || data.userName || data.senderName || '匿名';
      const resolvedUserRole = socket.userRole || data.userRole || data.role || 'student';
      
      // 如果没有classroomId，从socket的房间中获取
      if (!classroomId) {
        const rooms = Array.from(socket.rooms);
        const classroomRoom = rooms.find(r => r.startsWith('classroom:'));
        if (classroomRoom) {
          classroomId = classroomRoom.replace('classroom:', '');
        }
      }
      
      if (!classroomId) return;
      
      const room = `classroom:${classroomId}`;
      
      // 生成消息ID和时间戳
      const messageId = uuidv4();
      const createTime = new Date();
      
      // 保存聊天消息到数据库（异步，不阻塞广播）
      try {
        const db = getModels();
        if (db && db.TeachingClassroomChat) {
          const availableColumns = await getAvailableChatTableColumns();
          const createPayload = buildChatCreatePayload({
            id: messageId,
            classroom_id: classroomId,
            user_id: resolvedUserId,
            user_name: resolvedUserName,
            user_role: resolvedUserRole,
            message_type: messageType,
            content: messageContent,
            file_name: data.fileName || null,
            file_size: data.fileSize || null,
            file_type: data.fileType || null,
            file_url: fileKey,
            avatar: normalizedAvatar,
            del_flag: 0,
            create_time: createTime
          }, availableColumns);

          await db.TeachingClassroomChat.create(createPayload);
          console.log(`[Socket] 💬 聊天消息已保存: 课堂 ${classroomId}, 类型: ${messageType}`);
        }
      } catch (err) {
        console.error('[Socket] 保存聊天消息失败:', err.message);
      }
      
      // 广播给房间内所有用户（包括发送者，前端会去重）
      const broadcastData = {
        ...messageData,
        id: messageId,
        type: messageType,
        content: messageContent,
        fileKey,
        fileUrl: data.fileUrl || (isHttpFileUrl ? fileKey : null),
        userId: resolvedUserId,
        userName: resolvedUserName,
        userRole: resolvedUserRole,
        avatar: normalizedAvatar,
        senderId: data.senderId || resolvedUserId,
        senderName: data.senderName || resolvedUserName,
        timestamp: createTime.toISOString()
      };
      io.to(room).emit('chat-message', broadcastData);
    });

    // 课堂文件消息 - OSS直传后的元数据广播
    socket.on('classroom:sendMessage', async (data) => {
      const { classroomId, type, fileKey, fileName, fileSize, fileType, avatar } = data;
      const resolvedUserId = socket.userId || data.userId || 'unknown';
      const resolvedUserName = socket.username || data.userName || '匿名';
      const resolvedUserRole = socket.userRole || data.userRole || 'student';
      const normalizedAvatar = avatarUtil.normalizeAvatarUrl(avatar, resolvedUserName || resolvedUserId);
      
      // 验证必需字段
      if (!classroomId) {
        socket.emit('error', { message: '课堂ID不能为空' });
        return;
      }
      
      const room = `classroom:${classroomId}`;
      
      // 处理文件消息
      if (type === 'file') {
        // 验证文件元数据
        if (!fileKey || !fileName || !fileSize) {
          socket.emit('error', { message: '文件信息不完整' });
          return;
        }
        
        // 生成消息ID和时间戳
        const messageId = uuidv4();
        const createTime = new Date();
        
        try {
          const db = getModels();
          if (db && db.TeachingClassroomChat) {
            const availableColumns = await getAvailableChatTableColumns();
            // 保存文件消息到数据库
            await db.TeachingClassroomChat.create(buildChatCreatePayload({
              id: messageId,
              classroom_id: classroomId,
              user_id: resolvedUserId,
              user_name: resolvedUserName,
              user_role: resolvedUserRole,
              message_type: 'file',
              content: fileName, // 存储文件名到content字段以保持向后兼容
              file_name: fileName,
              file_size: fileSize,
              file_type: fileType,
              file_url: fileKey, // 存储OSS文件key
              avatar: normalizedAvatar,
              create_time: createTime,
              del_flag: 0
            }, availableColumns));
            
            console.log(`[Socket] 📁 文件消息已保存: 课堂 ${classroomId}, 文件: ${fileName}`);
            
            // 广播给房间内所有参与者
            io.to(room).emit('classroom:newMessage', {
              id: messageId,
              classroom_id: classroomId,
              user_id: resolvedUserId,
              user_name: resolvedUserName,
              user_role: resolvedUserRole,
              message_type: 'file',
              content: fileName,
              file_name: fileName,
              file_size: fileSize,
              file_type: fileType,
              file_url: fileKey,
              avatar: normalizedAvatar,
              create_time: createTime.toISOString(),
              timestamp: createTime.toISOString()
            });
          }
        } catch (err) {
          console.error('[Socket] 保存文件消息失败:', err.message);
          socket.emit('error', { message: '文件消息保存失败,请重试' });
        }
      }
    });

    // 开始广播（统一处理PPT/代码/Scratch）
    socket.on('start-broadcast', (data) => {
      // 从socket的房间中获取classroomId
      const rooms = Array.from(socket.rooms);
      const classroomRoom = rooms.find(r => r.startsWith('classroom:'));
      
      if (classroomRoom) {
        const room = classroomRoom;
        const classroomId = classroomRoom.replace('classroom:', '');
        
        console.log(`[Socket] 🔥 开始广播: 课堂 ${classroomId}, 类型: ${data.type}`);
        
        // 广播给房间内所有学生（除了教师自己）
        socket.to(room).emit('broadcast-started', {
          ...data,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // ✅ 广播内容更新（教师切换内容时实时同步）
    socket.on('broadcast-content-update', (data) => {
      const rooms = Array.from(socket.rooms);
      const classroomRoom = rooms.find(r => r.startsWith('classroom:'));
      
      if (classroomRoom) {
        const room = classroomRoom;
        const classroomId = classroomRoom.replace('classroom:', '');
        
        console.log(`[Socket] 🔄 内容更新广播: 课堂 ${classroomId}, 类型: ${data.type}`);
        
        // 广播给房间内所有学生（除了教师自己）
        socket.to(room).emit('broadcast-content-update', {
          ...data,
          isUpdate: true,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // ✅ 广播代码（教师实时同步代码到学生）- 添加节流
    socket.on('broadcast-code', (data) => {
      // 节流：每300ms最多处理一次
      if (!throttle(socket.id, 'broadcast-code', 300)) {
        return;
      }
      
      const rooms = Array.from(socket.rooms);
      const classroomRoom = rooms.find(r => r.startsWith('classroom:'));
      
      if (classroomRoom) {
        const room = classroomRoom;
        
        // 广播给房间内所有学生（除了教师自己）
        socket.to(room).emit('code-updated', {
          code: data.code,
          language: data.language,
          timestamp: new Date().toISOString()
        });
      }
    });

    // 广播屏幕
    socket.on('broadcast-screen', (data) => {
      const { classroomId, screenData } = data;
      const room = `classroom:${classroomId}`;
      
      console.log(`[Socket] 开始屏幕广播: 课堂 ${classroomId}`);
      
      // 通知房间内所有用户
      io.to(room).emit('broadcast-started', {
        screenData,
        timestamp: new Date().toISOString()
      });
    });

    // 停止广播
    socket.on('stop-broadcast', (data) => {
      // 从socket的房间中获取classroomId（如果data中没有）
      let classroomId = data && data.classroomId;
      
      if (!classroomId) {
        const rooms = Array.from(socket.rooms);
        const classroomRoom = rooms.find(r => r.startsWith('classroom:'));
        if (classroomRoom) {
          classroomId = classroomRoom.replace('classroom:', '');
        }
      }
      
      if (classroomId) {
        const room = `classroom:${classroomId}`;
        console.log(`[Socket] 停止广播: 课堂 ${classroomId}`);
        
        // 通知房间内所有用户
        io.to(room).emit('broadcast-stopped', {
          timestamp: new Date().toISOString()
        });
      }
    });

    // PPT广播
    socket.on('broadcast-ppt', (data) => {
      const { pptData, currentSlide } = data;
      
      // 从socket的房间中获取classroomId
      const rooms = Array.from(socket.rooms);
      const classroomRoom = rooms.find(r => r.startsWith('classroom:'));
      
      if (classroomRoom) {
        const room = classroomRoom;
        console.log(`[Socket] PPT广播: ${room}, 当前页: ${currentSlide}`);
        
        // 广播给房间内其他用户
        socket.to(room).emit('ppt-changed', {
          pptData,
          currentSlide,
          timestamp: new Date().toISOString()
        });
      }
    });

    // PPT页码变化
    socket.on('broadcast-slide-change', (data) => {
      const { currentSlide } = data;
      
      // 从socket的房间中获取classroomId
      const rooms = Array.from(socket.rooms);
      const classroomRoom = rooms.find(r => r.startsWith('classroom:'));
      
      if (classroomRoom) {
        const room = classroomRoom;
        console.log(`[Socket] PPT页码变化: ${room}, 页码: ${currentSlide}`);
        
        // 广播给房间内其他用户
        socket.to(room).emit('slide-changed', {
          currentSlide,
          timestamp: new Date().toISOString()
        });
      }
    });

    // 举手
    socket.on('raise-hand', (data) => {
      const { classroomId, userId, userName } = data;
      const room = `classroom:${classroomId}`;
      
      console.log(`[Socket] 学生举手: ${userName}(${userId})`);
      
      // 通知房间内所有用户（教师会收到）
      io.to(room).emit('hand-raised', {
        userId,
        userName,
        timestamp: new Date().toISOString()
      });
    });

    // 断开连接 - 清理节流记录
    socket.on('disconnect', () => {
      // 清理该socket的节流记录
      for (const key of throttleMap.keys()) {
        if (key.startsWith(socket.id + ':')) {
          throttleMap.delete(key);
        }
      }
    });

    // 错误处理
    socket.on('error', (error) => {
      console.error(`[Socket] 错误: ${socket.id}`, error.message);
    });
  */
  });

  // 全局错误处理
  io.engine.on('connection_error', (err) => {
    console.error('[Socket] 连接错误:', err.message);
  });

  console.log('✅ Socket.io服务器已启动（已启用节流优化）');
  return io;
}

/**
 * 获取Socket.io实例
 */
function getIO() {
  return io;
}

/**
 * 向课堂房间广播消息
 */
function broadcastToClassroom(classroomId, event, data) {
  if (io) {
    const room = `classroom:${classroomId}`;
    io.to(room).emit(event, data);
  }
}

module.exports = {
  initSocketServer,
  getIO,
  broadcastToClassroom
};
