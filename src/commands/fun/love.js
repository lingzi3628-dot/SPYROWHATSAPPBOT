export default {
  name: 'love',
  aliases: ['lovecalc'],
  category: 'fun',
  description: 'Calculate love compatibility between two names.',
  usage: '.love <name1> <name2>',
  async execute(ctx) {
    const [a, b] = ctx.args;
    if (!a || !b) return ctx.reply('Usage: .love Alice Bob');
    const seed = (a + b).toLowerCase().split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    const pct = (seed * 7) % 101;
    let bar;
    if (pct >= 80) bar = '💖💖💖💖💖';
    else if (pct >= 60) bar = '💖💖💖💖';
    else if (pct >= 40) bar = '💖💖💖';
    else if (pct >= 20) bar = '💖💖';
    else bar = '💔';
    await ctx.reply(`❤️ *Love calculator*\n\n${a} 💞 ${b}\nCompatibility: *${pct}%*\n${bar}`);
  },
};
