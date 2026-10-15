import axios from 'axios';
import { bold, mono } from '../../utils/text.js';
import { isSafeHttpUrl } from '../../security.js';

export default {
  name: 'facebook',
  aliases: ['fb', 'fbdl'],
  category: 'media',
  description: 'Download Facebook videos.',
  usage: '.facebook <url>',
  cooldown: 10,
  async execute(ctx) {
    const url = (ctx.body || '').trim();
    if (!url || !isSafeHttpUrl(url)) return ctx.reply('Usage: .facebook <facebook video url>');
    if (!url.includes('facebook.com') && !url.includes('fb.watch')) return ctx.replyError('That is not a Facebook link.');
    
    await ctx.reply('⬇️ Downloading Facebook video...');
    try {
      const api = `https://api.fbdl.jsongod.com/api?url=${encodeURIComponent(url)}`;
      const res = await axios.get(api, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const videoUrl = res.data?.video?.hd || res.data?.video?.sd || res.data?.links?.[0]?.url || res.data?.url;
      if (!videoUrl) return ctx.replyError('Could not extract video from this Facebook post.');
      
      const mediaRes = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 90000, maxContentLength: 100 * 1024 * 1024 });
      await ctx.sock.sendMessage(ctx.chatId, {
        video: Buffer.from(mediaRes.data),
        caption: bold('🎬 Facebook video downloaded'),
      });
    } catch (err) {
      await ctx.replyError(`Facebook download failed: ${err.message}`);
    }
  },
};
