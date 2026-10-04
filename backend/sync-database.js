/**
 * 数据库同步脚本
 * 用于根据模型自动创建/更新数据库表结构
 */

// 加载环境变量
require('dotenv').config();

const models = require('./src/models');

// 简单的logger
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args)
};

async function syncDatabase() {
  try {
    logger.info('🔄 开始同步数据库...');
    
    // alter: true 会自动添加缺失的字段，但不会删除多余的字段
    await models.sequelize.sync({ alter: true });
    
    logger.info('✅ 数据库同步完成！');
    logger.info('📋 已同步的表：');
    
    const tables = Object.keys(models).filter(key => key !== 'sequelize' && key !== 'Sequelize');
    tables.forEach(table => {
      logger.info(`   - ${table}`);
    });
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ 数据库同步失败:', error);
    process.exit(1);
  }
}

syncDatabase();
