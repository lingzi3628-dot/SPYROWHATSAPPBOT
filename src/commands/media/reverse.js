import { downloadMediaToFile, findMediaMessage, cleanupFiles } from '../../utils/media.js';
import { reverseMedia, hasFfmpeg } from '../../services/media.js';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import config from '../../config.js';

export default {
  name: 'reverse',
  aliases: ['rev'],
  category: 'media',
  description: 'Reverse a replied-to video or audio (requires ffmpeg).',
  usage: '.reverse (reply to media)',
  cooldown: 12,
  async execute(ctx) {
    const media = findMediaMessage(ctx.msg);
    if (!media || !['video', 'audio'].includes(media.type)) return ctx.reply('Reply to a video or audio message.');
    if (!(await hasFfmpeg())) return ctx.replyError('ffmpeg is not installed. Install it to use .reverse');
    let inFile = null, outFile = null;
    try {
      const dl = await downloadMediaToFile(ctx.msg);
      inFile = dl.path;
      const ext = media.type === 'video' ? '.mp4' : '.mp3';
      outFile = join(config.TMP_DIR, `rev-${randomUUID()}${ext}`);
      await reverseMedia(inFile, outFile, { video: media.type === 'video' });
      const buf = readFileSync(outFile);
      if (media.type === 'video') {
        await ctx.sock.sendMessage(ctx.chatId, { video: buf, caption: '🔄 Reversed.' });
      } else {
        await ctx.sock.sendMessage(ctx.chatId, { audio: buf, mimetype: 'audio/mpeg', fileName: 'reversed.mp3' });
      }
    } catch (err) {
      await ctx.replyError(`Reverse failed: ${err.message || err}`);
    } finally {
      cleanupFiles([inFile, outFile].filter(Boolean));
    }
  },
};
