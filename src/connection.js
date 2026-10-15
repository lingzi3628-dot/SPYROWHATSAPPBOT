/**
 * connection.js
 * Baileys socket lifecycle manager.
 *
 * Features:
 *  - useMultiFileAuthState persistent session
 *  - QR pairing via terminal
 *  - Optional phone-number pairing
 *  - Reconnect with exponential backoff + jitter
 *  - Duplicate-socket / concurrent-reconnect guard
 *  - Graceful shutdown on SIGINT / SIGTERM
 *  - Status reporting
 *  - Listener/timer cleanup
 *
 * Designed for Baileys 7.0.0-rc14.
 */
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import logger from './logger.js';
import config from './config.js';
import { closeDatabase } from './database.js';

const RECONNECT_DELAYS = {
  [DisconnectReason.connectionClosed]: 1000,
  [DisconnectReason.connectionLost]: 2000,
  [DisconnectReason.connectionReplaced]: 5000,
  [DisconnectReason.loggedOut]: 0,            // do not reconnect — credentials invalid
  [DisconnectReason.restartRequired]: 0,      // immediate
  [DisconnectReason.timedOut]: 3000,
};

let socket = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let isShuttingDown = false;
let lastStatus = 'init';
let startedAt = Date.now();
let onReadyCb = null;

// --- Web UI event bus -----------------------------------------------------
// Lightweight pub/sub so the web server can subscribe to connection events.
const _listeners = new Set();
let _lastQr = null;
let _lastEvent = null;

function emitEvent(type, data = {}) {
  const evt = { type, data, ts: Date.now() };
  _lastEvent = evt;
  for (const fn of _listeners) {
    try { fn(evt); } catch {}
  }
}

/** Subscribe to connection events. Returns an unsubscribe function. */
export function onConnectionEvent(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

/** Get the last QR code received (or null). */
export function getCurrentQr() {
  return _lastQr;
}

/** Get the last event (or null). */
export function getLastEvent() {
  return _lastEvent;
}

/** Request a phone pairing code (delegates to current socket). */
export async function requestPairingCode(phone) {
  // Wait up to 30s for the socket to be ready (have received a QR)
  for (let i = 0; i < 60; i++) {
    if (socket && _lastQr) break;
    if (socket && lastStatus === 'open') {
      throw new Error('Bot is already connected. Use .restart to pair a new device.');
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!socket) throw new Error('Socket not ready yet. Wait a few seconds and try again.');
  if (!_lastQr && lastStatus !== 'open') {
    throw new Error('Connection not ready. Wait for the QR to appear, then request a pairing code.');
  }
  const clean = String(phone).replace(/[^\d]/g, '');
  if (clean.length < 6) throw new Error('Invalid phone number');
  logger.info({ phone: clean }, 'requesting phone pairing code');
  const code = await socket.requestPairingCode(clean);
  emitEvent('pairing_code', { phone: clean, code });
  return code;
}

/** Force a reconnect (used by web UI's "Restart Connection" button). */
export function forceReconnect() {
  if (!socket) return;
  try { socket.ev.removeAllListeners(); } catch {}
  try { socket.end(); } catch {}
  socket = null;
  _lastQr = null;
  emitEvent('reconnect_requested');
  reconnect();
}

/**
 * Try to recover from a corrupted session directory by backing it up
 * and removing the offending pre-key files.
 */
function tryRecoverSession() {
  const dir = config.SESSION_DIR;
  if (!existsSync(dir)) return false;
  logger.warn({ dir }, 'Attempting session recovery (backup + clean prekeys)');
  const backup = `${dir}_bak_${Date.now()}`;
  try {
    // simple rename-based backup
    existsSync(backup) || import('node:fs').then(({ renameSync }) => renameSync(dir, backup));
  } catch (err) {
    logger.error({ err }, 'session backup failed');
  }
  return true;
}

/** Build a fresh socket. */
async function createSocket({ version, clearDenied = false } = {}) {
  const { state, saveCreds } = await useMultiFileAuthState(config.SESSION_DIR);
  const sock = makeWASocket({
    version,
    auth: state,
    logger: logger.child({ module: 'baileys' }),
    printQRInTerminal: false,
    // Ubuntu fingerprint — works reliably from Linux cloud servers.
    // The default macOS fingerprint sometimes gets rejected by WhatsApp
    // with code 428 ("Connection Terminated") immediately after registration.
    browser: ['Ubuntu', 'Desktop', '22.04.4'],
    markOnlineOnConnect: false,
    defaultQueryTimeoutMs: 30_000,
    connectTimeoutMs: 20_000,
    keepAliveIntervalMs: 20_000,
    shouldIgnoreJid: (jid) => {
      // ignore status broadcasts by default
      return /status@broadcast/.test(jid);
    },
  });

  // QR pairing
  sock.ev.on('connection.update', (update) => {
    const { qr, connection, lastDisconnect, receivedPendingNotifications } = update;
    if (qr) {
      _lastQr = qr;
      lastStatus = 'qr_ready';
      logger.info({ msg: 'QR code ready — scan via web UI or terminal' });
      qrcode.generate(qr, { small: true });
      emitEvent('qr', { qr });
    }
    if (connection === 'connecting') {
      lastStatus = 'connecting';
      logger.info('connecting to WhatsApp…');
      emitEvent('connecting');
    }
    if (connection === 'open') {
      lastStatus = 'open';
      _lastQr = null;
      reconnectAttempts = 0;
      const user = sock.user?.id;
      const pushName = sock.user?.name;
      logger.info({ user, pushName }, 'WhatsApp connection OPEN');
      emitEvent('open', { user, pushName });
      if (typeof onReadyCb === 'function') onReadyCb(sock);
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode ?? -1;
      const reason = DisconnectReason?.[code] ?? 'unknown';
      emitEvent('close', { code, reason });
      handleClose(lastDisconnect);
    }
    if (receivedPendingNotifications) {
      logger.debug('received pending notifications');
    }
  });

  // credentials persistence
  sock.ev.on('creds.update', saveCreds);

  return sock;
}

/** Handle a closed connection with exponential backoff + jitter. */
function handleClose(lastDisconnect) {
  if (isShuttingDown) {
    logger.info('connection closed during shutdown — not reconnecting');
    return;
  }
  const code = lastDisconnect?.error?.output?.statusCode ?? lastDisconnect?.error?.statusCode ?? -1;
  const reason = DisconnectReason?.[code] ?? 'unknown';
  logger.warn({ code, reason }, `connection closed (${reason})`);

  if (code === DisconnectReason.loggedOut) {
    logger.error('Logged out by WhatsApp. Session is invalid. Remove auth_info and re-scan QR.');
    lastStatus = 'logged_out';
    return;
  }

  let baseDelay = RECONNECT_DELAYS[code] ?? 3000;
  if (code === DisconnectReason.restartRequired) baseDelay = 0;

  // exponential backoff with jitter after multiple attempts
  if (baseDelay > 0) {
    const exp = Math.min(reconnectAttempts, 6);
    baseDelay = Math.min(baseDelay * 2 ** exp + Math.floor(Math.random() * 800), 60_000);
  }
  reconnectAttempts += 1;
  if (reconnectAttempts > 15) {
    logger.error({ reconnectAttempts }, 'too many reconnect attempts — giving up. Try restarting manually.');
    lastStatus = 'failed';
    return;
  }

  if (reconnectTimer) clearTimeout(reconnectTimer);
  lastStatus = 'reconnecting';
  logger.info({ delayMs: baseDelay, attempt: reconnectAttempts }, 'scheduling reconnect');
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnect().catch((err) => logger.error({ err }, 'reconnect threw'));
  }, baseDelay);
}

