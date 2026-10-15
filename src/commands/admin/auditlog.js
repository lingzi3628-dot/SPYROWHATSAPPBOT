import { db } from '../../database.js';
import { bold, mono, italic } from '../../utils/text.js';

export default {
  name: 'auditlog',
  aliases: ['audit', 'modlog'],
  category: 'admin',
  description: 'View moderation actions logged by the bot.',
  usage: '.auditlog [count] | .auditlog clear',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();

    if (sub === 'clear') {
      if (ctx.perms.level === 'user') return ctx.reply('⛔ Admin only.');
      db.prepare('DELETE FROM audit_log').run();
      return ctx.replyOk('Audit log cleared.');
    }

    const limit = Math.min(parseInt(ctx.args[0]) || 15, 50);
    const rows = db.prepare(
      `SELECT * FROM audit_log ${ctx.isGroup ? 'WHERE group_jid = ?' : ''} ORDER BY created_at DESC LIMIT ?`
    ).all(...(ctx.isGroup ? [ctx.chatId, limit] : [limit]));

    if (!rows.length) {
      return ctx.reply('📭 No moderation actions logged yet.');
    }

    let out = `${bold('📋 Audit Log')} (${rows.length})\n${'━'.repeat(35)}\n`;
    for (const r of rows) {
      const time = new Date(r.created_at * 1000).toLocaleString();
      const actor = r.actor ? '@' + r.actor.split('@')[0] : 'system';
      const target = r.target ? '→ @' + r.target.split('@')[0] : '';
      out += `\n${mono(time)}\n`;
      out += `${bold(r.action)} ${actor} ${target}\n`;
      if (r.detail) out += `  ${italic(r.detail.slice(0, 100))}\n`;
    }
    out += `\n${'━'.repeat(35)}\n${italic('Use .auditlog clear to wipe (admin only)')}`;
    await ctx.replyLong(out);
  },
};
