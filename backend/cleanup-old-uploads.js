/**
 * Cleanup Old Upload Files
 * Feature: oss-upload-upgrade
 * Task 12: Final checkpoint and cleanup
 * 
 * This script moves old files from uploads/ to _backup/cleanup/
 */

const fs = require('fs');
const path = require('path');

console.log('============================================================');
console.log('清理旧上传文件');
console.log('============================================================\n');

const uploadsDir = path.join(__dirname, 'uploads');
const backupDir = path.join(__dirname, '../_backup/cleanup/old-uploads');

// Create backup directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`✅ 创建备份目录: ${backupDir}\n`);
}

// Check if uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  console.log('✅ uploads 目录不存在，无需清理\n');
  process.exit(0);
}

// Get all files in uploads directory
const files = fs.readdirSync(uploadsDir);
const fileList = files.filter(f => {
  const stat = fs.statSync(path.join(uploadsDir, f));
  return stat.isFile();
});

if (fileList.length === 0) {
  console.log('✅ uploads 目录为空，无需清理\n');
  process.exit(0);
}

console.log(`📋 发现 ${fileList.length} 个文件需要移动到备份目录\n`);

let movedCount = 0;
let errorCount = 0;

// Move each file to backup
fileList.forEach((file, index) => {
  try {
    const sourcePath = path.join(uploadsDir, file);
    const destPath = path.join(backupDir, file);
    
    // If file already exists in backup, add timestamp
    let finalDestPath = destPath;
    if (fs.existsSync(destPath)) {
      const ext = path.extname(file);
      const name = path.basename(file, ext);
      finalDestPath = path.join(backupDir, `${name}_${Date.now()}${ext}`);
    }
    
    fs.renameSync(sourcePath, finalDestPath);
    movedCount++;
    
    if ((index + 1) % 10 === 0 || index === fileList.length - 1) {
      console.log(`   移动进度: ${index + 1}/${fileList.length}`);
    }
  } catch (error) {
    console.error(`   ❌ 移动失败 ${file}: ${error.message}`);
    errorCount++;
  }
});

console.log('\n============================================================');
console.log('清理结果');
console.log('============================================================\n');
console.log(`✅ 成功移动: ${movedCount} 个文件`);
if (errorCount > 0) {
  console.log(`❌ 失败: ${errorCount} 个文件`);
}
console.log(`📁 备份位置: ${backupDir}\n`);

// Verify uploads directory is now empty
const remainingFiles = fs.readdirSync(uploadsDir).filter(f => {
  const stat = fs.statSync(path.join(uploadsDir, f));
  return stat.isFile();
});

if (remainingFiles.length === 0) {
  console.log('✅ uploads 目录已清空\n');
  console.log('📋 后续步骤:');
  console.log('   1. 运行 node test-final-checkpoint.js 验证清理结果');
  console.log('   2. 确认系统正常运行后，可以删除备份文件');
  console.log('   3. 设置 FORCE_OSS=true 强制使用 OSS\n');
} else {
  console.log(`⚠️  uploads 目录仍有 ${remainingFiles.length} 个文件\n`);
}

process.exit(errorCount > 0 ? 1 : 0);
