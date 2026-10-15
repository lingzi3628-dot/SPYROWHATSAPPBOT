/**
 * tests/malformed.test.js
 * Handler must not throw on malformed messages.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../src/handler.js';

const stubSock = {
  user: { id: 'bot@s.whatsapp.net' },
  ev: { on: () => {}, off: () => {}, removeAllListeners: () => {} },
  groupMetadata: async () => null,
  sendMessage: async () => null,
};

test('handleMessage does not throw on null', async () => {
  await handler.loadCommands(stubSock);
  await assert.doesNotReject(() => handler.handleMessage(null));
});

test('handleMessage does not throw on empty message', async () => {
  await assert.doesNotReject(() => handler.handleMessage({ key: { remoteJid: 'x@s.whatsapp.net' } }));
});

test('handleMessage does not throw on status broadcast', async () => {
  await assert.doesNotReject(() => handler.handleMessage({
    key: { remoteJid: 'status@broadcast' },
    message: { conversation: 'should be ignored' },
  }));
});

test('handleMessage does not throw on group with no participants', async () => {
  await assert.doesNotReject(() => handler.handleMessage({
    key: { remoteJid: '120363xxx@g.us', fromMe: false },
    message: { conversation: 'hi' },
  }));
});

test('handleMessage does not throw on edited message stub', async () => {
  await assert.doesNotReject(() => handler.handleMessage({
    key: { remoteJid: '120363xxx@g.us' },
    message: { editedMessage: { message: { conversation: 'edited' } } },
  }));
});
