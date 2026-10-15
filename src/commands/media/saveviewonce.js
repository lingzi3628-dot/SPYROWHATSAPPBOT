import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { bold } from '../../utils/text.js';

/**
 * .vv — Save view-once image/video.
 * Works with BOTH formats:
 *   1. viewOnceMessage / viewOnceMessageV2 wrapper (newer WhatsApp)
 *   2. Plain imageMessage/videoMessage with viewOnce=true (older format)
 *
 * This does NOT bypass encryption — it only downloads media the bot
 * can already see in the quoted message.
 */
export default {
  name: 'saveviewonce',
  aliases: ['sv', 'savevv', 'vv', 'viewonce', 'savevo', 'rvo', 'readviewonce'],
  category: 'media',
  description: 'Save a view-once image/video (reply to it).',
  usage: '.vv (reply to a view-once message)',
  cooldown: 5,
  async execute(ctx) {
    const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted) {
      return ctx.reply(
        '❌ Reply to a view-once image or video first.\n\n' +
        'How: Long-press the view-once message → Reply → type .vv'
      );
    }

    // ── Try BOTH view-once formats ─────────────────────────────
    // Format 1: viewOnceMessage / viewOnceMessageV2 wrapper
    let imgMsg = null;
    let vidMsg = null;

    if (quoted.viewOnceMessage?.message) {
      imgMsg = quoted.viewOnceMessage.message.imageMessage;
      vidMsg = quoted.viewOnceMessage.message.videoMessage;
    } else if (quoted.viewOnceMessageV2?.message) {
      imgMsg = quoted.viewOnceMessageV2.message.imageMessage;
      vidMsg = quoted.viewOnceMessageV2.message.videoMessage;
    }

    // Format 2: Plain image/video with viewOnce flag (or just regular media)
    if (!imgMsg && !vidMsg) {
      imgMsg = quoted.imageMessage;
      vidMsg = quoted.videoMessage;
    }

    // ── Download and send ──────────────────────────────────────
    try {
      if (imgMsg) {
        const stream = await downloadContentFromMessage(imgMsg, 'image');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        await ctx.sock.sendMessage(ctx.chatId, {
          image: buffer,
          caption: bold('🖼️ View-once image saved') + (imgMsg.caption ? '\n\n' + imgMsg.caption : ''),
        }, { quoted: ctx.msg });
        return;
      }

      if (vidMsg) {
        const stream = await downloadContentFromMessage(vidMsg, 'video');
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        await ctx.sock.sendMessage(ctx.chatId, {
          video: buffer,
          caption: bold('🎬 View-once video saved') + (vidMsg.caption ? '\n\n' + vidMsg.caption : ''),
        }, { quoted: ctx.msg });
        return;
      }

      return ctx.reply('❌ That message has no image or video. Reply to a view-once image/video.');

    } catch (err) {
      return ctx.replyError(`Failed to save: ${err.message || err}`);
    }
  },
};
