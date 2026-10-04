/**
 * 全局错误处理中间件
 * 增强特性: 支持更多错误类型和更好的恢复能力
 */

const Response = require('../utils/response');
const { logger } = require('./logger');

function getRequestLogContext(req) {
  return {
    requestId: req.requestId || 'unknown',
    method: req.method,
    path: req.originalUrl,
    ip: req.ip
  };
}

/**
 * 解析唯一约束错误，返回友好提示
 */
function parseUniqueConstraintError(err) {
  const fields = err.fields || {};
  const fieldNames = Object.keys(fields);

  const fieldNameMap = {
    username: '账号',
    student_no: '学号',
    phone: '手机号',
    email: '邮箱',
    name: '名称',
    code: '编码',
    title: '标题'
  };

  if (fieldNames.length > 0) {
    const friendlyNames = fieldNames.map(field => fieldNameMap[field] || field);
    const values = fieldNames.map(field => fields[field]).filter(Boolean);

    if (values.length > 0) {
      return `${friendlyNames.join('、')}「${values.join('、')}」已存在，请使用其他${friendlyNames.join('/')}`;
    }

    return `${friendlyNames.join('、')}已存在，请更换后重试`;
  }

  const message = err.message || '';
  if (message.includes('username')) {
    return '该账号已被使用，请更换一个账号名称';
  }
  if (message.includes('student_no')) {
    return '该学号已存在，请检查学号是否正确';
  }
  if (message.includes('phone')) {
    return '该手机号已被注册，请使用其他手机号';
  }
  if (message.includes('email')) {
    return '该邮箱已被注册，请使用其他邮箱';
  }

  return '数据已存在，请检查是否有重复的信息';
}

/**
 * 解析文件上传错误
 */
function parseUploadError(err) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    const maxSize = err.limit ? `${Math.round(err.limit / 1024 / 1024)}MB` : '50MB';
    return `文件大小超过限制（最大${maxSize}），请压缩文件后重新上传`;
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return '上传文件数量超过限制，请减少文件数量';
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return '不支持的文件类型，请检查文件格式';
  }

  return null;
}

/**
 * 404 错误处理
 */
exports.notFound = (req, res, next) => {
  logger.warn('404 Not Found', getRequestLogContext(req));
  res.status(404).json(Response.error('接口不存在', 404));
};

/**
 * 全局错误处理
 */
exports.errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  logger.error('Unhandled request error', {
    ...getRequestLogContext(req),
    errorMessage: err.message,
    errorName: err.name,
    stack: err.stack,
    isProduction
  });

  const uploadError = parseUploadError(err);
  if (uploadError) {
    return res.status(400).json(Response.error(uploadError, 400));
  }

  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors ? err.errors.map(item => item.message).join('; ') : err.message;
    return res.status(400).json(Response.error(`数据验证失败: ${messages}`, 400));
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    const friendlyMessage = parseUniqueConstraintError(err);
    return res.status(400).json(Response.error(friendlyMessage, 400));
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json(Response.error('操作失败：该数据被其他数据引用，无法删除或修改', 400));
  }

  if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
    logger.error('Database connection error', getRequestLogContext(req));
    return res.status(503).json(Response.error('数据库连接失败，请稍后重试', 503));
  }

  if (err.name === 'SequelizeTimeoutError' || err.name === 'SequelizeConnectionAcquireTimeoutError') {
    logger.error('Database timeout error', getRequestLogContext(req));
    return res.status(503).json(Response.error('服务器繁忙，请稍后重试', 503));
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(Response.error('登录凭证无效，请重新登录', 401));
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(Response.error('登录已过期，请重新登录', 401));
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(Response.error('请求数据格式错误，请检查输入', 400));
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json(Response.error('请求数据过大，请减少数据量或压缩文件', 413));
  }

  const userFriendlyMessage = isProduction
    ? '操作失败，请稍后重试。如问题持续存在，请联系管理员'
    : `操作失败: ${err.message}`;

  res.status(500).json(Response.error(userFriendlyMessage, 500));
};
