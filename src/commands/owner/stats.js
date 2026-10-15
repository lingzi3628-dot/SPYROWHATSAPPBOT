import { db } from '../../database.js';
import config from '../../config.js';
import { bold, mono } from '../../utils/text.js';

export default {
  name: 'stats',
  aliases: ['statistics'],
  category: 'general',
  description: 'Show bot usage statistics.',
  usage: '.stats',
  async execute(ctx) {
    const totalCmds = db.prepare('SELECT COUNT(*) as c FROM command_stats').get().c;
    const topCmds = db.prepare('SELECT command, COUNT(*) as c FROM command_stats GROUP BY command ORDER BY c DESC LIMIT 5').all();
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM user_prefs').get().c;
    const totalGroups = db.prepare('SELECT COUNT(*) as c FROM group_settings').get().c;
    const auditCount = db.prepare('SELECT COUNT(*) as c FROM audit_log').get().c;
    const lines = [
      bold('📊 Bot statistics'),
      `Total commands run: ${mono(String(totalCmds))}`,
      `Known users: ${mono(String(totalUsers))}`,
      `Known groups: ${mono(String(totalGroups))}`,
      `Audit entries: ${mono(String(auditCount))}`,
      '',
      bold('Top 5 commands:'),
      ...topCmds.map((r) => `  .${r.command}: ${r.c}`),
      '',
      `${bold('Uptime:')} ${Math.floor((Date.now() - config.STARTED_AT) / 1000)}s`,
    ];
    await ctx.reply(lines.join('\n'));
  },
};
