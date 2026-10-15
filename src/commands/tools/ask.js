import { completeWithLimit } from '../../services/ai.js';
import { sanitize } from '../../security.js';
import { bold, mono, italic } from '../../utils/text.js';

export default {
  name: 'ask',
  aliases: ['question', 'q'],
  category: 'tools',
  description: 'Ask the AI a question — FREE, no API key needed! (30/day limit)',
  usage: '.ask <question>',
  cooldown: 10,
  async execute(ctx) {
    const prompt = sanitize(ctx.body || '');
    if (!prompt) {
      return ctx.reply(
        `${bold('🤖 AI Q&A (FREE — no API key!)')}\n\n` +
        `Usage: ${mono('.ask <question>')}\n\n` +
        `Examples:\n` +
        `• ${mono('.ask What is the capital of France?')}\n` +
        `• ${mono('.ask How do I cook rice?')}\n\n` +
        `${italic('_30 AI requests per day — resets at midnight_')}`
      );
    }
    await ctx.reply('🤖 Thinking… (free AI)');
    try {
      const result = await completeWithLimit(ctx.chatId, prompt);
      if (!result.ok) return ctx.reply(result.error);
      let response = result.reply || '(no response)';
      if (result.remaining <= 5) {
        response += `\n\n${italic(`_⚠️ ${result.remaining} AI requests left today_`)}`;
      }
      await ctx.replyLong(response);
    } catch (err) {
      await ctx.replyError(`AI failed: ${err.message || err}`);
    }
  },
};
