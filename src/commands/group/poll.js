import { sanitize } from '../../utils/text.js';

export default {
  name: 'poll',
  aliases: ['vote'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  description: 'Create a group poll. Use | to separate options.',
  usage: '.poll Question | Option 1 | Option 2 | Option 3',
  async execute(ctx) {
    const raw = sanitize(ctx.body || '');
    const parts = raw.split('|').map((s) => s.trim()).filter(Boolean);
    if (parts.length < 3) return ctx.reply('Usage: .poll Question | Opt1 | Opt2 [| Opt3 ...]');
    const [name, ...options] = parts;
    if (options.length > 12) return ctx.replyError('Maximum 12 options allowed.');
    try {
      await ctx.sock.sendMessage(ctx.chatId, {
        poll: { name, values: options, selectableCount: 1, toAnnouncementGroup: false },
      });
    } catch (err) {
      await ctx.replyError(`Could not create poll: ${err.message || err}`);
    }
  },
};
