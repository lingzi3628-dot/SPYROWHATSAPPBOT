import { isSafeHttpUrl } from '../../security.js';
import { bold, mono, italic } from '../../utils/text.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'checkurl',
  aliases: ['urlcheck', 'safeclick', 'linkcheck'],
  category: 'tools',
  description: 'Analyze a link for suspicious indicators WITHOUT visiting it.',
  usage: '.checkurl <url>',
  cooldown: 3,
  async execute(ctx) {
    const url = sanitize(ctx.body || '').trim().split(' ')[0];
    if (!url) {
      return ctx.reply(
        `${bold('🔍 URL Safety Checker')}\n\n` +
        `Analyzes a URL for suspicious patterns WITHOUT visiting it.\n\n` +
        `Usage: ${mono('.checkurl https://example.com')}\n\n` +
        `Checks:\n` +
        `• Is it a valid HTTP(S) URL?\n` +
        `• Is it a known URL shortener?\n` +
        `• Does it contain phishing keywords?\n` +
        `• Does it use suspicious TLDs?\n` +
        `• Does it have IDN homograph attacks?\n` +
        `• Does it look like an impersonation?`
      );
    }

    const analysis = _analyzeUrl(url);
    const lines = [
      `${bold('🔍 URL Safety Analysis')}`,
      `${'━'.repeat(40)}`,
      ``,
      `${bold('URL:')} ${mono(url.slice(0, 80))}`,
      ``,
      `${bold('Verdict:')} ${analysis.verdict}`,
      ``,
      `${bold('Checks:')}`,
    ];

    for (const check of analysis.checks) {
      lines.push(`  ${check.icon} ${check.name}: ${check.result}`);
    }

    if (analysis.warnings.length) {
      lines.push('', `${bold('⚠️ Warnings:')}`);
      for (const w of analysis.warnings) lines.push(`  • ${w}`);
    }

    lines.push('', `${italic('_Analysis is heuristic only. Always verify the source before clicking._')}`);

    await ctx.reply(lines.join('\n'));
  },
};

function _analyzeUrl(url) {
  const checks = [];
  const warnings = [];

  // 1. Valid HTTP(S)?
  if (!isSafeHttpUrl(url)) {
    checks.push({ icon: '❌', name: 'Protocol', result: 'Not HTTP/HTTPS — dangerous' });
    return { verdict: '🔴 DANGEROUS', checks, warnings: ['URL is not a valid HTTP/HTTPS link'] };
  }
  checks.push({ icon: '✅', name: 'Protocol', result: 'Valid HTTP/HTTPS' });

  let parsed;
  try { parsed = new URL(url); } catch {
    return { verdict: '🔴 DANGEROUS', checks, warnings: ['URL parsing failed'] };
  }

  const domain = parsed.hostname;
  const fullUrl = url.toLowerCase();

  // 2. URL shortener?
  const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly'];
  const isShortened = shorteners.some(s => domain.includes(s));
  checks.push({ icon: isShortened ? '⚠️' : '✅', name: 'Shortener', result: isShortened ? `Yes (${domain}) — destination unknown` : 'No' });
  if (isShortened) warnings.push('Shortened URL — the real destination is hidden. Expand it before trusting.');

  // 3. Phishing keywords?
  const phishingKws = ['login-verify', 'account-update', 'secure-login', 'wallet-connect', 'claim-now', 'free-gift', 'verify-account', 'suspended-account', 'update-payment', 'confirm-identity'];
  const phishingHits = phishingKws.filter(kw => fullUrl.includes(kw));
  checks.push({ icon: phishingHits.length ? '❌' : '✅', name: 'Phishing keywords', result: phishingHits.length ? `Found: ${phishingHits.join(', ')}` : 'None detected' });
  if (phishingHits.length) warnings.push('URL contains common phishing keywords. Do not click.');

  // 4. Suspicious TLDs?
  const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.gq', '.top', '.xyz', '.click', '.loan', '.work'];
  const hasSuspiciousTld = suspiciousTlds.some(tld => domain.endsWith(tld));
  checks.push({ icon: hasSuspiciousTld ? '⚠️' : '✅', name: 'TLD', result: hasSuspiciousTld ? `Suspicious TLD (${domain})` : 'Normal TLD' });
  if (hasSuspiciousTld) warnings.push('Domain uses a TLD commonly associated with spam/scams.');

  // 5. Subdomain overload? (many subdomains = impersonation)
  const subdomainCount = domain.split('.').length - 1;
  if (subdomainCount > 3) {
    checks.push({ icon: '⚠️', name: 'Subdomains', result: `${subdomainCount} levels — possible impersonation` });
    warnings.push('Excessive subdomains — may be trying to impersonate a legitimate domain.');
  } else {
    checks.push({ icon: '✅', name: 'Subdomains', result: `${subdomainCount} levels — normal` });
  }

  // 6. IP address instead of domain?
  const isIp = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain);
  checks.push({ icon: isIp ? '⚠️' : '✅', name: 'Domain type', result: isIp ? 'IP address (suspicious)' : 'Domain name' });
  if (isIp) warnings.push('URL uses a raw IP address instead of a domain name — suspicious.');

  // 7. HTTPS?
  checks.push({ icon: parsed.protocol === 'https:' ? '✅' : '⚠️', name: 'Encryption', result: parsed.protocol === 'https:' ? 'HTTPS (encrypted)' : 'HTTP (not encrypted!)' });
  if (parsed.protocol !== 'https:') warnings.push('URL is not encrypted (HTTP, not HTTPS).');

  // 8. @ symbol in URL? (can be used to hide the real destination)
  if (url.includes('@')) {
    checks.push({ icon: '❌', name: 'Redirect symbol', result: 'Contains @ — can hide real destination' });
    warnings.push('URL contains @ symbol — can be used to disguise the real destination.');
  } else {
    checks.push({ icon: '✅', name: 'Redirect symbol', result: 'None' });
  }

  // Overall verdict
  const dangerCount = checks.filter(c => c.icon === '❌').length;
  const warnCount = checks.filter(c => c.icon === '⚠️').length;
  let verdict;
  if (dangerCount > 0) {
    verdict = '🔴 DANGEROUS — Do not click';
  } else if (warnCount >= 2) {
    verdict = '🟠 HIGH RISK — Exercise extreme caution';
  } else if (warnCount === 1) {
    verdict = '🟡 SUSPICIOUS — Verify before clicking';
  } else {
    verdict = '🟢 LIKELY SAFE — No suspicious patterns detected';
  }

  return { verdict, checks, warnings };
}
