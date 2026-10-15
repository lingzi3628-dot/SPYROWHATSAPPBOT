export default {
  name: 'ship',
  aliases: [],
  category: 'fun',
  description: 'Ship two mentioned users.',
  usage: '.ship @user1 @user2',
  async execute(ctx) {
    const mentions = (ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid) || [];
    if (mentions.length < 2) return ctx.reply('Mention two users: .ship @a @b');
    const [a, b] = mentions;
    const seed = (a + b).split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    const pct = (seed * 13) % 101;
    await ctx.reply(`💕 Ship: @${a.split('@')[0]} × @${b.split('@')[0]}\nCompatibility: *${pct}%*`, );
    await ctx.sock.sendMessage(ctx.chatId, {
      text: `💕 Ship: @${a.split('@')[0]} × @${b.split('@')[0]}\nCompatibility: *${pct}%*`,
      mentions: [a, b],
    });
  },
};
