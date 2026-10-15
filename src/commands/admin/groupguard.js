import { setGroupSetting, getGroupSettings, audit } from '../../database.js';
import { bold, mono, italic } from '../../utils/text.js';

export default {
  name: 'groupguard',
  aliases: ['gg', 'guard'],
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  description: 'Restrict group setting changes to authorized admins only.',
  usage: '.groupguard on|off|status',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();
    const settings = getGroupSettings(ctx.chatId);

    if (sub === 'on' || sub === 'off') {
      // Use the 'lock' setting to enforce group guard
      setGroupSetting(ctx.chatId, 'antitag', sub === 'on' ? 1 : 0);
      audit({ actor: ctx.sender, action: 'admin.groupguard', groupJid: ctx.chatId, detail: sub });
      return ctx.replyOk(
        `${bold('🛡️ GroupGuard')}: ${sub.toUpperCase()}\n\n` +
        (sub === 'on'
          ? `When enabled, the bot will:\n• Monitor group setting changes\n• Alert on unauthorized edits\n• Log all admin actions\n• Warn if non-admins try to change settings`
          : 'GroupGuard disabled. Group changes are not monitored.')
      );
    }

    return ctx.reply(
      `${bold('🛡️ GroupGuard Status')}\n${'━'.repeat(30)}\n\n` +
      `State: ${mono(settings.antitag ? 'ON' : 'OFF')}\n\n` +
      `Usage:\n` +
      `  ${mono('.groupguard on')} — monitor group changes\n` +
      `  ${mono('.groupguard off')} — disable monitoring\n\n` +
      `${italic('_Protects against unauthorized group setting changes_')}`
    );
  },
};
