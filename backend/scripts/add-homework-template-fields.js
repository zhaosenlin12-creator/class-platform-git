/**
 * 添加作业模板相关字段
 * 执行: node scripts/add-homework-template-fields.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function addFields() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'Zsl13177068887',
    database: 'teaching_platform',
    multipleStatements: true
  });

  try {
    console.log('开始添加作业模板字段...');

    // 读取SQL文件
    const sqlFile = path.join(__dirname, '../database/add-homework-template-fields.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // 执行SQL
    const [results] = await connection.query(sql);
    
    console.log('✅ 作业模板字段添加成功');
    console.log(results);

  } catch (error) {
    console.error('❌ 添加字段失败:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

addFields().catch(console.error);
