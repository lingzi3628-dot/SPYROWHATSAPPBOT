import {
  isAiAutoReplyOn,
  setAiAutoReply,
  setAiPersonality,
  setAiMode,
  getAiSettings,
  AI_MODES,
} from '../../services/ai-autoreply.js';
import { completeWithLimit } from '../../services/ai.js';
import { bold, mono, italic } from '../../utils/text.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'ai',
  aliases: ['aireply', 'autoreply'],
  category: 'tools',
  description: 'AI auto-reply toggle, personality, modes — OR ask AI a question.',
  usage: '.ai <question> | .ai on/off | .ai set <text> | .ai mode <name> | .ai modes | .ai status',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();
    const settings = getAiSettings(ctx.chatId);

    // ── .ai on / .ai off ───────────────────────────────────────
    if (sub === 'on' || sub === 'off') {
      setAiAutoReply(ctx.chatId, sub === 'on');
      return ctx.replyOk(
        `AI auto-reply is now ${sub.toUpperCase()} for this chat.\n\n` +
        (sub === 'on'
          ? `Every non-command message will get an AI reply.\nMode: ${mono(settings.mode || 'assistant')}\n\nType \`.ai modes\` to see personalities.`
          : 'Bot will only respond to commands now.')
      );
    }

    // ── .ai set <personality> ──────────────────────────────────
    if (sub === 'set') {
      const personality = sanitize(ctx.body?.split(' ').slice(1).join(' ') || '').slice(0, 2000);
      if (!personality) {
        const cur = settings.personality || '(none)';
        return ctx.reply(
          `${bold('🎨 Current AI Personality:')}\n${italic(cur)}\n\n` +
          `Usage: ${mono('.ai set You are a sarcastic tech genius who loves coffee')}\n\n` +
          `This overrides the preset mode. Clear with ${mono('.ai set clear')}.`
        );
      }
      if (personality.toLowerCase() === 'clear') {
        setAiPersonality(ctx.chatId, '');
        return ctx.replyOk('AI personality cleared. Will use preset mode.');
      }
      setAiPersonality(ctx.chatId, personality);
      return ctx.replyOk(`AI personality set!\n\n${italic(personality.slice(0, 200))}`);
    }

    // ── .ai mode <name> ────────────────────────────────────────
    if (sub === 'mode') {
      const mode = ctx.args[1]?.toLowerCase();
      if (!mode) {
        return ctx.reply(
          `${bold('🎭 Current mode:')} ${mono(settings.mode || 'assistant')}\n\n` +
          `Usage: ${mono('.ai mode <name>')}\n\nType ${mono('.ai modes')} to see all options.`
        );
      }
      if (!AI_MODES[mode]) {
        return ctx.replyError(`Unknown mode "${mode}". Type \`.ai modes\` to see options.`);
      }
      setAiMode(ctx.chatId, mode);
      return ctx.replyOk(`AI mode set to: ${bold(AI_MODES[mode].name)}\n\n${italic(AI_MODES[mode].system.slice(0, 150))}`);
    }

    // ── .ai modes ──────────────────────────────────────────────
    if (sub === 'modes' || sub === 'list') {
      let out = `${bold('🎭 AI Modes')}\n${'━'.repeat(30)}\n`;
      for (const [key, m] of Object.entries(AI_MODES)) {
        const cur = settings.mode === key ? ' ← current' : '';
        out += `\n${mono('.' + key.padEnd(12))} ${bold(m.name)}${cur}`;
        out += `\n  ${italic(m.system.slice(0, 70))}...`;
      }
      out += `\n\n${'━'.repeat(30)}\nUsage: ${mono('.ai mode <name>')}`;
      return ctx.replyLong(out);
    }

    // ── .ai status ─────────────────────────────────────────────
    if (sub === 'status' || (sub === '' && !ctx.body)) {
      const on = isAiAutoReplyOn(ctx.chatId);
      const mode = AI_MODES[settings.mode]?.name || 'Assistant';
      const personality = settings.personality ? ' (custom)' : '';
      // Get usage stats
      const { getUsageStats } = await import('../../services/ai-limiter.js');
      const usage = getUsageStats(ctx.chatId);
      return ctx.reply(
        `${bold('🤖 AI Auto-Reply Status')}\n${'━'.repeat(30)}\n\n` +
        `${bold('Auto-reply:')} ${mono(on ? 'ON' : 'OFF')}\n` +
        `${bold('Mode:')} ${mono(mode)}${personality}\n` +
        `${bold('Personality:')} ${settings.personality ? italic(settings.personality.slice(0, 80) + '...') : italic('(using mode default)')}\n\n` +
        `${bold('📊 Daily Usage:')}\n` +
        `  Used: ${mono(String(usage.used) + '/' + usage.limit)}\n` +
        `  Remaining: ${mono(String(usage.remaining))}\n` +
        `  Resets: ${mono(new Date(usage.resetsAt).toLocaleString())}\n\n` +
        `${bold('Commands:')}\n` +
        `  ${mono('.ai <question>')} — ask AI something\n` +
        `  ${mono('.ai on/off')} — toggle auto-reply\n` +
        `  ${mono('.ai set <text>')} — custom personality\n` +
        `  ${mono('.ai mode <name>')} — pick preset mode\n` +
        `  ${mono('.ai modes')} — list all modes`
      );
    }

    // ── .ai <question> — ask the AI something (with daily limit) ──
    const prompt = sanitize(ctx.body || '').slice(0, 4000);
    if (!prompt) {
      return ctx.reply(
        `${bold('🤖 AI Chat (FREE — no API key!)')}\n\n` +
        `Usage: ${mono('.ai <question>')}\n\n` +
        `Examples:\n` +
        `• ${mono('.ai What is the meaning of life?')}\n` +
        `• ${mono('.ai Write a poem about coffee')}\n\n` +
        `Or use auto-reply: ${mono('.ai on')}\n` +
        `Type ${mono('.ai status')} for full options.\n\n` +
        `${italic('_30 AI requests per day — resets at midnight_')}`
      );
    }
    await ctx.reply('🤖 Thinking… (free AI)');
    try {
      const result = await completeWithLimit(ctx.chatId, prompt);
      if (!result.ok) {
        return ctx.reply(result.error);
      }
      let response = result.reply || '(no response)';
      if (result.remaining <= 5) {
        response += `\n\n${italic(`_⚠️ ${result.remaining} AI requests left today_`)}`;
      }
      await ctx.replyLong(response);
    } catch (err) {
      await ctx.replyError(`AI failed: ${err.message || err}`);
    }
  },
};
