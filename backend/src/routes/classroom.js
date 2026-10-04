/**
 * Legacy classroom route quarantine.
 *
 * This file is intentionally not mounted by the application. If it ever gets
 * mounted again by mistake, it should fail closed instead of exposing the
 * older route surface.
 */
const express = require('express');
const router = express.Router();
const Response = require('../utils/response');
const { logger } = require('../middleware/logger');

router.use((req, res) => {
  logger.warn('Blocked request to retired legacy classroom route file', {
    method: req.method,
    path: req.originalUrl
  });

  return res.status(410).json(
    Response.error('Legacy classroom route has been retired. Use classroomRoutes.js mounted endpoints instead.', 410)
  );
});

module.exports = router;
