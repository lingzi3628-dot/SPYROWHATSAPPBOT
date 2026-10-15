/**
 * .fakechat — Generate a clearly-labeled fictional chat image.
 * Uses sharp to create a WhatsApp-style chat screenshot that is
 * watermarked as "FICTIONAL — NOT REAL" to prevent misuse.
 */
import sharp from 'sharp';
import { bold, mono, italic } from '../../utils/text.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'fakechat',
  aliases: ['fc', 'fictional'],
  category: 'fun',
  description: 'Create a clearly-labeled fictional chat image (for memes/jokes).',
  usage: '.fakechat <name> | <message>\nExample: .fakechat Elon Musk | I\'m buying WhatsApp',
  cooldown: 10,
  async execute(ctx) {
    const input = sanitize(ctx.body || '');
    if (!input || !input.includes('|')) {
      return ctx.reply(
        `${bold('🎬 Fake Chat Generator')}\n\n` +
        `Creates a FICTIONAL chat screenshot (clearly watermarked).\n\n` +
        `Usage: ${mono('.fakechat <name> | <message>')}\n\n` +
        `Example:\n` +
        `  ${mono('.fakechat Elon Musk | I\'m buying WhatsApp')}\n` +
        `  ${mono('.fakechat Mom | Where are you??')}\n\n` +
        `${italic('_⚠️ All images are watermarked "FICTIONAL" to prevent misuse_')}`
      );
    }

    const [name, ...msgParts] = input.split('|');
    const message = msgParts.join('|').trim();
    const senderName = name.trim().slice(0, 30);
    if (!senderName || !message) {
      return ctx.replyError('Both name and message are required. Use: .fakechat Name | Message');
    }
    if (message.length > 200) {
      return ctx.replyError('Message too long. Maximum 200 characters.');
    }

    try {
      const imgBuf = await _generateFakeChat(senderName, message.slice(0, 200));
      await ctx.sock.sendMessage(ctx.chatId, {
        image: imgBuf,
        caption: `${bold('🎬 Fictional Chat')}\n${italic('_This is a fake chat for entertainment only. Not a real screenshot._')}`,
      });
    } catch (err) {
      await ctx.replyError(`Failed to generate: ${err.message || err}`);
    }
  },
};

async function _generateFakeChat(name, message) {
  const width = 600;
  const headerHeight = 80;
  const msgHeight = 120;
  const footerHeight = 40;
  const totalHeight = headerHeight + msgHeight + footerHeight;

  // Escape XML special chars
  const escName = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escMsg = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svg = `
  <svg width="${width}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
    <!-- Background -->
    <rect width="${width}" height="${totalHeight}" fill="#0a1014"/>

    <!-- Header bar (WhatsApp green) -->
    <rect width="${width}" height="${headerHeight}" fill="#075e54"/>
    <circle cx="35" cy="40" r="20" fill="#128c7e"/>
    <text x="70" y="38" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="white">${escName}</text>
    <text x="70" y="60" font-family="Arial, sans-serif" font-size="14" fill="#a5d6a4">online</text>

    <!-- Chat background pattern -->
    <rect y="${headerHeight}" width="${width}" height="${msgHeight}" fill="#0b141a"/>

    <!-- Message bubble (right side = "sent") -->
    <rect x="${width - 350}" y="${headerHeight + 20}" width="320" height="${msgHeight - 40}" rx="12" fill="#005c4b"/>
    <text x="${width - 330}" y="${headerHeight + 50}" font-family="Arial, sans-serif" font-size="16" fill="white">
      ${_wrapText(escMsg, 40).map((line, i) => `<tspan x="${width - 330}" dy="${i === 0 ? 0 : 22}">${line}</tspan>`).join('')}
    </text>
    <text x="${width - 50}" y="${headerHeight + msgHeight - 30}" font-family="Arial, sans-serif" font-size="12" fill="#a5d6a4" text-anchor="end">9:41 PM ✓✓</text>

    <!-- FICTIONAL watermark footer -->
    <rect y="${headerHeight + msgHeight}" width="${width}" height="${footerHeight}" fill="#d32f2f"/>
    <text x="${width/2}" y="${headerHeight + msgHeight + 25}" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">⚠️ FICTIONAL — NOT A REAL SCREENSHOT</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

function _wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > maxChars) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = (current + ' ' + w).trim();
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4); // max 4 lines
}
