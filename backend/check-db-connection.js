/**
 * 检查数据库连接并尝试不同的连接方式
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

const connectionConfigs = [
  {
    name: '当前配置 (172.17.0.1)',
    host: '172.17.0.1',
    port: 3306,
    user: process.env.DB_USER || 'teaching_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'teaching_platform'
  },
  {
    name: 'localhost',
    host: 'localhost',
    port: 3306,
    user: process.env.DB_USER || 'teaching_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'teaching_platform'
  },
  {
    name: '127.0.0.1',
    host: '127.0.0.1',
    port: 3306,
    user: process.env.DB_USER || 'teaching_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'teaching_platform'
  },
  {
    name: 'host.docker.internal',
    host: 'host.docker.internal',
    port: 3306,
    user: process.env.DB_USER || 'teaching_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'teaching_platform'
  }
];

async function testConnection(config) {
  try {
    console.log(`\n🔍 测试连接: ${config.name}`);
    console.log(`   ${config.host}:${config.port}`);
    
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 5000
    });
    
    await connection.ping();
    console.log(`✅ 连接成功！`);
    
    // 检查表字段
    const [fields] = await connection.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = '${config.database}'
      AND TABLE_NAME = 'teaching_classroom_chat'
      AND COLUMN_NAME IN ('file_name', 'file_size', 'file_type', 'file_url')
    `);
    
    console.log(`   找到 ${fields.length}/4 个文件字段`);
    
    await connection.end();
    return { success: true, config, fieldsCount: fields.length };
  } catch (error) {
    console.log(`❌ 连接失败: ${error.code || error.message}`);
    return { success: false, config, error: error.message };
  }
}

async function main() {
  console.log('🔍 开始测试数据库连接...\n');
  console.log('数据库配置:');
  console.log(`   用户: ${process.env.DB_USER}`);
  console.log(`   数据库: ${process.env.DB_NAME}`);
  
  const results = [];
  
  for (const config of connectionConfigs) {
    const result = await testConnection(config);
    results.push(result);
    
    if (result.success) {
      console.log(`\n✅ 找到可用连接: ${config.name}`);
      console.log(`   建议更新 .env 文件中的 DB_HOST=${config.host}`);
      
      if (result.fieldsCount === 4) {
        console.log(`\n✅ 数据库迁移已完成！所有文件字段都已存在。`);
      } else {
        console.log(`\n⚠️  需要运行迁移脚本添加文件字段 (${result.fieldsCount}/4)`);
      }
      
      break;
    }
  }
  
  const successfulConnection = results.find(r => r.success);
  if (!successfulConnection) {
    console.log('\n❌ 所有连接尝试都失败了');
    console.log('\n可能的原因:');
    console.log('   1. MySQL服务未启动');
    console.log('   2. 用户名或密码错误');
    console.log('   3. 数据库不存在');
    console.log('   4. 防火墙阻止连接');
  }
}

main().catch(console.error);
