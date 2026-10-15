import handler from '../../handler.js';
import { audit } from '../../database.js';

export default {
  name: 'pluginreload',
  aliases: ['reload'],
  category: 'owner',
  ownerOnly: true,
  description: 'Hot-reload all commands at runtime.',
  usage: '.pluginreload',
  async execute(ctx) {
    try {
      await handler.reload();
      audit({ actor: ctx.sender, action: 'owner.pluginreload' });
      await ctx.replyOk(`Reloaded ${handler.commands.size} commands.`);
    } catch (err) {
      await ctx.replyError(`Reload failed: ${err.message || err}`);
    }
  },
};
