/**
 * JWT工具函数
 * 用于生成和验证JWT Token
 */

const jwt = require('jsonwebtoken');
const { logger } = require('../middleware/logger');
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is required in production');
    }
    logger.warn('JWT_SECRET is not set, using non-production fallback secret');
    return 'dev-insecure-default';
  }
  return secret;
};

/**
 * 生成JWT Token
 * @param {object} payload - 用户信息负载
 * @returns {string} JWT Token
 */
exports.generateToken = (payload) => {
  return jwt.sign(
    payload,
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } // 默认7天，与前端存储时间匹配
  );
};

/**
 * 验证JWT Token
 * @param {string} token - JWT Token
 * @returns {object} 解码后的用户信息
 * @throws {Error} Token无效或已过期
 */
exports.verifyToken = (token) => {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    throw new Error('Token无效或已过期');
  }
};

/**
 * 解码JWT Token（不验证）
 * @param {string} token - JWT Token
 * @returns {object} 解码后的信息
 */
exports.decodeToken = (token) => {
  return jwt.decode(token);
};







