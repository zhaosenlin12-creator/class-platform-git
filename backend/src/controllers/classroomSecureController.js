const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const classroomController = require('./classroomController');
const resourceController = require('./resourceController');
const models = require('../models');
const Response = require('../utils/response');
const uuidUtil = require('../utils/uuid');
const { getIO } = require('../socketServer');
const { logger } = require('../middleware/logger');
const { resolvePathWithinDir } = require('../utils/fileSecurity');
const { getTeachingCourseUnitSelectableAttributes } = require('../utils/courseUnitSchema');
const {
  ACCESS_ROLE,
  ensureClassroomAccess,
  ensureRequestRole,
  sendClassroomAccessError
} = require('../utils/classroomAccess');

const secureController = {
  ...classroomController
};

function getCandidateStudentIds(access) {
  return Array.isArray(access && access.candidateStudentIds)
    ? access.candidateStudentIds.filter(Boolean).map(value => String(value))
    : [];
}

function getResolvedStudentId(access) {
  if (access && access.user && access.user.studentId) {
    return String(access.user.studentId);
  }

  const candidateIds = getCandidateStudentIds(access);
  return candidateIds.length > 0 ? candidateIds[0] : null;
}

function getAccessStudentIds(access) {
  const ids = getCandidateStudentIds(access);
  const resolvedStudentId = getResolvedStudentId(access);

  if (resolvedStudentId && !ids.includes(String(resolvedStudentId))) {
    ids.unshift(String(resolvedStudentId));
  }

  return Array.from(new Set(ids));
}

function getMembershipCondition(access) {
  const studentIds = getAccessStudentIds(access);
  if (studentIds.length > 1) {
    return { [Op.in]: studentIds };
  }
  return studentIds[0] || null;
}

function getAccessStudentName(access, fallbackName) {
  return (access.studentRecord && access.studentRecord.realname)
    || fallbackName
    || (access.user && (access.user.realname || access.user.username))
    || null;
}

function getLegacyCompatibleUser(req, access, options = {}) {
  const resolvedStudentId = getResolvedStudentId(access);
  const userIdentity = access.accessRole === ACCESS_ROLE.admin
    ? 1
    : (access.accessRole === ACCESS_ROLE.teacher ? 2 : 3);

  return {
    ...(req.user || {}),
    id: access.accessRole === ACCESS_ROLE.student
      ? (resolvedStudentId || access.user.userId)
      : (access.user.userId || resolvedStudentId),
    username: access.user.username || (req.user && req.user.username) || null,
    realname: getAccessStudentName(access, options.fallbackName)
      || (req.user && req.user.realname)
      || (req.user && req.user.username)
      || null,
    userIdentity,
    role: access.accessRole
  };
}

async function getRequestClassroomAccess(req, classroomId, options = {}) {
  const cached = req.classroomAccess;
  if (cached && cached.ok && (!classroomId || String(cached.classroomId) === String(classroomId))) {
    if (options.teacherOnly && ![ACCESS_ROLE.admin, ACCESS_ROLE.teacher].includes(cached.accessRole)) {
      return {
        ...cached,
        ok: false,
        statusCode: 403,
        message: '仅教师或管理员可执行该操作'
      };
    }

    if (options.studentOnly && cached.accessRole !== ACCESS_ROLE.student) {
      return {
        ...cached,
        ok: false,
        statusCode: 403,
        message: '仅学生可执行该操作'
      };
    }

    return cached;
  }

  const access = await ensureClassroomAccess(req, classroomId, options);
  if (access.ok) {
    req.classroomAccess = access;
  }
  return access;
}

async function countOnlineStudents(classroomId) {
  return models.TeachingClassroomStudent.count({
    where: {
      classroom_id: classroomId,
      status: 'online'
    }
  });
}

async function syncClassroomCurrentStudents(classroomId) {
  const onlineCount = await countOnlineStudents(classroomId);
  await models.TeachingClassroom.update(
    {
      current_students: onlineCount,
      update_time: new Date()
    },
    {
      where: { id: classroomId }
    }
  );
  return onlineCount;
}

