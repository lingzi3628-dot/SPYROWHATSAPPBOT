import axios from 'axios';
import config from '../../config.js';
import { isSafeHttpUrl, sanitize } from '../../security.js';

export default {
  name: 'shorten',
  aliases: ['short', 'tinyurl'],
  category: 'tools',
  description: 'Shorten a URL using is.gd (no key required) or TinyURL.',
  usage: '.shorten <url>',
  cooldown: 5,
  async execute(ctx) {
    const url = sanitize(ctx.body || '');
    if (!isSafeHttpUrl(url)) return ctx.replyError('Provide a valid http(s) URL.');
    try {
      const res = await axios.get(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`, { timeout: 10_000 });
      await ctx.reply(`🔗 ${res.data}`);
    } catch (err) {
      await ctx.replyError(`Shorten failed: ${err.message || err}`);
    }
  },
};
