const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

let loaded = false;

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return ['true', '1', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function resolveEnvPath() {
  const explicitEnvFile = String(process.env.ENV_FILE || '').trim();
  if (explicitEnvFile) {
    return path.isAbsolute(explicitEnvFile)
      ? explicitEnvFile
      : path.resolve(__dirname, '../../', explicitEnvFile);
  }

  const localEnvPath = path.resolve(__dirname, '../../.env.local');
  const defaultEnvPath = path.resolve(__dirname, '../../.env');
  const productionEnvPath = path.resolve(__dirname, '../../.env.production');

  if (process.env.NODE_ENV === 'production' && fs.existsSync(productionEnvPath)) {
    return productionEnvPath;
  }

  if (process.env.NODE_ENV !== 'production' && fs.existsSync(localEnvPath)) {
    return localEnvPath;
  }

  if (fs.existsSync(defaultEnvPath)) {
    return defaultEnvPath;
  }

  return null;
}

function loadEnvConfig() {
  if (loaded) {
    return { path: null, loaded: true };
  }

  loaded = true;
  const envPath = resolveEnvPath();

  if (!envPath || !fs.existsSync(envPath)) {
    return { path: envPath, loaded: false };
  }

  dotenv.config({ path: envPath });
  return { path: envPath, loaded: true };
}

function validateEnvironment() {
  const isProduction = process.env.NODE_ENV === 'production';
  const warnings = [];
  const errors = [];

  const requiredVars = isProduction
    ? ['DB_NAME', 'DB_USER', 'JWT_SECRET']
    : [];

  requiredVars.forEach((key) => {
    const value = process.env[key];
    if (value === undefined || value === null || String(value).trim() === '') {
      errors.push(`Missing required environment variable: ${key}`);
    }
  });

  const numericVars = [
    'PORT',
    'SOCKET_PORT',
    'DB_PORT',
    'RATE_LIMIT_WINDOW_MS',
    'RATE_LIMIT_MAX_REQUESTS',
    'HEADERS_TIMEOUT_MS',
    'KEEP_ALIVE_TIMEOUT_MS',
    'REQUEST_TIMEOUT_MS',
    'MAX_HEADERS_COUNT',
    'REQUEST_BODY_LIMIT_MB',
    'UPLOAD_FILE_SIZE_LIMIT_MB'
  ];

  numericVars.forEach((key) => {
    const value = process.env[key];
    if (value === undefined || value === null || String(value).trim() === '') {
      return;
    }

    const normalized = Number(value);
    if (!Number.isFinite(normalized) || normalized < 0) {
      errors.push(`Environment variable ${key} must be a non-negative number`);
    }
  });

  if (isProduction && parseBoolean(process.env.SKIP_CAPTCHA, false)) {
    warnings.push('SKIP_CAPTCHA=true is ignored in production');
  }

  if (isProduction && parseBoolean(process.env.SKIP_RATE_LIMIT, false)) {
    warnings.push('SKIP_RATE_LIMIT=true is ignored in production');
  }

  if (isProduction && !String(process.env.CORS_ORIGIN || '').trim()) {
    warnings.push('CORS_ORIGIN is not set; cross-origin access may be rejected in production');
  }

  if (isProduction && !String(process.env.AUTH_COOKIE_DOMAIN || '').trim()) {
    warnings.push('AUTH_COOKIE_DOMAIN is not set; verify cookie behavior matches your deployment domain');
  }

  if (isProduction && !String(process.env.PUBLIC_BASE_URL || process.env.APP_PUBLIC_BASE_URL || '').trim()) {
    warnings.push('PUBLIC_BASE_URL is not set; external share links will rely on forwarded host headers');
  }

  if (parseBoolean(process.env.DB_MULTI_STATEMENTS, false)) {
    warnings.push('DB_MULTI_STATEMENTS=true reduces SQL-injection blast-radius protection and should stay disabled unless required');
  }

  return { errors, warnings };
}

module.exports = {
  loadEnvConfig,
  validateEnvironment,
  parseBoolean
};
