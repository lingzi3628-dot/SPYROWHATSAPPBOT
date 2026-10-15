import { audit } from '../../database.js';
import { db } from '../../database.js';
import { sanitize } from '../../utils/text.js';

export default {
  name: 'broadcast',
  aliases: ['bcast'],
  category: 'owner',
  ownerOnly: true,
  description: 'Broadcast a message to all groups the bot is in.',
  usage: '.broadcast <message>',
  cooldown: 60,
  async execute(ctx) {
    const text = sanitize(ctx.body || '').slice(0, 4000);
    if (!text) return ctx.reply('Usage: .broadcast <message>');
    let groups = [];
    try {
      groups = await ctx.sock.groupFetchAllParticipating();
    } catch (err) {
      return ctx.replyError(`Could not fetch groups: ${err.message || err}`);
    }
    const ids = Object.values(groups).map((g) => g.id);
    let sent = 0;
    for (const id of ids) {
      try {
        await ctx.sock.sendMessage(id, { text: `📣 *Broadcast*\n\n${text}` });
        sent++;
      } catch {}
    }
    audit({ actor: ctx.sender, action: 'owner.broadcast', detail: `sent=${sent}/${ids.length}` });
    await ctx.replyOk(`Broadcast sent to ${sent}/${ids.length} groups.`);
  },
};
