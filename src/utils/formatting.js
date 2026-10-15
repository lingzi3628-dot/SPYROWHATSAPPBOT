/**
 * utils/formatting.js
 * WhatsApp message formatting helpers — consistent menu / help / status output.
 */
import config from '../config.js';
import { bold, mono, italic } from './text.js';

const BANNER = (txt) =>
  `${bold(config.BOT_NAME)} ${mono('v' + config.VERSION)}\n${txt}\n${'─'.repeat(20)}`;

/** Build a nicely-formatted menu header. */
export function menuHeader({ uptime, prefix }) {
  return BANNER(
    `${bold('Uptime:')} ${uptime}\n` +
    `${bold('Prefix:')} ${mono(prefix)}\n` +
    `${bold('Owner:')} ${config.OWNER_JID ? '+' + config.OWNER_JID.split('@')[0] : 'not set'}\n`
  );
}

/** Format a category section. */
export function categorySection(name, items) {
  const lines = [`\n${bold('▸ ' + name)}`];
  for (const it of items) {
    const aliases = it.aliases?.length ? ` ${mono('(' + it.aliases.join(', ') + ')')}` : '';
    lines.push(`  ${mono(it.usage || it.name)}${aliases}`);
    if (it.description) lines.push(`    ${italic(it.description)}`);
  }
  return lines.join('\n');
}

/** Build a single-command help block. */
export function helpBlock(cmd) {
  const lines = [
    BANNER(bold(cmd.name)),
    `${bold('Category:')} ${cmd.category || 'general'}`,
    cmd.description ? `${bold('Description:')} ${cmd.description}` : null,
    cmd.usage ? `${bold('Usage:')} ${mono(cmd.usage)}` : null,
    cmd.aliases?.length ? `${bold('Aliases:')} ${cmd.aliases.join(', ')}` : null,
    cmd.ownerOnly ? `${bold('Permission:')} owner only` :
      cmd.adminOnly ? `${bold('Permission:')} group admins` :
      cmd.groupOnly ? `${bold('Scope:')} groups only` :
      cmd.privateOnly ? `${bold('Scope:')} private chats only` :
      `${bold('Permission:')} everyone`,
  ].filter(Boolean);
  return lines.join('\n');
}

/** Format a generic status line. */
export function statusBlock(lines) {
  return BANNER(lines.join('\n'));
}

/** Footer used on menu / help. */
export function footer() {
  return `\n${italic('Type .help <command> for details.')}`;
}
