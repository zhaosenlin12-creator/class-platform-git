/**
 * 检查表结构
 */

const mysql = require('mysql2/promise');

async function checkTableStructure() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'Zsl13177068887',
    database: 'teaching_platform'
  });

  try {
    console.log('🔍 检查 teaching_homework 表结构...\n');
    
    const [columns] = await connection.query('SHOW COLUMNS FROM teaching_homework');
    
    console.log('现有字段：');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });
    
    console.log('\n需要添加的字段：');
    const requiredFields = ['is_template', 'template_id', 'homework_type', 'difficulty', 'requirements', 'attachments', 'pass_score', 'allow_late_submit', 'submitted_count', 'total_students'];
    const existingFields = columns.map(col => col.Field);
    
    requiredFields.forEach(field => {
      if (existingFields.includes(field)) {
        console.log(`  ✅ ${field} - 已存在`);
      } else {
        console.log(`  ❌ ${field} - 需要添加`);
      }
    });
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await connection.end();
  }
}

checkTableStructure();
