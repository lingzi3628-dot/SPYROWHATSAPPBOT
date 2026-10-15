import { audit } from '../../database.js';
import { extractedMentions, phoneToJid } from '../../utils/jid.js';
import { isValidPhoneNumber } from '../../security.js';

export default {
  name: 'block',
  aliases: ['blacklist'],
  category: 'owner',
  ownerOnly: true,
  description: 'Block a user on WhatsApp.',
  usage: '.block @user | .block <phone>',
  async execute(ctx) {
    let target = null;
    const m = extractedMentions(ctx.msg);
    if (m.length) target = m[0];
    else if (ctx.args[0] && isValidPhoneNumber(ctx.args[0])) target = phoneToJid(ctx.args[0]);
    if (!target) return ctx.reply('Usage: .block @user | .block <phone>');
    try {
      await ctx.sock.updateBlockStatus(target, 'block');
      audit({ actor: ctx.sender, action: 'owner.block', target });
      await ctx.replyOk(`Blocked @${target.split('@')[0]}.`);
    } catch (err) {
      await ctx.replyError(`Block failed: ${err.message || err}`);
    }
  },
};
