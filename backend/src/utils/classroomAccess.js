const models = require('../models');
const Response = require('./response');
const { getTeachingClassroomSelectableAttributes } = require('./classroomSchema');

const ACCESS_ROLE = Object.freeze({
  admin: 'admin',
  teacher: 'teacher',
  student: 'student'
});

const ADMIN_ROLE_ALIASES = new Set(['admin', 'administrator', 'super_admin', 'superadmin', 'school_admin', 'schooladmin', 'root']);
const TEACHER_ROLE_ALIASES = new Set(['teacher', 'lecturer', 'instructor']);
const STUDENT_ROLE_ALIASES = new Set(['student', 'learner']);

function appendRoleCandidates(target, value) {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => appendRoleCandidates(target, item));
    return;
  }

  if (typeof value === 'object') {
    appendRoleCandidates(target, value.role);
    appendRoleCandidates(target, value.roleCode);
    appendRoleCandidates(target, value.code);
    appendRoleCandidates(target, value.name);
    appendRoleCandidates(target, value.value);
    appendRoleCandidates(target, value.authority);
    return;
  }

  const normalizedValue = String(value).trim().toLowerCase();
  if (normalizedValue) {
    target.add(normalizedValue);
  }
}

function getNormalizedRoleCandidates(rawUser = {}) {
  const roleCandidates = new Set();

  appendRoleCandidates(roleCandidates, rawUser.role);
  appendRoleCandidates(roleCandidates, rawUser.roles);
  appendRoleCandidates(roleCandidates, rawUser.userRole);
  appendRoleCandidates(roleCandidates, rawUser.userRoles);
  appendRoleCandidates(roleCandidates, rawUser.userType);
  appendRoleCandidates(roleCandidates, rawUser.type);
  appendRoleCandidates(roleCandidates, rawUser.authority);
  appendRoleCandidates(roleCandidates, rawUser.authorities);

  return Array.from(roleCandidates);
}

function normalizeRoleValue(role) {
  const normalizedRoles = getNormalizedRoleCandidates({ role });
  if (normalizedRoles.some((item) => ADMIN_ROLE_ALIASES.has(item))) {
    return ACCESS_ROLE.admin;
  }
  if (normalizedRoles.some((item) => STUDENT_ROLE_ALIASES.has(item))) {
    return ACCESS_ROLE.student;
  }
  if (normalizedRoles.some((item) => TEACHER_ROLE_ALIASES.has(item))) {
    return ACCESS_ROLE.teacher;
  }
  return null;
}

function resolveUserIdentity(rawUser = {}) {
  const identityValue = rawUser.userIdentity !== undefined && rawUser.userIdentity !== null
    ? rawUser.userIdentity
    : rawUser.user_identity;
  const identity = Number(identityValue);
  return Number.isFinite(identity) && identity > 0 ? identity : null;
}

function resolveRequestRole(rawUser = {}) {
  const userIdentity = resolveUserIdentity(rawUser);
  if (userIdentity === 1) {
    return ACCESS_ROLE.admin;
  }
  if (userIdentity === 3) {
    return ACCESS_ROLE.student;
  }
  if (userIdentity === 2) {
    return ACCESS_ROLE.teacher;
  }

  const normalizedRoles = getNormalizedRoleCandidates(rawUser);
  if (normalizedRoles.some((item) => ADMIN_ROLE_ALIASES.has(item))) {
    return ACCESS_ROLE.admin;
  }
  if (normalizedRoles.some((item) => STUDENT_ROLE_ALIASES.has(item))) {
    return ACCESS_ROLE.student;
  }
  if (normalizedRoles.some((item) => TEACHER_ROLE_ALIASES.has(item))) {
    return ACCESS_ROLE.teacher;
  }

  return normalizeRoleValue(rawUser.role);
}

function getRequestUserContext(req) {
  const rawUser = req && req.user ? req.user : {};
  const userRole = resolveRequestRole(rawUser);

  return {
    userId: rawUser.id || rawUser.userId || rawUser.user_id || null,
    username: rawUser.username || rawUser.userName || null,
    realname: rawUser.realname || rawUser.realName || rawUser.username || null,
    userIdentity: resolveUserIdentity(rawUser),
    userRole
  };
}

function resolveClassroomId(req, explicitClassroomId) {
  if (explicitClassroomId) {
    return explicitClassroomId;
  }

  return (req && req.params && (req.params.classroomId || req.params.id))
    || (req && req.body && (req.body.classroomId || req.body.id))
    || (req && req.query && (req.query.classroomId || req.query.id))
    || null;
}

function isTeacherOrAdmin(user) {
  return user && [ACCESS_ROLE.admin, ACCESS_ROLE.teacher].includes(user.userRole);
}

async function resolveStudentRecord(userId, username) {
  if (!models.TeachingStudent) {
    return null;
  }

  let studentRecord = null;

  if (userId) {
    studentRecord = await models.TeachingStudent.findOne({
      where: {
        id: userId,
        del_flag: 0
      }
    });
  }

  if (!studentRecord && username) {
    studentRecord = await models.TeachingStudent.findOne({
      where: {
        [models.Sequelize.Op.or]: [
          { username },
          { student_no: username }
        ],
        del_flag: 0
      }
    });
  }

  if (!studentRecord && userId && models.SysUser) {
    const sysUser = await models.SysUser.findOne({
      where: {
        id: userId,
        del_flag: 0
      }
    });

    if (sysUser && sysUser.username) {
      studentRecord = await models.TeachingStudent.findOne({
        where: {
          [models.Sequelize.Op.or]: [
            { username: sysUser.username },
            { student_no: sysUser.username }
          ],
          del_flag: 0
        }
      });
    }
  }

  return studentRecord;
}

