import axios from 'axios';
import { bold, mono, italic } from '../../utils/text.js';
import { sanitize } from '../../security.js';

export default {
  name: 'anime',
  aliases: ['animeinfo', 'ani'],
  category: 'fun',
  description: 'Get anime character/series info.',
  usage: '.anime <name>',
  cooldown: 5,
  async execute(ctx) {
    const query = sanitize(ctx.body || '');
    if (!query) return ctx.reply('Usage: .anime <name>\nExample: .anime Naruto');
    
    try {
      const res = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`, { timeout: 15000 });
      const anime = res.data?.data?.[0];
      if (!anime) return ctx.replyError('Anime not found.');
      
      let out = `${bold('📺 ' + anime.title)}`;
      if (anime.title_japanese) out += `\n${mono(anime.title_japanese)}`;
      out += `\n\n${bold('Score:')} ${mono(String(anime.score || 'N/A'))}`;
      out += `\n${bold('Episodes:')} ${mono(String(anime.episodes || 'N/A'))}`;
      out += `\n${bold('Status:')} ${mono(anime.status || 'N/A')}`;
      out += `\n${bold('Year:')} ${mono(String(anime.year || 'N/A'))}`;
      if (anime.synopsis) out += `\n\n${italic(anime.synopsis.slice(0, 300))}`;
      if (anime.images?.jpg?.image_url) {
        const imgRes = await axios.get(anime.images.jpg.image_url, { responseType: 'arraybuffer', timeout: 10000 });
        return ctx.sock.sendMessage(ctx.chatId, { image: Buffer.from(imgRes.data), caption: out });
      }
      await ctx.replyLong(out);
    } catch (err) {
      await ctx.replyError(`Anime search failed: ${err.message}`);
    }
  },
};
