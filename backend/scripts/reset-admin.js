require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_NAME = process.env.DB_NAME || 'teaching_platform';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '123456';

const models = require('../src/models');
const encrypt = require('../src/utils/encrypt');

async function resetAdmin() {
  try {
    // 查找或创建管理员账号
    const defaultPassword = 'admin123';
    const passwordHash = await encrypt.hashPassword(defaultPassword);
    const [admin, created] = await models.SysUser.findOrCreate({
      where: { username: 'admin' },
      defaults: {
        id: '1',
        username: 'admin',
        realname: '系统管理员',
        password: passwordHash,
        user_identity: 1, // 1=管理员
        status: 1,
        del_flag: 0,
        email: 'admin@teaching.com',
        phone: '13800138000',
        create_time: new Date(),
        update_time: new Date()
      }
    });

    if (!created) {
      // 如果已存在，则更新密码
      await admin.update({
        password: passwordHash,
        update_time: new Date()
      });
      console.log(`✅ 管理员密码已重置为: ${defaultPassword}`);
    } else {
      console.log(`✅ 管理员账号已创建，密码为: ${defaultPassword}`);
    }

    console.log('\n📋 当前可用账号：');
    console.log('   管理员: admin / admin123');
    console.log('   教师:   teacher01 / teacher123');
    console.log('   学生:   student01 / student123');

    process.exit(0);
  } catch (error) {
    console.error('❌ 操作失败:', error);
    process.exit(1);
  }
}

resetAdmin();





