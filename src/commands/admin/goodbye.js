import { setGroupSetting, audit } from '../../database.js';

export default {
  name: 'goodbye',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  description: 'Toggle goodbye messages on group leave.',
  usage: '.goodbye on|off',
  async execute(ctx) {
    const arg = (ctx.args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(arg)) return ctx.reply('Usage: .goodbye on|off');
    setGroupSetting(ctx.chatId, 'goodbye', arg === 'on' ? 1 : 0);
    audit({ actor: ctx.sender, action: 'admin.goodbye', groupJid: ctx.chatId, detail: arg });
    await ctx.replyOk(`goodbye is now ${arg.toUpperCase()}.`);
  },
};
