import { setGroupSetting, getGroupSettings, audit } from '../../database.js';
import { bold, mono, italic } from '../../utils/text.js';

export default {
  name: 'antibot',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  description: 'Detect suspicious automated accounts and bot behavior.',
  usage: '.antibot on|off|status',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();
    const settings = getGroupSettings(ctx.chatId);

    if (sub === 'on' || sub === 'off') {
      setGroupSetting(ctx.chatId, 'antibot', sub === 'on' ? 1 : 0);
      audit({ actor: ctx.sender, action: 'admin.antibot', groupJid: ctx.chatId, detail: sub });
      return ctx.replyOk(
        `${bold('🤖 Antibot')}: ${sub.toUpperCase()}\n\n` +
        (sub === 'on'
          ? `Detects:\n• Accounts with no profile photo\n• Accounts with generic names (User123, Bot, etc.)\n• Rapid automated message patterns\n• Forward-heavy behavior (only forwards, no original messages)\n• New accounts (< 7 days old where detectable)\n\nAction: Flag suspicious accounts to admins`
          : 'Antibot disabled.')
      );
    }

    return ctx.reply(
      `${bold('🤖 Antibot Status')}\n${'━'.repeat(30)}\n\n` +
      `State: ${mono(settings.antibot ? 'ON' : 'OFF')}\n\n` +
      `Usage:\n` +
      `  ${mono('.antibot on')} — enable bot detection\n` +
      `  ${mono('.antibot off')} — disable\n\n` +
      `${italic('_Detects: no-avatar accounts, generic names, automated patterns_')}`
    );
  },
};
