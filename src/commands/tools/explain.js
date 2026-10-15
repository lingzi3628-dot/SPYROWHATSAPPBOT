import { completeWithLimit } from '../../services/ai.js';
import { sanitize } from '../../security.js';

export default {
  name: 'explain',
  aliases: ['elaborate'],
  category: 'tools',
  description: 'Ask the AI to explain something — FREE, no API key needed!',
  usage: '.explain <topic or text>',
  cooldown: 10,
  async execute(ctx) {
    const t = sanitize(ctx.body || '');
    if (!t) return ctx.reply('Usage: .explain <topic>\nExample: .explain quantum computing');
    await ctx.reply('🤖 Explaining… (free AI)');
    try {
      const result = await completeWithLimit(ctx.chatId, `Explain this clearly and concisely:\n\n${t}`, {
        system: 'You are a helpful assistant. Keep it under 200 words.',
      });
      if (!result.ok) return ctx.reply(result.error);
      await ctx.replyLong(result.reply || '(no response)');
    } catch (err) {
      await ctx.replyError(`Explain failed: ${err.message || err}`);
    }
  },
};
