export default {
  name: 'fact',
  aliases: ['randomfact'],
  category: 'fun',
  description: 'Get a random interesting fact.',
  usage: '.fact',
  cooldown: 3,
  async execute(ctx) {
    const facts = [
      'Honey never spoils. Archaeologists have found 3000-year-old honey that is still edible.',
      'Octopuses have three hearts and blue blood.',
      'A day on Venus is longer than its year.',
      'Bananas are berries, but strawberries are not.',
      'The first computer programmer was Ada Lovelace, in the 1840s.',
      'Wombat excrement is cube-shaped.',
      'There are more stars in the universe than grains of sand on Earth.',
      'A group of flamingos is called a "flamboyance".',
      'The Eiffel Tower can be 15 cm taller during summer due to thermal expansion.',
      'Sharks existed before trees did.',
    ];
    await ctx.reply('💡 ' + facts[Math.floor(Math.random() * facts.length)]);
  },
};
