/**
 * 创建作业-班级关联表
 */

require('dotenv').config();
const sequelize = require('../src/config/database');

const createTable = `
CREATE TABLE IF NOT EXISTS teaching_homework_class (
  id VARCHAR(36) NOT NULL COMMENT '主键ID',
  homework_id VARCHAR(36) NOT NULL COMMENT '作业ID',
  class_id VARCHAR(36) NOT NULL COMMENT '班级ID',
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_homework_id (homework_id),
  KEY idx_class_id (class_id),
  KEY idx_homework_class (homework_id, class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作业班级关联表';
`;

async function run() {
  try {
    console.log('开始创建作业-班级关联表...');
    
    await sequelize.query(createTable);
    
    console.log('✅ 作业-班级关联表创建成功');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 创建表失败:', error);
    process.exit(1);
  }
}

run();








