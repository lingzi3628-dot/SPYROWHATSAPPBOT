import { findMediaMessage, downloadMediaToBuffer } from '../../utils/media.js';
import { compressImage } from '../../services/media.js';

export default {
  name: 'compress',
  aliases: ['shrink'],
  category: 'media',
  description: 'Compress a replied-to image to a smaller JPEG.',
  usage: '.compress (reply to image)',
  cooldown: 5,
  async execute(ctx) {
    const media = findMediaMessage(ctx.msg);
    if (!media || media.type !== 'image') return ctx.reply('Reply to an image to compress it.');
    try {
      const { buffer } = await downloadMediaToBuffer(ctx.msg);
      const out = await compressImage(buffer, { maxWidth: 1280, quality: 70 });
      const before = (buffer.length / 1024).toFixed(1);
      const after = (out.length / 1024).toFixed(1);
      await ctx.sock.sendMessage(ctx.chatId, {
        image: out,
        caption: `🗜️ Compressed: ${before} KB → ${after} KB`,
      });
    } catch (err) {
      await ctx.replyError(`Compression failed: ${err.message || err}`);
    }
  },
};
