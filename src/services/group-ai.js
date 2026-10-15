/**
 * services/group-ai.js
 * Per-group AI toggle — controls whether the bot auto-replies in groups.
 *
 * In groups, the bot should NOT reply to every message (too spammy).
 * Instead:
 * - Group admins can enable AI with .aigroup on
 * - When enabled, bot replies to messages that mention the bot OR reply to the bot
 * - When disabled (default), bot stays silent in groups (only commands work)
 */
import { stmts } from '../database.js';

function _key(groupJid) { return `groupai_${groupJid}`; }

export function isGroupAiEnabled(groupJid) {
  const row = stmts.getState.get(_key(groupJid));
  return row?.value === 'true';
}

export function setGroupAi(groupJid, enabled) {
  stmts.setState.run(_key(groupJid), enabled ? 'true' : 'false', enabled ? 'true' : 'false');
}

/**
 * Should the bot AI-reply to this message in a group?
 * - Group AI must be enabled
 * - The message must either mention the bot OR reply to the bot
 *   (prevents the bot from replying to every single message)
 */
export function shouldGroupAiReply(msg, botJid, groupJid) {
  if (!isGroupAiEnabled(groupJid)) return false;

  // Check if the bot is mentioned
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (ctx?.mentionedJid?.some(j => j === botJid)) return true;

  // Check if this is a reply to the bot's message
  if (ctx?.participant === botJid || ctx?.quotedMessage) {
    // If replying to bot's message, allow AI reply
    if (ctx?.stanzaId && ctx?.participant === botJid) return true;
  }

  return false;
}
