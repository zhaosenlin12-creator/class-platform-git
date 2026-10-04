/**
 * 数据库事务辅助工具
 * 提供统一的事务处理封装
 */

const sequelize = require('../config/database');
const { logger } = require('../middleware/logger');

/**
 * 执行事务操作
 * @param {Function} callback - 事务回调函数，接收transaction参数
 * @returns {Promise} 返回事务执行结果
 */
async function executeTransaction(callback) {
  const transaction = await sequelize.transaction();
  
  try {
    const result = await callback(transaction);
    await transaction.commit();
    logger.info('✅ 事务提交成功');
    return result;
  } catch (error) {
    await transaction.rollback();
    logger.error('❌ 事务回滚:', error.message);
    throw error;
  }
}

/**
 * 批量执行事务操作
 * @param {Array<Function>} callbacks - 事务回调函数数组
 * @returns {Promise} 返回所有操作的结果数组
 */
async function executeBatchTransaction(callbacks) {
  return executeTransaction(async (transaction) => {
    const results = [];
    for (const callback of callbacks) {
      const result = await callback(transaction);
      results.push(result);
    }
    return results;
  });
}

module.exports = {
  executeTransaction,
  executeBatchTransaction
};











