import Database from 'better-sqlite3';
const db = new Database('./data/bot.sqlite');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS group_settings (
    jid TEXT PRIMARY KEY,
    antilink INTEGER DEFAULT 0
  );`,
  `CREATE INDEX IF NOT EXISTS idx_x ON group_settings(jid);`,
];

db.exec('BEGIN');
try {
  for (const s of SCHEMA) db.exec(s);
  db.exec('COMMIT');
  console.log('OK');
} catch (err) {
  db.exec('ROLLBACK');
  console.error('FAIL:', err.message);
}
const r = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('tables:', r);
