/**
 * 加密工具函数
 * 用于密码加密和验证
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DEFAULT_BCRYPT_ROUNDS = 12;

/**
 * 检查是否为bcrypt哈希
 * @param {string} value
 * @returns {boolean}
 */
exports.isBcryptHash = (value) => {
  if (!value) return false;
  return /^\$2[aby]?\$\d{2}\$/.test(String(value));
};

/**
 * MD5加密（与前端现有系统兼容）
 * @param {string} text - 待加密文本
 * @returns {string} MD5哈希值
 */
exports.md5 = (text) => {
  return crypto.createHash('md5').update(text).digest('hex');
};

/**
 * bcrypt密码加密
 * @param {string} password - 明文密码
 * @returns {Promise<string>} 加密后的密码
 */
exports.hashPassword = async (password) => {
  const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || DEFAULT_BCRYPT_ROUNDS, 10);
  const safeRounds = Number.isFinite(rounds) && rounds >= 10 && rounds <= 15 ? rounds : DEFAULT_BCRYPT_ROUNDS;
  const salt = await bcrypt.genSalt(safeRounds);
  return await bcrypt.hash(password, salt);
};

/**
 * bcrypt密码验证
 * @param {string} password - 明文密码
 * @param {string} hash - 加密后的密码
 * @returns {Promise<boolean>} 是否匹配
 */
exports.comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * 生成随机字符串
 * @param {number} length - 长度
 * @returns {string} 随机字符串
 */
exports.randomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};







