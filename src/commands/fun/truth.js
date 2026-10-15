const TRUTHS = [
  'What is your biggest fear?',
  'What is the most embarrassing thing you have ever done?',
  'What is a secret you have never told anyone?',
  'What is the worst thing you have ever said about someone?',
  'What is the strangest dream you have ever had?',
  'If you could swap lives with anyone for a day, who would it be?',
  'What is the most childish thing you still do?',
  'Have you ever lied to get out of trouble?',
];

export default {
  name: 'truth',
  aliases: [],
  category: 'fun',
  description: 'Get a random truth question.',
  usage: '.truth',
  async execute(ctx) {
    await ctx.reply('🧐 *Truth:* ' + TRUTHS[Math.floor(Math.random() * TRUTHS.length)]);
  },
};
