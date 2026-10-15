import { stmts } from '../../database.js';
import { bold, mono, italic } from '../../utils/text.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'autorule',
  aliases: ['autoreply', 'keyword', 'autorespond'],
  category: 'tools',
  description: 'Set keyword-based auto-responses. Bot replies when someone says the keyword.',
  usage: '.autorule <keyword> | <response>\n  .autorule price | Our prices start at $10!\n  .autorule hours | We\'re open 9am-5pm\n  .autorule list\n  .autorule del <id>',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();

    // ── .autorule list ─────────────────────────────────────────
    if (sub === 'list') {
      const rules = stmts.getAutoRules.all(ctx.chatId);
      if (!rules.length) return ctx.reply('📭 No auto-responder rules set.');
      let out = `${bold('🤖 Auto-Responder Rules')} (${rules.length})\n${'━'.repeat(40)}\n`;
      for (const r of rules) {
        out += `\n${mono('#' + r.id)} ${bold(r.keyword)}\n  → ${r.response.slice(0, 80)}\n`;
      }
      out += `\n${italic('Use .autorule del <id> to remove')}`;
      return ctx.replyLong(out);
    }

    // ── .autorule del <id> ─────────────────────────────────────
    if (sub === 'del' || sub === 'delete' || sub === 'remove') {
      const id = parseInt(ctx.args[1]);
      if (!id) return ctx.reply('Usage: .autorule del <id>');
      stmts.deleteAutoRule.run(id);
      return ctx.replyOk(`Auto-rule #${id} removed.`);
    }

    // ── .autorule <keyword> | <response> ───────────────────────
    const input = sanitize(ctx.body || '');
    if (!input || !input.includes('|')) {
      return ctx.reply(
        `${bold('🤖 Auto-Responder Rules')}\n\n` +
        `Set keyword-based auto-replies. When someone says the keyword, the bot replies with your response.\n\n` +
        `Usage: ${mono('.autorule <keyword> | <response>')}\n\n` +
        `Examples:\n` +
        `  ${mono('.autorule price | Our prices start at $10!')}\n` +
        `  ${mono('.autorule hours | We\'re open 9am-5pm Mon-Fri')}\n` +
        `  ${mono('.autorule hello | Hey there! How can I help?')}\n\n` +
        `${bold('Manage:')}\n` +
        `  ${mono('.autorule list')} — view rules\n` +
        `  ${mono('.autorule del <id>')} — remove a rule`
      );
    }

    const [keywordPart, ...respParts] = input.split('|');
    const keyword = keywordPart.trim().toLowerCase().slice(0, 100);
    const response = respParts.join('|').trim().slice(0, 2000);

    if (!keyword || !response) {
      return ctx.replyError('Both keyword and response are required.');
    }

    const info = stmts.addAutoRule.run(ctx.chatId, ctx.chatId, keyword, response);
    return ctx.replyOk(
      `${bold('🤖 Auto-Responder Rule Set')}\n\n` +
      `ID: ${mono('#' + info.lastInsertRowid)}\n` +
      `Keyword: ${bold(keyword)}\n` +
      `Response: ${italic(response.slice(0, 100))}\n\n` +
      `${italic('_When anyone says "${keyword}", the bot will reply with your response._')}`
    );
  },
};
