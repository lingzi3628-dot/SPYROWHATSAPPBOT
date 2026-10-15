const DARES = [
  'Sing the chorus of your favorite song out loud.',
  'Send a voice note speaking in a funny accent.',
  'Do 10 jumping jacks and tell us when done.',
  'Compliment the person who sent the last message.',
  'Send a sticker that matches your current mood.',
  'Tell us your last Google search.',
  'Change your profile picture to a meme for 10 minutes.',
  'Send a hello to the group in capital letters only.',
];

export default {
  name: 'dare',
  aliases: [],
  category: 'fun',
  description: 'Get a random dare.',
  usage: '.dare',
  async execute(ctx) {
    await ctx.reply('😈 *Dare:* ' + DARES[Math.floor(Math.random() * DARES.length)]);
  },
};
