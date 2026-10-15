import { audit } from '../../database.js';

export default {
  name: 'shutdown',
  aliases: ['stop'],
  category: 'owner',
  ownerOnly: true,
  description: 'Shut down the bot process.',
  usage: '.shutdown',
  async execute(ctx) {
    audit({ actor: ctx.sender, action: 'owner.shutdown' });
    await ctx.replyOk('Shutting down…');
    setTimeout(() => process.exit(0), 500);
  },
};
