/**
 * Avatar utilities.
 * Use inline SVG avatars so production does not depend on external services.
 */

const BACKGROUND_GRADIENTS = [
  ['#2563eb', '#5ac8fa'],
  ['#0f766e', '#38b2ac'],
  ['#9333ea', '#c084fc'],
  ['#dc2626', '#fb7185'],
  ['#ea580c', '#fbbf24'],
  ['#4f46e5', '#818cf8'],
  ['#0891b2', '#67e8f9'],
  ['#3f6212', '#84cc16']
];

function hashSeed(seed) {
  const normalized = String(seed || 'user');
  let hash = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function deriveAvatarLabel(seed) {
  const normalized = String(seed || 'U').trim();
  const chineseChars = normalized.match(/[\u4e00-\u9fff]/g);

  if (Array.isArray(chineseChars) && chineseChars.length > 0) {
    return chineseChars.slice(-2).join('');
  }

  const latinParts = normalized
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (latinParts.length >= 2) {
    return latinParts.slice(0, 2).map((item) => item.charAt(0)).join('').toUpperCase();
  }

  const compact = normalized.replace(/[\s_-]+/g, '').toUpperCase();
  return (compact || 'U').slice(0, 2);
}

function buildAvatarDataUrl(seed) {
  const hash = hashSeed(seed);
  const [startColor, endColor] = BACKGROUND_GRADIENTS[hash % BACKGROUND_GRADIENTS.length];
  const label = deriveAvatarLabel(seed);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="${escapeXml(label)}">
      <defs>
        <linearGradient id="avatar-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${startColor}" />
          <stop offset="100%" stop-color="${endColor}" />
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="48" fill="url(#avatar-gradient)" />
      <circle cx="28" cy="24" r="11" fill="rgba(255,255,255,0.14)" />
      <circle cx="72" cy="24" r="7" fill="rgba(255,255,255,0.22)" />
      <circle cx="48" cy="48" r="38" fill="rgba(255,255,255,0.08)" />
      <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="30" font-weight="700" letter-spacing="1">${escapeXml(label)}</text>
    </svg>
  `.replace(/\s+/g, ' ').trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function isDiceBearUrl(value) {
  return /^https?:\/\/api\.dicebear\.com\//i.test(String(value || '').trim());
}

function generateAvatarUrl(seed) {
  return buildAvatarDataUrl(seed);
}

function generateSimpleAvatarUrl(seed) {
  return buildAvatarDataUrl(seed);
}

function normalizeAvatarUrl(avatarUrl, seed) {
  const normalizedUrl = String(avatarUrl || '').trim();

  if (!normalizedUrl || isDiceBearUrl(normalizedUrl)) {
    return buildAvatarDataUrl(seed);
  }

  return normalizedUrl;
}

function getAvatarStyles() {
  return ['inline-svg'];
}

module.exports = {
  generateAvatarUrl,
  generateSimpleAvatarUrl,
  normalizeAvatarUrl,
  getAvatarStyles,
  AVATAR_STYLES: ['inline-svg'],
  BACKGROUND_GRADIENTS
};
