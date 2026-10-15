/**
 * src/web/server.js
 * Express web server — full multi-user platform.
 *
 * Routes:
 *  GET  /                    — landing page (SPA)
 *  GET  /login               — login page
 *  GET  /signup              — signup page
 *  GET  /dashboard           — user dashboard (auth required)
 *  GET  /admin               — admin panel (admin only)
 *
 *  POST /api/signup          — create account
 *  POST /api/login           — login
 *  GET  /api/logout          — logout
 *  GET  /api/me              — current user info
 *  POST /api/account/password — change password
 *
 *  GET  /api/session/status  — user's WhatsApp session status
 *  POST /api/session/start   — start WhatsApp session
 *  POST /api/session/stop    — stop session
 *  POST /api/session/reconnect — force reconnect
 *  GET  /api/session/qr      — QR code PNG
 *  POST /api/session/pair    — request phone pairing code
 *  POST /api/session/feature — toggle a feature
 *  GET  /api/session/events  — SSE stream for session events
 *
 *  GET  /api/admin/stats     — admin statistics
 *  GET  /api/admin/users     — list all users
 *  GET  /api/admin/sessions  — list active sessions
 *  POST /api/admin/users/:id/ban   — ban user
 *  POST /api/admin/users/:id/unban — unban user
 */
import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import QRCode from 'qrcode';
import config from '../config.js';
import logger from '../logger.js';
import { db, stmts } from '../database.js';
import {
  ensureAdminAccount,
  requireAuth,
  requireAdmin,
  signupUser,
  loginUser,
  changePassword,
} from './auth.js';
import * as sessionManager from '../services/session-manager.js';
import { getTraining, saveTraining } from '../services/ai-training.js';
import {
  isAutoTyping, setAutoTyping,
  isAutoRead, setAutoRead,
  isAutoStatusView, setAutoStatusView,
  isAutoRecording, setAutoRecording,
  isAlwaysOnline, setAlwaysOnline,
} from '../services/auto-features.js';
import {
  isAutoStatusReact, setAutoStatusReact,
} from '../services/bot-mode.js';
import { isAutoRepostEnabled, setAutoRepost } from '../services/anti-delete.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, 'public');

const app = express();
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'spyro-bot-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
}));

// Create admin account on startup
ensureAdminAccount();

