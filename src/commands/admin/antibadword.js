import { setGroupSetting, audit } from '../../database.js';

export default {
  name: 'antibadword',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  description: 'Toggle anti-badword protection.',
  usage: '.antibadword on|off',
  async execute(ctx) {
    const arg = (ctx.args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(arg)) return ctx.reply('Usage: .antibadword on|off');
    setGroupSetting(ctx.chatId, 'antibadword', arg === 'on' ? 1 : 0);
    audit({ actor: ctx.sender, action: 'admin.antibadword', groupJid: ctx.chatId, detail: arg });
    await ctx.replyOk(`antibadword is now ${arg.toUpperCase()}.`);
  },
};
