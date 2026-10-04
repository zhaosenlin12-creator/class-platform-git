/**
 * 插入测试数据脚本
 */
require('dotenv').config();
const sequelize = require('../src/config/database');

async function insertTestData() {
  try {
    console.log('🚀 开始插入测试数据...\n');

    // 插入课程数据
    console.log('📚 插入课程数据...');
    await sequelize.query(`
      INSERT IGNORE INTO teaching_course (id, course_name, course_code, category, level, description, duration, teacher_id, teacher_name, student_count, status, del_flag, create_time)
      VALUES 
      ('course-001', 'Scratch图形化编程', 'SCRATCH-001', 'Scratch', '初级', '面向儿童的图形化编程入门课程', 60, '1', '系统管理员', 0, 1, 0, NOW()),
      ('course-002', 'Python基础编程', 'PYTHON-001', 'Python', '中级', 'Python语言基础与算法', 90, '1', '系统管理员', 0, 1, 0, NOW()),
      ('course-003', 'ScratchJr启蒙课', 'SCRATCHJR-001', 'ScratchJr', '入门', '幼儿编程启蒙课程', 45, '1', '系统管理员', 0, 1, 0, NOW())
    `);
    console.log('✅ 课程数据插入成功\n');

    // 插入课程资源数据
    console.log('📁 插入课程资源数据...');
    await sequelize.query(`
      INSERT IGNORE INTO teaching_resource (
        id, resource_name, resource_type, file_name, file_path, file_size, file_extension, 
        mime_type, file_url, storage_type, category, description, 
        uploader_id, uploader_name, download_count, view_count, del_flag, create_time
      )
      VALUES 
      ('resource-001', 'Scratch教学PPT', 'document', 'scratch-lesson1.pdf', 'scratch-lesson1.pdf', 2048576, 'pdf', 'application/pdf', '/api/resource/download/resource-001', 'local', 'document', 'Scratch第一课教学课件', '1', '系统管理员', 0, 0, 0, NOW()),
      ('resource-002', '示例项目-小猫跳跃', 'project', 'cat-jump.sb3', 'cat-jump.sb3', 512000, 'sb3', 'application/x-scratch-project', '/api/resource/download/resource-002', 'local', 'project', 'Scratch示例项目', '1', '系统管理员', 0, 0, 0, NOW()),
      ('resource-003', 'Python入门教程', 'video', 'python-intro.mp4', 'python-intro.mp4', 52428800, 'mp4', 'video/mp4', '/api/resource/download/resource-003', 'local', 'video', 'Python编程入门视频教程', '1', '系统管理员', 0, 0, 0, NOW()),
      ('resource-004', 'Scratch课程大纲', 'document', 'scratch-outline.docx', 'scratch-outline.docx', 102400, 'docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '/api/resource/download/resource-004', 'local', 'document', 'Scratch完整课程大纲', '1', '系统管理员', 0, 0, 0, NOW()),
      ('resource-005', 'Python练习题集', 'document', 'python-exercises.pdf', 'python-exercises.pdf', 1536000, 'pdf', 'application/pdf', '/api/resource/download/resource-005', 'local', 'document', 'Python基础练习题', '1', '系统管理员', 0, 0, 0, NOW())
    `);
    console.log('✅ 课程资源数据插入成功\n');

    // 插入课程单元数据
    console.log('📖 插入课程单元数据...');
    await sequelize.query(`
      INSERT IGNORE INTO teaching_course_unit (
        id, course_id, unit_name, unit_no, content_type, description, duration, sort_no, del_flag, create_by, create_time
      )
      VALUES 
      ('unit-001', 'course-001', '第一课：认识Scratch', 1, 'lesson', 'Scratch界面介绍与基本操作', 45, 1, 0, '1', NOW()),
      ('unit-002', 'course-001', '第二课：角色与舞台', 2, 'lesson', '学习角色添加和舞台设置', 45, 2, 0, '1', NOW()),
      ('unit-003', 'course-001', '第三课：运动与控制', 3, 'lesson', '掌握运动指令和事件控制', 45, 3, 0, '1', NOW()),
      ('unit-004', 'course-002', 'Python环境安装', 1, 'lesson', 'Python开发环境配置', 30, 1, 0, '1', NOW()),
      ('unit-005', 'course-002', 'Python基础语法', 2, 'lesson', '变量、数据类型和运算符', 60, 2, 0, '1', NOW())
    `);
    console.log('✅ 课程单元数据插入成功\n');

    // 查询统计
    console.log('📊 数据统计：');
    const [courses] = await sequelize.query('SELECT COUNT(*) as count FROM teaching_course WHERE del_flag = 0');
    const [resources] = await sequelize.query('SELECT COUNT(*) as count FROM teaching_resource WHERE del_flag = 0');
    const [units] = await sequelize.query('SELECT COUNT(*) as count FROM teaching_course_unit WHERE del_flag = 0');

    console.log(`  - 课程数量: ${courses[0].count}`);
    console.log(`  - 资源数量: ${resources[0].count}`);
    console.log(`  - 课程单元数量: ${units[0].count}`);

    console.log('\n✅ 所有测试数据插入完成！');
    process.exit(0);

  } catch (error) {
    console.error('❌ 插入测试数据失败:', error);
    process.exit(1);
  }
}

insertTestData();

