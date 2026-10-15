import axios from 'axios';
import { sanitize } from '../../security.js';

export default {
  name: 'currency',
  aliases: ['fx'],
  category: 'tools',
  description: 'Convert currency. Format: <amount> <from> <to>  e.g. .currency 10 USD EUR',
  usage: '.currency <amount> <from> <to>',
  cooldown: 5,
  async execute(ctx) {
    const [amt, from, to] = ctx.args;
    if (!amt || !from || !to) return ctx.reply('Usage: .currency 10 USD EUR');
    const n = Number(amt);
    if (!Number.isFinite(n)) return ctx.replyError('Amount must be a number.');
    try {
      const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(from.toUpperCase())}`;
      const res = await axios.get(url, { timeout: 10_000 });
      const rate = res.data?.rates?.[to.toUpperCase()];
      if (!rate) return ctx.replyError('Currency not supported.');
      const out = (n * rate).toFixed(4);
      await ctx.reply(`💱 ${n} ${from.toUpperCase()} = *${out} ${to.toUpperCase()}*`);
    } catch (err) {
      await ctx.replyError(`Currency failed: ${err.message || err}`);
    }
  },
};
