/**
 * services/reply-tracker.js
 * Tracks message IDs the bot itself sent, so the handler can skip
 * processing its own replies (prevents infinite reply loops).
 *
 * Kept as a separate module to avoid circular imports between
 * handler.js and message.js.
 */
const _replyIds = new Set();

export function trackReply(id) {
  if (id) _replyIds.add(id);
}

export function isOwnReply(id) {
  return id ? _replyIds.has(id) : false;
}

// Clean up every 5 minutes (IDs are short-lived, WhatsApp doesn't reuse them)
setInterval(() => {
  _replyIds.clear();
}, 5 * 60 * 1000).unref();
