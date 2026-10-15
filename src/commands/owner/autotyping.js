import { isAutoTyping, setAutoTyping, getAutoFeaturesStatus } from '../../services/auto-features.js';
import { bold, mono } from '../../utils/text.js';
import { audit } from '../../database.js';

export default {
  name: 'autotyping',
  aliases: ['atyping', 'typing'],
  category: 'owner',
  ownerOnly: true,
  description: 'Show "typing…" indicator when messages arrive.',
  usage: '.autotyping on|off',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();
    if (sub === 'on' || sub === 'off') {
      setAutoTyping(sub === 'on');
      audit({ actor: ctx.sender, action: 'owner.autotyping', detail: sub });
      return ctx.replyOk(`Auto-typing is now ${sub.toUpperCase()}.`);
    }
    const status = isAutoTyping() ? 'ON' : 'OFF';
    const all = getAutoFeaturesStatus();
    return ctx.reply(
      `${bold('⌨️ Auto-Typing:')} ${mono(status)}\n\n` +
      `Usage: ${mono('.autotyping on|off')}\n\n` +
      `${bold('All auto-features:')}\n` +
      `  Typing:        ${mono(all.autotyping ? 'ON' : 'OFF')}\n` +
      `  Read:          ${mono(all.autoread ? 'ON' : 'OFF')}\n` +
      `  Status view:   ${mono(all.autostatusview ? 'ON' : 'OFF')}\n` +
      `  Recording:     ${mono(all.autorecording ? 'ON' : 'OFF')}\n` +
      `  Always online: ${mono(all.alwaysonline ? 'ON' : 'OFF')}`
    );
  },
};
