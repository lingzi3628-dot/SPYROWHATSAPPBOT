import config from '../../config.js';
import { bold, mono, italic } from '../../utils/text.js';

const CHANNEL_URL = 'https://whatsapp.com/channel/0029VbEOdMr1yT2AiD35eK2F';

export default {
  name: 'channel',
  aliases: ['join', 'joinchannel', 'updates'],
  category: 'general',
  description: 'Get the link to join our WhatsApp channel for bot updates.',
  usage: '.channel',
  async execute(ctx) {
    await ctx.reply(
      `${bold('📢 Join Our WhatsApp Channel')}\n\n` +
      `Get the latest updates, new features, tips, and announcements about ${config.BOT_NAME}!\n\n` +
      `${bold('🔗 Channel Link:')}\n${mono(CHANNEL_URL)}\n\n` +
      `${italic('_Tap the link to join and stay updated._')}`
    );
  },
};
