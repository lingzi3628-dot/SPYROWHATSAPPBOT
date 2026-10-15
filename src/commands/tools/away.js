import {
  getAwayMode,
  setAwayMode,
  getAwayMessage,
  setAwayMessage,
  isAwayModeEnabled,
  getAwayStatus,
} from '../../services/away-mode.js';
import { bold, mono, italic } from '../../utils/text.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'away',
  aliases: ['afk', 'donotdisturb', 'dnd'],
  category: 'tools',
  description: 'Set away mode — bot tells people you\'re away when you\'re offline.',
  usage: '.away <message> | .away off | .away status | .away ai | .away silent',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();

    // ── .away status ───────────────────────────────────────────
    if (sub === 'status' || (!sub && !ctx.body)) {
      const status = getAwayStatus(ctx.sender === ctx.botJid ? ctx.sender : ctx.chatId);
      // Try to use the user's ID from the web platform
      // For now, use the chat JID as the identifier
      return ctx.reply(
        `${bold('📴 Away Mode Status')}\n${'━'.repeat(30)}\n\n` +
        `${bold('Mode:')} ${mono(status.mode.toUpperCase())}\n` +
        `${bold('Online:')} ${status.isOnline ? '🟢 Yes' : '🔴 No'}\n` +
        `${bold('Last active:')} ${mono(status.lastActiveAgo)}\n` +
        `${bold('Away message:')} ${italic(status.message)}\n\n` +
        `${bold('Modes:')}\n` +
        `  ${mono('.away ai')}     — AI replies in your personality\n` +
        `  ${mono('.away <text>')} — Send custom away message\n` +
        `  ${mono('.away silent')}  — Silent (no auto-replies)\n` +
        `  ${mono('.away off')}     — Turn off away mode`
      );
    }

    // ── .away off ──────────────────────────────────────────────
    if (sub === 'off' || sub === 'disable') {
      setAwayMode(ctx.chatId, 'off');
      return ctx.replyOk('Away mode is now OFF. The bot will stay silent for non-command messages.');
    }

    // ── .away silent ───────────────────────────────────────────
    if (sub === 'silent' || sub === 'quiet') {
      setAwayMode(ctx.chatId, 'off');
      return ctx.replyOk('Silent mode ON. Bot won\'t auto-reply to anyone. Only commands work.');
    }

    // ── .away ai ───────────────────────────────────────────────
    if (sub === 'ai' || sub === 'auto') {
      setAwayMode(ctx.chatId, 'ai');
      return ctx.replyOk(
        `${bold('🤖 AI Auto-Reply Mode ON')}\n\n` +
        `The bot will reply to messages using your trained AI personality.\n` +
        `Train your AI at the web dashboard → 🧠 Train AI\n\n` +
        `Use ${mono('.away off')} to disable.`
      );
    }

    // ── .away <custom message> ─────────────────────────────────
    const message = sanitize(ctx.body || '').slice(0, 2000);
    if (message) {
      setAwayMessage(ctx.chatId, message);
      setAwayMode(ctx.chatId, 'away');
      return ctx.replyOk(
        `${bold('📴 Away Mode ON')}\n\n` +
        `When someone messages you, the bot will reply:\n\n` +
        `${italic(message)}\n\n` +
        `Use ${mono('.away off')} to disable.\n` +
        `Use ${mono('.away ai')} for AI auto-reply instead.`
      );
    }

    // ── No args — show help ────────────────────────────────────
    return ctx.reply(
      `${bold('📴 Away Mode')}\n\n` +
      `Usage:\n` +
      `  ${mono('.away <message>')} — set custom away message\n` +
      `  ${mono('.away ai')}        — AI replies in your personality\n` +
      `  ${mono('.away silent')}    — silent mode (no auto-replies)\n` +
      `  ${mono('.away off')}       — turn off away mode\n` +
      `  ${mono('.away status')}    — show current status\n\n` +
      `${italic('_Example: .away Hey! I\'m busy right now, I\'ll respond later._')}`
    );
  },
};
