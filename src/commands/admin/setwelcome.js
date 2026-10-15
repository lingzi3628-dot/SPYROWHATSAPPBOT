import { setGroupSetting, audit } from '../../database.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'setwelcome',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  description: 'Set the welcome template. Variables: {user} {group} {count}',
  usage: '.setwelcome <text>',
  async execute(ctx) {
    const txt = sanitize(ctx.body || '').slice(0, 1000);
    if (!txt) return ctx.reply('Usage: .setwelcome <text>. Use {user} {group} {count}');
    setGroupSetting(ctx.chatId, 'welcome_msg', txt);
    audit({ actor: ctx.sender, action: 'admin.setwelcome', groupJid: ctx.chatId });
    await ctx.replyOk('Welcome template saved.');
  },
};
