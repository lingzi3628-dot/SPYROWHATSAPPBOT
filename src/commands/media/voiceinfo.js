export default {
  name: 'voiceinfo',
  aliases: ['vninfo'],
  category: 'media',
  description: 'Report available metadata for a quoted voice message.',
  usage: '.voiceinfo (reply to voice note)',
  async execute(ctx) {
    const q = ctx.msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!q?.audioMessage) return ctx.reply('Reply to a voice note.');
    const a = q.audioMessage;
    await ctx.reply(
      `🎙️ *Voice note metadata*\n` +
      `MIME: ${a.mimetype || 'unknown'}\n` +
      `Seconds: ${a.seconds ?? 'unknown'}\n` +
      `PTT: ${a.ptt ? 'yes' : 'no'}\n` +
      `Size: ${a.fileLength ? (Number(a.fileLength) / 1024).toFixed(1) + ' KB' : 'unknown'}`
    );
  },
};
