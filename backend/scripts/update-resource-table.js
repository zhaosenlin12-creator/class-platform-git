/**
 * 更新teaching_resource表结构
 * 添加缺失的file_extension和mime_type字段
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateResourceTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('📌 开始更新teaching_resource表结构...');

    // 添加file_extension字段
    try {
      await connection.execute(`
        ALTER TABLE teaching_resource 
        ADD COLUMN file_extension VARCHAR(20) DEFAULT NULL COMMENT '文件扩展名' AFTER file_size
      `);
      console.log('✅ 已添加file_extension字段');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  file_extension字段已存在');
      } else {
        throw err;
      }
    }

    // 添加mime_type字段
    try {
      await connection.execute(`
        ALTER TABLE teaching_resource 
        ADD COLUMN mime_type VARCHAR(100) DEFAULT NULL COMMENT '文件MIME类型' AFTER file_extension
      `);
      console.log('✅ 已添加mime_type字段');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  mime_type字段已存在');
      } else {
        throw err;
      }
    }

    // 验证表结构
    const [columns] = await connection.execute(`
      DESCRIBE teaching_resource
    `);
    
    console.log('\n✅ teaching_resource表当前字段：');
    columns.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type})`);
    });

    console.log('\n✅ 表结构更新完成！');

  } catch (error) {
    console.error('❌ 更新表结构失败:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// 执行更新
updateResourceTable();





