/**
 * 用户认证控制器
 * 处理登录、登出、获取权限等
 */

const models = require('../models');
const Response = require('../utils/response');
const jwtUtil = require('../utils/jwt');
const encryptUtil = require('../utils/encrypt');
const { Op, QueryTypes } = require('sequelize');
const { checkLoginAllowed, recordLoginFailure, recordLoginSuccess } = require('../utils/loginThrottle');
const { setAuthTokenCookie, clearAuthTokenCookie } = require('../utils/authCookie');
const { logger } = require('../middleware/logger');
const avatarUtil = require('../utils/avatar');
const auth = require('../middleware/auth');
const { getTeachingStudentColumnSet, getTeachingStudentSelectableAttributes } = require('../utils/studentSchema');

let cachedSysUserColumnSetPromise = null;
const cachedTableSchemaPromises = new Map();

function resolveUserTypeFromIdentity(userIdentity) {
  if (userIdentity === 1) {
    return 'admin';
  }

  if (userIdentity === 3) {
    return 'student';
  }

  return 'teacher';
}

async function getSysUserColumnSet() {
  if (!cachedSysUserColumnSetPromise) {
    cachedSysUserColumnSetPromise = models.sequelize
      .getQueryInterface()
      .describeTable('sys_user')
      .then((schema) => new Set(Object.keys(schema || {})))
      .catch((error) => {
        logger.warn('Compat fallback: failed to describe sys_user table', {
          error: error.message
        });
        return null;
      });
  }

  return cachedSysUserColumnSetPromise;
}

async function getTableSchema(tableName) {
  if (!cachedTableSchemaPromises.has(tableName)) {
    cachedTableSchemaPromises.set(
      tableName,
      models.sequelize
        .getQueryInterface()
        .describeTable(tableName)
        .catch((error) => {
          logger.warn('Duplicate check schema lookup failed', {
            tableName,
            error: error.message
          });
          return null;
        })
    );
  }

  return cachedTableSchemaPromises.get(tableName);
}

async function buildCompatibleSysUserUpdateData(requestedUpdateData) {
  const columnSet = await getSysUserColumnSet();
  const rawAttributes = (models.SysUser && models.SysUser.rawAttributes) || {};
  const compatibleUpdateData = {};

  Object.entries(requestedUpdateData || {}).forEach(([attributeName, value]) => {
    if (value === undefined) {
      return;
    }

    const fieldName = rawAttributes[attributeName] && rawAttributes[attributeName].field
      ? rawAttributes[attributeName].field
      : attributeName;

    if (!columnSet || columnSet.has(fieldName)) {
      compatibleUpdateData[attributeName] = value;
    }
  });

  return compatibleUpdateData;
}

async function buildCompatibleTeachingStudentUpdateData(requestedUpdateData) {
  const columnSet = await getTeachingStudentColumnSet();
  const rawAttributes = (models.TeachingStudent && models.TeachingStudent.rawAttributes) || {};
  const compatibleUpdateData = {};

  Object.entries(requestedUpdateData || {}).forEach(([attributeName, value]) => {
    if (value === undefined || !Object.prototype.hasOwnProperty.call(rawAttributes, attributeName)) {
      return;
    }

    const fieldName = rawAttributes[attributeName] && rawAttributes[attributeName].field
      ? rawAttributes[attributeName].field
      : attributeName;

    if (!columnSet || columnSet.has(fieldName)) {
      compatibleUpdateData[attributeName] = value;
    }
  });

  return compatibleUpdateData;
}

function normalizeDateOnlyValue(value) {
  if (!value) {
    return '';
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return '';
  }

  return normalized.includes('T')
    ? normalized.split('T')[0]
    : normalized;
}

async function resolveCurrentStudentRecord(req) {
  const studentId = String(req.user?.id || '').trim();
  const username = String(req.user?.username || '').trim();
  const selectableAttributes = await getTeachingStudentSelectableAttributes();
  const selectableAttributeSet = new Set(selectableAttributes);
  const orConditions = [];

  if (studentId) {
    orConditions.push({ id: studentId });
  }

  if (username && selectableAttributeSet.has('student_no')) {
    orConditions.push({ student_no: username });
  }

  if (username && selectableAttributeSet.has('username')) {
    orConditions.push({ username });
  }

  if (orConditions.length === 0) {
    return null;
  }

  return models.TeachingStudent.findOne({
    where: {
      del_flag: 0,
      [Op.or]: orConditions
    },
    attributes: selectableAttributes,
    raw: true
  });
}

