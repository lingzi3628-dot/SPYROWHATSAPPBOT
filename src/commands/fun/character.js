import axios from 'axios';
import { bold, mono, italic } from '../../utils/text.js';

export default {
  name: 'character',
  aliases: ['char', 'waifu', 'randomchar'],
  category: 'fun',
  description: 'Get a random anime character.',
  usage: '.character',
  cooldown: 5,
  async execute(ctx) {
    try {
      const res = await axios.get('https://api.jikan.moe/v4/random/characters', { timeout: 15000 });
      const char = res.data?.data;
      if (!char) return ctx.replyError('Could not fetch a character.');
      
      let out = `${bold('👤 ' + char.name)}`;
      if (char.name_kanji) out += `\n${mono(char.name_kanji)}`;
      if (char.about) out += `\n\n${italic(char.about.slice(0, 300))}`;
      
      if (char.images?.jpg?.image_url) {
        const imgRes = await axios.get(char.images.jpg.image_url, { responseType: 'arraybuffer', timeout: 10000 });
        return ctx.sock.sendMessage(ctx.chatId, { image: Buffer.from(imgRes.data), caption: out });
      }
      await ctx.replyLong(out);
    } catch (err) {
      await ctx.replyError(`Character fetch failed: ${err.message}`);
    }
  },
};
