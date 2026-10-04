/**
 * 创建测试文件脚本
 */
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '../uploads');

// 确保uploads目录存在
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('✅ 创建uploads目录');
}

// 创建模拟文件
const testFiles = [
  {
    name: 'scratch-lesson1.pdf',
    content: '%PDF-1.4\n%测试PDF文件\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 5 0 R\n>>\nendobj\n4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n5 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Scratch教学PPT) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000262 00000 n\n0000000341 00000 n\ntrailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n435\n%%EOF',
    size: 2048576
  },
  {
    name: 'cat-jump.sb3',
    content: 'PK\x03\x04\n这是一个Scratch项目文件的模拟内容',
    size: 512000
  },
  {
    name: 'python-intro.mp4',
    content: '这是一个模拟的MP4视频文件内容\n' + 'ftypisom\x00\x00\x02\x00isomiso2mp41'.repeat(1000),
    size: 52428800
  },
  {
    name: 'scratch-outline.docx',
    content: 'PK\x03\x04\n这是一个Word文档的模拟内容\nScratch课程大纲\n第一课：认识Scratch\n第二课：角色与舞台',
    size: 102400
  },
  {
    name: 'python-exercises.pdf',
    content: '%PDF-1.4\n%Python练习题集\n这是Python基础练习题的模拟PDF内容',
    size: 1536000
  }
];

console.log('🚀 开始创建测试文件...\n');

testFiles.forEach(file => {
  const filePath = path.join(uploadDir, file.name);
  
  try {
    // 创建文件内容（填充到指定大小）
    let content = file.content;
    while (content.length < file.size) {
      content += '\n' + file.content;
    }
    content = content.substring(0, file.size);
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ 创建文件: ${file.name} (${formatFileSize(file.size)})`);
  } catch (error) {
    console.error(`❌ 创建文件失败: ${file.name}`, error.message);
  }
});

console.log('\n✅ 所有测试文件创建完成！');
console.log(`📁 文件保存位置: ${uploadDir}`);

// 辅助函数
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}





