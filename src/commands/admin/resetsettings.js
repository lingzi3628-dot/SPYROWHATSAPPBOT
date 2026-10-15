import { resetGroupSettings, audit } from '../../database.js';

export default {
  name: 'resetsettings',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  description: 'Reset all group settings to defaults.',
  usage: '.resetsettings',
  async execute(ctx) {
    resetGroupSettings(ctx.chatId);
    audit({ actor: ctx.sender, action: 'admin.reset_settings', groupJid: ctx.chatId });
    await ctx.replyOk('Group settings reset to defaults.');
  },
};
