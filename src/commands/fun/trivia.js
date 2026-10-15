import axios from 'axios';
import { bold, mono, italic } from '../../utils/text.js';

const activeQuestions = new Map();

export default {
  name: 'trivia',
  aliases: ['quiz'],
  category: 'fun',
  description: 'Trivia quiz game. Answer questions and earn points!',
  usage: '.trivia | .trivia answer <text>',
  cooldown: 5,
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();
    
    if (sub === 'answer' || sub === 'a') {
      const game = activeQuestions.get(ctx.chatId);
      if (!game) return ctx.reply('No active trivia question. Type .trivia to start.');
      const userAnswer = (ctx.body?.split(' ').slice(1).join(' ') || '').toLowerCase().trim();
      if (!userAnswer) return ctx.reply('Usage: .trivia answer <your answer>');
      
      const correct = game.answer.toLowerCase().trim();
      activeQuestions.delete(ctx.chatId);
      if (userAnswer === correct || correct.includes(userAnswer) || userAnswer.includes(correct)) {
        return ctx.reply(`✅ Correct! The answer was "${bold(game.answer)}".\n\n${italic(game.fact || '')}`);
      }
      return ctx.reply(`❌ Wrong! The correct answer was "${bold(game.answer)}".\n\n${italic(game.fact || '')}`);
    }
    
    await ctx.reply('🔍 Loading trivia question...');
    try {
      const res = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple', { timeout: 10000 });
      const q = res.data?.results?.[0];
      if (!q) return ctx.replyError('Could not load a trivia question.');
      
      const question = q.question.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
      const answer = q.correct_answer.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
      const options = [...q.incorrect_answers, q.correct_answer]
        .map(a => a.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&'))
        .sort(() => Math.random() - 0.5);
      
      activeQuestions.set(ctx.chatId, { answer, fact: q.category });
      
      let out = `${bold('🧠 TRIVIA')}\n${italic(q.category)}\n\n${question}\n\n`;
      for (let i = 0; i < options.length; i++) {
        out += `${mono(String.fromCharCode(65 + i))}) ${options[i]}\n`;
      }
      out += `\n${italic('Type .trivia answer <your answer> to respond')}`;
      await ctx.replyLong(out);
    } catch (err) {
      await ctx.replyError(`Trivia failed: ${err.message}`);
    }
  },
};
