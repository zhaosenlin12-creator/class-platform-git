/**
 * 修复数据表关联关系
 */
require('dotenv').config();
const sequelize = require('../src/config/database');

async function fixTableRelations() {
  try {
    console.log('🔧 开始修复数据表关联关系...\n');

    // 1. 为 teaching_classroom 添加 class_id 字段
    console.log('📝 Step 1: 为 teaching_classroom 添加 class_id 字段...');
    try {
      await sequelize.query(`
        ALTER TABLE teaching_classroom 
        ADD COLUMN class_id varchar(32) DEFAULT NULL COMMENT '班级ID' AFTER classroom_code
      `);
      console.log('✅ class_id 字段添加成功');
    } catch (error) {
      if (error.original && error.original.errno === 1060) {
        console.log('⏭️  class_id 字段已存在，跳过');
      } else {
        throw error;
      }
    }

    // 添加索引
    try {
      await sequelize.query(`
        ALTER TABLE teaching_classroom ADD INDEX idx_class_id (class_id)
      `);
      console.log('✅ class_id 索引添加成功');
    } catch (error) {
      if (error.original && error.original.errno === 1061) {
        console.log('⏭️  class_id 索引已存在，跳过');
      } else {
        throw error;
      }
    }

    // 2. 为 teaching_resource 添加 course_id 和 course_name 字段
    console.log('\n📝 Step 2: 为 teaching_resource 添加 course_id 和 course_name 字段...');
    try {
      await sequelize.query(`
        ALTER TABLE teaching_resource 
        ADD COLUMN course_id varchar(32) DEFAULT NULL COMMENT '课程ID' AFTER resource_type
      `);
      console.log('✅ course_id 字段添加成功');
    } catch (error) {
      if (error.original && error.original.errno === 1060) {
        console.log('⏭️  course_id 字段已存在，跳过');
      } else {
        throw error;
      }
    }

    try {
      await sequelize.query(`
        ALTER TABLE teaching_resource 
        ADD COLUMN course_name varchar(200) DEFAULT NULL COMMENT '课程名称' AFTER course_id
      `);
      console.log('✅ course_name 字段添加成功');
    } catch (error) {
      if (error.original && error.original.errno === 1060) {
        console.log('⏭️  course_name 字段已存在，跳过');
      } else {
        throw error;
      }
    }

    // 添加索引
    try {
      await sequelize.query(`
        ALTER TABLE teaching_resource ADD INDEX idx_course_id (course_id)
      `);
      console.log('✅ course_id 索引添加成功');
    } catch (error) {
      if (error.original && error.original.errno === 1061) {
        console.log('⏭️  course_id 索引已存在，跳过');
      } else {
        throw error;
      }
    }

    console.log('\n✅ 数据表关联关系修复完成！');
    console.log('\n📋 新增字段总结:');
    console.log('  - teaching_classroom.class_id: 关联班级');
    console.log('  - teaching_resource.course_id: 关联课程');
    console.log('  - teaching_resource.course_name: 课程名称');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ 修复失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixTableRelations();





