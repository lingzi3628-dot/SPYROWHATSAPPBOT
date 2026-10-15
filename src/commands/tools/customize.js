import {
  getCustomization,
  saveCustomization,
  THEMES,
  getMemories,
  rememberFact,
  deleteMemory,
  clearMemories,
} from '../../services/customization.js';
import { bold, mono, italic } from '../../utils/text.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'customize',
  aliases: ['custom', 'config', 'settings'],
  category: 'tools',
  description: 'Customize your bot — name, prefix, theme, response style, and more.',
  usage: '.customize <setting> <value>\n  .customize name Mesh AI\n  .customize prefix !\n  .customize theme fire\n  .customize length short|medium|long\n  .customize emoji none|light|heavy|chaotic\n  .customize language en|sw|fr\n  .customize blacklist word1,word2\n  .customize greeting Welcome!\n  .customize hide ping,menu\n  .customize status',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();

    // ── .customize status ──────────────────────────────────────
    if (sub === 'status' || !sub) {
      const c = getCustomization(ctx.chatId);
      const themes = Object.keys(THEMES).join(', ');
      return ctx.reply(
        `${bold('🎨 Bot Customization')}\n${'━'.repeat(35)}\n\n` +
        `${bold('Bot name:')}      ${c.bot_name || '(default: Spyro Bot)'}\n` +
        `${bold('Prefix:')}        ${mono(c.bot_prefix || '.')} (default)\n` +
        `${bold('Theme:')}         ${c.theme} (${THEMES[c.theme]?.name || 'Dark'})\n` +
        `${bold('Response length:')} ${c.response_length}\n` +
        `${bold('Emoji usage:')}   ${c.emoji_usage}\n` +
        `${bold('Language:')}      ${c.language}\n` +
        `${bold('Blacklist:')}     ${c.blacklist_words || '(none)'}\n` +
        `${bold('Greeting:')}      ${c.custom_greeting || '(default)'}\n` +
        `${bold('Hidden cmds:')}   ${c.hide_commands || '(none)'}\n\n` +
        `${bold('Available themes:')} ${mono(themes)}\n\n` +
        `${bold('Commands:')}\n` +
        `  ${mono('.customize name <name>')}\n` +
        `  ${mono('.customize prefix <char>')}\n` +
        `  ${mono('.customize theme <name>')}\n` +
        `  ${mono('.customize length short|medium|long')}\n` +
        `  ${mono('.customize emoji none|light|heavy|chaotic')}\n` +
        `  ${mono('.customize language en|sw|fr|es')}\n` +
        `  ${mono('.customize blacklist word1,word2')}\n` +
        `  ${mono('.customize greeting <text>')}\n` +
        `  ${mono('.customize hide cmd1,cmd2')}\n` +
        `  ${mono('.customize reset')}`
      );
    }

    // ── .customize reset ───────────────────────────────────────
    if (sub === 'reset') {
      saveCustomization(ctx.chatId, {
        bot_name: '', bot_prefix: '', theme: 'dark',
        response_length: 'medium', emoji_usage: 'light',
        language: 'en', blacklist_words: '', custom_greeting: '', hide_commands: '',
      });
      return ctx.replyOk('Customization reset to defaults.');
    }

    // ── .customize name <name> ─────────────────────────────────
    if (sub === 'name') {
      const name = sanitize(ctx.body?.split(' ').slice(1).join(' ') || '').slice(0, 50);
      if (!name) return ctx.reply('Usage: .customize name Mesh AI');
      saveCustomization(ctx.chatId, { bot_name: name });
      return ctx.replyOk(`Bot name set to: ${bold(name)}`);
    }

    // ── .customize prefix <char> ───────────────────────────────
    if (sub === 'prefix') {
      const prefix = (ctx.args[1] || '').slice(0, 4);
      if (!prefix) return ctx.reply('Usage: .customize prefix !\n\nChoose: . ! / # $ & + -');
      saveCustomization(ctx.chatId, { bot_prefix: prefix });
      return ctx.replyOk(`Prefix set to: ${mono(prefix)}\n\nTry: ${mono(prefix + 'ping')}`);
    }

    // ── .customize theme <name> ────────────────────────────────
    if (sub === 'theme') {
      const theme = (ctx.args[1] || '').toLowerCase();
      if (!THEMES[theme]) {
        return ctx.reply(`❌ Unknown theme. Available: ${mono(Object.keys(THEMES).join(', '))}`);
      }
      saveCustomization(ctx.chatId, { theme });
      return ctx.replyOk(`Theme set to: ${bold(THEMES[theme].name)} ${THEMES[theme].accent}`);
    }

    // ── .customize length <short|medium|long> ──────────────────
    if (sub === 'length') {
      const len = (ctx.args[1] || '').toLowerCase();
      if (!['short', 'medium', 'long'].includes(len)) {
        return ctx.reply('Usage: .customize length short|medium|long\n\n• short = 1 line\n• medium = 2-3 lines\n• long = full paragraph');
      }
      saveCustomization(ctx.chatId, { response_length: len });
      return ctx.replyOk(`Response length: ${mono(len)}`);
    }

    // ── .customize emoji <none|light|heavy|chaotic> ────────────
    if (sub === 'emoji') {
      const e = (ctx.args[1] || '').toLowerCase();
      if (!['none', 'light', 'heavy', 'chaotic'].includes(e)) {
        return ctx.reply('Usage: .customize emoji none|light|heavy|chaotic');
      }
      saveCustomization(ctx.chatId, { emoji_usage: e });
      return ctx.replyOk(`Emoji usage: ${mono(e)}`);
    }

    // ── .customize language <code> ─────────────────────────────
    if (sub === 'language') {
      const lang = (ctx.args[1] || '').toLowerCase();
      const supported = ['en', 'sw', 'fr', 'es', 'de', 'ar', 'pt', 'it', 'hi', 'zh', 'ja'];
      if (!supported.includes(lang)) {
        return ctx.reply(`Supported: ${mono(supported.join(', '))}`);
      }
      saveCustomization(ctx.chatId, { language: lang });
      return ctx.replyOk(`Language: ${mono(lang)}`);
    }

    // ── .customize blacklist <words> ───────────────────────────
    if (sub === 'blacklist') {
      const words = sanitize(ctx.body?.split(' ').slice(1).join(' ') || '').slice(0, 500);
      if (!words) {
        const c = getCustomization(ctx.chatId);
        return ctx.reply(`Current blacklist: ${c.blacklist_words || '(none)'}\n\nUsage: .customize blacklist badword1,badword2`);
      }
      saveCustomization(ctx.chatId, { blacklist_words: words });
      return ctx.replyOk(`Blacklist words set. Bot will filter: ${mono(words)}`);
    }

    // ── .customize greeting <text> ─────────────────────────────
    if (sub === 'greeting') {
      const greeting = sanitize(ctx.body?.split(' ').slice(1).join(' ') || '').slice(0, 500);
      if (!greeting) {
        const c = getCustomization(ctx.chatId);
        return ctx.reply(`Current greeting: ${c.custom_greeting || '(default)'}\n\nUsage: .customize greeting Hey there! Welcome to my bot!`);
      }
      saveCustomization(ctx.chatId, { custom_greeting: greeting });
      return ctx.replyOk(`Custom greeting set:\n\n${italic(greeting)}`);
    }

    // ── .customize hide <commands> ─────────────────────────────
    if (sub === 'hide') {
      const cmds = sanitize(ctx.body?.split(' ').slice(1).join(' ') || '').slice(0, 500);
      if (!cmds) {
        const c = getCustomization(ctx.chatId);
        return ctx.reply(`Hidden commands: ${c.hide_commands || '(none)'}\n\nUsage: .customize hide ping,menu,help`);
      }
      saveCustomization(ctx.chatId, { hide_commands: cmds });
      return ctx.replyOk(`Hidden commands: ${mono(cmds)}\n\nUse ${mono('.customize reset')} to unhide.`);
    }

    return ctx.reply(`Unknown setting. Type ${mono('.customize status')} for help.`);
  },
};
