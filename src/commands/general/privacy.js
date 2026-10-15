import { db, stmts } from '../../database.js';
import { getMemories, clearMemories } from '../../services/customization.js';
import { bold, mono, italic } from '../../utils/text.js';

export default {
  name: 'privacy',
  aliases: ['datapolicy', 'mydata', 'gdpr'],
  category: 'general',
  description: 'See what the bot stores about you and how to clear it.',
  usage: '.privacy [clear]',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();

    if (sub === 'clear') {
      // Clear user's data
      try {
        // Clear AI memories
        clearMemories(ctx.chatId);
        // Clear user prefs
        db.prepare('DELETE FROM user_prefs WHERE jid = ?').run(ctx.chatId);
        // Clear cooldowns
        db.prepare('DELETE FROM cooldowns WHERE key LIKE ?').run(`%${ctx.chatId}%`);
        // Clear AI settings
        db.prepare('DELETE FROM ai_settings WHERE jid = ?').run(ctx.chatId);
        // Clear bot customization
        db.prepare('DELETE FROM bot_customization WHERE user_id = ?').run(ctx.chatId);
        return ctx.replyOk('Your data has been cleared:\n• AI memories\n• User preferences\n• Cooldowns\n• AI settings\n• Customization\n\nYour command stats and audit log entries are retained for bot security.');
      } catch (err) {
        return ctx.replyError(`Failed to clear data: ${err.message}`);
      }
    }

    // Show what's stored
    const memories = getMemories(ctx.chatId, 100);
    const userPref = stmts.getUserPref.get(ctx.chatId);
    const aiSettings = stmts.getAiSettings.get(ctx.chatId);
    const cmdCount = db.prepare('SELECT COUNT(*) as c FROM command_stats WHERE user_jid = ?').get(ctx.chatId)?.c || 0;
    const warnings = db.prepare('SELECT COUNT(*) as c FROM warnings WHERE user_jid = ?').get(ctx.chatId)?.c || 0;

    await ctx.replyLong(
      `${bold('🔒 Your Data — Privacy Report')}\n${'━'.repeat(40)}\n\n` +

      `${bold('📁 What the bot stores about you:')}\n\n` +

      `${bold('1. Command Stats')}\n` +
      `  Records: ${mono(String(cmdCount))} commands you've run\n` +
      `  Purpose: Usage analytics\n` +
      `  Stored: ${mono('command_stats')} table\n` +
      `  Your ID: ${mono(ctx.chatId)}\n\n` +

      `${bold('2. AI Memories')}\n` +
      `  Records: ${mono(String(memories.length))} facts\n` +
      `  Purpose: Personalize AI replies\n` +
      `  Stored: ${mono('ai_memory')} table\n` +
      `  Clear: ${mono('.memory clear')}\n\n` +

      `${bold('3. User Preferences')}\n` +
      `  Records: ${userPref ? '1 row' : 'none'}\n` +
      `  Purpose: Language, notes\n` +
      `  Stored: ${mono('user_prefs')} table\n\n` +

      `${bold('4. AI Settings')}\n` +
      `  Records: ${aiSettings ? '1 row' : 'none'}\n` +
      `  Purpose: Auto-reply, personality, mode\n` +
      `  Stored: ${mono('ai_settings')} table\n\n` +

      `${bold('5. Warnings')}\n` +
      `  Records: ${mono(String(warnings))} warnings\n` +
      `  Purpose: Group moderation\n` +
      `  Stored: ${mono('warnings')} table\n\n` +

      `${bold('6. Cooldowns')}\n` +
      `  Purpose: Rate limiting\n` +
      `  Stored: ${mono('cooldowns')} table (auto-expires)\n\n` +

      `${bold('7. Bot Customization')}\n` +
      `  Purpose: Your name, prefix, theme\n` +
      `  Stored: ${mono('bot_customization')} table\n\n` +

      `${bold('❌ What the bot does NOT store:')}\n` +
      `  • Your WhatsApp messages (only cached briefly for anti-delete)\n` +
      `  • Your contacts\n` +
      `  • Your photos/media (only processed when you send them)\n` +
      `  • Your location\n` +
      `  • Your password (only a hash, never plaintext)\n\n` +

      `${'━'.repeat(40)}\n` +
      `${bold('🗑️ Clear your data:')}\n` +
      `  ${mono('.privacy clear')} — clear all your personal data\n` +
      `  ${mono('.memory clear')} — clear only AI memories\n\n` +
      `${italic('_Your data is stored locally on the bot server. It is never sold or shared._')}`
    );
  },
};
