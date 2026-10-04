const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const API_BASE_URL = 'http://localhost:8081';
const TEACHER_USERNAME = 'admin';
const TEACHER_PASSWORD = 'admin123';

async function login(username, password) {
  try {
    const response = await axios.post(`${API_BASE_URL}/sys/login`, {
      username,
      password
    });
    return response.data.result.token;
  } catch (error) {
    console.error(`[ERROR] Login failed for ${username}:`, error.message);
    throw error;
  }
}

async function testAttachmentDisplay() {
  console.log('=== 测试附件显示功能 ===\n');
  
  try {
    // 1. 教师登录
    console.log('1. 教师登录...');
    const teacherToken = await login(TEACHER_USERNAME, TEACHER_PASSWORD);
    console.log('   ✓ 教师登录成功\n');
    
    // 2. 获取教师作业列表
    console.log('2. 获取教师作业列表...');
    const homeworkListRes = await axios.get(`${API_BASE_URL}/homework/list`, {
      headers: { 'X-Access-Token': teacherToken },
      params: { pageNo: 1, pageSize: 10 }
    });
    
    if (!homeworkListRes.data.success) {
      console.error('   ✗ 获取作业列表失败:', homeworkListRes.data.message);
      return;
    }
    
    const homeworks = homeworkListRes.data.result.records || [];
    console.log(`   ✓ 获取到 ${homeworks.length} 个作业\n`);
    
    if (homeworks.length === 0) {
      console.log('   ! 没有作业');
      return;
    }
    
    // 3. 获取第一个作业的提交列表
    const firstHomework = homeworks[0];
    console.log(`3. 获取作业 "${firstHomework.homework_title}" 的提交列表...`);
    
    const submissionsRes = await axios.get(`${API_BASE_URL}/homework/submissions/${firstHomework.id}`, {
      headers: { 'X-Access-Token': teacherToken }
    });
    
    if (!submissionsRes.data.success) {
      console.error('   ✗ 获取提交列表失败:', submissionsRes.data.message);
      return;
    }
    
    const submissions = submissionsRes.data.result.records || [];
    console.log(`   ✓ 获取到 ${submissions.length} 个提交\n`);
    
    if (submissions.length === 0) {
      console.log('   ! 没有提交记录');
      return;
    }
    
    // 4. 检查提交内容
    console.log('4. 检查提交内容:');
    submissions.forEach((sub, index) => {
      console.log(`\n   提交 ${index + 1}:`);
      console.log(`     学生: ${sub.student ? sub.student.realname : '(未关联)'}`);
      console.log(`     学号: ${sub.student ? sub.student.student_no : '(未关联)'}`);
      console.log(`     内容: ${sub.content ? sub.content.substring(0, 30) + '...' : '(空)'}`);
      console.log(`     附件: ${sub.attachments ? '有' : '无'}`);
      
      if (sub.attachments) {
        try {
          const attachments = typeof sub.attachments === 'string' ? JSON.parse(sub.attachments) : sub.attachments;
          console.log(`     附件数量: ${attachments.length}`);
          attachments.forEach((file, i) => {
            console.log(`       ${i + 1}. ${file.name} - ${file.url ? file.url.substring(0, 50) : '无URL'}`);
          });
        } catch (e) {
          console.log(`     附件解析失败: ${e.message}`);
        }
      }
      
      console.log(`     状态: ${sub.status}`);
    });
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('[ERROR] 测试失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

testAttachmentDisplay();
