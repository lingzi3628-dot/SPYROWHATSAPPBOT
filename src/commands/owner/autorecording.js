import { isAutoRecording, setAutoRecording } from '../../services/auto-features.js';
import { bold, mono } from '../../utils/text.js';
import { audit } from '../../database.js';

export default {
  name: 'autorecording',
  aliases: ['arecording', 'recording'],
  category: 'owner',
  ownerOnly: true,
  description: 'Show "recording audio…" indicator when messages arrive.',
  usage: '.autorecording on|off',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();
    if (sub === 'on' || sub === 'off') {
      setAutoRecording(sub === 'on');
      audit({ actor: ctx.sender, action: 'owner.autorecording', detail: sub });
      return ctx.replyOk(`Auto-recording is now ${sub.toUpperCase()}.`);
    }
    return ctx.reply(`${bold('🎙️ Auto-Recording:')} ${mono(isAutoRecording() ? 'ON' : 'OFF')}\n\nUsage: ${mono('.autorecording on|off')}`);
  },
};
