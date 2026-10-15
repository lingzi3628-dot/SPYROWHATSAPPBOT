import { setGroupSetting, audit } from '../../database.js';

export default {
  name: 'setprefix',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  description: 'Override the command prefix for this group.',
  usage: '.setprefix <prefix>',
  async execute(ctx) {
    const p = (ctx.args[0] || '').trim();
    if (!p) return ctx.reply('Usage: .setprefix <prefix>');
    setGroupSetting(ctx.chatId, 'prefix', p.slice(0, 4));
    audit({ actor: ctx.sender, action: 'admin.setprefix', groupJid: ctx.chatId, detail: p });
    await ctx.replyOk(`Prefix set to "${p}" for this group.`);
  },
};
