import { audit } from '../../database.js';

export default {
  name: 'close',
  aliases: ['lockchat', 'announce'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,
  description: 'Restrict messaging to admins only.',
  usage: '.close',
  async execute(ctx) {
    try {
      await ctx.sock.groupSettingUpdate(ctx.chatId, 'announcement');
      audit({ actor: ctx.sender, action: 'group.close', groupJid: ctx.chatId });
      await ctx.replyOk('Group is now closed — only admins can send messages.');
    } catch (err) {
      await ctx.replyError(`Could not close group: ${err.message || err}`);
    }
  },
};
