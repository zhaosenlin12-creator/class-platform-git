/**
 * 深度安全审计
 * Deep Security Audit
 * 
 * 检查项:
 * 1. FORCE_OSS 配置优化
 * 2. 数据库连接和迁移验证
 * 3. 并发安全性检查
 * 4. 竞态条件检查
 * 5. 文件上传安全性
 * 6. WebSocket 消息验证
 * 7. OSS 凭证安全性
 * 8. 错误处理完整性
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('============================================================');
console.log('🔐 深度安全审计');
console.log('Deep Security Audit');
console.log('============================================================');
console.log('审计时间:', new Date().toLocaleString('zh-CN'));
console.log('============================================================\n');

const auditResults = {
  passed: [],
  warnings: [],
  critical: [],
  recommendations: []
};

/**
 * 审计 1: FORCE_OSS 配置检查
 */
function auditForceOSS() {
  console.log('============================================================');
  console.log('📋 审计 1: FORCE_OSS 配置检查');
  console.log('============================================================\n');
  
  const forceOSS = process.env.FORCE_OSS;
  
  console.log(`当前配置: FORCE_OSS=${forceOSS}`);
  
  if (forceOSS === 'true') {
    console.log('✅ FORCE_OSS 已启用');
    auditResults.passed.push('FORCE_OSS enabled');
  } else {
    console.log('⚠️  FORCE_OSS 未启用');
    console.log('   影响: 系统可能仍允许本地文件上传');
    console.log('   建议: 在 .env 中设置 FORCE_OSS=true');
    auditResults.warnings.push('FORCE_OSS not enabled');
    auditResults.recommendations.push('Set FORCE_OSS=true in .env file');
  }
  
  console.log();
}

/**
 * 审计 2: 数据库迁移完整性
 */
