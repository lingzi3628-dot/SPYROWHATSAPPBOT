import {
  isAutoStatusReact,
  setAutoStatusReact,
  getStatusReactEmoji,
  setStatusReactEmoji,
} from '../../services/bot-mode.js';
import { bold, mono } from '../../utils/text.js';
import { audit } from '../../database.js';

export default {
  name: 'autostatusreact',
  aliases: ['astatusreact', 'statusreact'],
  category: 'owner',
  ownerOnly: true,
  description: 'Auto-react to WhatsApp status updates with an emoji.',
  usage: '.autostatusreact on|off [emoji]',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();
    const emoji = ctx.args[1];

    if (sub === 'on' || sub === 'off') {
      setAutoStatusReact(sub === 'on');
      if (emoji && sub === 'on') {
        setStatusReactEmoji(emoji);
      }
      audit({ actor: ctx.sender, action: 'owner.autostatusreact', detail: sub + (emoji ? ` ${emoji}` : '') });
      const currentEmoji = getStatusReactEmoji();
      return ctx.replyOk(
        `${bold('👁️ Auto-Status-React')}: ${mono(sub.toUpperCase())}\n` +
        `Emoji: ${currentEmoji}\n\n` +
        (sub === 'on'
          ? `Bot will react to all status updates with ${currentEmoji}.\nUse ${mono('.autostatusreact on 😍')} to change emoji.`
          : 'Auto-status-react disabled.')
      );
    }

    const status = isAutoStatusReact() ? 'ON' : 'OFF';
    const currentEmoji = getStatusReactEmoji();
    return ctx.reply(
      `${bold('👁️ Auto-Status-React')}\n${'━'.repeat(30)}\n\n` +
      `${bold('Status:')} ${mono(status)}\n` +
      `${bold('Emoji:')} ${currentEmoji}\n\n` +
      `Usage:\n` +
      `  ${mono('.autostatusreact on')} — enable with default emoji (👀)\n` +
      `  ${mono('.autostatusreact on ❤️')} — enable with custom emoji\n` +
      `  ${mono('.autostatusreact off')} — disable`
    );
  },
};
