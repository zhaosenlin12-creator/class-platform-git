const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const models = require('../src/models');
const encryptUtil = require('../src/utils/encrypt');

async function checkStudentLogin() {
  try {
    console.log('=== 检查学生登录信息 ===\n');
    
    // 查找 stu0001
    const student = await models.SysUser.findOne({
      where: { username: 'stu0001' }
    });
    
    if (student) {
      console.log('找到学生账号:');
      console.log('ID:', student.id);
      console.log('用户名:', student.username);
      console.log('真实姓名:', student.realname);
      console.log('用户身份:', student.user_identity, '(1=admin, 2=teacher, 3=student)');
      console.log('状态:', student.status);
      const hashType = encryptUtil.isBcryptHash(student.password) ? 'bcrypt' : 'md5';
      console.log(`密码(Hash - ${hashType}):`, student.password);
      console.log('');
      
      // 测试密码
      const testPasswords = ['123', '123456', 'stu0001'];
      console.log('测试密码:');
      for (const pwd of testPasswords) {
        let match = false;
        if (encryptUtil.isBcryptHash(student.password)) {
          match = await encryptUtil.comparePassword(pwd, student.password);
          console.log(`  ${pwd} -> ${match ? '✓ 匹配' : '✗ 不匹配'}`);
        } else {
          const md5 = encryptUtil.md5(pwd);
          match = md5 === student.password;
          console.log(`  ${pwd} -> ${md5} ${match ? '✓ 匹配' : '✗ 不匹配'}`);
        }
      }
    } else {
      console.log('未找到用户名为 stu0001 的账号');
      
      // 查找所有学生账号
      const students = await models.SysUser.findAll({
        where: { user_identity: 3 },
        attributes: ['id', 'username', 'realname', 'status']
      });
      
      console.log(`\n系统中共有 ${students.length} 个学生账号:`);
      students.forEach((s, i) => {
        console.log(`${i + 1}. ${s.username} (${s.realname}) - 状态: ${s.status}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('检查失败:', error);
    process.exit(1);
  }
}

checkStudentLogin();
