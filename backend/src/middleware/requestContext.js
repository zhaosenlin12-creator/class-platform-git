const crypto = require('crypto');

const REQUEST_ID_HEADER = 'x-request-id';
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

function generateRequestId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return crypto.randomBytes(16).toString('hex');
}

function normalizeRequestId(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return REQUEST_ID_PATTERN.test(normalized) ? normalized : null;
}

function requestContext(req, res, next) {
  const requestId = normalizeRequestId(req.headers[REQUEST_ID_HEADER]) || generateRequestId();

  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
}

module.exports = {
  requestContext
};
