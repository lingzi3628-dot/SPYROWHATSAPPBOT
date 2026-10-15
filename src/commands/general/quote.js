export default {
  name: 'quote',
  aliases: ['q'],
  category: 'general',
  description: 'Reply with a quoted message (uses the replied-to message).',
  usage: '.quote [text]',
  async execute(ctx) {
    const text = ctx.body || ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || 'Quoted.';
    const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo;
    if (!quoted) return ctx.reply('Reply to a message to quote it.');
    await ctx.sock.sendMessage(ctx.chatId, {
      text,
      contextInfo: { quotedMessage: quoted.quotedMessage, participant: quoted.participant },
    });
  },
};
