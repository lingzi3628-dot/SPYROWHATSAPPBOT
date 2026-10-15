import axios from 'axios';
import { bold, mono } from '../../utils/text.js';

export default {
  name: 'emojimix',
  aliases: ['emix', 'mixemoji'],
  category: 'fun',
  description: 'Combine two emojis into one!',
  usage: '.emojimix 🐱+🐶',
  cooldown: 5,
  async execute(ctx) {
    const input = (ctx.body || '').trim();
    if (!input || !input.includes('+')) return ctx.reply('Usage: .emojimix 🐱+🐶');
    
    const [e1, e2] = input.split('+').map(e => e.trim());
    if (!e1 || !e2) return ctx.reply('Usage: .emojimix 🐱+🐶');
    
    try {
      // Use the emoji codepoints
      const code1 = [...e1].map(c => c.codePointAt(0).toString(16)).join('-');
      const code2 = [...e2].map(c => c.codePointAt(0).toString(16)).join('-');
      const url = `https://api.lolhuman.xyz/api/emojimix/${code1}_${code2}?apikey=85faf717d0545d14074659ad`;
      
      const res = await axios.get(url, { timeout: 10000 });
      const imgUrl = res.data?.result?.url;
      if (!imgUrl) return ctx.replyError('Could not mix those emojis. Try different ones.');
      
      const imgRes = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 10000 });
      await ctx.sock.sendMessage(ctx.chatId, {
        image: Buffer.from(imgRes.data),
        caption: `${bold('🎨 Emoji Mix')} ${e1} + ${e2}`,
      });
    } catch (err) {
      await ctx.replyError(`Emoji mix failed: ${err.message}. Try different emojis.`);
    }
  },
};
