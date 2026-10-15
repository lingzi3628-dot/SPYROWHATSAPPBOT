import { completeWithLimit } from '../../services/ai.js';
import { sanitize } from '../../security.js';

export default {
  name: 'rewrite',
  aliases: ['polish'],
  category: 'tools',
  description: 'Ask the AI to rewrite text — FREE, no API key needed!',
  usage: '.rewrite <text>',
  cooldown: 10,
  async execute(ctx) {
    const t = sanitize(ctx.body || '');
    if (!t) return ctx.reply('Usage: .rewrite <text>');
    await ctx.reply('🤖 Rewriting… (free AI)');
    try {
      const result = await completeWithLimit(ctx.chatId, `Rewrite the following to be clearer and more polished:\n\n${t}`);
      if (!result.ok) return ctx.reply(result.error);
      await ctx.replyLong(result.reply || '(no response)');
    } catch (err) {
      await ctx.replyError(`Rewrite failed: ${err.message || err}`);
    }
  },
};
