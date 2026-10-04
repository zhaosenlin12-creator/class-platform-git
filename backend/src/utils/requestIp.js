/**
 * Extract the most reliable client IP from an Express request.
 * Honors X-Forwarded-For when behind a trusted proxy.
 */
function getClientIp(req) {
  if (!req) return '';
  const forwarded = req.headers && req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = String(forwarded).split(',')[0].trim();
    if (first) return first;
  }
  return (
    req.ip ||
    (req.connection && req.connection.remoteAddress) ||
    (req.socket && req.socket.remoteAddress) ||
    ''
  );
}

module.exports = {
  getClientIp
};
