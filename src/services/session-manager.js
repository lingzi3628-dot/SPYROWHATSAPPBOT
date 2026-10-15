/**
 * services/session-manager.js
 * Manages multiple Baileys WhatsApp sessions — one per web user.
 *
 * Each user gets their own auth folder, socket instance, AND command handler
 * so messages are processed independently per user.
 */
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from '@whiskeysockets/baileys';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import logger from '../logger.js';
import config from '../config.js';
import { stmts } from '../database.js';
import { CommandHandler } from '../handler.js';
import { bindMessageEvents } from '../events/messages.js';
import { bindGroupEvents } from '../events/groups.js';
import { startScheduler } from '../scheduler.js';
import { startAdvancedScheduler } from './advanced-scheduler.js';
import { norm } from '../utils/jid.js';

const SESSIONS_BASE = resolve(config.SESSION_DIR, 'users');
if (!existsSync(SESSIONS_BASE)) mkdirSync(SESSIONS_BASE, { recursive: true });

// Active sockets: userId -> { sock, handler, qr, status, user, lastEvent }
const _sockets = new Map();
// Event listeners for each session (for SSE streaming to the web UI)
const _listeners = new Map(); // userId -> Set<fn>

function _emit(userId, type, data = {}) {
  const set = _listeners.get(userId);
  if (set) {
    const evt = { type, data, ts: Date.now() };
    for (const fn of set) {
      try { fn(evt); } catch {}
    }
  }
}

const _throttleMap = new Map();
function _throttleCheck(key, intervalMs) {
  const now = Date.now();
  const last = _throttleMap.get(key) || 0;
  if (now - last < intervalMs) return false;
  _throttleMap.set(key, now);
  // Clean old entries
  if (_throttleMap.size > 1000) {
    for (const [k, v] of _throttleMap) {
      if (now - v > intervalMs * 10) _throttleMap.delete(k);
    }
  }
  return true;
}

export function onSessionEvent(userId, fn) {
  if (!_listeners.has(userId)) _listeners.set(userId, new Set());
  _listeners.get(userId).add(fn);
  return () => _listeners.get(userId)?.delete(fn);
}

export function getSessionInfo(userId) {
  const s = _sockets.get(userId);
  if (!s) return null;
  return {
    status: s.status,
    qr: s.qr,
    user: s.user,
    pushName: s.pushName,
    hasQr: !!s.qr,
  };
}

export async function startSession(userId) {
  if (_sockets.has(userId)) {
    return _sockets.get(userId);
  }
  const authDir = resolve(SESSIONS_BASE, String(userId));
  if (!existsSync(authDir)) mkdirSync(authDir, { recursive: true });

  const sessionInfo = { sock: null, handler: null, qr: null, status: 'init', user: null, pushName: null };
  _sockets.set(userId, sessionInfo);

  try {
    await _createSocket(userId, authDir, sessionInfo);
  } catch (err) {
    logger.error({ err, userId }, 'failed to start session');
    sessionInfo.status = 'failed';
    _emit(userId, 'failed', { error: err.message });
  }
  return sessionInfo;
}

