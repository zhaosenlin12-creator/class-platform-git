/**
 * Property-Based Test: Upload Token Expiration Time
 * Feature: oss-upload-upgrade
 * Property 16: Upload Token Expiration Time
 * 
 * For any generated pre-signed upload URL, the expiration time SHALL be
 * approximately 5 minutes (300 seconds ± 10 seconds) from generation time.
 * 
 * Validates: Requirements 6.4
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
 * Property 16: Upload Token Expiration Time
 */
async function testProperty16_UploadTokenExpiration() {
  log('\n📋 Property 16: Upload Token Expiration Time', 'blue');
  log('Validates: Requirements 6.4', 'blue');
  
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
    const fileExtArb = fc.constantFrom('.txt', '.pdf', '.png', '.zip');
    
    // Run property test
    await fc.assert(
      fc.asyncProperty(
        fileNameArb,
        fileExtArb,
        async (baseName, ext) => {
          const fileName = baseName + ext;
          const fileType = 'application/octet-stream';
          
          try {
            // Record request time
            const requestTime = Date.now();
            
            // Request upload token
            const response = await axios.post(
              `${BASE_URL}/api/course/resource/upload-token`,
              { fileName, fileType },
              { headers, validateStatus: (status) => status < 500 }
            );
            
            if (!response.data.success) {
              // Validation error, skip this case
              return true;
            }
            
            const { expiration } = response.data.data;
            
            // Calculate expiration time in seconds
            const expirationDiff = expiration - requestTime;
            const expirationSeconds = Math.round(expirationDiff / 1000);
            
            // Verify expiration is approximately 5 minutes (300 seconds ± 10 seconds)
            if (expirationSeconds < 290 || expirationSeconds > 310) {
              throw new Error(
                `Invalid expiration time: ${expirationSeconds}s (expected 300s ± 10s)`
              );
            }
            
            return true;
            
          } catch (error) {
            if (error.response?.status === 400) {
              // Validation error, skip this case
              return true;
            }
            throw error;
          }
        }
      ),
      { numRuns: 20, verbose: true }
    );
    
    log('✅ Property 16 通过: 上传凭证过期时间约为5分钟', 'green');
    return { passed: true };
    
  } catch (error) {
    log(`❌ Property 16 失败: ${error.message}`, 'red');
    if (error.counterexample) {
      log(`反例: ${JSON.stringify(error.counterexample)}`, 'red');
    }
    return { passed: false, error: error.message, counterexample: error.counterexample };
  }
}

// ========== Main Test Runner ==========

async function runTest() {
  log('='.repeat(60), 'blue');
  log('Property-Based Test: Upload Token Expiration Time', 'blue');
  log('Feature: oss-upload-upgrade', 'blue');
  log('='.repeat(60), 'blue');
  
  const result = await testProperty16_UploadTokenExpiration();
  
  log('\n' + '='.repeat(60), 'blue');
  log('测试结果', 'blue');
  log('='.repeat(60), 'blue');
  
  if (result.passed) {
    log('\n✅ Property 16 测试通过！', 'green');
    return true;
  } else if (result.skipped) {
    log('\n⚠️  测试被跳过（需要配置OSS和AUTH_TOKEN）', 'yellow');
    return false;
  } else {
    log('\n❌ Property 16 测试失败', 'red');
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

module.exports = { testProperty16_UploadTokenExpiration, runTest };
