/**
 * 为 teaching_course_unit 添加资源关联字段
 */
require('dotenv').config();
const sequelize = require('../src/config/database');

async function addResourceFields() {
  try {
    console.log('🔧 开始为 teaching_course_unit 添加资源关联字段...\n');

    // 1. 添加 resource_id 字段
    console.log('📝 Step 1: 添加 resource_id 字段...');
    try {
      await sequelize.query(`
        ALTER TABLE teaching_course_unit 
        ADD COLUMN resource_id varchar(32) DEFAULT NULL COMMENT '关联资源ID' AFTER content_url
      `);
      console.log('✅ resource_id 字段添加成功');
    } catch (error) {
      if (error.original && error.original.errno === 1060) {
        console.log('⏭️  resource_id 字段已存在，跳过');
      } else {
        throw error;
      }
    }

    // 2. 添加 resource_name 字段
    console.log('\n📝 Step 2: 添加 resource_name 字段...');
    try {
      await sequelize.query(`
        ALTER TABLE teaching_course_unit 
        ADD COLUMN resource_name varchar(200) DEFAULT NULL COMMENT '资源名称' AFTER resource_id
      `);
      console.log('✅ resource_name 字段添加成功');
    } catch (error) {
      if (error.original && error.original.errno === 1060) {
        console.log('⏭️  resource_name 字段已存在，跳过');
      } else {
        throw error;
      }
    }

    // 3. 添加索引
    console.log('\n📝 Step 3: 添加 resource_id 索引...');
    try {
      await sequelize.query(`
        ALTER TABLE teaching_course_unit ADD INDEX idx_resource_id (resource_id)
      `);
      console.log('✅ resource_id 索引添加成功');
    } catch (error) {
      if (error.original && error.original.errno === 1061) {
        console.log('⏭️  idx_resource_id 索引已存在，跳过');
      } else {
        throw error;
      }
    }

    console.log('\n✅ 资源关联字段添加完成');
  } catch (error) {
    console.error('❌ 添加字段失败:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

addResourceFields();




