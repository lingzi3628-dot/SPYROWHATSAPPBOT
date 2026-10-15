export default {
  name: 'pluginlist',
  aliases: ['plugins', 'cmdlist'],
  category: 'general',
  description: 'List loaded plugins and commands.',
  usage: '.pluginlist',
  async execute(ctx) {
    const cmds = [...ctx.commands.values()];
    const byCat = new Map();
    for (const c of cmds) {
      const arr = byCat.get(c.category) || [];
      arr.push(c.name);
      byCat.set(c.category, arr);
    }
    const lines = ['📦 *Loaded commands:*'];
    for (const [cat, list] of byCat) {
      lines.push(`\n*${cat}* (${list.length})`);
      lines.push(list.map((n) => '.' + n).join(', '));
    }
    await ctx.replyLong(lines.join('\n'));
  },
};
