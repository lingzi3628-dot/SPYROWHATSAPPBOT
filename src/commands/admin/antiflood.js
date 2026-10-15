import { setGroupSetting, audit } from '../../database.js';

export default {
  name: 'antiflood',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  description: 'Toggle anti-flood protection (rate-limit per user).',
  usage: '.antiflood on|off',
  async execute(ctx) {
    const arg = (ctx.args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(arg)) return ctx.reply('Usage: .antiflood on|off');
    setGroupSetting(ctx.chatId, 'antiflood', arg === 'on' ? 1 : 0);
    audit({ actor: ctx.sender, action: 'admin.antiflood', groupJid: ctx.chatId, detail: arg });
    await ctx.replyOk(`antiflood is now ${arg.toUpperCase()}.`);
  },
};
