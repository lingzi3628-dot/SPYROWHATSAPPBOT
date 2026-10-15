/**
 * tests/jid.test.js
 * Test JID utilities.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { norm, phoneNumber, isGroup, isBroadcast, phoneToJid, sameUser, isValidJid } from '../src/utils/jid.js';

test('norm normalizes a regular user jid', () => {
  assert.equal(norm('254700000000@s.whatsapp.net'), '254700000000@s.whatsapp.net');
});

test('isGroup detects group jids', () => {
  assert.equal(isGroup('120363xxx@g.us'), true);
  assert.equal(isGroup('254700000000@s.whatsapp.net'), false);
});

test('isBroadcast detects status/broadcast', () => {
  assert.equal(isBroadcast('status@broadcast'), true);
  assert.equal(isBroadcast('254700000000@s.whatsapp.net'), false);
});

test('phoneToJid converts digits to a user jid', () => {
  assert.equal(phoneToJid('254700000000'), '254700000000@s.whatsapp.net');
  assert.equal(phoneToJid('+254 700 000 000'), '254700000000@s.whatsapp.net');
});

test('phoneNumber extracts user portion', () => {
  assert.equal(phoneNumber('254700000000@s.whatsapp.net'), '254700000000');
});

test('sameUser ignores device', () => {
  assert.equal(sameUser('2547xxx@s.whatsapp.net:0', '2547xxx@s.whatsapp.net:1'), true);
});

test('isValidJid checks structure', () => {
  assert.equal(isValidJid('254700000000@s.whatsapp.net'), true);
  assert.equal(isValidJid('garbage'), false);
});
