/**
 * db/postgres.js
 * Neon PostgreSQL database layer for Spyro Bot.
 *
 * Handles: users, sessions, settings, logs, stats.
 * Falls back to SQLite if DATABASE_URL is not set.
 */
import pg from 'pg';
import logger from '../logger.js';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || '';
let pool = null;
let isConnected = false;

const SCHEMA = `
-- Users (web accounts)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  banned INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- WhatsApp sessions (one per user)
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  phone TEXT,
  status TEXT DEFAULT 'inactive',
  bot_jid TEXT,
  push_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Bot settings per user (JSON key-value store)
CREATE TABLE IF NOT EXISTS bot_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  key TEXT NOT NULL,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- AI training data per user
CREATE TABLE IF NOT EXISTS ai_training (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  character_name TEXT DEFAULT '',
  personality TEXT DEFAULT '',
  emotions TEXT DEFAULT '',
  speaking_style TEXT DEFAULT '',
  example_pairs TEXT DEFAULT '[]',
  auto_reply_offline INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Moderation audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  target TEXT,
  group_jid TEXT,
  detail TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Scheduled messages
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  chat_jid TEXT NOT NULL,
  message TEXT NOT NULL,
  send_at TIMESTAMP NOT NULL,
  recurring TEXT DEFAULT '',
  delivered INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  group_jid TEXT NOT NULL,
  name TEXT NOT NULL,
  event_at TIMESTAMP NOT NULL,
  reminder_sent INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Moderation reports
CREATE TABLE IF NOT EXISTS moderation_reports (
  id SERIAL PRIMARY KEY,
  reporter_jid TEXT NOT NULL,
  target_jid TEXT NOT NULL,
  group_jid TEXT,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- API keys (for external integrations)
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  service TEXT NOT NULL,
  key_value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, service)
);
`;

export async function initPostgres() {
  if (!DATABASE_URL) {
    logger.info('DATABASE_URL not set — using SQLite fallback');
    return false;
  }

  try {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Test connection
    const client = await pool.connect();
    await client.query(SCHEMA);
    client.release();
    isConnected = true;
    logger.info('✅ Neon PostgreSQL connected and schema initialized');
    return true;
  } catch (err) {
    logger.error({ err: err.message }, 'PostgreSQL connection failed — falling back to SQLite');
    isConnected = false;
    return false;
  }
}

export function isPostgresConnected() {
  return isConnected;
}

export function getPool() {
  return pool;
}

// ── User operations ─────────────────────────────────────────────
export async function pgCreateUser(email, phone, passwordHash) {
  const res = await pool.query(
    'INSERT INTO users (email, phone, password_hash) VALUES ($1, $2, $3) RETURNING id, email, phone, role, banned',
    [email, phone, passwordHash]
  );
  return res.rows[0];
}

export async function pgGetUserByEmail(email) {
  const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return res.rows[0] || null;
}

export async function pgGetUserById(id) {
  const res = await pool.query('SELECT id, email, phone, role, banned, created_at FROM users WHERE id = $1', [id]);
  return res.rows[0] || null;
}

export async function pgGetAllUsers() {
  const res = await pool.query('SELECT id, email, phone, role, banned, created_at FROM users ORDER BY created_at DESC');
  return res.rows;
}

export async function pgBanUser(id) {
  await pool.query('UPDATE users SET banned = 1 WHERE id = $1', [id]);
}

export async function pgUnbanUser(id) {
  await pool.query('UPDATE users SET banned = 0 WHERE id = $1', [id]);
}

export async function pgCountUsers() {
  const res = await pool.query('SELECT COUNT(*) as count FROM users');
  return parseInt(res.rows[0].count);
}

// ── Session operations ──────────────────────────────────────────
export async function pgUpsertSession(userId, phone, status, botJid) {
  await pool.query(`
    INSERT INTO user_sessions (user_id, phone, status, bot_jid, last_active)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      phone = COALESCE(EXCLUDED.phone, user_sessions.phone),
      status = EXCLUDED.status,
      bot_jid = COALESCE(EXCLUDED.bot_jid, user_sessions.bot_jid),
      last_active = NOW()
  `, [userId, phone, status, botJid]);
}

