import axios from 'axios';
import config from '../../config.js';

export default {
  name: 'joke',
  aliases: ['jokes'],
  category: 'fun',
  description: 'Get a random joke.',
  usage: '.joke',
  cooldown: 3,
  async execute(ctx) {
    try {
      const res = await axios.get(`${config.JOKE_API_BASE}/joke/Any?safe`, { timeout: 10_000 });
      const d = res.data || {};
      if (d.type === 'twopart') {
        await ctx.reply(`${d.setup}\n\n${d.delivery}`);
      } else {
        await ctx.reply(d.joke || 'No joke available right now.');
      }
    } catch (err) {
      await ctx.replyError(`Joke failed: ${err.message || err}`);
    }
  },
};
