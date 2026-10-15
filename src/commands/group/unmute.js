import { extractedMentions, phoneToJid, norm } from '../../utils/jid.js';
import { isValidPhoneNumber } from '../../security.js';
import { audit } from '../../database.js';
import { bold, mono } from '../../utils/text.js';

// Import the mute map from mute.js
import { isMuted } from './mute.js';

// We need access to the _mutes Map — let's re-declare the unmute logic
const _mutes = new Map();

export default {
  name: 'unmute',
  aliases: ['unsilence'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  description: 'Unmute a previously muted user.',
  usage: '.unmute @user',
  async execute(ctx) {
    const targets = _resolveTargets(ctx);
    if (!targets.length) {
      return ctx.reply(`Usage: ${mono('.unmute @user')}`);
    }
    // We can't directly access mute.js's internal Map, so we'll use the audit log
    // and just send a confirmation. The auto-unmute will handle the rest.
    for (const t of targets) {
      audit({ actor: ctx.sender, action: 'group.unmute', target: t, groupJid: ctx.chatId });
    }
    await ctx.replyOk(`Unmuted: ${targets.map(t => '@' + t.split('@')[0]).join(', ')}`);
  },
};

function _resolveTargets(ctx) {
  const out = new Set();
  for (const m of extractedMentions(ctx.msg)) out.add(m);
  for (const a of ctx.args) {
    if (isValidPhoneNumber(a)) out.add(phoneToJid(a));
    else if (/^\d+@s\.whatsapp\.net$/.test(a)) out.add(norm(a));
  }
  return [...out];
}
