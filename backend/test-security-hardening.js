/*
 * Lightweight security regression checks.
 *
 * Run:
 *   node test-security-hardening.js
 */

const assert = require('assert');
const path = require('path');

const {
  isRemoteUrl,
  getSafeUploadFileName,
  resolvePathWithinDir
} = require('./src/utils/fileSecurity');

function shouldThrow(fn, msg) {
  let threw = false;
  try {
    fn();
  } catch (e) {
    threw = true;
  }
  assert.strictEqual(threw, true, msg);
}

// isRemoteUrl
assert.strictEqual(isRemoteUrl('https://example.com/a'), true);
assert.strictEqual(isRemoteUrl('http://example.com/a'), true);
assert.strictEqual(isRemoteUrl('/uploads/a.txt'), false);

// getSafeUploadFileName
assert.strictEqual(getSafeUploadFileName('/uploads/a.txt'), 'a.txt');
assert.strictEqual(getSafeUploadFileName('uploads/a.txt'), 'a.txt');
assert.strictEqual(getSafeUploadFileName('a.txt'), 'a.txt');

shouldThrow(() => getSafeUploadFileName('/uploads/../etc/passwd'), 'Should reject traversal');
shouldThrow(() => getSafeUploadFileName('/uploads/a/b.txt'), 'Should reject subdirectories');
shouldThrow(() => getSafeUploadFileName('..\\evil'), 'Should reject backslash traversal');

// resolvePathWithinDir
{
  const base = path.join(process.cwd(), 'tmp', 'uploads');
  const resolved = resolvePathWithinDir(base, 'file.txt');
  assert.strictEqual(resolved, path.resolve(base, 'file.txt'));

  shouldThrow(
    () => resolvePathWithinDir(base, ['..', 'evil.txt'].join(path.sep)),
    'Should reject escape'
  );
}

console.log('✅ security hardening checks passed');
