const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const API_BASE_URL = 'http://localhost:8081';
const STUDENT_USERNAME = 'stu0001';
const STUDENT_PASSWORD = '123456';
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

async function verifySubmissionContent() {
  console.log('=== 验证提交内容显示功能 ===\n');
  
  try {
    // 1. 学生登录
    console.log('1. 学生登录...');
    const studentToken = await login(STUDENT_USERNAME, STUDENT_PASSWORD);
    console.log('   ✓ 学生登录成功\n');
    
    // 2. 获取学生作业列表
    console.log('2. 获取学生作业列表...');
    const homeworkListRes = await axios.get(`${API_BASE_URL}/homework/student/my-homework`, {
      headers: { 'X-Access-Token': studentToken }
    });
    
    if (!homeworkListRes.data.success) {
      console.error('   ✗ 获取作业列表失败:', homeworkListRes.data.message);
      return;
    }
    
    const homeworks = homeworkListRes.data.result.records || [];
    console.log(`   ✓ 获取到 ${homeworks.length} 个作业\n`);
    
    // 3. 查找已提交的作业
    const submittedHomework = homeworks.find(hw => hw.submission_status === 'submitted' || hw.submission_status === 'graded');
    
    if (!submittedHomework) {
      console.log('   ! 没有已提交的作业，无法验证');
      return;
    }
    
    console.log('3. 已提交作业详情:');
    console.log(`   作业标题: ${submittedHomework.homework_title}`);
    console.log(`   提交状态: ${submittedHomework.submission_status}`);
    console.log(`   提交时间: ${submittedHomework.submitted_time}`);
    console.log(`   提交内容: ${submittedHomework.content ? submittedHomework.content.substring(0, 50) : '(空)'}`);
    console.log(`   附件: ${submittedHomework.attachments ? '有' : '无'}`);
    
    if (submittedHomework.content) {
      console.log('   ✓ 学生端可以看到提交内容');
    } else {
      console.log('   ✗ 学生端看不到提交内容');
    }
    console.log('');
    
    // 4. 教师登录
    console.log('4. 教师登录...');
    const teacherToken = await login(TEACHER_USERNAME, TEACHER_PASSWORD);
    console.log('   ✓ 教师登录成功\n');
    
    // 5. 教师查看提交列表
    console.log('5. 教师查看提交列表...');
    const submissionsRes = await axios.get(`${API_BASE_URL}/homework/submissions/${submittedHomework.id}`, {
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
    
    // 6. 检查第一个提交的内容
    const firstSubmission = submissions[0];
    console.log('6. 提交详情:');
    console.log(`   学生: ${firstSubmission.student ? firstSubmission.student.realname : '(未关联)'}`);
    console.log(`   学号: ${firstSubmission.student ? firstSubmission.student.student_no : '(未关联)'}`);
    console.log(`   提交内容: ${firstSubmission.content ? firstSubmission.content.substring(0, 50) : '(空)'}`);
    console.log(`   附件: ${firstSubmission.attachments ? '有' : '无'}`);
    console.log(`   状态: ${firstSubmission.status}`);
    
    if (firstSubmission.student && firstSubmission.student.realname) {
      console.log('   ✓ 学生信息关联正常');
    } else {
      console.log('   ✗ 学生信息未关联');
    }
    
    if (firstSubmission.content) {
      console.log('   ✓ 教师端可以看到提交内容');
    } else {
      console.log('   ✗ 教师端看不到提交内容');
    }
    
    console.log('\n=== 验证完成 ===');
    
  } catch (error) {
    console.error('[ERROR] 验证失败:', error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
    }
  }
}

verifySubmissionContent();
