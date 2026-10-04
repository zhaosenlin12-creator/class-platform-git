/**
 * 执行数据库迁移脚本
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function runMigration() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Zsl13177068887',
    database: 'teaching_platform',
    multipleStatements: true
  });

  try {
    console.log('🔄 开始执行数据库迁移...');
    
    const sqlFile = path.join(__dirname, 'add-template-fields-only.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    await connection.query(sql);
    
    console.log('✅ 数据库迁移成功！');
    console.log('   - 添加了 is_template 和 template_id 字段');
    console.log('   - 创建了 teaching_homework_submission 表');
    console.log('   - 创建了 teaching_homework_class 表');
    
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration().catch(console.error);
