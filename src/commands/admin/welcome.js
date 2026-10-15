import { setGroupSetting, audit } from '../../database.js';

export default {
  name: 'welcome',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  description: 'Toggle welcome messages on group join.',
  usage: '.welcome on|off',
  async execute(ctx) {
    const arg = (ctx.args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(arg)) return ctx.reply('Usage: .welcome on|off');
    setGroupSetting(ctx.chatId, 'welcome', arg === 'on' ? 1 : 0);
    audit({ actor: ctx.sender, action: 'admin.welcome', groupJid: ctx.chatId, detail: arg });
    await ctx.replyOk(`welcome is now ${arg.toUpperCase()}.`);
  },
};
