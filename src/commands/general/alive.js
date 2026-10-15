import config from '../../config.js';
import { bold, mono, italic } from '../../utils/text.js';
import connection from '../../connection.js';

function uptime() {
  const ms = Date.now() - config.STARTED_AT;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d ${h}h ${m}m ${sec}s`;
}

export default {
  name: 'alive',
  aliases: ['a', 'status', 'online'],
  category: 'general',
  description: 'Show bot status, uptime, and connection health.',
  usage: '.alive',
  async execute(ctx) {
    const st = connection.status();
    const statusIcon = st.status === 'open' ? '🟢' : '🟡';
    const ownerPhone = config.OWNER_JID ? '+' + config.OWNER_JID.split('@')[0] : 'not set';
    await ctx.reply(
      `╭───────────────────────────────────────────╮
│  ${bold('🤖 ' + config.BOT_NAME + ' — ALIVE')}              │
╰───────────────────────────────────────────╯

${bold('📊 Status:')}     ${statusIcon} ${st.status === 'open' ? 'ONLINE' : st.status.toUpperCase()}
${bold('⏱️ Uptime:')}     ${mono(uptime())}
${bold('🔄 Reconnects:')} ${mono(String(st.reconnectAttempts))}
${bold('👤 Bot JID:')}    ${mono(st.user || '—')}
${bold('📛 Push Name:')}  ${mono(st.pushName || '—')}
${bold('👑 Owner:')}      ${mono(ownerPhone)}
${bold('⚡ Prefix:')}     ${mono(config.BOT_PREFIX)}
${bold('🔋 Powered by:')} ${mono('Spyro Engine v' + config.VERSION)}

${italic('_"Spyro Bot — always watching, always ready."_')}`
    );
  },
};
