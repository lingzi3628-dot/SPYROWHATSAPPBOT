/**
 * services/media.js
 * Higher-level media operations using sharp + fluent-ffmpeg (when available).
 * Each function gracefully reports when its dependency is missing.
 */
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { existsSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import config from '../config.js';
import logger from '../logger.js';

function ffmpegAvailable() {
  if (config.FFMPEG_PATH && existsSync(config.FFMPEG_PATH)) {
    ffmpeg.setFfmpegPath(config.FFMPEG_PATH);
    return true;
  }
  // probe PATH
  try {
    require.resolve('fluent-ffmpeg');
    return true;
  } catch {
    return false;
  }
}

/** Convert an image buffer to a WhatsApp sticker (webp, 512x512). */
export async function imageToSticker(buffer) {
  return sharp(buffer)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90 })
    .toBuffer();
}

/** Convert a sticker (webp) to PNG. */
export async function stickerToImage(buffer) {
  return sharp(buffer).png().toBuffer();
}

/** Convert audio/video to mp3 using ffmpeg. */
export function toMp3(inputPath, outputMp3) {
  return new Promise((resolve, reject) => {
    if (!ffmpegAvailable()) return reject(new Error('ffmpeg is not installed'));
    ffmpeg(inputPath)
      .toFormat('mp3')
      .audioBitrate('128k')
      .on('end', () => resolve(outputMp3))
      .on('error', (err) => reject(err))
      .save(outputMp3);
  });
}

/** Convert audio to opus .ogg for WhatsApp voice notes. */
export function toVoiceNote(inputPath, outputOgg) {
  return new Promise((resolve, reject) => {
    if (!ffmpegAvailable()) return reject(new Error('ffmpeg is not installed'));
    ffmpeg(inputPath)
      .toFormat('ogg')
      .audioCodec('libopus')
      .audioFrequency(16000)
      .audioChannels(1)
      .on('end', () => resolve(outputOgg))
      .on('error', (err) => reject(err))
      .save(outputOgg);
  });
}

/** Reverse a video or audio file. */
export function reverseMedia(inputPath, outputPath, { video = true } = {}) {
  return new Promise((resolve, reject) => {
    if (!ffmpegAvailable()) return reject(new Error('ffmpeg is not installed'));
    const cmd = ffmpeg(inputPath);
    if (video) cmd.videoFilter('reverse').audioFilter('areverse');
    else cmd.audioFilter('areverse');
    cmd.on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

/** Compress an image to fit a target size. */
export async function compressImage(buffer, { maxWidth = 1280, quality = 75 } = {}) {
  return sharp(buffer)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
}

/** Get media duration (seconds) via ffprobe. */
export function getDuration(path) {
  return new Promise((resolve) => {
    if (!ffmpegAvailable()) return resolve(null);
    ffmpeg(path).ffprobe((err, data) => {
      if (err) return resolve(null);
      resolve(data?.format?.duration || null);
    });
  });
}

/** Detect whether ffmpeg is on PATH (used by commands to give friendly errors). */
export function hasFfmpeg() {
  return new Promise((resolve) => {
    const p = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
    p.on('error', () => resolve(false));
    p.on('exit', (code) => resolve(code === 0));
  });
}
