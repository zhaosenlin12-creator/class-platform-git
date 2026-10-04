const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// 配置
const API_URL = 'http://localhost:8081';
const TEACHER_USER = { username: 'admin', password: 'admin123' }; // 假设admin有教师权限或使用专门的教师账号
const STUDENT_USER = { username: 'stu0001', password: '123456' };

async function runTest() {
  console.log('🚀 开始全流程作业测试...\n');
  let teacherToken = '';
  let studentToken = '';
  let templateId = '';
  let classId = '';
  let homeworkId = '';

  try {
    // ==========================================
    // 1. 教师/管理员登录
    // ==========================================
    console.log('1️⃣  教师登录...');
    const teacherLogin = await axios.post(`${API_URL}/sys/login`, TEACHER_USER);
    if (!teacherLogin.data.success) throw new Error('教师登录失败: ' + teacherLogin.data.message);
    teacherToken = teacherLogin.data.result.token;
    console.log('   ✅ 登录成功');

    // ==========================================
    // 2. 获取班级列表 (为了分配作业)
    // ==========================================
    console.log('\n2️⃣  获取班级列表...');
    const classRes = await axios.get(`${API_URL}/class/list`, {
      headers: { 'X-Access-Token': teacherToken },
      params: { pageNo: 1, pageSize: 10 }
    });
    if (!classRes.data.success) throw new Error('获取班级失败');
    
    const classes = classRes.data.result.records;
    if (classes.length === 0) throw new Error('没有可用的班级，请先创建班级');
    
    // 尝试找到学生所在的班级 (为了验证方便)
    // 这里我们直接取第一个班级，假设测试学生在这个班级里
    // 更严谨的做法是先查学生的班级，但这里简化处理，假设stu0001在这些班级中
    // 根据之前的调试，stu0001在 '森林' (3acaf8fbc582459c8888b2cab6509c15) 和 '哇哈哈'
    const targetClass = classes.find(c => c.class_name && c.class_name.includes('森林')) || classes[0];
    classId = targetClass.id;
    console.log(`   ✅ 选中班级: ${targetClass.class_name} (ID: ${classId})`);

    // ==========================================
    // 3. 创建作业模板
    // ==========================================
    console.log('\n3️⃣  创建作业模板...');
    const templateData = {
      homeworkTitle: `自动化测试作业-${Date.now()}`,
      homeworkType: '编程作业',
      difficulty: 1,
      description: '这是一个由自动化脚本创建的测试作业',
      requirements: '<p>请完成测试流程验证</p>',
      totalScore: 100,
      passScore: 60
    };
    
    const createRes = await axios.post(`${API_URL}/homework/templates`, templateData, {
      headers: { 'X-Access-Token': teacherToken }
    });
    
    if (!createRes.data.success) throw new Error('创建模板失败: ' + createRes.data.message);
    templateId = createRes.data.result.id;
    console.log(`   ✅ 模板创建成功: ${templateData.homeworkTitle} (ID: ${templateId})`);

    // ==========================================
    // 4. 分配作业
    // ==========================================
    console.log('\n4️⃣  分配作业给班级...');
    const assignData = {
      templateId: templateId,
      classIds: [classId],
      publishTime: new Date().toISOString(), // 立即发布
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天后
      allowLateSubmit: 1
    };

    const assignRes = await axios.post(`${API_URL}/homework/assign`, assignData, {
      headers: { 'X-Access-Token': teacherToken }
    });

    if (!assignRes.data.success) throw new Error('分配作业失败: ' + assignRes.data.message);
    homeworkId = assignRes.data.result.id;
    console.log(`   ✅ 作业分配成功 (ID: ${homeworkId})`);

    // ==========================================
    // 5. 学生登录
    // ==========================================
    console.log('\n5️⃣  学生登录...');
    const studentLogin = await axios.post(`${API_URL}/sys/login`, STUDENT_USER);
    if (!studentLogin.data.success) throw new Error('学生登录失败');
    studentToken = studentLogin.data.result.token;
    console.log('   ✅ 登录成功');

    // ==========================================
    // 6. 学生查看作业列表
    // ==========================================
    console.log('\n6️⃣  验证学生能否看到作业...');
    const myHomeworkRes = await axios.get(`${API_URL}/homework/student/my-homework`, {
      headers: { 'X-Access-Token': studentToken },
      params: { pageNo: 1, pageSize: 20 }
    });

    if (!myHomeworkRes.data.success) throw new Error('获取学生作业失败');
    
    const myHomeworks = myHomeworkRes.data.result.records;
    const found = myHomeworks.find(h => h.id === homeworkId);
    
    if (found) {
      console.log(`   ✅ 验证通过! 学生成功看到了作业: "${found.homework_title}"`);
      console.log(`      状态: ${found.status}`);
      console.log(`      截止: ${found.deadline}`);
    } else {
      console.error('   ❌ 验证失败! 学生作业列表中未找到刚分配的作业');
      console.log('   当前作业列表:', myHomeworks.map(h => h.homework_title));
      // 可能是因为学生不在这个班级？
    }

    console.log('\n🎉 测试流程结束');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.response) {
      console.error('   响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

runTest();
