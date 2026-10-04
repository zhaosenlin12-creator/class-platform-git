const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const API_BASE_URL = 'http://localhost:8081';
const TEACHER_USERNAME = 'admin';
const TEACHER_PASSWORD = 'admin123';

async function login(username, password) {
  const response = await axios.post(`${API_BASE_URL}/sys/login`, {
    username,
    password
  });
  return response.data.result.token;
}

async function finalTest() {
  console.log('=== 最终测试：教师查看提交内容 ===\n');
  
  try {
    // 1. 登录
    console.log('1. 教师登录...');
    const token = await login(TEACHER_USERNAME, TEACHER_PASSWORD);
    console.log('   ✓ 登录成功\n');
    
    // 2. 获取作业列表
    console.log('2. 获取作业列表...');
    const homeworkRes = await axios.get(`${API_BASE_URL}/homework/list`, {
      headers: { 'X-Access-Token': token },
      params: { pageNo: 1, pageSize: 10 }
    });
    
    const homeworks = homeworkRes.data.result.records || [];
    if (homeworks.length === 0) {
      console.log('   ! 没有作业');
      return;
    }
    
    const homework = homeworks[0];
    console.log(`   ✓ 找到作业: ${homework.homework_title}\n`);
    
    // 3. 获取提交列表
    console.log('3. 获取提交列表...');
    const submissionsRes = await axios.get(`${API_BASE_URL}/homework/submissions/${homework.id}`, {
      headers: { 'X-Access-Token': token },
      params: { pageNo: 1, pageSize: 10 }
    });
    
    const result = submissionsRes.data.result;
    const submissions = result.records || [];
    
    console.log(`   ✓ 获取到 ${submissions.length} 个提交\n`);
    
    if (submissions.length === 0) {
      console.log('   ! 没有提交记录');
      return;
    }
    
    // 4. 检查第一个提交
    const first = submissions[0];
    console.log('4. 提交详情:');
    console.log('   ✓ ID:', first.id);
    console.log('   ✓ 学生:', first.student ? first.student.realname : '(无)');
    console.log('   ✓ 学号:', first.student ? first.student.student_no : '(无)');
    console.log('   ✓ 内容:', first.content ? `"${first.content}"` : '(空)');
    console.log('   ✓ 附件:', first.attachments || '(空)');
    console.log('   ✓ 状态:', first.status);
    console.log('   ✓ 得分:', first.score);
    
    // 5. 验证必要字段
    console.log('\n5. 验证数据完整性:');
    const checks = [
      { name: 'ID', value: first.id, pass: !!first.id },
      { name: '学生信息', value: first.student, pass: !!first.student },
      { name: '提交内容', value: first.content, pass: !!first.content },
      { name: '附件字段', value: first.attachments, pass: first.attachments !== undefined },
      { name: '状态', value: first.status, pass: !!first.status }
    ];
    
    checks.forEach(check => {
      const status = check.pass ? '✓' : '✗';
      console.log(`   ${status} ${check.name}: ${check.pass ? '正常' : '缺失'}`);
    });
    
    const allPass = checks.every(c => c.pass);
    console.log(`\n${allPass ? '✅ 所有检查通过！' : '❌ 存在缺失字段'}`);
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('[ERROR]', error.message);
    if (error.response) {
      console.error('响应:', error.response.data);
    }
  }
}

finalTest();
