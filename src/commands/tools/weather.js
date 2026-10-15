import axios from 'axios';
import config from '../../config.js';
import { sanitize } from '../../security.js';

export default {
  name: 'weather',
  aliases: ['temp'],
  category: 'tools',
  description: 'Get current weather for a city (requires OPENWEATHER_API_KEY).',
  usage: '.weather <city>',
  cooldown: 5,
  async execute(ctx) {
    const city = sanitize(ctx.body || '');
    if (!city) return ctx.reply('Usage: .weather <city>');
    if (!config.OPENWEATHER_API_KEY) return ctx.replyError('OPENWEATHER_API_KEY not set. See .env.example.');
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${config.OPENWEATHER_API_KEY}&units=metric`;
      const res = await axios.get(url, { timeout: 10_000 });
      const d = res.data;
      await ctx.reply(
        `🌤️ *Weather: ${d.name}, ${d.sys.country}*\n` +
        `Condition: ${d.weather[0].main} (${d.weather[0].description})\n` +
        `Temp: ${d.main.temp}°C (feels ${d.main.feels_like}°C)\n` +
        `Humidity: ${d.main.humidity}%\n` +
        `Wind: ${d.wind.speed} m/s`
      );
    } catch (err) {
      const msg = err?.response?.data?.message || err.message;
      await ctx.replyError(`Weather lookup failed: ${msg}`);
    }
  },
};
