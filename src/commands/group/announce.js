import { sanitize } from '../../utils/text.js';
import { audit } from '../../database.js';

export default {
  name: 'announce',
  aliases: ['broadcast-group'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,
  description: 'Send an admin announcement (mentions all members).',
  usage: '.announce <message>',
  async execute(ctx) {
    const text = sanitize(ctx.body || '').slice(0, 4000);
    if (!text) return ctx.reply('Usage: .announce <message>');
    const meta = ctx.groupMeta || await ctx.sock.groupMetadata(ctx.chatId).catch(() => null);
    if (!meta) return ctx.replyError('Could not fetch group metadata.');
    const mentions = meta.participants.map((p) => p.id).slice(0, 200);
    await ctx.sock.sendMessage(ctx.chatId, {
      text: `📢 *Announcement*\n\n${text}`,
      mentions,
    });
    audit({ actor: ctx.sender, action: 'group.announce', groupJid: ctx.chatId, detail: text.slice(0, 200) });
  },
};
