import {
  getWebhooks,
  addWebhook,
  removeWebhook,
  testWebhook,
} from '../../services/webhooks.js';
import { bold, mono, italic } from '../../utils/text.js';
import { isSafeHttpUrl } from '../../security.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'webhook',
  aliases: ['hook', 'webhooks'],
  category: 'tools',
  description: 'Webhook system — send events to Zapier, Make.com, Discord, custom apps.',
  usage: '.webhook add <url> <events> | .webhook list | .webhook test <url> | .webhook del <id>',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();

    // ── .webhook add <url> [events] ────────────────────────────
    if (sub === 'add') {
      const url = ctx.args[1];
      if (!url || !isSafeHttpUrl(url)) {
        return ctx.replyError('Valid HTTP(S) URL required.\n\nUsage: .webhook add https://hooks.zapier.com/xxx message,command');
      }
      const events = (ctx.args[2] || 'message').split(',').map(e => e.trim().toLowerCase());
      const validEvents = ['message', 'command', 'join', 'leave', 'status', 'all'];
      const invalid = events.filter(e => !validEvents.includes(e));
      if (invalid.length) {
        return ctx.replyError(`Invalid events: ${invalid.join(', ')}\nValid: ${validEvents.join(', ')}`);
      }
      const name = sanitize(ctx.body?.split(' ').slice(3).join(' ') || '').slice(0, 50) || 'Webhook';
      const hook = addWebhook(ctx.chatId, { url, events, name });
      return ctx.replyOk(
        `${bold('🔗 Webhook Added')}\n\n` +
        `ID: ${mono('#' + hook.id)}\n` +
        `Name: ${hook.name}\n` +
        `URL: ${mono(url.slice(0, 60))}\n` +
        `Events: ${mono(hook.events.join(', '))}\n\n` +
        `${italic('_The bot will POST JSON to this URL when events fire._')}`
      );
    }

    // ── .webhook list ──────────────────────────────────────────
    if (sub === 'list') {
      const hooks = getWebhooks(ctx.chatId);
      if (!hooks.length) return ctx.reply('📭 No webhooks configured.');
      let out = `${bold('🔗 Webhooks')} (${hooks.length})\n${'━'.repeat(40)}\n`;
      for (const h of hooks) {
        out += `\n${h.active ? '🟢' : '⚪'} ${mono('#' + h.id)} ${bold(h.name)}\n`;
        out += `  URL: ${mono(h.url.slice(0, 60))}\n`;
        out += `  Events: ${h.events.join(', ')}\n`;
      }
      out += `\n${italic('Events: message, command, join, leave, status, all')}`;
      return ctx.replyLong(out);
    }

    // ── .webhook test <url> ────────────────────────────────────
    if (sub === 'test') {
      const url = ctx.args[1];
      if (!url) return ctx.reply('Usage: .webhook test <url>');
      await ctx.reply('Testing webhook…');
      try {
        const result = await testWebhook(url);
        if (result.ok) {
          return ctx.replyOk(`Webhook test successful! HTTP ${result.status}`);
        }
        return ctx.replyError(`Webhook returned HTTP ${result.status}`);
      } catch (err) {
        return ctx.replyError(`Webhook test failed: ${err.message}`);
      }
    }

    // ── .webhook del <id> ──────────────────────────────────────
    if (sub === 'del' || sub === 'delete' || sub === 'remove') {
      const id = parseInt(ctx.args[1]);
      if (!id) return ctx.reply('Usage: .webhook del <id>');
      const removed = removeWebhook(ctx.chatId, id);
      if (removed) return ctx.replyOk(`Webhook #${id} removed.`);
      return ctx.replyError(`Webhook #${id} not found.`);
    }

    return ctx.reply(
      `${bold('🔗 Webhook System')}\n\n` +
      `Send events to external URLs — Zapier, Make.com, Discord, custom apps.\n\n` +
      `Usage:\n` +
      `  ${mono('.webhook add <url> <events> [name]')} — add webhook\n` +
      `  ${mono('.webhook list')} — view webhooks\n` +
      `  ${mono('.webhook test <url>')} — test a URL\n` +
      `  ${mono('.webhook del <id>')} — remove webhook\n\n` +
      `${bold('Events:')}\n` +
      `  message — any message received\n` +
      `  command — bot command executed\n` +
      `  join — user joined group\n` +
      `  leave — user left group\n` +
      `  status — bot status changed\n` +
      `  all — all events\n\n` +
      `${bold('Examples:')}\n` +
      `  ${mono('.webhook add https://hooks.zapier.com/xxx message,command')}\n` +
      `  ${mono('.webhook add https://discord.com/api/webhooks/xxx all Discord Logs')}\n\n` +
      `${italic('_Payload: { event, timestamp, data }_')}`
    );
  },
};
