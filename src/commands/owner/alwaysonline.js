import { isAlwaysOnline, setAlwaysOnline } from '../../services/auto-features.js';
import { bold, mono } from '../../utils/text.js';
import { audit } from '../../database.js';

export default {
  name: 'alwaysonline',
  aliases: ['online', 'aonline'],
  category: 'owner',
  ownerOnly: true,
  description: 'Always show as "online" in WhatsApp.',
  usage: '.alwaysonline on|off',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();
    if (sub === 'on' || sub === 'off') {
      setAlwaysOnline(sub === 'on');
      audit({ actor: ctx.sender, action: 'owner.alwaysonline', detail: sub });
      return ctx.replyOk(`Always-online is now ${sub.toUpperCase()}.`);
    }
    return ctx.reply(`${bold('🟢 Always-Online:')} ${mono(isAlwaysOnline() ? 'ON' : 'OFF')}\n\nUsage: ${mono('.alwaysonline on|off')}`);
  },
};
