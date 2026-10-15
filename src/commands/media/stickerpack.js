import { stmts } from '../../database.js';
import { findMediaMessage, downloadMediaToBuffer, cleanupFiles } from '../../utils/media.js';
import { imageToSticker } from '../../services/media.js';
import { bold, mono, italic } from '../../utils/text.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'stickerpack',
  aliases: ['spack', 'pack'],
  category: 'media',
  description: 'Create and manage custom sticker packs. Reply to an image to add it.',
  usage: '.stickerpack create <name> | .stickerpack add | .stickerpack list | .stickerpack send <name> | .stickerpack del <id>',
  cooldown: 5,
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();

    // ── .stickerpack create <name> ─────────────────────────────
    if (sub === 'create') {
      const name = sanitize(ctx.body?.split(' ').slice(1).join(' ') || '').slice(0, 50);
      if (!name) return ctx.reply('Usage: .stickerpack create My Pack');
      const info = stmts.addStickerPack.run(ctx.chatId, name, '[]');
      return ctx.replyOk(`Sticker pack "${bold(name)}" created! (ID: #${info.lastInsertRowid})\n\nAdd stickers by replying to an image with: ${mono('.stickerpack add ' + info.lastInsertRowid)}`);
    }

    // ── .stickerpack add [packId] ──────────────────────────────
    if (sub === 'add') {
      const packId = parseInt(ctx.args[1]);
      if (!packId) return ctx.reply('Usage: .stickerpack add <packId>\n\nReply to an image and specify the pack ID.');

      const pack = stmts.getStickerPacks.all(ctx.chatId).find(p => p.id === packId);
      if (!pack) return ctx.replyError(`Pack #${packId} not found.`);

      const media = findMediaMessage(ctx.msg);
      if (!media || media.type !== 'image') {
        return ctx.reply('❌ Reply to an image to add it as a sticker.');
      }

      try {
        const { buffer } = await downloadMediaToBuffer(ctx.msg);
        const stickerBuf = await imageToSticker(buffer);
        // Store as base64 in the stickers array
        const stickers = JSON.parse(pack.stickers || '[]');
        stickers.push({
          data: stickerBuf.toString('base64'),
          added: Date.now(),
        });
        stmts.updateStickerPack.run(JSON.stringify(stickers), packId);
        return ctx.replyOk(`Sticker added to "${bold(pack.name)}"! (${stickers.length} total)`);
      } catch (err) {
        return ctx.replyError(`Failed: ${err.message}`);
      }
    }

    // ── .stickerpack list ──────────────────────────────────────
    if (sub === 'list') {
      const packs = stmts.getStickerPacks.all(ctx.chatId);
      if (!packs.length) return ctx.reply('📭 No sticker packs. Create one with .stickerpack create <name>');
      let out = `${bold('🎨 Sticker Packs')} (${packs.length})\n${'━'.repeat(35)}\n`;
      for (const p of packs) {
        const count = JSON.parse(p.stickers || '[]').length;
        out += `\n${mono('#' + p.id)} ${bold(p.name)} — ${count} stickers`;
      }
      out += `\n\n${italic('Use .stickerpack send <id> to send all stickers')}`;
      return ctx.replyLong(out);
    }

    // ── .stickerpack send <id> ─────────────────────────────────
    if (sub === 'send') {
      const packId = parseInt(ctx.args[1]);
      if (!packId) return ctx.reply('Usage: .stickerpack send <packId>');
      const pack = stmts.getStickerPacks.all(ctx.chatId).find(p => p.id === packId);
      if (!pack) return ctx.replyError(`Pack #${packId} not found.`);
      const stickers = JSON.parse(pack.stickers || '[]');
      if (!stickers.length) return ctx.reply('This pack has no stickers yet.');
      await ctx.reply(`Sending ${stickers.length} stickers from "${pack.name}"…`);
      for (const s of stickers) {
        try {
          await ctx.sock.sendMessage(ctx.chatId, {
            sticker: Buffer.from(s.data, 'base64'),
          });
          await new Promise(r => setTimeout(r, 500));
        } catch {}
      }
      return;
    }

    // ── .stickerpack del <id> ──────────────────────────────────
    if (sub === 'del' || sub === 'delete') {
      const packId = parseInt(ctx.args[1]);
      if (!packId) return ctx.reply('Usage: .stickerpack del <packId>');
      stmts.deleteStickerPack.run(packId);
      return ctx.replyOk(`Sticker pack #${packId} deleted.`);
    }

    return ctx.reply(
      `${bold('🎨 Sticker Packs')}\n\n` +
      `Usage:\n` +
      `  ${mono('.stickerpack create <name>')} — create a new pack\n` +
      `  ${mono('.stickerpack add <packId>')} — reply to image, add to pack\n` +
      `  ${mono('.stickerpack list')} — view your packs\n` +
      `  ${mono('.stickerpack send <packId>')} — send all stickers in a pack\n` +
      `  ${mono('.stickerpack del <packId>')} — delete a pack`
    );
  },
};
