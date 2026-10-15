/**
 * scripts/diagnose-connection.js
 * Try multiple browser fingerprints to see if any connect successfully.
 */
import {
  makeWASocket,
  useMultiFileAuthState,
  Browsers,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from '@whiskeysockets/baileys';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rmSync, existsSync, mkdirSync } from 'node:fs';
import pino from 'pino';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const logger = pino({
  level: 'info',
  transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' } },
});

const browsers = [
  ['Ubuntu', 'Desktop', '22.04.4'],
  ['Mac OS', 'Desktop', '14.4.1'],
  ['Windows', 'Desktop', '10.0.22631'],
  ['Ubuntu', 'Chrome', '120.0.0.0'],
];

for (const b of browsers) {
  const SESSION_DIR = resolve(ROOT, 'auth_info', 'diag-' + b[0].replace(/[^a-z0-9]/gi, '_'));
  rmSync(SESSION_DIR, { recursive: true, force: true });
  mkdirSync(SESSION_DIR, { recursive: true });

  console.log(`\n========================================`);
  console.log(`Trying browser: ${JSON.stringify(b)}`);
  console.log(`========================================`);

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const result = await new Promise((resolve) => {
    let resolved = false;
    const sock = makeWASocket({
      version,
      auth: state,
      logger: logger.child({ module: 'baileys', browser: b[0] }),
      printQRInTerminal: false,
      browser: b,
      connectTimeoutMs: 20_000,
    });

    sock.ev.on('connection.update', (update) => {
      if (update.qr && !resolved) {
        console.log(`✅ QR generated with browser ${JSON.stringify(b)}!`);
        resolved = true;
        try { sock.end(); } catch {}
        resolve({ success: true, browser: b });
      }
      if (update.connection === 'open' && !resolved) {
        console.log(`✅ Connection opened with browser ${JSON.stringify(b)}!`);
        resolved = true;
        try { sock.end(); } catch {}
        resolve({ success: true, browser: b });
      }
      if (update.connection === 'close' && !resolved) {
        const code = update.lastDisconnect?.error?.output?.statusCode;
        const reason = DisconnectReason?.[code] || 'unknown';
        console.log(`❌ closed: code=${code} reason=${reason}`);
        console.log(`   error: ${update.lastDisconnect?.error?.message || 'n/a'}`);
        resolved = true;
        resolve({ success: false, browser: b, code, reason });
      }
    });

    sock.ev.on('creds.update', saveCreds);

    setTimeout(() => {
      if (!resolved) {
        console.log('⏱  timeout');
        resolved = true;
        try { sock.end(); } catch {}
        resolve({ success: false, browser: b, reason: 'timeout' });
      }
    }, 18_000);
  });

  console.log(`Result: ${JSON.stringify(result)}`);
  if (result.success) break;
  await new Promise((r) => setTimeout(r, 2000));
}

console.log('\nDone.');
process.exit(0);
