/**
 * 测试课堂资源URL获取
 * 检查课堂关联的资源是否有正确的OSS file_url
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function testClassroomResource() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'teaching_platform'
  });

  console.log('✅ 数据库连接成功\n');

  try {
    // 1. 查询最近的课堂及其关联资源
    console.log('📋 查询最近的课堂及其关联资源：');
    const [classrooms] = await connection.execute(`
      SELECT 
        c.id as classroom_id,
        c.classroom_name,
        c.resource_id,
        c.resource_name,
        c.resource_url,
        c.lesson_id,
        r.id as res_id,
        r.resource_name as res_name,
        r.file_url as res_file_url,
        r.storage_type as res_storage_type,
        r.resource_type as res_type
      FROM teaching_classroom c
      LEFT JOIN teaching_resource r ON c.resource_id = r.id
      WHERE c.del_flag = 0
      ORDER BY c.create_time DESC
      LIMIT 5
    `);

    if (classrooms.length === 0) {
      console.log('❌ 没有找到课堂数据');
    } else {
      classrooms.forEach((row, index) => {
        console.log(`\n--- 课堂 ${index + 1} ---`);
        console.log(`课堂ID: ${row.classroom_id}`);
        console.log(`课堂名称: ${row.classroom_name}`);
        console.log(`关联资源ID: ${row.resource_id || '无'}`);
        console.log(`关联资源名称: ${row.resource_name || '无'}`);
        console.log(`课堂resource_url: ${row.resource_url || '无'}`);
        console.log(`课节ID: ${row.lesson_id || '无'}`);
        console.log(`--- 资源表数据 ---`);
        console.log(`资源ID: ${row.res_id || '无'}`);
        console.log(`资源名称: ${row.res_name || '无'}`);
        console.log(`资源file_url: ${row.res_file_url || '❌ 空'}`);
        console.log(`存储类型: ${row.res_storage_type || '无'}`);
        console.log(`资源类型: ${row.res_type || '无'}`);
        
        // 检查是否是OSS URL
        if (row.res_file_url) {
          const isOSS = row.res_file_url.includes('aliyuncs.com') || row.res_file_url.includes('oss-cn-');
          console.log(`是否OSS: ${isOSS ? '✅ 是' : '❌ 否'}`);
        }
      });
    }

    // 2. 查询课节关联的资源
    console.log('\n\n📋 查询课节关联的资源：');
    const [lessons] = await connection.execute(`
      SELECT 
        u.id as lesson_id,
        u.unit_name,
        u.resource_id,
        u.resource_name,
        u.content_url,
        r.id as res_id,
        r.resource_name as res_name,
        r.file_url as res_file_url,
        r.storage_type as res_storage_type
      FROM teaching_course_unit u
      LEFT JOIN teaching_resource r ON u.resource_id = r.id
      WHERE u.del_flag = 0
      ORDER BY u.create_time DESC
      LIMIT 5
    `);

    if (lessons.length === 0) {
      console.log('❌ 没有找到课节数据');
    } else {
      lessons.forEach((row, index) => {
        console.log(`\n--- 课节 ${index + 1} ---`);
        console.log(`课节ID: ${row.lesson_id}`);
        console.log(`课节名称: ${row.unit_name}`);
        console.log(`关联资源ID: ${row.resource_id || '无'}`);
        console.log(`课节content_url: ${row.content_url || '无'}`);
        console.log(`资源file_url: ${row.res_file_url || '❌ 空'}`);
        
        if (row.res_file_url) {
          const isOSS = row.res_file_url.includes('aliyuncs.com') || row.res_file_url.includes('oss-cn-');
          console.log(`是否OSS: ${isOSS ? '✅ 是' : '❌ 否'}`);
        }
      });
    }

    // 3. 查询所有有file_url的资源
    console.log('\n\n📋 查询有OSS file_url的资源：');
    const [resources] = await connection.execute(`
      SELECT id, resource_name, file_url, storage_type, resource_type
      FROM teaching_resource
      WHERE del_flag = 0 AND file_url IS NOT NULL AND file_url != ''
      ORDER BY create_time DESC
      LIMIT 10
    `);

    if (resources.length === 0) {
      console.log('❌ 没有找到有file_url的资源');
    } else {
      console.log(`找到 ${resources.length} 个有file_url的资源：`);
      resources.forEach((row, index) => {
        const isOSS = row.file_url && (row.file_url.includes('aliyuncs.com') || row.file_url.includes('oss-cn-'));
        console.log(`${index + 1}. [${row.id}] ${row.resource_name} - ${isOSS ? '✅ OSS' : '本地'} - ${row.file_url.substring(0, 80)}...`);
      });
    }

  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  } finally {
    await connection.end();
    console.log('\n\n数据库连接已关闭');
  }
}

testClassroomResource();
