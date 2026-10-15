import { bold, mono, italic } from '../../utils/text.js';

const WORDS = ['javascript', 'whatsapp', 'dragon', 'computer', 'internet', 'keyboard', 'mountain', 'elephant', 'rainbow', 'butterfly', 'guitar', 'volcano', 'pyramid', 'dolphin', 'galaxy', 'penguin', 'octopus', 'tornado', 'crystal', 'thunder'];
const games = new Map();

export default {
  name: 'hangman',
  aliases: ['hm'],
  category: 'fun',
  description: 'Classic hangman word guessing game.',
  usage: '.hangman start | .hangman <letter>',
  async execute(ctx) {
    const arg = (ctx.args[0] || '').toLowerCase();
    const chatId = ctx.chatId;
    
    if (arg === 'start' || arg === 'new') {
      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      games.set(chatId, { word, guessed: new Set(), wrong: 0, maxWrong: 6 });
      return ctx.reply(_render(games.get(chatId)) + '\n\nType .hangman <letter> to guess!');
    }
    
    const game = games.get(chatId);
    if (!game) return ctx.reply(`No active game. Type ${mono('.hangman start')}`);
    
    const letter = arg.charAt(0);
    if (!letter.match(/[a-z]/)) return ctx.reply('Please guess a letter (a-z).');
    if (game.guessed.has(letter)) return ctx.reply(`Already guessed "${letter}". Try another.`);
    
    game.guessed.add(letter);
    if (!game.word.includes(letter)) game.wrong++;
    
    const rendered = _render(game);
    if (_isWon(game)) {
      games.delete(chatId);
      return ctx.reply(`${rendered}\n\n🎉 You won! The word was "${bold(game.word)}"`);
    }
    if (game.wrong >= game.maxWrong) {
      games.delete(chatId);
      return ctx.reply(`${rendered}\n\n💀 Game over! The word was "${bold(game.word)}"`);
    }
    return ctx.reply(rendered);
  },
};

function _render(game) {
  const display = game.word.split('').map(c => game.guessed.has(c) ? c : '_').join(' ');
  const stages = ['😦','😨','😰','😢','😭','💀'];
  return `${bold('🎮 HANGMAN')}\n\n${stages[game.wrong] || '💀'}  ${mono(display)}\n\nWrong: ${game.wrong}/${game.maxWrong}\nGuessed: ${mono([...game.guessed].join(', ') || 'none')}`;
}
function _isWon(game) { return game.word.split('').every(c => game.guessed.has(c)); }
