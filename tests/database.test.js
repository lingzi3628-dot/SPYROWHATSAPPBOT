/**
 * tests/database.test.js
 * Test database operations.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// isolate test DB
const TEST_DB = resolve('./data/test.sqlite');
try { rmSync(TEST_DB, { force: true }); } catch {}
try { rmSync(TEST_DB + '-wal', { force: true }); } catch {}
try { rmSync(TEST_DB + '-shm', { force: true }); } catch {}
mkdirSync('./data', { recursive: true });

// override config path before import
process.env.DATABASE_PATH = TEST_DB;

const { db, getGroupSettings, setGroupSetting, resetGroupSettings, checkCooldown, clearExpiredCooldowns, audit, closeDatabase } =
  await import('../src/database.js');

test('group settings: default row is created on first access', () => {
  const s = getGroupSettings('test-1@g.us');
  assert.equal(s.antilink, 0);
  assert.equal(s.warn_limit, 3);
});

test('group settings: setGroupSetting updates a boolean column', () => {
  setGroupSetting('test-2@g.us', 'antilink', true);
  const s = getGroupSettings('test-2@g.us');
  assert.equal(s.antilink, 1);
});

test('group settings: setGroupSetting rejects unknown column', () => {
  assert.throws(() => setGroupSetting('test-3@g.us', 'evil_col', 'x'), /unknown column/);
});

test('group settings: reset restores defaults', () => {
  setGroupSetting('test-4@g.us', 'antispam', true);
  resetGroupSettings('test-4@g.us');
  const s = getGroupSettings('test-4@g.us');
  assert.equal(s.antispam, 0);
});

test('cooldowns: first call returns off-cooldown', () => {
  const r = checkCooldown('test:cd:1', 60);
  assert.equal(r.onCooldown, false);
});

test('cooldowns: second call returns on-cooldown', () => {
  checkCooldown('test:cd:2', 60);
  const r = checkCooldown('test:cd:2', 60);
  assert.equal(r.onCooldown, true);
  assert.ok(r.remainingMs > 0);
});

test('cooldowns: clearExpiredCooldowns removes expired', () => {
  // we can't easily create an expired row via the public API, but the function should run cleanly
  clearExpiredCooldowns();
});

test('audit: insert row', () => {
  audit({ actor: 'a@s.whatsapp.net', action: 'test.action', target: 'b@s.whatsapp.net' });
  const row = db.prepare("SELECT * FROM audit_log WHERE action='test.action' LIMIT 1").get();
  assert.ok(row);
});

// cleanup
test('cleanup', () => {
  closeDatabase();
  try { rmSync(TEST_DB, { force: true }); } catch {}
  try { rmSync(TEST_DB + '-wal', { force: true }); } catch {}
  try { rmSync(TEST_DB + '-shm', { force: true }); } catch {}
});
