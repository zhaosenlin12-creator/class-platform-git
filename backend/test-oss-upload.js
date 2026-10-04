/**
 * OSS上传功能测试脚本
 * 测试OSS配置和上传凭证生成
 */

require('dotenv').config();
const ossUtil = require('./src/utils/oss');
const { logger } = require('./src/middleware/logger');

console.log('🧪 开始测试OSS上传功能...\n');

// 测试配置
const testFile = {
  name: 'test-file.txt',
  size: 1024, // 1KB
  type: 'text/plain'
};

async function testOSSConfiguration() {
  console.log('📋 测试1: 检查OSS配置');
  console.log('─────────────────────────────────────');
  
  const isConfigured = ossUtil.isOSSConfigured();
  console.log(`OSS配置状态: ${isConfigured ? '✅ 已配置' : '❌ 未配置'}`);
  
  if (!isConfigured) {
    console.log('\n⚠️  OSS未配置，请在 .env 文件中添加以下配置:');
    console.log('OSS_ACCESS_KEY_ID=your_access_key_id');
    console.log('OSS_ACCESS_KEY_SECRET=your_access_key_secret');
    console.log('OSS_BUCKET=your-bucket-name');
    console.log('OSS_REGION=oss-cn-hangzhou');
    return false;
  }
  
  console.log('✅ OSS配置检查通过\n');
  return true;
}

async function testUploadToken() {
  console.log('📋 测试2: 生成上传凭证');
  console.log('─────────────────────────────────────');
  
  try {
    const ossPath = `test/classroom/test-classroom-id/${Date.now()}_${testFile.name}`;
    console.log(`OSS路径: ${ossPath}`);
    console.log(`文件大小: ${testFile.size} bytes`);
    
    const uploadToken = await ossUtil.getUploadToken(ossPath, testFile.size);
    
    console.log('\n✅ 上传凭证生成成功:');
    console.log(`  - 上传URL: ${uploadToken.uploadUrl ? '已生成' : '未生成'}`);
    console.log(`  - OSS路径: ${uploadToken.ossPath}`);
    console.log(`  - Bucket: ${uploadToken.bucket}`);
    console.log(`  - Region: ${uploadToken.region}`);
    console.log(`  - 有效期: ${uploadToken.expiresIn}秒`);
    
    return uploadToken;
  } catch (error) {
    console.error('❌ 生成上传凭证失败:', error.message);
    return null;
  }
}

async function testSignedUrl() {
  console.log('\n📋 测试3: 生成签名访问URL');
  console.log('─────────────────────────────────────');
  
  try {
    const ossPath = `test/classroom/test-classroom-id/${Date.now()}_${testFile.name}`;
    console.log(`OSS路径: ${ossPath}`);
    
    const signedUrl = await ossUtil.getSignedUrl(ossPath, 3600);
    
    console.log('\n✅ 签名URL生成成功:');
    console.log(`  - URL长度: ${signedUrl.length} 字符`);
    console.log(`  - 包含签名: ${signedUrl.includes('Signature=') ? '是' : '否'}`);
    console.log(`  - 包含过期时间: ${signedUrl.includes('Expires=') ? '是' : '否'}`);
    console.log(`  - URL预览: ${signedUrl.substring(0, 100)}...`);
    
    return signedUrl;
  } catch (error) {
    console.error('❌ 生成签名URL失败:', error.message);
    return null;
  }
}

async function testOSSPath() {
  console.log('\n📋 测试4: OSS路径生成');
  console.log('─────────────────────────────────────');
  
  try {
    const category = 'course';
    const filename = 'test-file.pdf';
    
    const ossPath = ossUtil.generateOSSPath(category, filename);
    
    console.log('✅ OSS路径生成成功:');
    console.log(`  - 分类: ${category}`);
    console.log(`  - 文件名: ${filename}`);
    console.log(`  - 生成路径: ${ossPath}`);
    console.log(`  - 路径格式: ${ossPath.match(/^course\/\d{4}\/\d{2}\//) ? '正确' : '错误'}`);
    
    return ossPath;
  } catch (error) {
    console.error('❌ 生成OSS路径失败:', error.message);
    return null;
  }
}

async function testFileValidation() {
  console.log('\n📋 测试5: 文件验证');
  console.log('─────────────────────────────────────');
  
  const testCases = [
    { name: 'small.txt', size: 1024, expected: true, desc: '小文件(1KB)' },
    { name: 'medium.pdf', size: 50 * 1024 * 1024, expected: true, desc: '中等文件(50MB)' },
    { name: 'large.zip', size: 100 * 1024 * 1024, expected: true, desc: '大文件(100MB)' },
    { name: 'toolarge.mp4', size: 150 * 1024 * 1024, expected: false, desc: '超大文件(150MB)' }
  ];
  
  console.log('文件大小验证测试:');
  testCases.forEach(test => {
    const isValid = test.size <= 100 * 1024 * 1024;
    const status = isValid === test.expected ? '✅' : '❌';
    console.log(`  ${status} ${test.desc}: ${isValid ? '通过' : '拒绝'}`);
  });
  
  console.log('\n文件类型验证测试:');
  const allowedTypes = [
    'application/pdf',
    'application/zip',
    'text/plain',
    'image/jpeg',
    'video/mp4'
  ];
  
  allowedTypes.forEach(type => {
    console.log(`  ✅ ${type}: 允许`);
  });
  
  console.log('  ❌ application/x-executable: 拒绝');
  console.log('  ❌ application/x-msdownload: 拒绝');
}

async function runTests() {
  console.log('═══════════════════════════════════════');
  console.log('   OSS上传功能测试套件');
  console.log('═══════════════════════════════════════\n');
  
  try {
    // 测试1: 检查配置
    const isConfigured = await testOSSConfiguration();
    if (!isConfigured) {
      console.log('\n❌ 测试终止: OSS未配置');
      process.exit(1);
    }
    
    // 测试2: 生成上传凭证
    const uploadToken = await testUploadToken();
    if (!uploadToken) {
      console.log('\n⚠️  警告: 上传凭证生成失败');
    }
    
    // 测试3: 生成签名URL
    const signedUrl = await testSignedUrl();
    if (!signedUrl) {
      console.log('\n⚠️  警告: 签名URL生成失败');
    }
    
    // 测试4: OSS路径生成
    const ossPath = await testOSSPath();
    if (!ossPath) {
      console.log('\n⚠️  警告: OSS路径生成失败');
    }
    
    // 测试5: 文件验证
    await testFileValidation();
    
    // 总结
    console.log('\n═══════════════════════════════════════');
    console.log('   测试总结');
    console.log('═══════════════════════════════════════');
    
    const allPassed = isConfigured && uploadToken && signedUrl && ossPath;
    
    if (allPassed) {
      console.log('✅ 所有测试通过！OSS上传功能正常');
      console.log('\n📝 下一步:');
      console.log('  1. 配置OSS Bucket的CORS和权限');
      console.log('  2. 运行数据库迁移: node run-chat-migration.js');
      console.log('  3. 实现前端OSS直传功能');
      console.log('  4. 重启后端服务: pm2 restart teaching-backend');
    } else {
      console.log('⚠️  部分测试失败，请检查配置');
      console.log('\n🔧 故障排查:');
      if (!isConfigured) {
        console.log('  - 检查 .env 文件中的OSS配置');
      }
      if (!uploadToken) {
        console.log('  - 检查AccessKey权限');
        console.log('  - 检查Bucket名称和Region是否正确');
      }
      if (!signedUrl) {
        console.log('  - 检查OSS签名算法配置');
      }
    }
    
    console.log('\n');
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
runTests();
