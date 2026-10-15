import { setGroupSetting, audit } from '../../database.js';

export default {
  name: 'antilink',
  aliases: [],
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  description: 'Toggle anti-link protection (deletes invite links / URLs).',
  usage: '.antilink on|off',
  async execute(ctx) {
    const arg = (ctx.args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(arg)) return ctx.reply('Usage: .antilink on|off');
    setGroupSetting(ctx.chatId, 'antilink', arg === 'on' ? 1 : 0);
    audit({ actor: ctx.sender, action: 'admin.antilink', groupJid: ctx.chatId, detail: arg });
    await ctx.replyOk(`antilink is now ${arg.toUpperCase()}.`);
  },
};
