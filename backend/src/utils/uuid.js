/**
 * UUID生成工具
 * 用于生成数据库主键ID
 */

const { v4: uuidv4 } = require('uuid');

/**
 * 生成UUID（去掉中划线，与数据库varchar(32)匹配）
 * @returns {string} 32位UUID
 */
exports.generate = () => {
  return uuidv4().replace(/-/g, '');
};

/**
 * 批量生成UUID
 * @param {number} count - 数量
 * @returns {array} UUID数组
 */
exports.generateBatch = (count) => {
  return Array.from({ length: count }, () => exports.generate());
};



