/**
 * handler.js
 * Central message handler & command engine.
 *
 * Responsibilities:
 *  - Load commands from src/commands/<category>/*.js
 *  - Parse incoming messages
 *  - Resolve permissions & cooldowns
 *  - Dispatch to commands
 *  - Run group-protection modules (antilink, antispam, etc.)
 *  - Track command stats
 *  - Centralized error handling
 */
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import logger from './logger.js';
import config from './config.js';
import { db, stmts, checkCooldown, clearExpiredCooldowns, audit, getGroupSettings } from './database.js';
import { resolvePermission, authorize } from './permissions.js';
import { buildContext } from './message.js';
import { parseArgs, sanitize } from './utils/text.js';
import { norm, isGroup, isBroadcast, isNewsletter, extractedMentions } from './utils/jid.js';
import {
  containsInviteLink,
  containsUrl,
  containsBadWord,
  isOwner,
  capMentions,
} from './security.js';
import { getGroupAdmins, getGroupMetadata } from './utils/groups.js';
import { isOwnReply } from './services/reply-tracker.js';
import { cacheMessage } from './services/anti-delete.js';
import { applyAutoFeatures } from './services/auto-features.js';
import { isAiAutoReplyOn, generateAiReply } from './services/ai-autoreply.js';
import { isGhosted } from './services/bot-mode.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMMANDS_DIR = join(__dirname, 'commands');

class CommandHandler {
  constructor() {
    /** @type {Map<string, object>} */
    this.commands = new Map();
    /** @type {Map<string, string>} alias -> command name */
    this.aliases = new Map();
    /** @type {Map<string, Set<string>>} groupJid -> Set of recent sender jids (for antiflood) */
    this.floodTracker = new Map();
    this._loadedAt = 0;
    this._sock = null;
  }

  /** Load every .js file under src/commands/{category}/. */
  async loadCommands(sock) {
    this._sock = sock;
    this.commands.clear();
    this.aliases.clear();

    const categories = readdirSync(COMMANDS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const cat of categories) {
      const catDir = join(COMMANDS_DIR, cat);
      const files = readdirSync(catDir).filter((f) => f.endsWith('.js'));
      for (const f of files) {
        const url = `file://${join(catDir, f).replace(/\\/g, '/')}`;
        try {
          const mod = await import(url);
          const cmd = mod.default || mod;
          if (!cmd?.name || typeof cmd.execute !== 'function') {
            logger.warn({ file: f }, 'skipping command file — missing name/execute');
            continue;
          }
          cmd.category = cmd.category || cat;
          this.commands.set(cmd.name.toLowerCase(), cmd);
          if (Array.isArray(cmd.aliases)) {
            for (const a of cmd.aliases) this.aliases.set(a.toLowerCase(), cmd.name.toLowerCase());
          }
        } catch (err) {
          logger.error({ err, file: f }, 'failed to load command');
        }
      }
    }
    this._loadedAt = Date.now();
    logger.info({ count: this.commands.size, categories }, 'commands loaded');
  }

  /** Reload commands at runtime (hot reload). */
  async reload() {
    if (!this._sock) return;
    await this.loadCommands(this._sock);
  }

  /** Resolve a command by name or alias. */
  get(name) {
    const lower = String(name).toLowerCase();
    return this.commands.get(lower) || this.commands.get(this.aliases.get(lower) || '') || null;
  }

  /** True if a string starts with one of the configured prefixes. */
  _matchPrefix(text) {
    const p = config.BOT_PREFIX;
    if (!p) return { hit: false };
    if (text.startsWith(p)) return { hit: true, body: text.slice(p.length) };
    return { hit: false };
  }

