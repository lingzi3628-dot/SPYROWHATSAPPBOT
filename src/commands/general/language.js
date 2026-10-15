import { stmts } from '../../database.js';

const SUPPORTED = ['en', 'sw', 'fr', 'es', 'de', 'ar', 'pt'];

export default {
  name: 'language',
  aliases: ['lang'],
  category: 'general',
  description: 'Select a supported interface language.',
  usage: '.language [code]',
  async execute(ctx) {
    if (!ctx.args[0]) {
      return ctx.reply(`Supported: ${SUPPORTED.join(', ')}\nExample: .language en`);
    }
    const lang = ctx.args[0].toLowerCase();
    if (!SUPPORTED.includes(lang)) return ctx.replyError(`Language "${lang}" not supported. Try: ${SUPPORTED.join(', ')}`);
    stmts.setUserPref.run(ctx.sender, lang, null, null);
    await ctx.replyOk(`Language set to ${lang}.`);
  },
};
