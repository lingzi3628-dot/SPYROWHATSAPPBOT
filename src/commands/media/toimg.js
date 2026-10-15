import { findMediaMessage, downloadMediaToBuffer, cleanupFiles } from '../../utils/media.js';
import { stickerToImage } from '../../services/media.js';

export default {
  name: 'toimg',
  aliases: ['toimage'],
  category: 'media',
  description: 'Convert a replied-to sticker to a PNG image.',
  usage: '.toimg (reply to sticker)',
  cooldown: 5,
  async execute(ctx) {
    const media = findMediaMessage(ctx.msg);
    if (!media || media.type !== 'sticker') return ctx.reply('Reply to a sticker to convert it to an image.');
    try {
      const { buffer } = await downloadMediaToBuffer(ctx.msg);
      const png = await stickerToImage(buffer);
      await ctx.sock.sendMessage(ctx.chatId, { image: png, caption: '🖼️ Converted sticker.' });
    } catch (err) {
      await ctx.replyError(`Conversion failed: ${err.message || err}`);
    }
  },
};
