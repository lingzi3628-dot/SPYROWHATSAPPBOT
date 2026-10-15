import { bold, mono } from '../../utils/text.js';
import { statusBlock } from '../../utils/formatting.js';
import config from '../../config.js';
import connection from '../../connection.js';

export default {
  name: 'groupinfo',
  aliases: ['ginfo'],
  category: 'general',
  groupOnly: true,
  description: 'Show group subject, member count, admins, and settings.',
  usage: '.groupinfo',
  async execute(ctx) {
    const meta = ctx.groupMeta || await ctx.sock.groupMetadata(ctx.chatId).catch(() => null);
    if (!meta) return ctx.replyError('Could not fetch group metadata.');
    const admins = meta.participants.filter((p) => p.admin && p.admin !== 'member');
    const lines = [
      `${bold('Subject:')} ${meta.subject}`,
      `${bold('JID:')} ${mono(meta.id)}`,
      `${bold('Owner:')} ${meta.owner ? '@' + meta.owner.split('@')[0] : 'unknown'}`,
      `${bold('Members:')} ${meta.participants.length}`,
      `${bold('Admins:')} ${admins.length}`,
      `${bold('Created:')} ${meta.creation ? new Date(meta.creation * 1000).toLocaleString() : 'unknown'}`,
      `${bold('Desc count:')} ${meta.desc?.length || 0} chars`,
      `${bold('Bot status:')} ${connection.isOpen() ? 'online' : 'reconnecting'}`,
    ];
    await ctx.reply(statusBlock(lines));
  },
};
