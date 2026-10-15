/**
 * database.js
 * SQLite (better-sqlite3) wrapper.
 * - Initializes schema
 * - Exposes prepared statements & helpers
 * - Safe parameterized queries everywhere
 */
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import config from './config.js';
import logger from './logger.js';

// ensure dir exists
mkdirSync(dirname(config.DATABASE_PATH), { recursive: true });

export const db = new Database(config.DATABASE_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---- Schema ---------------------------------------------------------------
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS group_settings (
    jid TEXT PRIMARY KEY,
    antilink INTEGER DEFAULT 0,
    antispam INTEGER DEFAULT 0,
    antiflood INTEGER DEFAULT 0,
    antibadword INTEGER DEFAULT 0,
    antimention INTEGER DEFAULT 0,
    antitag INTEGER DEFAULT 0,
    antibot INTEGER DEFAULT 0,
    welcome INTEGER DEFAULT 0,
    goodbye INTEGER DEFAULT 0,
    welcome_msg TEXT DEFAULT '',
    goodbye_msg TEXT DEFAULT '',
    rules TEXT DEFAULT '',
    warn_limit INTEGER DEFAULT 3,
    prefix TEXT DEFAULT '',
    mute INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    updated_at INTEGER DEFAULT (strftime('%s','now'))
  );`,

  `CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_jid TEXT NOT NULL,
    user_jid TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    last_reason TEXT DEFAULT '',
    updated_at INTEGER DEFAULT (strftime('%s','now')),
    UNIQUE(group_jid, user_jid)
  );`,

  `CREATE TABLE IF NOT EXISTS user_prefs (
    jid TEXT PRIMARY KEY,
    language TEXT DEFAULT 'en',
    blocked INTEGER DEFAULT 0,
    notes TEXT DEFAULT ''
  );`,

  `CREATE TABLE IF NOT EXISTS cooldowns (
    key TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS command_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command TEXT NOT NULL,
    user_jid TEXT NOT NULL,
    group_jid TEXT,
    executed_at INTEGER DEFAULT (strftime('%s','now'))
  );`,

  `CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_jid TEXT NOT NULL,
    group_jid TEXT,
    remind_at INTEGER NOT NULL,
    message TEXT NOT NULL,
    delivered INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );`,

  `CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor TEXT,
    action TEXT NOT NULL,
    target TEXT,
    group_jid TEXT,
    detail TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );`,

  `CREATE TABLE IF NOT EXISTS bot_state (
    key TEXT PRIMARY KEY,
    value TEXT
  );`,

  `CREATE TABLE IF NOT EXISTS deleted_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_jid TEXT NOT NULL,
    sender_jid TEXT NOT NULL,
    message_id TEXT NOT NULL,
    message_text TEXT,
    message_type TEXT,
    has_media INTEGER DEFAULT 0,
    recovered_at INTEGER DEFAULT (strftime('%s','now'))
  );`,

  `CREATE TABLE IF NOT EXISTS ai_settings (
    jid TEXT PRIMARY KEY,
    auto_reply INTEGER DEFAULT 0,
    personality TEXT DEFAULT '',
    mode TEXT DEFAULT 'assistant'
  );`,

  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    banned INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );`,

  `CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    phone TEXT,
    status TEXT DEFAULT 'inactive',
    bot_jid TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now')),
    last_active INTEGER DEFAULT (strftime('%s','now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );`,

  `CREATE TABLE IF NOT EXISTS ai_training (
    user_id INTEGER PRIMARY KEY,
    character_name TEXT DEFAULT '',
    personality TEXT DEFAULT '',
    emotions TEXT DEFAULT '',
    speaking_style TEXT DEFAULT '',
    example_pairs TEXT DEFAULT '',
    auto_reply_offline INTEGER DEFAULT 0,
    updated_at INTEGER DEFAULT (strftime('%s','now'))
  );`,

  `CREATE TABLE IF NOT EXISTS bot_customization (
    user_id INTEGER PRIMARY KEY,
    bot_name TEXT DEFAULT '',
    bot_prefix TEXT DEFAULT '',
    theme TEXT DEFAULT 'dark',
    response_length TEXT DEFAULT 'medium',
    emoji_usage TEXT DEFAULT 'light',
    language TEXT DEFAULT 'en',
    blacklist_words TEXT DEFAULT '',
    custom_greeting TEXT DEFAULT '',
    hide_commands TEXT DEFAULT '',
    updated_at INTEGER DEFAULT (strftime('%s','now'))
  );`,

  `CREATE TABLE IF NOT EXISTS ai_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    fact TEXT NOT NULL,
    about_jid TEXT,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );`,

  `CREATE TABLE IF NOT EXISTS group_customization (
    group_jid TEXT PRIMARY KEY,
    user_id INTEGER,
    custom_prefix TEXT DEFAULT '',
    ai_personality TEXT DEFAULT '',
    theme_color TEXT DEFAULT '',
    welcome_card TEXT DEFAULT '',
    updated_at INTEGER DEFAULT (strftime('%s','now'))
  );`,

  `CREATE TABLE IF NOT EXISTS moderation_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_jid TEXT NOT NULL,
    target_jid TEXT NOT NULL,
    group_jid TEXT,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );`,

  `CREATE TABLE IF NOT EXISTS moderation_appeals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_jid TEXT NOT NULL,
    action_id INTEGER,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );`,

  `CREATE TABLE IF NOT EXISTS scheduled_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    chat_jid TEXT NOT NULL,
    message TEXT NOT NULL,
    send_at INTEGER NOT NULL,
    recurring TEXT DEFAULT '',
    delivered INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );`,

  `CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    group_jid TEXT NOT NULL,
    name TEXT NOT NULL,
    event_at INTEGER NOT NULL,
    reminder_sent INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );`,

  `CREATE TABLE IF NOT EXISTS auto_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    chat_jid TEXT NOT NULL,
    keyword TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );`,

  `CREATE TABLE IF NOT EXISTS sticker_packs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    stickers TEXT DEFAULT '[]',
    created_at INTEGER DEFAULT (strftime('%s','now'))
  );`,

  `CREATE TABLE IF NOT EXISTS bot_mood (
    user_id INTEGER PRIMARY KEY,
    mood TEXT DEFAULT 'neutral',
    mood_score INTEGER DEFAULT 50,
    last_updated INTEGER DEFAULT (strftime('%s','now'))
  );`,

  `CREATE TABLE IF NOT EXISTS user_xp (
    jid TEXT PRIMARY KEY,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    last_msg INTEGER DEFAULT (strftime('%s','now'))
  );`,

  `CREATE INDEX IF NOT EXISTS idx_cmd_stats_cmd ON command_stats(command);
   CREATE INDEX IF NOT EXISTS idx_reminders_undelivered ON reminders(delivered, remind_at);
   CREATE INDEX IF NOT EXISTS idx_audit_group ON audit_log(group_jid, created_at);`,
];

