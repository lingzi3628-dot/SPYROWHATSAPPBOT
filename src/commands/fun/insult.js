import { bold, italic } from '../../utils/text.js';

const LINES = [
  "You're as useful as a screen door on a submarine. 🚪",
  "If you were any slower, you'd be going backwards. 🐌",
  "You're not the sharpest tool in the shed — more like a spoon. 🥄",
  "I'd agree with you, but then we'd both be wrong. 🤷",
  "Your brain is like a browser with 100 tabs open — 99 are frozen. 💻",
  "You're the reason the gene pool needs a lifeguard. 🏊",
  "I'd explain it to you, but I left my crayons at home. 🖍️",
  "You're like a cloud — when you disappear, it's a beautiful day. ☁️",
  "If ignorance is bliss, you must be the happiest person alive. 😊",
  "You're as intimidating as a wet napkin. 🧻",
  "I've seen more spine in a jellyfish. 🪼",
  "You're the human equivalent of a 404 error. ❌",
];

export default {
  name: 'insult',
  aliases: ['roast', 'burn'],
  category: 'fun',
  description: 'Get a fun (lighthearted) insult.',
  usage: '.insult [@user]',
  cooldown: 3,
  async execute(ctx) {
    const line = LINES[Math.floor(Math.random() * LINES.length)];
    const mentions = ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentions.length) {
      await ctx.sock.sendMessage(ctx.chatId, { text: `${bold('🔥 Roast')}\n\n@${mentions[0].split('@')[0]} — ${italic(line)}`, mentions });
    } else {
      await ctx.reply(`${bold('🔥 Roast')}\n\n${italic(line)}`);
    }
  },
};
