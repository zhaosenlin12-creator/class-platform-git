/**
 * Property-Based Test: Supported File Type Acceptance
 * Feature: oss-upload-upgrade
 * Property 7: Supported File Type Acceptance
 * 
 * For any file with extension in the supported list, the Upload_System SHALL accept the file for upload.
 * 
 * Validates: Requirements 2.4
 */

const fc = require('fast-check');
const axios = require('axios');
const ossUtil = require('./src/utils/oss');

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8081';
const TEST_TOKEN = process.env.AUTH_TOKEN || '';

// Supported file types from requirements
const SUPPORTED_TYPES = [
  '.zip', '.rar', '.7z', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.sb3', '.sb2', '.py', '.js', '.html', '.css', '.json',
  '.mp4', '.mp3', '.wav', '.jpg', '.jpeg', '.png', '.gif', '.webp'
];

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Property 7: Supported File Type Acceptance
 */
async function testProperty7_FileTypeAcceptance() {
  log('\n📋 Property 7: Supported File Type Acceptance', 'blue');
  log('Validates: Requirements 2.4', 'blue');
  
  if (!TEST_TOKEN) {
    log('⚠️  跳过测试: 需要设置 AUTH_TOKEN 环境变量', 'yellow');
    return { passed: false, skipped: true };
  }

  if (!ossUtil.isOSSConfigured()) {
    log('⚠️  跳过测试: OSS未配置', 'yellow');
    return { passed: false, skipped: true };
  }

  try {
    const headers = { 'Authorization': `Bearer ${TEST_TOKEN}` };
    
    // Define generators
    const fileNameArb = fc.string({ minLength: 3, maxLength: 20 })
      .filter(s => s.trim().length > 0 && !/[<>:"|?*]/.test(s));
    const fileExtArb = fc.constantFrom(...SUPPORTED_TYPES);
    
    // Run property test
    await fc.assert(
      fc.asyncProperty(
        fileNameArb,
        fileExtArb,
        async (baseName, ext) => {
          const fileName = baseName + ext;
          const fileType = 'application/octet-stream';
          
          try {
            // Request upload token for supported file type
            const response = await axios.post(
              `${BASE_URL}/api/course/resource/upload-token`,
              { fileName, fileType },
              { headers, validateStatus: (status) => status < 500 }
            );
            
            // Should accept all supported file types
            if (!response.data.success) {
              throw new Error(`Rejected supported file type ${ext}: ${response.data.message}`);
            }
            
            // Verify response contains required fields
            if (!response.data.data.uploadUrl || !response.data.data.fileKey) {
              throw new Error(`Invalid response for supported file type ${ext}`);
            }
            
            return true;
            
          } catch (error) {
            if (error.response?.status === 400 && error.response?.data?.message?.includes('不支持的文件类型')) {
              throw new Error(`Incorrectly rejected supported file type ${ext}`);
            }
            throw error;
          }
        }
      ),
      { numRuns: 30, verbose: true }
    );
    
    log('✅ Property 7 通过: 所有支持的文件类型都被接受', 'green');
    return { passed: true };
    
  } catch (error) {
    log(`❌ Property 7 失败: ${error.message}`, 'red');
    if (error.counterexample) {
      log(`反例: ${JSON.stringify(error.counterexample)}`, 'red');
    }
    return { passed: false, error: error.message, counterexample: error.counterexample };
  }
}

// ========== Main Test Runner ==========

async function runTest() {
  log('='.repeat(60), 'blue');
  log('Property-Based Test: Supported File Type Acceptance', 'blue');
  log('Feature: oss-upload-upgrade', 'blue');
  log('='.repeat(60), 'blue');
  
  const result = await testProperty7_FileTypeAcceptance();
  
  log('\n' + '='.repeat(60), 'blue');
  log('测试结果', 'blue');
  log('='.repeat(60), 'blue');
  
  if (result.passed) {
    log('\n✅ Property 7 测试通过！', 'green');
    return true;
  } else if (result.skipped) {
    log('\n⚠️  测试被跳过（需要配置OSS和AUTH_TOKEN）', 'yellow');
    return false;
  } else {
    log('\n❌ Property 7 测试失败', 'red');
    return false;
  }
}

// Run test
if (require.main === module) {
  runTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log(`\n❌ 测试执行失败: ${error.message}`, 'red');
      console.error(error);
      process.exit(1);
    });
}

module.exports = { testProperty7_FileTypeAcceptance, runTest };
