import { mono } from '../../utils/text.js';
import config from '../../config.js';

export default {
  name: 'jid',
  aliases: ['id'],
  category: 'general',
  description: 'Show current chat and sender JIDs (privacy-aware).',
  usage: '.jid',
  async execute(ctx) {
    const chatId = ctx.isGroup ? ctx.chatId : '(private)';
    const lines = [
      `*Chat:* ${mono(chatId)}`,
      `*Sender:* ${mono(ctx.sender)}`,
      `*Sender #:* ${mono(ctx.senderPhone)}`,
      `*Bot:* ${mono(ctx.botJid)}`,
      `*Owner:* ${mono(config.OWNER_JID || '(unset)')}`,
      `*Scope:* ${ctx.isGroup ? 'group' : 'private'}`,
    ];
    await ctx.reply(lines.join('\n'));
  },
};
