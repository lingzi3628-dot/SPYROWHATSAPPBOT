import { stmts } from '../../database.js';
import { audit } from '../../database.js';

const VALID = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

export default {
  name: 'setloglevel',
  aliases: ['loglevel'],
  category: 'owner',
  ownerOnly: true,
  description: 'Change the bot\'s log level at runtime.',
  usage: '.setloglevel <trace|debug|info|warn|error|fatal>',
  async execute(ctx) {
    const lvl = (ctx.args[0] || '').toLowerCase();
    if (!VALID.includes(lvl)) return ctx.reply(`Valid levels: ${VALID.join(', ')}`);
    stmts.setState.run('LOG_LEVEL', lvl, lvl);
    audit({ actor: ctx.sender, action: 'owner.setloglevel', detail: lvl });
    await ctx.replyOk(`Log level set to ${lvl}. Restart for full effect; some changes apply live.`);
  },
};
