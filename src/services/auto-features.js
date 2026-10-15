/**
 * services/auto-features.js
 * Auto-typing, auto-read, auto-status-view, auto-recording indicators.
 *
 * All toggles are stored in bot_state as global settings.
 * When ON, the handler calls these on every incoming message.
 */
import { stmts } from '../database.js';
import logger from '../logger.js';

function _get(key) {
  const row = stmts.getState.get(key);
  return row?.value === 'true';
}
function _set(key, val) {
  stmts.setState.run(key, val ? 'true' : 'false', val ? 'true' : 'false');
}

// ── Auto-typing ─────────────────────────────────────────────────
export function isAutoTyping() { return _get('autotyping'); }
export function setAutoTyping(on) { _set('autotyping', on); }

// ── Auto-read ───────────────────────────────────────────────────
export function isAutoRead() { return _get('autoread'); }
export function setAutoRead(on) { _set('autoread', on); }

// ── Auto status view ────────────────────────────────────────────
export function isAutoStatusView() { return _get('autostatusview'); }
export function setAutoStatusView(on) { _set('autostatusview', on); }

// ── Auto-recording (show "recording audio…" indicator) ─────────
export function isAutoRecording() { return _get('autorecording'); }
export function setAutoRecording(on) { _set('autorecording', on); }

// ── Always-online (show as online) ─────────────────────────────
export function isAlwaysOnline() { return _get('alwaysonline'); }
export function setAlwaysOnline(on) { _set('alwaysonline', on); }

/**
 * Apply all enabled auto-features to a chat after receiving a message.
 * Called from the message handler.
 */
export async function applyAutoFeatures(sock, chatJid) {
  try {
    if (isAlwaysOnline()) {
      await sock.sendPresenceUpdate('available', chatJid);
    }
    if (isAutoTyping()) {
      await sock.sendPresenceUpdate('composing', chatJid);
    } else if (isAutoRecording()) {
      await sock.sendPresenceUpdate('recording', chatJid);
    }
    if (isAutoRead()) {
      await sock.readMessages([{ remoteJid: chatJid, id: '...' }]);
    }
  } catch (err) {
    logger.debug({ err: err.message }, 'auto-features: apply failed (non-critical)');
  }
}

/**
 * Auto-view status updates (stories).
 * Called when a status message is received.
 */
export async function maybeAutoViewStatus(sock, msg) {
  if (!isAutoStatusView()) return;
  try {
    if (msg.key?.remoteJid === 'status@broadcast') {
      await sock.readMessages([msg.key]);
    }
  } catch (err) {
    logger.debug({ err: err.message }, 'auto-status-view failed');
  }
}

/**
 * Get a summary of all auto-features status.
 */
export function getAutoFeaturesStatus() {
  return {
    autotyping: isAutoTyping(),
    autoread: isAutoRead(),
    autostatusview: isAutoStatusView(),
    autorecording: isAutoRecording(),
    alwaysonline: isAlwaysOnline(),
    antidelete: _get('antidelete_global'),
  };
}
