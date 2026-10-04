/**
 * File/path security helpers for uploads.
 *
 * Goals:
 * - Prevent path traversal when converting stored URLs/paths into local filesystem paths
 * - Provide a small, testable surface for file-related validation
 */

const path = require('path');

function stripQueryAndHash(value) {
  if (value === undefined || value === null) return '';
  return String(value).split(/[?#]/)[0];
}

function isRemoteUrl(value) {
  if (!value) return false;
  const s = String(value).trim();
  return s.startsWith('http://') || s.startsWith('https://');
}

/**
 * Extract a safe filename within the uploads directory from a stored URL/path.
 *
 * Accepts:
 * - '/uploads/<name>'
 * - 'uploads/<name>' (legacy)
 * - '<name>'
 *
 * Rejects anything with path separators or '..'.
 */
function getSafeUploadFileName(stored) {
  const raw = stripQueryAndHash(stored).trim();

  if (!raw) {
    throw new Error('文件路径为空');
  }

  let rel = raw;

  if (rel.startsWith('/uploads/')) {
    rel = rel.slice('/uploads/'.length);
  } else if (rel.startsWith('uploads/')) {
    rel = rel.slice('uploads/'.length);
  }

  // Disallow subdirectories and path traversal
  if (!rel || rel.includes('..') || rel.includes('/') || rel.includes('\\') || rel.includes('\0')) {
    throw new Error('文件路径不合法');
  }

  return rel;
}

/**
 * Resolve a path within a base directory, ensuring it cannot escape that directory.
 */
function resolvePathWithinDir(baseDir, fileName) {
  const base = path.resolve(baseDir);
  const target = path.resolve(base, fileName);

  // target must be within base (or exactly base, which should not happen for a file)
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new Error('文件路径不合法');
  }

  return target;
}

module.exports = {
  isRemoteUrl,
  getSafeUploadFileName,
  resolvePathWithinDir
};
