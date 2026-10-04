/**
 * Move Temporary Files to Backup
 * Feature: oss-upload-upgrade
 * Task 12: Final checkpoint and cleanup
 * 
 * This script moves temporary test files and documentation to _backup/cleanup/
 */

const fs = require('fs');
const path = require('path');

console.log('============================================================');
console.log('移动临时文件到备份目录');
console.log('============================================================\n');

const backupDir = path.join(__dirname, '../_backup/cleanup');

// Create backup directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`✅ 创建备份目录: ${backupDir}\n`);
}

// List of temporary files to move
const tempFiles = [
  // Task documentation files
  'TASK1_MIGRATION_STATUS.md',
  'TASK2_IMPLEMENTATION_SUMMARY.md',
  'TASK3_ROUTES_IMPLEMENTATION.md',
  'TASK4_OSSUPLOAD_COMPONENT.md',
  'TASK5_CHECKPOINT_SUMMARY.md',
  'TASK6_UPLOAD_RESOURCE_FORM.md',
  'TASK7_ONLINE_CLASSROOM_OSS.md',
  'TASK9_CHECKPOINT_RESULTS.md',
  'TASK9_CHECKPOINT_SUMMARY.md',
  'TASK9_MANUAL_TESTING_GUIDE.md',
  'TASK10_COMPREHENSIVE_TEST_SUITE.md',
  'TASK11_MANUAL_VERIFICATION.md',
  'TASK11_SUMMARY.md',
  'CHECKPOINT_5_MANUAL_TESTING.md',
  'CHECKPOINT_5_RESULTS.md',
  
  // Test files (keep the main ones, move intermediate tests)
  'test-checkpoint-5-verification.js',
  'test-classroom-file-upload.js',
  'test-end-to-end-upload-flows.js',
  'test-file-metadata-storage.js',
  'test-oss-upload-component-properties.js',
  'test-resource-oss-properties.js',
  'test-resource-routes.js',
  'test-upload-resource-form-properties.js',
  'test-websocket-file-broadcast.js'
];

let movedCount = 0;
let skippedCount = 0;
let errorCount = 0;

console.log(`📋 准备移动 ${tempFiles.length} 个临时文件\n`);

tempFiles.forEach(file => {
  const sourcePath = path.join(__dirname, file);
  
  if (!fs.existsSync(sourcePath)) {
    console.log(`   ⏭️  跳过（不存在）: ${file}`);
    skippedCount++;
    return;
  }
  
  try {
    const destPath = path.join(backupDir, file);
    
    // If file already exists in backup, add timestamp
    let finalDestPath = destPath;
    if (fs.existsSync(destPath)) {
      const ext = path.extname(file);
      const name = path.basename(file, ext);
      finalDestPath = path.join(backupDir, `${name}_${Date.now()}${ext}`);
    }
    
    fs.renameSync(sourcePath, finalDestPath);
    console.log(`   ✅ 移动: ${file}`);
    movedCount++;
  } catch (error) {
    console.error(`   ❌ 失败: ${file} - ${error.message}`);
    errorCount++;
  }
});

console.log('\n============================================================');
console.log('移动结果');
console.log('============================================================\n');
console.log(`✅ 成功移动: ${movedCount} 个文件`);
console.log(`⏭️  跳过: ${skippedCount} 个文件`);
if (errorCount > 0) {
  console.log(`❌ 失败: ${errorCount} 个文件`);
}
console.log(`📁 备份位置: ${backupDir}\n`);

console.log('📋 保留的测试文件:');
console.log('   - test-oss-upload-upgrade.js (主测试套件)');
console.log('   - test-property-*.js (属性测试)');
console.log('   - test-final-checkpoint.js (最终检查)');
console.log('   - cleanup-old-uploads.js (清理工具)\n');

process.exit(errorCount > 0 ? 1 : 0);
