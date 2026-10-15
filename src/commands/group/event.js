import {
  addEvent,
  getEvents,
  deleteEvent,
  parseDateTime,
} from '../../services/advanced-scheduler.js';
import { bold, mono, italic } from '../../utils/text.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'event',
  aliases: ['events', 'createevent'],
  category: 'group',
  groupOnly: true,
  description: 'Create group events with countdown and auto-reminders.',
  usage: '.event <datetime> <name>\n  .event Saturday 8pm Game Night\n  .event 2026-10-20 18:00 Birthday Party\n  .event list\n  .event del <id>',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();

    // ── .event list ────────────────────────────────────────────
    if (sub === 'list') {
      const events = getEvents(ctx.chatId);
      if (!events.length) return ctx.reply('📭 No upcoming events.');
      let out = `${bold('📅 Upcoming Events')} (${events.length})\n${'━'.repeat(40)}\n`;
      for (const e of events) {
        const time = new Date(e.event_at * 1000).toLocaleString();
        const now = Math.floor(Date.now() / 1000);
        const diff = e.event_at - now;
        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        const mins = Math.floor((diff % 3600) / 60);
        let countdown = '';
        if (days > 0) countdown = `${days}d ${hours}h`;
        else if (hours > 0) countdown = `${hours}h ${mins}m`;
        else countdown = `${mins}m`;
        out += `\n${mono('#' + e.id)} ${bold(e.name)}\n  📅 ${time}\n  ⏰ In: ${countdown}\n`;
      }
      out += `\n${italic('Bot will auto-remind 1 hour before each event.')}`;
      return ctx.replyLong(out);
    }

    // ── .event del <id> ────────────────────────────────────────
    if (sub === 'del' || sub === 'delete' || sub === 'cancel') {
      const id = parseInt(ctx.args[1]);
      if (!id) return ctx.reply('Usage: .event del <id>');
      deleteEvent(id);
      return ctx.replyOk(`Event #${id} cancelled.`);
    }

    // ── .event <datetime> <name> ───────────────────────────────
    const input = sanitize(ctx.body || '').trim();
    if (!input) {
      return ctx.reply(
        `${bold('📅 Create Group Event')}\n\n` +
        `Usage: ${mono('.event <datetime> <name>')}\n\n` +
        `Examples:\n` +
        `  ${mono('.event Saturday 8pm Game Night')}\n` +
        `  ${mono('.event 2026-10-20 18:00 Birthday Party')}\n` +
        `  ${mono('.event tomorrow 3pm Study Session')}\n` +
        `  ${mono('.event in 2h Quick Meeting')}\n\n` +
        `${bold('Manage:')}\n` +
        `  ${mono('.event list')} — view upcoming\n` +
        `  ${mono('.event del <id>')} — cancel\n\n` +
        `${italic('_Bot auto-reminds everyone 1 hour before the event._')}`
      );
    }

    // Parse the datetime from the beginning of the input
    // Try "in Xh", "tomorrow Xam", "Saturday Xpm", "YYYY-MM-DD HH:MM"
    const patterns = [
      /^in\s+\d+[mhds]\s+/i,
      /^tomorrow\s+\d{1,2}(am|pm)?\s+/i,
      /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+\d{1,2}(am|pm)?\s+/i,
      /^\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{2}\s+/,
    ];

    let datetimeStr = '';
    let eventName = '';
    let matched = false;

    for (const p of patterns) {
      const m = p.exec(input);
      if (m) {
        datetimeStr = m[0].trim();
        eventName = input.slice(m[0].length).trim();
        matched = true;
        break;
      }
    }

    if (!matched || !eventName) {
      return ctx.replyError(
        `Could not parse. Try:\n` +
        `${mono('.event Saturday 8pm Game Night')}\n` +
        `${mono('.event in 2h Quick Meeting')}\n` +
        `${mono('.event 2026-10-20 18:00 Party')}`
      );
    }

    const eventAt = parseDateTime(datetimeStr);
    if (!eventAt) {
      return ctx.replyError(`Could not parse datetime: "${datetimeStr}"`);
    }

    if (eventAt <= Math.floor(Date.now() / 1000)) {
      return ctx.replyError('That time is in the past.');
    }

    const id = addEvent({
      userId: ctx.chatId,
      groupJid: ctx.chatId,
      name: eventName.slice(0, 200),
      eventAt,
    });

    const timeStr = new Date(eventAt * 1000).toLocaleString();
    const now = Math.floor(Date.now() / 1000);
    const diff = eventAt - now;
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    let countdown;
    if (days > 0) countdown = `${days}d ${hours}h`;
    else if (hours > 0) countdown = `${hours}h ${mins}m`;
    else countdown = `${mins}m`;

    return ctx.replyOk(
      `${bold('📅 Event Created')}\n\n` +
      `ID: ${mono('#' + id)}\n` +
      `Name: ${bold(eventName)}\n` +
      `When: ${mono(timeStr)}\n` +
      `Countdown: ${mono(countdown)}\n\n` +
      `${italic('_Bot will remind everyone 1 hour before._')}\n` +
      `Cancel with: ${mono('.event del ' + id)}`
    );
  },
};
