import { downloadMediaToFile, findMediaMessage, cleanupFiles } from '../../utils/media.js';
import { toMp3, hasFfmpeg } from '../../services/media.js';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import config from '../../config.js';

export default {
  name: 'tomp3',
  aliases: ['mp3'],
  category: 'media',
  description: 'Convert replied-to video/audio to MP3 (requires ffmpeg).',
  usage: '.tomp3 (reply to video/audio)',
  cooldown: 10,
  async execute(ctx) {
    const media = findMediaMessage(ctx.msg);
    if (!media || !['video', 'audio'].includes(media.type)) return ctx.reply('Reply to a video or audio message.');
    if (!(await hasFfmpeg())) return ctx.replyError('ffmpeg is not installed. Install it to use .tomp3');
    let inFile = null, outFile = null;
    try {
      const dl = await downloadMediaToFile(ctx.msg);
      inFile = dl.path;
      outFile = join(config.TMP_DIR, `out-${randomUUID()}.mp3`);
      await toMp3(inFile, outFile);
      const buf = readFileSync(outFile);
      await ctx.sock.sendMessage(ctx.chatId, {
        audio: buf,
        mimetype: 'audio/mpeg',
        fileName: 'converted.mp3',
      });
    } catch (err) {
      await ctx.replyError(`Conversion failed: ${err.message || err}`);
    } finally {
      cleanupFiles([inFile, outFile].filter(Boolean));
    }
  },
};
