export default {
  name: 'dice',
  aliases: ['roll'],
  category: 'fun',
  description: 'Roll one or more dice. .dice 2d6',
  usage: '.dice [NdM]',
  async execute(ctx) {
    const spec = (ctx.args[0] || '1d6').toLowerCase();
    const m = /^(\d{1,2})d(\d{1,3})$/.exec(spec);
    if (!m) return ctx.reply('Usage: .dice 2d6');
    const n = Math.min(parseInt(m[1]), 20);
    const sides = Math.min(parseInt(m[2]), 1000);
    const rolls = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * sides));
    const sum = rolls.reduce((a, b) => a + b, 0);
    await ctx.reply(`🎲 ${n}d${sides}: [${rolls.join(', ')}] = *${sum}*`);
  },
};
