import yts from 'yt-search';
import axios from 'axios';
import { bold, mono, italic } from '../../utils/text.js';
import { sanitize } from '../../security.js';

export default {
  name: 'play',
  aliases: ['song', 'video', 'yt', 'youtube'],
  category: 'media',
  description: 'Search and download YouTube audio/video.',
  usage: '.play <song name> | .video <song name>',
  cooldown: 15,
  async execute(ctx) {
    const query = sanitize(ctx.body || '');
    if (!query) return ctx.reply('Usage: .play <song name>\nExample: .play despacito');
    
    const isVideo = ctx.commandName === 'video' || ctx.commandName === 'yt';
    await ctx.reply(`🔍 Searching YouTube for "${query}"...`);
    
    try {
      const { videos } = await yts(query);
      if (!videos?.length) return ctx.replyError('No results found.');
      
      const video = videos[0];
      await ctx.reply(`⬇️ Downloading: ${bold(video.title)}\n${mono(video.timestamp)} | ${mono(video.author.name)}`);
      
      // Use a public API for download
      const api = isVideo 
        ? `https://api.dl.yt-dl.jsongod.com/api?url=${encodeURIComponent(video.url)}&format=mp4`
        : `https://api.dl.yt-dl.jsongod.com/api?url=${encodeURIComponent(video.url)}&format=mp3`;
      
      const res = await axios.get(api, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const downloadUrl = res.data?.url || res.data?.links?.[0]?.url;
      
      if (!downloadUrl) {
        // Fallback: send info only
        return ctx.reply(
          `${bold('🎵 ' + video.title)}\n\n` +
          `⏱️ ${mono(video.timestamp)}\n` +
          `👤 ${mono(video.author.name)}\n` +
          `👀 ${mono(String(video.views))} views\n` +
          `🔗 ${mono(video.url)}\n\n` +
          `${italic('_Download API unavailable. Use the link to download manually._')}`
        );
      }
      
      const mediaRes = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60000, maxContentLength: 50 * 1024 * 1024 });
      const buffer = Buffer.from(mediaRes.data);
      
      if (isVideo) {
        await ctx.sock.sendMessage(ctx.chatId, { video: buffer, caption: `🎬 ${video.title}` });
      } else {
        await ctx.sock.sendMessage(ctx.chatId, { 
          audio: buffer, 
          mimetype: 'audio/mpeg', 
          fileName: `${video.title}.mp3`,
          caption: `🎵 ${video.title}`,
        });
      }
    } catch (err) {
      await ctx.replyError(`Download failed: ${err.message}. YouTube may be blocking the API.`);
    }
  },
};