async function resolveCurrentStudentClassName(studentId) {
  if (!studentId || !models.TeachingClassStudent || !models.TeachingClass) {
    return '';
  }

  const classRelation = await models.TeachingClassStudent.findOne({
    where: {
      student_id: studentId
    },
    order: [
      ['status', 'ASC'],
      ['join_date', 'DESC'],
      ['create_time', 'DESC']
    ],
    raw: true
  });

  if (!classRelation || !classRelation.class_id) {
    return '';
  }

  const teachingClass = await models.TeachingClass.findOne({
    where: {
      id: classRelation.class_id,
      del_flag: 0
    },
    attributes: ['class_name'],
    raw: true
  });

  return teachingClass && teachingClass.class_name
    ? String(teachingClass.class_name).trim()
    : '';
}

async function enrichUserInfoWithStudentProfile(req, userInfo) {
  const normalizedUserInfo = { ...(userInfo || {}) };
  const userIdentity = Number(normalizedUserInfo.user_identity || normalizedUserInfo.userIdentity || 0);

  normalizedUserInfo.userIdentity = userIdentity;
  normalizedUserInfo.userType = resolveUserTypeFromIdentity(userIdentity);

  if (normalizedUserInfo.birthday) {
    normalizedUserInfo.birthday = normalizeDateOnlyValue(normalizedUserInfo.birthday);
  }

  if (userIdentity !== 3) {
    normalizedUserInfo.realName = normalizedUserInfo.realname || normalizedUserInfo.realName || normalizedUserInfo.username || '';
    return normalizedUserInfo;
  }

  const student = await resolveCurrentStudentRecord(req);
  if (!student) {
    normalizedUserInfo.realName = normalizedUserInfo.realname || normalizedUserInfo.realName || normalizedUserInfo.username || '';
    return normalizedUserInfo;
  }

  const className = await resolveCurrentStudentClassName(student.id);
  const resolvedRealname = normalizedUserInfo.realname || student.realname || normalizedUserInfo.username || '';
  const resolvedBirthday = normalizeDateOnlyValue(normalizedUserInfo.birthday || student.birthday);

  return {
    ...normalizedUserInfo,
    studentId: student.id || normalizedUserInfo.id,
    workNo: student.student_no || normalizedUserInfo.workNo || normalizedUserInfo.username || '',
    departName: className || normalizedUserInfo.departName || '',
    className: className || normalizedUserInfo.className || '',
    realname: resolvedRealname,
    realName: resolvedRealname,
    birthday: resolvedBirthday,
    sex: normalizedUserInfo.sex !== undefined && normalizedUserInfo.sex !== null ? normalizedUserInfo.sex : student.sex,
    phone: normalizedUserInfo.phone || student.phone || '',
    email: normalizedUserInfo.email || student.email || '',
    learningStatus: student.learning_status || normalizedUserInfo.learningStatus || '',
    studentStatus: student.status !== undefined ? student.status : normalizedUserInfo.studentStatus
  };
}

exports.duplicateCheck = async (req, res, next) => {
  try {
    const tableName = String(req.query?.tableName || '').trim();
    const fieldName = String(req.query?.fieldName || '').trim();
    const fieldVal = req.query?.fieldVal;
    const dataId = String(req.query?.dataId || '').trim();

    if (!tableName || !fieldName || fieldVal === undefined || fieldVal === null || fieldVal === '') {
      return res.json(Response.success(true));
    }

    if (!/^[a-zA-Z0-9_]+$/.test(tableName) || !/^[a-zA-Z0-9_]+$/.test(fieldName)) {
      return res.json(Response.error('非法的重复校验参数', 400));
    }

    const tableSchema = await getTableSchema(tableName);
    if (!tableSchema) {
      return res.json(Response.error('校验表不存在', 404));
    }

    if (!Object.prototype.hasOwnProperty.call(tableSchema, fieldName)) {
      return res.json(Response.error('校验字段不存在', 404));
    }

    const primaryKeyColumn = Object.entries(tableSchema).find(([, columnSchema]) => columnSchema && columnSchema.primaryKey)?.[0]
      || (Object.prototype.hasOwnProperty.call(tableSchema, 'id') ? 'id' : null);
    const supportsSoftDelete = Object.prototype.hasOwnProperty.call(tableSchema, 'del_flag');
    const replacements = { fieldVal };
    const conditions = [`\`${fieldName}\` = :fieldVal`];

    if (supportsSoftDelete) {
      conditions.push('`del_flag` = 0');
    }

    if (dataId && primaryKeyColumn) {
      conditions.push(`\`${primaryKeyColumn}\` <> :dataId`);
      replacements.dataId = dataId;
    }

    const sql = `SELECT COUNT(1) AS duplicateCount FROM \`${tableName}\` WHERE ${conditions.join(' AND ')} LIMIT 1`;
    const [result] = await models.sequelize.query(sql, {
      replacements,
      type: QueryTypes.SELECT
    });
    const duplicateCount = Number(result && result.duplicateCount) || 0;

    if (duplicateCount > 0) {
      return res.json(Response.error('该值已存在', 200));
    }

    return res.json(Response.success(true));
  } catch (error) {
    next(error);
  }
};

