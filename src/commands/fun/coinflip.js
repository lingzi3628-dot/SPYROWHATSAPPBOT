export default {
  name: 'coinflip',
  aliases: ['flip', 'coin'],
  category: 'fun',
  description: 'Flip a coin.',
  usage: '.coinflip',
  async execute(ctx) {
    const r = Math.random() < 0.5 ? 'Heads' : 'Tails';
    await ctx.reply(`🪙 ${r}`);
  },
};
