import {
  getMode,
  setMode,
  hasAccepted,
  acceptWarning,
  revokeAcceptance,
  getStats,
  canUseUnfiltered,
} from '../../services/unfilter-mode.js';
import { bold, mono, italic } from '../../utils/text.js';
import { isOwner } from '../../security.js';
import config from '../../config.js';

export default {
  name: 'unfilter',
  aliases: ['brutal', 'rawmode', 'honest'],
  category: 'tools',
  description: 'Toggle unfiltered AI mode — raw, honest, sometimes harsh responses.',
  usage: '.unfilter <safe|balanced|unfiltered|accept|status>',
  cooldown: 5,
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();

    // ── .unfilter status ───────────────────────────────────────
    if (sub === 'status' || !sub) {
      const stats = getStats(ctx.chatId);
      const modeLabels = {
        safe: '🟢 Safe (positive, helpful)',
        balanced: '🟡 Balanced (honest, can be critical)',
        unfiltered: '🔴 Unfiltered (raw, brutal, sarcastic)',
      };
      return ctx.reply(
        `${bold('🎭 Unfilter Mode Status')}\n${'━'.repeat(35)}\n\n` +
        `${bold('Mode:')} ${modeLabels[stats.mode] || stats.mode}\n` +
        `${bold('Accepted:')} ${stats.accepted ? '✅ Yes' : '❌ No (must accept warning)'}\n` +
        `${bold('Daily usage:')} ${mono(stats.used + '/' + stats.limit)}\n` +
        `${bold('Remaining:')} ${mono(String(stats.remaining))}\n\n` +
        `${bold('Restrictions:')}\n` +
        `  • ${mono('Private chats only')} — never works in groups\n` +
        `  • ${mono('10 replies/day')} — resets at midnight\n` +
        `  • ${mono('Owner must enable')} — only owner can set modes\n` +
        `  • ${mono('Hard boundaries')} — no illegal/CSAM/doxxing/threats\n\n` +
        `${bold('Commands:')}\n` +
        `  ${mono('.unfilter safe')}        — default, positive\n` +
        `  ${mono('.unfilter balanced')}    — honest but respectful\n` +
        `  ${mono('.unfilter unfiltered')}  — raw and brutal\n` +
        `  ${mono('.unfilter accept')}      — accept the warning\n` +
        `  ${mono('.unfilter revoke')}      — opt out`
      );
    }

    // ── .unfilter accept ───────────────────────────────────────
    if (sub === 'accept' || sub === 'agree') {
      if (hasAccepted(ctx.chatId)) {
        return ctx.reply('✅ You already accepted. Set your mode with .unfilter balanced or .unfilter unfiltered');
      }
      acceptWarning(ctx.chatId);
      return ctx.reply(
        `${bold('⚠️ WARNING ACCEPTED')}\n\n` +
        `You have enabled unfiltered AI mode. This means:\n\n` +
        `• The bot may give ${bold('harsh, critical, or negative')} responses\n` +
        `• The bot may use ${bold('sarcasm and dark humor')}\n` +
        `• The bot will ${bold('NOT sugar-coat')} its opinions\n` +
        `• You may see ${bold('blunt, unsympathetic')} replies\n\n` +
        `${bold('Hard boundaries still apply:')}\n` +
        `❌ No illegal content\n` +
        `❌ No CSAM\n` +
        `❌ No doxxing\n` +
        `❌ No threats\n` +
        `❌ No self-harm encouragement\n\n` +
        `${italic('_You can opt out anytime with .unfilter revoke_')}\n\n` +
        `Now set your mode:\n` +
        `  ${mono('.unfilter balanced')} — honest but respectful\n` +
        `  ${mono('.unfilter unfiltered')} — raw and brutal`
      );
    }

    // ── .unfilter revoke ───────────────────────────────────────
    if (sub === 'revoke' || sub === 'optout' || sub === 'disable') {
      revokeAcceptance(ctx.chatId);
      return ctx.replyOk('Unfiltered mode disabled. Bot is back to safe mode.');
    }

    // ── .unfilter safe|balanced|unfiltered ─────────────────────
    if (['safe', 'balanced', 'unfiltered'].includes(sub)) {
      // Only owner can change modes
      if (!isOwner(ctx.sender)) {
        return ctx.reply('⛔ Only the bot owner can change unfilter modes.');
      }

      // If setting to balanced or unfiltered, must accept warning first
      if (sub !== 'safe' && !hasAccepted(ctx.chatId)) {
        return ctx.reply(
          `${bold('⚠️ Warning Required')}\n\n` +
          `Before using ${mono(sub)} mode, you must accept the warning:\n\n` +
          `${mono('.unfilter accept')}\n\n` +
          `Then you can set the mode.`
        );
      }

      // Groups are always safe
      if (ctx.isGroup && sub !== 'safe') {
        return ctx.reply('⛔ Unfiltered modes only work in private chats, not groups. Groups are always safe mode.');
      }

      setMode(ctx.chatId, sub);
      const labels = {
        safe: '🟢 Safe — positive and helpful',
        balanced: '🟡 Balanced — honest but respectful',
        unfiltered: '🔴 Unfiltered — raw, brutal, sarcastic',
      };
      return ctx.replyOk(`Mode set to: ${bold(labels[sub])}\n\n${sub !== 'safe' ? `Daily limit: 10 replies. ${italic('Groups are always safe mode.')}` : ''}`);
    }

    return ctx.reply(
      `${bold('🎭 Unfilter Mode')}\n\n` +
      `Usage:\n` +
      `  ${mono('.unfilter safe')}        — default, positive\n` +
      `  ${mono('.unfilter balanced')}    — honest, can be critical\n` +
      `  ${mono('.unfilter unfiltered')}  — raw, brutal, sarcastic\n` +
      `  ${mono('.unfilter accept')}      — accept the warning\n` +
      `  ${mono('.unfilter status')}      — show current settings\n` +
      `  ${mono('.unfilter revoke')}      — opt out\n\n` +
      `${italic('_Owner-only. Private chats only. 10/day limit._')}`
    );
  },
};
