import axios from 'axios';
import { sanitize } from '../../security.js';

export default {
  name: 'wiki',
  aliases: ['wikipedia'],
  category: 'tools',
  description: 'Search Wikipedia and return a short extract.',
  usage: '.wiki <query>',
  cooldown: 5,
  async execute(ctx) {
    const q = sanitize(ctx.body || '');
    if (!q) return ctx.reply('Usage: .wiki <query>');
    try {
      const search = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&utf8=`, { timeout: 10_000 });
      const hit = search.data?.query?.search?.[0];
      if (!hit) return ctx.reply('No Wikipedia article found.');
      const res = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title)}`, { timeout: 10_000 });
      const d = res.data || {};
      const lines = [
        `📚 *${d.title || hit.title}*`,
        d.extract || '(no extract available)',
        d.content_urls?.desktop?.page ? `\n🔗 ${d.content_urls.desktop.page}` : '',
      ].filter(Boolean);
      await ctx.replyLong(lines.join('\n'));
    } catch (err) {
      await ctx.replyError(`Wiki failed: ${err.message || err}`);
    }
  },
};
