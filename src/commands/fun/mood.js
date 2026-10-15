import { getMood, recordActivity, detectSentiment } from '../../services/mood-system.js';
import { bold, mono, italic } from '../../utils/text.js';

export default {
  name: 'mood',
  aliases: ['feelings', 'howareyou'],
  category: 'fun',
  description: 'Check the bot\'s current mood. The bot\'s mood changes based on activity!',
  usage: '.mood',
  async execute(ctx) {
    const mood = getMood(ctx.chatId);
    
    // Mood bar
    const bar = '█'.repeat(Math.floor(mood.score / 5)) + '░'.repeat(20 - Math.floor(mood.score / 5));
    
    await ctx.reply(
      `${bold('🎭 Bot Mood')}\n${'━'.repeat(30)}\n\n` +
      `${mood.emoji} ${bold(mood.label)}\n` +
      `${italic('_"' + mood.desc + '"_')}\n\n` +
      `${mono(bar)} ${mono(mood.score + '/100')}\n\n` +
      `${bold('How mood works:')}\n` +
      `• Chatting makes me ${bold('happy')} 😊\n` +
      `• Compliments make me ${bold('ecstatic')} 😍\n` +
      `• Spam makes me ${bold('annoyed')} 😤\n` +
      `• Silence makes me ${bold('bored')} 😴\n\n` +
      `${italic('_My mood affects how I reply to you!_')}`
    );
    
    // Record this interaction
    recordActivity(ctx.chatId, 'message');
  },
};
