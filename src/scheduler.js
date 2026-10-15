/**
 * scheduler.js
 * Lightweight background scheduler:
 *  - Polls the reminders table every 10s and delivers due reminders
 *  - Provides addReminder / listReminders helpers
 *  - Cleanly stoppable on shutdown
 */
import { stmts } from './database.js';
import logger from './logger.js';

const POLL_INTERVAL_MS = 10_000;
let timer = null;
let sock = null;

export function startScheduler(_sock) {
  sock = _sock;
  if (timer) clearInterval(timer);
  timer = setInterval(poll, POLL_INTERVAL_MS);
  logger.info('reminder scheduler started');
}

export function stopScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
  sock = null;
  logger.info('reminder scheduler stopped');
}

export async function poll() {
  if (!sock) return;
  try {
    const now = Math.floor(Date.now() / 1000);
    const due = stmts.dueReminders.all(now);
    for (const r of due) {
      try {
        const target = r.group_jid || r.user_jid;
        await sock.sendMessage(target, {
          text: `⏰ *Reminder*\n\n${r.message}`,
          mentions: r.group_jid ? [r.user_jid] : [],
        });
        stmts.markReminderDelivered.run(r.id);
      } catch (err) {
        logger.warn({ err, reminderId: r.id }, 'failed to deliver reminder');
      }
    }
  } catch (err) {
    logger.error({ err }, 'scheduler poll failed');
  }
}

/**
 * Schedule a reminder.
 * @param {object} opts
 * @param {string} opts.userJid
 * @param {string} [opts.groupJid]
 * @param {number} opts.remindAt  unix seconds
 * @param {string} opts.message
 */
export function addReminder({ userJid, groupJid = null, remindAt, message }) {
  const info = stmts.addReminder.run(userJid, groupJid, remindAt, message);
  return info.lastInsertRowid;
}

/** Parse human-friendly durations like "5m", "2h", "1d" into seconds. */
export function parseDuration(s = '') {
  const m = /^(\d+)\s*(s|m|h|d|w)$/i.exec(String(s).trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const mult = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 }[unit];
  return n * mult;
}
