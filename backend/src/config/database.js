/**
 * Database connection configuration.
 */

const { Sequelize } = require('sequelize');
const { loadEnvConfig, parseBoolean } = require('./env');

loadEnvConfig();

const { logger } = require('../middleware/logger');

function parseIntegerEnv(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function validatePoolConnection(connection) {
  if (!connection) {
    return false;
  }

  if (connection._fatalError || connection._protocolError || connection._closing) {
    return false;
  }

  if (connection.stream && connection.stream.destroyed) {
    return false;
  }

  return true;
}

const poolMax = parseIntegerEnv(process.env.DB_POOL_MAX, 10);
const poolMin = Math.min(parseIntegerEnv(process.env.DB_POOL_MIN, 0), poolMax);
const poolAcquire = parseIntegerEnv(process.env.DB_POOL_ACQUIRE_MS, 30000);
const poolIdle = parseIntegerEnv(process.env.DB_POOL_IDLE_MS, 10000);
const poolEvict = parseIntegerEnv(process.env.DB_POOL_EVICT_MS, 10000);
const connectTimeout = parseIntegerEnv(process.env.DB_CONNECT_TIMEOUT_MS, 60000);
const keepAliveInitialDelay = parseIntegerEnv(process.env.DB_KEEP_ALIVE_INITIAL_DELAY_MS, 0);
const enableKeepAlive = parseBoolean(process.env.DB_ENABLE_KEEP_ALIVE, true);

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseIntegerEnv(process.env.DB_PORT, 3306),
    dialect: 'mysql',
    timezone: '+08:00',
    pool: {
      max: poolMax,
      min: poolMin,
      acquire: poolAcquire,
      idle: poolIdle,
      evict: poolEvict,
      validate: validatePoolConnection
    },
    retry: {
      max: 5,
      match: [
        /ETIMEDOUT/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /PROTOCOL_CONNECTION_LOST/,
        /PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /SequelizeConnectionAcquireTimeoutError/
      ]
    },
    logging: parseBoolean(process.env.DB_LOGGING, false)
      ? (message) => logger.debug(message, { component: 'sequelize' })
      : false,
    define: {
      timestamps: false,
      freezeTableName: true,
      underscored: false
    },
    dialectOptions: {
      connectTimeout: connectTimeout,
      multipleStatements: parseBoolean(process.env.DB_MULTI_STATEMENTS, false),
      enableKeepAlive: enableKeepAlive,
      keepAliveInitialDelay: keepAliveInitialDelay
    }
  }
);

module.exports = sequelize;
