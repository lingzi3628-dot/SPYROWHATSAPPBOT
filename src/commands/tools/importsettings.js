import { saveCustomization } from '../../services/customization.js';
import { setAiPersonality, setAiMode, setAiAutoReply } from '../../services/ai-autoreply.js';
import { setAwayMode, setAwayMessage } from '../../services/away-mode.js';
import { setMode as setUnfilterMode } from '../../services/unfilter-mode.js';
import { bold, mono, italic } from '../../utils/text.js';

export default {
  name: 'importsettings',
  aliases: ['import', 'restoresettings'],
  category: 'tools',
  description: 'Import settings from an exported file. Reply to the file with this command.',
  usage: '.importsettings (reply to a settings JSON file)',
  cooldown: 10,
  async execute(ctx) {
    // Check if replied to a document
    const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted?.documentMessage) {
      return ctx.reply(
        `${bold('📦 Import Settings')}\n\n` +
        `Reply to a previously exported settings file with this command.\n\n` +
        `Usage:\n` +
        `1. Export your settings: ${mono('.exportsettings')}\n` +
        `2. Reply to the exported file\n` +
        `3. Type: ${mono('.importsettings')}\n\n` +
        `${italic('_Secrets (passwords, API keys) are never imported._')}`
      );
    }

    // Try to download the document
    let jsonStr = '';
    try {
      const { downloadMediaToBuffer } = await import('../../utils/media.js');
      const fakeMsg = { message: { documentMessage: quoted.documentMessage } };
      const { buffer } = await downloadMediaToBuffer(fakeMsg);
      jsonStr = buffer.toString('utf-8');
    } catch (err) {
      return ctx.replyError(`Failed to download file: ${err.message}`);
    }

    // Parse and validate
    let settings;
    try {
      settings = JSON.parse(jsonStr);
    } catch {
      return ctx.replyError('Invalid JSON file. Please export settings first with .exportsettings');
    }

    if (!settings._meta || !settings._meta.note?.includes('Import')) {
      return ctx.replyError('This doesn\'t look like a Spyro settings file.');
    }

    const imported = [];
    const skipped = [];

    // Import customization
    if (settings.customization) {
      try {
        const c = settings.customization;
        saveCustomization(ctx.chatId, {
          bot_name: c.bot_name || null,
          bot_prefix: c.bot_prefix || null,
          theme: c.theme || null,
          response_length: c.response_length || null,
          emoji_usage: c.emoji_usage || null,
          language: c.language || null,
          custom_greeting: c.custom_greeting || null,
          hide_commands: c.hide_commands || null,
        });
        imported.push('Customization (name, prefix, theme, etc.)');
      } catch (err) {
        skipped.push(`Customization: ${err.message}`);
      }
    }

    // Import AI settings
    if (settings.ai) {
      try {
        const a = settings.ai;
        if (a.personality) setAiPersonality(ctx.chatId, a.personality);
        if (a.mode) setAiMode(ctx.chatId, a.mode);
        if (typeof a.auto_reply === 'boolean') setAiAutoReply(ctx.chatId, a.auto_reply);
        imported.push('AI settings (mode, personality, auto-reply)');
      } catch (err) {
        skipped.push(`AI: ${err.message}`);
      }
    }

    // Import away mode
    if (settings.away_mode) {
      try {
        const am = settings.away_mode;
        if (am.mode) setAwayMode(ctx.chatId, am.mode);
        if (am.message) setAwayMessage(ctx.chatId, am.message);
        imported.push('Away mode (mode, message)');
      } catch (err) {
        skipped.push(`Away mode: ${err.message}`);
      }
    }

    // Import unfilter mode
    if (settings.unfilter) {
      try {
        if (settings.unfilter.mode) setUnfilterMode(ctx.chatId, settings.unfilter.mode);
        imported.push('Unfilter mode');
      } catch (err) {
        skipped.push(`Unfilter: ${err.message}`);
      }
    }

    // Build response
    let out = `${bold('📦 Settings Import Complete')}\n${'━'.repeat(35)}\n\n`;
    out += `${bold('✅ Imported:')}\n`;
    for (const i of imported) out += `  • ${i}\n`;
    if (skipped.length) {
      out += `\n${bold('⚠️ Skipped:')}\n`;
      for (const s of skipped) out += `  • ${s}\n`;
    }
    out += `\n${bold('🔒 Secrets NOT imported:')}\n  • Passwords\n  • API keys\n  • Session credentials\n  • Blacklist words\n`;
    out += `\n${italic('_Your settings have been restored!_')}`;

    await ctx.reply(out);
  },
};
