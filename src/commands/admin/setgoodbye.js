import { setGroupSetting, audit } from '../../database.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'setgoodbye',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  description: 'Set the goodbye template. Variables: {user} {group}',
  usage: '.setgoodbye <text>',
  async execute(ctx) {
    const txt = sanitize(ctx.body || '').slice(0, 1000);
    if (!txt) return ctx.reply('Usage: .setgoodbye <text>. Use {user} {group}');
    setGroupSetting(ctx.chatId, 'goodbye_msg', txt);
    audit({ actor: ctx.sender, action: 'admin.setgoodbye', groupJid: ctx.chatId });
    await ctx.replyOk('Goodbye template saved.');
  },
};
