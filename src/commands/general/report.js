import { stmts, audit } from '../../database.js';
import { extractedMentions, phoneToJid, norm } from '../../utils/jid.js';
import { isValidPhoneNumber } from '../../security.js';
import { bold, mono, italic } from '../../utils/text.js';
import { sanitize } from '../../utils/text.js';
import config from '../../config.js';

export default {
  name: 'report',
  aliases: ['reportuser', 'flag'],
  category: 'general',
  description: 'Submit a moderation report about a user for human review.',
  usage: '.report @user <reason>',
  cooldown: 30,
  async execute(ctx) {
    const targets = _resolveTargets(ctx);
    if (!targets.length) {
      return ctx.reply(
        `${bold('📢 Report a User')}\n\n` +
        `Submit a moderation report for human review.\n\n` +
        `Usage: ${mono('.report @user <reason>')}\n\n` +
        `Example:\n` +
        `  ${mono('.report @spammer Sending scam links')}\n` +
        `  ${mono('.report 254700000000 Harassment')}\n\n` +
        `${italic('_Reports are reviewed by the bot owner. False reports may result in a warning._')}`
      );
    }

    const reason = sanitize(ctx.body?.split(' ').slice(1).join(' ') || '').slice(0, 500);
    if (!reason) {
      return ctx.reply(`❌ Please provide a reason.\n\nUsage: ${mono('.report @user <reason>')}`);
    }

    for (const target of targets) {
      stmts.addReport.run(ctx.sender, target, ctx.isGroup ? ctx.chatId : null, reason);
      audit({ actor: ctx.sender, action: 'user.report', target, groupJid: ctx.isGroup ? ctx.chatId : null, detail: reason });
    }

    // Notify owner if configured
    if (config.OWNER_JID) {
      try {
        await ctx.sock.sendMessage(config.OWNER_JID, {
          text: `${bold('📢 New Moderation Report')}\n\n` +
                `Reporter: @${ctx.sender.split('@')[0]}\n` +
                `Target: @${targets[0].split('@')[0]}\n` +
                `Chat: ${ctx.isGroup ? ctx.chatId : 'Private'}\n` +
                `Reason: ${reason}\n\n` +
                `Review with: ${mono('.reports')}`,
          mentions: [ctx.sender, ...targets],
        });
      } catch {}
    }

    await ctx.replyOk(
      `${bold('📢 Report Submitted')}\n\n` +
      `Target: ${targets.map(t => '@' + t.split('@')[0]).join(', ')}\n` +
      `Reason: ${italic(reason)}\n\n` +
      `The bot owner has been notified and will review your report.\n` +
      `${italic('_False reports may result in a warning against you._')}`
    );
  },
};

function _resolveTargets(ctx) {
  const out = new Set();
  for (const m of extractedMentions(ctx.msg)) out.add(m);
  for (const a of ctx.args) {
    if (isValidPhoneNumber(a)) out.add(phoneToJid(a));
    else if (/^\d+@s\.whatsapp\.net$/.test(a)) out.add(norm(a));
  }
  out.delete(norm(ctx.botJid));
  return [...out];
}
