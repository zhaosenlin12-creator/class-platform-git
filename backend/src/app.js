/**
 * Express应用配置
 * 配置中间件、路由等
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const { logger, morganMiddleware } = require('./middleware/logger');
const { requestContext } = require('./middleware/requestContext');
const errorHandler = require('./middleware/errorHandler');
const registerRoutes = require('./routes');
const sequelize = require('./config/database');
const { getClientIp } = require('./utils/requestIp');

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
};

// 创建Express应用
const app = express();
app.disable('x-powered-by');
// Behind Nginx reverse proxy (1 = only trust first proxy)
const trustProxyValue = parseBoolean(process.env.TRUST_PROXY_ENABLED, true) ? (process.env.TRUST_PROXY_VALUE || 1) : false;
app.set('trust proxy', trustProxyValue);
app.use(requestContext);

// ===========================================
// 基础中间�?// ===========================================

// 安全头设置
const isProduction = process.env.NODE_ENV === 'production';
const deploymentOrigins = (process.env.CORS_ORIGIN || '').split(',').map(origin => origin.trim()).filter(Boolean);

const baseConnectSrcOrigins = [
  "'self'",
  'data:',
  'blob:'
];

const productionConnectSrcOrigins = [
  'https://class.codebn.cn',
  'wss://class.codebn.cn',
  'https://scratch.mit.edu',
  'https://cdn.jsdelivr.net',
  'https://cdnjs.cloudflare.com'
];

const developmentConnectSrcOrigins = [
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:3001',
  'ws://localhost:8080',
  'ws://localhost:8081',
  'ws://localhost:3001',
  'http://192.168.1.5:8080',
  'http://192.168.1.5:8081',
  'ws://192.168.1.5:8080',
  'ws://192.168.1.5:8081',
  'http://192.168.1.8:8080',
  'http://192.168.1.8:8081',
  'ws://192.168.1.8:8080',
  'ws://192.168.1.8:8081',
  'http://class.codebn.cn:8081',
  'ws://class.codebn.cn:8081'
];

const connectSrcOrigins = [
  ...baseConnectSrcOrigins,
  ...(isProduction ? productionConnectSrcOrigins : [...productionConnectSrcOrigins, ...developmentConnectSrcOrigins])
];

deploymentOrigins.forEach(origin => {
  if (!connectSrcOrigins.includes(origin)) {
    connectSrcOrigins.push(origin);
  }
  const wsOrigin = origin.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
  if (wsOrigin !== origin && !connectSrcOrigins.includes(wsOrigin)) {
    connectSrcOrigins.push(wsOrigin);
  }
});

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'", 'data:', 'blob:'],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://scratch.mit.edu', 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com', 'https://unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com', 'https://unpkg.com'],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://scratch.mit.edu',
        'https://cdn.jsdelivr.net',
        'https://cdnjs.cloudflare.com',
        'https://unpkg.com',
        'https://gw.alipayobjects.com',
        ...(isProduction ? [] : ['http://localhost:8081'])
      ],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com', 'https://unpkg.com'],
      connectSrc: connectSrcOrigins,
      frameSrc: ["'self'", 'https://scratch.mit.edu', 'https://player.vimeo.com', 'https://www.youtube.com'],
      mediaSrc: ["'self'", 'data:', 'blob:', 'https://scratch.mit.edu'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      manifestSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  referrerPolicy: { policy: 'no-referrer' },
  hsts: isProduction ? {
    maxAge: 15552000,
    includeSubDomains: true,
    preload: true
  } : false,
  permissionsPolicy: {
    features: {
      geolocation: [],
      microphone: [],
      camera: [],
      payment: [],
      usb: [],
      interestCohort: []
    }
  }
}));

if (!isProduction) {
  // 开发环境下放宽 CSP 方便调试
  app.use((req, res, next) => {
    // 开发环境完全禁用 CSP，避免上传等功能被阻止
    res.removeHeader('Content-Security-Policy');
    next();
  });
}

// CORS配置 - 生产环境使用白名单
const corsOrigins = deploymentOrigins;
const allowAllOrigins = corsOrigins.length === 0 || corsOrigins.includes('*');
const corsCredentials = parseBoolean(process.env.CORS_CREDENTIALS, true);

app.use(cors({
  origin: (origin, callback) => {
    // 允许无Origin的请求（如curl/健康检查）
    if (!origin) {
      return callback(null, true);
    }
    // 非生产环境允许全部（方便本地调试）
    if (!isProduction && allowAllOrigins) {
      return callback(null, true);
    }
    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: corsCredentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Access-Token', 'Token'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400
}));

// 请求体解析（避免超大请求）
const jsonBodyLimit = process.env.REQUEST_BODY_LIMIT || '2mb';
const urlencodedBodyLimit = process.env.URLENCODED_BODY_LIMIT || '2mb';
app.use(express.json({ limit: jsonBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: urlencodedBodyLimit }));

// 响应压缩
app.use(compression());

// HTTP请求日志
app.use(morganMiddleware);

// ===========================================
// 接口限流（防止暴力请求）
// ===========================================
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 1 * 60 * 1000, // 1分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 200, // 每分钟200次请求
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: trustProxyValue,
  keyGenerator: (req) => {
    // 使用真实IP作为限流key
    return getClientIp(req);
  },
  skip: (req) => {
    // 静态资源和健康检查不限流
    return req.path.startsWith('/uploads') || req.path === '/health';
  }
});

// 只对API接口限流，静态文件不限流
const enableRateLimitInDev = parseBoolean(process.env.ENABLE_RATE_LIMIT_IN_DEV, false);
if (isProduction && parseBoolean(process.env.SKIP_RATE_LIMIT, false)) {
  logger.warn('SKIP_RATE_LIMIT=true is ignored in production');
}
if (isProduction || enableRateLimitInDev) {
  app.use('/sys', limiter);
  app.use('/api', limiter);
  app.use('/teaching', limiter);
  app.use('/student', limiter);
  app.use('/class', limiter);
  app.use('/course', limiter);
  app.use('/homework', limiter);
  app.use('/teacher', limiter);
  app.use('/classroom', limiter);
}

// ===========================================
// 静态文件服务
// ===========================================
const uploadsDir = path.join(__dirname, '../uploads');
const forceOssUploads = parseBoolean(process.env.FORCE_OSS, isProduction);
const serveFrontendDist = parseBoolean(process.env.SERVE_FRONTEND_DIST, false);
const frontendDistDir = path.resolve(__dirname, '../../web/dist');
const frontendIndexPath = path.join(frontendDistDir, 'index.html');
const spaHtmlRouteMatchers = [
  /^\/student\/(home|classrooms|works|homework|my-courses|my-homework|my-classrooms|profile|programming|classroom)(\/.*)?$/i,
  /^\/classroom\/(online|review)(\/.*)?$/i,
  /^\/admin(\/.*)?$/i,
  /^\/dashboard(\/.*)?$/i,
  /^\/management(\/.*)?$/i,
  /^\/teaching\/(mineCourse|course-management|classroom-management|homework-management|student-management)(\/.*)?$/i,
  /^\/course\/?$/i,
  /^\/programming\/?$/i,
  /^\/programming\/(workspace|editor)(\/.*)?$/i,
  /^\/teacher\/(dashboard|course-management|course-content|resource-library|student-management|student-analytics|homework-review|classroom|students)(\/.*)?$/i,
  /^\/portal(\/.*)?$/i,
  /^\/user(\/.*)?$/i
];
const forceDownloadExts = new Set([
  // Web脚本/可执行内容
  '.html', '.htm', '.js', '.mjs', '.css', '.svg',
  // 常见WebShell/脚本
  '.php', '.phtml', '.phar', '.jsp', '.jspx', '.asp', '.aspx', '.cgi', '.pl',
  // 系统脚本/可执行文件
  '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd', '.com', '.exe', '.dll', '.so'
]);

if (forceOssUploads) {
  app.use('/uploads', (req, res) => {
    res.status(404).send('Not Found');
  });
} else {
  app.use('/uploads', express.static(uploadsDir, {
    setHeaders: (res, filePath) => {
      // 防止浏览器嗅探MIME类型
      res.setHeader('X-Content-Type-Options', 'nosniff');

      // 对高风险类型强制下载，避免被当作站内页面/脚本执行
      const ext = path.extname(filePath).toLowerCase();
      if (forceDownloadExts.has(ext)) {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', 'attachment');
      }
    }
  }));
}

function shouldServeFrontendHtml(req) {
  if (!serveFrontendDist || !fs.existsSync(frontendIndexPath)) {
    return false;
  }

  const method = String(req.method || '').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    return false;
  }

  const pathname = req.path || '/';
  return spaHtmlRouteMatchers.some((matcher) => matcher.test(pathname));
}

// ===========================================
// 健康检查接口
// ===========================================
app.get('/health', async (req, res) => {
  const memUsage = process.memoryUsage();
  const detailedHealthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB'
    },
    dependencies: {
      database: {
        connected: true,
        poolSize: sequelize.config.pool?.max || 'N/A'
      }
    }
  };

  try {
    await sequelize.query('SELECT 1');
  } catch (error) {
    detailedHealthStatus.status = 'degraded';
    detailedHealthStatus.dependencies.database.connected = false;
    detailedHealthStatus.dependencies.database.error = error.message;
  }

  const statusCode = detailedHealthStatus.status === 'ok' ? 200 : 503;

  if (isProduction) {
    return res.status(statusCode).json({
      status: detailedHealthStatus.status,
      timestamp: detailedHealthStatus.timestamp
    });
  }

  return res.status(statusCode).json(detailedHealthStatus);
});

// ===========================================
// 注册所有路�?// ===========================================
app.use((req, res, next) => {
  if (!shouldServeFrontendHtml(req)) {
    return next();
  }

  return res.sendFile(frontendIndexPath);
});

registerRoutes(app);

if (serveFrontendDist) {
  if (fs.existsSync(frontendIndexPath)) {
    logger.info('Serving frontend dist from backend process', { frontendDistDir });

    app.use(express.static(frontendDistDir, {
      setHeaders: (res, filePath) => {
        // Debug: disable caching for all static assets to ensure fresh code is loaded
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/sys')
        || req.path.startsWith('/api')
        || req.path.startsWith('/student')
        || req.path.startsWith('/class')
        || req.path.startsWith('/course')
        || req.path.startsWith('/teaching')
        || req.path.startsWith('/homework')
        || req.path.startsWith('/teacher')
        || req.path.startsWith('/classroom')
        || req.path.startsWith('/relation')
        || req.path.startsWith('/learning')
        || req.path.startsWith('/resource')
        || req.path.startsWith('/programming')
        || req.path.startsWith('/uploads')
        || req.path.startsWith('/socket.io')
        || req.path === '/health') {
        return next();
      }

      return res.sendFile(frontendIndexPath);
    });
  } else {
    logger.warn('SERVE_FRONTEND_DIST=true but dist index was not found', { frontendDistDir });
  }
}

// ===========================================
// 错误处理中间�?// ===========================================
// 404错误
app.use(errorHandler.notFound);

// 全局错误处理
app.use(errorHandler.errorHandler);

// ===========================================
// 导出应用
// ===========================================
module.exports = app;