async function getClassroomAccessContext(req, explicitClassroomId) {
  const classroomId = resolveClassroomId(req, explicitClassroomId);
  if (!classroomId) {
    return {
      ok: false,
      statusCode: 400,
      reason: 'bad_request',
      message: '课堂ID不能为空',
      classroomId: null
    };
  }

  if (!models.TeachingClassroom) {
    return {
      ok: false,
      statusCode: 500,
      reason: 'server_error',
      message: '课堂服务初始化失败',
      classroomId
    };
  }

  const classroomAttributes = await getTeachingClassroomSelectableAttributes();
  const classroom = await models.TeachingClassroom.findOne({
    where: {
      id: classroomId,
      del_flag: 0
    },
    attributes: classroomAttributes
  });

  if (!classroom) {
    return {
      ok: false,
      statusCode: 404,
      reason: 'not_found',
      message: '课堂不存在',
      classroomId
    };
  }

  const user = getRequestUserContext(req);
  const isAdmin = user.userRole === ACCESS_ROLE.admin;
  const isTeacherOwner = classroom.teacher_id && user.userId
    && String(classroom.teacher_id) === String(user.userId);

  if (isAdmin || isTeacherOwner) {
    return {
      ok: true,
      classroomId,
      classroom,
      accessRole: isAdmin ? ACCESS_ROLE.admin : ACCESS_ROLE.teacher,
      user,
      studentRecord: null,
      candidateStudentIds: user.userId ? [String(user.userId)] : []
    };
  }

  const studentRecord = await resolveStudentRecord(user.userId, user.username);
  const candidateStudentIds = Array.from(new Set(
    [user.userId, studentRecord && studentRecord.id]
      .filter(Boolean)
      .map(value => String(value))
  ));

  let isClassMember = false;
  if (studentRecord && classroom.class_id && models.TeachingClassStudent) {
    const classMember = await models.TeachingClassStudent.findOne({
      where: {
        class_id: classroom.class_id,
        student_id: studentRecord.id,
        del_flag: 0,
        status: 1
      },
      attributes: ['id']
    });
    isClassMember = Boolean(classMember);
  }

  let classroomMembership = null;
  if (candidateStudentIds.length > 0 && models.TeachingClassroomStudent) {
    classroomMembership = await models.TeachingClassroomStudent.findOne({
      where: {
        classroom_id: classroomId,
        student_id: candidateStudentIds.length === 1
          ? candidateStudentIds[0]
          : { [models.Sequelize.Op.in]: candidateStudentIds }
      }
    });
  }

  if (isClassMember || classroomMembership) {
    return {
      ok: true,
      classroomId,
      classroom,
      accessRole: ACCESS_ROLE.student,
      user: {
        ...user,
        studentId: studentRecord && studentRecord.id
          ? String(studentRecord.id)
          : (candidateStudentIds[0] || null)
      },
      studentRecord,
      classroomMembership,
      candidateStudentIds
    };
  }

  return {
    ok: false,
    statusCode: 403,
    reason: 'forbidden',
    message: '您不是该课堂成员，无法访问该课堂内容',
    classroomId,
    classroom,
    user,
    studentRecord,
    candidateStudentIds
  };
}

async function ensureClassroomAccess(req, explicitClassroomId, options = {}) {
  const access = await getClassroomAccessContext(req, explicitClassroomId);
  if (!access.ok) {
    return access;
  }

  if (options.teacherOnly && ![ACCESS_ROLE.admin, ACCESS_ROLE.teacher].includes(access.accessRole)) {
    return {
      ...access,
      ok: false,
      statusCode: 403,
      reason: 'forbidden',
      message: '仅教师或管理员可执行该操作'
    };
  }

  if (options.studentOnly && access.accessRole !== ACCESS_ROLE.student) {
    return {
      ...access,
      ok: false,
      statusCode: 403,
      reason: 'forbidden',
      message: '仅学生可执行该操作'
    };
  }

  return access;
}

function ensureRequestRole(req, options = {}) {
  const user = getRequestUserContext(req);

  if (options.teacherOnly && !isTeacherOrAdmin(user)) {
    return {
      ok: false,
      statusCode: 403,
      reason: 'forbidden',
      message: '仅教师或管理员可执行该操作',
      user
    };
  }

  if (options.studentOnly && user.userRole !== ACCESS_ROLE.student) {
    return {
      ok: false,
      statusCode: 403,
      reason: 'forbidden',
      message: '仅学生可执行该操作',
      user
    };
  }

  return {
    ok: true,
    user,
    accessRole: user.userRole
  };
}

function sendClassroomAccessError(res, accessResult) {
  const statusCode = accessResult && accessResult.statusCode ? accessResult.statusCode : 403;
  const message = accessResult && accessResult.message
    ? accessResult.message
    : '无权访问该课堂';
  return res.status(statusCode).json(Response.error(message, statusCode));
}

function createClassroomAccessMiddleware(options = {}) {
  return async (req, res, next) => {
    try {
      const classroomId = resolveClassroomId(req, options.classroomId);
      const access = await ensureClassroomAccess(req, classroomId, options);
      if (!access.ok) {
        return sendClassroomAccessError(res, access);
      }

      req.classroomAccess = access;
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  ACCESS_ROLE,
  createClassroomAccessMiddleware,
  ensureClassroomAccess,
  ensureRequestRole,
  getClassroomAccessContext,
  getRequestUserContext,
  resolveClassroomId,
  resolveStudentRecord,
  sendClassroomAccessError
};
