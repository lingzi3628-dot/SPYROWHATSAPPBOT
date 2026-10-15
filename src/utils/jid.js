/**
 * utils/jid.js
 * WhatsApp JID helpers, thin wrappers around Baileys primitives.
 */
import {
  jidDecode,
  jidNormalizedUser,
  isJidGroup,
  isJidBroadcast,
  isJidStatusBroadcast,
  isJidBot,
  isJidNewsletter,
  isLidUser,
} from '@whiskeysockets/baileys';

/** Normalize any jid-like string into a canonical form. */
export function norm(jid) {
  if (!jid) return '';
  return jidNormalizedUser(jid) || jid;
}

/** Decode a jid into its parts. */
export function decode(jid) {
  return jidDecode(jid) || null;
}

/** Get the bare phone number portion (no domain). */
export function phoneNumber(jid) {
  const d = decode(jid);
  return d?.user ?? '';
}

/** Pretty display: +254700000000 */
export function pretty(jid) {
  const n = phoneNumber(jid);
  return n ? `+${n}` : jid;
}

/** True if jid is a group chat. */
export function isGroup(jid) {
  return isJidGroup(jid);
}

/** True if jid is a broadcast list (status or broadcast). */
export function isBroadcast(jid) {
  return isJidBroadcast(jid) || isJidStatusBroadcast(jid);
}

/** True if jid is a newsletter. */
export function isNewsletter(jid) {
  return isJidNewsletter(jid);
}

/** True if jid is a lid user (whisper-style). */
export function isLid(jid) {
  return isLidUser(jid);
}

/** True if jid is the official WhatsApp bot. */
export function isBot(jid) {
  return isJidBot(jid);
}

/** Convert a phone number (digits) into a WhatsApp user JID. */
export function phoneToJid(phone) {
  const clean = String(phone).replace(/[^\d]/g, '');
  return `${clean}@s.whatsapp.net`;
}

/** True if two jids belong to the same user (ignoring device). */
export function sameUser(a, b) {
  if (!a || !b) return false;
  const strip = (j) => String(j).replace(/:\d+$/, '').split('@')[0];
  return strip(a) === strip(b);
}

/** Return the chat part (without participant) — for groups, the chat is the group jid. */
export function chatOf(jid) {
  return norm(jid);
}

/**
 * Extract mentioned JIDs from a message object.
 */
export function extractedMentions(message) {
  const out = new Set();
  const ctx = message?.message?.extendedTextMessage?.contextInfo;
  if (Array.isArray(ctx?.mentionedJid)) {
    for (const j of ctx.mentionedJid) out.add(norm(j));
  }
  // also quoted participant
  if (ctx?.participant) out.add(norm(ctx.participant));
  return [...out];
}

/** Validate that a JID is well-formed. */
export function isValidJid(jid) {
  return /^.+@(s\.whatsapp\.net|g\.us|broadcast|lid)$/.test(jid || '');
}
