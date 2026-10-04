/**
 * PM2配置文件
 * 用于生产环境进程管理
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const getEnv = (key, fallback = '') => process.env[key] || fallback;

module.exports = {
  apps: [{
    name: 'teaching-backend',
    script: './src/server.js',
    
    // 验证码等内存态数据依赖单进程，默认运行1个实例
    instances: 1,
    exec_mode: 'cluster',
    
    // 环境变量（直接配置，不依赖env_file）
    env: {
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: 8081,
      SOCKET_PORT: 8081,
      
      // 数据库配置
      DB_HOST: getEnv('DB_HOST', '127.0.0.1'),
      DB_PORT: parseInt(getEnv('DB_PORT', '3306'), 10),
      DB_NAME: getEnv('DB_NAME', 'teaching_platform'),
      DB_USER: getEnv('DB_USER', 'teaching_user'),
      DB_PASSWORD: getEnv('DB_PASSWORD', 'CHANGE_ME'),
      
      // 安全配置
      JWT_SECRET: getEnv('JWT_SECRET', 'CHANGE_ME'),
      JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '7d'),
      
      // CORS配置
      CORS_ORIGIN: getEnv('CORS_ORIGIN', ''),
      CORS_CREDENTIALS: getEnv('CORS_CREDENTIALS', 'true'),
      
      // 日志配置
      LOG_LEVEL: getEnv('LOG_LEVEL', 'warn'),
      LOG_DIR: getEnv('LOG_DIR', './logs'),
      DB_LOGGING: getEnv('DB_LOGGING', 'false'),
      
      // API配置
      API_URL: getEnv('API_URL', ''),
      STATIC_URL: getEnv('STATIC_URL', '/uploads'),
      
      // OSS配置
      OSS_REGION: getEnv('OSS_REGION', 'oss-cn-hangzhou'),
      OSS_ACCESS_KEY_ID: getEnv('OSS_ACCESS_KEY_ID', ''),
      OSS_ACCESS_KEY_SECRET: getEnv('OSS_ACCESS_KEY_SECRET', ''),
      OSS_BUCKET: getEnv('OSS_BUCKET', '')
    },
    
    // 日志配置
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    
    // 自动重启配置
    autorestart: true,
    max_restarts: 50,           // 增加最大重启次数
    min_uptime: '5s',           // 最小运行时间
    max_memory_restart: '1G',   // 内存超过1G自动重启
    exp_backoff_restart_delay: 100,  // 指数退避重启延迟
    
    // 监听文件变化（生产环境建议关闭）
    watch: false,
    
    // 忽略监听的文件
    ignore_watch: [
      'node_modules',
      'logs',
      'uploads'
    ],
    
    // 延迟重启时间
    restart_delay: 4000,
    
    // cron重启（可选，每天凌晨3点重启）
    // cron_restart: '0 3 * * *',
    
    // 优雅关闭超时时间
    kill_timeout: 5000
  }]
};






