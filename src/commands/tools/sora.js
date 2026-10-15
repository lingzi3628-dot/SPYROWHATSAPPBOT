import axios from 'axios';
import { bold, mono, italic } from '../../utils/text.js';
import { sanitize } from '../../security.js';

export default {
  name: 'sora',
  aliases: ['aivideo', 'genvideo'],
  category: 'tools',
  description: 'Generate a short video from text (AI-powered).',
  usage: '.sora <prompt>',
  cooldown: 30,
  async execute(ctx) {
    const prompt = sanitize(ctx.body || '').slice(0, 500);
    if (!prompt) return ctx.reply('Usage: .sora <prompt>\nExample: .sora a cat playing piano');
    
    await ctx.reply('🎬 Generating AI video... (may take 30-60s)');
    try {
      // Use Pollinations-style API or alternative
      const res = await axios.post('https://api.pollinations.ai/v1/generate/video', {
        prompt,
        duration: 3,
      }, { timeout: 90000, headers: { 'User-Agent': 'SpyroBot/1.0' } });
      
      const videoUrl = res.data?.url || res.data?.video;
      if (!videoUrl) return ctx.replyError('Video generation API returned no URL.');
      
      const mediaRes = await axios.get(videoUrl, { responseType: 'arraybuffer', timeout: 60000, maxContentLength: 50 * 1024 * 1024 });
      await ctx.sock.sendMessage(ctx.chatId, {
        video: Buffer.from(mediaRes.data),
        caption: `🎬 AI video: ${bold(prompt)}`,
      });
    } catch (err) {
      await ctx.replyError(`Video generation failed: ${err.message}. This is an experimental feature.`);
    }
  },
};
