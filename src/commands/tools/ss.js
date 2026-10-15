import axios from 'axios';
import { bold, mono } from '../../utils/text.js';
import { isSafeHttpUrl } from '../../security.js';

export default {
  name: 'ss',
  aliases: ['screenshot', 'ssweb'],
  category: 'tools',
  description: 'Take a screenshot of any website.',
  usage: '.ss <url>',
  cooldown: 10,
  async execute(ctx) {
    const url = (ctx.body || '').trim();
    if (!url) return ctx.reply('Usage: .ss <url>\nExample: .ss https://google.com');
    if (!isSafeHttpUrl(url)) return ctx.replyError('Provide a valid HTTP(S) URL.');
    
    await ctx.reply('📸 Taking screenshot...');
    try {
      const apiUrl = `https://image.thum.io/get/width/800/crop/600/${url}`;
      const res = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 30000, maxContentLength: 10 * 1024 * 1024 });
      await ctx.sock.sendMessage(ctx.chatId, {
        image: Buffer.from(res.data),
        caption: `📸 Screenshot of ${mono(url)}`,
      });
    } catch (err) {
      await ctx.replyError(`Screenshot failed: ${err.message}`);
    }
  },
};
