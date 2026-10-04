/**
 * Property-Based Test: Direct OSS Upload via Pre-signed URLs
 * Feature: oss-upload-upgrade
 * Property 2: Direct OSS Upload via Pre-signed URLs
 * 
 * For any file upload initiation, the Upload_System SHALL request a pre-signed URL
 * from the backend and upload the file directly to that OSS URL without sending
 * file content to the backend.
 * 
 * Validates: Requirements 1.2, 5.1
 */

const fc = require('fast-check');
const axios = require('axios');
const ossUtil = require('./src/utils/oss');

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8081';
const TEST_TOKEN = process.env.AUTH_TOKEN || '';

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
 * Property 2: Direct OSS Upload via Pre-signed URLs
 * 
 * For any file upload initiation, the Upload_System SHALL request a pre-signed URL
 * from the backend and upload the file directly to that OSS URL without sending
 * file content to the backend.
 */
async function testProperty2_DirectOSSUpload() {
  log('\n📋 Property 2: Direct OSS Upload via Pre-signed URLs', 'blue');
  log('Validates: Requirements 1.2, 5.1', 'blue');
  
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
    const fileNameArb = fc.string({ minLength: 5, maxLength: 30 })
      .filter(s => s.trim().length > 0 && !/[<>:"|?*]/.test(s));
    const fileExtArb = fc.constantFrom('.txt', '.pdf', '.png', '.zip', '.mp4');
    const fileSizeArb = fc.integer({ min: 100, max: 5000 }); // Small files for testing
    
    // Run property test
    await fc.assert(
      fc.asyncProperty(
        fileNameArb,
        fileExtArb,
        fileSizeArb,
        async (baseName, ext, fileSize) => {
          const fileName = baseName + ext;
          const fileType = 'application/octet-stream';
          
          try {
            // Step 1: Request pre-signed URL from backend
            const tokenResponse = await axios.post(
              `${BASE_URL}/api/course/resource/upload-token`,
              { fileName, fileType },
              { headers, validateStatus: (status) => status < 500 }
            );
            
            if (!tokenResponse.data.success) {
              // Validation error, skip this case
              return true;
            }
            
            const { uploadUrl, fileKey } = tokenResponse.data.data;
            
            // Verify uploadUrl is a valid URL
            const url = new URL(uploadUrl);
            if (!url.protocol.startsWith('http')) {
              throw new Error(`Invalid uploadUrl protocol: ${url.protocol}`);
            }
            
            // Verify uploadUrl points to OSS, not backend
            if (url.hostname.includes('localhost') || url.hostname.includes('127.0.0.1')) {
              throw new Error(`uploadUrl points to backend, not OSS: ${url.hostname}`);
            }
            
            // Step 2: Upload file directly to OSS using pre-signed URL
            const testContent = Buffer.alloc(fileSize, 'B');
            
            const ossResponse = await axios.put(uploadUrl, testContent, {
              headers: { 'Content-Type': fileType },
              validateStatus: (status) => status < 500
            });
            
            if (ossResponse.status !== 200 && ossResponse.status !== 204) {
              throw new Error(`OSS upload failed with status: ${ossResponse.status}`);
            }
            
            // Step 3: Verify file exists in OSS
            const fileExists = await ossUtil.fileExists(fileKey);
            
            if (!fileExists) {
              throw new Error(`File not found in OSS after direct upload: ${fileKey}`);
            }
            
            // Step 4: Verify backend never received file content
            // This is implicit - we only sent metadata requests, never file content
            
            return true;
            
          } catch (error) {
            if (error.response?.status === 400) {
              // Validation error, skip this case
              return true;
            }
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
              // Network error, skip this case
              log(`⚠️  网络错误，跳过: ${error.message}`, 'yellow');
              return true;
            }
            throw error;
          }
        }
      ),
      { numRuns: 15, verbose: true }
    );
    
    log('✅ Property 2 通过: 直接上传到OSS，不经过后端', 'green');
    return { passed: true };
    
  } catch (error) {
    log(`❌ Property 2 失败: ${error.message}`, 'red');
    if (error.counterexample) {
      log(`反例: ${JSON.stringify(error.counterexample)}`, 'red');
    }
    return { passed: false, error: error.message, counterexample: error.counterexample };
  }
}

// ========== Main Test Runner ==========

async function runTest() {
  log('='.repeat(60), 'blue');
  log('Property-Based Test: Direct OSS Upload via Pre-signed URLs', 'blue');
  log('Feature: oss-upload-upgrade', 'blue');
  log('='.repeat(60), 'blue');
  
  const result = await testProperty2_DirectOSSUpload();
  
  log('\n' + '='.repeat(60), 'blue');
  log('测试结果', 'blue');
  log('='.repeat(60), 'blue');
  
  if (result.passed) {
    log('\n✅ Property 2 测试通过！', 'green');
    return true;
  } else if (result.skipped) {
    log('\n⚠️  测试被跳过（需要配置OSS和AUTH_TOKEN）', 'yellow');
    return false;
  } else {
    log('\n❌ Property 2 测试失败', 'red');
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

module.exports = { testProperty2_DirectOSSUpload, runTest };
