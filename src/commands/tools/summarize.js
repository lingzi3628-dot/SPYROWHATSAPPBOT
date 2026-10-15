import { completeWithLimit } from '../../services/ai.js';
import { sanitize } from '../../security.js';

export default {
  name: 'summarize',
  aliases: ['summary', 'tldr'],
  category: 'tools',
  description: 'Ask the AI to summarize text — FREE, no API key needed!',
  usage: '.summarize <text>',
  cooldown: 10,
  async execute(ctx) {
    const t = sanitize(ctx.body || '');
    if (!t) return ctx.reply('Usage: .summarize <text>');
    await ctx.reply('🤖 Summarizing… (free AI)');
    try {
      const result = await completeWithLimit(ctx.chatId, `Summarize the following in 3-5 bullet points:\n\n${t}`);
      if (!result.ok) return ctx.reply(result.error);
      await ctx.replyLong(result.reply || '(no response)');
    } catch (err) {
      await ctx.replyError(`Summarize failed: ${err.message || err}`);
    }
  },
};