// Initialize schema BEFORE preparing statements
db.exec('BEGIN');
try {
  for (const stmt of SCHEMA) db.exec(stmt);
  db.exec('COMMIT');
} catch (err) {
  db.exec('ROLLBACK');
  throw err;
}
logger.info({ path: config.DATABASE_PATH }, 'database initialized');

export function initDatabase() {
  // No-op now: schema initialized at module load.
  // Kept for backwards compatibility with package.json scripts and tests.
  return true;
}

// ---- Prepared helpers (lazy) ---------------------------------------------
// We lazy-prepare statements on first use to avoid native crashes when this
// module is imported by the Node test runner (which tears down V8 isolates
// before better-sqlite3's native destructors run).

// Track all opened statements so closeDatabase() can finalize them.
const _openedStatements = [];

function lazy(sql) {
  let s = null;
  return (...args) => {
    if (!s) {
      s = db.prepare(sql);
      _openedStatements.push(s);
    }
    return args.length === 0 ? s : s.run(...args);
  };
}

/**
 * A small wrapper that lets us keep the same `stmts.foo.get(...)` / `.run(...)`
 * ergonomics while preparing lazily.
 */
function makeStmt(sql) {
  let s = null;
  const get = () => {
    if (!s) {
      s = db.prepare(sql);
      _openedStatements.push(s);
    }
    return s;
  };
  return new Proxy({}, {
    get(_t, prop) {
      const stmt = get();
      const v = stmt[prop];
      return typeof v === 'function' ? v.bind(stmt) : v;
    },
  });
}

