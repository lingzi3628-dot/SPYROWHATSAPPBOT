import { bold, italic } from '../../utils/text.js';

const LINES = [
  "You light up every room you walk into. ✨",
  "Your smile is contagious — keep sharing it! 😊",
  "You're stronger than you think. 💪",
  "The world is better because you're in it. 🌍",
  "You have an amazing sense of humor. 😄",
  "You're more helpful than you realize. 🤝",
  "Your kindness makes a real difference. 💖",
  "You're incredibly talented — don't doubt it. 🌟",
  "You bring out the best in others. 🌈",
  "Your positive energy is inspiring. ⚡",
  "You're a gift to the people around you. 🎁",
  "You make hard things look easy. 🎯",
];

export default {
  name: 'compliment',
  aliases: ['praise', 'nice'],
  category: 'fun',
  description: 'Get a random compliment.',
  usage: '.compliment [@user]',
  cooldown: 3,
  async execute(ctx) {
    const line = LINES[Math.floor(Math.random() * LINES.length)];
    const mentions = ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    if (mentions.length) {
      await ctx.sock.sendMessage(ctx.chatId, { text: `${bold('💛 Compliment')}\n\n@${mentions[0].split('@')[0]} — ${italic(line)}`, mentions });
    } else {
      await ctx.reply(`${bold('💛 Compliment')}\n\n${italic(line)}`);
    }
  },
};
