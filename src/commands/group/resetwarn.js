import { extractedMentions, phoneToJid } from '../../utils/jid.js';
import { isValidPhoneNumber } from '../../security.js';
import { stmts, audit } from '../../database.js';

export default {
  name: 'resetwarn',
  aliases: ['unwarn'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  description: 'Clear warnings for a member.',
  usage: '.resetwarn @user',
  async execute(ctx) {
    const targets = _resolveTargets(ctx);
    if (!targets.length) return ctx.reply('Usage: .resetwarn @user');
    for (const t of targets) {
      stmts.clearWarnings.run(ctx.chatId, t);
      audit({ actor: ctx.sender, action: 'group.reset_warn', target: t, groupJid: ctx.chatId });
    }
    await ctx.replyOk(`Warnings cleared for: ${targets.map((t) => '@' + t.split('@')[0]).join(', ')}`);
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
