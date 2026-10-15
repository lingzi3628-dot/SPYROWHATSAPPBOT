import { stmts } from '../../database.js';
import { bold, mono, italic } from '../../utils/text.js';
import { isOwner } from '../../security.js';

export default {
  name: 'reports',
  aliases: ['modreports'],
  category: 'owner',
  ownerOnly: true,
  description: 'View moderation reports submitted by users (owner only).',
  usage: '.reports [count] | .reports resolve <id> | .reports dismiss <id>',
  async execute(ctx) {
    if (!isOwner(ctx.sender)) {
      return ctx.reply('⛔ Owner only.');
    }

    const sub = (ctx.args[0] || '').toLowerCase();

    if (sub === 'resolve' && ctx.args[1]) {
      stmts.updateReportStatus.run('resolved', parseInt(ctx.args[1]));
      return ctx.replyOk(`Report #${ctx.args[1]} marked as resolved.`);
    }
    if (sub === 'dismiss' && ctx.args[1]) {
      stmts.updateReportStatus.run('dismissed', parseInt(ctx.args[1]));
      return ctx.replyOk(`Report #${ctx.args[1]} dismissed.`);
    }

    const limit = Math.min(parseInt(ctx.args[0]) || 15, 50);
    const reports = stmts.getReports.all(limit);
    if (!reports.length) {
      return ctx.reply('📭 No moderation reports.');
    }

    let out = `${bold('📢 Moderation Reports')} (${reports.length})\n${'━'.repeat(40)}\n`;
    for (const r of reports) {
      const time = new Date(r.created_at * 1000).toLocaleString();
      const status = r.status === 'pending' ? '🟡' : r.status === 'resolved' ? '🟢' : '⚪';
      out += `\n${status} ${bold('#' + r.id)} [${r.status}]\n`;
      out += `  ${mono(time)}\n`;
      out += `  Reporter: @${r.reporter_jid.split('@')[0]}\n`;
      out += `  Target: @${r.target_jid.split('@')[0]}\n`;
      out += `  Reason: ${italic(r.reason.slice(0, 100))}\n`;
    }
    out += `\n${'━'.repeat(40)}\n${italic('Use .reports resolve <id> or .reports dismiss <id>')}`;
    await ctx.replyLong(out);
  },
};
