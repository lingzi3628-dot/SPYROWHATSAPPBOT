import { setGroupSetting, audit } from '../../database.js';

export default {
  name: 'setmute',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  description: 'Toggle mute flag in the bot\'s moderation logic for this group.',
  usage: '.setmute on|off',
  async execute(ctx) {
    const arg = (ctx.args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(arg)) return ctx.reply('Usage: .setmute on|off');
    setGroupSetting(ctx.chatId, 'mute', arg === 'on' ? 1 : 0);
    audit({ actor: ctx.sender, action: 'admin.setmute', groupJid: ctx.chatId, detail: arg });
    await ctx.replyOk(`mute is now ${arg.toUpperCase()}.`);
  },
};
