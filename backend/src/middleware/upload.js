/**
 * 文件上传中间件
 * 增强版 - 支持友好的错误提示
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uuidUtil = require('../utils/uuid');

// 文件大小限制配置（可通过环境变量调整）
const limitMb = parseInt(process.env.UPLOAD_FILE_SIZE_LIMIT_MB, 10) || 100;
const FILE_SIZE_LIMIT = limitMb * 1024 * 1024;
const FILE_SIZE_LIMIT_TEXT = `${limitMb}MB`;

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳_UUID_原始文件名
    // 使用Buffer确保中文文件名正确编码
    const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const uniqueSuffix = Date.now() + '_' + uuidUtil.generate();
    const ext = path.extname(originalname);
    const basename = path.basename(originalname, ext);
    cb(null, `${basename}_${uniqueSuffix}${ext}`);
  }
});

// 文件过滤
const fileFilter = (req, file, cb) => {
  // 某些浏览器/客户端会出现中文文件名编码问题，这里尽量做兼容
  let originalName = file.originalname;
  try {
    originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
  } catch (e) {
    // ignore
  }

  const ext = path.extname(originalName).toLowerCase();

  // 1) 显式拒绝高风险类型（防止上传后被当作脚本执行 / 站内XSS）
  const dangerousExts = new Set([
    // Web脚本/可执行内容
    '.html', '.htm', '.js', '.mjs', '.css', '.svg',
    // 常见WebShell/脚本
    '.php', '.phtml', '.phar', '.jsp', '.jspx', '.asp', '.aspx', '.cgi', '.pl',
    // 系统脚本/可执行文件
    '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd', '.com', '.exe', '.dll', '.so'
  ]);

  if (dangerousExts.has(ext)) {
    cb(new Error('不允许上传该文件类型，请更换文件格式或压缩后再上传'), false);
    return;
  }

  // 2) 按扩展名允许（用于处理 application/octet-stream 等不可靠的 mimetype）
  const allowedExts = new Set([
    // 图片
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    // 文档
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
    // 视频/音频
    '.mp4', '.mpeg', '.webm', '.mov', '.mp3', '.wav', '.ogg',
    // 压缩包
    '.zip', '.rar', '.7z', '.tar', '.gz', '.tgz',
    // Scratch
    '.sb3', '.sb2',
    // 代码/数据文件（仅作为下载/存储，不作为站内页面渲染）
    '.py', '.json'
  ]);

  if (allowedExts.has(ext)) {
    cb(null, true);
    return;
  }

  // 3) 按MIME允许（补充一些无扩展名或扩展名不常见的情况）
  const allowedMimeTypes = new Set([
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'video/mp4', 'video/mpeg', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3',
    'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed',
    'application/x-7z-compressed', 'application/x-tar', 'application/gzip',
    'application/json',
    'text/x-python'
  ]);

  if (allowedMimeTypes.has(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error('不支持的文件格式，请上传图片、文档、视频、音频、压缩包或Scratch作品'), false);
};

// 创建上传实例
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: FILE_SIZE_LIMIT
  }
});

/**
 * 上传错误处理中间件
 * 将 multer 错误转换为友好的用户提示
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer 错误
    let message = '文件上传失败';
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = `文件大小超过限制（最大${FILE_SIZE_LIMIT_TEXT}），请压缩文件后重新上传`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = '上传文件数量超过限制';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = '上传字段名称不正确';
        break;
      case 'LIMIT_PART_COUNT':
        message = '上传的表单字段过多';
        break;
      case 'LIMIT_FIELD_KEY':
        message = '字段名称过长';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = '字段值过长';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = '字段数量过多';
        break;
      default:
        message = `上传错误: ${err.message}`;
    }
    
    return res.status(400).json({
      success: false,
      code: 400,
      message: message
    });
  } else if (err) {
    // 其他错误（如文件类型不支持）
    let message = err.message || '文件上传失败';
    
    // 处理文件类型错误
    if (message.includes('不支持的文件类型')) {
      message = `${message}。请上传支持的文件格式（图片、文档、视频、音频、压缩包等）`;
    }
    
    return res.status(400).json({
      success: false,
      code: 400,
      message: message
    });
  }
  
  next();
};

/**
 * 创建带错误处理的上传中间件
 */
const createUploadMiddleware = (uploadFn) => {
  return (req, res, next) => {
    uploadFn(req, res, (err) => {
      if (err) {
        return handleUploadError(err, req, res, next);
      }
      next();
    });
  };
};

module.exports = {
  upload,
  uploadDir,
  handleUploadError,
  createUploadMiddleware,
  FILE_SIZE_LIMIT,
  FILE_SIZE_LIMIT_TEXT
};

