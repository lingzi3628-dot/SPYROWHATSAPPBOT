import { bold, mono, italic } from '../../utils/text.js';

export default {
  name: 'privacyguide',
  aliases: ['privacy', 'privacysettings', 'protect'],
  category: 'general',
  description: 'Guide to WhatsApp privacy settings — protect your account.',
  usage: '.privacyguide',
  async execute(ctx) {
    await ctx.replyLong(
      `${bold('🔒 WhatsApp Privacy Guide')}\n${'━'.repeat(40)}\n\n` +
      `${bold('📱 On YOUR phone, go to:')}\n` +
      `${mono('Settings → Privacy')}\n\n` +

      `${bold('1. Last Seen & Online')}\n` +
      `  Set to: ${mono('My Contacts')} or ${mono('Nobody')}\n` +
      `  Why: Prevents strangers from tracking when you're active.\n\n` +

      `${bold('2. Profile Photo')}\n` +
      `  Set to: ${mono('My Contacts')}\n` +
      `  Why: Prevents strangers from saving your photo.\n\n` +

      `${bold('3. About')}\n` +
      `  Set to: ${mono('My Contacts')}\n` +
      `  Why: Keeps your bio private from unknown users.\n\n` +

      `${bold('4. Status')}\n` +
      `  Set to: ${mono('My Contacts')} or ${mono('Only Share With...')}\n` +
      `  Why: Controls who sees your status updates.\n\n` +

      `${bold('5. Read Receipts')}\n` +
      `  Turn ${mono('OFF')} if you don't want blue ticks.\n` +
      `  Note: You also won't see others' read receipts.\n\n` +

      `${bold('6. Groups')}\n` +
      `  Set to: ${mono('My Contacts')} or ${mono('Nobody')}\n` +
      `  Why: Prevents strangers from adding you to groups.\n\n` +

      `${bold('7. Two-Step Verification')}\n` +
      `  ${mono('Settings → Account → Two-Step Verification → Enable')}\n` +
      `  Why: Adds a PIN — prevents SIM-swap account theft.\n\n` +

      `${bold('8. Disappearing Messages')}\n` +
      `  Set in individual chats: ${mono('24 hours, 7 days, or 90 days')}\n` +
      `  Why: Messages auto-delete for extra privacy.\n\n` +

      `${bold('9. Block & Report')}\n` +
      `  Block suspicious contacts immediately.\n` +
      `  Report spam/scam accounts to WhatsApp.\n\n` +

      `${bold('10. Linked Devices')}\n` +
      `  Regularly check: ${mono('Settings → Linked Devices')}\n` +
      `  Remove any device you don't recognize.\n\n` +

      `${'━'.repeat(40)}\n` +
      `${italic('_Privacy is a right, not a privilege. Stay safe! 🔐_')}\n\n` +
      `${bold('Bot Privacy Features:')}\n` +
      `  ${mono('.ghost @user')} — silently ignore a user\n` +
      `  ${mono('.block @user')} — block on WhatsApp (owner only)\n` +
      `  ${mono('.privatemode on')} — only owner can use bot`
    );
  },
};
