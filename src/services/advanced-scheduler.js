/**
 * services/advanced-scheduler.js
 * Handles scheduled messages (one-time + recurring) and event reminders.
 * Runs every 30 seconds to check for due items.
 */
import { stmts } from '../database.js';
import logger from '../logger.js';

let sock = null;
let timer = null;

export function startAdvancedScheduler(_sock) {
  sock = _sock;
  if (timer) clearInterval(timer);
  timer = setInterval(poll, 30_000);
  logger.info('advanced scheduler started (scheduled msgs + events)');
}

export function stopAdvancedScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
  sock = null;
}

async function poll() {
  if (!sock) return;
  const now = Math.floor(Date.now() / 1000);
  try {
    // ── Scheduled messages ──
    const due = stmts.dueScheduled.all(now);
    for (const s of due) {
      try {
        await sock.sendMessage(s.chat_jid, { text: `⏰ *Scheduled Message*\n\n${s.message}` });
        if (s.recurring) {
          // Calculate next occurrence
          const next = _nextOccurrence(s.recurring, now);
          if (next) {
            stmts.updateScheduledNext.run(next, s.id);
          } else {
            stmts.markScheduledDelivered.run(s.id);
          }
        } else {
          stmts.markScheduledDelivered.run(s.id);
        }
        logger.info({ id: s.id, chat: s.chat_jid }, 'scheduled message delivered');
      } catch (err) {
        logger.warn({ err, id: s.id }, 'failed to deliver scheduled message');
      }
    }

    // ── Event reminders (1 hour before) ──
    const oneHourFromNow = now + 3600;
    const dueEvents = stmts.dueEventReminders.all(oneHourFromNow);
    for (const e of dueEvents) {
      try {
        const timeUntil = e.event_at - now;
        const minutes = Math.floor(timeUntil / 60);
        let timeStr;
        if (minutes <= 0) timeStr = 'NOW';
        else if (minutes < 60) timeStr = `${minutes} minutes`;
        else timeStr = `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

        await sock.sendMessage(e.group_jid, {
          text: `🎉 *Event Reminder*\n\n📅 ${e.name}\n⏰ Starts in: ${timeStr}\n\nGet ready! 🔥`,
        });
        stmts.markEventReminderSent.run(e.id);
        logger.info({ id: e.id, event: e.name }, 'event reminder sent');
      } catch (err) {
        logger.warn({ err, id: e.id }, 'failed to send event reminder');
      }
    }
  } catch (err) {
    logger.error({ err }, 'advanced scheduler poll failed');
  }
}

function _nextOccurrence(recurring, fromTs) {
  const recurring_lower = recurring.toLowerCase();
  if (recurring_lower === 'daily') return fromTs + 86400;
  if (recurring_lower === 'weekly') return fromTs + 604800;
  if (recurring_lower === 'monthly') return fromTs + 2592000;
  return null;
}

// ── Scheduled message helpers ───────────────────────────────────
export function addScheduledMessage({ userId, chatJid, message, sendAt, recurring = '' }) {
  const info = stmts.addScheduled.run(userId, chatJid, message, sendAt, recurring);
  return info.lastInsertRowid;
}

export function getScheduledMessages(userId, limit = 10) {
  return stmts.getScheduled.all(userId, limit);
}

export function deleteScheduledMessage(id) {
  stmts.deleteScheduled.run(id);
}

// ── Event helpers ───────────────────────────────────────────────
export function addEvent({ userId, groupJid, name, eventAt }) {
  const info = stmts.addEvent.run(userId, groupJid, name, eventAt);
  return info.lastInsertRowid;
}

export function getEvents(groupJid) {
  const now = Math.floor(Date.now() / 1000);
  return stmts.getEvents.all(groupJid, now);
}

export function deleteEvent(id) {
  stmts.deleteEvent.run(id);
}

// ── Parse date/time strings ─────────────────────────────────────
export function parseDateTime(str) {
  // Formats: "2026-10-20 09:00", "tomorrow 3pm", "in 2h", "in 30m"
  str = str.trim().toLowerCase();
  
  // "in 2h", "in 30m", "in 1d"
  const inMatch = /^in\s+(\d+)\s*([mhds])$/.exec(str);
  if (inMatch) {
    const n = parseInt(inMatch[1]);
    const mult = { s: 1, m: 60, h: 3600, d: 86400 }[inMatch[2]];
    return Math.floor(Date.now() / 1000) + n * mult;
  }

  // "tomorrow 3pm" or "tomorrow 15:00"
  if (str.startsWith('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timePart = str.replace('tomorrow', '').trim();
    const hour = _parseHour(timePart);
    if (hour !== null) tomorrow.setHours(hour);
    return Math.floor(tomorrow.getTime() / 1000);
  }

  // "2026-10-20 09:00"
  const dateMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/.exec(str);
  if (dateMatch) {
    const d = new Date(
      parseInt(dateMatch[1]),
      parseInt(dateMatch[2]) - 1,
      parseInt(dateMatch[3]),
      dateMatch[4] ? parseInt(dateMatch[4]) : 9,
      dateMatch[5] ? parseInt(dateMatch[5]) : 0,
    );
    return Math.floor(d.getTime() / 1000);
  }

  // "Saturday 8pm"
  const dayMatch = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(\d{1,2}(?:am|pm)?)$/.exec(str);
  if (dayMatch) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayMatch[1]);
    const now = new Date();
    const currentDay = now.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7;
    const target = new Date(now);
    target.setDate(target.getDate() + diff);
    target.setHours(_parseHour(dayMatch[2]) || 12, 0, 0, 0);
    return Math.floor(target.getTime() / 1000);
  }

  return null;
}

function _parseHour(str) {
  if (!str) return null;
  const m = /(\d{1,2})(am|pm)?/.exec(str);
  if (!m) return null;
  let h = parseInt(m[1]);
  if (m[2] === 'pm' && h < 12) h += 12;
  if (m[2] === 'am' && h === 12) h = 0;
  return h;
}
