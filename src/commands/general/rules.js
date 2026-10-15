import { getGroupSettings } from '../../database.js';
import { bold, mono } from '../../utils/text.js';

export default {
  name: 'rules',
  aliases: ['grouprules'],
  category: 'general',
  groupOnly: true,
  description: 'Show the configured group rules.',
  usage: '.rules',
  async execute(ctx) {
    const s = getGroupSettings(ctx.chatId);
    if (!s.rules) return ctx.reply('No rules set. Admins can use .setrules <text>.');
    await ctx.reply(`${bold('📜 Group Rules')}\n\n${mono(s.rules)}`);
  },
};