async function resolvePermissionPayload(req) {
  let userIdentity = auth.getRequestUserIdentity(req);

  if (!userIdentity) {
    const fallbackIdentity = Number(req.user?.userIdentity || req.user?.user_identity || 0);
    if (Number.isFinite(fallbackIdentity) && fallbackIdentity > 0) {
      userIdentity = fallbackIdentity;
    }
  }

  if (!userIdentity) {
    const normalizedUserType = String(req.user?.userType || req.user?.type || '').trim().toLowerCase();
    if (normalizedUserType === 'admin') {
      userIdentity = 1;
    } else if (normalizedUserType === 'teacher') {
      userIdentity = 2;
    } else if (normalizedUserType === 'student') {
      userIdentity = 3;
    }
  }

  if (!userIdentity) {
    const userId = req.user?.id || null;
    const username = String(req.user?.username || '').trim();

    if (userId || username) {
      const userRecord = await models.SysUser.findOne({
        where: userId
          ? { id: userId, del_flag: 0 }
          : { username, del_flag: 0 },
        attributes: ['id', 'username', 'user_identity'],
        raw: true
      });

      const dbIdentity = Number(userRecord && userRecord.user_identity);
      if (Number.isFinite(dbIdentity) && dbIdentity > 0) {
        userIdentity = dbIdentity;
        if (req.user) {
          req.user.userIdentity = dbIdentity;
          req.user.user_identity = dbIdentity;
          req.user.userType = resolveUserTypeFromIdentity(dbIdentity);
        }
      }
    }
  }

  if (!userIdentity) {
    return null;
  }

  const getMenuDataByUserIdentity = require('../utils/menuData');
  const menuData = await getMenuDataByUserIdentity(userIdentity);

  return {
    userIdentity,
    menu: Array.isArray(menuData?.menu) ? menuData.menu : [],
    auth: Array.isArray(menuData?.auth) ? menuData.auth : [],
    allAuth: Array.isArray(menuData?.allAuth) ? menuData.allAuth : []
  };
}

exports.resolvePermissionPayload = resolvePermissionPayload;

/**
 * 用户登录
 * POST /sys/login
 */
