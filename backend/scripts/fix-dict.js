/**
 * 修复字典数据脚本
 */
require('dotenv').config();
const sequelize = require('../src/config/database');

async function fixDictData() {
  try {
    console.log('🔧 开始修复字典数据...');
    
    // 删除旧数据
    await sequelize.query("DELETE FROM sys_dict_item WHERE dict_id = 'course_type'");
    await sequelize.query("DELETE FROM sys_dict WHERE dict_code = 'course_type'");
    
    // 插入字典主表
    await sequelize.query(`
      INSERT INTO sys_dict (id, dict_name, dict_code, description, del_flag, create_by, create_time, update_by, update_time) 
      VALUES ('dict_course_type', '课程类型', 'course_type', '课程类型字典', 0, NULL, NOW(), NULL, NULL)
    `);
    
    // 插入字典项
    const dictItems = [
      ['dict_course_type_1', 'course_type', 'Scratch编程', 'scratch', 'Scratch图形化编程', 1],
      ['dict_course_type_2', 'course_type', 'Python编程', 'python', 'Python代码编程', 2],
      ['dict_course_type_3', 'course_type', 'JavaScript编程', 'javascript', 'JavaScript网页编程', 3],
      ['dict_course_type_4', 'course_type', 'C++编程', 'cpp', 'C++代码编程', 4],
      ['dict_course_type_5', 'course_type', 'Java编程', 'java', 'Java代码编程', 5]
    ];
    
    for (const item of dictItems) {
      await sequelize.query(`
        INSERT INTO sys_dict_item (id, dict_id, item_text, item_value, description, sort_order, status, create_by, create_time, update_by, update_time) 
        VALUES (?, ?, ?, ?, ?, ?, 1, NULL, NOW(), NULL, NULL)
      `, {
        replacements: item
      });
    }
    
    // 验证
    const [results] = await sequelize.query("SELECT COUNT(*) as count FROM sys_dict_item WHERE dict_id = 'course_type'");
    console.log(`✅ 字典数据修复完成！共插入 ${results[0].count} 条课程类型字典项`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 修复失败:', error);
    process.exit(1);
  }
}

fixDictData();