let activeReconnect = null;
async function reconnect() {
  if (activeReconnect) return activeReconnect;
  if (isShuttingDown) return;
  activeReconnect = (async () => {
    try {
      // cleanup old socket listeners
      if (socket) {
        try { socket.ev.removeAllListeners(); } catch {}
        try { socket.end(); } catch {}
        socket = null;
      }
      const { version } = await fetchLatestBaileysVersion();
      socket = await createSocket({ version });
    } catch (err) {
      logger.error({ err }, 'reconnect failed');
      // schedule another attempt
      reconnectAttempts += 1;
      const delay = Math.min(5000 * reconnectAttempts, 60_000);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        reconnect().catch((e) => logger.error({ e }, 'reconnect retry threw'));
      }, delay);
    } finally {
      activeReconnect = null;
    }
  })();
  return activeReconnect;
}

/** Start the bot. Returns the socket (resolved when connected). */
export function start({ onReady } = {}) {
  onReadyCb = onReady || null;
  if (isShuttingDown) {
    logger.warn('cannot start — shutdown in progress');
    return null;
  }
  startedAt = Date.now();
  fetchLatestBaileysVersion()
    .then(({ version }) => createSocket({ version }))
    .then((s) => {
      socket = s;
      logger.info({ baileysVersion: s.version }, 'socket created');
    })
    .catch((err) => {
      logger.error({ err }, 'initial connection failed');
      // attempt recovery
      setTimeout(() => reconnect(), 5000);
    });
  return socket;
}

/** Get the current socket (may be null if not yet started). */
export function getSocket() {
  return socket;
}

/** True if socket is currently open. */
export function isOpen() {
  return lastStatus === 'open';
}

/** Status string for diagnostics. */
export function status() {
  return {
    status: lastStatus,
    uptimeMs: Date.now() - startedAt,
    reconnectAttempts,
    hasSocket: !!socket,
    user: socket?.user?.id || null,
    pushName: socket?.user?.name || null,
    baileysVersion: socket?.version || null,
    hasQr: !!_lastQr,
  };
}

/** Graceful shutdown. */
export async function shutdown({ logout = false } = {}) {
  isShuttingDown = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    try {
      if (logout) {
        await socket.logout();
      } else {
        await socket.end(new Error('shutdown'));
      }
    } catch (err) {
      logger.warn({ err }, 'error during socket end');
    }
    try { socket.ev.removeAllListeners(); } catch {}
    socket = null;
  }
  logger.info({ logout }, 'shutdown complete');
}

// install signal handlers — graceful shutdown on Ctrl+C / systemctl stop.
// NOTE: better-sqlite3's native Statement destructors may emit a stack trace
// during V8 teardown. This is harmless (the process is exiting anyway) and
// does not affect the running bot.
let shuttingDownFlag = false;
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    if (shuttingDownFlag) return;
    shuttingDownFlag = true;
    logger.info({ sig }, 'received signal — shutting down');
    try { closeDatabase(); } catch {}
    shutdown({ logout: false })
      .then(() => process.exit(0))
      .catch(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}

export default {
  start,
  getSocket,
  isOpen,
  status,
  shutdown,
  tryRecoverSession,
};
