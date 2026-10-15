import { isAutoStatusView, setAutoStatusView } from '../../services/auto-features.js';
import { bold, mono } from '../../utils/text.js';
import { audit } from '../../database.js';

export default {
  name: 'autostatusview',
  aliases: ['astatus', 'statusview'],
  category: 'owner',
  ownerOnly: true,
  description: 'Auto-view WhatsApp status updates (stories).',
  usage: '.autostatusview on|off',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();
    if (sub === 'on' || sub === 'off') {
      setAutoStatusView(sub === 'on');
      audit({ actor: ctx.sender, action: 'owner.autostatusview', detail: sub });
      return ctx.replyOk(`Auto-status-view is now ${sub.toUpperCase()}.`);
    }
    return ctx.reply(`${bold('👁️ Auto-Status-View:')} ${mono(isAutoStatusView() ? 'ON' : 'OFF')}\n\nUsage: ${mono('.autostatusview on|off')}`);
  },
};
