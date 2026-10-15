import { setGroupSetting, audit } from '../../database.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'setrules',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  description: 'Set the group rules text.',
  usage: '.setrules <text>',
  async execute(ctx) {
    const txt = sanitize(ctx.body || '').slice(0, 2000);
    if (!txt) return ctx.reply('Usage: .setrules <text>');
    setGroupSetting(ctx.chatId, 'rules', txt);
    audit({ actor: ctx.sender, action: 'admin.setrules', groupJid: ctx.chatId });
    await ctx.replyOk('Rules saved. Members can use .rules to view them.');
  },
};
