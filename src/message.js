/**
 * message.js
 * Helpers for sending rich messages & building the command execution context.
 */
import { norm, isGroup, phoneNumber } from './utils/jid.js';
import { chunkText } from './utils/text.js';
import logger from './logger.js';
import { trackReply } from './services/reply-tracker.js';

/** Send a simple text message with quoted reply support. */
export async function reply(sock, msg, text, opts = {}) {
  try {
    const sent = await sock.sendMessage(
      msg.key.remoteJid,
      { text: String(text).slice(0, 65536) },
      { quoted: opts.quoted ? msg : undefined },
    );
    // Track the bot's outgoing message ID so we don't process our own replies
    if (sent?.key?.id) trackReply(sent.key.id);
    return sent;
  } catch (err) {
    logger.error({ err }, 'reply failed');
    return null;
  }
}

/** Send a long text message split into chunks. */
export async function replyLong(sock, msg, text) {
  const chunks = chunkText(text, 1800);
  let last = null;
  for (const c of chunks) {
    last = await sock.sendMessage(msg.key.remoteJid, { text: c });
    if (last?.key?.id) trackReply(last.key.id);
  }
  return last;
}

/** Send an error message. */
export async function replyError(sock, msg, text) {
  return reply(sock, msg, `⚠️ ${text}`);
}

/** Send a success message. */
export async function replyOk(sock, msg, text) {
  return reply(sock, msg, `✅ ${text}`);
}

/**
 * Build the standardized context object that every command receives.
 * @param {object} args
 * @param {import('@whiskeysockets/baileys').WASocket} args.sock
 * @param {import('@whiskeysockets/baileys').WAMessage} args.msg
 * @param {object} args.perms  result of resolvePermission
 * @param {string[]} args.args parsed args
 * @param {string} args.body   text after the command name
 * @param {string} args.commandName
 * @param {Map} args.commands  registry of loaded commands
 * @param {import('@whiskeysockets/baileys').GroupMetadata} [args.groupMeta]
 */
export function buildContext({ sock, msg, perms, args, body, commandName, commands, groupMeta }) {
  const chatId = msg.key.remoteJid;
  const sender = msg.key.participant || msg.key.remoteJid;
  const isGroupChat = isGroup(chatId);
  const quotedInfo = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;

  return {
    sock,
    msg,
    chatId,
    sender: norm(sender),
    isGroup: isGroupChat,
    groupMeta,
    perms,
    args,
    body,
    commandName,
    commands,
    quoted: quotedInfo,
    reply: (text, opts = {}) => reply(sock, msg, text, opts),
    replyLong: (text) => replyLong(sock, msg, text),
    replyError: (text) => replyError(sock, msg, text),
    replyOk: (text) => replyOk(sock, msg, text),
    senderPhone: phoneNumber(sender),
    botJid: norm(sock.user?.id),
    timestamp: msg.messageTimestamp || Math.floor(Date.now() / 1000),
  };
}
