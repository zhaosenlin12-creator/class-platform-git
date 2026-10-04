/**
 * 测试作业模板和分配API
 */

const axios = require('axios');

const API_BASE = 'http://localhost:8081';
let token = '';

// 测试用例
async function runTests() {
  try {
    console.log('='.repeat(50));
    console.log('开始测试作业模板和分配API');
    console.log('='.repeat(50));

    // 1. 登录获取token
    console.log('\n1️⃣  测试登录...');
    const loginRes = await axios.post(`${API_BASE}/sys/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (loginRes.data.success) {
      token = loginRes.data.result.token;
      console.log('✅ 登录成功');
      console.log('Token:', token.substring(0, 20) + '...');
    } else {
      console.error('❌ 登录失败:', loginRes.data.message);
      return;
    }

    // 2. 测试获取模板列表
    console.log('\n2️⃣  测试获取模板列表...');
    try {
      const templatesRes = await axios.get(`${API_BASE}/homework/templates`, {
        headers: { 'X-Access-Token': token },
        params: { pageNo: 1, pageSize: 10 }
      });
      console.log('✅ 获取模板列表成功');
      console.log('响应数据:', JSON.stringify(templatesRes.data, null, 2));
    } catch (error) {
      console.error('❌ 获取模板列表失败');
      console.error('错误信息:', error.response?.data || error.message);
      console.error('状态码:', error.response?.status);
    }

    // 3. 测试创建模板
    console.log('\n3️⃣  测试创建模板...');
    try {
      const createRes = await axios.post(`${API_BASE}/homework/templates`, {
        homeworkTitle: '测试作业模板',
        homeworkType: '编程作业',
        difficulty: 3,
        description: '这是一个测试作业模板',
        requirements: '请完成以下任务：\n1. 编写代码\n2. 提交报告',
        totalScore: 100,
        passScore: 60
      }, {
        headers: { 'X-Access-Token': token }
      });
      console.log('✅ 创建模板成功');
      console.log('响应数据:', JSON.stringify(createRes.data, null, 2));
    } catch (error) {
      console.error('❌ 创建模板失败');
      console.error('错误信息:', error.response?.data || error.message);
      console.error('状态码:', error.response?.status);
    }

    // 4. 测试获取班级列表（用于分配作业）
    console.log('\n4️⃣  测试获取班级列表...');
    try {
      const classRes = await axios.get(`${API_BASE}/class/list`, {
        headers: { 'X-Access-Token': token }
      });
      console.log('✅ 获取班级列表成功');
      console.log('班级数量:', classRes.data.result?.records?.length || 0);
      if (classRes.data.result?.records?.length > 0) {
        console.log('第一个班级:', classRes.data.result.records[0]);
      }
    } catch (error) {
      console.error('❌ 获取班级列表失败');
      console.error('错误信息:', error.response?.data || error.message);
    }

    // 5. 测试获取已分配作业列表
    console.log('\n5️⃣  测试获取已分配作业列表...');
    try {
      const assignmentsRes = await axios.get(`${API_BASE}/homework/assignments`, {
        headers: { 'X-Access-Token': token },
        params: { pageNo: 1, pageSize: 10 }
      });
      console.log('✅ 获取已分配作业列表成功');
      console.log('响应数据:', JSON.stringify(assignmentsRes.data, null, 2));
    } catch (error) {
      console.error('❌ 获取已分配作业列表失败');
      console.error('错误信息:', error.response?.data || error.message);
      console.error('状态码:', error.response?.status);
    }

    console.log('\n' + '='.repeat(50));
    console.log('测试完成');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
runTests();
