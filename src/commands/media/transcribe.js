import { downloadMediaToFile, findMediaMessage, cleanupFiles } from '../../utils/media.js';
import { hasFfmpeg } from '../../services/media.js';
import { complete, isAvailable } from '../../services/ai.js';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import config from '../../config.js';

const exec = promisify(execFile);

export default {
  name: 'transcribe',
  aliases: ['audiototext', 'totext'],
  category: 'media',
  description: 'Transcribe a replied-to audio message. Requires ffmpeg + AI key.',
  usage: '.transcribe (reply to audio)',
  cooldown: 20,
  async execute(ctx) {
    if (!(await hasFfmpeg())) return ctx.replyError('ffmpeg is required.');
    if (!isAvailable()) {
      return ctx.replyError('AI transcription requires OPENAI_API_KEY + ENABLE_AI=true. See .env.example.');
    }
    const media = findMediaMessage(ctx.msg);
    if (!media || media.type !== 'audio') return ctx.reply('Reply to an audio message.');
    let inFile = null, outFile = null;
    try {
      const dl = await downloadMediaToFile(ctx.msg);
      inFile = dl.path;
      outFile = join(config.TMP_DIR, `transcribe-${randomUUID()}.mp3`);
      const { default: ffmpeg } = await import('fluent-ffmpeg');
      await new Promise((resolve, reject) => {
        ffmpeg(inFile).toFormat('mp3').audioBitrate('64k')
          .on('end', resolve).on('error', reject).save(outFile);
      });
      // Use OpenAI Whisper API via axios
      const { default: axios } = await import('axios');
      const { default: FormData } = await import('form-data');
      const form = new FormData();
      form.append('file', readFileSync(outFile), { filename: 'audio.mp3', contentType: 'audio/mpeg' });
      form.append('model', 'whisper-1');
      const url = config.OPENAI_API_BASE.replace(/\/$/, '') + '/audio/transcriptions';
      const res = await axios.post(url, form, {
        headers: { ...form.getHeaders(), Authorization: `Bearer ${config.OPENAI_API_KEY}` },
        maxContentLength: 25 * 1024 * 1024,
        maxBodyLength: 25 * 1024 * 1024,
        timeout: 90_000,
      });
      const text = (res.data?.text || '').trim();
      if (!text) return ctx.reply('Transcription returned empty.');
      await ctx.reply(`📝 *Transcription:*\n\n${text}`);
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err.message || String(err);
      await ctx.replyError(`Transcription failed: ${msg}`);
    } finally {
      cleanupFiles([inFile, outFile].filter(Boolean));
    }
  },
};
