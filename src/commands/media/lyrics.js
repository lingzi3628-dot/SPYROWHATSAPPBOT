import axios from 'axios';
import { bold, mono, italic } from '../../utils/text.js';
import { sanitize } from '../../security.js';

export default {
  name: 'lyrics',
  aliases: ['lyric'],
  category: 'media',
  description: 'Get song lyrics.',
  usage: '.lyrics <song name>',
  cooldown: 5,
  async execute(ctx) {
    const query = sanitize(ctx.body || '');
    if (!query) return ctx.reply('Usage: .lyrics <song name>\nExample: .lyrics bohemian rhapsody');
    
    try {
      const api = `https://lyricsapi.fly.dev/api/lyrics?q=${encodeURIComponent(query)}`;
      const res = await axios.get(api, { timeout: 15000 });
      if (!res.data?.lyrics) return ctx.replyError('Lyrics not found for that song.');
      
      const title = res.data?.title || query;
      const artist = res.data?.artist || 'Unknown';
      const lyrics = res.data.lyrics;
      
      await ctx.replyLong(`${bold('🎵 ' + title)}\n${mono('by ' + artist)}\n\n${lyrics}`);
    } catch (err) {
      await ctx.replyError(`Lyrics search failed: ${err.message}`);
    }
  },
};
