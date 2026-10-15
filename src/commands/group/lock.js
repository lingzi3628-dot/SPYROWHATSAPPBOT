import { audit } from '../../database.js';

export default {
  name: 'lock',
  aliases: ['locksettings'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,
  description: 'Lock group settings so only admins can edit them.',
  usage: '.lock',
  async execute(ctx) {
    try {
      await ctx.sock.groupSettingUpdate(ctx.chatId, 'locked');
      audit({ actor: ctx.sender, action: 'group.lock', groupJid: ctx.chatId });
      await ctx.replyOk('Group settings locked (admin-only edits).');
    } catch (err) {
      await ctx.replyError(`Could not lock: ${err.message || err}`);
    }
  },
};
