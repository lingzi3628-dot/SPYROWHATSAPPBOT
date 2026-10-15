import axios from 'axios';
import { sanitize } from '../../security.js';

export default {
  name: 'define',
  aliases: ['dict', 'dictionary'],
  category: 'tools',
  description: 'Get the dictionary definition of a word.',
  usage: '.define <word>',
  cooldown: 5,
  async execute(ctx) {
    const word = sanitize(ctx.args[0] || '');
    if (!word) return ctx.reply('Usage: .define <word>');
    try {
      const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { timeout: 10_000 });
      const entry = res.data?.[0];
      if (!entry) return ctx.reply('No definition found.');
      const lines = [`📚 *${entry.word}*`];
      for (const m of entry.meanings?.slice(0, 3) || []) {
        lines.push(`\n*${m.partOfSpeech}*`);
        for (const d of m.definitions?.slice(0, 2) || []) {
          lines.push(`• ${d.definition}`);
        }
      }
      await ctx.replyLong(lines.join('\n'));
    } catch (err) {
      if (err?.response?.status === 404) return ctx.reply('No definition found.');
      await ctx.replyError(`Define failed: ${err.message || err}`);
    }
  },
};
