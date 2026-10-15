export default {
  name: 'groups',
  aliases: ['grouplist'],
  category: 'owner',
  ownerOnly: true,
  description: 'List all groups the bot is in.',
  usage: '.groups',
  async execute(ctx) {
    let groups = [];
    try {
      groups = await ctx.sock.groupFetchAllParticipating();
    } catch (err) {
      return ctx.replyError(`Could not fetch groups: ${err.message || err}`);
    }
    const arr = Object.values(groups);
    if (!arr.length) return ctx.reply('Bot is not in any groups.');
    const lines = [`👥 *Groups (${arr.length}):*`];
    for (const g of arr.slice(0, 50)) {
      lines.push(`• ${g.subject} (${g.participants?.length || 0} members)\n  ${g.id}`);
    }
    await ctx.replyLong(lines.join('\n'));
  },
};
