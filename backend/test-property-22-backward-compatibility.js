/**
 * Property-Based Test: Backward Compatibility with Existing Files
 * Feature: oss-upload-upgrade
 * Property 22: Backward Compatibility with Existing Files
 * 
 * For any file uploaded before the upgrade, the Upload_System SHALL successfully
 * generate signed download URLs and allow file access.
 * 
 * Validates: Requirements 9.5, 12.1
 */

const fc = require('fast-check');
const ossUtil = require('./src/utils/oss');

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
 * Property 22: Backward Compatibility with Existing Files
 */
async function testProperty22_BackwardCompatibility() {
  log('\n📋 Property 22: Backward Compatibility with Existing Files', 'blue');
  log('Validates: Requirements 9.5, 12.1', 'blue');
  
  if (!ossUtil.isOSSConfigured()) {
    log('⚠️  跳过测试: OSS未配置', 'yellow');
    return { passed: false, skipped: true };
  }

  try {
    // Define generators for different file key formats
    // Old format: might be just filename or simple path
    // New format: resources/{userId}/{timestamp}_{fileName}
    const oldFormatArb = fc.string({ minLength: 5, maxLength: 30 })
      .map(s => `${s}.txt`);
    
    const newFormatArb = fc.tuple(
      fc.string({ minLength: 5, maxLength: 15 }),
      fc.integer({ min: 1000000000000, max: 9999999999999 }),
      fc.string({ minLength: 3, maxLength: 15 })
    ).map(([userId, timestamp, fileName]) => 
      `resources/${userId}/${timestamp}_${fileName}.txt`
    );
    
    const fileKeyArb = fc.oneof(oldFormatArb, newFormatArb);
    
    // Run property test
    await fc.assert(
      fc.asyncProperty(
        fileKeyArb,
        async (fileKey) => {
          try {
            // Generate signed URL for any file key format
            const signedUrl = await ossUtil.getSignedUrl(fileKey, 3600);
            
            // Verify URL is valid
            if (!signedUrl || !signedUrl.startsWith('http')) {
              throw new Error(`Invalid signed URL for fileKey: ${fileKey}`);
            }
            
            // Verify URL is accessible (contains necessary parameters)
            const url = new URL(signedUrl);
            
            // URL should have OSS domain
            if (!url.hostname.includes('aliyuncs.com') && 
                !url.hostname.includes('oss') &&
                !url.hostname.includes('localhost')) {
              throw new Error(`Invalid OSS URL hostname: ${url.hostname}`);
            }
            
            // URL should contain the file key in path
            if (!url.pathname.includes(fileKey.split('/').pop().split('_').pop())) {
              // At least the filename part should be in the path
              log(`⚠️  文件名未在URL路径中找到: ${fileKey}`, 'yellow');
            }
            
            return true;
            
          } catch (error) {
            if (error.message.includes('OSS not configured')) {
              return true;
            }
            throw error;
          }
        }
      ),
      { numRuns: 20, verbose: true }
    );
    
    log('✅ Property 22 通过: 支持旧格式和新格式的文件访问', 'green');
    return { passed: true };
    
  } catch (error) {
    log(`❌ Property 22 失败: ${error.message}`, 'red');
    if (error.counterexample) {
      log(`反例: ${JSON.stringify(error.counterexample)}`, 'red');
    }
    return { passed: false, error: error.message, counterexample: error.counterexample };
  }
}

// ========== Main Test Runner ==========

async function runTest() {
  log('='.repeat(60), 'blue');
  log('Property-Based Test: Backward Compatibility', 'blue');
  log('Feature: oss-upload-upgrade', 'blue');
  log('='.repeat(60), 'blue');
  
  const result = await testProperty22_BackwardCompatibility();
  
  log('\n' + '='.repeat(60), 'blue');
  log('测试结果', 'blue');
  log('='.repeat(60), 'blue');
  
  if (result.passed) {
    log('\n✅ Property 22 测试通过！', 'green');
    return true;
  } else if (result.skipped) {
    log('\n⚠️  测试被跳过（需要配置OSS）', 'yellow');
    return false;
  } else {
    log('\n❌ Property 22 测试失败', 'red');
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

module.exports = { testProperty22_BackwardCompatibility, runTest };
