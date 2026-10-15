import { setGroupSetting, audit } from '../../database.js';
import { clampInt } from '../../security.js';
import config from '../../config.js';

export default {
  name: 'setwarnlimit',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  description: 'Set the warning limit before auto-removal.',
  usage: '.setwarnlimit <number>',
  async execute(ctx) {
    const n = clampInt(ctx.args[0], 0, 20, config.DEFAULT_WARN_LIMIT);
    setGroupSetting(ctx.chatId, 'warn_limit', n);
    audit({ actor: ctx.sender, action: 'admin.setwarnlimit', groupJid: ctx.chatId, detail: String(n) });
    await ctx.replyOk(`Warning limit set to ${n}. (0 = no auto-removal)`);
  },
};
