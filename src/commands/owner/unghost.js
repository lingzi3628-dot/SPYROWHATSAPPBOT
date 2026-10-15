import { unghostUser, getGhostedUsers } from '../../services/bot-mode.js';
import { extractedMentions, phoneToJid, norm } from '../../utils/jid.js';
import { isValidPhoneNumber } from '../../security.js';
import { bold, mono } from '../../utils/text.js';
import { audit } from '../../database.js';

export default {
  name: 'unghost',
  aliases: ['unghostuser', 'unsilence'],
  category: 'owner',
  ownerOnly: true,
  description: 'Remove a user from the ghost list — they can use the bot again.',
  usage: '.unghost @user | .unghost <phone> | .unghost all',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();

    // ── .unghost all ───────────────────────────────────────────
    if (sub === 'all') {
      const list = getGhostedUsers();
      for (const j of list) unghostUser(j);
      audit({ actor: ctx.sender, action: 'owner.unghost_all' });
      return ctx.replyOk(`Cleared ${list.length} ghosted users.`);
    }

    // ── Resolve target ─────────────────────────────────────────
    const targets = _resolveTargets(ctx);
    if (!targets.length) {
      return ctx.reply(
        `${bold('👻 Unghost a User')}\n\n` +
        `Usage: ${mono('.unghost @user')}\n` +
        `       ${mono('.unghost <phone>')}\n` +
        `       ${mono('.unghost all')} — clear the entire ghost list`
      );
    }

    let removed = 0;
    for (const t of targets) {
      if (unghostUser(t)) removed++;
      audit({ actor: ctx.sender, action: 'owner.unghost', target: t });
    }
    if (removed > 0) {
      return ctx.replyOk(`Unghosted ${removed} user(s). They can now use the bot again.`);
    }
    return ctx.reply('ℹ️ That user was not ghosted.');
  },
};

function _resolveTargets(ctx) {
  const out = new Set();
  for (const m of extractedMentions(ctx.msg)) out.add(m);
  for (const a of ctx.args) {
    if (isValidPhoneNumber(a)) out.add(phoneToJid(a));
    else if (/^\d+@s\.whatsapp\.net$/.test(a)) out.add(norm(a));
  }
  return [...out];
}
