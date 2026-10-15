/**
 * scripts/pair-phone.js
 *
 * Pair the bot using a phone number instead of QR code.
 * WhatsApp will send an 8-character pairing code to the user's phone.
 * The user enters this code in WhatsApp → Settings → Linked Devices → Link with phone number.
 *
 * Usage: node scripts/pair-phone.js <phone>
 * Example: node scripts/pair-phone.js 254798081280
 */
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from '@whiskeysockets/baileys';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, rmSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SESSION_DIR = resolve(ROOT, 'auth_info');

const phone = process.argv[2];
if (!phone) {
  console.error('Usage: node scripts/pair-phone.js <phone>');
  console.error('Example: node scripts/pair-phone.js 254798081280');
  process.exit(1);
}

// Clean session for fresh pairing
rmSync(SESSION_DIR, { recursive: true, force: true });

const log = (msg) => console.log(`[pair] ${msg}`);

log(`starting phone pairing for +${phone}…`);

const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
const { version } = await fetchLatestBaileysVersion();
log(`baileys version: ${version.join('.')}`);

let connected = false;
let codeRequested = false;

const sock = makeWASocket({
  version,
  auth: state,
  logger: {
    level: 'silent',
    info: () => {}, debug: () => {}, warn: () => {}, error: () => {},
    trace: () => {}, fatal: () => {},
    child: () => ({ level: 'silent', info: () => {}, debug: () => {}, warn: () => {}, error: () => {}, trace: () => {}, fatal: () => {}, child: () => ({}) }),
  },
  printQRInTerminal: false,
  browser: ['Ubuntu', 'Desktop', '22.04.4'],
  connectTimeoutMs: 60_000,
  defaultQueryTimeoutMs: 60_000,
  keepAliveIntervalMs: 15_000,
});

sock.ev.on('connection.update', async (update) => {
  const { qr, connection, lastDisconnect, receivedPendingNotifications } = update;

  if (connection === 'connecting') {
    log('connecting to WhatsApp…');
  }

  // Request pairing code as soon as we get a QR (connection is ready for pairing)
  if (qr && !codeRequested) {
    codeRequested = true;
    log('connection ready — requesting pairing code…');
    try {
      // Wait a moment for the connection to stabilize
      await new Promise((r) => setTimeout(r, 1000));
      const code = await sock.requestPairingCode(phone);
      log('');
      log('═══════════════════════════════════════════════════');
      log('  🔑 YOUR PAIRING CODE:');
      log('');
      log(`     ${code}`);
      log('');
      log('  Enter this code on your phone:');
      log('  WhatsApp → Settings → Linked Devices →');
      log('  Link a Device → Link with phone number');
      log('═══════════════════════════════════════════════════');
      log('');
      log('Waiting for you to enter the code on your phone…');
    } catch (err) {
      log(`❌ Failed to request pairing code: ${err.message}`);
      log('Falling back to QR mode. Run scripts/show-qr.js instead.');
      process.exit(1);
    }
  }

  if (connection === 'open') {
    connected = true;
    log('');
    log('🎉 CONNECTED!');
    log(`   Bot user JID: ${sock.user?.id}`);
    log(`   Push name: ${sock.user?.name || '(none)'}`);
    log('');
    log('   Auth credentials saved to auth_info/.');
    log('   You can now run `npm start` to launch the full bot.');
    setTimeout(() => process.exit(0), 2000);
  }

  if (connection === 'close') {
    const code = lastDisconnect?.error?.output?.statusCode ?? -1;
    const reason = DisconnectReason?.[code] ?? 'unknown';
    log(`connection closed (code=${code}, reason=${reason})`);
    if (code === DisconnectReason.loggedOut) {
      log('❌ Logged out.');
      process.exit(1);
    }
    if (!connected && !codeRequested) {
      log('Re-run this script to try again.');
      process.exit(1);
    }
    // If we already requested the code, the connection might close and reopen
    if (!connected) {
      log('Connection dropped — waiting for reconnect…');
    }
  }
});

sock.ev.on('creds.update', saveCreds);

// Keep alive for 5 minutes
setTimeout(() => {
  if (!connected) {
    log('⏱  Timeout: no pairing after 5 minutes. Exiting.');
    process.exit(2);
  }
}, 5 * 60 * 1000).unref();

setInterval(() => {}, 1000);

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    log(`received ${sig} — exiting`);
    try { sock.end(); } catch {}
    process.exit(0);
  });
}
