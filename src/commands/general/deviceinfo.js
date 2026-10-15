import os from 'node:os';
import config from '../../config.js';
import { bold, mono, italic } from '../../utils/text.js';

export default {
  name: 'deviceinfo',
  aliases: ['device', 'sysinfo', 'runtime'],
  category: 'general',
  description: 'Report the bot\'s own runtime and platform information.',
  usage: '.deviceinfo',
  async execute(ctx) {
    const cpus = os.cpus();
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const uptime = os.uptime();
    const botUptime = Math.floor((Date.now() - config.STARTED_AT) / 1000);

    await ctx.reply(
      `${bold('🖥️ Bot Device Info')}\n${'━'.repeat(35)}\n\n` +
      `${bold('📦 Platform:')}\n` +
      `  OS:        ${mono(os.type() + ' ' + os.release())}\n` +
      `  Platform:  ${mono(process.platform)}\n` +
      `  Arch:      ${mono(process.arch)}\n` +
      `  Hostname:  ${mono(os.hostname())}\n\n` +

      `${bold('⚡ Runtime:')}\n` +
      `  Node.js:   ${mono(process.version)}\n` +
      `  Bot:       ${mono(config.BOT_NAME + ' v' + config.VERSION)}\n` +
      `  PID:       ${mono(String(process.pid))}\n` +
      `  Uptime:    ${mono(_fmt(uptime))} (system)\n` +
      `  Uptime:    ${mono(_fmt(botUptime))} (bot)\n\n` +

      `${bold('💾 CPU:')}\n` +
      `  Model:     ${mono(cpus[0]?.model?.slice(0, 40) || 'unknown')}\n` +
      `  Cores:     ${mono(String(cpus.length))}\n` +
      `  Load avg:  ${mono(os.loadavg().map(l => l.toFixed(2)).join(', '))}\n\n` +

      `${bold('📊 Memory:')}\n` +
      `  Bot RSS:      ${mono((mem.rss / 1024 / 1024).toFixed(1) + ' MB')}\n` +
      `  Heap used:    ${mono((mem.heapUsed / 1024 / 1024).toFixed(1) + ' MB')}\n` +
      `  Heap total:   ${mono((mem.heapTotal / 1024 / 1024).toFixed(1) + ' MB')}\n` +
      `  System used:  ${mono((usedMem / 1024 / 1024).toFixed(0) + ' MB')}\n` +
      `  System total: ${mono((totalMem / 1024 / 1024).toFixed(0) + ' MB')}\n` +
      `  System free:  ${mono((freeMem / 1024 / 1024).toFixed(0) + ' MB')}\n\n` +

      `${bold('⚙️ Config:')}\n` +
      `  Prefix:    ${mono(config.BOT_PREFIX)}\n` +
      `  Commands:  ${mono(String(ctx.commands.size))}\n` +
      `  AI:        ${mono('FREE (Pollinations + Kilo + Puter)')}\n` +
      `  AI limit:  ${mono('30/day')}\n\n` +

      `${italic('_This is the bot\'s own runtime info — no user data is shown._')}`
    );
  },
};

function _fmt(s) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