function cleanupUploadedFile(file) {
  if (!file || !file.path) {
    return;
  }

  fs.unlink(file.path, () => {});
}

async function resolveLinkedClassroomResourceId(classroom) {
  if (!classroom) {
    return null;
  }

  if (classroom.resource_id) {
    return String(classroom.resource_id);
  }

  if (!classroom.lesson_id) {
    return null;
  }

  const lessonAttributes = await getTeachingCourseUnitSelectableAttributes();
  const lesson = await models.TeachingCourseUnit.findOne({
    where: { id: classroom.lesson_id, del_flag: 0 },
    attributes: lessonAttributes,
    raw: true
  });

  return lesson && lesson.resource_id ? String(lesson.resource_id) : null;
}

async function getClassroomResourceContext(req, classroomId, requestedResourceId) {
  const access = await getRequestClassroomAccess(req, classroomId);
  if (!access.ok) {
    return { ok: false, access };
  }

  const linkedResourceId = await resolveLinkedClassroomResourceId(access.classroom);
  if (!linkedResourceId) {
    return {
      ok: false,
      statusCode: 404,
      message: 'Classroom resource is not configured'
    };
  }

  if (requestedResourceId && String(requestedResourceId) !== linkedResourceId) {
    return {
      ok: false,
      statusCode: 403,
      message: 'Requested resource does not belong to the classroom'
    };
  }

  return {
    ok: true,
    access,
    resourceId: linkedResourceId
  };
}

secureController.createClassroom = async (req, res, next) => {
  try {
    const roleCheck = ensureRequestRole(req, { teacherOnly: true });
    if (!roleCheck.ok) {
      return sendClassroomAccessError(res, roleCheck);
    }

    return classroomController.createClassroom(req, res, next);
  } catch (error) {
    next(error);
  }
};

secureController.updateClassroom = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const access = await getRequestClassroomAccess(req, classroomId, { teacherOnly: true });
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    return classroomController.updateClassroom(req, res, next);
  } catch (error) {
    next(error);
  }
};

secureController.deleteClassroom = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const access = await getRequestClassroomAccess(req, classroomId, { teacherOnly: true });
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    return classroomController.deleteClassroom(req, res, next);
  } catch (error) {
    next(error);
  }
};

secureController.getClassroomStudents = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const access = await getRequestClassroomAccess(req, classroomId, { teacherOnly: true });
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    return classroomController.getClassroomStudents(req, res, next);
  } catch (error) {
    next(error);
  }
};

secureController.startClassroom = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const access = await getRequestClassroomAccess(req, classroomId, { teacherOnly: true });
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    return classroomController.startClassroom(req, res, next);
  } catch (error) {
    next(error);
  }
};

secureController.endClassroom = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const access = await getRequestClassroomAccess(req, classroomId, { teacherOnly: true });
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    return classroomController.endClassroom(req, res, next);
  } catch (error) {
    next(error);
  }
};

secureController.updateClassroomStatus = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const access = await getRequestClassroomAccess(req, classroomId, { teacherOnly: true });
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    return classroomController.updateClassroomStatus(req, res, next);
  } catch (error) {
    next(error);
  }
};

secureController.broadcastScreen = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const access = await getRequestClassroomAccess(req, classroomId, { teacherOnly: true });
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    return classroomController.broadcastScreen(req, res, next);
  } catch (error) {
    next(error);
  }
};

secureController.raiseHand = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const access = await getRequestClassroomAccess(req, classroomId, { studentOnly: true });
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    req.user = getLegacyCompatibleUser(req, access);
    return classroomController.raiseHand(req, res, next);
  } catch (error) {
    next(error);
  }
};

secureController.chat = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const access = await getRequestClassroomAccess(req, classroomId);
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    req.user = getLegacyCompatibleUser(req, access);
    return classroomController.chat(req, res, next);
  } catch (error) {
    next(error);
  }
};

