/**
 * 验证课堂聊天文件字段是否存在
 */

// 加载环境变量
require('dotenv').config();

const sequelize = require('./src/config/database');

async function verifyMigration() {
  try {
    console.log('📦 连接数据库...');
    console.log(`   主机: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`   数据库: ${process.env.DB_NAME}\n`);
    
    // 测试连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功\n');
    
    // 查询表结构
    console.log('🔍 检查 teaching_classroom_chat 表字段...\n');
    
    const [fields] = await sequelize.query(`
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_COMMENT
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
      AND TABLE_NAME = 'teaching_classroom_chat'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('表字段列表:');
    console.table(fields);
    
    // 检查必需的文件字段
    const requiredFields = ['file_name', 'file_size', 'file_type', 'file_url'];
    const existingFields = fields.map(f => f.COLUMN_NAME);
    const missingFields = requiredFields.filter(f => !existingFields.includes(f));
    
    if (missingFields.length === 0) {
      console.log('\n✅ 所有必需的文件字段都已存在！');
      console.log('   - file_name');
      console.log('   - file_size');
      console.log('   - file_type');
      console.log('   - file_url');
    } else {
      console.log('\n⚠️  缺少以下字段:');
      missingFields.forEach(f => console.log(`   - ${f}`));
      console.log('\n需要运行迁移脚本: node run-chat-migration.js');
    }
    
  } catch (error) {
    console.error('\n❌ 验证失败:', error.message);
    
    if (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('\n💡 数据库连接失败，可能的原因:');
      console.error('   1. 数据库服务未启动');
      console.error('   2. 数据库地址配置错误');
      console.error('   3. 防火墙阻止连接');
      console.error('\n请检查 .env 文件中的数据库配置:');
      console.error(`   DB_HOST=${process.env.DB_HOST}`);
      console.error(`   DB_PORT=${process.env.DB_PORT}`);
      console.error(`   DB_NAME=${process.env.DB_NAME}`);
      console.error(`   DB_USER=${process.env.DB_USER}`);
    }
    
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n📦 数据库连接已关闭');
  }
}

// 执行验证
verifyMigration();
