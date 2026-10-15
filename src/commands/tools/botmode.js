import {
  getUserBotMode,
  setUserBotMode,
  checkUserBotAccess,
  getWhitelist,
  addToWhitelist,
  removeFromWhitelist,
} from '../../services/bot-mode.js';
import { extractedMentions, phoneToJid, norm } from '../../utils/jid.js';
import { isValidPhoneNumber } from '../../security.js';
import { bold, mono, italic } from '../../utils/text.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'botmode',
  aliases: ['accessmode', 'botaccess'],
  category: 'tools',
  description: 'Control who can use your bot — public, private, or custom (whitelist).',
  usage: '.botmode <public|private|custom> | .botmode whitelist @user | .botmode status',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();

    // ── .botmode status ────────────────────────────────────────
    if (sub === 'status' || !sub) {
      const mode = getUserBotMode(ctx.chatId);
      const whitelist = getWhitelist(ctx.chatId);
      const modeLabels = {
        public: '🌐 Public — anyone can use the bot',
        private: '🔒 Private — only you can use the bot',
        custom: '🎯 Custom — only whitelisted users can use the bot',
      };
      let out = `${bold('🎛️ Bot Access Mode')}\n${'━'.repeat(35)}\n\n`;
      out += `${bold('Current mode:')} ${modeLabels[mode]}\n`;
      if (whitelist.length) {
        out += `\n${bold('Whitelist')} (${whitelist.length}):\n`;
        for (const j of whitelist) {
          out += `  • @${j.split('@')[0]}\n`;
        }
      } else if (mode === 'custom') {
        out += `\n${italic('_Whitelist is empty — nobody can use the bot except you._')}\n`;
      }
      out += `\n${bold('Commands:')}\n`;
      out += `  ${mono('.botmode public')}   — everyone can use\n`;
      out += `  ${mono('.botmode private')}  — only you can use\n`;
      out += `  ${mono('.botmode custom')}   — only whitelisted users\n`;
      out += `  ${mono('.botmode whitelist @user')} — add to whitelist\n`;
      out += `  ${mono('.botmode unwhitelist @user')} — remove from whitelist`;
      if (whitelist.length) {
        return ctx.sock.sendMessage(ctx.chatId, { text: out, mentions: whitelist });
      }
      return ctx.replyLong(out);
    }

    // ── .botmode public ────────────────────────────────────────
    if (sub === 'public') {
      setUserBotMode(ctx.chatId, 'public');
      return ctx.replyOk('🌐 Bot is now PUBLIC — anyone can use commands.');
    }

    // ── .botmode private ───────────────────────────────────────
    if (sub === 'private') {
      setUserBotMode(ctx.chatId, 'private');
      return ctx.replyOk(
        `${bold('🔒 Bot is now PRIVATE')}\n\n` +
        `Only you can use commands. Other users will get:\n` +
        `${italic('"This bot is in Private Mode. Only the owner can use commands right now."')}\n\n` +
        `Use ${mono('.botmode public')} to re-enable for everyone.`
      );
    }

    // ── .botmode custom ────────────────────────────────────────
    if (sub === 'custom') {
      setUserBotMode(ctx.chatId, 'custom');
      const wl = getWhitelist(ctx.chatId);
      return ctx.replyOk(
        `${bold('🎯 Bot is now CUSTOM mode')}\n\n` +
        `Only you and whitelisted users can use commands.\n` +
        `Whitelist: ${wl.length} user(s)\n\n` +
        `Add users: ${mono('.botmode whitelist @user')}\n` +
        `Remove users: ${mono('.botmode unwhitelist @user')}`
      );
    }

    // ── .botmode whitelist @user ───────────────────────────────
    if (sub === 'whitelist' || sub === 'allow' || sub === 'add') {
      const targets = _resolveTargets(ctx);
      if (!targets.length) {
        return ctx.reply(`Usage: ${mono('.botmode whitelist @user')}\nOr: ${mono('.botmode whitelist 254700000000')}`);
      }
      for (const t of targets) {
        addToWhitelist(ctx.chatId, t);
      }
      return ctx.replyOk(
        `${bold('✅ Added to whitelist')}\n\n` +
        `${targets.map(t => '@' + t.split('@')[0]).join(', ')}\n\n` +
        `${italic('_They can now use the bot in custom mode._')}`
      );
    }

    // ── .botmode unwhitelist @user ─────────────────────────────
    if (sub === 'unwhitelist' || sub === 'remove' || sub === 'deny') {
      const targets = _resolveTargets(ctx);
      if (!targets.length) {
        return ctx.reply(`Usage: ${mono('.botmode unwhitelist @user')}`);
      }
      for (const t of targets) {
        removeFromWhitelist(ctx.chatId, t);
      }
      return ctx.replyOk(`Removed from whitelist: ${targets.map(t => '@' + t.split('@')[0]).join(', ')}`);
    }

    return ctx.reply(
      `${bold('🎛️ Bot Access Mode')}\n\n` +
      `Control who can use your bot.\n\n` +
      `Usage:\n` +
      `  ${mono('.botmode public')}          — everyone can use\n` +
      `  ${mono('.botmode private')}         — only you can use\n` +
      `  ${mono('.botmode custom')}          — only whitelisted users\n` +
      `  ${mono('.botmode whitelist @user')} — add to whitelist\n` +
      `  ${mono('.botmode unwhitelist @user')} — remove from whitelist\n` +
      `  ${mono('.botmode status')}          — show current settings`
    );
  },
};

function _resolveTargets(ctx) {
  const out = new Set();
  for (const m of extractedMentions(ctx.msg)) out.add(m);
  for (const a of ctx.args) {
    if (isValidPhoneNumber(a)) out.add(phoneToJid(a));
    else if (/^\d+@s\.whatsapp\.net$/.test(a)) out.add(norm(a));
  }
  out.delete(norm(ctx.botJid));
  return [...out];
}
