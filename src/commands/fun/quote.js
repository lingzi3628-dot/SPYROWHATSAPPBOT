export default {
  name: 'quote',
  aliases: ['qotd'],
  category: 'fun',
  description: 'Get a random inspirational quote.',
  usage: '.quote',
  async execute(ctx) {
    const quotes = [
      { t: 'The only way to do great work is to love what you do.', a: 'Steve Jobs' },
      { t: 'In the middle of difficulty lies opportunity.', a: 'Albert Einstein' },
      { t: 'Whether you think you can or you think you can\'t — you\'re right.', a: 'Henry Ford' },
      { t: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', a: 'Winston Churchill' },
      { t: 'The best time to plant a tree was 20 years ago. The second best time is now.', a: 'Chinese proverb' },
      { t: 'Your time is limited, so don\'t waste it living someone else\'s life.', a: 'Steve Jobs' },
      { t: 'Do what you can, with what you have, where you are.', a: 'Theodore Roosevelt' },
    ];
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    await ctx.reply(`💬 _"${q.t}"_\n— *${q.a}*`);
  },
};
