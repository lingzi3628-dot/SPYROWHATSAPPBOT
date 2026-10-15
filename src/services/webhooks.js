/**
 * services/webhooks.js
 * Webhook system — sends events to external URLs (Zapier, Make.com, custom apps).
 * Enables: auto-post to Discord, sync with CRM, log to Google Sheets.
 */
import axios from 'axios';
import { stmts } from '../database.js';
import logger from '../logger.js';

// Webhook settings stored in bot_state as JSON
function _key(userId) { return `webhooks_${userId}`; }

export function getWebhooks(userId) {
  const row = stmts.getState.get(_key(userId));
  if (!row?.value) return [];
  try { return JSON.parse(row.value); } catch { return []; }
}

export function saveWebhooks(userId, hooks) {
  stmts.setState.run(_key(userId), JSON.stringify(hooks), JSON.stringify(hooks));
}

export function addWebhook(userId, { url, events, name }) {
  const hooks = getWebhooks(userId);
  const id = Date.now();
  hooks.push({ id, url, events: events || ['message'], name: name || 'Webhook', active: true });
  saveWebhooks(userId, hooks);
  return { id, url, events, name };
}

export function removeWebhook(userId, id) {
  const hooks = getWebhooks(userId);
  const filtered = hooks.filter(h => h.id !== parseInt(id));
  saveWebhooks(userId, filtered);
  return hooks.length !== filtered.length;
}

/**
 * Trigger webhooks for an event.
 * @param {number} userId
 * @param {string} event - event type: 'message', 'command', 'join', 'leave', 'status'
 * @param {object} data - event payload
 */
export async function triggerWebhooks(userId, event, data) {
  const hooks = getWebhooks(userId);
  const matching = hooks.filter(h => h.active && h.events.includes(event));
  if (!matching.length) return;

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  for (const hook of matching) {
    try {
      await axios.post(hook.url, payload, {
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'SpyroBot/1.0' },
        timeout: 10_000,
      });
      logger.info({ userId, event, hook: hook.name }, 'webhook triggered');
    } catch (err) {
      logger.warn({ userId, hook: hook.name, err: err.message?.slice(0, 80) }, 'webhook failed');
    }
  }
}

/**
 * Test a webhook by sending a test event.
 */
export async function testWebhook(url) {
  const payload = {
    event: 'test',
    timestamp: new Date().toISOString(),
    data: { message: 'Test webhook from Spyro Bot 🐉' },
  };
  const res = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'SpyroBot/1.0' },
    timeout: 10_000,
    validateStatus: () => true, // don't throw on non-2xx
  });
  return { status: res.status, ok: res.status >= 200 && res.status < 300 };
}
