import { audit } from '../../database.js';
import { stmts } from '../../database.js';

export default {
  name: 'maintenance',
  aliases: ['maint'],
  category: 'owner',
  ownerOnly: true,
  description: 'Toggle maintenance mode (only owner can use the bot).',
  usage: '.maintenance on|off',
  async execute(ctx) {
    const arg = (ctx.args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(arg)) return ctx.reply('Usage: .maintenance on|off');
    const value = arg === 'on' ? 'true' : 'false';
    stmts.setState.run('MAINTENANCE_MODE', value, value);
    process.env.MAINTENANCE_MODE = value;
    audit({ actor: ctx.sender, action: 'owner.maintenance', detail: arg });
    await ctx.replyOk(`Maintenance mode is now ${arg.toUpperCase()}.`);
  },
};
