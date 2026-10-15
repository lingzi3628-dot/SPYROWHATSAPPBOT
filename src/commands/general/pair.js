/**
 * commands/general/pair.js
 * .pair <phone> — generates a pairing code from within WhatsApp.
 *
 * The user sends .pair 2547XXXXXXXX from any chat.
 * The bot generates an 8-character pairing code using the
 * session manager's requestPairingCode function.
 *
 * This uses the SAME Baileys session as the bot — no separate socket.
 */
import { bold, mono, italic } from '../../utils/text.js';
import { isValidPhoneNumber } from '../../security.js';
import logger from '../../logger.js';

export default {
  name: 'pair',
  aliases: ['paircode', 'link', 'connect'],
  category: 'general',
  description: 'Get a pairing code to link your WhatsApp to the bot.',
  usage: '.pair <phone number>\nExample: .pair 254798081280',
  cooldown: 30,
  async execute(ctx) {
    const phone = (ctx.args[0] || '').replace(/[^\d]/g, '');

    if (!phone || !isValidPhoneNumber(phone)) {
      return ctx.reply(
        `${bold('🔗 Pair Your WhatsApp')}\n\n` +
        `Usage: ${mono('.pair <phone>')}\n` +
        `Example: ${mono('.pair 254798081280')}\n\n` +
        `After getting the code:\n` +
        `1. Open WhatsApp on your phone\n` +
        `2. Go to Settings → Linked Devices\n` +
        `3. Tap "Link a Device"\n` +
        `4. Tap "Link with phone number instead"\n` +
        `5. Enter the 8-character code\n\n` +
        `${italic('_The code expires in 60 seconds — enter it fast!_')}`
      );
    }

    // Check if the bot is connected
    if (!ctx.sock?.user?.id) {
      return ctx.replyError('Bot is not connected yet. Please wait for the bot to come online.');
    }

    await ctx.reply('🔗 Generating pairing code... (this may take a few seconds)');

    try {
      // Use the existing socket to request a pairing code
      // The bot must already be connected to WhatsApp servers
      const code = await ctx.sock.requestPairingCode(phone);
      
      logger.info({ phone }, 'pairing code generated via .pair command');

      await ctx.reply(
        `${bold('═════════════════════════════════')}\n` +
        `${bold('  🔑 YOUR PAIRING CODE')}\n` +
        `${bold('═════════════════════════════════')}\n\n` +
        `      ${bold(code)}\n\n` +
        `${bold('═════════════════════════════════')}\n\n` +
        `${bold('How to link:')}\n` +
        `1. Open WhatsApp on your phone\n` +
        `2. Go to ${bold('Settings → Linked Devices')}\n` +
        `3. Tap ${bold('Link a Device')}\n` +
        `4. Tap ${bold('Link with phone number instead')}\n` +
        `5. Enter the code above\n\n` +
        `${italic('_⚠️ Code expires in 60 seconds — enter it NOW!_')}\n` +
        `${italic('_Type .pair <number> to get a new code_')}`
      );
    } catch (err) {
      logger.error({ err: err.message, phone }, 'pairing code failed');
      await ctx.replyError(
        `Failed to generate pairing code: ${err.message}\n\n` +
        `Make sure the bot is connected. Try again in a moment.`
      );
    }
  },
};
