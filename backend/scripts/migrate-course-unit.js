/**
 * 迁移脚本：为teaching_course_unit表添加编程工作台所需字段
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrate() {
  let conn;
  try {
    // 连接数据库
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ 数据库连接成功');

    // 检查并添加字段
    const fieldsToAdd = [
      {
        name: 'content_type',
        sql: "ALTER TABLE teaching_course_unit ADD COLUMN content_type VARCHAR(50) DEFAULT NULL COMMENT '内容类型'"
      },
      {
        name: 'content_url',
        sql: "ALTER TABLE teaching_course_unit ADD COLUMN content_url VARCHAR(500) DEFAULT NULL COMMENT '内容URL'"
      },
      {
        name: 'objectives',
        sql: "ALTER TABLE teaching_course_unit ADD COLUMN objectives TEXT DEFAULT NULL COMMENT '学习目标JSON'"
      },
      {
        name: 'create_by',
        sql: "ALTER TABLE teaching_course_unit ADD COLUMN create_by VARCHAR(32) DEFAULT NULL COMMENT '创建人ID'"
      },
      {
        name: 'update_by',
        sql: "ALTER TABLE teaching_course_unit ADD COLUMN update_by VARCHAR(32) DEFAULT NULL COMMENT '更新人ID'"
      },
      {
        name: 'update_time',
        sql: "ALTER TABLE teaching_course_unit ADD COLUMN update_time DATETIME DEFAULT NULL COMMENT '更新时间'"
      }
    ];

    for (const field of fieldsToAdd) {
      try {
        // 检查字段是否已存在
        const [rows] = await conn.execute(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'teaching_course_unit' AND COLUMN_NAME = ?`,
          [process.env.DB_NAME, field.name]
        );

        if (rows.length === 0) {
          // 字段不存在，添加它
          console.log(`📝 添加字段: ${field.name}...`);
          await conn.execute(field.sql);
          console.log(`✅ 字段 ${field.name} 添加成功`);
        } else {
          console.log(`⏭️  字段 ${field.name} 已存在，跳过`);
        }
      } catch (error) {
        console.error(`❌ 添加字段 ${field.name} 失败:`, error.message);
      }
    }

    // 验证字段
    console.log('\n📊 验证表结构:');
    const [columns] = await conn.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'teaching_course_unit'
       ORDER BY ORDINAL_POSITION`,
      [process.env.DB_NAME]
    );

    console.table(columns);
    console.log('\n✅ 迁移完成！');

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    process.exit(1);
  } finally {
    if (conn) {
      await conn.end();
    }
  }
}

migrate();





