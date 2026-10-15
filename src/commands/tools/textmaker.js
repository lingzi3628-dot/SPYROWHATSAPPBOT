import axios from 'axios';
import { bold, mono } from '../../utils/text.js';
import { sanitize } from '../../security.js';

const STYLES = {
  'neon': 'https://api.lolhuman.xyz/api/textprome/neon?apikey=85faf717d0545d14074659ad&text=',
  'glitch': 'https://api.lolhuman.xyz/api/textprome/glitch?apikey=85faf717d0545d14074659ad&text=',
  'fire': 'https://api.lolhuman.xyz/api/textprome/luxury?apikey=85faf717d0545d14074659ad&text=',
  'ice': 'https://api.lolhuman.xyz/api/textprome/ice?apikey=85faf717d0545d14074659ad&text=',
  'gold': 'https://api.lolhuman.xyz/api/textprome/gold?apikey=85faf717d0545d14074659ad&text=',
  'halloween': 'https://api.lolhuman.xyz/api/textprome/halloween?apikey=85faf717d0545d14074659ad&text=',
  '3d': 'https://api.lolhuman.xyz/api/textprome/3dbox?apikey=85faf717d0545d14074659ad&text=',
  'comic': 'https://api.lolhuman.xyz/api/textprome/comic?apikey=85faf717d0545d14074659ad&text=',
};

export default {
  name: 'textmaker',
  aliases: ['tm', 'logo', 'textlogo'],
  category: 'tools',
  description: 'Create stylish text logos. Available styles: neon, glitch, fire, ice, gold, halloween, 3d, comic',
  usage: '.textmaker <style> <text>',
  cooldown: 10,
  async execute(ctx) {
    const style = (ctx.args[0] || '').toLowerCase();
    const text = sanitize(ctx.body?.split(' ').slice(1).join(' ') || '').slice(0, 50);
    
    if (!style || !text) {
      return ctx.reply(
        `${bold('🎨 Text Maker')}\n\n` +
        `Usage: ${mono('.textmaker <style> <text>')}\n\n` +
        `Styles: ${mono(Object.keys(STYLES).join(', '))}\n\n` +
        `Example: ${mono('.textmaker neon SPYRO')}`
      );
    }
    
    const templateUrl = STYLES[style];
    if (!templateUrl) return ctx.replyError(`Unknown style. Available: ${Object.keys(STYLES).join(', ')}`);
    
    await ctx.reply('🎨 Creating text logo...');
    try {
      const url = templateUrl + encodeURIComponent(text);
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000, maxContentLength: 5 * 1024 * 1024 });
      await ctx.sock.sendMessage(ctx.chatId, {
        image: Buffer.from(res.data),
        caption: `🎨 ${bold(style.toUpperCase())} style: ${text}`,
      });
    } catch (err) {
      await ctx.replyError(`Text maker failed: ${err.message}`);
    }
  },
};
