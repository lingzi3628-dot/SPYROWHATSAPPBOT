import {
  getMemories,
  rememberFact,
  deleteMemory,
  clearMemories,
} from '../../services/customization.js';
import { bold, mono, italic } from '../../utils/text.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'memory',
  aliases: ['remember', 'mem'],
  category: 'tools',
  description: 'Bot memory — store and recall facts. Bot uses these in AI replies.',
  usage: '.memory <add|list|del|clear> [text]',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();

    // ── .memory add <fact> ─────────────────────────────────────
    if (sub === 'add' || sub === 'remember') {
      const fact = sanitize(ctx.body?.split(' ').slice(1).join(' ') || '').slice(0, 1000);
      if (!fact) return ctx.reply('Usage: .memory add Mesh likes coffee and plays guitar');
      rememberFact(ctx.chatId, fact, ctx.sender);
      return ctx.replyOk(`Remembered: ${italic(fact)}`);
    }

    // ── .memory list ───────────────────────────────────────────
    if (sub === 'list' || !sub) {
      const memories = getMemories(ctx.chatId, 20);
      if (!memories.length) {
        return ctx.reply('📭 No memories stored.\n\nUse `.memory add <fact>` to teach me something.');
      }
      let out = `${bold('🧠 Bot Memory')} (${memories.length})\n${'━'.repeat(30)}\n`;
      for (const m of memories) {
        out += `\n${mono('#' + m.id)} ${m.fact}`;
      }
      out += `\n\n${'━'.repeat(30)}\n${italic('Use .memory del <id> to forget, .memory clear to wipe all')}`;
      return ctx.replyLong(out);
    }

    // ── .memory del <id> ───────────────────────────────────────
    if (sub === 'del' || sub === 'delete' || sub === 'forget') {
      const id = parseInt(ctx.args[1]);
      if (!id) return ctx.reply('Usage: .memory del <id>\n\nUse .memory list to see IDs.');
      deleteMemory(id);
      return ctx.replyOk(`Forgot memory #${id}`);
    }

    // ── .memory clear ──────────────────────────────────────────
    if (sub === 'clear' || sub === 'wipe') {
      clearMemories(ctx.chatId);
      return ctx.replyOk('All memories cleared.');
    }

    return ctx.reply(
      `${bold('🧠 Bot Memory')}\n\n` +
      `Usage:\n` +
      `  ${mono('.memory add <fact>')} — remember something\n` +
      `  ${mono('.memory list')} — see all memories\n` +
      `  ${mono('.memory del <id>')} — forget a memory\n` +
      `  ${mono('.memory clear')} — wipe all memories\n\n` +
      `${italic('_The bot uses memories to personalize AI replies_')}`
    );
  },
};
