import axios from 'axios';
import { bold, mono } from '../../utils/text.js';
import { isSafeHttpUrl } from '../../security.js';

export default {
  name: 'instagram',
  aliases: ['ig', 'igdl', 'igs'],
  category: 'media',
  description: 'Download Instagram posts, reels, and stories.',
  usage: '.instagram <url>',
  cooldown: 10,
  async execute(ctx) {
    const url = (ctx.body || '').trim();
    if (!url || !isSafeHttpUrl(url)) return ctx.reply('Usage: .instagram <instagram url>');
    if (!url.includes('instagram.com')) return ctx.replyError('That is not an Instagram link.');
    
    await ctx.reply('⬇️ Downloading Instagram media...');
    try {
      const api = `https://api.igdl.jsongod.com/api?url=${encodeURIComponent(url)}`;
      const res = await axios.get(api, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const mediaList = res.data?.media || res.data?.data || [];
      if (!mediaList.length) return ctx.replyError('No media found at that URL.');
      
      await ctx.reply(`Found ${mediaList.length} media item(s). Sending...`);
      for (const item of mediaList.slice(0, 10)) {
        try {
          const mediaUrl = item.url || item.link || item.download;
          if (!mediaUrl) continue;
          const mediaRes = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 60000, maxContentLength: 50 * 1024 * 1024 });
          const buf = Buffer.from(mediaRes.data);
          const isVideo = item.type === 'video' || mediaUrl.includes('.mp4');
          if (isVideo) {
            await ctx.sock.sendMessage(ctx.chatId, { video: buf, caption: bold('🎬 Instagram video') });
          } else {
            await ctx.sock.sendMessage(ctx.chatId, { image: buf, caption: bold('🖼️ Instagram photo') });
          }
        } catch {}
      }
    } catch (err) {
      await ctx.replyError(`Instagram download failed: ${err.message}`);
    }
  },
};
