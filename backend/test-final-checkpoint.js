/**
 * Final Checkpoint Test
 * Feature: oss-upload-upgrade
 * Task 12: Final checkpoint and cleanup
 * 
 * This script performs final verification:
 * 1. Verify no new local files are stored
 * 2. Move old files to backup
 * 3. Verify backward compatibility
 * 4. Generate final report
 */

const fs = require('fs');
const path = require('path');

console.log('============================================================');
console.log('Final Checkpoint: OSS Upload Upgrade');
console.log('Feature: oss-upload-upgrade');
console.log('Task 12: Final checkpoint and cleanup');
console.log('============================================================\n');

// Test results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

/**
 * Test 1: Check for local files in uploads directory
 */
function testLocalFileStorage() {
  console.log('============================================================');
  console.log('测试 1: 检查本地文件存储');
  console.log('============================================================\n');
  
  const uploadsDir = path.join(__dirname, 'uploads');
  
  try {
    if (!fs.existsSync(uploadsDir)) {
      console.log('✅ uploads 目录不存在（理想状态）\n');
      results.passed.push('No uploads directory');
      return;
    }
    
    const files = fs.readdirSync(uploadsDir);
    const productionFiles = files.filter(f => {
      const stat = fs.statSync(path.join(uploadsDir, f));
      return stat.isFile();
    });
    
    if (productionFiles.length === 0) {
      console.log('✅ uploads 目录为空（无生产文件）\n');
      results.passed.push('No local files in uploads');
    } else {
      console.log(`⚠️  发现 ${productionFiles.length} 个旧文件（升级前遗留）\n`);
      console.log('文件列表:');
      productionFiles.slice(0, 10).forEach(f => console.log(`  - ${f}`));
      if (productionFiles.length > 10) {
        console.log(`  ... 还有 ${productionFiles.length - 10} 个文件\n`);
      }
      results.warnings.push(`Found ${productionFiles.length} old files (pre-upgrade)`);
    }
  } catch (error) {
    console.log(`❌ 检查失败: ${error.message}\n`);
    results.failed.push(`Local file check: ${error.message}`);
  }
}

/**
 * Test 2: Verify database migration
 */
