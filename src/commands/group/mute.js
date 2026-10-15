import { extractedMentions, phoneToJid, norm } from '../../utils/jid.js';
import { isValidPhoneNumber } from '../../security.js';
import { audit, stmts } from '../../database.js';
import { bold, mono, italic } from '../../utils/text.js';
import logger from '../../logger.js';

// In-memory mute tracking: groupJid -> Map<userJid, unmuteAt>
const _mutes = new Map();

export default {
  name: 'mute',
  aliases: ['tempmute', 'silence'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,
  description: 'Temporarily mute a user (bot warns them if they speak during mute).',
  usage: '.mute @user <duration> | .mute @user 30m | .unmute @user',
  async execute(ctx) {
    const targets = _resolveTargets(ctx);
    if (!targets.length) {
      return ctx.reply(
        `${bold('🔇 Mute User')}\n\n` +
        `Usage:\n` +
        `  ${mono('.mute @user 30m')} — mute for 30 minutes\n` +
        `  ${mono('.mute @user 2h')} — mute for 2 hours\n` +
        `  ${mono('.unmute @user')} — unmute early\n\n` +
        `Durations: 5m, 30m, 1h, 2h, 6h, 12h, 24h`
      );
    }

    const dur = ctx.args.find(a => /^\d+[mhds]$/.test(a)) || '30m';
    const ms = _parseDuration(dur);
    if (!ms) return ctx.replyError('Invalid duration. Use: 5m, 30m, 1h, 2h, 6h, 24h');

    const unmuteAt = Date.now() + ms;
    if (!_mutes.has(ctx.chatId)) _mutes.set(ctx.chatId, new Map());

    for (const t of targets) {
      _mutes.get(ctx.chatId).set(t, unmuteAt);
      audit({ actor: ctx.sender, action: 'group.mute', target: t, groupJid: ctx.chatId, detail: dur });
      // Schedule auto-unmute
      setTimeout(() => {
        _unmute(ctx.chatId, t);
      }, ms).unref();
    }

    await ctx.replyOk(
      `${bold('🔇 User muted')}\n\n` +
      `${targets.map(t => '@' + t.split('@')[0]).join(', ')}\n` +
      `Duration: ${mono(dur)}\n` +
      `Unmutes: ${new Date(unmuteAt).toLocaleString()}\n\n` +
      `${italic('_The bot will warn them if they speak during the mute period._')}`
    );
  },
};

function _parseDuration(s) {
  const m = /^(\d+)([mhds])$/.exec(s);
  if (!m) return null;
  const n = parseInt(m[1]);
  const unit = m[2];
  const mult = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit];
  return n * mult;
}

function _unmute(groupJid, userJid) {
  const map = _mutes.get(groupJid);
  if (map) {
    map.delete(userJid);
    logger.info({ groupJid, userJid }, 'user auto-unmuted');
  }
}

function _resolveTargets(ctx) {
  const out = new Set();
  for (const m of extractedMentions(ctx.msg)) out.add(m);
  for (const a of ctx.args) {
    if (isValidPhoneNumber(a)) out.add(phoneToJid(a));
    else if (/^\d+@s\.whatsapp\.net$/.test(a)) out.add(norm(a));
  }
  out.delete(norm(ctx.botJid));
  return [...out];
}

// Export for use in handler (to check if a user is muted)
export function isMuted(groupJid, userJid) {
  const map = _mutes.get(groupJid);
  if (!map) return false;
  const unmuteAt = map.get(userJid);
  if (!unmuteAt) return false;
  if (Date.now() > unmuteAt) {
    map.delete(userJid);
    return false;
  }
  return true;
}
