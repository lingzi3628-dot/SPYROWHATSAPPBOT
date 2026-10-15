import { extractedMentions, phoneToJid, norm } from '../../utils/jid.js';
import { isValidPhoneNumber, isOwner } from '../../security.js';
import { audit } from '../../database.js';

export default {
  name: 'kick',
  aliases: ['remove', 'ban'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,
  description: 'Remove a member from the group (bot must be admin).',
  usage: '.kick @user | .kick <phone>',
  async execute(ctx) {
    const targets = _resolveTargets(ctx);
    if (!targets.length) return ctx.reply('Usage: .kick @user (or phone number)');
    const safe = targets.filter((t) => !isOwner(t) && t !== norm(ctx.botJid));
    if (!safe.length) return ctx.replyError('Refusing to remove the owner or the bot.');
    try {
      await ctx.sock.groupParticipantsUpdate(ctx.chatId, safe, 'remove');
      audit({ actor: ctx.sender, action: 'group.kick', target: safe.join(','), groupJid: ctx.chatId });
      await ctx.replyOk(`Removed: ${safe.map((t) => '@' + t.split('@')[0]).join(', ')}`);
    } catch (err) {
      await ctx.replyError(`WhatsApp rejected the removal: ${err.message || err}`);
    }
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
