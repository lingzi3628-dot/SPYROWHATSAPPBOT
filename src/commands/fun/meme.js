import axios from 'axios';
import config from '../../config.js';

export default {
  name: 'meme',
  aliases: ['memes'],
  category: 'fun',
  description: 'Get a random meme image.',
  usage: '.meme [subreddit]',
  cooldown: 3,
  async execute(ctx) {
    const sub = ctx.args[0] ? `/${ctx.args[0]}` : '';
    try {
      const res = await axios.get(`${config.MEME_API_BASE}${sub}`, { timeout: 10_000 });
      const d = res.data || {};
      if (!d.url) return ctx.replyError('No meme available right now.');
      const img = await axios.get(d.url, { responseType: 'arraybuffer', timeout: 15_000 });
      await ctx.sock.sendMessage(ctx.chatId, {
        image: Buffer.from(img.data),
        caption: `😂 ${d.title || ''}\nr/${d.subreddit || 'memes'}`,
      });
    } catch (err) {
      await ctx.replyError(`Meme failed: ${err.message || err}`);
    }
  },
};
