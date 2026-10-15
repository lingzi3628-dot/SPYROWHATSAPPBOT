export default {
  name: 'viewonceinfo',
  aliases: ['vvinfo'],
  category: 'media',
  description: 'Identify view-once message metadata (without exposing private data).',
  usage: '.viewonceinfo (reply to message)',
  async execute(ctx) {
    const q = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!q) return ctx.reply('Reply to a message.');
    const vo = q.viewOnceMessage || q.viewOnceMessageV2;
    if (!vo) return ctx.reply('That message is not view-once.');
    const inner = vo.message || {};
    const types = Object.keys(inner);
    let mime = '';
    let secs = 0;
    for (const t of types) {
      if (inner[t]?.mimetype) mime = inner[t].mimetype;
      if (inner[t]?.seconds) secs = inner[t].seconds;
    }
    await ctx.reply(
      `🔒 *View-once metadata*\n` +
      `Type: ${types.join(', ') || 'unknown'}\n` +
      `MIME: ${mime || 'unknown'}\n` +
      `Seconds: ${secs || 'n/a'}\n` +
      `Note: this command does NOT expose private content.`
    );
  },
};
