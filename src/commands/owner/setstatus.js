import { audit } from '../../database.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'setstatus',
  aliases: [],
  category: 'owner',
  ownerOnly: true,
  description: 'Alias for .setbio — update the bot\'s "about" text.',
  usage: '.setstatus <text>',
  async execute(ctx) {
    const t = sanitize(ctx.body || '').slice(0, 139);
    if (!t) return ctx.reply('Usage: .setstatus <text>');
    try {
      await ctx.sock.updateProfileStatus(t);
      audit({ actor: ctx.sender, action: 'owner.setstatus' });
      await ctx.replyOk('Status updated.');
    } catch (err) {
      await ctx.replyError(`Could not update status: ${err.message || err}`);
    }
  },
};
