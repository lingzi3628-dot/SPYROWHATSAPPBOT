import { setGroupSetting, audit } from '../../database.js';

export default {
  name: 'antitag',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  description: 'Toggle anti-tag protection (mentions targeting only the bot).',
  usage: '.antitag on|off',
  async execute(ctx) {
    const arg = (ctx.args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(arg)) return ctx.reply('Usage: .antitag on|off');
    setGroupSetting(ctx.chatId, 'antitag', arg === 'on' ? 1 : 0);
    audit({ actor: ctx.sender, action: 'admin.antitag', groupJid: ctx.chatId, detail: arg });
    await ctx.replyOk(`antitag is now ${arg.toUpperCase()}.`);
  },
};
