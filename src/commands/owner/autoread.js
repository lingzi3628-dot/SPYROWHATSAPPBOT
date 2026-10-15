import { isAutoRead, setAutoRead } from '../../services/auto-features.js';
import { bold, mono } from '../../utils/text.js';
import { audit } from '../../database.js';

export default {
  name: 'autoread',
  aliases: ['aread'],
  category: 'owner',
  ownerOnly: true,
  description: 'Auto-mark incoming messages as read.',
  usage: '.autoread on|off',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();
    if (sub === 'on' || sub === 'off') {
      setAutoRead(sub === 'on');
      audit({ actor: ctx.sender, action: 'owner.autoread', detail: sub });
      return ctx.replyOk(`Auto-read is now ${sub.toUpperCase()}.`);
    }
    return ctx.reply(`${bold('📖 Auto-Read:')} ${mono(isAutoRead() ? 'ON' : 'OFF')}\n\nUsage: ${mono('.autoread on|off')}`);
  },
};
