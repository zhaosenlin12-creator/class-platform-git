const axios = require('axios');

// 配置
const API_URL = 'http://localhost:8081';
const TEACHER_USER = { username: 'admin', password: 'admin123' };

async function runTest() {
  console.log('🚀 开始测试查看作业提交列表...\n');
  
  try {
    // 1. 教师登录
    console.log('1️⃣  教师登录...');
    const loginRes = await axios.post(`${API_URL}/sys/login`, TEACHER_USER);
    if (!loginRes.data.success) throw new Error('登录失败');
    const token = loginRes.data.result.token;
    console.log('   ✅ 登录成功');

    // 2. 获取最近的一个非模板作业
    console.log('\n2️⃣  查找已有作业...');
    const homeworkRes = await axios.get(`${API_URL}/homework/list`, {
      headers: { 'X-Access-Token': token },
      params: { pageNo: 1, pageSize: 1 }
    });
    
    if (!homeworkRes.data.success || homeworkRes.data.result.records.length === 0) {
      throw new Error('没有找到任何作业，请先创建并分配作业');
    }
    
    const homework = homeworkRes.data.result.records[0];
    const homeworkId = homework.id;
    console.log(`   ✅ 找到作业: ${homework.homework_title} (ID: ${homeworkId})`);

    // 3. 获取该作业的提交列表
    console.log(`\n3️⃣  获取提交列表 (GET /homework/submissions/${homeworkId})...`);
    try {
      const submissionRes = await axios.get(`${API_URL}/homework/submissions/${homeworkId}`, {
        headers: { 'X-Access-Token': token }
      });
      
      console.log('   ✅ 获取成功!');
      console.log(`   提交数量: ${submissionRes.data.result.total}`);
    } catch (err) {
      console.error('   ❌ 获取失败 (预期中的错误)');
      if (err.response) {
        console.error(`   状态码: ${err.response.status}`);
        console.error(`   错误信息: ${JSON.stringify(err.response.data)}`);
      } else {
        console.error(err.message);
      }
    }

  } catch (error) {
    console.error('❌ 测试过程出错:', error.message);
  }
}

runTest();
