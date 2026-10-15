import { extractedMentions, phoneToJid, norm } from '../../utils/jid.js';
import { isValidPhoneNumber } from '../../security.js';
import { stmts, getGroupSettings, audit } from '../../database.js';
import config from '../../config.js';

export default {
  name: 'warn',
  aliases: [],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  description: 'Issue a warning to a member.',
  usage: '.warn @user [reason]',
  async execute(ctx) {
    const targets = _resolveTargets(ctx);
    if (!targets.length) return ctx.reply('Usage: .warn @user [reason]');
    const reason = (ctx.body || '').trim().slice(0, 200);
    const settings = getGroupSettings(ctx.chatId);
    const limit = settings.warn_limit || config.DEFAULT_WARN_LIMIT;
    let lines = [];
    for (const t of targets) {
      stmts.bumpWarning.run(ctx.chatId, t, reason, reason);
      const row = stmts.getWarnings.get(ctx.chatId, t);
      const count = row?.count || 0;
      audit({ actor: ctx.sender, action: 'group.warn', target: t, groupJid: ctx.chatId, detail: `${count}/${limit}: ${reason}` });
      lines.push(`@${t.split('@')[0]} — warning ${count}/${limit}${reason ? ` (${reason})` : ''}`);
      if (limit > 0 && count >= limit) {
        try {
          await ctx.sock.groupParticipantsUpdate(ctx.chatId, [t], 'remove');
          lines.push(`↪ Auto-removed (reached ${limit} warnings).`);
          audit({ actor: ctx.sender, action: 'group.warn.auto_remove', target: t, groupJid: ctx.chatId });
        } catch (err) {
          lines.push(`↪ Reached limit but could not remove: ${err.message || err}`);
        }
      }
    }
    await ctx.sock.sendMessage(ctx.chatId, { text: `⚠️ ${lines.join('\n')}`, mentions: targets });
  },
};

function _resolveTargets(ctx) {
  const out = new Set();
  for (const m of extractedMentions(ctx.msg)) out.add(m);
  for (const a of ctx.args) {
    if (isValidPhoneNumber(a)) out.add(phoneToJid(a));
  }
  out.delete(norm(ctx.botJid));
  return [...out];
}
