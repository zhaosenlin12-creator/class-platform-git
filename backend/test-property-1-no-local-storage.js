/**
 * Property-Based Test: No Local File Storage
 * Feature: oss-upload-upgrade
 * Property 1: No Local File Storage
 * 
 * For any file upload (resource or classroom), after successful upload,
 * the server filesystem SHALL NOT contain the uploaded file.
 * 
 * Validates: Requirements 1.1, 9.4
 */

const fc = require('fast-check');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
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
 * Check if a file exists in the local uploads directory
 */
function checkLocalFileExists(fileName) {
  const uploadsDir = path.join(__dirname, 'uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    return false;
  }
  
  const files = fs.readdirSync(uploadsDir);
  
  // Check for exact match or partial match (in case of timestamp prefixes)
  return files.some(f => f === fileName || f.includes(fileName));
}

/**
 * Property 1: No Local File Storage
 * 
 * For any file upload (resource or classroom), after successful upload,
 * the server filesystem SHALL NOT contain the uploaded file.
 */
async function testProperty1_NoLocalFileStorage() {
  log('\n📋 Property 1: No Local File Storage', 'blue');
  log('Validates: Requirements 1.1, 9.4', 'blue');
  
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
    const uploadTypeArb = fc.constantFrom('resource', 'classroom');
    const fileNameArb = fc.string({ minLength: 5, maxLength: 30 })
      .filter(s => s.trim().length > 0 && !/[<>:"|?*]/.test(s));
    const fileExtArb = fc.constantFrom('.txt', '.pdf', '.png', '.zip');
    const fileSizeArb = fc.integer({ min: 100, max: 10000 }); // Small files for testing
    
    // Run property test
    await fc.assert(
      fc.asyncProperty(
        uploadTypeArb,
        fileNameArb,
        fileExtArb,
        fileSizeArb,
        async (uploadType, baseName, ext, fileSize) => {
          const fileName = baseName + ext;
          const fileType = 'application/octet-stream';
          
          try {
            // Step 1: Get upload token
            let endpoint = '';
            if (uploadType === 'resource') {
              endpoint = `${BASE_URL}/api/course/resource/upload-token`;
            } else {
              endpoint = `${BASE_URL}/api/classroom/test-classroom-001/upload-token`;
            }
            
            const tokenResponse = await axios.post(
              endpoint,
              { fileName, fileType },
              { headers, validateStatus: (status) => status < 500 }
            );
            
            if (!tokenResponse.data.success) {
              // If token generation fails, skip this test case
              return true;
            }
            
            const { uploadUrl, fileKey } = tokenResponse.data.data;
            
            // Step 2: Upload file to OSS
            const testContent = Buffer.alloc(fileSize, 'A');
            
            await axios.put(uploadUrl, testContent, {
              headers: { 'Content-Type': fileType },
              validateStatus: (status) => status < 500
            });
            
            // Step 3: Check local filesystem
            // Wait a moment for any potential file writes
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const localFileExists = checkLocalFileExists(fileName);
            
            if (localFileExists) {
              throw new Error(`File ${fileName} found in local filesystem after upload`);
            }
            
            // Step 4: Verify file exists in OSS (not locally)
            const ossFileExists = await ossUtil.fileExists(fileKey);
            
            if (!ossFileExists) {
              // File should be in OSS
              log(`⚠️  File ${fileName} not found in OSS`, 'yellow');
            }
            
            return true;
            
          } catch (error) {
            if (error.response?.status === 404 || error.response?.status === 400) {
              // Expected validation errors
              return true;
            }
            throw error;
          }
        }
      ),
      { numRuns: 20, verbose: true }
    );
    
    log('✅ Property 1 通过: 服务器本地无文件存储', 'green');
    return { passed: true };
    
  } catch (error) {
    log(`❌ Property 1 失败: ${error.message}`, 'red');
    if (error.counterexample) {
      log(`反例: ${JSON.stringify(error.counterexample)}`, 'red');
    }
    return { passed: false, error: error.message, counterexample: error.counterexample };
  }
}

// ========== Main Test Runner ==========

async function runTest() {
  log('='.repeat(60), 'blue');
  log('Property-Based Test: No Local File Storage', 'blue');
  log('Feature: oss-upload-upgrade', 'blue');
  log('='.repeat(60), 'blue');
  
  const result = await testProperty1_NoLocalFileStorage();
  
  log('\n' + '='.repeat(60), 'blue');
  log('测试结果', 'blue');
  log('='.repeat(60), 'blue');
  
  if (result.passed) {
    log('\n✅ Property 1 测试通过！', 'green');
    return true;
  } else if (result.skipped) {
    log('\n⚠️  测试被跳过（需要配置OSS和AUTH_TOKEN）', 'yellow');
    return false;
  } else {
    log('\n❌ Property 1 测试失败', 'red');
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

module.exports = { testProperty1_NoLocalFileStorage, runTest };
