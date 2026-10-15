import { findMediaMessage, downloadMediaToBuffer, cleanupFiles } from '../../utils/media.js';
import { imageToSticker } from '../../services/media.js';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import config from '../../config.js';

export default {
  name: 'sticker',
  aliases: ['st', 's'],
  category: 'media',
  description: 'Convert a replied-to image or short video to a sticker.',
  usage: '.sticker (reply to image/video)',
  cooldown: 8,
  async execute(ctx) {
    const media = findMediaMessage(ctx.msg);
    if (!media) return ctx.reply('Reply to an image or short video to make a sticker.');
    if (media.type === 'image') {
      let tmp = null;
      try {
        const { buffer } = await downloadMediaToBuffer(ctx.msg);
        const webp = await imageToSticker(buffer);
        await ctx.sock.sendMessage(ctx.chatId, { sticker: webp });
      } catch (err) {
        await ctx.replyError(`Could not create sticker: ${err.message || err}`);
      } finally {
        if (tmp) cleanupFiles([tmp]);
      }
    } else if (media.type === 'video') {
      // animated sticker from short video
      const tmpIn = join(config.TMP_DIR, `in-${randomUUID()}.mp4`);
      const tmpOut = join(config.TMP_DIR, `out-${randomUUID()}.webp`);
      try {
        const { buffer } = await downloadMediaToBuffer(ctx.msg);
        writeFileSync(tmpIn, buffer);
        const { default: ffmpeg } = await import('fluent-ffmpeg');
        await new Promise((resolve, reject) => {
          ffmpeg(tmpIn)
            .toFormat('webp')
            .addOutputOptions(['-vcodec', 'libwebp', '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15', '-loop', '0', '-preset', 'default', '-an', '-vsync', '0'])
            .save(tmpOut)
            .on('end', resolve)
            .on('error', reject);
        });
        await ctx.sock.sendMessage(ctx.chatId, { sticker: { url: tmpOut } });
      } catch (err) {
        await ctx.replyError(`Could not create animated sticker (requires ffmpeg): ${err.message || err}`);
      } finally {
        cleanupFiles([tmpIn, tmpOut]);
      }
    } else {
      await ctx.reply('Only images and short videos can be stickered.');
    }
  },
};
