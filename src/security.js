/**
 * security.js
 * - Input validation
 * - Path-traversal / shell-injection guards
 * - Secret redaction helpers
 * - Safe argument parsing for filenames / numbers / urls
 */
import config from './config.js';

// Re-export text helpers commonly used alongside security checks.
export { sanitize, slugify, truncate } from './utils/text.js';

/** True if the string contains shell metacharacters that we don't want to pass through. */
export function looksLikeShellInjection(s = '') {
  return /[;`$|&<>\n\r]/.test(String(s)) || /\$\(|`|&&|\|\|/.test(String(s));
}

/** True if a path attempts to escape its base directory. */
export function isPathTraversal(s = '') {
  return /(\.\.|\/\/|\\|\0)/.test(String(s));
}

/** Validate that an argument is a phone number (digits, optional +). */
export function isValidPhoneNumber(s = '') {
  return /^\+?\d{6,15}$/.test(String(s).trim());
}

/** Validate URL with http/https only. */
export function isSafeHttpUrl(s = '') {
  try {
    const u = new URL(String(s));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Clamp a number to a safe integer range. */
export function clampInt(n, min, max, def = min) {
  const v = Number(n);
  if (!Number.isFinite(v)) return def;
  return Math.max(min, Math.min(max, Math.trunc(v)));
}

/** Truncate a string for safety. */
export function capLen(s = '', max = 4000) {
  return String(s).slice(0, max);
}

/**
 * Sanitize a user-supplied filename.
 * Returns a safe basename (no paths, no shell chars, max 64 chars).
 */
export function safeFileName(s = '') {
  const base = String(s)
    .replace(/[\\\/]/g, '')
    .replace(/\.\./g, '')
    .replace(/[;`$|&<>\s]/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 64);
  return base || `file-${Date.now()}`;
}

/** Redact any string that looks like an API key (long base64 / hex). */
export function redactSecrets(s = '') {
  return String(s)
    .replace(/(sk-[A-Za-z0-9_-]{16,})/g, 'sk-[REDACTED]')
    .replace(/([A-Za-z0-9_-]{32,})/g, (m) => (m.length > 40 ? m.slice(0, 6) + '…[REDACTED]' : m));
}

/** Verify a JID matches the configured owner (server-side). */
export function isOwner(jid) {
  if (!config.OWNER_JID) return false;
  return jid === config.OWNER_JID;
}

/** Limit how many @mentions a single message can contain (anti-abuse). */
export function capMentions(jids = [], max = 200) {
  return jids.slice(0, max);
}

/** True if string contains common WhatsApp invite-link patterns. */
export function containsInviteLink(s = '') {
  return /https?:\/\/(?:www\.)?(?:chat\.)?whatsapp\.com\/(?:invite|g\/|channel\/)?[A-Za-z0-9_-]+/i.test(String(s));
}

/** True if string contains a generic URL. */
export function containsUrl(s = '') {
  return /https?:\/\/[^\s<>"']+/i.test(String(s));
}

/** Extract URLs from a string. */
export function extractUrls(s = '') {
  const out = [];
  const re = /https?:\/\/[^\s<>"']+/gi;
  let m;
  while ((m = re.exec(String(s)))) out.push(m[0]);
  return out;
}

/** Detect common bad words. Caller configures list at runtime. */
const DEFAULT_BADWORDS = ['fuck', 'shit', 'bitch', 'asshole', 'dick', 'cunt', 'nigger', 'faggot'];
export function containsBadWord(s = '', list = DEFAULT_BADWORDS) {
  const lc = String(s).toLowerCase();
  return list.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(lc));
}
