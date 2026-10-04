/**
 * 测试作业模板API
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8081';

// 测试用token（从登录获取）
let authToken = '';

async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/sys/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (response.data.success) {
      authToken = response.data.result.token;
      console.log('✅ 登录成功，获取token:', authToken.substring(0, 20) + '...');
      return true;
    } else {
      console.error('❌ 登录失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 登录异常:', error.message);
    return false;
  }
}

async function testGetTemplates() {
  try {
    console.log('\n📋 测试获取模板列表...');
    const response = await axios.get(`${BASE_URL}/homework/templates`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('✅ API响应:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ 请求失败:', error.response?.data || error.message);
    return false;
  }
}

async function testCreateTemplate() {
  try {
    console.log('\n📝 测试创建模板...');
    const response = await axios.post(`${BASE_URL}/homework/templates`, {
      title: '测试作业模板',
      description: '这是一个测试模板',
      homeworkType: 'scratch',
      difficulty: 'easy',
      content: '完成一个简单的Scratch项目'
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('✅ 创建成功:', JSON.stringify(response.data, null, 2));
    return response.data.result?.id;
  } catch (error) {
    console.error('❌ 创建失败:', error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('========================================');
  console.log('作业模板API测试');
  console.log('========================================');
  
  // 1. 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('\n❌ 登录失败，终止测试');
    return;
  }
  
  // 2. 获取模板列表
  await testGetTemplates();
  
  // 3. 创建模板
  const templateId = await testCreateTemplate();
  
  // 4. 再次获取列表
  if (templateId) {
    await testGetTemplates();
  }
  
  console.log('\n========================================');
  console.log('测试完成');
  console.log('========================================');
}

runTests();
