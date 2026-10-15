import { getDeletedMessages } from '../../services/anti-delete.js';
import { bold, mono, italic } from '../../utils/text.js';

export default {
  name: 'getdeleted',
  aliases: ['deleted', 'snipe'],
  category: 'admin',
  description: 'Show recently deleted messages in this chat.',
  usage: '.getdeleted [count]',
  async execute(ctx) {
    const limit = Math.min(parseInt(ctx.args[0]) || 10, 50);
    const items = getDeletedMessages(ctx.chatId, limit);
    if (!items.length) {
      return ctx.reply('📭 No deleted messages recovered yet.\n\nAnti-delete caches messages in the background. When someone deletes a message, it appears here.');
    }
    let out = `${bold('🗑️ Recovered Deleted Messages')} (${items.length})\n${'━'.repeat(35)}\n`;
    for (const item of items) {
      const time = new Date(item.recovered_at * 1000).toLocaleString();
      const sender = '@' + item.sender_jid.split('@')[0];
      out += `\n${bold('• ' + sender)} — ${mono(item.message_type)}\n`;
      out += `  ${italic(time)}\n`;
      if (item.message_text) {
        out += `  ${item.message_text.slice(0, 300)}\n`;
      }
      if (item.has_media) {
        out += `  ${italic('_(had media)_')}\n`;
      }
    }
    out += `\n${'━'.repeat(35)}\n${italic('Use .antidelete on to auto-repost deleted messages')}`;
    await ctx.replyLong(out);
  },
};
