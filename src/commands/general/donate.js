import config from '../../config.js';

export default {
  name: 'donate',
  aliases: ['tip', 'coffee'],
  category: 'general',
  description: 'Show donation information.',
  usage: '.donate',
  async execute(ctx) {
    await ctx.reply(`💚 *Support the bot*\n\n${config.DONATE_INFO}`);
  },
};
