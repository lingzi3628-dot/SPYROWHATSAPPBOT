import { pretty } from '../../utils/jid.js';

export default {
  name: 'profile',
  aliases: ['whoami', 'me'],
  category: 'general',
  description: 'Show supported public profile information.',
  usage: '.profile',
  async execute(ctx) {
    let info = null;
    try {
      info = await ctx.sock.fetchStatus(ctx.sender);
    } catch {}
    const name = ctx.msg.pushName || '(unknown)';
    const lines = [
      `*Name:* ${name}`,
      `*Number:* ${pretty(ctx.sender)}`,
      `*JID:* ${ctx.sender}`,
    ];
    if (info?.status) lines.push(`*About:* ${info.status}`);
    if (info?.setAt) lines.push(`*About set:* ${new Date(info.setAt).toLocaleString()}`);
    await ctx.reply(lines.join('\n'));
  },
};
