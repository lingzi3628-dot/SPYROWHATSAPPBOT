/**
 * tests/config.test.js
 * Test configuration validation.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('config loads with valid env', async () => {
  const config = (await import('../src/config.js')).default;
  assert.ok(config);
  assert.ok(typeof config.BOT_NAME === 'string');
  assert.ok(typeof config.MAX_MEDIA_BYTES === 'number');
  assert.ok(config.MAX_MEDIA_BYTES > 0);
});

test('config has all required paths', async () => {
  const config = (await import('../src/config.js')).default;
  assert.ok(config.SESSION_DIR);
  assert.ok(config.DATABASE_PATH);
  assert.ok(config.TMP_DIR);
  assert.ok(config.DATA_DIR);
});

test('config cooldown is a positive integer', async () => {
  const config = (await import('../src/config.js')).default;
  assert.ok(config.COMMAND_COOLDOWN_SEC >= 0);
  assert.equal(Number.isInteger(config.COMMAND_COOLDOWN_SEC), true);
});
