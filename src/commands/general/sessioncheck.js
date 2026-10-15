import connection from '../../connection.js';
import config from '../../config.js';
import { bold, mono, italic } from '../../utils/text.js';
import os from 'node:os';

export default {
  name: 'sessioncheck',
  aliases: ['session', 'conncheck', 'sessionhealth'],
  category: 'general',
  description: 'Check the bot\'s connection and session health.',
  usage: '.sessioncheck',
  async execute(ctx) {
    const st = connection.status();
    const mem = process.memoryUsage();
    const uptime = Math.floor((Date.now() - config.STARTED_AT) / 1000);
    
    const checks = [];
    
    // Connection check
    if (st.status === 'open') {
      checks.push('✅ WhatsApp connection: OPEN');
    } else {
      checks.push(`⚠️ WhatsApp connection: ${st.status}`);
    }
    
    // Session check
    if (st.user) {
      checks.push(`✅ Session: Active (${st.user})`);
    } else {
      checks.push('❌ Session: No active session');
    }
    
    // Reconnect check
    if (st.reconnectAttempts === 0) {
      checks.push('✅ Reconnects: None (stable)');
    } else if (st.reconnectAttempts < 5) {
      checks.push(`⚠️ Reconnects: ${st.reconnectAttempts} (minor instability)`);
    } else {
      checks.push(`❌ Reconnects: ${st.reconnectAttempts} (unstable — check logs)`);
    }
    
    // Memory check
    const memMb = mem.rss / 1024 / 1024;
    if (memMb < 200) {
      checks.push(`✅ Memory: ${memMb.toFixed(1)} MB (healthy)`);
    } else if (memMb < 400) {
      checks.push(`⚠️ Memory: ${memMb.toFixed(1)} MB (moderate)`);
    } else {
      checks.push(`❌ Memory: ${memMb.toFixed(1)} MB (high — may need restart)`);
    }
    
    // Uptime check
    if (uptime > 3600) {
      checks.push(`✅ Uptime: ${Math.floor(uptime/3600)}h (stable)`);
    } else {
      checks.push(`⚠️ Uptime: ${uptime}s (recently restarted)`);
    }

    await ctx.reply(
      `${bold('🔍 Session Health Check')}\n${'━'.repeat(35)}\n\n` +
      checks.join('\n') + '\n\n' +
      `${bold('Details:')}\n` +
      `  Bot JID: ${mono(st.user || '—')}\n` +
      `  Push Name: ${mono(st.pushName || '—')}\n` +
      `  Status: ${mono(st.status)}\n` +
      `  Uptime: ${mono(Math.floor(uptime/3600) + 'h ' + Math.floor((uptime%3600)/60) + 'm')}\n` +
      `  Memory: ${mono(memMb.toFixed(1) + ' MB')}\n` +
      `  Platform: ${mono(process.platform)}\n\n` +
      `${italic('_All systems checked. Report any ❌ issues to the owner._')}`
    );
  },
};