export const stmts = {
  getGroupSettings: makeStmt('SELECT * FROM group_settings WHERE jid = ?'),
  upsertGroupSetting: makeStmt(`INSERT INTO group_settings (jid, updated_at) VALUES (?, strftime('%s','now'))
    ON CONFLICT(jid) DO UPDATE SET updated_at = strftime('%s','now')`),
  setGroupSetting: makeStmt(`UPDATE group_settings SET updated_at = strftime('%s','now') WHERE jid = ?`),

  getWarnings: makeStmt('SELECT * FROM warnings WHERE group_jid = ? AND user_jid = ?'),
  bumpWarning: makeStmt(`INSERT INTO warnings (group_jid, user_jid, count, last_reason, updated_at)
    VALUES (?, ?, 1, ?, strftime('%s','now'))
    ON CONFLICT(group_jid, user_jid) DO UPDATE
      SET count = count + 1, last_reason = ?, updated_at = strftime('%s','now')`),
  setWarnings: makeStmt(`INSERT INTO warnings (group_jid, user_jid, count, last_reason, updated_at)
    VALUES (?, ?, ?, ?, strftime('%s','now'))
    ON CONFLICT(group_jid, user_jid) DO UPDATE
      SET count = ?, last_reason = ?, updated_at = strftime('%s','now')`),
  clearWarnings: makeStmt('DELETE FROM warnings WHERE group_jid = ? AND user_jid = ?'),

  getUserPref: makeStmt('SELECT * FROM user_prefs WHERE jid = ?'),
  setUserPref: makeStmt(`INSERT INTO user_prefs (jid, language, blocked, notes)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(jid) DO UPDATE
      SET language = COALESCE(excluded.language, user_prefs.language),
          blocked = COALESCE(excluded.blocked, user_prefs.blocked),
          notes   = COALESCE(excluded.notes, user_prefs.notes)`),

  getCooldown: makeStmt('SELECT expires_at FROM cooldowns WHERE key = ?'),
  setCooldown: makeStmt(`INSERT INTO cooldowns (key, expires_at) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET expires_at = ?`),
  clearExpiredCooldowns: makeStmt('DELETE FROM cooldowns WHERE expires_at < ?'),

  logCommand: makeStmt(`INSERT INTO command_stats (command, user_jid, group_jid) VALUES (?, ?, ?)`),

  addReminder: makeStmt(`INSERT INTO reminders (user_jid, group_jid, remind_at, message) VALUES (?, ?, ?, ?)`),
  dueReminders: makeStmt(`SELECT * FROM reminders WHERE delivered = 0 AND remind_at <= ? ORDER BY remind_at ASC`),
  markReminderDelivered: makeStmt('UPDATE reminders SET delivered = 1 WHERE id = ?'),

  addAudit: makeStmt(`INSERT INTO audit_log (actor, action, target, group_jid, detail) VALUES (?, ?, ?, ?, ?)`),

  getState: makeStmt('SELECT value FROM bot_state WHERE key = ?'),
  setState: makeStmt(`INSERT INTO bot_state (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = ?`),

  // ── Deleted messages cache (anti-delete) ───────────────────────
  saveDeleted: makeStmt(`INSERT INTO deleted_messages
    (chat_jid, sender_jid, message_id, message_text, message_type, has_media)
    VALUES (?, ?, ?, ?, ?, ?)`),
  getDeleted: makeStmt(`SELECT * FROM deleted_messages
    WHERE chat_jid = ? ORDER BY recovered_at DESC LIMIT ?`),
  clearDeleted: makeStmt('DELETE FROM deleted_messages WHERE chat_jid = ?'),

  // ── AI settings (per-chat auto-reply + personality) ────────────
  getAiSettings: makeStmt('SELECT * FROM ai_settings WHERE jid = ?'),
  setAiSettings: makeStmt(`INSERT INTO ai_settings (jid, auto_reply, personality, mode)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(jid) DO UPDATE SET
      auto_reply = COALESCE(excluded.auto_reply, ai_settings.auto_reply),
      personality = COALESCE(excluded.personality, ai_settings.personality),
      mode = COALESCE(excluded.mode, ai_settings.mode)`),

  // ── Users (web accounts) ───────────────────────────────────────
  getUserByEmail: makeStmt('SELECT * FROM users WHERE email = ?'),
  getUserById: makeStmt('SELECT * FROM users WHERE id = ?'),
  createUser: makeStmt('INSERT INTO users (email, phone, password_hash, role) VALUES (?, ?, ?, ?)'),
  updateUserRole: makeStmt('UPDATE users SET role = ? WHERE id = ?'),
  banUser: makeStmt('UPDATE users SET banned = 1 WHERE id = ?'),
  unbanUser: makeStmt('UPDATE users SET banned = 0 WHERE id = ?'),
  getAllUsers: makeStmt('SELECT id, email, phone, role, banned, created_at FROM users ORDER BY created_at DESC'),
  countUsers: makeStmt('SELECT COUNT(*) as c FROM users'),

  // ── User sessions (WhatsApp links) ─────────────────────────────
  getUserSession: makeStmt('SELECT * FROM user_sessions WHERE user_id = ?'),
  upsertUserSession: makeStmt(`INSERT INTO user_sessions (user_id, phone, status, bot_jid, last_active)
    VALUES (?, ?, ?, ?, strftime('%s','now'))
    ON CONFLICT(user_id) DO UPDATE SET
      phone = COALESCE(excluded.phone, user_sessions.phone),
      status = excluded.status,
      bot_jid = COALESCE(excluded.bot_jid, user_sessions.bot_jid),
      last_active = strftime('%s','now')`),
  updateUserSessionStatus: makeStmt('UPDATE user_sessions SET status = ?, bot_jid = ?, last_active = strftime(\'%s\',\'now\') WHERE user_id = ?'),
  countActiveSessions: makeStmt("SELECT COUNT(*) as c FROM user_sessions WHERE status = 'connected'"),
  getAllSessions: makeStmt('SELECT * FROM user_sessions ORDER BY last_active DESC'),

  // ── AI Training (per-user character/personality training) ──────
  getAiTraining: makeStmt('SELECT * FROM ai_training WHERE user_id = ?'),
  upsertAiTraining: makeStmt(`INSERT INTO ai_training
    (user_id, character_name, personality, emotions, speaking_style, example_pairs, auto_reply_offline, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s','now'))
    ON CONFLICT(user_id) DO UPDATE SET
      character_name = excluded.character_name,
      personality = excluded.personality,
      emotions = excluded.emotions,
      speaking_style = excluded.speaking_style,
      example_pairs = excluded.example_pairs,
      auto_reply_offline = excluded.auto_reply_offline,
      updated_at = strftime('%s','now')`),

  // ── Bot Customization (per-user branding/styling) ─────────────
  getCustomization: makeStmt('SELECT * FROM bot_customization WHERE user_id = ?'),
  upsertCustomization: makeStmt(`INSERT INTO bot_customization
    (user_id, bot_name, bot_prefix, theme, response_length, emoji_usage, language, blacklist_words, custom_greeting, hide_commands, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s','now'))
    ON CONFLICT(user_id) DO UPDATE SET
      bot_name = COALESCE(excluded.bot_name, bot_customization.bot_name),
      bot_prefix = COALESCE(excluded.bot_prefix, bot_customization.bot_prefix),
      theme = COALESCE(excluded.theme, bot_customization.theme),
      response_length = COALESCE(excluded.response_length, bot_customization.response_length),
      emoji_usage = COALESCE(excluded.emoji_usage, bot_customization.emoji_usage),
      language = COALESCE(excluded.language, bot_customization.language),
      blacklist_words = COALESCE(excluded.blacklist_words, bot_customization.blacklist_words),
      custom_greeting = COALESCE(excluded.custom_greeting, bot_customization.custom_greeting),
      hide_commands = COALESCE(excluded.hide_commands, bot_customization.hide_commands),
      updated_at = strftime('%s','now')`),

  // ── AI Memory (facts the bot remembers) ───────────────────────
  addMemory: makeStmt('INSERT INTO ai_memory (user_id, fact, about_jid) VALUES (?, ?, ?)'),
  getMemories: makeStmt('SELECT * FROM ai_memory WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'),
  getMemoriesAbout: makeStmt('SELECT * FROM ai_memory WHERE user_id = ? AND about_jid = ? ORDER BY created_at DESC LIMIT ?'),
  deleteMemory: makeStmt('DELETE FROM ai_memory WHERE id = ?'),
  clearMemories: makeStmt('DELETE FROM ai_memory WHERE user_id = ?'),

  // ── Group Customization (per-group settings) ──────────────────
  getGroupCustomization: makeStmt('SELECT * FROM group_customization WHERE group_jid = ?'),
  upsertGroupCustomization: makeStmt(`INSERT INTO group_customization
    (group_jid, user_id, custom_prefix, ai_personality, theme_color, welcome_card, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, strftime('%s','now'))
    ON CONFLICT(group_jid) DO UPDATE SET
      user_id = COALESCE(excluded.user_id, group_customization.user_id),
      custom_prefix = COALESCE(excluded.custom_prefix, group_customization.custom_prefix),
      ai_personality = COALESCE(excluded.ai_personality, group_customization.ai_personality),
      theme_color = COALESCE(excluded.theme_color, group_customization.theme_color),
      welcome_card = COALESCE(excluded.welcome_card, group_customization.welcome_card),
      updated_at = strftime('%s','now')`),

  // ── Moderation reports + appeals ──────────────────────────────
  addReport: makeStmt('INSERT INTO moderation_reports (reporter_jid, target_jid, group_jid, reason) VALUES (?, ?, ?, ?)'),
  getReports: makeStmt('SELECT * FROM moderation_reports ORDER BY created_at DESC LIMIT ?'),
  updateReportStatus: makeStmt('UPDATE moderation_reports SET status = ? WHERE id = ?'),

  addAppeal: makeStmt('INSERT INTO moderation_appeals (user_jid, action_id, reason) VALUES (?, ?, ?)'),
  getAppeals: makeStmt('SELECT * FROM moderation_appeals ORDER BY created_at DESC LIMIT ?'),
  updateAppealStatus: makeStmt('UPDATE moderation_appeals SET status = ? WHERE id = ?'),

  // ── Scheduled messages ────────────────────────────────────────
  addScheduled: makeStmt('INSERT INTO scheduled_messages (user_id, chat_jid, message, send_at, recurring) VALUES (?, ?, ?, ?, ?)'),
  getScheduled: makeStmt('SELECT * FROM scheduled_messages WHERE user_id = ? AND delivered = 0 ORDER BY send_at ASC LIMIT ?'),
  dueScheduled: makeStmt('SELECT * FROM scheduled_messages WHERE delivered = 0 AND send_at <= ? LIMIT 50'),
  markScheduledDelivered: makeStmt('UPDATE scheduled_messages SET delivered = 1 WHERE id = ?'),
  deleteScheduled: makeStmt('DELETE FROM scheduled_messages WHERE id = ?'),
  updateScheduledNext: makeStmt('UPDATE scheduled_messages SET send_at = ? WHERE id = ?'),

  // ── Events ────────────────────────────────────────────────────
  addEvent: makeStmt('INSERT INTO events (user_id, group_jid, name, event_at) VALUES (?, ?, ?, ?)'),
  getEvents: makeStmt('SELECT * FROM events WHERE group_jid = ? AND event_at > ? ORDER BY event_at ASC'),
  dueEventReminders: makeStmt('SELECT * FROM events WHERE reminder_sent = 0 AND event_at <= ?'),
  markEventReminderSent: makeStmt('UPDATE events SET reminder_sent = 1 WHERE id = ?'),
  deleteEvent: makeStmt('DELETE FROM events WHERE id = ?'),

  // ── Auto-responder rules ──────────────────────────────────────
  addAutoRule: makeStmt('INSERT INTO auto_rules (user_id, chat_jid, keyword, response) VALUES (?, ?, ?, ?)'),
  getAutoRules: makeStmt('SELECT * FROM auto_rules WHERE chat_jid = ?'),
  deleteAutoRule: makeStmt('DELETE FROM auto_rules WHERE id = ?'),

  // ── Sticker packs ─────────────────────────────────────────────
  addStickerPack: makeStmt('INSERT INTO sticker_packs (user_id, name, stickers) VALUES (?, ?, ?)'),
  getStickerPacks: makeStmt('SELECT * FROM sticker_packs WHERE user_id = ?'),
  updateStickerPack: makeStmt('UPDATE sticker_packs SET stickers = ? WHERE id = ?'),
  deleteStickerPack: makeStmt('DELETE FROM sticker_packs WHERE id = ?'),

  // ── Bot mood ──────────────────────────────────────────────────
  getBotMood: makeStmt('SELECT * FROM bot_mood WHERE user_id = ?'),
  upsertBotMood: makeStmt(`INSERT INTO bot_mood (user_id, mood, mood_score, last_updated)
    VALUES (?, ?, ?, strftime('%s','now'))
    ON CONFLICT(user_id) DO UPDATE SET
      mood = excluded.mood, mood_score = excluded.mood_score, last_updated = strftime('%s','now')`),

  // ── User XP ───────────────────────────────────────────────────
  getUserXp: makeStmt('SELECT * FROM user_xp WHERE jid = ?'),
  upsertUserXp: makeStmt(`INSERT INTO user_xp (jid, xp, level, last_msg)
    VALUES (?, ?, ?, strftime('%s','now'))
    ON CONFLICT(jid) DO UPDATE SET
      xp = excluded.xp, level = excluded.level, last_msg = strftime('%s','now')`),
  getTopUsers: makeStmt('SELECT * FROM user_xp ORDER BY xp DESC LIMIT ?'),
};

