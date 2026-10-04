/**
 * 测试脚本：验证文件上传限制统一为100MB
 * 检查所有前端文件上传组件的大小限制和文件类型配置
 */

const fs = require('fs');
const path = require('path');

const webDir = path.join(__dirname, '../web/src');

// 需要检查的文件列表
const filesToCheck = [
  {
    path: 'views/classroom/OnlineClassroom.vue',
    checks: [
      { pattern: /100\s*\*\s*1024\s*\*\s*1024/, desc: '文件大小限制100MB' },
      { pattern: /最大100MB/, desc: '友好提示包含100MB' }
    ]
  },
  {
    path: 'views/student/HomeworkSubmit.vue',
    checks: [
      { pattern: /maxFileSize:\s*100\s*\*\s*1024\s*\*\s*1024/, desc: 'maxFileSize设置为100MB' },
      { pattern: /不超过100MB/, desc: '提示文字显示100MB' }
    ]
  },
  {
    path: 'components/classroom/ClassroomQA.vue',
    checks: [
      { pattern: /100\s*\*\s*1024\s*\*\s*1024/, desc: '文件大小限制100MB' },
      { pattern: /最大100MB/, desc: '友好提示包含100MB' }
    ]
  },
  {
    path: 'components/assignment/StudentAssignment.vue',
    checks: [
      { pattern: /maxFileSize\s*\|\|\s*100/, desc: '默认maxFileSize为100' },
      { pattern: /最大.*100.*MB/, desc: '友好提示包含100MB' }
    ]
  },
  {
    path: 'components/assignment/AssignmentDetail.vue',
    checks: [
      { pattern: /maxFileSize\s*\|\|\s*100/, desc: '默认maxFileSize为100' }
    ]
  },
  {
    path: 'views/student/CodeEditor.vue',
    checks: [
      { pattern: /100\s*\*\s*1024\s*\*\s*1024/, desc: '文件大小限制100MB' },
      { pattern: /最大100MB/, desc: '友好提示包含100MB' }
    ]
  },
  {
    path: 'views/classroom/components/ChatPanel.vue',
    checks: [
      { pattern: /100\s*\*\s*1024\s*\*\s*1024/, desc: '文件大小限制100MB' },
      { pattern: /最大100MB/, desc: '友好提示包含100MB' }
    ]
  },
  {
    path: 'views/gallery/components/UploadWorkForm.vue',
    checks: [
      { pattern: /100\s*\*\s*1024\s*\*\s*1024/, desc: '文件大小限制100MB' },
      { pattern: /最大100MB/, desc: '友好提示包含100MB' }
    ]
  },
  {
    path: 'views/teacher/TeachingRoom.vue',
    checks: [
      { pattern: /100\s*\*\s*1024\s*\*\s*1024/, desc: '文件大小限制100MB' },
      { pattern: /最大100MB/, desc: '友好提示包含100MB' }
    ]
  },
  {
    path: 'components/jeecg/JUpload.vue',
    checks: [
      { pattern: /default:\s*(100|1000)/, desc: 'maxFileSize默认值>=100MB' },
      { pattern: /最大.*MB.*请压缩/, desc: '友好提示包含压缩建议' }
    ]
  }
];

// 检查后端配置
const backendChecks = [
  {
    path: '../backend/src/middleware/upload.js',
    checks: [
      { pattern: /FILE_SIZE_LIMIT\s*=\s*100\s*\*\s*1024\s*\*\s*1024/, desc: '后端文件大小限制100MB' },
      { pattern: /FILE_SIZE_LIMIT_TEXT\s*=\s*['"]100MB['"]/, desc: '后端提示文字100MB' }
    ]
  }
];

console.log('========================================');
console.log('文件上传限制检查测试');
console.log('========================================\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

// 检查前端文件
console.log('【前端文件检查】\n');
filesToCheck.forEach(file => {
  const fullPath = path.join(webDir, file.path);
  console.log(`检查文件: ${file.path}`);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`  ❌ 文件不存在\n`);
    failedChecks += file.checks.length;
    totalChecks += file.checks.length;
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  
  file.checks.forEach(check => {
    totalChecks++;
    if (check.pattern.test(content)) {
      console.log(`  ✅ ${check.desc}`);
      passedChecks++;
    } else {
      console.log(`  ❌ ${check.desc}`);
      failedChecks++;
    }
  });
  console.log('');
});

// 检查后端文件
console.log('【后端文件检查】\n');
backendChecks.forEach(file => {
  const fullPath = path.join(__dirname, file.path);
  console.log(`检查文件: ${file.path}`);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`  ❌ 文件不存在\n`);
    failedChecks += file.checks.length;
    totalChecks += file.checks.length;
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  
  file.checks.forEach(check => {
    totalChecks++;
    if (check.pattern.test(content)) {
      console.log(`  ✅ ${check.desc}`);
      passedChecks++;
    } else {
      console.log(`  ❌ ${check.desc}`);
      failedChecks++;
    }
  });
  console.log('');
});

// 检查是否还有50MB的残留
console.log('【检查50MB残留】\n');
const checkFor50MB = [
  'views/classroom/OnlineClassroom.vue',
  'views/student/HomeworkSubmit.vue',
  'components/classroom/ClassroomQA.vue',
  'components/assignment/StudentAssignment.vue',
  'views/student/CodeEditor.vue',
  'views/classroom/components/ChatPanel.vue',
  'views/gallery/components/UploadWorkForm.vue',
  'views/teacher/TeachingRoom.vue'
];

checkFor50MB.forEach(filePath => {
  const fullPath = path.join(webDir, filePath);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf-8');
    // 检查是否有50MB的限制（排除注释和无关内容）
    const has50MB = /50\s*\*\s*1024\s*\*\s*1024|不超过\s*50MB|不能超过\s*50MB|maxFileSize\s*\|\|\s*50[^0]/.test(content);
    totalChecks++;
    if (has50MB) {
      console.log(`  ❌ ${filePath} 仍有50MB限制`);
      failedChecks++;
    } else {
      console.log(`  ✅ ${filePath} 无50MB残留`);
      passedChecks++;
    }
  }
});

console.log('\n========================================');
console.log('测试结果汇总');
console.log('========================================');
console.log(`总检查项: ${totalChecks}`);
console.log(`通过: ${passedChecks}`);
console.log(`失败: ${failedChecks}`);
console.log(`通过率: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);
console.log('========================================\n');

if (failedChecks === 0) {
  console.log('✅ 所有检查通过！文件上传限制已统一为100MB');
  process.exit(0);
} else {
  console.log('❌ 部分检查未通过，请检查上述失败项');
  process.exit(1);
}
