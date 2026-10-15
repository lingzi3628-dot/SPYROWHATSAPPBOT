/**
 * services/bot-mode.js
 * Controls bot access modes:
 * - Global mode (owner-level private/public — affects ALL users)
 * - Per-user mode (each user sets their OWN bot's access)
 * - Ghosted users (silently ignored)
 *
 * Per-user modes:
 *   'public'  — anyone can use the bot (default)
 *   'private' — only the owner can use the bot (others get "bot is private" message)
 *   'custom'  — only whitelisted users can use the bot
 */
import { stmts } from '../database.js';

// ── Global bot mode (owner-level, affects all sessions) ─────────
export function getBotMode() {
  const row = stmts.getState.get('bot_mode');
  return row?.value || 'public';
}

export function setBotMode(mode) {
  const value = mode === 'private' ? 'private' : 'public';
  stmts.setState.run('bot_mode', value, value);
  return value;
}

export function isPrivateMode() {
  return getBotMode() === 'private';
}

// ── Per-user bot access mode ────────────────────────────────────
function _umodeKey(userId) { return `umode_${userId}`; }
function _whitelistKey(userId) { return `whitelist_${userId}`; }

/**
 * Get the per-user bot access mode.
 * Returns: 'public' | 'private' | 'custom'
 */
export function getUserBotMode(userId) {
  const row = stmts.getState.get(_umodeKey(userId));
  return row?.value || 'public';
}

/**
 * Set the per-user bot access mode.
 */
export function setUserBotMode(userId, mode) {
  const valid = ['public', 'private', 'custom'];
  if (!valid.includes(mode)) throw new Error(`Invalid mode. Use: ${valid.join(', ')}`);
  stmts.setState.run(_umodeKey(userId), mode, mode);
  return mode;
}

/**
 * Check if a sender is allowed to use the bot for a specific user's session.
 * @param {string} userId - the bot owner's user ID (web platform user ID)
 * @param {string} senderJid - the JID of the person sending the message
 * @param {string} ownerJid - the bot's own JID (same as owner's number)
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function checkUserBotAccess(userId, senderJid, ownerJid) {
  const mode = getUserBotMode(userId);

  // In WhatsApp multi-device, the owner and bot share the same number.
  // The caller should check m.key.fromMe BEFORE calling this function.
  // If this function is called, it means the message is NOT from the owner.

  if (mode === 'public') {
    return { allowed: true };
  }

  if (mode === 'private') {
    return {
      allowed: false,
      reason: '🔒 This bot is in *Private Mode*.\n\nOnly the owner can use commands right now.\n\n_Please try again later._',
    };
  }

  if (mode === 'custom') {
    const whitelist = getWhitelist(userId);
    if (whitelist.includes(senderJid)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: '🔒 This bot is in *Custom Mode*.\n\nYou are not on the whitelist.\n\n_Ask the owner to add you with .botmode whitelist @you_',
    };
  }

  return { allowed: true };
}

// ── Whitelist management (for custom mode) ──────────────────────
export function getWhitelist(userId) {
  const row = stmts.getState.get(_whitelistKey(userId));
  if (!row?.value) return [];
  return row.value.split(',').filter(Boolean);
}

export function addToWhitelist(userId, jid) {
  const list = getWhitelist(userId);
  if (!list.includes(jid)) {
    list.push(jid);
    stmts.setState.run(_whitelistKey(userId), list.join(','), list.join(','));
  }
  return list;
}

export function removeFromWhitelist(userId, jid) {
  const list = getWhitelist(userId).filter(j => j !== jid);
  stmts.setState.run(_whitelistKey(userId), list.join(','), list.join(','));
  return list;
}

// ── Ghosted users (silently ignored — they don't know) ──────────
// Stored as a comma-separated JID list in bot_state for simplicity.
export function getGhostedUsers() {
  const row = stmts.getState.get('ghosted_users');
  if (!row?.value) return [];
  return row.value.split(',').filter(Boolean);
}

export function isGhosted(jid) {
  const list = getGhostedUsers();
  return list.includes(jid);
}

export function ghostUser(jid) {
  const list = getGhostedUsers();
  if (!list.includes(jid)) {
    list.push(jid);
    stmts.setState.run('ghosted_users', list.join(','), list.join(','));
  }
  return true;
}

export function unghostUser(jid) {
  const list = getGhostedUsers();
  const filtered = list.filter((j) => j !== jid);
  stmts.setState.run('ghosted_users', filtered.join(','), filtered.join(','));
  return list.length !== filtered.length; // true if something was removed
}

// ── Auto-status-react ───────────────────────────────────────────
export function isAutoStatusReact() {
  const row = stmts.getState.get('autostatusreact');
  return row?.value === 'true';
}

export function setAutoStatusReact(on) {
  stmts.setState.run('autostatusreact', on ? 'true' : 'false', on ? 'true' : 'false');
}

export function getStatusReactEmoji() {
  const row = stmts.getState.get('status_react_emoji');
  return row?.value || '👀';
}

export function setStatusReactEmoji(emoji) {
  const e = (emoji || '👀').slice(0, 10);
  stmts.setState.run('status_react_emoji', e, e);
  return e;
}
