export default {
  name: 'rate',
  aliases: ['rating'],
  category: 'fun',
  description: 'Rate something out of 10.',
  usage: '.rate <thing>',
  async execute(ctx) {
    const thing = ctx.body || 'that';
    const score = Math.floor(Math.random() * 11);
    const stars = '⭐'.repeat(score) + '☆'.repeat(10 - score);
    await ctx.reply(`📊 I rate *${thing}* ${score}/10\n${stars}`);
  },
};
