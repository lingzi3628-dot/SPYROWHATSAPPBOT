import { getUserBotMode, setUserBotMode } from '../../services/bot-mode.js';
import { bold, mono } from '../../utils/text.js';
import { audit } from '../../database.js';

export default {
  name: 'publicmode',
  aliases: ['public', 'pubmode'],
  category: 'tools',
  description: 'Set your bot to public mode — everyone can use commands.',
  usage: '.publicmode on|off',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();
    if (sub === 'on') {
      setUserBotMode(ctx.chatId, 'public');
      audit({ actor: ctx.sender, action: 'botmode.public', detail: 'on' });
      return ctx.replyOk(
        `${bold('🌐 Public mode ON')}\n\n` +
        `Everyone can now use commands.\n` +
        `Use ${mono('.privatemode on')} to restrict to owner only.`
      );
    }
    if (sub === 'off') {
      setUserBotMode(ctx.chatId, 'private');
      audit({ actor: ctx.sender, action: 'botmode.public', detail: 'off' });
      return ctx.replyOk('🌐 Public mode OFF. Bot is now private — only you can use it.');
    }
    const mode = getUserBotMode(ctx.chatId);
    return ctx.reply(
      `${bold('🌐 Public Mode:')} ${mono(mode === 'public' ? 'ON' : 'OFF')}\n` +
      `Current mode: ${mono(mode)}\n\n` +
      `Usage:\n` +
      `  ${mono('.publicmode on')} — everyone can use bot\n` +
      `  ${mono('.publicmode off')} — only you can use bot`
    );
  },
};
