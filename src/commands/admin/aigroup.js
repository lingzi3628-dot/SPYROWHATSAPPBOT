import { isGroupAiEnabled, setGroupAi } from '../../services/group-ai.js';
import { bold, mono, italic } from '../../utils/text.js';
import { audit } from '../../database.js';

export default {
  name: 'aigroup',
  aliases: ['gai', 'groupai'],
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  description: 'Toggle AI auto-reply in this group. Bot replies when mentioned or replied to.',
  usage: '.aigroup on|off|status',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();

    if (sub === 'on' || sub === 'off') {
      setGroupAi(ctx.chatId, sub === 'on');
      audit({ actor: ctx.sender, action: 'admin.aigroup', groupJid: ctx.chatId, detail: sub });
      return ctx.replyOk(
        `${bold('🤖 Group AI')}: ${sub.toUpperCase()}\n\n` +
        (sub === 'on'
          ? `The bot will now reply when someone:\n• Mentions the bot (@bot)\n• Replies to the bot's message\n\n${italic('_It will NOT reply to every message — only when directly addressed._')}`
          : 'AI auto-reply is disabled in this group. Only commands work.')
      );
    }

    const status = isGroupAiEnabled(ctx.chatId);
    return ctx.reply(
      `${bold('🤖 Group AI Status')}\n${'━'.repeat(30)}\n\n` +
      `State: ${mono(status ? 'ON' : 'OFF')}\n\n` +
      `Usage:\n` +
      `  ${mono('.aigroup on')} — enable AI replies (when mentioned)\n` +
      `  ${mono('.aigroup off')} — disable AI replies\n\n` +
      `${italic('_When ON, bot replies when you @mention it or reply to its message._')}`
    );
  },
};
