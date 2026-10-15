import { getUsageStats } from '../../services/ai-limiter.js';
import { bold, mono, italic } from '../../utils/text.js';

export default {
  name: 'aistats',
  aliases: ['usage', 'ailimit'],
  category: 'tools',
  description: 'Check your AI usage stats (30/day limit).',
  usage: '.aistats',
  async execute(ctx) {
    const stats = getUsageStats(ctx.chatId);
    const percent = Math.round((stats.used / stats.limit) * 100);
    const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
    const resetTime = new Date(stats.resetsAt).toLocaleString();

    await ctx.reply(
      `${bold('📊 AI Usage Stats')}\n${'━'.repeat(30)}\n\n` +
      `${bold('Used today:')}     ${mono(stats.used + '/' + stats.limit)}\n` +
      `${bold('Remaining:')}      ${mono(String(stats.remaining))}\n` +
      `${bold('Resets at:')}      ${mono(resetTime)}\n\n` +
      `${mono(bar)} ${percent}%\n\n` +
      `${italic('_Limit resets at midnight every day_')}\n` +
      `${italic('_30 free AI requests per day_')}`
    );
  },
};
