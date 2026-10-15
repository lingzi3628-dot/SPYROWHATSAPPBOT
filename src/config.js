/**
 * config.js
 * Strongly-typed configuration loader.
 * - Reads .env via dotenv
 * - Validates required fields
 * - Coerces types
 * - Exposes a frozen config object
 */
import dotenv from 'dotenv';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function envStr(name, def = '') {
  const v = process.env[name];
  return v === undefined || v === '' ? def : String(v);
}
function envBool(name, def = false) {
  const v = process.env[name];
  if (v === undefined || v === '') return def;
  return /^(1|true|yes|on)$/i.test(String(v).trim());
}
function envInt(name, def) {
  const v = process.env[name];
  if (v === undefined || v === '') return def;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : def;
}

// ---- Validation ----------------------------------------------------------
const errors = [];
const OWNER_JID = envStr('OWNER_JID', '');
if (OWNER_JID && !/^.+@s\.whatsapp\.net$/.test(OWNER_JID)) {
  errors.push(`OWNER_JID must look like 2547XXXXXXXX@s.whatsapp.net (got "${OWNER_JID}")`);
}

const BOT_PREFIX = envStr('BOT_PREFIX', '.');
if (!BOT_PREFIX || BOT_PREFIX.length > 4) {
  errors.push('BOT_PREFIX must be 1-4 characters');
}

const LOG_LEVEL = envStr('LOG_LEVEL', 'info').toLowerCase();
if (!['trace', 'debug', 'info', 'warn', 'error', 'fatal'].includes(LOG_LEVEL)) {
  errors.push(`LOG_LEVEL "${LOG_LEVEL}" is invalid`);
}

if (errors.length) {
  // eslint-disable-next-line no-console
  console.error('Configuration errors:\n - ' + errors.join('\n - '));
  process.exit(1);
}

// ---- Paths ---------------------------------------------------------------
const SESSION_DIR = resolve(ROOT, envStr('SESSION_DIR', './auth_info'));
const DATABASE_PATH = resolve(ROOT, envStr('DATABASE_PATH', './data/bot.sqlite'));
const DATA_DIR = dirname(DATABASE_PATH);
const TMP_DIR = resolve(ROOT, 'tmp');

for (const dir of [SESSION_DIR, DATA_DIR, TMP_DIR]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// ---- Cooldown / rate limits ---------------------------------------------
const COMMAND_COOLDOWN_SEC = envInt('COMMAND_COOLDOWN', 3);
const MAX_MEDIA_MB = envInt('MAX_MEDIA_MB', 20);
const MAX_MEDIA_BYTES = MAX_MEDIA_MB * 1024 * 1024;
const DEFAULT_WARN_LIMIT = envInt('DEFAULT_WARN_LIMIT', 3);

const config = {
  ROOT,
  BOT_NAME: envStr('BOT_NAME', 'WhatsApp Bot'),
  BOT_PREFIX,
  BOT_LOCALE: envStr('BOT_LOCALE', 'en'),
  OWNER_JID,

  SESSION_DIR,
  DATABASE_PATH,
  DATA_DIR,
  TMP_DIR,

  LOG_LEVEL,
  LOG_PRETTY: envBool('LOG_PRETTY', true),

  MAX_MEDIA_MB,
  MAX_MEDIA_BYTES,
  FFMPEG_PATH: envStr('FFMPEG_PATH', ''),
  FFPROBE_PATH: envStr('FFPROBE_PATH', ''),

  COMMAND_COOLDOWN_SEC,
  DEFAULT_WARN_LIMIT,
  MAINTENANCE_MODE: envBool('MAINTENANCE_MODE', false),

  // external services
  ENABLE_AI: envBool('ENABLE_AI', false),
  OPENAI_API_BASE: envStr('OPENAI_API_BASE', 'https://api.openai.com/v1'),
  OPENAI_API_KEY: envStr('OPENAI_API_KEY', ''),
  OPENAI_MODEL: envStr('OPENAI_MODEL', 'gpt-4o-mini'),

  SHORTENER_API_KEY: envStr('SHORTENER_API_KEY', ''),
  OPENWEATHER_API_KEY: envStr('OPENWEATHER_API_KEY', ''),
  CURRENCY_API_KEY: envStr('CURRENCY_API_KEY', ''),
  DICTIONARY_API_KEY: envStr('DICTIONARY_API_KEY', ''),

  QR_API_BASE: envStr('QR_API_BASE', 'https://api.qrserver.com/v1'),
  JOKE_API_BASE: envStr('JOKE_API_BASE', 'https://v2.jokeapi.dev'),
  MEME_API_BASE: envStr('MEME_API_BASE', 'https://meme-api.com/gimme'),

  DONATE_INFO: envStr('DONATE_INFO', 'Donations are welcome.'),
  SUPPORT_INFO: envStr('SUPPORT_INFO', 'https://github.com/WhiskeySockets/Baileys'),

  VERSION: '1.0.0',
  STARTED_AT: Date.now(),
};

export default Object.freeze(config);
