import { getUserBotMode, setUserBotMode } from '../../services/bot-mode.js';
import { bold, mono } from '../../utils/text.js';
import { audit } from '../../database.js';

export default {
  name: 'privatemode',
  aliases: ['private', 'pmode'],
  category: 'tools',
  description: 'Set your bot to private mode — only you can use commands.',
  usage: '.privatemode on|off',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();
    if (sub === 'on') {
      setUserBotMode(ctx.chatId, 'private');
      audit({ actor: ctx.sender, action: 'botmode.private', detail: 'on' });
      return ctx.replyOk(
        `${bold('🔒 Private mode ON')}\n\n` +
        `Only you can use commands now.\n` +
        `Other users will be told the bot is private.\n\n` +
        `Use ${mono('.publicmode on')} to re-enable for everyone.`
      );
    }
    if (sub === 'off') {
      setUserBotMode(ctx.chatId, 'public');
      audit({ actor: ctx.sender, action: 'botmode.private', detail: 'off' });
      return ctx.replyOk('🔒 Private mode OFF. Bot is now public — everyone can use it.');
    }
    const mode = getUserBotMode(ctx.chatId);
    return ctx.reply(
      `${bold('🔒 Private Mode:')} ${mono(mode === 'private' ? 'ON' : 'OFF')}\n` +
      `Current mode: ${mono(mode)}\n\n` +
      `Usage:\n` +
      `  ${mono('.privatemode on')} — only you can use bot\n` +
      `  ${mono('.privatemode off')} — everyone can use bot`
    );
  },
};
