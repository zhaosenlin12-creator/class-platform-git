require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_NAME = process.env.DB_NAME || 'teaching_platform';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '123456';

const models = require('../src/models');
const encrypt = require('../src/utils/encrypt');

async function ensureUsers() {
  try {
    const teacherPassword = 'teacher123';
    const studentPassword = 'student123';
    const teacherHash = await encrypt.hashPassword(teacherPassword);
    const studentHash = await encrypt.hashPassword(studentPassword);
    const teacherDefaults = {
      id: 'teacher-001',
      username: 'teacher01',
      realname: '张老师',
      password: teacherHash,
      user_identity: 2,
      status: 1,
      del_flag: 0,
      create_time: new Date(),
      update_time: new Date()
    };

    const studentDefaults = {
      id: 'student-001',
      username: 'student01',
      realname: '小明',
      password: studentHash,
      user_identity: 3,
      status: 1,
      del_flag: 0,
      create_time: new Date(),
      update_time: new Date()
    };

    await models.SysUser.findOrCreate({
      where: { username: teacherDefaults.username },
      defaults: teacherDefaults
    });

    await models.SysUser.findOrCreate({
      where: { username: studentDefaults.username },
      defaults: studentDefaults
    });

    console.log(`✅ teacher01 / student01 用户准备就绪 (密码 ${teacherPassword} / ${studentPassword})`);
    process.exit(0);
  } catch (error) {
    console.error('❌ 创建测试用户失败:', error);
    process.exit(1);
  }
}

ensureUsers();

