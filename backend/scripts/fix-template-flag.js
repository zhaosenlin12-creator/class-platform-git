/**
 * 修复模板标记脚本
 * 将status='template'但is_template=0的记录修复为is_template=1
 */

const mysql = require('mysql2/promise');

const dbConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'Zsl13177068887',
  database: 'teaching_platform'
};

async function fixTemplateFlag() {
  let connection;
  
  try {
    console.log('连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ 数据库连接成功\n');
    
    // 查找需要修复的记录
    console.log('=== 查找需要修复的记录 ===');
    const [needFix] = await connection.execute(
      `SELECT id, homework_title, is_template, status, del_flag 
       FROM teaching_homework 
       WHERE status = 'template' AND is_template = 0 AND del_flag = 0`
    );
    
    console.log(`找到 ${needFix.length} 条需要修复的记录:\n`);
    needFix.forEach((hw, index) => {
      console.log(`${index + 1}. ${hw.homework_title} (ID: ${hw.id})`);
    });
    
    if (needFix.length === 0) {
      console.log('\n没有需要修复的记录');
      return;
    }
    
    // 执行修复
    console.log('\n=== 开始修复 ===');
    const [result] = await connection.execute(
      `UPDATE teaching_homework 
       SET is_template = 1 
       WHERE status = 'template' AND is_template = 0 AND del_flag = 0`
    );
    
    console.log(`✓ 修复完成，影响 ${result.affectedRows} 行\n`);
    
    // 验证修复结果
    console.log('=== 验证修复结果 ===');
    const [templates] = await connection.execute(
      `SELECT id, homework_title, is_template, status, del_flag 
       FROM teaching_homework 
       WHERE is_template = 1 AND del_flag = 0`
    );
    
    console.log(`现在有 ${templates.length} 个有效模板:\n`);
    templates.forEach((tpl, index) => {
      console.log(`${index + 1}. ${tpl.homework_title} (ID: ${tpl.id})`);
    });
    
  } catch (error) {
    console.error('错误:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

fixTemplateFlag();
