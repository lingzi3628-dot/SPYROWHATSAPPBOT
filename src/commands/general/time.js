export default {
  name: 'time',
  aliases: ['clock'],
  category: 'general',
  description: 'Show the current time.',
  usage: '.time',
  async execute(ctx) {
    const now = new Date();
    await ctx.reply(`🕐 ${now.toLocaleTimeString()}\nTimezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
  },
};
