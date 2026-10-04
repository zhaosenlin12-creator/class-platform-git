/**
 * JWT认证中间件
 * 验证请求中的Token是否有效
 */

const jwtUtil = require('../utils/jwt');
const Response = require('../utils/response');
const { extractAuthTokenFromCookieHeader } = require('../utils/authCookie');
const models = require('../models');

const ADMIN_ROLE_ALIASES = new Set(['admin', 'administrator', 'super_admin', 'superadmin', 'school_admin', 'schooladmin', 'root']);
const TEACHER_ROLE_ALIASES = new Set(['teacher', 'lecturer', 'instructor']);
const STUDENT_ROLE_ALIASES = new Set(['student', 'learner']);

function normalizeAuthHeaderValue(rawToken) {
  return String(rawToken || '').replace(/^Bearer\s+/i, '').trim();
}

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

function getRequestUserIdentity(req) {
  if (!req || !req.user) {
    return null;
  }

  const rawIdentity = req.user.userIdentity !== undefined && req.user.userIdentity !== null
    ? req.user.userIdentity
    : req.user.user_identity;
  const parsedIdentity = Number(rawIdentity);

  if (Number.isFinite(parsedIdentity) && parsedIdentity > 0) {
    return parsedIdentity;
  }

  const normalizedRoles = getNormalizedRoleCandidates(req.user);
  if (normalizedRoles.some((role) => ADMIN_ROLE_ALIASES.has(role))) {
    return 1;
  }
  if (normalizedRoles.some((role) => STUDENT_ROLE_ALIASES.has(role))) {
    return 3;
  }
  if (normalizedRoles.some((role) => TEACHER_ROLE_ALIASES.has(role))) {
    return 2;
  }

  return null;
}

function extractTokenFromRequest(req) {
  return req.headers['x-access-token'] ||
         req.headers['authorization'] ||
         req.headers['token'] ||
         extractAuthTokenFromCookieHeader(req.headers.cookie);
}

async function enrichDecodedUserIdentity(decodedUser) {
  if (!decodedUser) {
    return decodedUser;
  }

  const rawIdentity = decodedUser.userIdentity !== undefined && decodedUser.userIdentity !== null
    ? decodedUser.userIdentity
    : decodedUser.user_identity;
  const parsedIdentity = Number(rawIdentity);

  if (Number.isFinite(parsedIdentity) && parsedIdentity > 0) {
    return decodedUser;
  }

  const userId = decodedUser.id;
  const username = typeof decodedUser.username === 'string' ? decodedUser.username.trim() : '';

  if (!userId && !username) {
    return decodedUser;
  }

  try {
    const userRecord = await models.SysUser.findOne({
      where: userId ? { id: userId, del_flag: 0 } : { username, del_flag: 0 },
      attributes: ['id', 'username', 'user_identity'],
      raw: true
    });

    if (!userRecord || !userRecord.user_identity) {
      return decodedUser;
    }

    const userIdentity = Number(userRecord.user_identity);
    const normalizedRole = userIdentity === 3 ? 'student' : (userIdentity === 1 ? 'admin' : 'teacher');

    decodedUser.userIdentity = userIdentity;
    decodedUser.user_identity = userIdentity;

    if (!decodedUser.userType) {
      decodedUser.userType = normalizedRole;
    }

    if (!decodedUser.role && !decodedUser.roles) {
      decodedUser.roles = [normalizedRole];
    }
  } catch (_error) {
    return decodedUser;
  }

  return decodedUser;
}

/**
 * 验证JWT Token
 */
exports.verifyToken = async (req, res, next) => {
  try {
    // 从请求头或 HttpOnly Cookie 获取 Token
    const token = extractTokenFromRequest(req);
    
    if (!token) {
      return res.status(401).json(Response.error('未提供认证Token', 401));
    }
    
    const actualToken = normalizeAuthHeaderValue(token);
    
    // 验证Token
    const decoded = await enrichDecodedUserIdentity(jwtUtil.verifyToken(actualToken));
    
    // 将用户信息挂载到req对象
    req.user = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json(Response.error('Token无效或已过期', 401));
  }
};

/**
 * 可选认证（不强制要求Token）
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    const token = extractTokenFromRequest(req);
    
    if (token) {
      const actualToken = normalizeAuthHeaderValue(token);
      const decoded = await enrichDecodedUserIdentity(jwtUtil.verifyToken(actualToken));
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // 可选认证，Token无效也继续
    next();
  }
};

exports.getRequestUserIdentity = getRequestUserIdentity;

exports.requireUserIdentity = (allowedIdentities = [], message = '没有权限执行该操作') => {
  const normalizedAllowedIdentities = Array.isArray(allowedIdentities)
    ? allowedIdentities.map(value => Number(value)).filter(value => Number.isFinite(value))
    : [];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(Response.error('未提供认证Token', 401));
    }

    const userIdentity = getRequestUserIdentity(req);
    const allowAnyAuthenticatedUser = normalizedAllowedIdentities.length === 3 &&
      normalizedAllowedIdentities.includes(1) &&
      normalizedAllowedIdentities.includes(2) &&
      normalizedAllowedIdentities.includes(3);

    if (!userIdentity && allowAnyAuthenticatedUser) {
      next();
      return;
    }

    if (!normalizedAllowedIdentities.includes(userIdentity)) {
      return res.status(403).json(Response.error(message, 403));
    }

    next();
  };
};