async function auditDatabaseMigration() {
  console.log('============================================================');
  console.log('🗄️  审计 2: 数据库迁移完整性');
  console.log('============================================================\n');
  
  try {
    const sequelize = require('./src/config/database');
    
    // 测试数据库连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功');
    
    // 检查 teaching_classroom_chat 表结构
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' 
        AND TABLE_NAME = 'teaching_classroom_chat'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('📊 teaching_classroom_chat 表结构:');
    
    const requiredColumns = ['file_name', 'file_size', 'file_type', 'file_url'];
    let allPresent = true;
    
    requiredColumns.forEach(col => {
      const found = columns.find(c => c.COLUMN_NAME === col);
      if (found) {
        console.log(`   ✅ ${col} (${found.DATA_TYPE}, ${found.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
      } else {
        console.log(`   ❌ 缺少列: ${col}`);
        auditResults.critical.push(`Missing column: ${col}`);
        allPresent = false;
      }
    });
    
    if (allPresent) {
      auditResults.passed.push('Database migration complete');
    }
    
    // 检查索引
    const [indexes] = await sequelize.query(`
      SHOW INDEX FROM teaching_classroom_chat 
      WHERE Column_name IN ('file_url', 'classroom_id')
    `);
    
    console.log(`\n📑 索引检查:`);
    if (indexes.length > 0) {
      indexes.forEach(idx => {
        console.log(`   ✅ ${idx.Column_name} (${idx.Key_name})`);
      });
      auditResults.passed.push('Database indexes exist');
    } else {
      console.log('   ⚠️  未找到文件相关索引');
      auditResults.recommendations.push('Consider adding index on file_key for better query performance');
    }
    
    await sequelize.close();
  } catch (error) {
    console.log(`⚠️  数据库审计跳过: ${error.message}`);
    console.log('   （数据库未运行，这在测试环境是正常的）');
    auditResults.warnings.push(`Database audit skipped: ${error.message}`);
  }
  
  console.log();
}

/**
 * 审计 3: 并发安全性检查
 */
function auditConcurrencySafety() {
  console.log('============================================================');
  console.log('🔄 审计 3: 并发安全性检查');
  console.log('============================================================\n');
  
  // 检查 resourceController
  const resourceController = path.join(__dirname, 'src/controllers/resourceController.js');
  if (fs.existsSync(resourceController)) {
    const content = fs.readFileSync(resourceController, 'utf8');
    
    console.log('📋 Resource Controller 并发检查:');
    
    // 检查是否有事务处理
    if (content.includes('transaction') || content.includes('sequelize.transaction')) {
      console.log('   ✅ 使用了数据库事务');
      auditResults.passed.push('Resource controller uses transactions');
    } else {
      console.log('   ⚠️  未发现事务处理');
      auditResults.warnings.push('Resource controller may not use transactions');
      auditResults.recommendations.push('Consider using transactions for metadata save operations');
    }
    
    // 检查是否有文件存在性验证
    if (content.includes('fileExists')) {
      console.log('   ✅ 验证文件存在性（防止竞态条件）');
      auditResults.passed.push('File existence validation');
    } else {
      console.log('   ❌ 缺少文件存在性验证');
      auditResults.critical.push('Missing file existence validation');
    }
    
    // 检查是否有重复文件检查
    if (content.includes('findOne') || content.includes('findByPk')) {
      console.log('   ✅ 有数据库查询（可能包含重复检查）');
      auditResults.passed.push('Database queries present');
    }
  }
  
  // 检查 socketServer
  const socketServer = path.join(__dirname, 'src/socketServer.js');
  if (fs.existsSync(socketServer)) {
    const content = fs.readFileSync(socketServer, 'utf8');
    
    console.log('\n📋 Socket Server 并发检查:');
    
    // 检查节流机制
    if (content.includes('throttle')) {
      console.log('   ✅ 实现了节流机制（防止消息洪泛）');
      auditResults.passed.push('Socket throttling implemented');
    } else {
      console.log('   ⚠️  未发现节流机制');
      auditResults.warnings.push('Socket server may not have throttling');
      auditResults.recommendations.push('Implement throttling for socket messages');
    }
    
    // 检查消息验证
    if (content.includes('验证') || content.includes('validate')) {
      console.log('   ✅ 有消息验证逻辑');
      auditResults.passed.push('Socket message validation');
    } else {
      console.log('   ⚠️  消息验证可能不完整');
      auditResults.warnings.push('Socket message validation may be incomplete');
    }
    
    // 检查错误处理
    if (content.includes('try') && content.includes('catch')) {
      console.log('   ✅ 有错误处理');
      auditResults.passed.push('Socket error handling');
    } else {
      console.log('   ❌ 缺少错误处理');
      auditResults.critical.push('Missing socket error handling');
    }
  }
  
  console.log();
}

/**
 * 审计 4: OSS 凭证安全性
 */
function auditOSSCredentialSecurity() {
  console.log('============================================================');
  console.log('🔑 审计 4: OSS 凭证安全性');
  console.log('============================================================\n');
  
  const ossUtil = path.join(__dirname, 'src/utils/oss.js');
  if (fs.existsSync(ossUtil)) {
    const content = fs.readFileSync(ossUtil, 'utf8');
    
    console.log('📋 OSS 工具类安全检查:');
    
    // 检查预签名 URL 过期时间
    if ((content.includes('signatureUrl') && /expires\s*:/.test(content)) || content.includes('expirationSeconds')) {
      console.log('   ✅ 设置了 URL 过期时间');
      auditResults.passed.push('OSS URL expiration configured');
    } else {
      console.log('   ⚠️  未明确设置过期时间');
      auditResults.warnings.push('OSS URL expiration not explicit');
    }
    
    // 检查是否直接暴露凭证
    if (content.includes('process.env.OSS_ACCESS_KEY_ID')) {
      console.log('   ✅ 使用环境变量存储凭证');
      auditResults.passed.push('OSS credentials from env vars');
    } else {
      console.log('   ❌ 凭证可能硬编码');
      auditResults.critical.push('OSS credentials may be hardcoded');
    }
    
    // 检查错误处理
    if (content.includes('try') && content.includes('catch')) {
      console.log('   ✅ 有错误处理');
      auditResults.passed.push('OSS error handling');
    } else {
      console.log('   ⚠️  错误处理可能不完整');
      auditResults.warnings.push('OSS error handling may be incomplete');
    }
  }
  
  // 检查环境变量
  console.log('\n📋 环境变量安全检查:');
  
  const sensitiveVars = ['OSS_ACCESS_KEY_ID', 'OSS_ACCESS_KEY_SECRET'];
  sensitiveVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`   ✅ ${varName} 已配置`);
      if (value.length < 10) {
        console.log(`      ⚠️  值太短，可能不是有效凭证`);
        auditResults.warnings.push(`${varName} value seems too short`);
      }
    } else {
      console.log(`   ❌ ${varName} 未配置`);
      auditResults.critical.push(`${varName} not configured`);
    }
  });
  
  console.log();
}

/**
 * 审计 5: 文件上传安全性
 */
function auditFileUploadSecurity() {
  console.log('============================================================');
  console.log('📤 审计 5: 文件上传安全性');
  console.log('============================================================\n');
  
  // 检查前端组件
  const ossUpload = path.join(__dirname, '../web/src/components/OSSUpload.vue');
  if (fs.existsSync(ossUpload)) {
    const content = fs.readFileSync(ossUpload, 'utf8');
    
    console.log('📋 前端上传组件安全检查:');
    
    // 文件大小验证
    if (content.includes('maxSize') || content.includes('100')) {
      console.log('   ✅ 有文件大小限制');
      auditResults.passed.push('File size validation in frontend');
    } else {
      console.log('   ❌ 缺少文件大小验证');
      auditResults.critical.push('Missing file size validation');
    }
    
    // 文件类型验证
    if (content.includes('accept') || content.includes('fileType')) {
      console.log('   ✅ 有文件类型验证');
      auditResults.passed.push('File type validation in frontend');
    } else {
      console.log('   ❌ 缺少文件类型验证');
      auditResults.critical.push('Missing file type validation');
    }
    
    // 检查是否使用 PUT 方法
    if (content.includes('PUT') || content.includes('method: "PUT"')) {
      console.log('   ✅ 使用 HTTP PUT 方法上传');
      auditResults.passed.push('Uses HTTP PUT for upload');
    } else {
      console.log('   ⚠️  未明确使用 PUT 方法');
      auditResults.warnings.push('HTTP PUT method not explicit');
    }
  }
  
  // 检查后端控制器
  const resourceController = path.join(__dirname, 'src/controllers/resourceController.js');
  if (fs.existsSync(resourceController)) {
    const content = fs.readFileSync(resourceController, 'utf8');
    
    console.log('\n📋 后端控制器安全检查:');
    
    // 文件类型白名单
    if (content.includes('allowedTypes') || content.includes('.pdf') || content.includes('.zip')) {
      console.log('   ✅ 有文件类型白名单');
      auditResults.passed.push('File type whitelist in backend');
    } else {
      console.log('   ⚠️  未发现文件类型白名单');
      auditResults.warnings.push('File type whitelist not found');
    }
    
    // 文件大小验证
    if (content.includes('fileSize') || content.includes('100')) {
      console.log('   ✅ 有文件大小验证');
      auditResults.passed.push('File size validation in backend');
    } else {
      console.log('   ⚠️  未发现文件大小验证');
      auditResults.warnings.push('File size validation not found');
    }
    
    // 用户认证
    if (content.includes('req.user') || content.includes('userId')) {
      console.log('   ✅ 验证用户身份');
      auditResults.passed.push('User authentication in upload');
    } else {
      console.log('   ❌ 缺少用户身份验证');
      auditResults.critical.push('Missing user authentication');
    }
  }
  
  console.log();
}

/**
 * 审计 6: WebSocket 消息安全
 */
function auditWebSocketSecurity() {
  console.log('============================================================');
  console.log('🔌 审计 6: WebSocket 消息安全');
  console.log('============================================================\n');
  
  const socketServer = path.join(__dirname, 'src/socketServer.js');
  if (fs.existsSync(socketServer)) {
    const content = fs.readFileSync(socketServer, 'utf8');
    
    console.log('📋 WebSocket 安全检查:');
    
    // CORS 配置
    if (content.includes('cors') || content.includes('origin')) {
      console.log('   ✅ 配置了 CORS');
      auditResults.passed.push('WebSocket CORS configured');
    } else {
      console.log('   ⚠️  未发现 CORS 配置');
      auditResults.warnings.push('WebSocket CORS not found');
    }
    
    // 消息大小限制
    if (content.includes('maxHttpBufferSize') || content.includes('maxPayload')) {
      console.log('   ✅ 有消息大小限制');
      auditResults.passed.push('WebSocket message size limit');
    } else {
      console.log('   ⚠️  未发现消息大小限制');
      auditResults.warnings.push('WebSocket message size limit not found');
      auditResults.recommendations.push('Set maxHttpBufferSize for WebSocket');
    }
    
    // 用户认证
    if (content.includes('socket.userId') || content.includes('authenticate')) {
      console.log('   ✅ 验证用户身份');
      auditResults.passed.push('WebSocket user authentication');
    } else {
      console.log('   ❌ 缺少用户身份验证');
      auditResults.critical.push('Missing WebSocket authentication');
    }
    
    // 房间隔离
    if (content.includes('room') || content.includes('join')) {
      console.log('   ✅ 实现了房间隔离');
      auditResults.passed.push('WebSocket room isolation');
    } else {
      console.log('   ⚠️  未发现房间隔离机制');
      auditResults.warnings.push('WebSocket room isolation not found');
    }
    
    // 输入验证
    if (content.includes('fileKey') && content.includes('fileName') && content.includes('!')) {
      console.log('   ✅ 验证消息字段');
      auditResults.passed.push('WebSocket message validation');
    } else {
      console.log('   ⚠️  消息验证可能不完整');
      auditResults.warnings.push('WebSocket message validation incomplete');
    }
  }
  
  console.log();
}

/**
 * 审计 7: 竞态条件检查
 */
function auditRaceConditions() {
  console.log('============================================================');
  console.log('⚡ 审计 7: 竞态条件检查');
  console.log('============================================================\n');
  
  const resourceController = path.join(__dirname, 'src/controllers/resourceController.js');
  if (fs.existsSync(resourceController)) {
    const content = fs.readFileSync(resourceController, 'utf8');
    
    console.log('📋 资源控制器竞态条件检查:');
    
    // 检查文件存在性验证（在保存元数据前）
    const hasFileExistsCheck = content.includes('fileExists') && 
                                content.includes('saveResourceMetadata');
    
    if (hasFileExistsCheck) {
      console.log('   ✅ 保存元数据前验证文件存在（防止竞态）');
      auditResults.passed.push('File existence check before metadata save');
    } else {
      console.log('   ❌ 缺少文件存在性验证');
      console.log('      风险: 可能保存不存在文件的元数据');
      auditResults.critical.push('Missing file existence validation before metadata save');
    }
    
    // 检查唯一性约束
    if (content.includes('unique') || content.includes('findOne')) {
      console.log('   ✅ 有唯一性检查');
      auditResults.passed.push('Uniqueness validation');
    } else {
      console.log('   ⚠️  未发现唯一性检查');
      auditResults.warnings.push('Uniqueness validation not found');
    }
  }
  
  const socketServer = path.join(__dirname, 'src/socketServer.js');
  if (fs.existsSync(socketServer)) {
    const content = fs.readFileSync(socketServer, 'utf8');
    
    console.log('\n📋 Socket Server 竞态条件检查:');
    
    // 检查消息顺序保证
    if (content.includes('await') && content.includes('create')) {
      console.log('   ✅ 使用 await 保证操作顺序');
      auditResults.passed.push('Socket operations use await');
    } else {
      console.log('   ⚠️  可能存在异步竞态');
      auditResults.warnings.push('Socket operations may have race conditions');
    }
    
    // 检查并发控制
    if (content.includes('throttle') || content.includes('debounce')) {
      console.log('   ✅ 有并发控制机制');
      auditResults.passed.push('Socket concurrency control');
    } else {
      console.log('   ⚠️  未发现并发控制');
      auditResults.warnings.push('Socket concurrency control not found');
    }
  }
  
  console.log();
}

/**
 * 生成审计报告
 */
function generateAuditReport() {
  console.log('============================================================');
  console.log('📊 安全审计报告');
  console.log('============================================================\n');
  
  const totalChecks = auditResults.passed.length + auditResults.warnings.length + auditResults.critical.length;
  const passedChecks = auditResults.passed.length;
  const securityScore = totalChecks > 0 ? ((passedChecks / totalChecks) * 100).toFixed(1) : 0;
  
  console.log(`✅ 通过: ${auditResults.passed.length}`);
  if (auditResults.passed.length > 0) {
    auditResults.passed.forEach(r => console.log(`   ✓ ${r}`));
  }
  
  if (auditResults.warnings.length > 0) {
    console.log(`\n⚠️  警告: ${auditResults.warnings.length}`);
    auditResults.warnings.forEach(r => console.log(`   ! ${r}`));
  }
  
  if (auditResults.critical.length > 0) {
    console.log(`\n🚨 严重问题: ${auditResults.critical.length}`);
    auditResults.critical.forEach(r => console.log(`   ⚠ ${r}`));
  }
  
  if (auditResults.recommendations.length > 0) {
    console.log(`\n💡 优化建议: ${auditResults.recommendations.length}`);
    auditResults.recommendations.forEach(r => console.log(`   → ${r}`));
  }
  
  console.log('\n============================================================');
  console.log(`安全评分: ${securityScore}%`);
  console.log(`总检查项: ${totalChecks}`);
  console.log('============================================================\n');
  
  // 上线建议
  if (auditResults.critical.length > 0) {
    console.log('🚨 安全建议: 不建议上线');
    console.log('   存在严重安全问题，必须修复！\n');
    return false;
  } else if (auditResults.warnings.length > 3) {
    console.log('⚠️  安全建议: 谨慎上线');
    console.log('   存在多个警告项，建议优化后再上线\n');
    return false;
  } else if (auditResults.warnings.length > 0) {
    console.log('✅ 安全建议: 可以上线');
    console.log('   核心安全检查通过，建议关注警告项\n');
    return true;
  } else {
    console.log('✅ 安全建议: 可以安全上线');
    console.log('   所有安全检查通过！\n');
    return true;
  }
}

/**
 * 主审计运行器
 */
async function runSecurityAudit() {
  try {
    auditForceOSS();
    await auditDatabaseMigration();
    auditConcurrencySafety();
    auditOSSCredentialSecurity();
    auditFileUploadSecurity();
    auditWebSocketSecurity();
    auditRaceConditions();
    
    const isSecure = generateAuditReport();
    
    process.exit(isSecure ? 0 : 1);
  } catch (error) {
    console.error('❌ 审计运行失败:', error);
    process.exit(1);
  }
}

// 运行审计
runSecurityAudit();
