import { stmts } from '../../database.js';
import { bold, mono, italic } from '../../utils/text.js';
import { isOwner } from '../../security.js';

export default {
  name: 'appeals',
  aliases: ['reviewappeals'],
  category: 'owner',
  ownerOnly: true,
  description: 'View appeal requests from moderated users (owner only).',
  usage: '.appeals [count] | .appeals approve <id> | .appeals deny <id>',
  async execute(ctx) {
    if (!isOwner(ctx.sender)) {
      return ctx.reply('⛔ Owner only.');
    }

    const sub = (ctx.args[0] || '').toLowerCase();

    if (sub === 'approve' && ctx.args[1]) {
      stmts.updateAppealStatus.run('approved', parseInt(ctx.args[1]));
      return ctx.replyOk(`Appeal #${ctx.args[1]} approved. User has been notified.`);
    }
    if (sub === 'deny' && ctx.args[1]) {
      stmts.updateAppealStatus.run('denied', parseInt(ctx.args[1]));
      return ctx.replyOk(`Appeal #${ctx.args[1]} denied.`);
    }

    const limit = Math.min(parseInt(ctx.args[0]) || 15, 50);
    const appeals = stmts.getAppeals.all(limit);
    if (!appeals.length) {
      return ctx.reply('📭 No appeal requests.');
    }

    let out = `${bold('⚖️ Appeal Requests')} (${appeals.length})\n${'━'.repeat(40)}\n`;
    for (const a of appeals) {
      const time = new Date(a.created_at * 1000).toLocaleString();
      const status = a.status === 'pending' ? '🟡' : a.status === 'approved' ? '🟢' : '🔴';
      out += `\n${status} ${bold('#' + a.id)} [${a.status}]\n`;
      out += `  ${mono(time)}\n`;
      out += `  User: @${a.user_jid.split('@')[0]}\n`;
      out += `  Action: ${mono(String(a.action_id || 'general'))}\n`;
      out += `  Reason: ${italic(a.reason.slice(0, 100))}\n`;
    }
    out += `\n${'━'.repeat(40)}\n${italic('Use .appeals approve <id> or .appeals deny <id>')}`;
    await ctx.replyLong(out);
  },
};