// keep `lazy` referenced (used by tests)
export { lazy };

// ---- High-level helpers ---------------------------------------------------
/**
 * Get a group's settings row, creating defaults if missing.
 * @param {string} jid
 */
export function getGroupSettings(jid) {
  let row = stmts.getGroupSettings.get(jid);
  if (!row) {
    stmts.upsertGroupSetting.run(jid);
    row = stmts.getGroupSettings.get(jid);
  }
  return row;
}

/**
 * Update a single group setting column.
 * @param {string} jid
 * @param {string} column  one of the validated column names
 * @param {number|string|boolean} value
 */
const ALLOWED_GROUP_COLS = new Set([
  'antilink', 'antispam', 'antiflood', 'antibadword', 'antimention',
  'antitag', 'antibot', 'welcome', 'goodbye', 'welcome_msg', 'goodbye_msg',
  'rules', 'warn_limit', 'prefix', 'mute',
]);
export function setGroupSetting(jid, column, value) {
  if (!ALLOWED_GROUP_COLS.has(column)) {
    throw new Error(`Refusing to update unknown column "${column}"`);
  }
  if (typeof value === 'boolean') value = value ? 1 : 0;
  getGroupSettings(jid); // ensure row exists
  // NOTE: column name validated against allowlist above, safe to interpolate
  db.prepare(`UPDATE group_settings SET ${column} = ?, updated_at = strftime('%s','now') WHERE jid = ?`)
    .run(value, jid);
}

