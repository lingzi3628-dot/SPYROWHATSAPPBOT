import { bold, italic } from '../../utils/text.js';

const LINES = [
  "Are you a WiFi signal? Because I'm feeling a connection. 😏",
  "Do you have a map? I got lost in your eyes. 🗺️",
  "Are you French? Because Eiffel for you. 🗼",
  "You must be made of copper and tellurium, because you're Cu-Te. 🧪",
  "Are you a parking ticket? Because you've got FINE written all over you. 🚗",
  "I'm not a photographer, but I can picture us together. 📸",
  "Are you a magician? Because whenever I look at you, everyone else disappears. 🎩",
  "Do you believe in love at first sight, or should I walk by again? 👀",
  "Are you a dragon? Because you're heating up my heart. 🐉",
  "If you were a triangle, you'd be acute one. 📐",
  "Are you the ocean? Because I'm lost at sea. 🌊",
  "You're like a fine wine — you get better with time. 🍷",
  "Is your name Google? Because you have everything I'm searching for. 🔍",
  "Are you a camera? Because every time I see you, I smile. 😊",
  "I seem to have lost my phone number. Can I have yours? 📱",
];

export default {
  name: 'flirt',
  aliases: ['flirtline', 'pickup'],
  category: 'fun',
  description: 'Get a random flirt/pickup line.',
  usage: '.flirt',
  cooldown: 3,
  async execute(ctx) {
    await ctx.reply(`${bold('💕 Flirt Line')}\n\n${italic(LINES[Math.floor(Math.random() * LINES.length)])}`);
  },
};
