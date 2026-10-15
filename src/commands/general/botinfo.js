import config from '../../config.js';
import { bold, mono, italic } from '../../utils/text.js';
import connection from '../../connection.js';

function uptime() {
  const ms = Date.now() - config.STARTED_AT;
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
}

export default {
  name: 'botinfo',
  aliases: ['info', 'about'],
  category: 'general',
  description: 'Show version, runtime, and bot information.',
  usage: '.botinfo',
  async execute(ctx) {
    const st = connection.status();
    const mem = process.memoryUsage();
    await ctx.reply(
      `╭───────────────────────────────────────────╮
│  ${bold('📦 BOT INFORMATION')}                    │
╰───────────────────────────────────────────╯

${bold('🤖 Name:')}        ${config.BOT_NAME}
${bold('🏷️ Version:')}     ${mono(config.VERSION)}
${bold('⏱️ Uptime:')}      ${mono(uptime())}
${bold('📊 Commands:')}    ${mono(String(ctx.commands.size))}
${bold('🔌 Status:')}      ${st.status}
${bold('💾 Memory:')}      ${mono((mem.rss / 1024 / 1024).toFixed(1) + ' MB')}

${bold('🎨 AI Features:')}
  • ${mono('.imagine <prompt>')} — generate images (FREE!)
  • ${mono('.avatar <desc>')} — generate avatars (FREE!)
  • ${mono('.ai <question>')} — AI chat (30/day)

${bold('🎬 Media Features:')}
  • ${mono('.sticker')} — image/video → sticker
  • ${mono('.tomp3')} — video/audio → MP3
  • ${mono('.tovn')} — audio → voice note
  • ${mono('.vv')} — save view-once media

${italic('_"Spyro Bot — your intelligent WhatsApp companion"_')}`
    );
  },
};