exports.login = async (req, res, next) => {
  try {
    const { username, password, captcha, checkKey } = req.body;
    const isProduction = process.env.NODE_ENV === 'production';
    
    const safeUsername = typeof username === 'string' ? username.trim() : '';
    const safePassword = typeof password === 'string' ? password : '';

    if (!safeUsername || !safePassword) {
      return res.json(Response.error('用户名和密码不能为空', 400));
    }

    // 基础长度校验，避免异常超长输入
    if (safeUsername.length > 64 || safePassword.length > 256) {
      return res.json(Response.error('用户名或密码格式不正确', 400));
    }

    // 登录节流（防暴力破解）
    const throttle = checkLoginAllowed(req, safeUsername);
    if (!throttle.allowed) {
      const retrySeconds = Math.max(1, Math.ceil(throttle.retryAfterMs / 1000));
      return res.status(429).json(Response.error(`登录过于频繁，请${retrySeconds}秒后再试`, 429));
    }
    // 验证码开关：生产环境默认开启，可通过 SKIP_CAPTCHA=true 临时关闭
    const forceCaptcha = String(process.env.FORCE_CAPTCHA || '').toLowerCase() === 'true';
    const skipCaptcha = String(process.env.SKIP_CAPTCHA || '').toLowerCase() === 'true';
    const shouldVerifyCaptcha = isProduction ? true : forceCaptcha;
    const requestedCaptchaBypass = String(captcha || '').trim().toLowerCase() === 'skip';
    const allowCaptchaBypass = !isProduction && skipCaptcha;

    if (isProduction && skipCaptcha) {
      logger.warn('SKIP_CAPTCHA=true is ignored in production');
    }

    if (!shouldVerifyCaptcha && !isProduction) {
      logger.warn('Captcha verification skipped outside production');
    }

    if (requestedCaptchaBypass && !allowCaptchaBypass) {
      logger.warn('Blocked captcha bypass attempt', {
        username: safeUsername,
        isProduction,
        remoteAddress: req.ip
      });
    }

    // 验证验证码
    if (shouldVerifyCaptcha && !allowCaptchaBypass) {
      if (!captcha || !checkKey) {
        return res.json(Response.error('请输入验证码', 400));
      }

      const captchaUtil = require('../utils/captcha');
      const isValid = captchaUtil.verifyCaptcha(checkKey, captcha);

      if (!isValid) {
        logger.warn('Captcha verification failed', {
          checkKey,
          captchaInput: captcha,
          hasCaptcha: !!captchaUtil
        });
        return res.json(Response.error('验证码错误或已过期', 400));
      }
    }
    
    // 查询用户
    const user = await models.SysUser.findOne({
      where: { username: safeUsername, del_flag: 0 }
    });
    
    if (!user) {
      recordLoginFailure(req, safeUsername);
      return res.json(Response.error('用户名或密码错误', 400));
    }
    
    // 验证密码（bcrypt优先，兼容MD5并自动升级）
    let passwordMatches = false;
    if (encryptUtil.isBcryptHash(user.password)) {
      passwordMatches = await encryptUtil.comparePassword(safePassword, user.password);
    } else {
      const passwordMd5 = encryptUtil.md5(safePassword);
      passwordMatches = user.password === passwordMd5;
      if (passwordMatches) {
        try {
          const newHash = await encryptUtil.hashPassword(safePassword);
          await user.update({ password: newHash, update_time: new Date() });
        } catch (e) {
          logger.warn('Password hash migration to bcrypt failed', { error: e.message, userId: user.id });
        }
      }
    }

    if (!passwordMatches) {
      recordLoginFailure(req, safeUsername);
      return res.json(Response.error('用户名或密码错误', 400));
    }
    
    // 检查用户状态
    if (user.status !== 1) {
      recordLoginFailure(req, safeUsername);
      return res.json(Response.error('用户已被冻结', 400));
    }
    
    // 生成JWT Token
    const token = jwtUtil.generateToken({
      id: user.id,
      username: user.username,
      realname: user.realname,
      userIdentity: user.user_identity
    });
    
    // 确定用户角色
    let userRole = ['teacher']; // 默认教师
    const userType = resolveUserTypeFromIdentity(user.user_identity);
    
    if (user.user_identity === 1) {
      userRole = ['admin'];
    } else if (user.user_identity === 3) {
      userRole = ['student'];
    }
    
    // 登录成功，清空节流计数
    recordLoginSuccess(req, safeUsername);
    setAuthTokenCookie(res, token);

    // 返回用户信息和Token (与前端期望格式匹配)
    res.json({
      success: true,
      message: '登录成功',
      code: 200,
      result: {
        token: token,
        userIdentity: user.user_identity,
        user_identity: user.user_identity,
        userInfo: {
          id: user.id,
          username: user.username,
          realname: user.realname,
          avatar: avatarUtil.normalizeAvatarUrl(user.avatar, user.username || user.realname),
          status: user.status,
          userType: userType,
          userIdentity: user.user_identity,
          user_identity: user.user_identity
        },
        role: userRole,
        userType: userType, // 前端需要这个字段
        sysAllDictItems: {} // 字典数据，暂时返回空对象
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * 用户登出
 * POST /sys/logout
 */
exports.logout = async (req, res, next) => {
  try {
    // JWT是无状态的，登出只需要客户端删除Token
    clearAuthTokenCookie(res);
    res.json(Response.success({}, '登出成功'));
  } catch (error) {
    next(error);
  }
};

/**
 * 获取当前用户信息
 * GET /teaching/user/info
 */
exports.getUserInfo = async (req, res, next) => {
  try {
    // 优先使用username查询，因为JWT中的username是准确的
    const username = req.user?.username;
    
    if (!username) {
      return res.json(Response.error('用户未登录', 401));
    }
    
    const user = await models.SysUser.findOne({
      where: { username: username, del_flag: 0 },
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.json(Response.error('用户不存在', 404));
    }
    
    const userInfo = user.toJSON();
    userInfo.avatar = avatarUtil.normalizeAvatarUrl(userInfo.avatar, userInfo.username || userInfo.realname);

    const enrichedUserInfo = await enrichUserInfoWithStudentProfile(req, userInfo);
    res.json(Response.success(enrichedUserInfo));
  } catch (error) {
    next(error);
  }
};

/**
 * 更新当前用户信息
 * PUT /teaching/user/edit
 */
exports.updateUserInfo = async (req, res, next) => {
  try {
    // 优先使用username查询，因为JWT中的username是准确的
    const username = req.user?.username;
    
    if (!username) {
      return res.json(Response.error('用户未登录', 401));
    }
    
    const { realname, avatar, birthday, sex, email, phone } = req.body;
    
    const user = await models.SysUser.findOne({
      where: { username: username, del_flag: 0 }
    });
    
    if (!user) {
      return res.json(Response.error('用户不存在', 404));
    }
    
    const requestedUpdateData = {
      realname,
      avatar,
      birthday: birthday !== undefined ? (birthday || null) : undefined,
      sex,
      email,
      phone,
      update_time: new Date()
    };
    const updateData = await buildCompatibleSysUserUpdateData(requestedUpdateData);

    if (Object.keys(updateData).length > 0) {
      await user.update(updateData);
    }

    if (Number(user.user_identity) === 3) {
      const student = await resolveCurrentStudentRecord(req);
      if (student) {
        const requestedStudentUpdateData = {
          realname,
          birthday: birthday !== undefined ? (birthday || null) : undefined,
          sex,
          email,
          phone,
          update_by: req.user?.id,
          update_time: new Date()
        };
        const studentUpdateData = await buildCompatibleTeachingStudentUpdateData(requestedStudentUpdateData);

        if (Object.keys(studentUpdateData).length > 0) {
          await models.TeachingStudent.update(studentUpdateData, {
            where: {
              id: student.id,
              del_flag: 0
            }
          });
        }
      }
    }
    
    const updatedUser = await models.SysUser.findOne({
      where: { username: username, del_flag: 0 },
      attributes: { exclude: ['password'] }
    });
    
    const updatedUserInfo = updatedUser.toJSON();
    updatedUserInfo.avatar = avatarUtil.normalizeAvatarUrl(updatedUserInfo.avatar, updatedUserInfo.username || updatedUserInfo.realname);
    const enrichedUserInfo = await enrichUserInfoWithStudentProfile(req, updatedUserInfo);

    res.json(Response.success(enrichedUserInfo, '更新成功'));
  } catch (error) {
    next(error);
  }
};

/**
 * 获取用户权限
 * GET /sys/permission/getUserPermissionByToken
 */
exports.getUserPermission = async (req, res, next) => {
  try {
    const permissionPayload = await resolvePermissionPayload(req);
    if (!permissionPayload) {
      logger.warn('Unable to resolve user identity for permission request', {
        userId: req.user?.id,
        username: req.user?.username
      });
      return res.status(403).json(Response.error('无法识别当前用户身份', 403));
    }

    return res.json(Response.success({
      menu: permissionPayload.menu,
      auth: permissionPayload.auth,
      allAuth: permissionPayload.allAuth
    }));
  } catch (error) {
    logger.error('Failed to resolve user permission data', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      username: req.user?.username
    });

    try {
      const fallbackPayload = await resolvePermissionPayload(req);
      if (!fallbackPayload) {
        return res.status(500).json(Response.error('获取权限数据失败', 500));
      }

      return res.json(Response.success({
        menu: fallbackPayload.menu,
        auth: fallbackPayload.auth,
        allAuth: fallbackPayload.allAuth
      }, '获取权限成功'));
    } catch (fallbackError) {
      logger.error('Fallback user permission resolution failed', {
        error: fallbackError.message,
        stack: fallbackError.stack,
        userId: req.user?.id,
        username: req.user?.username
      });
      return res.status(500).json(Response.error('获取权限数据失败', 500));
    }
  }
};

/**
 * 构建权限树
 */
function buildPermissionTree(permissions, parentId = null) {
  const tree = [];
  
  permissions.forEach(perm => {
    if (perm.parent_id === parentId) {
      const node = {
        id: perm.id,
        name: perm.name,
        path: perm.url,
        component: perm.component,
        meta: {
          title: perm.name,
          icon: perm.icon,
          hidden: perm.hidden
        }
      };
      
      const children = buildPermissionTree(permissions, perm.id);
      if (children.length > 0) {
        node.children = children;
      }
      
      tree.push(node);
    }
  });
  
  return tree;
}

/**
 * 获取当前用户信息
 * GET /api/user/current
 */
exports.getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const user = await models.SysUser.findByPk(userId, {
      attributes: ['id', 'username', 'realname', 'avatar', 'email', 'phone', 'status', 'user_identity']
    });
    
    if (!user) {
      return res.json(Response.error('用户不存在', 404));
    }
    
    const userInfo = user.toJSON();
    userInfo.avatar = avatarUtil.normalizeAvatarUrl(userInfo.avatar, userInfo.username || userInfo.realname);
    userInfo.userIdentity = userInfo.user_identity;
    userInfo.userType = resolveUserTypeFromIdentity(userInfo.user_identity);
    
    res.json(Response.success(userInfo));
    
  } catch (error) {
    next(error);
  }
};

/**
 * 获取系统配置（用于前端初始化）
 * GET /sys/config/getCurrentConfig
 */
exports.getConfig = async (req, res, next) => {
  try {
    const forwardedProto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
    const forwardedHost = String(req.headers['x-forwarded-host'] || req.get('host') || '').split(',')[0].trim();
    const inferredOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : 'http://localhost:8081';
    const apiUrl = process.env.API_URL || inferredOrigin;
    
    res.json(Response.success({
      // 基础配置
      systemName: '教学平台管理系统',
      version: '1.0.0',
      domianURL: apiUrl,
      staticDomainURL: apiUrl,
      uploadDomain: apiUrl,
      apiBaseUrl: apiUrl,
      
      // 上传配置
      uploadUrl: '/api/upload',
      staticUrl: process.env.STATIC_URL || '/uploads',
      uploadType: 'local',
      staticDomain: apiUrl,
      
      // 前端需要的配置
      logo: '/logo.png',
      logo2: '/logo.png',
      brandName: '乐启享',
      banner: {
        title: '欢迎使用乐启享编程学习平台',
        subtitle: '让编程学习更简单、更有趣'
      },
      footer: {
        copyright: 'Copyright © 2024 乐启享',
        icp: '鄂ICP备2025149404号-1',
        police: '78c715efc4c1aa7fc6b192532fb8ce3d'
      },
      
      // 文件预览配置
      filePreview: 'default'
    }));
  } catch (error) {
    next(error);
  }
};

/**
 * 文件上传接口
 * POST /sys/common/upload
 */
exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.json(Response.error('没有上传文件', 400));
    }

    const file = req.file;
    const { bizPath } = req.body; // 业务路径，如 'python', 'scratch', 'homework'等
    const ossUtil = require('../utils/oss');
    const fs = require('fs');

    const isProduction = process.env.NODE_ENV === 'production';
    const forceOss = String(process.env.FORCE_OSS || (isProduction ? 'true' : 'false')).toLowerCase() === 'true';

    let fileUrl = `/uploads/${file.filename}`;
    let fullUrl = `${process.env.API_URL || 'http://localhost:8081'}${fileUrl}`;
    let storageType = 'local';

    if (!ossUtil.isOSSConfigured() && forceOss) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(500).json(Response.error('OSS未配置，已禁止本地上传', 500));
    }

    // 如果OSS已配置，上传到OSS
    if (ossUtil.isOSSConfigured()) {
      try {
        // 根据bizPath确定OSS目录
        const ossDir = bizPath || 'common';
        const ossPath = ossUtil.generateOSSPath(ossDir, file.filename);
        const ossResult = await ossUtil.uploadToOSS(file.path, ossPath);
        
        fileUrl = ossResult.url;
        fullUrl = ossResult.url;
        storageType = 'oss';
        logger.info('Common upload stored in OSS', { fileUrl, ossPath });
      } catch (ossError) {
        logger.error('Common upload to OSS failed', { error: ossError.message });
        if (forceOss) {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          return res.status(500).json(Response.error('OSS上传失败，已禁止本地存储', 500));
        }
      }
    }

    // 返回文件信息
    res.json({
      success: true,
      code: 200,
      message: fileUrl, // 返回文件URL
      result: {
        filename: file.filename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        path: fileUrl,
        fullUrl: fullUrl,
        bizPath: bizPath || '',
        storageType: storageType
      }
    });
    
  } catch (error) {
    logger.error('Common upload failed', { error: error.message, stack: error.stack });
    res.json(Response.error('文件上传失败: ' + error.message, 500));
  }
};

