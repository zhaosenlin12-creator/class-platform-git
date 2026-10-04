const DEFAULT_AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'tp_access_token';
const DEFAULT_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
}

function normalizeSameSite(value) {
  const normalized = String(value || 'Lax').trim().toLowerCase();
  if (normalized === 'strict') {
    return 'Strict';
  }
  if (normalized === 'none') {
    return 'None';
  }
  return 'Lax';
}

function getAuthCookieName() {
  return DEFAULT_AUTH_COOKIE_NAME;
}

function parseCookieHeader(rawCookieHeader) {
  const cookieMap = {};
  const cookieHeader = String(rawCookieHeader || '').trim();
  if (!cookieHeader) {
    return cookieMap;
  }

  cookieHeader.split(';').forEach((segment) => {
    const separatorIndex = segment.indexOf('=');
    if (separatorIndex <= 0) {
      return;
    }

    const key = segment.slice(0, separatorIndex).trim();
    const value = segment.slice(separatorIndex + 1).trim();
    if (!key) {
      return;
    }

    try {
      cookieMap[key] = decodeURIComponent(value);
    } catch (_error) {
      cookieMap[key] = value;
    }
  });

  return cookieMap;
}

function extractAuthTokenFromCookieHeader(rawCookieHeader) {
  const cookieMap = parseCookieHeader(rawCookieHeader);
  return cookieMap[getAuthCookieName()] || '';
}

function getAuthCookieOptions() {
  const sameSite = normalizeSameSite(process.env.AUTH_COOKIE_SAMESITE || 'Lax');
  const explicitSecure = process.env.AUTH_COOKIE_SECURE;
  const secure = explicitSecure === undefined
    ? (process.env.NODE_ENV === 'production' || sameSite === 'None')
    : parseBoolean(explicitSecure, false);
  const maxAge = parseInt(process.env.AUTH_COOKIE_MAX_AGE_MS, 10) || DEFAULT_COOKIE_MAX_AGE_MS;
  const domain = String(process.env.AUTH_COOKIE_DOMAIN || '').trim();

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: process.env.AUTH_COOKIE_PATH || '/',
    maxAge,
    domain: domain || undefined
  };
}

function setAuthTokenCookie(res, token) {
  if (!res || typeof res.cookie !== 'function' || !token) {
    return;
  }

  res.cookie(getAuthCookieName(), token, getAuthCookieOptions());
}

function clearAuthTokenCookie(res) {
  if (!res || typeof res.clearCookie !== 'function') {
    return;
  }

  const options = getAuthCookieOptions();
  delete options.maxAge;

  res.clearCookie(getAuthCookieName(), options);
}

module.exports = {
  getAuthCookieName,
  getAuthCookieOptions,
  parseCookieHeader,
  extractAuthTokenFromCookieHeader,
  setAuthTokenCookie,
  clearAuthTokenCookie
};
