/**
 * events/connection.js
 * Forward connection events to the connection manager (already bound there).
 * This module exists as a structural placeholder for app-level connection hooks.
 */
import logger from '../logger.js';

export function bindConnectionEvents(sock, { onOpen, onClose } = {}) {
  sock.ev.on('connection.update', (u) => {
    if (u.connection === 'open' && typeof onOpen === 'function') onOpen(sock);
    if (u.connection === 'close' && typeof onClose === 'function') onClose(u);
  });
}