/**
 * 添加文件记录（编辑器使用）
 * POST /sys/sysFile/add
 */
exports.addFileRecord = async (req, res, next) => {
  try {
    const { fileName, filePath, fileType, fileLocation, fileTag } = req.body;
    
    if (!filePath) {
      return res.json(Response.error('文件路径不能为空', 400));
    }

    // 生成文件记录ID（用于关联）
    const uuidUtil = require('../utils/uuid');
    const fileId = uuidUtil.generate();

    // 这里可以选择性地保存到数据库，目前直接返回ID
    const fileRecord = {
      id: fileId,
      fileName: fileName || '未命名',
      filePath: filePath,
      fileType: fileType || 2,
      fileLocation: fileLocation || 1,
      fileTag: fileTag || '',
      uploadTime: new Date(),
      uploadUser: req.user?.id
    };

    res.json(Response.success(fileRecord, '文件记录创建成功'));
    
  } catch (error) {
    logger.error('Add file record failed', { error: error.message, stack: error.stack });
    res.json(Response.error('添加文件记录失败: ' + error.message, 500));
  }
};

/**
 * 修改用户密码
 * PUT /sys/user/updatePassword
 */
exports.deleteFileRecordByPath = async (req, res, next) => {
  try {
    const filePath = String(req.body?.filePath || req.query?.filePath || '').trim();

    if (!filePath) {
      return res.json(Response.error('鏂囦欢璺緞涓嶈兘涓虹┖', 400));
    }

    return res.json(Response.success({
      filePath
    }, '鏂囦欢璁板綍鍒犻櫎鎴愬姛'));
  } catch (error) {
    logger.error('Delete file record failed', { error: error.message, stack: error.stack });
    return next(error);
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    const { username, oldpassword, password, confirmpassword } = req.body;
    const tokenUsername = req.user?.username;
    const targetUsername = tokenUsername || username;
    
    // 验证必填字段
    if (!targetUsername || !oldpassword || !password) {
      return res.json(Response.error('用户名、旧密码和新密码不能为空', 400));
    }
    
    // 验证新密码和确认密码是否一致
    if (username && tokenUsername && username !== tokenUsername) {
      return res.status(403).json(Response.error('只能修改当前登录账号的密码', 403));
    }

    if (password !== confirmpassword) {
      return res.json(Response.error('两次输入的密码不一致', 400));
    }
    
    // 查询用户
    const user = await models.SysUser.findOne({
      where: { username: targetUsername, del_flag: 0 }
    });
    
    if (!user) {
      return res.json(Response.error('用户不存在', 404));
    }
    
    // 验证旧密码是否正确
    let oldPasswordMatches = false;
    if (encryptUtil.isBcryptHash(user.password)) {
      oldPasswordMatches = await encryptUtil.comparePassword(oldpassword, user.password);
    } else {
      const oldPasswordMd5 = encryptUtil.md5(oldpassword);
      oldPasswordMatches = user.password === oldPasswordMd5;
    }

    if (!oldPasswordMatches) {
      return res.json(Response.error('旧密码错误', 400));
    }
    
    // 验证新密码不能与旧密码相同
    if (encryptUtil.isBcryptHash(user.password)) {
      const isSame = await encryptUtil.comparePassword(password, user.password);
      if (isSame) {
        return res.json(Response.error('新密码不能与旧密码相同', 400));
      }
    } else {
      const newPasswordMd5 = encryptUtil.md5(password);
      const oldPasswordMd5 = encryptUtil.md5(oldpassword);
      if (oldPasswordMd5 === newPasswordMd5) {
        return res.json(Response.error('新密码不能与旧密码相同', 400));
      }
    }
    
    // 更新密码
    const newHash = await encryptUtil.hashPassword(password);
    await user.update({
      password: newHash,
      update_time: new Date()
    });
    
    res.json(Response.success({}, '密码修改成功'));
    
  } catch (error) {
    next(error);
  }
};


