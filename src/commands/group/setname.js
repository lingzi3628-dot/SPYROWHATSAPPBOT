import { audit } from '../../database.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'setname',
  aliases: ['subject', 'setsubject'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,
  description: 'Change the group subject.',
  usage: '.setname <new subject>',
  async execute(ctx) {
    const name = sanitize(ctx.body || '').slice(0, 100);
    if (!name) return ctx.reply('Usage: .setname <new subject>');
    try {
      await ctx.sock.groupUpdateSubject(ctx.chatId, name);
      audit({ actor: ctx.sender, action: 'group.setname', groupJid: ctx.chatId, detail: name });
      await ctx.replyOk(`Group subject updated to: ${name}`);
    } catch (err) {
      await ctx.replyError(`Could not change subject: ${err.message || err}`);
    }
  },
};
