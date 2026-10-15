import { completeWithLimit } from '../../services/ai.js';
import { sanitize } from '../../security.js';

export default {
  name: 'code',
  aliases: ['codeme', 'programming'],
  category: 'tools',
  description: 'Ask the AI to write code — FREE, no API key needed!',
  usage: '.code <request>',
  cooldown: 12,
  async execute(ctx) {
    const t = sanitize(ctx.body || '');
    if (!t) return ctx.reply('Usage: .code <request>\nExample: .code Python function to reverse a string');
    await ctx.reply('🤖 Coding… (free AI)');
    try {
      const result = await completeWithLimit(ctx.chatId, `Write code for the following request. Use markdown code blocks.\n\n${t}`, {
        system: 'You are an expert programmer. Always wrap code in fenced code blocks. Keep explanations brief.',
      });
      if (!result.ok) return ctx.reply(result.error);
      await ctx.replyLong(result.reply || '(no response)');
    } catch (err) {
      await ctx.replyError(`Code failed: ${err.message || err}`);
    }
  },
};
