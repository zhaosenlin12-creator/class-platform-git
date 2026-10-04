/**
 * Simple in-memory login throttling (per IP + username).
 * This is process-local and resets on restart.
 */
const { getClientIp } = require('./requestIp');

const attempts = new Map();

function getConfig() {
  return {
    windowMs: parseInt(process.env.LOGIN_WINDOW_MS, 10) || 15 * 60 * 1000,
    maxAttempts: parseInt(process.env.LOGIN_MAX_ATTEMPTS, 10) || 8,
    blockMs: parseInt(process.env.LOGIN_BLOCK_MS, 10) || 15 * 60 * 1000
  };
}

function getKey(req, username) {
  const ip = getClientIp(req) || 'unknown';
  const name = (username || '').toString().trim().toLowerCase();
  return name ? `${ip}:${name}` : ip;
}

function cleanupExpired(now, windowMs) {
  for (const [key, value] of attempts.entries()) {
    const expiredWindow = value.firstAt && now - value.firstAt > windowMs;
    const blockExpired = value.blockedUntil && now >= value.blockedUntil;
    if ((expiredWindow && !value.blockedUntil) || (expiredWindow && blockExpired)) {
      attempts.delete(key);
    }
  }
}

function checkLoginAllowed(req, username) {
  const { windowMs } = getConfig();
  const now = Date.now();
  cleanupExpired(now, windowMs);

  const key = getKey(req, username);
  const record = attempts.get(key);

  if (record && record.blockedUntil && record.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterMs: record.blockedUntil - now
    };
  }

  return { allowed: true, retryAfterMs: 0 };
}

function recordLoginFailure(req, username) {
  const { windowMs, maxAttempts, blockMs } = getConfig();
  const now = Date.now();
  cleanupExpired(now, windowMs);

  const key = getKey(req, username);
  const record = attempts.get(key) || { count: 0, firstAt: now, blockedUntil: 0 };

  if (!record.firstAt || now - record.firstAt > windowMs) {
    record.firstAt = now;
    record.count = 0;
    record.blockedUntil = 0;
  }

  record.count += 1;

  if (record.count >= maxAttempts) {
    record.blockedUntil = now + blockMs;
  }

  attempts.set(key, record);

  return record;
}

function recordLoginSuccess(req, username) {
  const key = getKey(req, username);
  attempts.delete(key);
}

module.exports = {
  checkLoginAllowed,
  recordLoginFailure,
  recordLoginSuccess
};
