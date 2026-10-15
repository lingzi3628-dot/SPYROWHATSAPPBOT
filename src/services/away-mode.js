/**
 * services/away-mode.js
 * Away mode — when the owner is offline or doesn't want AI replies,
 * the bot tells senders the owner is away and will respond later.
 *
 * Features:
 * - Track owner's last activity (when they last sent a command)
 * - Send a configurable away message to people who message the owner
 * - Throttle: only send once per user per 30 minutes (no spam)
 * - Three modes: 'ai' (AI auto-reply), 'away' (custom away message), 'off' (silent)
 */
import { stmts } from '../database.js';
import logger from '../logger.js';

// In-memory tracking: userId -> { lastActive: timestamp, notifiedUsers: Map<senderJid, timestamp> }
const _tracker = new Map();

// How long after owner's last activity before considering them "offline"
const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

// How often to re-notify the same user (don't spam)
const RE_NOTIFY_MS = 30 * 60 * 1000; // 30 minutes

// ── Owner activity tracking ─────────────────────────────────────
export function recordOwnerActivity(userId) {
  if (!_tracker.has(userId)) {
    _tracker.set(userId, { lastActive: Date.now(), notifiedUsers: new Map() });
  } else {
    _tracker.get(userId).lastActive = Date.now();
  }
}

export function isOwnerOnline(userId) {
  const t = _tracker.get(userId);
  if (!t) return false;
  return (Date.now() - t.lastActive) < OFFLINE_THRESHOLD_MS;
}

export function getLastActive(userId) {
  const t = _tracker.get(userId);
  return t?.lastActive || null;
}

// ── Away mode settings (stored in bot_state per user) ───────────
function _key(userId, suffix) { return `away_${userId}_${suffix}`; }

export function getAwayMode(userId) {
  // Returns: 'ai' | 'away' | 'off'
  const row = stmts.getState.get(_key(userId, 'mode'));
  return row?.value || 'off';
}

export function setAwayMode(userId, mode) {
  const valid = ['ai', 'away', 'off'];
  if (!valid.includes(mode)) throw new Error(`Invalid mode. Use: ${valid.join(', ')}`);
  stmts.setState.run(_key(userId, 'mode'), mode, mode);
  return mode;
}

export function getAwayMessage(userId) {
  const row = stmts.getState.get(_key(userId, 'message'));
  return row?.value || `Hey! 👋 The owner is currently away and can't respond right now. They'll get back to you as soon as they're back online. \n\n— Sent by Spyro Bot 🤖`;
}

export function setAwayMessage(userId, message) {
  const msg = (message || '').slice(0, 2000);
  stmts.setState.run(_key(userId, 'message'), msg, msg);
  return msg;
}

export function isAwayModeEnabled(userId) {
  return getAwayMode(userId) !== 'off';
}

/**
 * Should we send an away message to this sender?
 * Checks: away mode is on, owner is offline, sender hasn't been notified recently.
 */
export function shouldSendAwayMessage(userId, senderJid) {
  const mode = getAwayMode(userId);
  if (mode === 'off') return false;

  // In 'ai' mode, AI handles replies — no away message
  if (mode === 'ai') return false;

  // In 'away' mode, send away message (throttled)
  if (mode === 'away') {
    if (!_tracker.has(userId)) {
      _tracker.set(userId, { lastActive: 0, notifiedUsers: new Map() });
    }
    const t = _tracker.get(userId);
    const lastNotified = t.notifiedUsers.get(senderJid) || 0;
    if (Date.now() - lastNotified < RE_NOTIFY_MS) {
      return false; // already notified this user recently
    }
    t.notifiedUsers.set(senderJid, Date.now());
    return true;
  }

  return false;
}

/**
 * Get the away message to send, with optional personalization.
 */
export function buildAwayMessage(userId, senderName) {
  let msg = getAwayMessage(userId);
  // Replace placeholders
  msg = msg.replace(/\{name\}/g, senderName || 'there');
  msg = msg.replace(/\{time\}/g, new Date().toLocaleTimeString());
  return msg;
}

/**
 * Get a summary of the away mode status for a user.
 */
export function getAwayStatus(userId) {
  const mode = getAwayMode(userId);
  const online = isOwnerOnline(userId);
  const lastActive = getLastActive(userId);
  const message = getAwayMessage(userId);
  return {
    mode,
    isOnline: online,
    lastActive: lastActive ? new Date(lastActive).toISOString() : null,
    lastActiveAgo: lastActive ? _timeAgo(lastActive) : 'never',
    message: message.slice(0, 100) + (message.length > 100 ? '...' : ''),
  };
}

function _timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
