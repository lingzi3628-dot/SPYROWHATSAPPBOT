import { audit } from '../../database.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'setdesc',
  aliases: ['description', 'setdescription'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,
  description: 'Change the group description.',
  usage: '.setdesc <new description>',
  async execute(ctx) {
    const desc = sanitize(ctx.body || '').slice(0, 500);
    if (!desc) return ctx.reply('Usage: .setdesc <new description>');
    try {
      await ctx.sock.groupUpdateDescription(ctx.chatId, desc);
      audit({ actor: ctx.sender, action: 'group.setdesc', groupJid: ctx.chatId, detail: desc });
      await ctx.replyOk('Group description updated.');
    } catch (err) {
      await ctx.replyError(`Could not change description: ${err.message || err}`);
    }
  },
};
