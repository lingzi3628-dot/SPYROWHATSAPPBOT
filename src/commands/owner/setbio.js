import { audit } from '../../database.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'setbio',
  aliases: ['setabout'],
  category: 'owner',
  ownerOnly: true,
  description: 'Update the bot\'s WhatsApp "about" text.',
  usage: '.setbio <text>',
  async execute(ctx) {
    const t = sanitize(ctx.body || '').slice(0, 139);
    if (!t) return ctx.reply('Usage: .setbio <text>');
    try {
      await ctx.sock.updateProfileStatus(t);
      audit({ actor: ctx.sender, action: 'owner.setbio' });
      await ctx.replyOk('Bio updated.');
    } catch (err) {
      await ctx.replyError(`Could not update bio: ${err.message || err}`);
    }
  },
};
