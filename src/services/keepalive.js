/**
 * services/keepalive.js
 * Self-ping service to prevent free-tier hosting platforms (Render, Katabump)
 * from sleeping the bot due to 15-min idle.
 *
 * Render free tier: sleeps after 15 min of no inbound HTTP traffic.
 * Katabump: doesn't sleep, but keeping this on doesn't hurt.
 *
 * We ping our own /health endpoint every 10 minutes.
 */
import logger from '../logger.js';

const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

let timer = null;
let url = null;

export function startKeepalive(port) {
  if (timer) clearInterval(timer);
  url = `http://127.0.0.1:${port}/health`;
  timer = setInterval(async () => {
    try {
      const res = await fetch(url);
      if (res.ok) {
        logger.debug({ url }, 'keepalive ping ok');
      } else {
        logger.warn({ url, status: res.status }, 'keepalive ping non-ok');
      }
    } catch (err) {
      // Don't spam logs — the server might be briefly unavailable during restart
      logger.debug({ err: err.message }, 'keepalive ping failed');
    }
  }, PING_INTERVAL_MS);
  logger.info({ url, intervalMin: PING_INTERVAL_MS / 60000 }, 'keepalive started (self-ping every 10 min)');
}

export function stopKeepalive() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    logger.info('keepalive stopped');
  }
}
