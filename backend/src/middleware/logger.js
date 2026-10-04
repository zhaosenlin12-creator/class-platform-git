/**
 * 日志中间件
 */

const morgan = require('morgan');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const util = require('util');

function formatMeta(meta) {
  const entries = Object.entries(meta).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return '';
  }

  const normalizedMeta = Object.fromEntries(entries);

  try {
    return ` ${JSON.stringify(normalizedMeta)}`;
  } catch (error) {
    return ` ${util.inspect(normalizedMeta, { depth: 4, breakLength: Infinity })}`;
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${stack || message}${formatMeta(meta)}`;
    })
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(process.env.LOG_DIR || './logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d'
    }),
    new DailyRotateFile({
      filename: path.join(process.env.LOG_DIR || './logs', 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '14d'
    })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

morgan.token('request-id', (req) => req.requestId || '-');

const morganMiddleware = morgan(':request-id :method :url :status :res[content-length] - :response-time ms', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
});

module.exports = { logger, morganMiddleware };
