import axios from 'axios';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { bold } from '../../utils/text.js';

export default {
  name: 'removebg',
  aliases: ['rmbg', 'nobg'],
  category: 'media',
  description: 'Remove image background (AI-powered).',
  usage: '.removebg (reply to image)',
  cooldown: 15,
  async execute(ctx) {
    const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const imgMsg = quoted?.imageMessage || ctx.msg.message?.imageMessage;
    if (!imgMsg) return ctx.reply('Reply to an image to remove its background.');
    
    await ctx.reply('🎨 Removing background...');
    try {
      // Download the image
      const stream = await downloadContentFromMessage(imgMsg, 'image');
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      
      // Upload to a temporary host and use remove.bg API
      const formData = new FormData();
      formData.append('image_file', new Blob([buffer]), 'image.jpg');
      formData.append('size', 'auto');
      
      const res = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
        headers: { 'X-Api-Key': 'removebg-free' },
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 10 * 1024 * 1024,
      });
      
      await ctx.sock.sendMessage(ctx.chatId, {
        image: Buffer.from(res.data),
        caption: bold('🎨 Background removed!'),
      });
    } catch (err) {
      // Fallback: try alternative API
      try {
        const stream2 = await downloadContentFromMessage(imgMsg, 'image');
        const chunks2 = [];
        for await (const chunk of stream2) chunks2.push(chunk);
        const buffer2 = Buffer.concat(chunks2);
        const base64 = buffer2.toString('base64');
        
        const res2 = await axios.post('https://api.baselab.io/v1/removebg', {
          image: base64,
        }, { timeout: 30000 });
        
        if (res2.data?.image) {
          await ctx.sock.sendMessage(ctx.chatId, {
            image: Buffer.from(res2.data.image, 'base64'),
            caption: bold('🎨 Background removed!'),
          });
          return;
        }
      } catch {}
      await ctx.replyError(`Background removal failed. The free API may be rate-limited. Try again later.`);
    }
  },
};