  /** Main entry — called for every incoming message. */
  async handleMessage(msg) {
    if (!msg?.message || !msg.key) return;
    const chatId = msg.key.remoteJid;
    if (!chatId || isBroadcast(chatId) || isNewsletter(chatId)) return;

    const sender = norm(msg.key.participant || msg.key.remoteJid);
    const botJid = norm(this._sock?.user?.id || '');

    // Skip messages that the BOT itself sent as automated replies
    // (prevents infinite loop: bot replies → bot processes its own reply → bot replies...)
    if (msg.key.id && isOwnReply(msg.key.id)) {
      return;
    }

    // Cache the message for anti-delete recovery
    cacheMessage(msg);

    // Apply auto-features (typing, read, online indicators)
    try { await applyAutoFeatures(this._sock, chatId); } catch {}

    // ── Ghost check: silently drop messages from ghosted users ──
    if (isGhosted(sender)) {
      logger.debug({ sender }, 'ghosted user — silently dropping message');
      return; // no reply, no error — user doesn't know they're ignored
    }

    // Note: Per-user bot access mode (private/public/custom) is checked
    // in session-manager.js BEFORE the command handler is invoked.
    // The old global isPrivateMode() check is removed — it conflicted
    // with the per-user system and used config.OWNER_JID which is the
    // platform admin, not each user's bot owner.

    // Debug log — helps diagnose "commands not working" issues.
    logger.debug({
      fromMe: msg.key.fromMe,
      chatId,
      sender,
      botJid,
      sameUser: sender === botJid,
      messageType: Object.keys(msg.message)[0],
      text: this._extractText(msg)?.slice(0, 50),
    }, 'incoming message');

    // ----- 1. Run group protection BEFORE command parsing -------------------
    if (isGroup(chatId)) {
      const stop = await this._runGroupProtections({ msg, chatId, sender });
      if (stop) return; // message deleted / handled
    }

    // ----- 2. Extract text body -------------------------------------------
    const body = this._extractText(msg);
    if (!body) return;

    // ----- 3. Prefix match ------------------------------------------------
    const { hit, body: stripped } = this._matchPrefix(body);
    if (!hit) {
      // Not a command — check if AI auto-reply is enabled for this chat
      if (isAiAutoReplyOn(chatId)) {
        try {
          await this._handleAiAutoReply({ msg, chatId, sender, text: body });
        } catch (err) {
          logger.warn({ err: err.message }, 'AI auto-reply failed');
        }
      }
      return;
    }

    // ----- 3a. Bot access mode check (Knightbot-style) ──────────────────
    // If the message is NOT from the owner (fromMe === false),
    // check if the sender is allowed to use commands.
    // This is the SINGLE access check — no other check needed.
    if (!msg.key.fromMe) {
      const { getUserBotMode, checkUserBotAccess, getWhitelist } = await import('./services/bot-mode.js');
      const mode = getUserBotMode(chatId);
      if (mode !== 'public') {
        const access = checkUserBotAccess(chatId, sender, botJid);
        if (!access.allowed) {
          // Silently ignore (like Knightbot) — don't spam denial messages
          logger.debug({ chatId, sender, mode }, 'access denied — silently ignoring');
          return;
        }
      }
    }

    const trimmed = stripped.trim();
    if (!trimmed) return;
    const [nameRaw, ...rest] = parseArgs(trimmed);
    if (!nameRaw) return;
    const cmd = this.get(nameRaw);
    if (!cmd) {
      // silently ignore unknown commands (less spam)
      return;
    }

    // ----- 4. Resolve permissions & authorize -----------------------------
    let perms;
    try {
      perms = await resolvePermission({ sock: this._sock, msg });
    } catch (err) {
      logger.error({ err }, 'permission resolve failed');
      return;
    }

    const groupMeta = perms.isGroup ? await getGroupMetadata(this._sock, chatId) : null;
    const ctx = buildContext({
      sock: this._sock,
      msg,
      perms,
      args: rest,
      body: trimmed.slice(nameRaw.length).trim(),
      commandName: cmd.name,
      commands: this.commands,
      groupMeta,
    });

    const auth = await authorize({ cmd, ctx });
    if (!auth.allowed) {
      await ctx.reply(auth.reason);
      return;
    }

    // ----- 5. Cooldown (skip for owner) -----------------------------------
    if (perms.level !== 'owner' && !cmd.skipCooldown) {
      const cd = checkCooldown(`cmd:${sender}:${cmd.name}`, cmd.cooldown ?? config.COMMAND_COOLDOWN_SEC);
      if (cd.onCooldown) {
        const secs = Math.ceil(cd.remainingMs / 1000);
        await ctx.reply(`⏳ Cooldown — try again in ${secs}s.`);
        return;
      }
    }

    // ----- 6. Execute ------------------------------------------------------
    try {
      await cmd.execute(ctx);
      stmts.logCommand.run(cmd.name, sender, perms.isGroup ? chatId : null);
      clearExpiredCooldowns();
    } catch (err) {
      logger.error({ err, command: cmd.name }, 'command execution failed');
      await ctx.reply('⚠️ Something went wrong while running that command. The error has been logged.');
    }
  }

  /** Extract text from any of the supported message types. */
  _extractText(msg) {
    const m = msg.message;
    if (!m) return '';
    if (m.conversation) return m.conversation;
    if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
    if (m.imageMessage?.caption) return m.imageMessage.caption;
    if (m.videoMessage?.caption) return m.videoMessage.caption;
    return '';
  }

  /** Handle AI auto-reply when the message is not a command. */
  async _handleAiAutoReply({ msg, chatId, sender, text }) {
    if (!text || text.length > 1000) return; // skip empty or very long
    // Don't reply to the bot's own messages
    const botJid = norm(this._sock?.user?.id || '');
    if (sender === botJid) return;
    // Get sender display name
    const name = msg.pushName || sender.split('@')[0] || 'friend';
    // Show typing indicator
    try { await this._sock.sendPresenceUpdate('composing', chatId); } catch {}
    // Generate reply
    const reply = await generateAiReply(chatId, text, name);
    if (reply) {
      await this._sock.sendMessage(chatId, { text: reply });
    }
  }

