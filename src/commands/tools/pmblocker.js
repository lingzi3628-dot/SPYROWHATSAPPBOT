import { stmts } from '../../database.js';
import { bold, mono, italic } from '../../utils/text.js';
import { sanitize } from '../../utils/text.js';

function _getState(userId) {
  const row = stmts.getState.get(`pmblocker_${userId}`);
  if (!row?.value) return { enabled: false, message: '⚠️ Direct messages are blocked. Please contact the owner in group chats only.' };
  try { return JSON.parse(row.value); } catch { return { enabled: false, message: '⚠️ DMs are blocked.' }; }
}
function _setState(userId, state) {
  stmts.setState.run(`pmblocker_${userId}`, JSON.stringify(state), JSON.stringify(state));
}
export function isPmBlockerEnabled(userId) { return _getState(userId).enabled; }
export function getPmBlockerMessage(userId) { return _getState(userId).message; }

export default {
  name: 'pmblocker',
  aliases: ['pm', 'dmblocker'],
  category: 'tools',
  description: 'Block all private (DM) messages to the bot.',
  usage: '.pmblocker on|off|message <text>',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();
    const state = _getState(ctx.chatId);
    
    if (sub === 'on') {
      state.enabled = true;
      _setState(ctx.chatId, state);
      return ctx.replyOk('🔒 PM Blocker ON. All private messages from non-owners will be blocked.');
    }
    if (sub === 'off') {
      state.enabled = false;
      _setState(ctx.chatId, state);
      return ctx.replyOk('🔓 PM Blocker OFF. Private messages are allowed.');
    }
    if (sub === 'message') {
      const msg = sanitize(ctx.body?.split(' ').slice(1).join(' ') || '').slice(0, 500);
      if (!msg) return ctx.reply(`Current message: ${state.message}`);
      state.message = msg;
      _setState(ctx.chatId, state);
      return ctx.replyOk(`PM Blocker message set:\n\n${italic(msg)}`);
    }
    return ctx.reply(
      `${bold('🔒 PM Blocker')}\n\nState: ${mono(state.enabled ? 'ON' : 'OFF')}\n\nUsage:\n  ${mono('.pmblocker on')} — block DMs\n  ${mono('.pmblocker off')} — allow DMs\n  ${mono('.pmblocker message <text>')} — custom block message`
    );
  },
};
