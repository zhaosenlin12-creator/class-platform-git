/**
 * 测试脚本：验证友好错误提示
 * 检查前端和后端的错误处理是否使用友好的中文提示
 */

const fs = require('fs');
const path = require('path');

const webDir = path.join(__dirname, '../web/src');
const backendDir = path.join(__dirname, 'src');

// 技术性错误关键词（不应该直接显示给用户）
const TECHNICAL_KEYWORDS = [
  'Internal Server Error',
  'Internal Error', 
  'undefined',
  'Error:',
  'Exception',
  'Stack trace',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'syntax error',
  '500'
];

// 需要检查的前端文件
const frontendFiles = [
  'views/user/Login.vue',
  'views/user/StudentLogin.vue',
  'views/user/Register.vue',
  'views/management/StudentManagement.vue',
  'views/management/ClassManagement.vue',
  'views/management/TeacherManagement.vue',
  'views/teaching/CourseList.vue',
  'utils/errorHandler.js'
];

// 需要检查的后端文件
const backendFiles = [
  'middleware/errorHandler.js',
  'utils/response.js'
];

console.log('========================================');
console.log('友好错误提示检查测试');
console.log('========================================\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
let warnings = [];

// 检查前端文件
console.log('【前端文件检查】\n');

frontendFiles.forEach(filePath => {
  const fullPath = path.join(webDir, filePath);
  console.log(`检查文件: ${filePath}`);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠️ 文件不存在\n`);
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  
  // 检查是否有直接显示 error.message 的地方（不经过处理）
  totalChecks++;
  const hasRawErrorMessage = /\$message\.error\([^)]*error\.message[^)]*\)/.test(content) ||
                             /\$notification.*error\.message/.test(content);
  
  // 检查是否有友好的错误处理
  const hasFriendlyHandling = content.includes('服务器返回的友好消息') ||
                              content.includes('isFriendlyMsg') ||
                              content.includes('extractErrorMessage') ||
                              content.includes('getFriendlyErrorMessage');
  
  if (hasRawErrorMessage && !hasFriendlyHandling) {
    console.log(`  ⚠️ 可能直接显示技术性错误消息`);
    warnings.push(`${filePath}: 可能直接显示error.message`);
  } else {
    console.log(`  ✅ 错误处理正常`);
    passedChecks++;
  }
  
  // 检查是否有硬编码的技术性错误
  totalChecks++;
  let hasTechnicalError = false;
  TECHNICAL_KEYWORDS.forEach(keyword => {
    // 排除注释和console.log
    const regex = new RegExp(`\\$message\\.error\\([^)]*['"].*${keyword}.*['"][^)]*\\)`, 'i');
    if (regex.test(content)) {
      hasTechnicalError = true;
    }
  });
  
  if (hasTechnicalError) {
    console.log(`  ❌ 包含硬编码的技术性错误消息`);
    failedChecks++;
  } else {
    console.log(`  ✅ 无硬编码技术性错误`);
    passedChecks++;
  }
  
  console.log('');
});

// 检查后端文件
console.log('【后端文件检查】\n');

backendFiles.forEach(filePath => {
  const fullPath = path.join(backendDir, filePath);
  console.log(`检查文件: ${filePath}`);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`  ⚠️ 文件不存在\n`);
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  
  // 检查后端错误处理中间件
  totalChecks++;
  if (filePath.includes('errorHandler')) {
    const hasUniqueConstraintHandling = content.includes('SequelizeUniqueConstraintError');
    const hasFriendlyMessages = content.includes('用户友好') || content.includes('友好提示');
    
    if (hasUniqueConstraintHandling && hasFriendlyMessages) {
      console.log(`  ✅ 包含唯一约束错误的友好处理`);
      passedChecks++;
    } else {
      console.log(`  ⚠️ 可能缺少某些错误类型的友好处理`);
      warnings.push(`${filePath}: 检查错误处理覆盖范围`);
    }
  }
  
  // 检查Response工具
  if (filePath.includes('response')) {
    totalChecks++;
    const hasErrorMethod = content.includes('error') && content.includes('success');
    if (hasErrorMethod) {
      console.log(`  ✅ Response工具包含error方法`);
      passedChecks++;
    } else {
      console.log(`  ❌ Response工具缺少error方法`);
      failedChecks++;
    }
  }
  
  console.log('');
});

// 检查errorHandler.js的错误映射
console.log('【错误映射检查】\n');

const errorHandlerPath = path.join(webDir, 'utils/errorHandler.js');
if (fs.existsSync(errorHandlerPath)) {
  const content = fs.readFileSync(errorHandlerPath, 'utf-8');
  
  const requiredMappings = [
    { key: '账号已存在', desc: '账号重复错误' },
    { key: '学号已存在', desc: '学号重复错误' },
    { key: 'File too large', desc: '文件过大错误' },
    { key: 'Network Error', desc: '网络错误' },
    { key: 'timeout', desc: '超时错误' }
  ];
  
  requiredMappings.forEach(mapping => {
    totalChecks++;
    if (content.includes(mapping.key)) {
      console.log(`  ✅ ${mapping.desc}映射存在`);
      passedChecks++;
    } else {
      console.log(`  ❌ ${mapping.desc}映射缺失`);
      failedChecks++;
    }
  });
  
  // 检查extractErrorMessage函数
  totalChecks++;
  if (content.includes('extractErrorMessage')) {
    console.log(`  ✅ extractErrorMessage函数存在`);
    passedChecks++;
  } else {
    console.log(`  ⚠️ extractErrorMessage函数缺失`);
    warnings.push('errorHandler.js: 缺少extractErrorMessage函数');
  }
}

console.log('\n========================================');
console.log('测试结果汇总');
console.log('========================================');
console.log(`总检查项: ${totalChecks}`);
console.log(`通过: ${passedChecks}`);
console.log(`失败: ${failedChecks}`);
console.log(`警告: ${warnings.length}`);
console.log(`通过率: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);

if (warnings.length > 0) {
  console.log('\n【警告详情】');
  warnings.forEach(w => console.log(`  ⚠️ ${w}`));
}

console.log('========================================\n');

if (failedChecks === 0) {
  console.log('✅ 所有关键检查通过！错误提示已优化为友好的中文提示');
  process.exit(0);
} else {
  console.log('❌ 部分检查未通过，请检查上述失败项');
  process.exit(1);
}
