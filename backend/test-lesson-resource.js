/**
 * 测试课节资源关联
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function test() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'teaching_platform'
  });

  console.log('✅ 数据库连接成功\n');

  try {
    // 查询课节详情
    const [lessons] = await connection.execute(`
      SELECT id, unit_name, resource_id, resource_name, content_url
      FROM teaching_course_unit
      WHERE del_flag = 0
      ORDER BY create_time DESC
      LIMIT 10
    `);

    console.log('📋 课节数据：');
    lessons.forEach((row, i) => {
      console.log(`\n${i + 1}. ${row.unit_name}`);
      console.log(`   resource_id: ${row.resource_id || '❌ 空'}`);
      console.log(`   resource_name: ${row.resource_name || '无'}`);
      console.log(`   content_url: ${row.content_url || '无'}`);
      if (row.content_url) {
        const isOSS = row.content_url.includes('aliyuncs.com') || row.content_url.includes('oss-cn-');
        console.log(`   是否OSS: ${isOSS ? '✅ 是' : '❌ 否（本地文件）'}`);
      }
    });

  } finally {
    await connection.end();
  }
}

test();
