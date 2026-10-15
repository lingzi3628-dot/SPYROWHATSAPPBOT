import config from '../../config.js';
import { getCustomization } from '../../services/customization.js';
import { getAiSettings, AI_MODES } from '../../services/ai-autoreply.js';
import { getAwayStatus } from '../../services/away-mode.js';
import { getStats as getUnfilterStats } from '../../services/unfilter-mode.js';
import { bold, mono, italic } from '../../utils/text.js';

export default {
  name: 'exportsettings',
  aliases: ['export', 'backupsettings'],
  category: 'tools',
  description: 'Export your non-secret bot configuration as a text file.',
  usage: '.exportsettings',
  cooldown: 10,
  async execute(ctx) {
    const cust = getCustomization(ctx.chatId);
    const ai = getAiSettings(ctx.chatId);
    const away = getAwayStatus(ctx.chatId);
    const unfilter = getUnfilterStats(ctx.chatId);

    const settings = {
      _meta: {
        exported_at: new Date().toISOString(),
        bot_version: config.VERSION,
        chat_id: ctx.chatId,
        note: 'Import with .importsettings — secrets are NOT included',
      },
      customization: {
        bot_name: cust.bot_name,
        bot_prefix: cust.bot_prefix,
        theme: cust.theme,
        response_length: cust.response_length,
        emoji_usage: cust.emoji_usage,
        language: cust.language,
        custom_greeting: cust.custom_greeting,
        hide_commands: cust.hide_commands,
      },
      ai: {
        auto_reply: ai.auto_reply === 1,
        personality: ai.personality,
        mode: ai.mode,
        mode_name: AI_MODES[ai.mode]?.name || 'Assistant',
      },
      away_mode: {
        mode: away.mode,
        message: away.message,
      },
      unfilter: {
        mode: unfilter.mode,
        accepted: unfilter.accepted,
      },
      // Explicitly NOT exported:
      // - password_hash, API keys, session credentials, blacklist_words (could be sensitive)
    };

    const json = JSON.stringify(settings, null, 2);
    const filename = `spyro-settings-${Date.now()}.json`;

    // Send as a document
    await ctx.sock.sendMessage(ctx.chatId, {
      document: Buffer.from(json, 'utf-8'),
      fileName: filename,
      mimetype: 'application/json',
      caption: `${bold('📦 Settings Export')}\n\n` +
               `Your configuration has been exported.\n\n` +
               `${bold('Included:')}\n` +
               `• Customization (name, prefix, theme)\n` +
               `• AI settings (mode, personality)\n` +
               `• Away mode settings\n` +
               `• Unfilter mode settings\n\n` +
               `${bold('NOT included (secrets):')}\n` +
               `• Passwords\n` +
               `• API keys\n` +
               `• Session credentials\n` +
               `• Blacklist words\n\n` +
               `${italic('_Import with: .importsettings (reply to this file)_')}`,
    });
  },
};