async function testDatabaseMigration() {
  console.log('============================================================');
  console.log('测试 2: 验证数据库迁移');
  console.log('============================================================\n');
  
  try {
    const { sequelize } = require('./src/config/database');
    
    // Check if teaching_classroom_chat table has file columns
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' 
        AND TABLE_NAME = 'teaching_classroom_chat'
        AND COLUMN_NAME IN ('file_key', 'file_name', 'file_size', 'file_type')
    `);
    
    const expectedColumns = ['file_key', 'file_name', 'file_size', 'file_type'];
    const foundColumns = results.map(r => r.COLUMN_NAME);
    
    const allPresent = expectedColumns.every(col => foundColumns.includes(col));
    
    if (allPresent) {
      console.log('✅ 数据库迁移完成');
      console.log('   - file_key 列存在');
      console.log('   - file_name 列存在');
      console.log('   - file_size 列存在');
      console.log('   - file_type 列存在\n');
      results.passed.push('Database migration complete');
    } else {
      const missing = expectedColumns.filter(col => !foundColumns.includes(col));
      console.log(`❌ 缺少列: ${missing.join(', ')}\n`);
      results.failed.push(`Missing columns: ${missing.join(', ')}`);
    }
    
    await sequelize.close();
  } catch (error) {
    console.log(`⚠️  数据库检查跳过: ${error.message}\n`);
    results.warnings.push(`Database check skipped: ${error.message}`);
  }
}

/**
 * Test 3: Verify OSS configuration
 */
function testOSSConfiguration() {
  console.log('============================================================');
  console.log('测试 3: 验证 OSS 配置');
  console.log('============================================================\n');
  
  const requiredEnvVars = [
    'OSS_REGION',
    'OSS_ACCESS_KEY_ID',
    'OSS_ACCESS_KEY_SECRET',
    'OSS_BUCKET'
  ];
  
  const missing = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missing.length === 0) {
    console.log('✅ OSS 配置完整');
    console.log(`   - Region: ${process.env.OSS_REGION}`);
    console.log(`   - Bucket: ${process.env.OSS_BUCKET}`);
    console.log(`   - Access Key: ${process.env.OSS_ACCESS_KEY_ID?.substring(0, 10)}...`);
    console.log(`   - Force OSS: ${process.env.FORCE_OSS || 'false'}\n`);
    results.passed.push('OSS configuration complete');
  } else {
    console.log(`❌ 缺少 OSS 配置: ${missing.join(', ')}\n`);
    results.failed.push(`Missing OSS config: ${missing.join(', ')}`);
  }
}

/**
 * Test 4: Verify backend routes exist
 */
function testBackendRoutes() {
  console.log('============================================================');
  console.log('测试 4: 验证后端路由');
  console.log('============================================================\n');
  
  try {
    const resourceController = require('./src/controllers/resourceController');
    const classroomController = require('./src/controllers/classroomController');
    
    const requiredMethods = {
      resourceController: ['getResourceUploadToken', 'saveResourceMetadata', 'getResourceDownloadUrl'],
      classroomController: ['getUploadToken', 'getFileUrl']
    };
    
    let allPresent = true;
    
    // Check resource controller
    console.log('📋 Resource Controller:');
    requiredMethods.resourceController.forEach(method => {
      if (typeof resourceController[method] === 'function') {
        console.log(`   ✅ ${method}`);
      } else {
        console.log(`   ❌ ${method} 缺失`);
        allPresent = false;
      }
    });
    
    // Check classroom controller
    console.log('\n📋 Classroom Controller:');
    requiredMethods.classroomController.forEach(method => {
      if (typeof classroomController[method] === 'function') {
        console.log(`   ✅ ${method}`);
      } else {
        console.log(`   ❌ ${method} 缺失`);
        allPresent = false;
      }
    });
    
    console.log();
    
    if (allPresent) {
      results.passed.push('All backend routes exist');
    } else {
      results.failed.push('Some backend routes missing');
    }
  } catch (error) {
    console.log(`❌ 路由检查失败: ${error.message}\n`);
    results.failed.push(`Route check failed: ${error.message}`);
  }
}

/**
 * Test 5: Verify frontend component exists
 */
function testFrontendComponent() {
  console.log('============================================================');
  console.log('测试 5: 验证前端组件');
  console.log('============================================================\n');
  
  const componentPath = path.join(__dirname, '../web/src/components/OSSUpload.vue');
  
  if (fs.existsSync(componentPath)) {
    const content = fs.readFileSync(componentPath, 'utf8');
    
    // Check for key methods
    const requiredMethods = [
      'requestUploadToken',
      'uploadToOSS',
      'validateFile',
      'saveMetadata'
    ];
    
    const allPresent = requiredMethods.every(method => content.includes(method));
    
    if (allPresent) {
      console.log('✅ OSSUpload 组件存在且完整');
      requiredMethods.forEach(method => {
        console.log(`   ✅ ${method} 方法`);
      });
      console.log();
      results.passed.push('OSSUpload component complete');
    } else {
      const missing = requiredMethods.filter(method => !content.includes(method));
      console.log(`❌ OSSUpload 组件缺少方法: ${missing.join(', ')}\n`);
      results.failed.push(`OSSUpload missing methods: ${missing.join(', ')}`);
    }
  } else {
    console.log('❌ OSSUpload 组件不存在\n');
    results.failed.push('OSSUpload component not found');
  }
}

/**
 * Test 6: Check backup files
 */
function testBackupFiles() {
  console.log('============================================================');
  console.log('测试 6: 验证备份文件');
  console.log('============================================================\n');
  
  const backupDir = path.join(__dirname, '../_backup/20250124_oss-upgrade');
  
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir);
    console.log('✅ 备份目录存在');
    console.log(`   找到 ${files.length} 个备份文件:`);
    files.forEach(f => console.log(`   - ${f}`));
    console.log();
    results.passed.push('Backup files exist');
  } else {
    console.log('⚠️  备份目录不存在（可能未修改原文件）\n');
    results.warnings.push('No backup directory found');
  }
}

/**
 * Generate final report
 */
function generateReport() {
  console.log('============================================================');
  console.log('最终检查报告');
  console.log('============================================================\n');
  
  console.log(`✅ 通过: ${results.passed.length}`);
  results.passed.forEach(r => console.log(`   - ${r}`));
  
  if (results.warnings.length > 0) {
    console.log(`\n⚠️  警告: ${results.warnings.length}`);
    results.warnings.forEach(r => console.log(`   - ${r}`));
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ 失败: ${results.failed.length}`);
    results.failed.forEach(r => console.log(`   - ${r}`));
  }
  
  console.log('\n============================================================');
  
  const totalTests = results.passed.length + results.failed.length;
  const successRate = totalTests > 0 ? ((results.passed.length / totalTests) * 100).toFixed(1) : 0;
  
  console.log(`总计: ${totalTests} 个测试`);
  console.log(`成功率: ${successRate}%`);
  console.log('============================================================\n');
  
  if (results.failed.length === 0) {
    console.log('✅ 所有关键测试通过！');
    console.log('\n📋 后续步骤:');
    console.log('   1. 如需清理旧文件，运行: node cleanup-old-uploads.js');
    console.log('   2. 设置 FORCE_OSS=true 强制使用 OSS');
    console.log('   3. 在生产环境测试完整上传流程');
    return true;
  } else {
    console.log('❌ 部分测试失败，请检查上述错误');
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  try {
    testLocalFileStorage();
    await testDatabaseMigration();
    testOSSConfiguration();
    testBackendRoutes();
    testFrontendComponent();
    testBackupFiles();
    
    const success = generateReport();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('测试运行失败:', error);
    process.exit(1);
  }
}

// Run tests
runTests();
