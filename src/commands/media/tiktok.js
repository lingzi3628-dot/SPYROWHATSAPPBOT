import axios from 'axios';
import { bold, mono } from '../../utils/text.js';
import { isSafeHttpUrl } from '../../security.js';

export default {
  name: 'tiktok',
  aliases: ['tt', 'ttdl'],
  category: 'media',
  description: 'Download TikTok videos.',
  usage: '.tiktok <url>',
  cooldown: 10,
  async execute(ctx) {
    const url = (ctx.body || '').trim();
    if (!url || !isSafeHttpUrl(url)) return ctx.reply('Usage: .tiktok <tiktok url>\nExample: .tiktok https://vm.tiktok.com/xxx');
    if (!url.includes('tiktok.com')) return ctx.replyError('That is not a TikTok link.');
    
    await ctx.reply('⬇️ Downloading TikTok video...');
    try {
      const api = `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`;
      const res = await axios.get(api, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const videoUrl = res.data?.video?.noWatermark || res.data?.video?.wm || res.data?.play;
      if (!videoUrl) return ctx.replyError('Could not extract video from this TikTok.');
      
      const mediaRes = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 60000, maxContentLength: 50 * 1024 * 1024 });
      await ctx.sock.sendMessage(ctx.chatId, {
        video: Buffer.from(mediaRes.data),
        caption: bold('🎬 TikTok video downloaded'),
      });
    } catch (err) {
      await ctx.replyError(`TikTok download failed: ${err.message}`);
    }
  },
};
