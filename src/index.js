/**
 * index.js
 * Entry point. Wires:
 *   postgres → web server → connection → handler → events → scheduler → ready.
 */
import './config.js';        // validates env, creates dirs
import logger from './logger.js';
import config from './config.js';
import connection from './connection.js';
import handler from './handler.js';
import { bindMessageEvents } from './events/messages.js';
import { bindGroupEvents } from './events/groups.js';
import { startScheduler } from './scheduler.js';
import { loadPlugins } from './plugins/index.js';
import { startWebServer } from './web/server.js';
import { startKeepalive } from './services/keepalive.js';
import { initPostgres } from './db/postgres.js';

async function main() {
  logger.info({ name: config.BOT_NAME, version: config.VERSION }, 'starting bot');

  // ── Initialize PostgreSQL (Neon) ──
  // Falls back to SQLite if DATABASE_URL is not set
  try {
    const pgConnected = await initPostgres();
    if (pgConnected) {
      logger.info('Using Neon PostgreSQL for user data');
    } else {
      logger.info('Using SQLite for user data (DATABASE_URL not set)');
    }
  } catch (err) {
    logger.warn({ err: err.message }, 'PostgreSQL init failed — using SQLite');
  }

  // Start the web UI first so the user can see connection progress
  try {
    startWebServer();
    const port = parseInt(process.env.PORT || '3000', 10);
    startKeepalive(port);
  } catch (err) {
    logger.error({ err }, 'failed to start web server — continuing without UI');
  }

  await loadPlugins();

  connection.start({
    onReady: async (sock) => {
      try {
        await handler.loadCommands(sock);
        bindMessageEvents(sock, handler);
        bindGroupEvents(sock);
        startScheduler(sock);
        logger.info('bot is READY');
      } catch (err) {
        logger.error({ err }, 'failed to bind events');
      }
    },
  });
}

main().catch((err) => {
  logger.error({ err }, 'fatal startup error');
  process.exit(1);
});

export { handler, connection };
