const axios = require('axios');

// 配置
const API_URL = 'http://localhost:8081';
const STUDENT_USER = { username: 'stu0001', password: '123456' };

async function runTest() {
  console.log('🚀 开始测试作业提交接口...\n');
  
  try {
    // 1. 学生登录
    console.log('1️⃣  学生登录...');
    const loginRes = await axios.post(`${API_URL}/sys/login`, STUDENT_USER);
    if (!loginRes.data.success) throw new Error('登录失败');
    const token = loginRes.data.result.token;
    console.log('   ✅ 登录成功');

    // 2. 获取我的作业
    console.log('\n2️⃣  获取我的作业...');
    const homeworkRes = await axios.get(`${API_URL}/homework/student/my-homework`, {
      headers: { 'X-Access-Token': token },
      params: { pageNo: 1, pageSize: 10, status: 'ongoing' }
    });
    
    const homeworks = homeworkRes.data.result.records;
    // 找到一个未提交的作业
    const targetHomework = homeworks.find(h => h.submission_status === 'not_submitted' || h.submission_status === 'pending');
    
    if (!targetHomework) {
      console.log('   ⚠️ 没有找到未提交的作业，尝试查找所有作业');
      // 如果没有进行中的，找任何一个
      if (homeworks.length === 0) throw new Error('没有找到任何作业');
    } 
    
    const homeworkId = targetHomework ? targetHomework.id : homeworks[0].id;
    console.log(`   ✅ 目标作业: ${targetHomework ? targetHomework.homework_title : homeworks[0].homework_title} (ID: ${homeworkId})`);

    // 3. 提交作业
    console.log(`\n3️⃣  提交作业 (POST /homework/submit)...`);
    const submitData = {
      homeworkId: homeworkId,
      content: '这是通过自动化脚本提交的测试作业内容',
      attachments: JSON.stringify([{ name: 'test.txt', url: 'http://example.com/test.txt', size: 1024 }]),
      // 兼容字段
      workName: '自动化测试作业提交',
      workFile: 'http://example.com/test.txt',
      workType: 1
    };
    
    const submitRes = await axios.post(`${API_URL}/homework/submit`, submitData, {
      headers: { 'X-Access-Token': token }
    });
    
    if (submitRes.data.success) {
      console.log('   ✅ 提交成功!');
      console.log(`      提交ID: ${submitRes.data.result.id}`);
    } else {
      console.error(`   ❌ 提交失败: ${submitRes.data.message}`);
    }
    
    // 4. 再次检查提交列表 (作为验证)
    // 由于这是学生脚本，我们不需要作为教师检查，只要API返回成功即可

  } catch (error) {
    console.error('❌ 测试过程出错:', error.message);
    if (error.response) {
      console.error('   响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

runTest();
