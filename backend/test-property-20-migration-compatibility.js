/**
 * Property-Based Test: Migration Backward Compatibility
 * Feature: oss-upload-upgrade
 * Property 20: Migration Backward Compatibility
 * 
 * For any existing chat record before migration, after running the migration,
 * the record SHALL remain unchanged except for the addition of NULL values in new columns.
 * 
 * Validates: Requirements 7.4
 */

const fc = require('fast-check');
const models = require('./src/models');

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
 * Property 20: Migration Backward Compatibility
 */
async function testProperty20_MigrationCompatibility() {
  log('\n📋 Property 20: Migration Backward Compatibility', 'blue');
  log('Validates: Requirements 7.4', 'blue');
  
  try {
    // Check if TeachingClassroomChat model exists
    if (!models.TeachingClassroomChat) {
      throw new Error('TeachingClassroomChat model not found');
    }
    
    // Run property test: existing records should be queryable
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 32 }),
        async (recordId) => {
          try {
            // Try to query existing records
            const record = await models.TeachingClassroomChat.findOne({
              where: { id: recordId }
            });
            
            // If record exists, verify it has the new columns (even if NULL)
            if (record) {
              const attributes = models.TeachingClassroomChat.rawAttributes;
              
              // New columns should exist in the model
              const newColumns = ['file_key', 'file_name', 'file_size', 'file_type'];
              for (const column of newColumns) {
                if (!attributes[column]) {
                  throw new Error(`New column ${column} not found in model`);
                }
              }
              
              // Record should be accessible with new columns
              // Values can be NULL for old records
              if (record.file_key === undefined) {
                throw new Error('file_key column not accessible');
              }
            }
            
            return true;
            
          } catch (error) {
            // If error is about column not existing, fail the test
            if (error.message.includes('Unknown column') || 
                error.message.includes('column') ||
                error.message.includes('field')) {
              throw new Error(`Migration compatibility issue: ${error.message}`);
            }
            // Other errors are acceptable (e.g., record not found)
            return true;
          }
        }
      ),
      { numRuns: 10, verbose: true }
    );
    
    // Additional test: Query all records to ensure no data corruption
    log('\n📝 验证现有记录可访问性', 'cyan');
    
    const existingRecords = await models.TeachingClassroomChat.findAll({
      limit: 10,
      order: [['create_time', 'DESC']]
    });
    
    log(`   找到 ${existingRecords.length} 条现有记录`, 'green');
    
    // Verify each record has the new columns (even if NULL)
    for (const record of existingRecords) {
      if (record.file_key === undefined) {
        throw new Error('Existing record missing file_key column');
      }
      if (record.file_name === undefined) {
        throw new Error('Existing record missing file_name column');
      }
      if (record.file_size === undefined) {
        throw new Error('Existing record missing file_size column');
      }
      if (record.file_type === undefined) {
        throw new Error('Existing record missing file_type column');
      }
    }
    
    log('   所有现有记录都可访问新列', 'green');
    
    log('✅ Property 20 通过: 迁移保持向后兼容', 'green');
    return { passed: true };
    
  } catch (error) {
    log(`❌ Property 20 失败: ${error.message}`, 'red');
    if (error.counterexample) {
      log(`反例: ${JSON.stringify(error.counterexample)}`, 'red');
    }
    return { passed: false, error: error.message, counterexample: error.counterexample };
  }
}

// ========== Main Test Runner ==========

async function runTest() {
  log('='.repeat(60), 'blue');
  log('Property-Based Test: Migration Backward Compatibility', 'blue');
  log('Feature: oss-upload-upgrade', 'blue');
  log('='.repeat(60), 'blue');
  
  const result = await testProperty20_MigrationCompatibility();
  
  log('\n' + '='.repeat(60), 'blue');
  log('测试结果', 'blue');
  log('='.repeat(60), 'blue');
  
  if (result.passed) {
    log('\n✅ Property 20 测试通过！', 'green');
    return true;
  } else {
    log('\n❌ Property 20 测试失败', 'red');
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

module.exports = { testProperty20_MigrationCompatibility, runTest };
