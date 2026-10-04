#!/usr/bin/env node

const mysql = require('mysql2/promise');

function parseIntegerEnv(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function main() {
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseIntegerEnv(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
    connectTimeout: parseIntegerEnv(process.env.DB_CONNECT_TIMEOUT_MS, 5000),
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  };

  console.log('[db-runtime-check] target=', JSON.stringify({
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database
  }));

  let connection;
  try {
    connection = await mysql.createConnection(config);
    const [rows] = await connection.query('SELECT 1 AS ok');
    console.log('[db-runtime-check] ping=ok result=', JSON.stringify(rows && rows[0] ? rows[0] : {}));
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('[db-runtime-check] ping=failed code=%s message=%s', error.code || 'UNKNOWN', error.message);
    if (connection) {
      try {
        await connection.end();
      } catch (_error) {
        // Ignore cleanup error in diagnosis path.
      }
    }
    process.exit(2);
  }
}

main();
