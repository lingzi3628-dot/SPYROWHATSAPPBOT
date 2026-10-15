import { setGroupSetting, audit } from '../../database.js';
import { bold, mono, italic } from '../../utils/text.js';

export default {
  name: 'antispam',
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  description: 'Anti-spam with rate limiting + repeated message detection.',
  usage: '.antispam on|off|status|sensitivity <low|medium|high>',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();

    if (sub === 'on' || sub === 'off') {
      setGroupSetting(ctx.chatId, 'antispam', sub === 'on' ? 1 : 0);
      audit({ actor: ctx.sender, action: 'admin.antispam', groupJid: ctx.chatId, detail: sub });
      return ctx.replyOk(
        `${bold('🛡️ Antispam')}: ${sub.toUpperCase()}\n\n` +
        (sub === 'on'
          ? `Detects:\n• Rapid-fire messages (5+ in 5s)\n• Repeated identical messages (3+ in a row)\n• Excessive mentions (5+ in one message)\n• Long copy-paste blocks\n\nAction: Warn + delete after 3 violations`
          : 'Antispam disabled.')
      );
    }

    return ctx.reply(
      `${bold('🛡️ Antispam Status')}\n${'━'.repeat(30)}\n\n` +
      `Usage:\n` +
      `  ${mono('.antispam on')} — enable spam detection\n` +
      `  ${mono('.antispam off')} — disable\n\n` +
      `${italic('_Detects: rapid messages, repeats, excessive mentions, copy-paste_')}`
    );
  },
};
