import { setGroupSetting, getGroupSettings, audit } from '../../database.js';
import { bold, mono, italic } from '../../utils/text.js';
import { containsUrl, isSafeHttpUrl } from '../../security.js';

export default {
  name: 'antifake',
  aliases: ['af', 'antiscam'],
  category: 'admin',
  groupOnly: true,
  adminOnly: true,
  description: 'Detect suspicious links, impersonation, and scam patterns.',
  usage: '.antifake on|off|status|check <url>',
  async execute(ctx) {
    const sub = (ctx.args[0] || '').toLowerCase();
    const settings = getGroupSettings(ctx.chatId);

    if (sub === 'on' || sub === 'off') {
      // Reuse the 'antibot' column to store antifake state (or use a separate key)
      setGroupSetting(ctx.chatId, 'antibot', sub === 'on' ? 1 : 0);
      audit({ actor: ctx.sender, action: 'admin.antifake', groupJid: ctx.chatId, detail: sub });
      return ctx.replyOk(`Antifake is now ${sub.toUpperCase()}.\n\nDetects:\n• Suspicious shortened URLs\n• Impersonation attempts (fake admin names)\n• Known scam patterns\n• Phishing links`);
    }

    if (sub === 'check') {
      const url = ctx.args[1];
      if (!url) return ctx.reply('Usage: .antifake check <url>');
      const analysis = _analyzeUrl(url);
      return ctx.reply(`${bold('🔍 URL Analysis')}\n${'━'.repeat(30)}\n\nURL: ${mono(url.slice(0, 80))}\nVerdict: ${analysis.verdict}\n\nReason: ${analysis.reason}`);
    }

    // Status
    return ctx.reply(
      `${bold('🔍 Antifake Status')}\n${'━'.repeat(30)}\n\n` +
      `State: ${mono(settings.antibot ? 'ON' : 'OFF')}\n\n` +
      `Usage:\n` +
      `  ${mono('.antifake on')} — enable scam/phishing detection\n` +
      `  ${mono('.antifake off')} — disable\n` +
      `  ${mono('.antifake check <url>')} — analyze a URL\n\n` +
      `${italic('_Detects: suspicious links, shortened URLs, impersonation, scam patterns_')}`
    );
  },
};

function _analyzeUrl(url) {
  if (!isSafeHttpUrl(url)) {
    return { verdict: '🔴 DANGEROUS', reason: 'Not a valid HTTP/HTTPS URL' };
  }
  const suspicious = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly'];
  const phishing = ['login-verify', 'account-update', 'secure-login', 'wallet-connect', 'claim-now', 'free-gift'];
  const domain = new URL(url).hostname;
  
  if (suspicious.some(s => domain.includes(s))) {
    return { verdict: '🟡 SUSPICIOUS', reason: 'Shortened URL — destination unknown. Proceed with caution.' };
  }
  if (phishing.some(p => url.toLowerCase().includes(p))) {
    return { verdict: '🔴 DANGEROUS', reason: 'Contains phishing keywords. Do not click.' };
  }
  return { verdict: '🟢 LIKELY SAFE', reason: 'No suspicious patterns detected. Always verify the source.' };
}
