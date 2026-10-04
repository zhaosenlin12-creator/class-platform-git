const jwt = require('jsonwebtoken');

function getExternalResourceSecret() {
  const secret = process.env.RESOURCE_EXTERNAL_ACCESS_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RESOURCE_EXTERNAL_ACCESS_SECRET or JWT_SECRET is required in production');
    }
    return 'dev-insecure-resource-access-secret';
  }

  return secret;
}

function generateExternalResourceToken(payload, expiresIn = '10m') {
  return jwt.sign(payload, getExternalResourceSecret(), { expiresIn });
}

function verifyExternalResourceToken(token) {
  return jwt.verify(token, getExternalResourceSecret());
}

module.exports = {
  generateExternalResourceToken,
  verifyExternalResourceToken
};
