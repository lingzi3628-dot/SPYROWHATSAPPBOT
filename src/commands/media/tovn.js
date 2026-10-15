import { downloadMediaToFile, findMediaMessage, cleanupFiles } from '../../utils/media.js';
import { toVoiceNote, hasFfmpeg } from '../../services/media.js';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import config from '../../config.js';

export default {
  name: 'tovn',
  aliases: ['voice', 'voicenote'],
  category: 'media',
  description: 'Convert replied-to audio/video to a WhatsApp voice note (requires ffmpeg).',
  usage: '.tovn (reply to audio/video)',
  cooldown: 10,
  async execute(ctx) {
    const media = findMediaMessage(ctx.msg);
    if (!media || !['video', 'audio'].includes(media.type)) return ctx.reply('Reply to an audio or video message.');
    if (!(await hasFfmpeg())) return ctx.replyError('ffmpeg is not installed. Install it to use .tovn');
    let inFile = null, outFile = null;
    try {
      const dl = await downloadMediaToFile(ctx.msg);
      inFile = dl.path;
      outFile = join(config.TMP_DIR, `out-${randomUUID()}.ogg`);
      await toVoiceNote(inFile, outFile);
      const buf = readFileSync(outFile);
      await ctx.sock.sendMessage(ctx.chatId, {
        audio: buf,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true,
      });
    } catch (err) {
      await ctx.replyError(`Conversion failed: ${err.message || err}`);
    } finally {
      cleanupFiles([inFile, outFile].filter(Boolean));
    }
  },
};
