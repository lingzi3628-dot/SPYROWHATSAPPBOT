import connection from '../../connection.js';
import { audit } from '../../database.js';

export default {
  name: 'restart',
  aliases: ['reload-socket'],
  category: 'owner',
  ownerOnly: true,
  description: 'Restart the bot process.',
  usage: '.restart',
  async execute(ctx) {
    audit({ actor: ctx.sender, action: 'owner.restart' });
    await ctx.replyOk('Restarting…');
    setTimeout(() => process.exit(0), 500);
  },
};
