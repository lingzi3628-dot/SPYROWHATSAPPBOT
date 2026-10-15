/**
 * tests/parse.test.js
 * Test command parsing & text helpers.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, sanitize, slugify, chunkText, template, escapeMarkdown } from '../src/utils/text.js';

test('parseArgs handles simple words', () => {
  assert.deepEqual(parseArgs('kick 254700000000'), ['kick', '254700000000']);
});

test('parseArgs handles quoted segments', () => {
  assert.deepEqual(parseArgs('setname "My Group"'), ['setname', 'My Group']);
});

test('parseArgs handles mixed quotes and spaces', () => {
  assert.deepEqual(parseArgs('poll "Best food" | pizza | sushi'), ['poll', 'Best food', '|', 'pizza', '|', 'sushi']);
});

test('sanitize strips control chars', () => {
  assert.equal(sanitize('hello\u0000world\nfoo'), 'hello world foo');
});

test('slugify produces safe filenames', () => {
  assert.equal(slugify('My File!!.txt'), 'my-file-txt');
  assert.equal(slugify(''), 'file');
});

test('chunkText splits long strings', () => {
  const long = 'word '.repeat(1000);
  const chunks = chunkText(long, 500);
  assert.ok(chunks.length > 1);
  for (const c of chunks) assert.ok(c.length <= 500);
});

test('template substitutes variables', () => {
  assert.equal(template('Hi {name}, welcome to {group}!', { name: 'Alice', group: 'Dev' }),
    'Hi Alice, welcome to Dev!');
});

test('escapeMarkdown escapes special chars', () => {
  assert.equal(escapeMarkdown('hello *world*'), 'hello \\*world\\*');
});
