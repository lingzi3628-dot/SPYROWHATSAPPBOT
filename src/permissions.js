/**
 * permissions.js
 * Centralized permission checks.
 *
 * Permission hierarchy:
 *   owner > group-admin > bot-admin > everyone
 *
 * The OWNER_JID comes from env. Group admins come from group metadata.
 * The bot itself can be a group admin and may receive admin-level authority.
 */
import config from './config.js';
import { isOwner } from './security.js';
import { isGroupAdmin, isBotAdmin } from './utils/groups.js';
import { isGroup as jidIsGroup, norm } from './utils/jid.js';
import { stmts } from './database.js';

/** Read live maintenance mode (env at startup OR overridden via .maintenance). */
function isMaintenance() {
  try {
    const row = stmts.getState.get('MAINTENANCE_MODE');
    if (row) return row.value === 'true';
  } catch {}
  return config.MAINTENANCE_MODE;
}

/**
 * Resolve a sender's effective permission level for a given chat.
 * @returns {Promise<{ level: 'owner'|'admin'|'user', isGroup:boolean, botIsAdmin:boolean }>}
 */
export async function resolvePermission({ sock, msg }) {
  const chatId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid; // for groups, participant is sender
  const isGroup = jidIsGroup(chatId);
  const botJid = norm(sock.user?.id);

  if (isOwner(norm(sender))) {
    return { level: 'owner', isGroup, botIsAdmin: false };
  }

  if (!isGroup) {
    return { level: 'user', isGroup: false, botIsAdmin: false };
  }

  const [senderIsAdmin, botIsAdmin] = await Promise.all([
    isGroupAdmin(sock, chatId, norm(sender)),
    isBotAdmin(sock, chatId, botJid),
  ]);

  return {
    level: senderIsAdmin ? 'admin' : 'user',
    isGroup: true,
    botIsAdmin,
  };
}

/**
 * Decide whether a command may execute for a given context.
 * Returns { allowed:true } or { allowed:false, reason:'...' }.
 */
export async function authorize({ cmd, ctx }) {
  const { level, isGroup, botIsAdmin } = ctx.perms;

  if (isMaintenance() && level !== 'owner') {
    return { allowed: false, reason: '🚧 Bot is under maintenance. Try again later.' };
  }

  if (cmd.ownerOnly && level !== 'owner') {
    return { allowed: false, reason: '⛔ Owner-only command.' };
  }
  if (cmd.adminOnly && level !== 'admin' && level !== 'owner') {
    return { allowed: false, reason: '⛔ Admin-only command.' };
  }
  if (cmd.groupOnly && !isGroup) {
    return { allowed: false, reason: '⛔ This command only works in groups chats.' };
  }
  if (cmd.privateOnly && isGroup) {
    return { allowed: false, reason: '⛔ This command only works in private chats.' };
  }
  if (cmd.botAdminRequired && !botIsAdmin) {
    return { allowed: false, reason: '⛔ Bot must be an admin in this group.' };
  }
  return { allowed: true };
}
