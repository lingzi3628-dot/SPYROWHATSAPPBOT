import sharp from 'sharp';
import { bold } from '../../utils/text.js';
import { sanitize } from '../../security.js';

export default {
  name: 'attp',
  aliases: ['textsticker', 'tts'],
  category: 'media',
  description: 'Convert text to an animated sticker.',
  usage: '.attp <text>',
  cooldown: 10,
  async execute(ctx) {
    const text = sanitize(ctx.body || '').slice(0, 100);
    if (!text) return ctx.reply('Usage: .attp <text>\nExample: .attp Hello World');
    
    try {
      // Generate a text sticker using SVG → webp
      const svg = _makeTextSvg(text);
      const buffer = await sharp(Buffer.from(svg))
        .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 90 })
        .toBuffer();
      
      await ctx.sock.sendMessage(ctx.chatId, { sticker: buffer });
    } catch (err) {
      await ctx.replyError(`ATTP failed: ${err.message}`);
    }
  },
};

function _makeTextSvg(text) {
  const lines = _wrapText(text, 15);
  const fontSize = 40;
  const lineHeight = 50;
  const totalHeight = lines.length * lineHeight + 60;
  const width = 512;
  
  const textElements = lines.map((line, i) => 
    `<text x="${width/2}" y="${40 + i * lineHeight + fontSize}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" stroke="black" stroke-width="2">${_escapeXml(line)}</text>`
  ).join('');
  
  return `<svg width="${width}" height="${Math.max(totalHeight, 200)}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="transparent"/>
    ${textElements}
  </svg>`;
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
  return lines.slice(0, 5);
}

function _escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
