/**
 * 执行课堂聊天文件字段迁移
 */

// 加载环境变量
require('dotenv').config();

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  let connection;
  
  try {
    // 从环境变量或配置文件读取数据库配置
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'teaching_platform',
      multipleStatements: true
    };
    
    console.log('📦 连接数据库...');
    console.log(`   主机: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`   数据库: ${dbConfig.database}`);
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功\n');
    
    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'migrations', 'add-classroom-chat-file-fields.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('🔄 执行迁移脚本...\n');
    
    // 执行SQL
    const [results] = await connection.query(sql);
    
    console.log('✅ 迁移执行成功！\n');
    
    // 验证字段
    console.log('🔍 验证新增字段...');
    const [fields] = await connection.query(`
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        CHARACTER_MAXIMUM_LENGTH, 
        COLUMN_COMMENT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = '${dbConfig.database}'
      AND TABLE_NAME = 'teaching_classroom_chat'
      AND COLUMN_NAME IN ('file_name', 'file_size', 'file_type', 'file_url')
      ORDER BY ORDINAL_POSITION
    `);
    
    if (fields.length > 0) {
      console.log('\n新增字段列表:');
      console.table(fields);
      console.log('\n✅ 所有字段添加成功！');
    } else {
      console.log('\n⚠️  未找到新增字段，可能表不存在或字段已存在');
    }
    
  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n📦 数据库连接已关闭');
    }
  }
}

// 执行迁移
runMigration();
