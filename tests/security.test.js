/**
 * tests/security.test.js
 * Test security helpers.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  looksLikeShellInjection,
  isPathTraversal,
  isValidPhoneNumber,
  isSafeHttpUrl,
  clampInt,
  safeFileName,
  containsInviteLink,
  containsUrl,
  containsBadWord,
  isOwner,
  redactSecrets,
} from '../src/security.js';

test('looksLikeShellInjection detects shell metacharacters', () => {
  assert.equal(looksLikeShellInjection('hello; rm -rf /'), true);
  assert.equal(looksLikeShellInjection('hello world'), false);
});

test('isPathTraversal detects ..', () => {
  assert.equal(isPathTraversal('../../etc/passwd'), true);
  assert.equal(isPathTraversal('safe.txt'), false);
});

test('isValidPhoneNumber accepts valid numbers', () => {
  assert.equal(isValidPhoneNumber('+254700000000'), true);
  assert.equal(isValidPhoneNumber('254700000000'), true);
  assert.equal(isValidPhoneNumber('abc'), false);
});

test('isSafeHttpUrl rejects non-http', () => {
  assert.equal(isSafeHttpUrl('https://example.com'), true);
  assert.equal(isSafeHttpUrl('http://example.com'), true);
  assert.equal(isSafeHttpUrl('file:///etc/passwd'), false);
  assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
});

test('clampInt clamps to range', () => {
  assert.equal(clampInt(50, 0, 10), 10);
  assert.equal(clampInt(-5, 0, 10), 0);
  assert.equal(clampInt(5, 0, 10), 5);
  assert.equal(clampInt('not a number', 0, 10, 5), 5);
});

test('safeFileName strips dangerous chars', () => {
  const out = safeFileName('../../etc/passwd');
  // Slashes and dots are stripped; result is safe (no path component).
  assert.ok(!out.includes('/'));
  assert.ok(!out.includes('\\'));
  assert.ok(!out.includes('..'));
  assert.ok(out.length > 0);
});

test('containsInviteLink detects WhatsApp invite links', () => {
  assert.equal(containsInviteLink('Join https://chat.whatsapp.com/ABC123'), true);
  assert.equal(containsInviteLink('Hello world'), false);
});

test('containsUrl detects any URL', () => {
  assert.equal(containsUrl('Visit https://example.com today'), true);
  assert.equal(containsUrl('No link here'), false);
});

test('containsBadWord detects bad words', () => {
  assert.equal(containsBadWord('this is shit'), true);
  assert.equal(containsBadWord('this is fine'), false);
});

test('isOwner returns false for empty config', () => {
  // OWNER_JID may or may not be set in test env, but a non-matching jid should be false
  assert.equal(isOwner('12345@s.whatsapp.net'), false);
});

test('redactSecrets redacts long base64 strings', () => {
  const out = redactSecrets('sk-abcdefghijklmnopqrstuvwxyz1234567890');
  assert.ok(out.includes('REDACTED'));
});
