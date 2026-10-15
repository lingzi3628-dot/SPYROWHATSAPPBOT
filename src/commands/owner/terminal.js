import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import { bold, mono, italic } from '../../utils/text.js';
import config from '../../config.js';
import connection from '../../connection.js';
import { db } from '../../database.js';
import {
  isPrivateMode,
  getGhostedUsers,
} from '../../services/bot-mode.js';
import {
  isAutoTyping,
  isAutoRead,
  isAutoStatusView,
  isAutoRecording,
  isAlwaysOnline,
} from '../../services/auto-features.js';

const execAsync = promisify(exec);

export default {
  name: 'terminal',
  aliases: ['sysinfo', 'dashboard', 'diag'],
  category: 'owner',
  ownerOnly: true,
  description: 'System dashboard — memory, disk, uptime, bot status (read-only).',
  usage: '.terminal',
  cooldown: 5,
  async execute(ctx) {
    const mem = process.memoryUsage();
    const cpuLoad = os.loadavg();
    const uptime = os.uptime();
    const freeMem = os.freemem();
    const totalMem = os.totalmem();
    const st = connection.status();
    const botUptime = Math.floor((Date.now() - config.STARTED_AT) / 1000);

    // Disk usage (best-effort)
    let diskInfo = 'n/a';
    try {
      const { stdout } = await execAsync('df -h / 2>/dev/null | tail -1');
      const parts = stdout.trim().split(/\s+/);
      if (parts.length >= 5) {
        diskInfo = `${parts[2]} used / ${parts[1]} total (${parts[4]})`;
      }
    } catch {}

    // CPU info
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model || 'unknown';
    const cpuCores = cpus.length;

    // Bot stats
    const totalCmds = db.prepare('SELECT COUNT(*) as c FROM command_stats').get().c;
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM user_prefs').get().c;
    const totalGroups = db.prepare('SELECT COUNT(*) as c FROM group_settings').get().c;
    const auditCount = db.prepare('SELECT COUNT(*) as c FROM audit_log').get().c;
    const ghostedCount = getGhostedUsers().length;

    const lines = [
      `${bold('🖥️  SYSTEM TERMINAL — Spyro Bot')}`,
      `${'━'.repeat(40)}`,
      '',
      `${bold('📊 SYSTEM')}`,
      `  Host:       ${mono(os.hostname())}`,
      `  Platform:   ${mono(process.platform + ' ' + os.release())}`,
      `  Arch:       ${mono(process.arch)}`,
      `  Uptime:     ${mono(_formatDuration(uptime))}`,
      `  CPU:        ${mono(cpuModel.slice(0, 40))}`,
      `  Cores:      ${mono(String(cpuCores))}`,
      `  Load:       ${mono(cpuLoad.map((l) => l.toFixed(2)).join(', '))}`,
      '',
      `${bold('💾 MEMORY')}`,
      `  Bot RSS:        ${mono((mem.rss / 1024 / 1024).toFixed(1) + ' MB')}`,
      `  Heap used:      ${mono((mem.heapUsed / 1024 / 1024).toFixed(1) + ' MB')}`,
      `  Heap total:     ${mono((mem.heapTotal / 1024 / 1024).toFixed(1) + ' MB')}`,
      `  External:       ${mono((mem.external / 1024 / 1024).toFixed(1) + ' MB')}`,
      `  System free:    ${mono((freeMem / 1024 / 1024).toFixed(1) + ' MB')}`,
      `  System total:   ${mono((totalMem / 1024 / 1024).toFixed(1) + ' MB')}`,
      `  Disk:           ${mono(diskInfo)}`,
      '',
      `${bold('🤖 BOT STATUS')}`,
      `  Name:          ${mono(config.BOT_NAME)}`,
      `  Version:       ${mono(config.VERSION)}`,
      `  Status:        ${mono(st.status)}`,
      `  Bot JID:       ${mono(st.user || '—')}`,
      `  Push name:     ${mono(st.pushName || '—')}`,
      `  Bot uptime:    ${mono(_formatDuration(botUptime))}`,
      `  Reconnects:    ${mono(String(st.reconnectAttempts))}`,
      `  Baileys:       ${mono(st.baileysVersion?.join('.') || 'n/a')}`,
      `  Node.js:       ${mono(process.version)}`,
      `  Commands:      ${mono(String(ctx.commands.size))}`,
      '',
      `${bold('📈 STATISTICS')}`,
      `  Total commands run:  ${mono(String(totalCmds))}`,
      `  Known users:         ${mono(String(totalUsers))}`,
      `  Known groups:        ${mono(String(totalGroups))}`,
      `  Audit entries:       ${mono(String(auditCount))}`,
      `  Ghosted users:       ${mono(String(ghostedCount))}`,
      '',
      `${bold('⚙️  TOGGLES')}`,
      `  Mode:            ${mono(isPrivateMode() ? 'PRIVATE' : 'PUBLIC')}`,
      `  Auto-typing:     ${mono(isAutoTyping() ? 'ON' : 'OFF')}`,
      `  Auto-read:       ${mono(isAutoRead() ? 'ON' : 'OFF')}`,
      `  Auto-recording:  ${mono(isAutoRecording() ? 'ON' : 'OFF')}`,
      `  Always-online:   ${mono(isAlwaysOnline() ? 'ON' : 'OFF')}`,
      `  Auto-status-view:${mono(isAutoStatusView() ? 'ON' : 'OFF')}`,
      '',
      `${'━'.repeat(40)}`,
      `${italic('_Read-only dashboard. No commands can be executed here._')}`,
    ];

    await ctx.replyLong(lines.join('\n'));
  },
};

function _formatDuration(s) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
