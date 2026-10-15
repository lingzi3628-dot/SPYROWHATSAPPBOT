export default {
  name: 'invite',
  aliases: ['link', 'grouplink'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  description: 'Get the group invite link (admin only).',
  usage: '.invite',
  async execute(ctx) {
    try {
      const code = await ctx.sock.groupInviteCode(ctx.chatId);
      await ctx.reply(`🔗 https://chat.whatsapp.com/${code}`);
    } catch (err) {
      await ctx.replyError(`Could not get invite link: ${err.message || err}`);
    }
  },
};
