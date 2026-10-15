const QUIZZES = [
  { q: 'What is the capital of Kenya?', a: 'Nairobi' },
  { q: 'How many continents are there on Earth?', a: '7' },
  { q: 'What is the largest planet in our solar system?', a: 'Jupiter' },
  { q: 'Who wrote "Romeo and Juliet"?', a: 'Shakespeare' },
  { q: 'What is the chemical symbol for gold?', a: 'Au' },
  { q: 'In what year did World War 2 end?', a: '1945' },
];

export default {
  name: 'quiz',
  aliases: [],
  category: 'fun',
  description: 'Get a random quiz question.',
  usage: '.quiz',
  async execute(ctx) {
    const q = QUIZZES[Math.floor(Math.random() * QUIZZES.length)];
    await ctx.reply(`❓ *Quiz:*\n${q.q}\n\n_Answer:_ ${q.a}`);
  },
};
