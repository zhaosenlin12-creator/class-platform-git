const axios = require('axios');

(async () => {
  console.log('=== 学生作业API测试 ===\n');
  
  try {
    // 1. 登录
    console.log('1. 登录学生账号...');
    const loginRes = await axios.post('http://localhost:8081/sys/login', {
      username: 'stu0001',
      password: '123456'
    });
    
    if (!loginRes.data.success) {
      console.error('❌ 登录失败:', loginRes.data.message);
      process.exit(1);
    }
    
    const token = loginRes.data.result.token;
    const userInfo = loginRes.data.result.userInfo;
    console.log('✅ 登录成功');
    console.log('   用户名:', userInfo.username);
    console.log('   用户ID:', userInfo.id);
    console.log('   真实姓名:', userInfo.realname);
    console.log('');
    
    // 2. 获取作业列表
    console.log('2. 获取学生作业列表...');
    const homeworkRes = await axios.get('http://localhost:8081/homework/student/my-homework', {
      headers: { 'X-Access-Token': token },
      params: { pageNo: 1, pageSize: 10 }
    });
    
    console.log('API响应状态:', homeworkRes.data.success ? '✅ 成功' : '❌ 失败');
    console.log('响应消息:', homeworkRes.data.message);
    console.log('');
    
    if (homeworkRes.data.success) {
      const result = homeworkRes.data.result;
      console.log('📊 数据统计:');
      console.log('   总记录数:', result.total);
      console.log('   当前页:', result.pageNo);
      console.log('   每页数量:', result.pageSize);
      console.log('   返回记录:', result.records.length);
      console.log('');
      
      if (result.records.length > 0) {
        console.log('📝 作业列表:');
        result.records.forEach((hw, i) => {
          console.log(`\n   ${i + 1}. ${hw.homework_title}`);
          console.log(`      ID: ${hw.id}`);
          console.log(`      类型: ${hw.homework_type}`);
          console.log(`      状态: ${hw.status}`);
          console.log(`      是否模板: ${hw.is_template}`);
          console.log(`      截止时间: ${hw.deadline}`);
          console.log(`      提交状态: ${hw.submission_status || '未提交'}`);
        });
      } else {
        console.log('⚠️  作业列表为空！');
        console.log('\n完整响应数据:');
        console.log(JSON.stringify(homeworkRes.data, null, 2));
      }
    } else {
      console.log('❌ API调用失败');
      console.log('完整响应:');
      console.log(JSON.stringify(homeworkRes.data, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ 测试过程出错:');
    console.error('错误信息:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log('\n=== 测试完成 ===');
  process.exit(0);
})();
