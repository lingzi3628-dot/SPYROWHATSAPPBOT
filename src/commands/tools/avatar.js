import { generateImage } from '../../services/pollination.js';
import { sanitize } from '../../security.js';
import logger from '../../logger.js';

export default {
  name: 'avatar',
  aliases: ['pfp', 'profilepic', 'logo'],
  category: 'tools',
  description: 'Generate a custom avatar/profile picture from text — FREE (Pollination AI).',
  usage: '.avatar <description>',
  cooldown: 15,
  async execute(ctx) {
    const desc = sanitize(ctx.body || '').slice(0, 500);
    if (!desc) {
      return ctx.reply(
        '🧑‍🎨 *Avatar Generator (Pollination AI — free!)*\n\n' +
        'Usage: `.avatar <description>`\n\n' +
        'Examples:\n' +
        '• `.avatar cyberpunk hacker with neon mask`\n' +
        '• `.avatar cute fox mascot for a gaming clan`\n' +
        '• `.avatar minimalist logo for a coffee shop`\n\n' +
        'Generates a 512x512 profile-picture-style image.'
      );
    }
    await ctx.reply('🧑‍🎨 Generating avatar… (10-30s)');
    try {
      const prompt = `professional avatar, ${desc}, digital art, high quality, centered, vibrant colors, profile picture style`;
      const buf = await generateImage(prompt, { width: 512, height: 512 });
      await ctx.sock.sendMessage(ctx.chatId, {
        image: buf,
        caption: `🧑‍🎨 *Avatar: ${desc.slice(0, 100)}*\n\n_Powered by Pollination AI_`,
      });
    } catch (err) {
      logger.error({ err: err.message }, 'avatar generation failed');
      await ctx.replyError(`Avatar generation failed: ${err.message || err}`);
    }
  },
};
