import axios from 'axios';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import sharp from 'sharp';
import { bold } from '../../utils/text.js';

export default {
  name: 'remini',
  aliases: ['enhance', 'hd', 'upscale'],
  category: 'media',
  description: 'Enhance image quality (HD upscale).',
  usage: '.remini (reply to image)',
  cooldown: 15,
  async execute(ctx) {
    const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imgMsg = quoted?.imageMessage || ctx.msg.message?.imageMessage;
    if (!imgMsg) return ctx.reply('Reply to an image to enhance it.');
    
    await ctx.reply('✨ Enhancing image...');
    try {
      const stream = await downloadContentFromMessage(imgMsg, 'image');
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      
      // Use sharp to upscale + sharpen + enhance
      const enhanced = await sharp(buffer)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: false })
        .sharpen({ sigma: 1.5, radius: 1 })
        .modulate({ brightness: 1.05, saturation: 1.1 })
        .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
        .toBuffer();
      
      await ctx.sock.sendMessage(ctx.chatId, {
        image: enhanced,
        caption: bold('✨ Image enhanced to HD!'),
      });
    } catch (err) {
      await ctx.replyError(`Enhancement failed: ${err.message}`);
    }
  },
};
