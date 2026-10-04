/**
 * 创建教师账号脚本
 * 使用方法: node scripts/create-teacher.js <username> <realname> [password]
 * 例如: node scripts/create-teacher.js teacher02 "李老师" teacher123
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_NAME = process.env.DB_NAME || 'teaching_platform';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '123456';

const models = require('../src/models');
const encrypt = require('../src/utils/encrypt');
const uuid = require('../src/utils/uuid');

async function createTeacher() {
  try {
    // 获取命令行参数
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.log('\n使用方法: node scripts/create-teacher.js <username> <realname> [password]');
      console.log('例如: node scripts/create-teacher.js teacher02 "李老师" teacher123');
      console.log('');
      process.exit(1);
    }

    const username = args[0];
    const realname = args[1];
    const password = args[2] || 'teacher123'; // 默认密码
    const passwordHash = await encrypt.hashPassword(password);

    // 检查用户名是否已存在
    const existing = await models.SysUser.findOne({
      where: { username: username }
    });

    if (existing) {
      console.log(`❌ 用户名 "${username}" 已存在！`);
      process.exit(1);
    }

    // 创建教师账号
    const teacherData = {
      id: uuid.generate(),
      username: username,
      realname: realname,
      password: passwordHash,
      user_identity: 2, // 2=教师
      status: 1,
      del_flag: 0,
      create_time: new Date(),
      update_time: new Date()
    };

    await models.SysUser.create(teacherData);

    console.log('\n✅ 教师账号创建成功！');
    console.log('═══════════════════════════════');
    console.log(`   用户名: ${username}`);
    console.log(`   姓名:   ${realname}`);
    console.log(`   密码:   ${password}`);
    console.log(`   角色:   教师`);
    console.log('═══════════════════════════════');
    console.log('\n该账号可以立即用于登录前端系统。\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ 创建教师账号失败:', error.message);
    process.exit(1);
  }
}

createTeacher();





