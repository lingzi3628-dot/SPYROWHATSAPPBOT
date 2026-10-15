/**
 * General commands — ping, alive, menu, help, owner, botinfo, runtime, info,
 * groupinfo, profile, jid, quote, time, date, rules, support, report,
 * feedback, donate, settings, language.
 */

export default {
  name: 'ping',
  aliases: ['p'],
  category: 'general',
  description: 'Check bot response latency.',
  usage: '.ping',
  async execute(ctx) {
    const start = Date.now();
    const sent = await ctx.reply('`pinging…`');
    const latency = Date.now() - start;
    await ctx.sock.sendMessage(ctx.chatId, {
      text: `🏓 *Pong!*\nLatency: *${latency}ms*`,
      edit: sent?.key,
    });
  },
};
