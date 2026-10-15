import { getGroupSettings } from '../../database.js';
import { bold, mono } from '../../utils/text.js';
import config from '../../config.js';

export default {
  name: 'settings',
  aliases: ['config'],
  category: 'general',
  description: 'Show permitted bot settings for this chat.',
  usage: '.settings',
  async execute(ctx) {
    if (ctx.isGroup) {
      const s = getGroupSettings(ctx.chatId);
      const on = (v) => (v ? '✅ on' : '❌ off');
      const lines = [
        bold('Group settings:'),
        `antilink: ${mono(on(s.antilink))}`,
        `antispam: ${mono(on(s.antispam))}`,
        `antiflood: ${mono(on(s.antiflood))}`,
        `antibadword: ${mono(on(s.antibadword))}`,
        `antimention: ${mono(on(s.antimention))}`,
        `antitag: ${mono(on(s.antitag))}`,
        `antibot: ${mono(on(s.antibot))}`,
        `welcome: ${mono(on(s.welcome))}`,
        `goodbye: ${mono(on(s.goodbye))}`,
        `warn_limit: ${mono(String(s.warn_limit))}`,
        `prefix: ${mono(s.prefix || '(default)')}`,
        `mute: ${mono(on(s.mute))}`,
      ];
      return ctx.reply(lines.join('\n'));
    }
    await ctx.reply(
      `${bold('Global settings:')}\n` +
      `name: ${mono(config.BOT_NAME)}\n` +
      `prefix: ${mono(config.BOT_PREFIX)}\n` +
      `cooldown: ${mono(config.COMMAND_COOLDOWN_SEC + 's')}\n` +
      `max_media: ${mono(config.MAX_MEDIA_MB + 'MB')}\n` +
      `maintenance: ${mono(config.MAINTENANCE_MODE ? 'on' : 'off')}`
    );
  },
};
