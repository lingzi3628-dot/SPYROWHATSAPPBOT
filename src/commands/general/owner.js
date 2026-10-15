import config from '../../config.js';
import { bold, mono, italic } from '../../utils/text.js';
import { generateAvatar } from '../../services/pollination.js';
import logger from '../../logger.js';

export default {
  name: 'owner',
  aliases: ['contact', 'creator'],
  category: 'general',
  description: 'Show the bot owner with a generated profile picture.',
  usage: '.owner',
  cooldown: 10,
  async execute(ctx) {
    if (!config.OWNER_JID) {
      return ctx.reply('❌ Owner is not configured. Set OWNER_JID in .env');
    }
    const phone = config.OWNER_JID.split('@')[0];
    const ownerName = ctx.msg?.pushName || 'The Owner';

    // Try to generate an avatar — uses the owner's name as the seed
    try {
      const imgBuf = await generateAvatar(`mysterious hacker named ${ownerName}, cyberpunk style, neon lights`);
      await ctx.sock.sendMessage(ctx.chatId, {
        image: imgBuf,
        caption: `
╭───────────────────────────────────────────╮
│  ${bold('👑  BOT OWNER')}                          │
╰───────────────────────────────────────────╯

${bold('🧑‍💻 Name:')} ${ownerName}
${bold('📱 Phone:')} +${phone}
${bold('🆔 JID:')} ${mono(config.OWNER_JID)}
${bold('🤖 Bot:')} ${config.BOT_NAME} v${config.VERSION}

${italic('_"Built different. Powered by Baileys."_')}

${bold('📞 Contact:')} Save +${phone} to chat directly.
${bold('💬 Feedback:')} Type ${mono('.feedback <message>')} to reach the owner.
`,
      });
    } catch (err) {
      logger.warn({ err: err.message }, 'avatar generation failed, sending text only');
      await ctx.reply(
        `👑 *BOT OWNER*\n\n` +
        `🧑‍💻 Name: ${ownerName}\n` +
        `📱 Phone: +${phone}\n` +
        `🆔 JID: ${mono(config.OWNER_JID)}\n\n` +
        `_Avatar generation failed — Pollination AI may be busy. Try again later._`
      );
    }
  },
};
