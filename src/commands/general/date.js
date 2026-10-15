export default {
  name: 'date',
  aliases: ['today'],
  category: 'general',
  description: 'Show the current date.',
  usage: '.date',
  async execute(ctx) {
    await ctx.reply(`📅 ${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  },
};
