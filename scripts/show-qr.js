/**
 * scripts/show-qr.js
 *
 * Starts Baileys, captures the QR pairing code, and saves it as a PNG
 * so the user can download and scan it with their phone.
 *
 * The script keeps running until either:
 *  - the user scans the QR (connection opens)
 *  - 90 seconds elapse with no scan
 *
 * Output PNG: /home/z/my-project/download/qr.png
 */
import QRCode from 'qrcode';
import {
  makeWASocket,
  useMultiFileAuthState,
  Browsers,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from '@whiskeysockets/baileys';
import qrcodeTerminal from 'qrcode-terminal';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DOWNLOAD_DIR = '/home/z/my-project/download';
const QR_PNG = resolve(DOWNLOAD_DIR, 'qr.png');
const QR_TXT = resolve(DOWNLOAD_DIR, 'qr.txt');

mkdirSync(DOWNLOAD_DIR, { recursive: true });

// Minimal logger — avoid pulling pino config that needs .env validation side effects.
const log = (msg, extra = '') => console.log(`[show-qr] ${msg}${extra ? ' ' + extra : ''}`);

log('starting QR generator…');

// Check if already authenticated
const SESSION_DIR = resolve(ROOT, 'auth_info');
const existingCreds = existsSync(resolve(SESSION_DIR, 'creds.json'));
if (existingCreds) {
  log('⚠️  Existing session found in auth_info/. If the session is still valid, no QR will be needed.');
  log('   To force a fresh QR, stop this script and delete auth_info/ first.');
}

let qrCount = 0;
let connected = false;
let lastQrData = null;
let sock = null;
let reconnectAttempts = 0;

async function startSocket() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();
  log(`baileys version: ${version.join('.')}`);

  sock = makeWASocket({
    version,
    auth: state,
    logger: {
      level: 'silent',
      info: () => {},
      debug: () => {},
      warn: () => {},
      error: () => {},
      trace: () => {},
      fatal: () => {},
      child: () => ({ level: 'silent', info: () => {}, debug: () => {}, warn: () => {}, error: () => {}, trace: () => {}, fatal: () => {}, child: () => ({}) }),
    },
    printQRInTerminal: false,
    // Use Ubuntu browser fingerprint — the default macOS fingerprint gets
    // rejected by WhatsApp from this server.
    browser: ['Ubuntu', 'Desktop', '22.04.4'],
    connectTimeoutMs: 20_000,
    defaultQueryTimeoutMs: 30_000,
  });

  sock.ev.on('connection.update', async (update) => {
    const { qr, connection, lastDisconnect } = update;

    if (qr) {
      qrCount += 1;
      lastQrData = qr;
      log(`QR #${qrCount} received — generating PNG…`);
      try {
        await QRCode.toFile(QR_PNG, qr, { width: 512, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
        writeFileSync(QR_TXT, qr, 'utf8');
        log(`✅ QR PNG saved to: ${QR_PNG}`);
        log(`   Raw QR data saved to: ${QR_TXT}`);
        log('');
        log('Scan the QR with your phone:');
        log('  WhatsApp → Settings → Linked Devices → Link a Device');
        log('');
        qrcodeTerminal.generate(qr, { small: true });
        log('');
        log('Waiting for scan… (QR refreshes every ~60s if not scanned)');
      } catch (err) {
        log(`❌ Failed to generate QR PNG: ${err.message}`);
      }
    }

    if (connection === 'connecting') {
      log('connecting to WhatsApp servers…');
    }

    if (connection === 'open') {
      connected = true;
      reconnectAttempts = 0;
      log('');
      log('🎉 CONNECTED!');
      log(`   Bot user JID: ${sock.user?.id}`);
      log(`   Push name: ${sock.user?.name || '(none)'}`);
      log('');
      log('   Auth credentials saved to auth_info/.');
      log('   You can now run `npm start` to launch the full bot.');
      try { rmSync(QR_PNG, { force: true }); } catch {}
      try { rmSync(QR_TXT, { force: true }); } catch {}
      setTimeout(() => process.exit(0), 1500);
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode ?? lastDisconnect?.error?.statusCode ?? -1;
      const reason = DisconnectReason?.[code] ?? 'unknown';
      log(`connection closed (code=${code}, reason=${reason})`);
      if (code === DisconnectReason.loggedOut) {
        log('❌ Logged out — session invalid. Delete auth_info/ and re-run.');
        process.exit(1);
      }
      // Auto-reconnect with backoff
      reconnectAttempts += 1;
      const delay = Math.min(2000 * reconnectAttempts + Math.floor(Math.random() * 1000), 15_000);
      log(`scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts})`);
      setTimeout(async () => {
        try {
          if (sock?.ev) sock.ev.removeAllListeners();
          try { sock?.end(); } catch {}
          await startSocket();
        } catch (err) {
          log(`reconnect threw: ${err.message}`);
        }
      }, delay);
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

await startSocket();

// Safety timeout: exit after 9 minutes no matter what.
setTimeout(() => {
  if (!connected) {
    log('⏱  Timeout: no scan after 9 minutes. Exiting. Re-run this script to try again.');
    process.exit(2);
  }
}, 9 * 60 * 1000).unref();

// Keep the process alive
setInterval(() => {}, 1000);

// Handle Ctrl+C
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    log(`received ${sig} — exiting`);
    try { sock.end(); } catch {}
    process.exit(0);
  });
}
