import { generateImage, generateImageUrl } from '../../services/pollination.js';
import { sanitize } from '../../security.js';
import logger from '../../logger.js';

export default {
  name: 'imagine',
  aliases: ['draw', 'img', 'gen', 'ai-image'],
  category: 'tools',
  description: 'Generate an image from text — FREE, no API key needed (Pollination AI).',
  usage: '.imagine <prompt>',
  cooldown: 15,
  async execute(ctx) {
    const prompt = sanitize(ctx.body || '').slice(0, 1000);
    if (!prompt) {
      return ctx.reply(
        '🎨 *Image Generation (Pollination AI — free!)*\n\n' +
        'Usage: `.imagine <prompt>`\n\n' +
        'Examples:\n' +
        '• `.imagine a dragon flying over a cyberpunk city`\n' +
        '• `.imagine a cute cat astronaut in space`\n' +
        '• `.imagine abstract art with blue and gold`\n\n' +
        'No API key required — uses pollinations.ai'
      );
    }
    await ctx.reply('🎨 Generating image with Pollination AI… (may take 10-30s)');
    try {
      const buf = await generateImage(prompt, { width: 1024, height: 1024 });
      await ctx.sock.sendMessage(ctx.chatId, {
        image: buf,
        caption: `🎨 *${prompt.slice(0, 200)}*\n\n_Powered by Pollination AI (free, no key needed)_`,
      });
    } catch (err) {
      logger.error({ err: err.message }, 'pollination image gen failed');
      await ctx.replyError(`Image generation failed: ${err.message || err}. Try a simpler prompt.`);
    }
  },
};
