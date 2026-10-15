import config from '../../config.js';

export default {
  name: 'runtime',
  aliases: ['uptime'],
  category: 'general',
  description: 'Show formatted bot uptime.',
  usage: '.runtime',
  async execute(ctx) {
    const ms = Date.now() - config.STARTED_AT;
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    await ctx.reply(`⏱️ Runtime: *${d}d ${h}h ${m}m ${sec}s*`);
  },
};
