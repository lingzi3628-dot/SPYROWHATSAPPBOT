import {
  addScheduledMessage,
  getScheduledMessages,
  deleteScheduledMessage,
  parseDateTime,
} from '../../services/advanced-scheduler.js';
import { bold, mono, italic } from '../../utils/text.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'schedule',
  aliases: ['sched', 'schedulemsg'],
  category: 'tools',
  description: 'Schedule messages — one-time or recurring (daily/weekly/monthly).',
  usage: '.schedule <datetime> | <message>\n  .schedule 2026-10-20 09:00 | Happy Birthday!\n  .schedule in 2h | Meeting time\n  .schedule daily 09:00 | Good morning!\n  .schedule list\n  .schedule del <id>',
  cooldown: 5,
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();

    // ── .schedule list ─────────────────────────────────────────
    if (sub === 'list') {
      const items = getScheduledMessages(ctx.chatId, 15);
      if (!items.length) return ctx.reply('📭 No scheduled messages.');
      let out = `${bold('⏰ Scheduled Messages')} (${items.length})\n${'━'.repeat(40)}\n`;
      for (const s of items) {
        const time = new Date(s.send_at * 1000).toLocaleString();
        out += `\n${mono('#' + s.id)} ${time} ${s.recurring ? `[${s.recurring}]` : ''}\n`;
        out += `  ${s.message.slice(0, 80)}\n`;
      }
      out += `\n${italic('Use .schedule del <id> to cancel')}`;
      return ctx.replyLong(out);
    }

    // ── .schedule del <id> ─────────────────────────────────────
    if (sub === 'del' || sub === 'delete' || sub === 'cancel') {
      const id = parseInt(ctx.args[1]);
      if (!id) return ctx.reply('Usage: .schedule del <id>');
      deleteScheduledMessage(id);
      return ctx.replyOk(`Scheduled message #${id} cancelled.`);
    }

    // ── .schedule <datetime> | <message> ───────────────────────
    const input = sanitize(ctx.body || '');
    if (!input || !input.includes('|')) {
      return ctx.reply(
        `${bold('⏰ Schedule a Message')}\n\n` +
        `Usage: ${mono('.schedule <datetime> | <message>')}\n\n` +
        `${bold('Formats:')}\n` +
        `  ${mono('.schedule 2026-10-20 09:00 | Happy Birthday!')}\n` +
        `  ${mono('.schedule in 2h | Meeting time')}\n` +
        `  ${mono('.schedule in 30m | Break time')}\n` +
        `  ${mono('.schedule tomorrow 9am | Good morning')}\n` +
        `  ${mono('.schedule Saturday 8pm | Game night')}\n\n` +
        `${bold('Recurring:')}\n` +
        `  ${mono('.schedule daily 09:00 | Good morning!')}\n` +
        `  ${mono('.schedule weekly 10:00 | Weekly check-in')}\n` +
        `  ${mono('.schedule monthly 08:00 | Monthly report')}\n\n` +
        `${bold('Manage:')}\n` +
        `  ${mono('.schedule list')} — view scheduled\n` +
        `  ${mono('.schedule del <id>')} — cancel`
      );
    }

    const [datetimePart, ...msgParts] = input.split('|');
    const message = msgParts.join('|').trim().slice(0, 2000);
    const datetimeStr = datetimePart.trim();

    if (!message) return ctx.replyError('Message is required after the | symbol.');

    // Check for recurring
    let recurring = '';
    let actualDateTime = datetimeStr;
    const recurringMatch = /^(daily|weekly|monthly)\s+(.+)$/.exec(datetimeStr);
    if (recurringMatch) {
      recurring = recurringMatch[1];
      actualDateTime = recurringMatch[2];
    }

    const sendAt = parseDateTime(actualDateTime);
    if (!sendAt) {
      return ctx.replyError(`Could not parse datetime: "${actualDateTime}"\n\nTry: 2026-10-20 09:00, in 2h, tomorrow 9am, Saturday 8pm`);
    }

    if (sendAt <= Math.floor(Date.now() / 1000)) {
      return ctx.replyError('That time is in the past. Please choose a future time.');
    }

    const id = addScheduledMessage({
      userId: ctx.chatId,
      chatJid: ctx.chatId,
      message,
      sendAt,
      recurring,
    });

    const timeStr = new Date(sendAt * 1000).toLocaleString();
    return ctx.replyOk(
      `${bold('⏰ Message Scheduled')}\n\n` +
      `ID: ${mono('#' + id)}\n` +
      `When: ${mono(timeStr)}\n` +
      `${recurring ? `Recurring: ${mono(recurring)}\n` : ''}` +
      `Message: ${italic(message.slice(0, 100))}\n\n` +
      `Cancel with: ${mono('.schedule del ' + id)}`
    );
  },
};
