import { bold, mono, italic } from '../../utils/text.js';

export default {
  name: 'help',
  aliases: ['h', '?'],
  category: 'general',
  description: 'Show help for a specific command.',
  usage: '.help <command>',
  async execute(ctx) {
    const name = ctx.args[0]?.toLowerCase();
    if (!name) {
      return ctx.reply(
        '❓ *Help*\n\n' +
        'Usage: `.help <command>`\n' +
        'Example: `.help ping`\n\n' +
        'Type `.menu` to see all available commands.'
      );
    }
    // Search by name or alias
    const found = ctx.commands.get(name) ||
      [...ctx.commands.values()].find((c) => c.aliases?.includes(name));
    if (!found) {
      return ctx.reply(`❌ Command "${name}" not found.\nType \`.menu\` for the full list.`);
    }
    await ctx.replyLong(_helpBlock(found));
  },
};

function _helpBlock(cmd) {
  const perm = cmd.ownerOnly ? '🔴 Owner only'
    : cmd.adminOnly ? '🟡 Group admin'
    : cmd.groupOnly ? '👥 Groups only'
    : cmd.privateOnly ? '🔒 Private only'
    : '🟢 Everyone';

  const lines = [
    `╭───────────────────────────────────────────╮`,
    `│  ${bold('📖 ' + cmd.name.toUpperCase())}                              │`,
    `╰───────────────────────────────────────────╯`,
    '',
    `${bold('📂 Category:')} ${cmd.category || 'general'}`,
    `${bold('📝 Description:')} ${cmd.description || '—'}`,
    `${bold('💡 Usage:')} ${mono(cmd.usage || '.' + cmd.name)}`,
  ];
  if (cmd.aliases?.length) {
    lines.push(`${bold('🔀 Aliases:')} ${cmd.aliases.map((a) => mono('.' + a)).join(', ')}`);
  }
  lines.push(`${bold('🔐 Permission:')} ${perm}`);
  if (cmd.cooldown) {
    lines.push(`${bold('⏳ Cooldown:')} ${mono(cmd.cooldown + 's')}`);
  }
  lines.push('');
  lines.push(italic('Type .menu to see all commands.'));
  return lines.join('\n');
}
