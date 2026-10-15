import axios from 'axios';
import config from '../../config.js';
import { isSafeHttpUrl, sanitize } from '../../security.js';

export default {
  name: 'qr',
  aliases: ['qrcode'],
  category: 'tools',
  description: 'Generate a QR code from text or a URL.',
  usage: '.qr <text or URL>',
  cooldown: 5,
  async execute(ctx) {
    const txt = sanitize(ctx.body || '').slice(0, 1000);
    if (!txt) return ctx.reply('Usage: .qr <text>');
    const url = `${config.QR_API_BASE}/create-qr-code/?size=512x512&data=${encodeURIComponent(txt)}`;
    try {
      const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15_000 });
      await ctx.sock.sendMessage(ctx.chatId, {
        image: Buffer.from(res.data),
        caption: `QR for: ${txt.slice(0, 80)}`,
      });
    } catch (err) {
      await ctx.replyError(`Could not generate QR: ${err.message || err}`);
    }
  },
};
