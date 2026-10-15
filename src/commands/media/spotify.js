import axios from 'axios';
import { bold, mono } from '../../utils/text.js';
import { sanitize } from '../../security.js';

export default {
  name: 'spotify',
  aliases: ['spdl', 'spotifysong'],
  category: 'media',
  description: 'Search and download Spotify tracks.',
  usage: '.spotify <song name>',
  cooldown: 15,
  async execute(ctx) {
    const query = sanitize(ctx.body || '');
    if (!query) return ctx.reply('Usage: .spotify <song name>\nExample: .spotify blinding lights');
    
    await ctx.reply(`🔍 Searching Spotify for "${query}"...`);
    try {
      const searchApi = `https://api.fabdl.com/spotify/search?q=${encodeURIComponent(query)}`;
      const searchRes = await axios.get(searchApi, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const track = searchRes.data?.result?.[0];
      if (!track) return ctx.replyError('No tracks found.');
      
      await ctx.reply(`⬇️ Downloading: ${bold(track.name)} by ${track.artists}`);
      
      const dlApi = `https://api.fabdl.com/spotify/download?id=${track.id}`;
      const dlRes = await axios.get(dlApi, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const downloadUrl = dlRes.data?.result?.download_url;
      if (!downloadUrl) return ctx.replyError('Download URL not available for this track.');
      
      const mediaRes = await axios.get(`https://api.fabdl.com${downloadUrl}`, { responseType: 'arraybuffer', timeout: 60000, maxContentLength: 30 * 1024 * 1024 });
      await ctx.sock.sendMessage(ctx.chatId, {
        audio: Buffer.from(mediaRes.data),
        mimetype: 'audio/mpeg',
        fileName: `${track.name}.mp3`,
        caption: `🎵 ${bold(track.name)}\n👤 ${mono(track.artists)}`,
      });
    } catch (err) {
      await ctx.replyError(`Spotify download failed: ${err.message}`);
    }
  },
};
