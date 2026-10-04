/**
 * 系统健康检测脚本
 * 用于检测后端服务、数据库连接、API接口等是否正常
 * 
 * 使用方法: node scripts/health-check.js
 */

const http = require('http');
const https = require('https');

// 配置
const CONFIG = {
  baseUrl: process.env.API_URL || 'http://localhost:8081',
  timeout: 10000,
  endpoints: [
    { path: '/health', method: 'GET', name: '健康检查' },
    { path: '/sys/config/getCurrentConfig', method: 'GET', name: '系统配置' },
  ]
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(50));
  log(title, 'cyan');
  console.log('='.repeat(50));
}

// HTTP请求函数
function makeRequest(url, method = 'GET', timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.request(url, { method, timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          data: data,
          duration,
          headers: res.headers
        });
      });
    });
    
    req.on('error', (err) => {
      const wrappedError = new Error(err && (err.message || err.code) ? `${err.message || err.code}` : '请求失败');
      wrappedError.code = err && err.code;
      reject(wrappedError);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
    
    req.end();
  });
}

// 检测单个端点
async function checkEndpoint(endpoint) {
  const url = `${CONFIG.baseUrl}${endpoint.path}`;
  
  try {
    const result = await makeRequest(url, endpoint.method, CONFIG.timeout);
    
    if (result.statusCode >= 200 && result.statusCode < 300) {
      log(`  ✅ ${endpoint.name}: ${result.statusCode} (${result.duration}ms)`, 'green');
      return { success: true, endpoint: endpoint.name, duration: result.duration };
    } else {
      log(`  ⚠️ ${endpoint.name}: ${result.statusCode} (${result.duration}ms)`, 'yellow');
      return { success: false, endpoint: endpoint.name, statusCode: result.statusCode };
    }
  } catch (error) {
    const errorMsg = error && (error.message || error.code) ? (error.message || error.code) : '未知错误';
    log(`  ❌ ${endpoint.name}: ${errorMsg}`, 'red');
    return { success: false, endpoint: endpoint.name, error: errorMsg };
  }
}

// 检测健康状态详情
async function checkHealthDetails() {
  const url = `${CONFIG.baseUrl}/health`;
  
  try {
    const result = await makeRequest(url, 'GET', CONFIG.timeout);
    const health = JSON.parse(result.data);
    
    log(`\n  状态: ${health.status}`, health.status === 'ok' ? 'green' : 'yellow');
    log(`  运行时间: ${Math.floor(health.uptime / 60)} 分钟`, 'blue');
    log(`  环境: ${health.environment || 'development'}`, 'blue');
    
    if (health.memory) {
      log(`  内存使用: ${health.memory.heapUsed} / ${health.memory.heapTotal}`, 'blue');
    }
    
    if (health.dependencies?.database) {
      const db = health.dependencies.database;
      log(`  数据库: ${db.connected ? '已连接' : '未连接'} (连接池: ${db.poolSize})`, db.connected ? 'green' : 'red');
    }
    
    return health;
  } catch (error) {
    const errorMsg = error && (error.message || error.code) ? (error.message || error.code) : '未知错误';
    log(`  ❌ 无法获取健康详情: ${errorMsg}`, 'red');
    return null;
  }
}

// 主函数
async function main() {
  console.log('\n');
  log('🏥 系统健康检测', 'cyan');
  log(`目标: ${CONFIG.baseUrl}`, 'blue');
  log(`时间: ${new Date().toLocaleString('zh-CN')}`, 'blue');
  
  // 1. 基础连接检测
  logSection('1. 基础连接检测');
  
  const results = [];
  for (const endpoint of CONFIG.endpoints) {
    const result = await checkEndpoint(endpoint);
    results.push(result);
  }
  
  // 2. 健康详情
  logSection('2. 健康状态详情');
  const health = await checkHealthDetails();
  
  // 3. 总结
  logSection('3. 检测总结');
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  if (successCount === totalCount) {
    log(`✅ 所有检测通过 (${successCount}/${totalCount})`, 'green');
    log('系统运行正常，可以正常使用', 'green');
  } else {
    log(`⚠️ 部分检测失败 (${successCount}/${totalCount})`, 'yellow');
    log('请检查失败的服务', 'yellow');
  }
  
  // 4. 性能建议
  if (health && health.memory) {
    const heapUsed = parseInt(health.memory.heapUsed);
    if (heapUsed > 500) {
      log('\n⚠️ 内存使用较高，建议重启服务或检查内存泄漏', 'yellow');
    }
  }
  
  console.log('\n');
  
  // 返回退出码
  process.exit(successCount === totalCount ? 0 : 1);
}

// 运行
main().catch(error => {
  log(`❌ 检测脚本执行失败: ${error.message}`, 'red');
  process.exit(1);
});
