import { audit } from '../../database.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'setprefix',
  aliases: ['changeprefix'],
  category: 'owner',
  ownerOnly: true,
  description: 'Globally override the command prefix at runtime (per-group use .setprefix in admin).',
  usage: '.setprefix <prefix>',
  async execute(ctx) {
    const p = sanitize(ctx.args[0] || '');
    if (!p || p.length > 4) return ctx.reply('Usage: .setprefix <1-4 char prefix>');
    process.env.BOT_PREFIX = p;
    // persist to bot_state so config can pick it up on restart
    const { stmts } = await import('../../database.js');
    stmts.setState.run('BOT_PREFIX', p, p);
    audit({ actor: ctx.sender, action: 'owner.setprefix', detail: p });
    await ctx.replyOk(`Global prefix set to "${p}" — restart the bot for full effect.`);
  },
};
