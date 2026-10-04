/**
 * 初始化管理员账号
 */

require('dotenv').config();
const models = require('./src/models');
const crypto = require('crypto');

async function initAdmin() {
  try {
    console.log('🔄 开始初始化管理员账号...');
    
    // 检查admin用户是否存在
    const existingAdmin = await models.SysUser.findOne({
      where: { username: 'admin' }
    });
    
    if (existingAdmin) {
      console.log('⚠️  管理员账号已存在，更新密码...');
      
      // 更新密码为 admin123 的MD5
      const passwordMd5 = crypto.createHash('md5').update('admin123').digest('hex');
      await existingAdmin.update({
        password: passwordMd5,
        status: 1,
        del_flag: 0
      });
      
      console.log('✅ 管理员密码已更新为: admin123');
      console.log('   用户名: admin');
      console.log('   密码: admin123');
      console.log('   MD5: ' + passwordMd5);
    } else {
      console.log('📝 创建新的管理员账号...');
      
      // 创建admin用户
      const passwordMd5 = crypto.createHash('md5').update('admin123').digest('hex');
      await models.SysUser.create({
        id: '1',
        username: 'admin',
        realname: '系统管理员',
        password: passwordMd5,
        user_identity: 1, // 管理员
        email: 'admin@teaching.com',
        phone: '13800138000',
        status: 1,
        del_flag: 0,
        work_no: 'ADMIN001',
        post: '系统管理员'
      });
      
      console.log('✅ 管理员账号创建成功！');
      console.log('   用户名: admin');
      console.log('   密码: admin123');
      console.log('   MD5: ' + passwordMd5);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    process.exit(1);
  }
}

initAdmin();
