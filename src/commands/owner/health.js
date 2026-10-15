import connection from '../../connection.js';
import config from '../../config.js';
import { bold, mono } from '../../utils/text.js';
import { db } from '../../database.js';

export default {
  name: 'health',
  aliases: ['diagnostics'],
  category: 'general',
  description: 'Run a quick health check.',
  usage: '.health',
  async execute(ctx) {
    const st = connection.status();
    const uptime = Math.floor((Date.now() - config.STARTED_AT) / 1000);
    const mem = process.memoryUsage();
    const totalCmds = db.prepare('SELECT COUNT(*) as c FROM command_stats').get().c;
    const lines = [
      bold('🩺 Health check'),
      `${bold('Connection:')} ${st.status} (${st.reconnectAttempts} reconnects)`,
      `${bold('User:')} ${st.user || '—'}`,
      `${bold('Baileys:')} ${mono(st.baileysVersion?.join('.') || 'n/a')}`,
      `${bold('Uptime:')} ${uptime}s`,
      `${bold('Memory (RSS):')} ${(mem.rss / 1024 / 1024).toFixed(1)} MB`,
      `${bold('Heap used:')} ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`,
      `${bold('Commands loaded:')} ${mono(String(ctx.commands.size))}`,
      `${bold('Total cmd runs:')} ${mono(String(totalCmds))}`,
      `${bold('Node:')} ${mono(process.version)}`,
      `${bold('Platform:')} ${mono(process.platform)}`,
    ];
    await ctx.reply(lines.join('\n'));
  },
};
