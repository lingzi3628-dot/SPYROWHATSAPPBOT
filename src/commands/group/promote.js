import { extractedMentions } from '../../utils/jid.js';
import { phoneToJid, norm } from '../../utils/jid.js';
import { isValidPhoneNumber } from '../../security.js';
import { audit } from '../../database.js';

export default {
  name: 'promote',
  aliases: ['makeadmin'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,
  description: 'Promote a member to admin (bot must be admin).',
  usage: '.promote @user | .promote <phone>',
  async execute(ctx) {
    const targets = _resolveTargets(ctx);
    if (!targets.length) return ctx.reply('Usage: .promote @user (or phone number)');
    try {
      const res = await ctx.sock.groupParticipantsUpdate(ctx.chatId, targets, 'promote');
      audit({ actor: ctx.sender, action: 'group.promote', target: targets.join(','), groupJid: ctx.chatId });
      await ctx.replyOk(`Promoted: ${targets.map((t) => '@' + t.split('@')[0]).join(', ')}`);
    } catch (err) {
      await ctx.replyError(`WhatsApp rejected the promote: ${err.message || err}`);
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
  // never allow promoting the bot itself
  out.delete(norm(ctx.botJid));
  return [...out];
}
