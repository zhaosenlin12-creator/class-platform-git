/**
 * 测试作业模板和分配API
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8081';
let token = '';
let templateId = '';

// 1. 登录获取token
async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/sys/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    if (response.data.success) {
      token = response.data.result.token;
      console.log('✅ 登录成功，获取token:', token.substring(0, 20) + '...');
      return true;
    }
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    return false;
  }
}

// 2. 创建作业模板
async function createTemplate() {
  try {
    const response = await axios.post(`${BASE_URL}/homework/templates`, {
      homeworkTitle: '测试作业模板',
      homeworkType: '编程作业',
      difficulty: 3,
      description: '这是一个测试作业模板',
      requirements: '请完成以下要求：\n1. 编写代码\n2. 提交报告',
      totalScore: 100,
      passScore: 60
    }, {
      headers: { 'X-Access-Token': token }
    });
    
    if (response.data.success) {
      templateId = response.data.result.id;
      console.log('✅ 创建模板成功，模板ID:', templateId);
      return true;
    } else {
      console.error('❌ 创建模板失败:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 创建模板失败:', error.response?.data || error.message);
    return false;
  }
}

// 3. 获取模板列表
async function getTemplateList() {
  try {
    const response = await axios.get(`${BASE_URL}/homework/templates`, {
      headers: { 'X-Access-Token': token },
      params: { pageNo: 1, pageSize: 10 }
    });
    
    if (response.data.success) {
      console.log('✅ 获取模板列表成功，共', response.data.result.total, '个模板');
      console.log('   模板列表:', response.data.result.records.map(t => ({
        id: t.id,
        title: t.homework_title,
        type: t.homework_type
      })));
      return true;
    }
  } catch (error) {
    console.error('❌ 获取模板列表失败:', error.response?.data || error.message);
    return false;
  }
}

// 4. 获取模板详情
async function getTemplateDetail() {
  try {
    const response = await axios.get(`${BASE_URL}/homework/templates/${templateId}`, {
      headers: { 'X-Access-Token': token }
    });
    
    if (response.data.success) {
      console.log('✅ 获取模板详情成功');
      console.log('   标题:', response.data.result.homework_title);
      console.log('   难度:', response.data.result.difficulty);
      return true;
    }
  } catch (error) {
    console.error('❌ 获取模板详情失败:', error.response?.data || error.message);
    return false;
  }
}

// 5. 分配作业（需要先有班级）
async function assignHomework() {
  try {
    // 先查询班级列表
    const classResponse = await axios.get(`${BASE_URL}/class/list`, {
      headers: { 'X-Access-Token': token },
      params: { pageNo: 1, pageSize: 1 }
    });
    
    if (!classResponse.data.success || classResponse.data.result.total === 0) {
      console.log('⚠️  没有可用的班级，跳过作业分配测试');
      return true;
    }
    
    const classId = classResponse.data.result.records[0].id;
    console.log('   使用班级ID:', classId);
    
    const response = await axios.post(`${BASE_URL}/homework/assign`, {
      templateId: templateId,
      classIds: [classId],
      publishTime: new Date(),
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后
      allowLateSubmit: 0
    }, {
      headers: { 'X-Access-Token': token }
    });
    
    if (response.data.success) {
      console.log('✅ 作业分配成功，作业ID:', response.data.result.id);
      return true;
    }
  } catch (error) {
    console.error('❌ 作业分配失败:', error.response?.data || error.message);
    return false;
  }
}

// 6. 获取已分配作业列表
async function getAssignmentList() {
  try {
    const response = await axios.get(`${BASE_URL}/homework/assignments`, {
      headers: { 'X-Access-Token': token },
      params: { pageNo: 1, pageSize: 10 }
    });
    
    if (response.data.success) {
      console.log('✅ 获取已分配作业列表成功，共', response.data.result.total, '个作业');
      return true;
    }
  } catch (error) {
    console.error('❌ 获取已分配作业列表失败:', error.response?.data || error.message);
    return false;
  }
}

// 运行所有测试
async function runTests() {
  console.log('\n========================================');
  console.log('🧪 开始测试作业模板和分配API');
  console.log('========================================\n');
  
  if (!await login()) return;
  console.log('');
  
  if (!await createTemplate()) return;
  console.log('');
  
  if (!await getTemplateList()) return;
  console.log('');
  
  if (!await getTemplateDetail()) return;
  console.log('');
  
  if (!await assignHomework()) return;
  console.log('');
  
  if (!await getAssignmentList()) return;
  
  console.log('\n========================================');
  console.log('✅ 所有测试完成！');
  console.log('========================================\n');
}

runTests();