export async function pgUpdateSessionStatus(userId, status, botJid) {
  await pool.query(`
    UPDATE user_sessions SET status = $2, bot_jid = $3, last_active = NOW()
    WHERE user_id = $1
  `, [userId, status, botJid]);
}

export async function pgGetSession(userId) {
  const res = await pool.query('SELECT * FROM user_sessions WHERE user_id = $1', [userId]);
  return res.rows[0] || null;
}

export async function pgCountActiveSessions() {
  const res = await pool.query("SELECT COUNT(*) as count FROM user_sessions WHERE status = 'connected'");
  return parseInt(res.rows[0].count);
}

export async function pgGetAllSessions() {
  const res = await pool.query('SELECT * FROM user_sessions ORDER BY last_active DESC');
  return res.rows;
}

// ── Bot settings (key-value per user) ───────────────────────────
export async function pgGetSetting(userId, key) {
  const res = await pool.query('SELECT value FROM bot_settings WHERE user_id = $1 AND key = $2', [userId, key]);
  return res.rows[0]?.value || null;
}

export async function pgSetSetting(userId, key, value) {
  await pool.query(`
    INSERT INTO bot_settings (user_id, key, value, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (user_id, key) DO UPDATE SET value = $3, updated_at = NOW()
  `, [userId, key, value]);
}

// ── AI training ─────────────────────────────────────────────────
export async function pgGetAiTraining(userId) {
  const res = await pool.query('SELECT * FROM ai_training WHERE user_id = $1', [userId]);
  if (!res.rows[0]) return { character_name: '', personality: '', emotions: '', speaking_style: '', example_pairs: '[]', auto_reply_offline: 0 };
  return res.rows[0];
}

export async function pgSaveAiTraining(userId, data) {
  await pool.query(`
    INSERT INTO ai_training (user_id, character_name, personality, emotions, speaking_style, example_pairs, auto_reply_offline, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      character_name = EXCLUDED.character_name,
      personality = EXCLUDED.personality,
      emotions = EXCLUDED.emotions,
      speaking_style = EXCLUDED.speaking_style,
      example_pairs = EXCLUDED.example_pairs,
      auto_reply_offline = EXCLUDED.auto_reply_offline,
      updated_at = NOW()
  `, [userId, data.character_name || '', data.personality || '', data.emotions || '', data.speaking_style || '', data.example_pairs || '[]', data.auto_reply_offline ? 1 : 0]);
}

// ── Audit log ───────────────────────────────────────────────────
export async function pgAddAudit(userId, action, target, groupJid, detail) {
  await pool.query(`
    INSERT INTO audit_log (user_id, action, target, group_jid, detail)
    VALUES ($1, $2, $3, $4, $5)
  `, [userId, action, target, groupJid, detail]);
}

export async function pgGetAuditLog(limit = 20) {
  const res = await pool.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1', [limit]);
  return res.rows;
}

// ── Admin stats ─────────────────────────────────────────────────
export async function pgGetAdminStats() {
  const [users, sessions, reports, audit] = await Promise.all([
    pgCountUsers(),
    pgCountActiveSessions(),
    pool.query("SELECT COUNT(*) as count FROM moderation_reports WHERE status = 'pending'"),
    pool.query("SELECT COUNT(*) as count FROM audit_log"),
  ]);
  return {
    users,
    activeSessions: sessions,
    pendingReports: parseInt(reports.rows[0].count),
    auditEntries: parseInt(audit.rows[0].count),
  };
}

export default {
  initPostgres,
  isPostgresConnected,
  getPool,
  pgCreateUser,
  pgGetUserByEmail,
  pgGetUserById,
  pgGetAllUsers,
  pgBanUser,
  pgUnbanUser,
  pgCountUsers,
  pgUpsertSession,
  pgUpdateSessionStatus,
  pgGetSession,
  pgCountActiveSessions,
  pgGetAllSessions,
  pgGetSetting,
  pgSetSetting,
  pgGetAiTraining,
  pgSaveAiTraining,
  pgAddAudit,
  pgGetAuditLog,
  pgGetAdminStats,
};
