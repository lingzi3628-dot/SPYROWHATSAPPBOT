import { sanitize } from '../../utils/text.js';

function safeEval(expr) {
  // only allow numbers, operators, parentheses, decimal points, whitespace
  if (!/^[-+/*().\d\s%]+$/.test(expr)) throw new Error('Invalid characters in expression');
  // eslint-disable-next-line no-new-func
  const fn = new Function(`"use strict"; return (${expr});`);
  const r = fn();
  if (!Number.isFinite(r)) throw new Error('Result is not a finite number');
  return r;
}

export default {
  name: 'calc',
  aliases: ['calculate'],
  category: 'tools',
  description: 'Evaluate a basic arithmetic expression.',
  usage: '.calc <expression>',
  async execute(ctx) {
    const expr = sanitize(ctx.body || '');
    if (!expr) return ctx.reply('Usage: .calc 1 + 2 * 3');
    try {
      const r = safeEval(expr);
      await ctx.reply(`🧮 ${expr} = *${r}*`);
    } catch (err) {
      await ctx.replyError(`Could not calculate: ${err.message || err}`);
    }
  },
};
