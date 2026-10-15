import { extractedMentions, phoneToJid } from '../../utils/jid.js';
import { isValidPhoneNumber } from '../../security.js';
import { stmts } from '../../database.js';

export default {
  name: 'warnings',
  aliases: ['warns'],
  category: 'group',
  groupOnly: true,
  description: 'Inspect warnings for a member.',
  usage: '.warnings @user',
  async execute(ctx) {
    const targets = _resolveTargets(ctx);
    if (!targets.length && !ctx.body) return ctx.reply('Usage: .warnings @user');
    if (!targets.length) targets.push(ctx.sender);
    const lines = [];
    for (const t of targets) {
      const row = stmts.getWarnings.get(ctx.chatId, t);
      const count = row?.count || 0;
      const last = row?.last_reason || '(none)';
      lines.push(`@${t.split('@')[0]} — ${count} warning(s). Last: ${last}`);
    }
    await ctx.sock.sendMessage(ctx.chatId, { text: lines.join('\n'), mentions: targets });
  },
};

function _resolveTargets(ctx) {
  const out = new Set();
  for (const m of extractedMentions(ctx.msg)) out.add(m);
  for (const a of ctx.args) {
    if (isValidPhoneNumber(a)) out.add(phoneToJid(a));
  }
  return [...out];
}
