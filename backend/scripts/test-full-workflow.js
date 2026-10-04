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
    console.log(`[INFO] Login successful for ${username}`);
    return response.data.result.token;
  } catch (error) {
    console.error(`[ERROR] Login failed for ${username}:`, error.message);
    throw error;
  }
}

async function createHomework(token, teacherId) {
  try {
    const homeworkData = {
      homeworkTitle: `自动测试作业-${Date.now()}`,
      homeworkType: 1, // 1: 练习, 2: 考试
      courseId: null, // 未分配课程
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      description: '这是一个由自动化脚本创建的测试作业',
      requirements: '<p>请完成测试并验证</p>',
      totalScore: 100,
      passScore: 60,
      maxSubmissions: 3,
      allowLateSubmit: 1,
      status: 'ongoing',
      targetType: 'all', // 分配给所有学生
      classes: [] // targetType为all时不需要
    };

    const response = await axios.post(`${API_BASE_URL}/homework/create`, homeworkData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('[INFO] Homework created:', response.data.result.id);
    return response.data.result.id;
  } catch (error) {
    console.error('[ERROR] Create homework failed:', error.message);
    if (error.response) console.error(error.response.data);
    throw error;
  }
}

async function submitHomework(token, homeworkId) {
  try {
    const submissionData = {
      homeworkId: homeworkId,
      content: '我是学生，这是我的自动提交内容',
      attachments: [],
      workName: '自动提交作业',
      workFile: '',
      workType: 1
    };

    const response = await axios.post(`${API_BASE_URL}/homework/submit`, submissionData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('[INFO] Homework submitted:', response.data.message);
    return response.data;
  } catch (error) {
    console.error('[ERROR] Submit homework failed:', error.message);
    if (error.response) console.error(error.response.data);
    throw error;
  }
}

async function getStudentHomeworkList(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/homework/student/my-homework?pageNo=1&pageSize=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    // Check statuses
    const records = response.data.result.records;
    const statuses = records.map(r => ({ id: r.id, title: r.homework_title, status: r.submission_status }));
    console.log('[INFO] Student Homework List Statuses:', statuses);
    return records;
  } catch (error) {
    console.error('[ERROR] Get student homework list failed:', error.message);
    throw error;
  }
}

async function getTeacherSubmissionList(token, homeworkId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/homework/submissions/${homeworkId}?pageNo=1&pageSize=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const records = response.data.result.records;
    console.log(`[INFO] Teacher Submission List for ${homeworkId}: found ${records.length} submissions`);
    if (records.length > 0) {
      console.log('[INFO] First submission content:', records[0].content);
      console.log('[INFO] First submission status:', records[0].status);
      return records[0].id;
    }
    return null;
  } catch (error) {
    console.error('[ERROR] Get teacher submission list failed:', error.message);
    if (error.response) console.error(error.response.data);
    throw error;
  }
}

async function gradeHomework(token, submissionId) {
  try {
    const gradeData = {
      submissionId: submissionId,
      score: 95,
      feedback: '自动批改：优秀'
    };
    const response = await axios.post(`${API_BASE_URL}/homework/review`, gradeData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('[INFO] Homework graded:', response.data.message);
  } catch (error) {
    console.error('[ERROR] Grade homework failed:', error.message);
    if (error.response) console.error(error.response.data);
    throw error;
  }
}

async function runTest() {
  try {
    console.log('--- Starting Full Workflow Test ---');
    
    // 1. Teacher Login
    const teacherToken = await login(TEACHER_USERNAME, TEACHER_PASSWORD);
    
    // 2. Create Homework
    const homeworkId = await createHomework(teacherToken);
    
    // 3. Student Login
    const studentToken = await login(STUDENT_USERNAME, STUDENT_PASSWORD);
    
    // 4. Student Submit
    await submitHomework(studentToken, homeworkId);
    
    // 5. Verify Student Status (Should be 'submitted')
    console.log('--- Verifying Student Status ---');
    await getStudentHomeworkList(studentToken);
    
    // 6. Teacher View Submissions
    console.log('--- Verifying Teacher View ---');
    const submissionId = await getTeacherSubmissionList(teacherToken, homeworkId);
    
    if (submissionId) {
      // 7. Teacher Grade
      console.log('--- Grading Homework ---');
      await gradeHomework(teacherToken, submissionId);
      
      // 8. Verify Student Status Again (Should be 'graded')
      console.log('--- Verifying Student Status After Grading ---');
      await getStudentHomeworkList(studentToken);
    } else {
      console.error('[ERROR] No submission found to grade!');
    }
    
    console.log('--- Test Completed ---');
  } catch (error) {
    console.error('[ERROR] Test Failed:', error);
  }
}

runTest();
