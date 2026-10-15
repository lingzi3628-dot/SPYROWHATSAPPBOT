import { getGroupMetadata } from '../../utils/groups.js';
import { bold } from '../../utils/text.js';

export default {
  name: 'admins',
  aliases: ['staff'],
  category: 'group',
  groupOnly: true,
  description: 'List group administrators.',
  usage: '.admins',
  async execute(ctx) {
    const meta = ctx.groupMeta || await getGroupMetadata(ctx.sock, ctx.chatId);
    if (!meta) return ctx.replyError('Could not fetch group metadata.');
    const admins = meta.participants.filter((p) => p.admin && p.admin !== 'member');
    const lines = [bold(`Admins (${admins.length}):`)];
    for (const a of admins) {
      const tag = a.admin === 'superadmin' ? '👑' : a.admin === 'admin' ? '🛡️' : '•';
      lines.push(`${tag} @${a.id.split('@')[0]}`);
    }
    await ctx.sock.sendMessage(ctx.chatId, {
      text: lines.join('\n'),
      mentions: admins.map((a) => a.id),
    });
  },
};
