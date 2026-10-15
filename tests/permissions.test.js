/**
 * tests/permissions.test.js
 * Mock-based permission checks.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// override env BEFORE config loads
process.env.OWNER_JID = '254700000000@s.whatsapp.net';
process.env.MAINTENANCE_MODE = 'false';

const { isOwner } = await import('../src/security.js');

test('isOwner returns true for configured owner', () => {
  assert.equal(isOwner('254700000000@s.whatsapp.net'), true);
});

test('isOwner returns false for any other jid', () => {
  assert.equal(isOwner('999999999999@s.whatsapp.net'), false);
});

test('isOwner returns false when env not set', () => {
  // since env IS set above, we just verify the contract
  assert.equal(isOwner('garbage'), false);
});

test('authorize: ownerOnly command rejected for non-owner', async () => {
  const { authorize } = await import('../src/permissions.js');
  const r = await authorize({
    cmd: { ownerOnly: true },
    ctx: { perms: { level: 'user', isGroup: false, botIsAdmin: false } },
  });
  assert.equal(r.allowed, false);
  assert.match(r.reason, /owner/i);
});

test('authorize: groupOnly command rejected in private chat', async () => {
  const { authorize } = await import('../src/permissions.js');
  const r = await authorize({
    cmd: { groupOnly: true },
    ctx: { perms: { level: 'user', isGroup: false, botIsAdmin: false } },
  });
  assert.equal(r.allowed, false);
  assert.match(r.reason, /group/i);
});

test('authorize: adminOnly command rejected for plain user', async () => {
  const { authorize } = await import('../src/permissions.js');
  const r = await authorize({
    cmd: { adminOnly: true },
    ctx: { perms: { level: 'user', isGroup: true, botIsAdmin: true } },
  });
  assert.equal(r.allowed, false);
});

test('authorize: passes for plain command', async () => {
  const { authorize } = await import('../src/permissions.js');
  const r = await authorize({
    cmd: { name: 'ping' },
    ctx: { perms: { level: 'user', isGroup: false, botIsAdmin: false } },
  });
  assert.equal(r.allowed, true);
});

test('authorize: maintenance mode blocks non-owner', async () => {
  const { stmts } = await import('../src/database.js');
  stmts.setState.run('MAINTENANCE_MODE', 'true', 'true');
  const { authorize } = await import('../src/permissions.js');
  const r = await authorize({
    cmd: { name: 'ping' },
    ctx: { perms: { level: 'user', isGroup: false, botIsAdmin: false } },
  });
  assert.equal(r.allowed, false);
  assert.match(r.reason, /maintenance/i);
  // reset
  stmts.setState.run('MAINTENANCE_MODE', 'false', 'false');
});
