import { setGroupSetting, audit } from '../../database.js';

export default {
  name: 'antimention',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  description: 'Toggle anti-mass-mention protection.',
  usage: '.antimention on|off',
  async execute(ctx) {
    const arg = (ctx.args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(arg)) return ctx.reply('Usage: .antimention on|off');
    setGroupSetting(ctx.chatId, 'antimention', arg === 'on' ? 1 : 0);
    audit({ actor: ctx.sender, action: 'admin.antimention', groupJid: ctx.chatId, detail: arg });
    await ctx.replyOk(`antimention is now ${arg.toUpperCase()}.`);
  },
};
