import { audit } from '../../database.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'setbotname',
  aliases: ['setname'],
  category: 'owner',
  ownerOnly: true,
  description: 'Update the bot\'s WhatsApp display name (push name).',
  usage: '.setbotname <name>',
  async execute(ctx) {
    const name = sanitize(ctx.body || '').slice(0, 60);
    if (!name) return ctx.reply('Usage: .setbotname <name>');
    try {
      await ctx.sock.updateProfileName(name);
      audit({ actor: ctx.sender, action: 'owner.setbotname', detail: name });
      await ctx.replyOk(`Bot display name updated to: ${name}`);
    } catch (err) {
      await ctx.replyError(`Could not update name: ${err.message || err}`);
    }
  },
};
