import { audit } from '../../database.js';

export default {
  name: 'open',
  aliases: ['unlockchat'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,
  description: 'Allow all members to send messages.',
  usage: '.open',
  async execute(ctx) {
    try {
      await ctx.sock.groupSettingUpdate(ctx.chatId, 'not_announcement');
      audit({ actor: ctx.sender, action: 'group.open', groupJid: ctx.chatId });
      await ctx.replyOk('Group is now open — all members can send messages.');
    } catch (err) {
      await ctx.replyError(`Could not open group: ${err.message || err}`);
    }
  },
};
