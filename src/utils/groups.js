/**
 * utils/groups.js
 * Group-related helpers — admins lookup, participant checks, group metadata cache.
 */
import logger from '../logger.js';

/**
 * Get all admin JIDs from group metadata.
 * @param {import('@whiskeysockets/baileys').WASocket} sock
 * @param {string} groupJid
 * @returns {Promise<string[]>}
 */
export async function getGroupAdmins(sock, groupJid) {
  try {
    const meta = await sock.groupMetadata(groupJid);
    return (meta.participants || [])
      .filter((p) => p.admin && p.admin !== 'member')
      .map((p) => p.id);
  } catch (err) {
    logger.warn({ err, groupJid }, 'failed to fetch group metadata');
    return [];
  }
}

/** Get full group metadata with graceful fallback. */
export async function getGroupMetadata(sock, groupJid) {
  try {
    return await sock.groupMetadata(groupJid);
  } catch (err) {
    logger.warn({ err, groupJid }, 'failed to fetch group metadata');
    return null;
  }
}

/** Is the given participant an admin in the group? */
export async function isGroupAdmin(sock, groupJid, participantJid) {
  const admins = await getGroupAdmins(sock, groupJid);
  return admins.includes(participantJid);
}

/** Is the bot an admin in the group? */
export async function isBotAdmin(sock, groupJid, botJid) {
  const admins = await getGroupAdmins(sock, groupJid);
  return admins.includes(botJid);
}

/** Get all participant JIDs of a group. */
export async function getGroupParticipants(sock, groupJid) {
  const meta = await getGroupMetadata(sock, groupJid);
  return meta ? meta.participants.map((p) => p.id) : [];
}

/** Format a participant list as a count + first-N preview. */
export function summarizeParticipants(ids, previewCount = 10) {
  const total = ids.length;
  const preview = ids.slice(0, previewCount).map((j) => '@' + j.split('@')[0]).join(', ');
  return { total, preview };
}