secureController.codeSync = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const access = await getRequestClassroomAccess(req, classroomId, { teacherOnly: true });
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    req.user = getLegacyCompatibleUser(req, access);
    return classroomController.codeSync(req, res, next);
  } catch (error) {
    next(error);
  }
};

secureController.getChatHistory = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const access = await getRequestClassroomAccess(req, classroomId);
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    return classroomController.getChatHistory(req, res, next);
  } catch (error) {
    next(error);
  }
};

secureController.saveDemoContent = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const access = await getRequestClassroomAccess(req, classroomId, { teacherOnly: true });
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    return classroomController.saveDemoContent(req, res, next);
  } catch (error) {
    next(error);
  }
};

secureController.getDemoContent = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const access = await getRequestClassroomAccess(req, classroomId);
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    return classroomController.getDemoContent(req, res, next);
  } catch (error) {
    next(error);
  }
};

secureController.uploadClassroomFile = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const access = await getRequestClassroomAccess(req, classroomId);
    if (!access.ok) {
      cleanupUploadedFile(req.file);
      return sendClassroomAccessError(res, access);
    }

    return classroomController.uploadClassroomFile(req, res, next);
  } catch (error) {
    cleanupUploadedFile(req.file);
    next(error);
  }
};

secureController.getUploadToken = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const access = await getRequestClassroomAccess(req, classroomId);
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    return classroomController.getUploadToken(req, res, next);
  } catch (error) {
    next(error);
  }
};

secureController.getFileUrl = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id || (req.body && req.body.classroomId);
    const access = await getRequestClassroomAccess(req, classroomId);
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    return classroomController.getFileUrl(req, res, next);
  } catch (error) {
    next(error);
  }
};

secureController.previewClassroomResource = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const requestedResourceId = req.params.resourceId || req.params.id;
    const context = await getClassroomResourceContext(req, classroomId, requestedResourceId);

    if (!context.ok) {
      if (context.access) {
        return sendClassroomAccessError(res, context.access);
      }
      return res.status(context.statusCode || 403).json(Response.error(context.message || 'Classroom resource access denied', context.statusCode || 403));
    }

    const originalId = req.params.id;
    req.params.id = context.resourceId;
    try {
      return await resourceController.previewResource(req, res);
    } finally {
      req.params.id = originalId;
    }
  } catch (error) {
    next(error);
  }
};

secureController.downloadClassroomResource = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const requestedResourceId = req.params.resourceId || req.params.id;
    const context = await getClassroomResourceContext(req, classroomId, requestedResourceId);

    if (!context.ok) {
      if (context.access) {
        return sendClassroomAccessError(res, context.access);
      }
      return res.status(context.statusCode || 403).json(Response.error(context.message || 'Classroom resource access denied', context.statusCode || 403));
    }

    const originalId = req.params.id;
    req.params.id = context.resourceId;
    try {
      return await resourceController.downloadResource(req, res);
    } finally {
      req.params.id = originalId;
    }
  } catch (error) {
    next(error);
  }
};

secureController.getClassroomResourceShareLink = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const requestedResourceId = req.params.resourceId || req.params.id;
    const context = await getClassroomResourceContext(req, classroomId, requestedResourceId);

    if (!context.ok) {
      if (context.access) {
        return sendClassroomAccessError(res, context.access);
      }
      return res.status(context.statusCode || 403).json(Response.error(context.message || 'Classroom resource access denied', context.statusCode || 403));
    }

    const originalId = req.params.id;
    req.params.id = context.resourceId;
    try {
      return await resourceController.getResourceShareLink(req, res);
    } finally {
      req.params.id = originalId;
    }
  } catch (error) {
    next(error);
  }
};

