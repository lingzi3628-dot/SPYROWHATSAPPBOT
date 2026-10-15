import { extractedMentions, phoneToJid, norm } from '../../utils/jid.js';
import { isValidPhoneNumber } from '../../security.js';
import { audit } from '../../database.js';
import { isOwner } from '../../security.js';
import config from '../../config.js';

export default {
  name: 'demote',
  aliases: ['unadmin'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,
  description: 'Demote an admin to a member (bot must be admin).',
  usage: '.demote @user | .demote <phone>',
  async execute(ctx) {
    const targets = _resolveTargets(ctx);
    if (!targets.length) return ctx.reply('Usage: .demote @user (or phone number)');
    // protect owner
    const safe = targets.filter((t) => !isOwner(t));
    if (!safe.length) return ctx.replyError('Refusing to demote the owner.');
    try {
      await ctx.sock.groupParticipantsUpdate(ctx.chatId, safe, 'demote');
      audit({ actor: ctx.sender, action: 'group.demote', target: safe.join(','), groupJid: ctx.chatId });
      await ctx.replyOk(`Demoted: ${safe.map((t) => '@' + t.split('@')[0]).join(', ')}`);
    } catch (err) {
      await ctx.replyError(`WhatsApp rejected the demote: ${err.message || err}`);
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
  out.delete(norm(ctx.botJid)); // never demote the bot itself
  return [...out];
}
