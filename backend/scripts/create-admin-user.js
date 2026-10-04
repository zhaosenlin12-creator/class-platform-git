/**
 * 创建或重置管理员账号
 * 使用方法: node backend/scripts/create-admin-user.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_NAME = process.env.DB_NAME || 'teaching_platform';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '123456';

const models = require('../src/models');
const encrypt = require('../src/utils/encrypt');

async function createOrResetAdmin() {
  try {
    const defaultPassword = 'admin123';
    const passwordHash = await encrypt.hashPassword(defaultPassword);
    const adminData = {
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
    };

    // 查找管理员
    const existingAdmin = await models.SysUser.findOne({
      where: { username: 'admin' }
    });

    if (existingAdmin) {
      // 更新密码
      await existingAdmin.update({
        password: passwordHash,
        user_identity: 1,
        status: 1,
        del_flag: 0,
        update_time: new Date()
      });
      console.log('\n✅ 管理员密码已重置！');
    } else {
      // 创建管理员
      await models.SysUser.create(adminData);
      console.log('\n✅ 管理员账号已创建！');
    }

    console.log('═══════════════════════════════════════');
    console.log('   管理员账号信息：');
    console.log('   用户名: admin');
    console.log(`   密码:   ${defaultPassword}`);
    console.log('   角色:   系统管理员');
    console.log('   权限:   可访问管理后台（/admin）');
    console.log('═══════════════════════════════════════');
    console.log('\n📝 其他账号：');
    console.log('   教师: teacher01 / teacher123 （访问 /teacher）');
    console.log('   学生: student01 / student123 （访问 /student）\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ 操作失败:', error.message);
    process.exit(1);
  }
}

createOrResetAdmin();