async function _createSocket(userId, authDir, sessionInfo) {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: {
      level: 'silent',
      info: () => {}, debug: () => {}, warn: () => {}, error: () => {},
      trace: () => {}, fatal: () => {},
      child: () => ({ level: 'silent', info: () => {}, debug: () => {}, warn: () => {}, error: () => {}, trace: () => {}, fatal: () => {}, child: () => ({}) }),
    },
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Desktop', '22.04.4'],
    connectTimeoutMs: 20_000,
    defaultQueryTimeoutMs: 30_000,
  });
  sessionInfo.sock = sock;

  sock.ev.on('connection.update', async (update) => {
    const { qr, connection, lastDisconnect } = update;

    if (qr) {
      sessionInfo.qr = qr;
      sessionInfo.status = 'qr_ready';
      _emit(userId, 'qr', { qr });
      _updateDb(userId, 'qr_ready', null);
    }

    if (connection === 'connecting') {
      sessionInfo.status = 'connecting';
      _emit(userId, 'connecting');
      _updateDb(userId, 'connecting', null);
    }

    if (connection === 'open') {
      sessionInfo.qr = null;
      sessionInfo.status = 'connected';
      sessionInfo.user = sock.user?.id;
      sessionInfo.pushName = sock.user?.name;
      _emit(userId, 'open', { user: sock.user?.id, pushName: sock.user?.name });
      _updateDb(userId, 'connected', sock.user?.id);

      // ── Wire up the command handler for this user's session ──
      try {
        // Create a per-user handler instance
        const userHandler = new CommandHandler();
        await userHandler.loadCommands(sock);
        sessionInfo.handler = userHandler;

        // Bind message events (commands, anti-delete, auto-status-react)
        bindMessageEvents(sock, userHandler);
        // Bind group events (welcome/goodbye)
        bindGroupEvents(sock);
        // Start the reminder scheduler
        startScheduler(sock);

        // Bind message events (commands, anti-delete, auto-status-react)
        bindMessageEvents(sock, userHandler);
        // Bind group events (welcome/goodbye cards)
        bindGroupEvents(sock);
        // Start the reminder scheduler
        startScheduler(sock);
        // Start the advanced scheduler (scheduled messages + event reminders)
        startAdvancedScheduler(sock);

        // ── Wire up auto-responder rules + mood tracking ──
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
          if (type !== 'notify') return;
          for (const m of messages) {
            try {
              if (!m?.message) continue;
              if (m.key?.fromMe) continue;
              if (m.key?.remoteJid === 'status@broadcast') continue;

              // Extract text
              let text = '';
              const msg = m.message;
              if (msg.conversation) text = msg.conversation;
              else if (msg.extendedTextMessage?.text) text = msg.extendedTextMessage.text;
              else if (msg.imageMessage?.caption) text = msg.imageMessage.caption;
              else if (msg.videoMessage?.caption) text = msg.videoMessage.caption;
              if (!text) continue;

              // ── Track mood ──
              const { recordActivity, detectSentiment } = await import('./mood-system.js');
              const sentiment = detectSentiment(text);
              recordActivity(userId, sentiment);

              // ── Track group DNA (only in groups) ──
              if (m.key.participant) {
                const { recordGroupMessage } = await import('./group-dna.js');
                recordGroupMessage(m.key.remoteJid, m.key.participant, text);
              }

              // ── Fire webhook: message ──
              const { triggerWebhooks } = await import('./webhooks.js');
              triggerWebhooks(userId, 'message', {
                chatJid: m.key.remoteJid,
                sender: m.key.participant || m.key.remoteJid,
                text: text.slice(0, 200),
                isGroup: !!m.key.participant,
              }).catch(() => {});

              // ── Check auto-responder rules (only for non-commands) ──
              if (text.startsWith(config.BOT_PREFIX)) {
                // Track owner activity (they're online!)
                const { recordOwnerActivity } = await import('./away-mode.js');
                recordOwnerActivity(userId);

                // Note: Bot access mode (private/public/custom) is checked
                // in handler.js AFTER prefix match — same as Knightbot.
                // This ensures the check always fires before command execution.

                continue; // let the command handler process it
              }

              // ── Auto-responder rules ──
              const rules = stmts.getAutoRules.all(m.key.remoteJid);
              if (rules.length) {
                const lowerText = text.toLowerCase();
                for (const rule of rules) {
                  if (lowerText.includes(rule.keyword.toLowerCase())) {
                    const throttleKey = `autorule_${rule.id}_${m.key.remoteJid}`;
                    if (!_throttleCheck(throttleKey, 30000)) continue;
                    await sock.sendMessage(m.key.remoteJid, { text: rule.response });
                    logger.info({ userId, keyword: rule.keyword }, 'auto-rule triggered');
                    break;
                  }
                }
              }

              // ── Away mode / AI auto-reply ──
              const { getAwayMode, shouldSendAwayMessage, buildAwayMessage } = await import('./away-mode.js');
              const { isAutoReplyOffline, generateTrainedReply } = await import('./ai-training.js');
              const awayMode = getAwayMode(userId);
              if (awayMode === 'off') continue;

              const senderJid = m.key?.participant || m.key?.remoteJid || '';
              const senderName = m.pushName || senderJid.split('@')[0] || 'there';
              const botJid = norm(sock.user?.id || '');
              const isGroupMsg = !!m.key.participant;

              // ── In groups: only reply if AI is enabled AND bot is mentioned/replied to ──
              if (isGroupMsg) {
                const { shouldGroupAiReply } = await import('./group-ai.js');
                if (!shouldGroupAiReply(m, botJid, m.key.remoteJid)) {
                  continue; // Don't reply to every group message — only when mentioned
                }
              }

              if (awayMode === 'ai' && isAutoReplyOffline(userId)) {
                const { checkAndMessage, recordAiUsage } = await import('./ai-limiter.js');
                const check = checkAndMessage(userId);
                if (!check.allowed) {
                  await sock.sendMessage(m.key.remoteJid, { text: check.message });
                } else {
                  const { shouldApplyUnfiltered, getSystemPrompt, canUseUnfiltered, recordUsage: recordUnfilterUsage } = await import('./unfilter-mode.js');
                  // Unfiltered mode is private-chat only — pass isGroup
                  const unfilter = shouldApplyUnfiltered(userId, isGroupMsg);
                  let systemPrompt = undefined;
                  if (unfilter.apply) {
                    const ufCheck = canUseUnfiltered(userId);
                    if (ufCheck.allowed) {
                      systemPrompt = getSystemPrompt(unfilter.mode);
                      recordUnfilterUsage(userId);
                    }
                  }
                  // ── Add mood to the system prompt ──
                  const { getMoodPrompt } = await import('./mood-system.js');
                  const moodPrompt = getMoodPrompt(userId);
                  if (systemPrompt) {
                    systemPrompt += '\n\n' + moodPrompt;
                  } else if (!systemPrompt) {
                    // If no unfilter prompt, create a base prompt with mood
                    systemPrompt = moodPrompt;
                  }

                  try { await sock.sendPresenceUpdate('composing', m.key.remoteJid); } catch {}
                  const reply = await generateTrainedReply(userId, text, senderName, systemPrompt);
                  if (reply) {
                    // In groups, mention the sender so they see the reply
                    if (isGroupMsg) {
                      await sock.sendMessage(m.key.remoteJid, {
                        text: `@${senderName} ${reply}`,
                        mentions: [senderJid],
                      });
                    } else {
                      await sock.sendMessage(m.key.remoteJid, { text: reply });
                    }
                    recordAiUsage(userId);
                  }
                }
              } else if (shouldSendAwayMessage(userId, senderJid)) {
                const awayMsg = buildAwayMessage(userId, senderName);
                await sock.sendMessage(m.key.remoteJid, { text: awayMsg });
              }
            } catch (err) {
              logger.debug({ err: err.message }, 'auto-rule/mood check failed');
            }
          }
        });

        logger.info({ userId, user: sock.user?.id }, 'user session READY — handler wired up');
      } catch (err) {
        logger.error({ err, userId }, 'failed to wire up handler for user session');
      }
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode ?? -1;
      const reason = DisconnectReason?.[code] ?? 'unknown';
      _emit(userId, 'close', { code, reason });
      if (code === DisconnectReason.loggedOut) {
        sessionInfo.status = 'logged_out';
        _updateDb(userId, 'logged_out', null);
        // Clean up the auth folder
        try { rmSync(authDir, { recursive: true, force: true }); } catch {}
      } else {
        sessionInfo.status = 'reconnecting';
        _updateDb(userId, 'reconnecting', null);
        // Auto-reconnect
        setTimeout(async () => {
          try {
            if (sock.ev) sock.ev.removeAllListeners();
            try { sock.end(); } catch {}
            await _createSocket(userId, authDir, sessionInfo);
          } catch (err) {
            logger.error({ err, userId }, 'reconnect failed');
          }
        }, Math.min(3000 + Math.random() * 2000, 10_000));
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

function _updateDb(userId, status, botJid) {
  try {
    stmts.updateUserSessionStatus.run(status, botJid, userId);
  } catch (err) {
    logger.warn({ err }, 'failed to update session status in DB');
  }
}

export async function stopSession(userId) {
  const s = _sockets.get(userId);
  if (!s) return;
  try {
    if (s.sock?.ev) s.sock.ev.removeAllListeners();
    try { s.sock?.end(); } catch {}
  } catch {}
  _sockets.delete(userId);
  _updateDb(userId, 'disconnected', null);
  _emit(userId, 'stopped');
}

export async function requestPairingCode(userId, phone) {
  const s = _sockets.get(userId);
  if (!s?.sock) throw new Error('Session not started. Start the session first.');
  // Wait for QR to be ready (means socket is connected to WA servers)
  for (let i = 0; i < 30; i++) {
    if (s.qr || s.status === 'connected') break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (s.status === 'connected') {
    throw new Error('Already connected. Disconnect first to pair a new device.');
  }
  if (!s.qr) {
    throw new Error('Connection not ready. Wait a few seconds and try again.');
  }
  const clean = String(phone).replace(/[^\d]/g, '');
  const code = await s.sock.requestPairingCode(clean);
  _emit(userId, 'pairing_code', { phone: clean, code });
  return code;
}

export function forceReconnect(userId) {
  const s = _sockets.get(userId);
  if (!s?.sock) return;
  try {
    if (s.sock.ev) s.sock.ev.removeAllListeners();
    try { s.sock.end(); } catch {}
  } catch {}
  _sockets.delete(userId);
  setTimeout(() => startSession(userId), 1000);
}

export function deleteSession(userId) {
  stopSession(userId);
  const authDir = resolve(SESSIONS_BASE, String(userId));
  try { rmSync(authDir, { recursive: true, force: true }); } catch {}
  _updateDb(userId, 'deleted', null);
}

export function getActiveSessionCount() {
  let count = 0;
  for (const s of _sockets.values()) {
    if (s.status === 'connected') count++;
  }
  return count;
}

export function getAllActiveSessions() {
  const result = [];
  for (const [userId, s] of _sockets) {
    result.push({ userId, status: s.status, user: s.user, pushName: s.pushName });
  }
  return result;
}