// ── SPA routes (all serve the same index.html) ──────────────────
app.get('/', (req, res) => res.sendFile(join(PUBLIC_DIR, 'index.html')));
app.get('/login', (req, res) => res.sendFile(join(PUBLIC_DIR, 'index.html')));
app.get('/signup', (req, res) => res.sendFile(join(PUBLIC_DIR, 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(join(PUBLIC_DIR, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(join(PUBLIC_DIR, 'index.html')));
app.get('/train', (req, res) => res.sendFile(join(PUBLIC_DIR, 'index.html')));
app.use(express.static(PUBLIC_DIR));

// ── Auth API ────────────────────────────────────────────────────
app.post('/api/signup', async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    const user = signupUser(email, phone, password);
    req.session.userId = user.id;
    // Create a session record in DB
    stmts.upsertUserSession.run(user.id, phone || null, 'inactive', null);
    res.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = loginUser(email, password);
    req.session.userId = user.id;
    res.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

app.get('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/api/me', (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Not authenticated' });
  const user = stmts.getUserById.get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not found' });
  res.json({ id: user.id, email: user.email, phone: user.phone, role: user.role });
});

app.post('/api/account/password', requireAuth, async (req, res) => {
  try {
    changePassword(req.user.id, req.body.oldPassword, req.body.newPassword);
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// ── Session API (user's WhatsApp connection) ────────────────────
app.get('/api/session/status', requireAuth, async (req, res) => {
  let info = sessionManager.getSessionInfo(req.user.id);
  if (!info) {
    // Check DB for existing session
    const dbSession = stmts.getUserSession.get(req.user.id);
    if (dbSession) {
      info = { status: dbSession.status, qr: null, user: dbSession.bot_jid, pushName: null, hasQr: false };
    } else {
      info = { status: 'inactive', qr: null, user: null, pushName: null, hasQr: false };
    }
  }
  // Include feature toggles
  const features = {
    autotyping: isAutoTyping(),
    autoread: isAutoRead(),
    alwaysonline: isAlwaysOnline(),
    autostatusview: isAutoStatusView(),
    autostatusreact: isAutoStatusReact(),
    antidelete: isAutoRepostEnabled(req.user.id.toString()),
  };
  res.json({ ...info, botJid: info.user, features });
});

app.post('/api/session/start', requireAuth, async (req, res) => {
  try {
    await sessionManager.startSession(req.user.id);
    stmts.upsertUserSession.run(req.user.id, req.user.phone, 'connecting', null);
    res.json({ ok: true, message: 'Session starting…' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/session/stop', requireAuth, async (req, res) => {
  try {
    await sessionManager.stopSession(req.user.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/session/reconnect', requireAuth, async (req, res) => {
  try {
    sessionManager.forceReconnect(req.user.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/session/qr', requireAuth, async (req, res) => {
  const info = sessionManager.getSessionInfo(req.user.id);
  if (!info?.qr) return res.status(404).json({ error: 'No QR available' });
  try {
    const png = await QRCode.toBuffer(info.qr, { width: 512, margin: 2 });
    res.type('png').send(png);
  } catch { res.status(500).json({ error: 'QR render failed' }); }
});

app.post('/api/session/pair', requireAuth, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone required' });
    // Start session if not running
    if (!sessionManager.getSessionInfo(req.user.id)) {
      await sessionManager.startSession(req.user.id);
    }
    const code = await sessionManager.requestPairingCode(req.user.id, phone);
    res.json({ code });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/session/feature', requireAuth, async (req, res) => {
  try {
    const { feature, on } = req.body;
    const _set = {
      autotyping: setAutoTyping,
      autoread: setAutoRead,
      alwaysonline: setAlwaysOnline,
      autostatusview: setAutoStatusView,
      autostatusreact: setAutoStatusReact,
    };
    if (_set[feature]) {
      _set[feature](on);
    } else if (feature === 'antidelete') {
      setAutoRepost(req.user.id.toString(), on);
    } else {
      return res.status(400).json({ error: 'Unknown feature' });
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/session/events', requireAuth, (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  const info = sessionManager.getSessionInfo(req.user.id);
  res.write(`event: hello\ndata: ${JSON.stringify(info || {})}\n\n`);
  const unsubscribe = sessionManager.onSessionEvent(req.user.id, (evt) => {
    res.write(`event: ${evt.type}\ndata: ${JSON.stringify({ ...evt.data, ts: evt.ts })}\n\n`);
  });
  const hb = setInterval(() => res.write(`: hb ${Date.now()}\n\n`), 15_000);
  req.on('close', () => { clearInterval(hb); unsubscribe(); });
});

// ── AI Training API ─────────────────────────────────────────────
app.get('/api/training', requireAuth, (req, res) => {
  const training = getTraining(req.user.id);
  res.json(training);
});

app.post('/api/training', requireAuth, (req, res) => {
  try {
    const data = {
      character_name: req.body.character_name || '',
      personality: req.body.personality || '',
      emotions: req.body.emotions || '',
      speaking_style: req.body.speaking_style || '',
      example_pairs: req.body.example_pairs || [],
      auto_reply_offline: req.body.auto_reply_offline ? 1 : 0,
    };
    const saved = saveTraining(req.user.id, data);
    res.json({ ok: true, training: saved });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/training/test', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    const { generateTrainedReply } = await import('../services/ai-training.js');
    const reply = await generateTrainedReply(req.user.id, message, 'Test User');
    res.json({ reply: reply || '(no response — try training the AI first)' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Away Mode API ───────────────────────────────────────────────
app.get('/api/away', requireAuth, async (req, res) => {
  try {
    const { getAwayStatus } = await import('../services/away-mode.js');
    const status = getAwayStatus(req.user.id);
    res.json(status);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/away', requireAuth, async (req, res) => {
  try {
    const { setAwayMode, setAwayMessage, getAwayStatus } = await import('../services/away-mode.js');
    if (req.body.mode) {
      setAwayMode(req.user.id, req.body.mode);
    }
    if (req.body.message !== undefined) {
      setAwayMessage(req.user.id, req.body.message);
    }
    const status = getAwayStatus(req.user.id);
    res.json({ ok: true, status });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Admin API ───────────────────────────────────────────────────
app.get('/api/admin/stats', requireAuth, requireAdmin, (req, res) => {
  const users = stmts.countUsers.get().c;
  const activeSessions = sessionManager.getActiveSessionCount();
  res.json({ users, activeSessions });
});

app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  res.json(stmts.getAllUsers.all());
});

app.get('/api/admin/sessions', requireAuth, requireAdmin, (req, res) => {
  res.json(sessionManager.getAllActiveSessions());
});

app.post('/api/admin/users/:id/ban', requireAuth, requireAdmin, (req, res) => {
  stmts.banUser.run(req.params.id);
  // Stop their session if active
  sessionManager.stopSession(parseInt(req.params.id));
  res.json({ ok: true });
});

app.post('/api/admin/users/:id/unban', requireAuth, requireAdmin, (req, res) => {
  stmts.unbanUser.run(req.params.id);
  res.json({ ok: true });
});

// ── Health ──────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ ok: true, users: stmts.countUsers.get().c, sessions: sessionManager.getActiveSessionCount() });
});

// ── Start ───────────────────────────────────────────────────────
export function startWebServer() {
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';
  const server = app.listen(port, host, () => {
    logger.info({ host, port }, `🌐 Web UI: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
  });
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => { try { server.close(); } catch {} });
  }
  return server;
}

export default { startWebServer };
