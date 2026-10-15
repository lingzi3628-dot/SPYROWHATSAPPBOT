import config from '../../config.js';

export default {
  name: 'support',
  aliases: ['support'],
  category: 'general',
  description: 'Show support information.',
  usage: '.support',
  async execute(ctx) {
    await ctx.reply(`🆘 *Support*\n\n${config.SUPPORT_INFO}\n\nOwner: ${config.OWNER_JID ? '+' + config.OWNER_JID.split('@')[0] : 'not set'}`);
  },
};
