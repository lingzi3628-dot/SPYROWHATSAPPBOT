import { getGroupMetadata } from '../../utils/groups.js';
import { capMentions } from '../../security.js';

export default {
  name: 'hidetag',
  aliases: ['hTag', 'stitch'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  description: 'Send a message that mentions members without showing visible names.',
  usage: '.hidetag <message>',
  async execute(ctx) {
    const text = ctx.body;
    if (!text) return ctx.reply('Usage: .hidetag <message>');
    const meta = ctx.groupMeta || await getGroupMetadata(ctx.sock, ctx.chatId);
    if (!meta) return ctx.replyError('Could not fetch group metadata.');
    const mentions = capMentions(meta.participants.map((p) => p.id), 200);
    await ctx.sock.sendMessage(ctx.chatId, { text, mentions });
  },
};
