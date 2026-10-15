import { audit } from '../../database.js';
import { extractedMentions, phoneToJid } from '../../utils/jid.js';
import { isValidPhoneNumber } from '../../security.js';

export default {
  name: 'unblock',
  aliases: [],
  category: 'owner',
  ownerOnly: true,
  description: 'Unblock a previously blocked user.',
  usage: '.unblock @user | .unblock <phone>',
  async execute(ctx) {
    let target = null;
    const m = extractedMentions(ctx.msg);
    if (m.length) target = m[0];
    else if (ctx.args[0] && isValidPhoneNumber(ctx.args[0])) target = phoneToJid(ctx.args[0]);
    if (!target) return ctx.reply('Usage: .unblock @user | .unblock <phone>');
    try {
      await ctx.sock.updateBlockStatus(target, 'unblock');
      audit({ actor: ctx.sender, action: 'owner.unblock', target });
      await ctx.replyOk(`Unblocked @${target.split('@')[0]}.`);
    } catch (err) {
      await ctx.replyError(`Unblock failed: ${err.message || err}`);
    }
  },
};