secureController.joinClassroom = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const access = await getRequestClassroomAccess(req, classroomId, { studentOnly: true });
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    const classroom = access.classroom;
    const studentId = getResolvedStudentId(access);
    const studentName = getAccessStudentName(access);

    if (!studentId) {
      return res.status(400).json(Response.error('Invalid student identity', 400));
    }

    const membershipCondition = getMembershipCondition(access);
    const existing = membershipCondition
      ? await models.TeachingClassroomStudent.findOne({
          where: {
            classroom_id: classroomId,
            student_id: membershipCondition
          }
        })
      : null;

    if (existing && existing.status === 'online') {
      const onlineCount = await syncClassroomCurrentStudents(classroomId);
      return res.json(Response.success({
        ...existing.get({ plain: true }),
        onlineCount,
        alreadyJoined: true
      }, 'Already joined classroom'));
    }

    const currentStudents = await countOnlineStudents(classroomId);
    const maxStudentsValue = Number(classroom.max_students || 0);
    if (maxStudentsValue > 0 && currentStudents >= maxStudentsValue) {
      return res.json(Response.error('Classroom is full', 400));
    }

    const joinTime = new Date();
    let classroomStudent = existing;
    if (classroomStudent) {
      await classroomStudent.update({
        student_id: studentId,
        student_name: studentName,
        join_time: joinTime,
        leave_time: null,
        status: 'online',
        is_present: 1
      });
    } else {
      classroomStudent = await models.TeachingClassroomStudent.create({
        id: uuidUtil.generate(),
        classroom_id: classroomId,
        student_id: studentId,
        student_name: studentName,
        join_time: joinTime,
        status: 'online',
        is_present: 1
      });
    }

    const onlineCount = await syncClassroomCurrentStudents(classroomId);

    const io = getIO();
    if (io) {
      io.to(`classroom:${classroomId}`).emit('student-joined', {
        studentId,
        studentName,
        status: 'idle',
        needHelp: false,
        timestamp: new Date().toISOString()
      });
    }

    return res.json(Response.success({
      ...classroomStudent.get({ plain: true }),
      onlineCount
    }, 'Joined classroom'));
  } catch (error) {
    next(error);
  }
};

secureController.leaveClassroom = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const access = await getRequestClassroomAccess(req, classroomId, { studentOnly: true });
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    const resolvedStudentId = getResolvedStudentId(access);
    const membershipCondition = getMembershipCondition(access);
    const classroomStudent = membershipCondition
      ? await models.TeachingClassroomStudent.findOne({
          where: {
            classroom_id: classroomId,
            student_id: membershipCondition,
            status: 'online'
          }
        })
      : null;

    if (!classroomStudent) {
      const onlineCount = await syncClassroomCurrentStudents(classroomId);
      return res.json(Response.success({
        onlineCount,
        alreadyLeft: true
      }, 'Student already left classroom'));
    }

    const studentName = getAccessStudentName(access, classroomStudent.student_name);
    const durationMinutes = classroomStudent.join_time
      ? Math.floor((new Date() - new Date(classroomStudent.join_time)) / 60000)
      : 0;

    await classroomStudent.update({
      student_id: resolvedStudentId || classroomStudent.student_id,
      student_name: studentName,
      leave_time: new Date(),
      status: 'offline',
      duration: durationMinutes
    });

    const onlineCount = await syncClassroomCurrentStudents(classroomId);

    const io = getIO();
    if (io) {
      io.to(`classroom:${classroomId}`).emit('student-left', {
        studentId: resolvedStudentId || classroomStudent.student_id,
        studentName,
        timestamp: new Date().toISOString()
      });
    }

    return res.json(Response.success({
      onlineCount
    }, 'Left classroom'));
  } catch (error) {
    next(error);
  }
};

