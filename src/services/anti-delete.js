/**
 * services/anti-delete.js
 * Caches recent messages so they can be recovered when deleted.
 *
 * When WhatsApp fires `messages.update` with a delete marker, we look up
 * the original message in our cache and store it in the database. The
 * `.getdeleted` command then shows what was deleted.
 *
 * Optionally, if `antidelete` is ON for a chat, the bot immediately
 * re-posts the deleted message to that chat.
 */
import { db, stmts } from '../database.js';
import logger from '../logger.js';

// In-memory ring buffer of recent messages (per chat)
// { chatJid: [{ id, sender, text, type, hasMedia, ts }] }
const MAX_PER_CHAT = 100;
const _cache = new Map();

/**
 * Cache a message for potential later recovery.
 * Called on every incoming message.
 */
export function cacheMessage(msg) {
  if (!msg?.key?.id || !msg?.key?.remoteJid) return;
  const chatJid = msg.key.remoteJid;
  const id = msg.key.id;
  const sender = msg.key.participant || msg.key.remoteJid;

  // Extract text
  let text = '';
  let type = 'unknown';
  let hasMedia = false;
  const m = msg.message;
  if (m) {
    if (m.conversation) { text = m.conversation; type = 'text'; }
    else if (m.extendedTextMessage?.text) { text = m.extendedTextMessage.text; type = 'text'; }
    else if (m.imageMessage) { text = m.imageMessage.caption || ''; type = 'image'; hasMedia = true; }
    else if (m.videoMessage) { text = m.videoMessage.caption || ''; type = 'video'; hasMedia = true; }
    else if (m.audioMessage) { type = 'audio'; hasMedia = true; }
    else if (m.stickerMessage) { type = 'sticker'; hasMedia = true; }
    else if (m.documentMessage) { text = m.documentMessage.fileName || ''; type = 'document'; hasMedia = true; }
    else { type = Object.keys(m)[0] || 'unknown'; }
  }

  const arr = _cache.get(chatJid) || [];
  // Remove any existing entry with the same ID
  const filtered = arr.filter((x) => x.id !== id);
  filtered.unshift({ id, sender, text, type, hasMedia, ts: Date.now() });
  // Trim to MAX_PER_CHAT
  if (filtered.length > MAX_PER_CHAT) filtered.length = MAX_PER_CHAT;
  _cache.set(chatJid, filtered);
}

/**
 * Look up a cached message by ID and chat JID.
 */
export function getCachedMessage(chatJid, messageId) {
  const arr = _cache.get(chatJid);
  if (!arr) return null;
  return arr.find((x) => x.id === messageId) || null;
}

/**
 * Handle a delete event — store the deleted message in the database.
 * Returns the cached message info, or null if not cached.
 */
export function handleDelete(chatJid, messageId) {
  const cached = getCachedMessage(chatJid, messageId);
  if (!cached) {
    logger.debug({ chatJid, messageId }, 'anti-delete: message not in cache');
    return null;
  }
  try {
    stmts.saveDeleted.run(
      chatJid,
      cached.sender,
      messageId,
      cached.text || '',
      cached.type,
      cached.hasMedia ? 1 : 0,
    );
    logger.info({ chatJid, sender: cached.sender, type: cached.type }, 'anti-delete: recovered deleted message');
    return cached;
  } catch (err) {
    logger.warn({ err }, 'anti-delete: failed to save');
    return null;
  }
}

/**
 * Get recent deleted messages for a chat.
 */
export function getDeletedMessages(chatJid, limit = 10) {
  return stmts.getDeleted.all(chatJid, limit);
}

/**
 * Clear deleted message history for a chat.
 */
export function clearDeletedMessages(chatJid) {
  stmts.clearDeleted.run(chatJid);
}

/**
 * Is anti-delete auto-repost enabled for a chat?
 * (Stored as a global setting: antidelete_repost_<chatJid> = 'true'/'false')
 */
export function isAutoRepostEnabled(chatJid) {
  const row = stmts.getState.get(`antidelete_repost_${chatJid}`);
  return row?.value === 'true';
}

export function setAutoRepost(chatJid, enabled) {
  const key = `antidelete_repost_${chatJid}`;
  const value = enabled ? 'true' : 'false';
  stmts.setState.run(key, value, value);
}
