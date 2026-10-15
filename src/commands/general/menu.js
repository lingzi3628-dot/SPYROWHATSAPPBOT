/**
 * commands/general/menu.js
 * SPYRO BOT — Clean, professional menu with branded image header.
 *
 * Architecture:
 *  - Uses the existing command registry (ctx.commands) for dynamic counts.
 *  - Sends a branded image (assets/spyro-menu.jpg) + caption with key info.
 *  - Sends the command directory as a separate text message.
 *  - Falls back to text-only if the image is missing.
 *  - Supports: .menu, .menu <category>, .menu <page>, .menu text
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../../config.js';
import { bold, mono, italic } from '../../utils/text.js';
import connection from '../../connection.js';
import { getCustomization, getHiddenCommands } from '../../services/customization.js';
import logger from '../../logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGE_PATH = resolve(__dirname, '../../../assets/spyro-menu.jpg');

function _uptime() {
  const s = Math.floor((Date.now() - config.STARTED_AT) / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const CAT = {
  general: { icon: '🤖', name: 'GENERAL',         desc: 'Core · Help · Status' },
  group:   { icon: '👥', name: 'GROUP',           desc: 'Members · Polls · Mods' },
  admin:   { icon: '🛡️', name: 'ADMIN & SECURITY', desc: 'Protection · Anti-link' },
  media:   { icon: '🎬', name: 'MEDIA',           desc: 'Stickers · Audio · VV' },
  tools:   { icon: '🧠', name: 'TOOLS',           desc: 'AI · QR · Weather' },
  fun:     { icon: '🎮', name: 'FUN',             desc: 'Games · Memes · Jokes' },
  owner:   { icon: '👑', name: 'OWNER',           desc: 'Owner-only controls' },
};
const ORDER = ['general', 'group', 'admin', 'media', 'tools', 'fun', 'owner'];

export default {
  name: 'menu',
  aliases: ['m', 'commands', 'list', 'help-menu'],
  category: 'general',
  description: 'Show the SPYRO BOT command directory.',
  usage: '.menu [category|page|text]',
  async execute(ctx) {
    const cust = getCustomization(ctx.chatId);
    const prefix = cust.bot_prefix || config.BOT_PREFIX;
    const hidden = getHiddenCommands(ctx.chatId);
    const all = [...ctx.commands.values()].filter(c => !hidden.has(c.name.toLowerCase()));
    const arg = (ctx.args[0] || '').toLowerCase();

    // .menu text → force text-only (no image)
    if (arg === 'text') return ctx.replyLong(_buildDirectory(all, ctx, prefix));

    // .menu <category> → category detail
    if (CAT[arg]) return ctx.replyLong(_categoryDetail(arg, all, prefix));

    // .menu <number> → paginated view
    const pn = parseInt(arg);
    if (!isNaN(pn) && pn > 0) return ctx.replyLong(_pageView(pn, all, prefix));

    // Default: send image + directory
    await _sendImageAndDirectory(ctx, all, prefix);
  },
};

// ── Send branded image + directory text ─────────────────────────
async function _sendImageAndDirectory(ctx, all, prefix) {
  const st = connection.status();
  const statusIcon = st.status === 'open' ? '🟢' : '🟡';
  const statusText = st.status === 'open' ? 'ONLINE' : st.status.toUpperCase();
  const ownerPhone = config.OWNER_JID ? '+' + config.OWNER_JID.split('@')[0] : 'N/A';

  const caption =
    `${bold('SPYRO BOT')} ${mono('v' + config.VERSION)}\n` +
    `${statusIcon} ${statusText} · ⏱ ${_uptime()} · ⚙ ${prefix}\n` +
    `${mono(all.length + ' commands')} · 👑 ${ownerPhone}\n\n` +
    `${italic('Type ' + prefix + 'menu <category> to browse commands')}`;

  // Try to send image
  let imageSent = false;
  if (existsSync(IMAGE_PATH)) {
    try {
      const imgBuf = readFileSync(IMAGE_PATH);
      await ctx.sock.sendMessage(ctx.chatId, {
        image: imgBuf,
        caption,
      }, { quoted: ctx.msg });
      imageSent = true;
    } catch (err) {
      logger.warn({ err: err.message }, 'menu image send failed — falling back to text');
    }
  } else {
    logger.warn({ path: IMAGE_PATH }, 'menu image not found — using text-only');
  }

  // If image failed, send caption as text
  if (!imageSent) {
    await ctx.reply(caption);
  }

  // Send the command directory as a separate message
  await ctx.replyLong(_buildDirectory(all, ctx, prefix));
}

// ── Build the compact command directory ─────────────────────────
function _buildDirectory(all, ctx, prefix) {
  const byCat = new Map();
  for (const c of all) {
    const arr = byCat.get(c.category) || [];
    arr.push(c);
    byCat.set(c.category, arr);
  }

  let out = `${bold('━━ 📂 COMMAND DIRECTORY ━━')}\n\n`;

  for (const cat of ORDER) {
    const items = byCat.get(cat) || [];
    if (!items.length) continue;
    if (cat === 'owner' && ctx.perms?.level !== 'owner') continue;
    const info = CAT[cat];
    out += `${info.icon} ${bold(info.name)} — ${mono(items.length + ' cmds')} ${italic(info.desc)}\n`;
    out += `${mono(prefix + 'menu ' + cat)}\n\n`;
  }

  out += `${bold('━━ ⚡ QUICK ACCESS ━━')}\n`;
  out += `${mono(prefix + 'ping')} · ${mono(prefix + 'alive')} · ${mono(prefix + 'help')} · ${mono(prefix + 'channel')}\n\n`;

  out += `${bold('━━ ✦ FEATURED ━━')}\n`;
  out += `🎨 ${mono(prefix + 'imagine <prompt>')} — AI images (free)\n`;
  out += `🧠 ${mono(prefix + 'ai <question>')} — AI chat (30/day)\n`;
  out += `🎛️ ${mono(prefix + 'customize status')} — personalize\n`;
  out += `📅 ${mono(prefix + 'schedule')} · ${mono(prefix + 'event')} · ${mono(prefix + 'autorule')}\n\n`;

  out += `${italic('SPYRO INTELLIGENCE • © SPYRO TECHNOLOGIES')}`;
  return out;
}

// ── Category detail (.menu media) ───────────────────────────────
function _categoryDetail(cat, all, prefix) {
  const items = all.filter(c => c.category === cat);
  if (!items.length) return `❌ No commands in ${cat}.`;
  const info = CAT[cat];

  let out = `${bold('━━ ' + info.icon + ' ' + info.name + ' ━━')}\n`;
  out += `${italic(info.desc)} · ${mono(items.length + ' commands')}\n\n`;

  for (const c of items) {
    out += `${bold(prefix + c.name)}`;
    if (c.aliases?.length) out += ` ${italic('(' + c.aliases.slice(0, 3).join(', ') + ')')}`;
    out += `\n`;
    if (c.description) out += `  ${italic(c.description.slice(0, 65))}\n`;
  }

  out += `\n${italic(prefix + 'menu for dashboard · ' + prefix + 'help <cmd> for details')}`;
  return out;
}

// ── Paginated view (.menu 2) ────────────────────────────────────
function _pageView(pageNum, all, prefix) {
  const perPage = 20;
  const start = (pageNum - 1) * perPage;
  const items = all.slice(start, start + perPage);
  if (!items.length) return `Page ${pageNum} is empty. Total: ${Math.ceil(all.length / perPage)} pages.`;

  const total = Math.ceil(all.length / perPage);
  let out = `${bold('━━ COMMANDS ── PG ' + pageNum + '/' + total + ' ━━')}\n\n`;
  for (const c of items) {
    const icon = CAT[c.category]?.icon || '📂';
    out += `${icon} ${bold(prefix + c.name)}`;
    if (c.aliases?.length) out += ` ${italic('(' + c.aliases.slice(0, 2).join(', ') + ')')}`;
    out += `\n`;
  }
  if (pageNum < total) out += `\n${italic(prefix + 'menu ' + (pageNum + 1) + ' → next')}`;
  else out += `\n${italic(prefix + 'menu → dashboard')}`;
  return out;
}