secureController.getClassroomNotes = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId || req.params.id;
    const access = await getRequestClassroomAccess(req, classroomId, { studentOnly: true });
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    const studentIds = getAccessStudentIds(access);
    const resolvedStudentId = getResolvedStudentId(access);
    if (studentIds.length === 0) {
      return res.status(400).json(Response.error('未找到有效的学生身份', 400));
    }

    const notes = await models.TeachingClassroomNote.findAll({
      where: {
        classroom_id: classroomId,
        student_id: studentIds.length > 1 ? { [Op.in]: studentIds } : studentIds[0],
        del_flag: 0
      },
      order: [['update_time', 'DESC']]
    });

    const note = notes.find(item => resolvedStudentId && String(item.student_id) === String(resolvedStudentId))
      || notes[0]
      || null;

    if (!note) {
      return res.json(Response.success(null, '暂无笔记'));
    }

    res.json(Response.success({
      id: note.id,
      classroomId: note.classroom_id,
      studentId: note.student_id,
      content: note.content,
      createTime: note.create_time,
      updateTime: note.update_time
    }, '获取成功'));
  } catch (error) {
    logger.error('[GET NOTES] 获取课堂笔记失败:', error);
    next(error);
  }
};

secureController.saveClassroomNotes = async (req, res, next) => {
  try {
    const { classroomId, content } = req.body;
    const access = await getRequestClassroomAccess(req, classroomId, { studentOnly: true });
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    const studentIds = getAccessStudentIds(access);
    const resolvedStudentId = getResolvedStudentId(access);
    if (!resolvedStudentId) {
      return res.status(400).json(Response.error('未找到有效的学生身份', 400));
    }

    const existingNotes = studentIds.length > 0
      ? await models.TeachingClassroomNote.findAll({
          where: {
            classroom_id: classroomId,
            student_id: studentIds.length > 1 ? { [Op.in]: studentIds } : studentIds[0],
            del_flag: 0
          },
          order: [['update_time', 'DESC']]
        })
      : [];

    let note = existingNotes.find(item => String(item.student_id) === String(resolvedStudentId))
      || existingNotes[0]
      || null;

    if (note) {
      await note.update({
        student_id: resolvedStudentId,
        content: content || '',
        update_time: new Date()
      });
    } else {
      note = await models.TeachingClassroomNote.create({
        id: require('uuid').v4(),
        classroom_id: classroomId,
        student_id: resolvedStudentId,
        content: content || '',
        create_time: new Date(),
        update_time: new Date(),
        del_flag: 0
      });
    }

    res.json(Response.success({
      id: note.id,
      classroomId: note.classroom_id,
      studentId: note.student_id,
      updateTime: note.update_time
    }, '保存成功'));
  } catch (error) {
    logger.error('[SAVE NOTES] 保存课堂笔记失败:', error);
    next(error);
  }
};

secureController.downloadClassroomFile = async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId;
    const access = await getRequestClassroomAccess(req, classroomId);
    if (!access.ok) {
      return sendClassroomAccessError(res, access);
    }

    const rawFilename = decodeURIComponent(req.params.filename || '');
    if (!classroomId || !rawFilename) {
      return res.status(400).json(Response.error('参数不完整', 400));
    }

    if (
      rawFilename.includes('..') ||
      rawFilename.includes('/') ||
      rawFilename.includes('\\') ||
      rawFilename.includes('\0')
    ) {
      logger.warn(`[CLASSROOM FILE] 非法文件名: ${rawFilename}, userId=${access.user.userId}`);
      return res.status(403).json(Response.error('非法文件路径', 403));
    }

    const classroomDir = path.join(__dirname, '../../uploads/classroom');
    let filePath;
    try {
      filePath = resolvePathWithinDir(classroomDir, rawFilename);
    } catch (error) {
      return res.status(403).json(Response.error('非法文件路径', 403));
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json(Response.error('文件不存在或已过期', 404));
    }

    logger.info(`[CLASSROOM FILE DOWNLOAD] userId=${access.user.userId}, classroomId=${classroomId}, file=${rawFilename}`);

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(rawFilename)}`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (error) => {
      logger.error('课堂文件读取失败:', error);
      if (!res.headersSent) {
        res.status(500).json(Response.error('文件读取失败', 500));
      }
    });
    fileStream.pipe(res);
  } catch (error) {
    logger.error('下载课堂文件失败:', error);
    next(error);
  }
};

module.exports = secureController;
