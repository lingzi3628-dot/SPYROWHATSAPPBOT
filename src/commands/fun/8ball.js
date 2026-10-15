const ANSWERS = [
  'It is certain.', 'Without a doubt.', 'Yes, definitely.',
  'You may rely on it.', 'Most likely.', 'Yes.',
  'Signs point to yes.', 'Reply hazy, try again.', 'Ask again later.',
  'Cannot predict now.', 'Don\'t count on it.', 'My reply is no.',
  'Outlook not so good.', 'Very doubtful.',
];

export default {
  name: '8ball',
  aliases: ['eightball', '8b'],
  category: 'fun',
  description: 'Magic 8-ball. Ask a yes/no question.',
  usage: '.8ball <question>',
  async execute(ctx) {
    const q = ctx.body;
    if (!q) return ctx.reply('Usage: .8ball <question>');
    await ctx.reply(`🎱 *Question:* ${q}\n*Answer:* ${ANSWERS[Math.floor(Math.random() * ANSWERS.length)]}`);
  },
};
