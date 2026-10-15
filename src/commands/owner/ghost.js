import { ghostUser, unghostUser, getGhostedUsers, isGhosted } from '../../services/bot-mode.js';
import { extractedMentions, phoneToJid, norm } from '../../utils/jid.js';
import { isValidPhoneNumber } from '../../security.js';
import { bold, mono, italic } from '../../utils/text.js';
import { audit } from '../../database.js';

export default {
  name: 'ghost',
  aliases: ['ghostuser', 'silence'],
  category: 'owner',
  ownerOnly: true,
  description: 'Silently ignore a user — they can still message the bot but get no replies.',
  usage: '.ghost @user | .ghost <phone> | .ghost list',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();

    // ── .ghost list ────────────────────────────────────────────
    if (sub === 'list') {
      const list = getGhostedUsers();
      if (!list.length) return ctx.reply('👻 No ghosted users.');
      let out = `${bold('👻 Ghosted Users')} (${list.length})\n${'━'.repeat(30)}\n`;
      for (const j of list) {
        out += `• @${j.split('@')[0]}\n`;
      }
      return ctx.sock.sendMessage(ctx.chatId, { text: out, mentions: list });
    }

    // ── Resolve target ─────────────────────────────────────────
    const targets = _resolveTargets(ctx);
    if (!targets.length) {
      return ctx.reply(
        `${bold('👻 Ghost a User')}\n\n` +
        `Usage: ${mono('.ghost @user')}\n` +
        `       ${mono('.ghost <phone>')}\n` +
        `       ${mono('.ghost list')} — see all ghosted users\n\n` +
        `Ghosted users can still send messages, but the bot will silently ignore them. ` +
        `They won't know they've been ghosted.`
      );
    }

    // Don't ghost the owner
    const safe = targets.filter((t) => !ctx.perms || t !== norm(ctx.botJid));
    if (!safe.length) return ctx.replyError('Refusing to ghost the bot itself.');

    for (const t of safe) {
      ghostUser(t);
      audit({ actor: ctx.sender, action: 'owner.ghost', target: t });
    }
    return ctx.replyOk(
      `${bold('👻 User ghosted')}\n\n` +
      `${safe.map((t) => '@' + t.split('@')[0]).join(', ')}\n\n` +
      `${italic('They can still message the bot, but will get no replies. Use .unghost to undo.')}`
    );
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