export function audit({ actor, action, target = null, groupJid = null, detail = null }) {
  stmts.addAudit.run(actor ?? null, action, target, groupJid, detail);
}

/**
 * Cooldown helper.
 * Returns true if currently on cooldown (and remaining ms), false otherwise.
 */
export function checkCooldown(key, seconds) {
  const now = Date.now();
  const row = stmts.getCooldown.get(key);
  if (row && row.expires_at > now) {
    return { onCooldown: true, remainingMs: row.expires_at - now };
  }
  const expiresAt = now + seconds * 1000;
  stmts.setCooldown.run(key, expiresAt, expiresAt);
  return { onCooldown: false, remainingMs: 0 };
}

export function clearExpiredCooldowns() {
  stmts.clearExpiredCooldowns.run(Date.now());
}

/**
 * Reset all settings for a group to defaults.
 */
export function resetGroupSettings(jid) {
  db.prepare(`DELETE FROM group_settings WHERE jid = ?`).run(jid);
  getGroupSettings(jid); // recreate defaults
}

// (Schema already initialized at the top of this file.)

/**
 * Close the database connection (used for graceful shutdown / tests).
 * Frees all cached prepared statements before closing to prevent native
 * destructor crashes during V8 teardown.
 */
export function closeDatabase() {
  for (const s of _openedStatements) {
    try { s.finalize(); } catch {}
  }
  _openedStatements.length = 0;
  try {
    db.close();
  } catch {
    // already closed
  }
}
