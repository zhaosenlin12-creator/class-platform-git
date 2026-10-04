/**
 * Backend server entrypoint.
 */

const http = require('http');
const { loadEnvConfig, validateEnvironment } = require('./config/env');

const envState = loadEnvConfig();
const { logger } = require('./middleware/logger');
if (envState.path) {
  logger.info('Environment file resolved', { envPath: envState.path });
}

const envValidation = validateEnvironment();
envValidation.warnings.forEach((message) => logger.warn(message));

if (envValidation.errors.length > 0) {
  envValidation.errors.forEach((message) => logger.error(message));
  process.exit(1);
}

const app = require('./app');
const sequelize = require('./config/database');
const { initSocketServer } = require('./socketServer');

const PORT = parseInt(process.env.PORT, 10) || 8081;
const SOCKET_PORT = parseInt(process.env.SOCKET_PORT, 10) || PORT;
const HOST = process.env.HOST || '0.0.0.0';

let httpServer = null;
let standaloneSocketServer = null;
let shuttingDown = false;

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.removeListener('error', reject);
      resolve();
    });
  });
}

function closeServer(server) {
  if (!server) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    server.close((error) => {
      if (error) {
        logger.warn('Server close callback returned an error', { error: error.message });
      }
      resolve();
    });
  });
}

async function startServer() {
  try {
    logger.info('Connecting to database');
    await Promise.race([
      sequelize.authenticate(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database connection timeout')), 10000);
      })
    ]);

    httpServer = http.createServer(app);

    const headersTimeout = parseInt(process.env.HEADERS_TIMEOUT_MS, 10) || 15000;
    const keepAliveTimeout = parseInt(process.env.KEEP_ALIVE_TIMEOUT_MS, 10) || 65000;
    const requestTimeout = parseInt(process.env.REQUEST_TIMEOUT_MS, 10);
    const maxHeadersCount = parseInt(process.env.MAX_HEADERS_COUNT, 10) || 2000;

    httpServer.headersTimeout = headersTimeout;
    httpServer.keepAliveTimeout = keepAliveTimeout;
    if (!Number.isNaN(requestTimeout)) {
      httpServer.requestTimeout = requestTimeout;
    }
    httpServer.maxHeadersCount = maxHeadersCount;

    await listen(httpServer, PORT, HOST);

    if (SOCKET_PORT === PORT) {
      initSocketServer(httpServer);
    } else {
      standaloneSocketServer = http.createServer();
      await listen(standaloneSocketServer, SOCKET_PORT, HOST);
      initSocketServer(standaloneSocketServer);
    }

    logger.info('Backend service started', {
      host: HOST,
      port: PORT,
      socketPort: SOCKET_PORT,
      env: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    logger.error('Server startup failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info('Shutdown initiated', { signal });

  try {
    await Promise.all([
      closeServer(standaloneSocketServer),
      closeServer(httpServer)
    ]);
    await sequelize.close();
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Shutdown failed', { signal, error: error.message, stack: error.stack });
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack, code: error.code });

  const fatalErrors = new Set(['EADDRINUSE', 'EACCES', 'ENOENT']);
  if (fatalErrors.has(error.code)) {
    process.exit(1);
  }
});

startServer();