  /** Run antilink / antispam / antibadword / antiflood / antimention / antitag. */
  async _runGroupProtections({ msg, chatId, sender }) {
    const settings = getGroupSettings(chatId);
    const text = this._extractText(msg);
    const senderIsOwner = isOwner(sender);
    const botJid = norm(this._sock.user?.id);

    // bot is exempt from all protections
    if (sender === botJid) return false;

    let admins = [];
    let senderIsAdmin = false;
    if (settings.antilink || settings.antibadword || settings.antispam || settings.antiflood || settings.antitag || settings.antimention) {
      admins = await getGroupAdmins(this._sock, chatId);
      senderIsAdmin = admins.includes(sender);
    }

    const exempt = senderIsOwner || senderIsAdmin;

    // antilink
    if (settings.antilink && !exempt && text) {
      if (containsInviteLink(text) || containsUrl(text)) {
        return await this._enforceProtection({ msg, chatId, sender, action: 'antilink', settings });
      }
    }

    // antibadword
    if (settings.antibadword && !exempt && text) {
      if (containsBadWord(text)) {
        return await this._enforceProtection({ msg, chatId, sender, action: 'antibadword', settings });
      }
    }

    // antimention
    if (settings.antimention && !exempt) {
      const mentions = extractedMentions(msg);
      if (mentions.length > 5) {
        return await this._enforceProtection({ msg, chatId, sender, action: 'antimention', settings });
      }
    }

    // antitag (mentioning the bot specifically)
    if (settings.antitag && !exempt) {
      const mentions = extractedMentions(msg);
      if (mentions.includes(botJid) && mentions.length === 1) {
        return await this._enforceProtection({ msg, chatId, sender, action: 'antitag', settings });
      }
    }

    // antiflood — track message rate per user
    if (settings.antiflood && !exempt) {
      const key = `${chatId}:${sender}`;
      const now = Date.now();
      const arr = this.floodTracker.get(key) || [];
      const recent = arr.filter((t) => now - t < 5000);
      recent.push(now);
      this.floodTracker.set(key, recent);
      if (recent.length > 8) {
        this.floodTracker.delete(key);
        return await this._enforceProtection({ msg, chatId, sender, action: 'antiflood', settings });
      }
    }

    return false;
  }

  /**
   * Apply the configured moderation action.
   *  - Delete message if bot is admin
   *  - Always warn (and optionally escalate)
   *  - Never lie about deletions
   */
  async _enforceProtection({ msg, chatId, sender, action, settings }) {
    const botJid = norm(this._sock.user?.id);
    const admins = await getGroupAdmins(this._sock, chatId);
    const botIsAdmin = admins.includes(botJid);

    let deleted = false;
    if (botIsAdmin) {
      try {
        await this._sock.sendMessage(chatId, { delete: msg.key });
        deleted = true;
      } catch (err) {
        logger.warn({ err, action }, 'failed to delete violating message');
      }
    }

    // bump warnings
    db.prepare(`
      INSERT INTO warnings (group_jid, user_jid, count, last_reason, updated_at)
      VALUES (?, ?, 1, ?, strftime('%s','now'))
      ON CONFLICT(group_jid, user_jid) DO UPDATE
        SET count = count + 1, last_reason = ?, updated_at = strftime('%s','now')
    `).run(chatId, sender, action, action);

    const warns = stmts.getWarnings.get(chatId, sender)?.count || 0;
    const limit = settings.warn_limit || config.DEFAULT_WARN_LIMIT;

    audit({
      actor: botJid,
      action: `protection.${action}`,
      target: sender,
      groupJid: chatId,
      detail: `deleted=${deleted}, warns=${warns}/${limit}`,
    });

    const note = deleted
      ? `⚠️ @${sender.split('@')[0]} — message removed (${action}). Warning ${warns}/${limit}.`
      : `⚠️ @${sender.split('@')[0]} — flagged (${action}) but bot is not admin, could not delete. Warning ${warns}/${limit}.`;

    try {
      await this._sock.sendMessage(chatId, { text: note, mentions: capMentions([sender]) });
    } catch (err) {
      logger.warn({ err }, 'failed to send protection notice');
    }

    // optional escalation
    if (limit > 0 && warns >= limit && botIsAdmin) {
      try {
        await this._sock.groupParticipantsUpdate(chatId, [sender], 'remove');
        audit({ actor: botJid, action: 'protection.escalate_remove', target: sender, groupJid: chatId });
      } catch (err) {
        logger.warn({ err }, 'escalation remove failed');
      }
    }
    return true;
  }
}

const handler = new CommandHandler();
export default handler;
export { CommandHandler };
