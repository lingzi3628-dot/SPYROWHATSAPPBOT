import config from '../../config.js';
import { audit } from '../../database.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'feedback',
  aliases: ['fb'],
  category: 'general',
  description: 'Submit feedback to the owner.',
  usage: '.feedback <message>',
  async execute(ctx) {
    const txt = sanitize(ctx.body || '').slice(0, 1000);
    if (!txt) return ctx.reply('Usage: .feedback <message>');
    audit({ actor: ctx.sender, action: 'user.feedback', detail: txt });
    if (config.OWNER_JID) {
      try {
        await ctx.sock.sendMessage(config.OWNER_JID, {
          text: `💬 *Feedback* from @${ctx.sender.split('@')[0]}\n\n${txt}`,
          mentions: [ctx.sender],
        });
      } catch {}
    }
    await ctx.replyOk('Feedback delivered. Thanks!');
  },
};
