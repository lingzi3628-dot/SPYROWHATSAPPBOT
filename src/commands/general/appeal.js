import { stmts, audit } from '../../database.js';
import { bold, mono, italic } from '../../utils/text.js';
import { sanitize } from '../../utils/text.js';
import config from '../../config.js';

export default {
  name: 'appeal',
  aliases: ['review', 'dispute'],
  category: 'general',
  description: 'Request a review of a moderation action taken against you.',
  usage: '.appeal <action_id> <reason>\nExample: .appeal 42 I wasn\'t spamming, those were different messages',
  cooldown: 60,
  async execute(ctx) {
    const actionId = parseInt(ctx.args[0]);
    const reason = sanitize(ctx.body?.split(' ').slice(1).join(' ') || '').slice(0, 500);

    if (!reason) {
      return ctx.reply(
        `${bold('⚖️ Appeal a Moderation Action')}\n\n` +
        `If you were warned, muted, or kicked and believe it was unfair, you can appeal.\n\n` +
        `Usage: ${mono('.appeal <action_id> <reason>')}\n\n` +
        `Example:\n` +
        `  ${mono('.appeal 42 I wasn\'t spamming, those were different messages')}\n\n` +
        `Find your action ID in the audit log: ${mono('.auditlog')}\n\n` +
        `${italic('_Appeals are reviewed by the bot owner. Abusing appeals may extend your restriction._')}`
      );
    }

    // If no action ID, still allow the appeal (general)
    const id = actionId || null;
    stmts.addAppeal.run(ctx.sender, id, reason);
    audit({ actor: ctx.sender, action: 'user.appeal', detail: `action=${id}, reason=${reason.slice(0, 100)}` });

    // Notify owner
    if (config.OWNER_JID) {
      try {
        await ctx.sock.sendMessage(config.OWNER_JID, {
          text: `${bold('⚖️ New Appeal Request')}\n\n` +
                `User: @${ctx.sender.split('@')[0]}\n` +
                `Action ID: ${id || 'general'}\n` +
                `Reason: ${reason}\n\n` +
                `Review with: ${mono('.appeals')}`,
          mentions: [ctx.sender],
        });
      } catch {}
    }

    await ctx.replyOk(
      `${bold('⚖️ Appeal Submitted')}\n\n` +
      `Action ID: ${mono(String(id || 'general'))}\n` +
      `Reason: ${italic(reason)}\n\n` +
      `The bot owner has been notified and will review your appeal.\n` +
      `${italic('_Please be patient. Abusing appeals may extend your restriction._')}`
    );
  },
};
