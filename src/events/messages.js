/**
 * events/messages.js
 * Bind message-upsert and related message events to the central handler.
 * Also handles anti-delete (message recovery on delete) and auto-status-react.
 */
import logger from '../logger.js';
import { handleDelete, isAutoRepostEnabled } from '../services/anti-delete.js';
import {
  isAutoStatusReact,
  getStatusReactEmoji,
} from '../services/bot-mode.js';

export function bindMessageEvents(sock, handler) {
  // New incoming messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) {
      try {
        // ── Auto-status-react ────────────────────────────────────
        if (m.key?.remoteJid === 'status@broadcast' && isAutoStatusReact()) {
          try {
            const emoji = getStatusReactEmoji();
            await sock.sendMessage(m.key.remoteJid, {
              react: { text: emoji, key: m.key },
            });
            logger.debug({ emoji, statusId: m.key.id }, 'auto-reacted to status');
          } catch (err) {
            logger.debug({ err: err.message }, 'auto-status-react failed');
          }
          // Don't process status messages through the normal handler
          continue;
        }
        await handler.handleMessage(m);
      } catch (err) {
        logger.error({ err, key: m?.key }, 'message handler threw');
      }
    }
  });

  // Message updates (read receipts, deletes, etc.)
  sock.ev.on('messages.update', async (updates) => {
    for (const u of updates) {
      // Read receipts
      if (u.update?.status === 3) continue;

      // Check for delete/revoke
      if (u.key?.id && (u.update?.messageStubType === 68 || u.update?.delete)) {
        const chatJid = u.key.remoteJid;
        const msgId = u.key.id;
        logger.info({ chatJid, msgId }, 'message deleted — attempting recovery');
        const recovered = handleDelete(chatJid, msgId);
        if (recovered && isAutoRepostEnabled(chatJid)) {
          try {
            const senderTag = '@' + recovered.sender.split('@')[0];
            let text = `🗑️ *Anti-Delete Recovered*\n\n*Sender:* ${senderTag}\n*Type:* ${recovered.type}\n`;
            if (recovered.text) text += `\n*Content:*\n${recovered.text}`;
            await sock.sendMessage(chatJid, {
              text,
              mentions: [recovered.sender],
            });
          } catch (err) {
            logger.warn({ err }, 'anti-delete: failed to repost');
          }
        }
      }
    }
  });

  sock.ev.on('message-receipt.update', () => { /* no-op */ });
}
