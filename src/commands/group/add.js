import { phoneToJid, norm } from '../../utils/jid.js';
import { isValidPhoneNumber } from '../../security.js';
import { audit } from '../../database.js';

export default {
  name: 'add',
  aliases: ['invite-user'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,
  description: 'Attempt to add a participant (subject to WhatsApp privacy rules).',
  usage: '.add <phone>',
  async execute(ctx) {
    const nums = ctx.args.filter((a) => isValidPhoneNumber(a));
    if (!nums.length) return ctx.reply('Usage: .add <phone> (e.g. .add 254700000000)');
    const targets = nums.map(phoneToJid);
    try {
      const res = await ctx.sock.groupParticipantsUpdate(ctx.chatId, targets, 'add');
      const summary = (res || []).map((r) => `${r.id?.split('@')[0]}: ${r.status}`).join('\n') || 'no response';
      audit({ actor: ctx.sender, action: 'group.add', target: targets.join(','), groupJid: ctx.chatId });
      await ctx.reply(`Add request result:\n${summary}`);
    } catch (err) {
      await ctx.replyError(`WhatsApp rejected the add: ${err.message || err}. User may have privacy settings that block direct adds — try .invite to share a group link instead.`);
    }
  },
};
