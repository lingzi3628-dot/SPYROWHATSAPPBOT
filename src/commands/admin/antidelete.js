import { isAutoRepostEnabled, setAutoRepost, getDeletedMessages, clearDeletedMessages } from '../../services/anti-delete.js';
import { bold, mono, italic } from '../../utils/text.js';
import { audit } from '../../database.js';

export default {
  name: 'antidelete',
  aliases: ['ad', 'antidel'],
  category: 'admin',
  description: 'Recover deleted messages. Toggle auto-repost or view recovered messages.',
  usage: '.antidelete on|off|list|clear',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();

    if (sub === 'on' || sub === 'off') {
      // Only owner or group admin can toggle
      if (ctx.perms.level === 'user') {
        return ctx.reply('⛔ Only admins can toggle anti-delete.');
      }
      const enabled = sub === 'on';
      setAutoRepost(ctx.chatId, enabled);
      audit({ actor: ctx.sender, action: 'admin.antidelete', groupJid: ctx.isGroup ? ctx.chatId : null, detail: sub });
      return ctx.replyOk(`Anti-delete auto-repost is now ${sub.toUpperCase()}.\n\nWhen someone deletes a message in this chat, the bot will recover and repost it.`);
    }

    if (sub === 'list' || sub === 'view' || !sub) {
      const items = getDeletedMessages(ctx.chatId, 10);
      if (!items.length) {
        return ctx.reply('📭 No deleted messages recovered yet.\n\nAnti-delete is always ON in the background — deleted messages are cached automatically. Use `.antidelete on` to also auto-repost them.');
      }
      let out = `${bold('🗑️ Recovered Deleted Messages')}\n${'━'.repeat(35)}\n`;
      for (const item of items) {
        const time = new Date(item.recovered_at * 1000).toLocaleString();
        const sender = '@' + item.sender_jid.split('@')[0];
        out += `\n${bold('• ' + sender)} — ${mono(item.message_type)}\n`;
        out += `  ${italic(time)}\n`;
        if (item.message_text) {
          out += `  ${item.message_text.slice(0, 200)}\n`;
        }
        if (item.has_media) {
          out += `  ${italic('_(had media — text only recovered)_')}\n`;
        }
      }
      out += `\n${'━'.repeat(35)}\n${italic('Use .antidelete clear to wipe history')}`;
      return ctx.replyLong(out);
    }

    if (sub === 'clear') {
      if (ctx.perms.level === 'user') {
        return ctx.reply('⛔ Only admins can clear.');
      }
      clearDeletedMessages(ctx.chatId);
      audit({ actor: ctx.sender, action: 'admin.antidelete_clear', groupJid: ctx.isGroup ? ctx.chatId : null });
      return ctx.replyOk('Deleted message history cleared.');
    }

    const status = isAutoRepostEnabled(ctx.chatId) ? 'ON' : 'OFF';
    return ctx.reply(
      `${bold('🗑️ Anti-Delete')}\n\n` +
      `Auto-repost: ${mono(status)}\n\n` +
      `Usage:\n` +
      `  ${mono('.antidelete on')} — auto-repost deleted messages\n` +
      `  ${mono('.antidelete off')} — just cache (use .antidelete list to view)\n` +
      `  ${mono('.antidelete list')} — show recovered messages\n` +
      `  ${mono('.antidelete clear')} — wipe history`
    );
  },
};
