/**
 * 前端修复验证脚本
 * 检查代码修改是否正确
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 检查文件内容
function checkFileContent(filePath, checks) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    return { success: false, error: `文件不存在: ${filePath}` };
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const results = [];
  
  for (const check of checks) {
    const found = check.pattern instanceof RegExp 
      ? check.pattern.test(content)
      : content.includes(check.pattern);
    
    results.push({
      name: check.name,
      success: check.shouldExist ? found : !found,
      message: check.shouldExist 
        ? (found ? '✓ 找到' : '✗ 未找到')
        : (found ? '✗ 不应存在' : '✓ 已移除')
    });
  }
  
  return { success: results.every(r => r.success), results };
}

// 运行检查
function runChecks() {
  log('blue', '\n========================================');
  log('blue', '  前端修复验证');
  log('blue', '========================================\n');
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  // 检查1: StudentManagement.vue - 学员编辑刷新修复
  log('yellow', '检查1: StudentManagement.vue - 学员编辑刷新修复');
  const studentCheck = checkFileContent('web/src/views/management/StudentManagement.vue', [
    {
      name: '更新成功后检查响应',
      pattern: 'if (!updateResponse || !updateResponse.success)',
      shouldExist: true
    },
    {
      name: '使用await刷新列表',
      pattern: 'await this.loadStudentList()',
      shouldExist: true
    },
    {
      name: '刷新日志',
      pattern: '[刷新列表]',
      shouldExist: true
    }
  ]);
  
  for (const result of studentCheck.results) {
    log(result.success ? 'green' : 'red', `  ${result.message}: ${result.name}`);
    result.success ? totalPassed++ : totalFailed++;
  }
  
  // 检查2: Header.vue - 名字点击跳转修复
  log('yellow', '\n检查2: Header.vue - 名字点击跳转修复');
  const headerCheck = checkFileContent('web/src/views/home/modules/Header.vue', [
    {
      name: '跳转到我的作品页面',
      pattern: "this.$router.push('/student/works')",
      shouldExist: true
    }
  ]);
  
  for (const result of headerCheck.results) {
    log(result.success ? 'green' : 'red', `  ${result.message}: ${result.name}`);
    result.success ? totalPassed++ : totalFailed++;
  }
  
  // 检查2.1: Home.vue - 跳转修复
  log('yellow', '\n检查2.1: Home.vue - 跳转修复');
  const homeCheck = checkFileContent('web/src/views/home/Home.vue', [
    {
      name: '我的作品跳转正确',
      pattern: "case 1:this.$router.push('/student/works')",
      shouldExist: true
    },
    {
      name: '我的课堂跳转正确',
      pattern: "case 2:this.$router.push('/student/classrooms')",
      shouldExist: true
    }
  ]);
  
  for (const result of homeCheck.results) {
    log(result.success ? 'green' : 'red', `  ${result.message}: ${result.name}`);
    result.success ? totalPassed++ : totalFailed++;
  }
  
  // 检查2.2: UserEnter.vue - 跳转修复
  log('yellow', '\n检查2.2: UserEnter.vue - 跳转修复');
  const userEnterCheck = checkFileContent('web/src/views/home/modules/UserEnter.vue', [
    {
      name: '跳转到我的作品页面',
      pattern: "this.$router.push('/student/works')",
      shouldExist: true
    }
  ]);
  
  for (const result of userEnterCheck.results) {
    log(result.success ? 'green' : 'red', `  ${result.message}: ${result.name}`);
    result.success ? totalPassed++ : totalFailed++;
  }
  
  // 检查2.3: WorkLayout.vue - 跳转修复
  log('yellow', '\n检查2.3: WorkLayout.vue - 跳转修复');
  const workLayoutCheck = checkFileContent('web/src/views/home/layouts/WorkLayout.vue', [
    {
      name: '跳转到我的作品页面',
      pattern: "this.$router.push('/student/works')",
      shouldExist: true
    }
  ]);
  
  for (const result of workLayoutCheck.results) {
    log(result.success ? 'green' : 'red', `  ${result.message}: ${result.name}`);
    result.success ? totalPassed++ : totalFailed++;
  }
  
  // 检查3: JUpload.vue - 文件上传友好提示
  log('yellow', '\n检查3: JUpload.vue - 文件上传友好提示');
  const uploadCheck = checkFileContent('web/src/components/jeecg/JUpload.vue', [
    {
      name: '友好的文件大小提示',
      pattern: '文件大小超过限制',
      shouldExist: true
    },
    {
      name: '包含压缩建议',
      pattern: '请压缩文件后重新上传',
      shouldExist: true
    }
  ]);
  
  for (const result of uploadCheck.results) {
    log(result.success ? 'green' : 'red', `  ${result.message}: ${result.name}`);
    result.success ? totalPassed++ : totalFailed++;
  }
  
  // 检查4: 后端错误处理
  log('yellow', '\n检查4: 后端错误处理 - errorHandler.js');
  const errorHandlerCheck = checkFileContent('backend/src/middleware/errorHandler.js', [
    {
      name: '友好的唯一约束错误提示',
      pattern: '数据已存在',
      shouldExist: true
    },
    {
      name: '友好的文件上传错误提示',
      pattern: '文件大小超过限制',
      shouldExist: true
    },
    {
      name: '友好的数据库连接错误提示',
      pattern: '数据库连接失败',
      shouldExist: true
    }
  ]);
  
  for (const result of errorHandlerCheck.results) {
    log(result.success ? 'green' : 'red', `  ${result.message}: ${result.name}`);
    result.success ? totalPassed++ : totalFailed++;
  }
  
  // 检查5: 后端上传中间件
  log('yellow', '\n检查5: 后端上传中间件 - upload.js');
  const uploadMiddlewareCheck = checkFileContent('backend/src/middleware/upload.js', [
    {
      name: '100MB文件大小限制',
      pattern: '100 * 1024 * 1024',
      shouldExist: true
    },
    {
      name: '友好的错误提示',
      pattern: 'FILE_SIZE_LIMIT_TEXT',
      shouldExist: true
    }
  ]);
  
  for (const result of uploadMiddlewareCheck.results) {
    log(result.success ? 'green' : 'red', `  ${result.message}: ${result.name}`);
    result.success ? totalPassed++ : totalFailed++;
  }
  
  // 检查6: 开发规则文档
  log('yellow', '\n检查6: 开发规则文档');
  const rulesCheck = checkFileContent('.kiro/steering/development-rules.md', [
    {
      name: '备份机制规范',
      pattern: '备份机制',
      shouldExist: true
    },
    {
      name: '测试验证规范',
      pattern: '测试验证',
      shouldExist: true
    },
    {
      name: '友好提示规范',
      pattern: '友好提示',
      shouldExist: true
    }
  ]);
  
  for (const result of rulesCheck.results) {
    log(result.success ? 'green' : 'red', `  ${result.message}: ${result.name}`);
    result.success ? totalPassed++ : totalFailed++;
  }
  
  // 输出结果
  log('blue', '\n========================================');
  log('blue', '  验证结果汇总');
  log('blue', '========================================');
  log('green', `  通过: ${totalPassed}`);
  log('red', `  失败: ${totalFailed}`);
  log('blue', '========================================\n');
  
  return totalFailed === 0;
}

// 运行
const success = runChecks();
process.exit(success ? 0 : 1);
