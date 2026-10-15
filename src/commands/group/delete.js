import { audit } from '../../database.js';

export default {
  name: 'delete',
  aliases: ['revoke', 'del'],
  category: 'group',
  groupOnly: false,
  adminOnly: true,
  botAdminRequired: true,
  description: 'Delete an eligible quoted message (bot must be admin in groups).',
  usage: '.delete (reply to a message)',
  async execute(ctx) {
    const q = ctx.msg.message?.extendedTextMessage?.contextInfo;
    if (!q?.stanzaId || !q?.participant) {
      return ctx.reply('Reply to the message you want to delete.');
    }
    const key = {
      remoteJid: ctx.chatId,
      id: q.stanzaId,
      fromMe: q.participant === ctx.botJid,
      participant: ctx.isGroup ? q.participant : undefined,
    };
    try {
      await ctx.sock.sendMessage(ctx.chatId, { delete: key });
      audit({ actor: ctx.sender, action: 'message.delete', target: q.participant, groupJid: ctx.chatId, detail: q.stanzaId });
    } catch (err) {
      await ctx.replyError(`Could not delete: ${err.message || err}. WhatsApp may not allow deleting this message.`);
    }
  },
};
