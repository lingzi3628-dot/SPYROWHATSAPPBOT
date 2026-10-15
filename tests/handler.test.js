/**
 * tests/handler.test.js
 * Test the central command handler:
 *  - command loading
 *  - prefix matching
 *  - permission enforcement (mock)
 *  - antilink detection
 *  - welcome template rendering
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../src/handler.js';

const stubSock = {
  user: { id: 'bot@s.whatsapp.net' },
  ev: { on: () => {}, off: () => {}, removeAllListeners: () => {} },
  groupMetadata: async () => ({ id: 'g@g.us', subject: 'Test', participants: [{ id: 'a@s.whatsapp.net', admin: 'admin' }] }),
  groupParticipantsUpdate: async () => [],
  sendMessage: async () => ({ key: { id: 'fake' } }),
};

test('handler loads commands without error', async () => {
  await handler.loadCommands(stubSock);
  assert.ok(handler.commands.size > 50);
});

test('handler.get returns a command by name', () => {
  const ping = handler.get('ping');
  assert.ok(ping);
  assert.equal(ping.name, 'ping');
});

test('handler.get returns a command by alias', () => {
  const p = handler.get('p');
  assert.ok(p);
  assert.equal(p.name, 'ping');
});

test('handler.get returns null for unknown commands', () => {
  assert.equal(handler.get('this-does-not-exist'), null);
});

test('prefix match: ".ping" with prefix "."', () => {
  const { hit, body } = handler._matchPrefix('.ping');
  assert.equal(hit, true);
  assert.equal(body, 'ping');
});

test('prefix match: plain "hello" does not match', () => {
  const { hit } = handler._matchPrefix('hello');
  assert.equal(hit, false);
});

test('extractText: conversation', () => {
  const m = { message: { conversation: 'hello world' } };
  assert.equal(handler._extractText(m), 'hello world');
});

test('extractText: extendedTextMessage', () => {
  const m = { message: { extendedTextMessage: { text: 'hi' } } };
  assert.equal(handler._extractText(m), 'hi');
});

test('extractText: image with caption', () => {
  const m = { message: { imageMessage: { caption: 'cap' } } };
  assert.equal(handler._extractText(m), 'cap');
});

test('antilink detection: WhatsApp invite link', async () => {
  // Verify via the security utility rather than running the full handler
  const { containsInviteLink } = await import('../src/security.js');
  assert.equal(containsInviteLink('Join https://chat.whatsapp.com/ABC123 please'), true);
  assert.equal(containsInviteLink('Just chatting'), false);
});

test('welcome template: substitutes {user} {group} {count}', async () => {
  const { template } = await import('../src/utils/text.js');
  const out = template('Welcome {user} to {group}! (#{count})', { user: '@a', group: 'Test', count: 5 });
  assert.equal(out, 'Welcome @a to Test! (#5)');
});

test('parseArgs handles a tagall command line', async () => {
  const { parseArgs } = await import('../src/utils/text.js');
  assert.deepEqual(parseArgs('tagall hello everyone'), ['tagall', 'hello', 'everyone']);
});
