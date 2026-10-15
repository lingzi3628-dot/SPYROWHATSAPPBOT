import { completeWithLimit } from '../../services/ai.js';
import { sanitize } from '../../security.js';
import { bold, mono, italic } from '../../utils/text.js';

export default {
  name: 'translate',
  aliases: ['tr', 'trans'],
  category: 'tools',
  description: 'Translate text — reply to a message or type inline. Auto-detects source language.',
  usage: '.translate <language> [text]\n  Reply to a message: .translate english\n  Or inline: .translate french Hello world',
  cooldown: 10,
  async execute(ctx) {
    const target = ctx.args[0];
    if (!target) {
      return ctx.reply(
        `${bold('🌐 Translate')}\n\n` +
        `${bold('Method 1 — Reply to a message:')}\n` +
        `  Slide/reply to any message → type ${mono('.translate english')}\n` +
        `  The bot auto-detects the language and translates it.\n\n` +
        `${bold('Method 2 — Inline:')}\n` +
        `  ${mono('.translate french Hello world')}\n\n` +
        `${bold('Supported languages:')}\n` +
        `  english, french, swahili, spanish, german, arabic, chinese,\n` +
        `  japanese, portuguese, russian, italian, hindi, and 100+ more.\n\n` +
        `${italic('_30 AI requests per day — resets at midnight_')}`
      );
    }

    // ── Method 1: Reply to a message ───────────────────────────
    // Check if the user replied to a message
    const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    let textToTranslate = '';

    if (quoted) {
      // Extract text from the quoted message
      if (quoted.conversation) textToTranslate = quoted.conversation;
      else if (quoted.extendedTextMessage?.text) textToTranslate = quoted.extendedTextMessage.text;
      else if (quoted.imageMessage?.caption) textToTranslate = quoted.imageMessage.caption;
      else if (quoted.videoMessage?.caption) textToTranslate = quoted.videoMessage.caption;
      else {
        return ctx.reply('❌ The replied message has no text to translate. Only text messages, captions, and quotes can be translated.');
      }
    } else {
      // ── Method 2: Inline text ────────────────────────────────
      // .translate french Hello world → target=french, text="Hello world"
      textToTranslate = sanitize(ctx.body?.split(' ').slice(1).join(' ') || '');
      if (!textToTranslate) {
        return ctx.reply(
          `❌ No text to translate.\n\n` +
          `${bold('Method 1:')} Reply to a message → ${mono('.translate ' + target)}\n` +
          `${bold('Method 2:')} ${mono('.translate ' + target + ' <text>')}`
        );
      }
    }

    if (textToTranslate.length > 3000) {
      return ctx.replyError('Text too long. Maximum 3000 characters.');
    }

    await ctx.reply(`🌐 Translating to ${bold(target)}…`);
    try {
      const prompt = `Translate the following text into ${target}. The source language is auto-detected. Reply with ONLY the translation, no explanation, no quotes.\n\n"${textToTranslate}"`;
      const result = await completeWithLimit(ctx.chatId, prompt);
      if (!result.ok) return ctx.reply(result.error);

      let response = `${bold('🌐 Translation')} (${target})\n\n${result.reply || '(no translation)'}`;
      if (result.remaining <= 5) {
        response += `\n\n${italic(`_⚠️ ${result.remaining} AI requests left today_`)}`;
      }
      await ctx.replyLong(response);
    } catch (err) {
      await ctx.replyError(`Translate failed: ${err.message || err}`);
    }
  },
};
