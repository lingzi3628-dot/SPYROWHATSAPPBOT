/**
 * utils/media.js
 * Media download / temp-file / cleanup helpers.
 *
 * Strictly uses Baileys' supported download APIs.
 * Enforces size limits and validates mime types.
 */
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { createWriteStream, mkdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import config from '../config.js';
import logger from '../logger.js';
import { slugify } from './text.js';

const TMP = join(config.TMP_DIR, 'media');
mkdirSync(TMP, { recursive: true });

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/ogg; codecs=opus': '.ogg',
  'audio/ogg': '.ogg',
  'application/pdf': '.pdf',
  'application/octet-stream': '.bin',
};

const ALLOWED_MIMES = new Set(Object.keys(EXT_BY_MIME));

export function allowedMime(mime) {
  return ALLOWED_MIMES.has(mime);
}

/**
 * Resolve the "media" portion of a message into a normalized descriptor.
 * Returns { type, mime, key, message } or null if no media present.
 */
export function findMediaMessage(message) {
  if (!message?.message) return null;
  const m = message.message;
  // image
  if (m.imageMessage) return { type: 'image', mime: m.imageMessage.mimetype, inner: m.imageMessage, key: 'imageMessage' };
  if (m.videoMessage) return { type: 'video', mime: m.videoMessage.mimetype, inner: m.videoMessage, key: 'videoMessage' };
  if (m.audioMessage) return { type: 'audio', mime: m.audioMessage.mimetype, inner: m.audioMessage, key: 'audioMessage' };
  if (m.stickerMessage) return { type: 'sticker', mime: m.stickerMessage.mimetype, inner: m.stickerMessage, key: 'stickerMessage' };
  if (m.documentMessage) return { type: 'document', mime: m.documentMessage.mimetype, inner: m.documentMessage, key: 'documentMessage' };
  // quoted media
  const ctx = m.extendedTextMessage?.contextInfo;
  if (ctx?.quotedMessage) {
    const q = ctx.quotedMessage;
    if (q.imageMessage) return { type: 'image', mime: q.imageMessage.mimetype, inner: q.imageMessage, key: 'imageMessage', quoted: true };
    if (q.videoMessage) return { type: 'video', mime: q.videoMessage.mimetype, inner: q.videoMessage, key: 'videoMessage', quoted: true };
    if (q.audioMessage) return { type: 'audio', mime: q.audioMessage.mimetype, inner: q.audioMessage, key: 'audioMessage', quoted: true };
    if (q.stickerMessage) return { type: 'sticker', mime: q.stickerMessage.mimetype, inner: q.stickerMessage, key: 'stickerMessage', quoted: true };
    if (q.documentMessage) return { type: 'document', mime: q.documentMessage.mimetype, inner: q.documentMessage, key: 'documentMessage', quoted: true };
  }
  return null;
}

/**
 * Download media referenced by a Baileys message object into a temp file.
 * @returns {Promise<{path:string, mime:string, type:string, size:number}>}
 */
export async function downloadMediaToFile(message, opts = {}) {
  const media = findMediaMessage(message);
  if (!media) throw new Error('No media found in this message');

  if (media.mime && !allowedMime(media.mime) && !opts.allowAnyMime) {
    throw new Error(`Unsupported media type: ${media.mime}`);
  }

  const ext = EXT_BY_MIME[media.mime] || extname(media.inner?.fileName || '') || '.bin';
  const baseName = slugify(media.inner?.fileName || randomUUID());
  const outPath = join(TMP, `${baseName}-${randomUUID()}${ext}`);

  // Baileys expects { directPath, url, mediaKey, ... } but conveniently
  // the inner message object already contains all of those fields.
  const stream = await downloadContentFromMessage(media.inner, media.type === 'sticker' ? 'sticker' : media.type);
  if (!stream) throw new Error('Failed to open download stream');

  const out = createWriteStream(outPath);
  await pipeline(stream, out);

  const size = statSync(outPath).size;
  if (size > config.MAX_MEDIA_BYTES) {
    rmSync(outPath, { force: true });
    throw new Error(`Media exceeds limit of ${config.MAX_MEDIA_MB} MB (got ${(size / 1024 / 1024).toFixed(2)} MB)`);
  }
  logger.debug({ outPath, size, mime: media.mime }, 'media downloaded');
  return { path: outPath, mime: media.mime, type: media.type, size };
}

/** Remove a list of temp files (silently ignores missing). */
export function cleanupFiles(paths = []) {
  for (const p of paths) {
    try {
      rmSync(p, { force: true });
    } catch {
      // ignore
    }
  }
}

/**
 * Download media as a Buffer (small files only — uses MAX_MEDIA_BYTES cap).
 */
export async function downloadMediaToBuffer(message, opts = {}) {
  const media = findMediaMessage(message);
  if (!media) throw new Error('No media found in this message');
  if (media.mime && !allowedMime(media.mime) && !opts.allowAnyMime) {
    throw new Error(`Unsupported media type: ${media.mime}`);
  }
  const stream = await downloadContentFromMessage(media.inner, media.type === 'sticker' ? 'sticker' : media.type);
  if (!stream) throw new Error('Failed to open download stream');
  const chunks = [];
  let total = 0;
  for await (const c of stream) {
    total += c.length;
    if (total > config.MAX_MEDIA_BYTES) {
      throw new Error(`Media exceeds limit of ${config.MAX_MEDIA_MB} MB`);
    }
    chunks.push(c);
  }
  return { buffer: Buffer.concat(chunks), mime: media.mime, type: media.type };
}
