import { addReminder, parseDuration } from '../../scheduler.js';
import { sanitize } from '../../security.js';

export default {
  name: 'remind',
  aliases: ['reminder'],
  category: 'tools',
  description: 'Schedule a personal reminder. e.g. .remind 30m Call mom',
  usage: '.remind <duration> <message>',
  async execute(ctx) {
    const dur = ctx.args[0];
    const msg = sanitize(ctx.body?.split(' ').slice(1).join(' ') || '');
    if (!dur || !msg) return ctx.reply('Usage: .remind 30m <message>  (units: s/m/h/d/w)');
    const secs = parseDuration(dur);
    if (!secs) return ctx.replyError('Invalid duration. Use 5m / 2h / 1d / etc.');
    if (secs > 604800) return ctx.replyError('Max reminder is 1 week.');
    const remindAt = Math.floor(Date.now() / 1000) + secs;
    const id = addReminder({
      userJid: ctx.sender,
      groupJid: ctx.isGroup ? ctx.chatId : null,
      remindAt,
      message: msg.slice(0, 500),
    });
    await ctx.replyOk(`Reminder #${id} set for ${new Date(remindAt * 1000).toLocaleString()}.`);
  },
};
