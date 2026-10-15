const RIDDLES = [
  { q: 'I speak without a mouth and hear without ears. I have nobody, but come alive with wind. What am I?', a: 'An echo.' },
  { q: 'The more you take, the more you leave behind. What are they?', a: 'Footsteps.' },
  { q: 'What has hands but cannot clap?', a: 'A clock.' },
  { q: 'What has keys but no locks, space but no room, and you can enter but not go inside?', a: 'A keyboard.' },
  { q: 'I am tall when I am young, and short when I am old. What am I?', a: 'A candle.' },
  { q: 'What gets wetter as it dries?', a: 'A towel.' },
];

export default {
  name: 'riddle',
  aliases: ['riddles'],
  category: 'fun',
  description: 'Get a random riddle.',
  usage: '.riddle',
  async execute(ctx) {
    const r = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
    await ctx.reply(`🤔 *Riddle:*\n${r.q}\n\n_Answer (spoiler):_ ${r.a}`);
  },
};
