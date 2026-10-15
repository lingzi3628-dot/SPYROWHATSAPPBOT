import { stmts } from '../../database.js';
import { bold, mono } from '../../utils/text.js';

function _getState(userId) {
  const row = stmts.getState.get(`anticall_${userId}`);
  return row?.value === 'true';
}
function _setState(userId, on) {
  stmts.setState.run(`anticall_${userId}`, on ? 'true' : 'false', on ? 'true' : 'false');
}
export function isAntiCallEnabled(userId) { return _getState(userId); }

export default {
  name: 'anticall',
  aliases: ['rejectcalls', 'blockcalls'],
  category: 'tools',
  description: 'Automatically reject WhatsApp calls to the bot.',
  usage: '.anticall on|off',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();
    if (sub === 'on') {
      _setState(ctx.chatId, true);
      return ctx.replyOk('📵 Anti-call ON. All incoming calls will be rejected automatically.');
    }
    if (sub === 'off') {
      _setState(ctx.chatId, false);
      return ctx.replyOk('📵 Anti-call OFF. Calls are allowed.');
    }
    return ctx.reply(`${bold('📵 Anti-call')}\n\nState: ${mono(_getState(ctx.chatId) ? 'ON' : 'OFF')}\n\nUsage:\n  ${mono('.anticall on')} — reject calls\n  ${mono('.anticall off')} — allow calls`);
  },
};
