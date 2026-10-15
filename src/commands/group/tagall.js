import { getGroupMetadata } from '../../utils/groups.js';
import { capMentions } from '../../security.js';

export default {
  name: 'tagall',
  aliases: ['everyone', 'here'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  description: 'Mention all group members in batches.',
  usage: '.tagall [message]',
  async execute(ctx) {
    const meta = ctx.groupMeta || await getGroupMetadata(ctx.sock, ctx.chatId);
    if (!meta) return ctx.replyError('Could not fetch group metadata.');
    const ids = meta.participants.map((p) => p.id);
    const mentions = capMentions(ids, 200);
    const header = ctx.body ? `📢 ${ctx.body}\n\n` : '📢 @everyone\n\n';
    const BATCH = 100;
    for (let i = 0; i < mentions.length; i += BATCH) {
      const slice = mentions.slice(i, i + BATCH);
      const tags = slice.map((j) => '@' + j.split('@')[0]).join(' ');
      await ctx.sock.sendMessage(ctx.chatId, { text: `${header}${tags}`, mentions: slice });
    }
  },
};
