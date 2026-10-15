import { audit } from '../../database.js';

export default {
  name: 'unlock',
  aliases: ['unlocksettings'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,
  description: 'Unlock group settings so all members can edit them.',
  usage: '.unlock',
  async execute(ctx) {
    try {
      await ctx.sock.groupSettingUpdate(ctx.chatId, 'unlocked');
      audit({ actor: ctx.sender, action: 'group.unlock', groupJid: ctx.chatId });
      await ctx.replyOk('Group settings unlocked.');
    } catch (err) {
      await ctx.replyError(`Could not unlock: ${err.message || err}`);
    }
  },
};
