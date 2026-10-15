/**
 * plugins/index.js
 * Optional plugin layer. Plugins can hook into the message lifecycle without
 * being commands. A plugin exports:
 *   { name, onMessage(ctx) , onGroupUpdate(...) }
 *
 * Plugins are loaded from /plugins/*.js (excluding this index).
 */
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import logger from '../logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const plugins = [];

export async function loadPlugins() {
  plugins.length = 0;
  let files = [];
  try {
    files = readdirSync(__dirname).filter((f) => f.endsWith('.js') && f !== 'index.js');
  } catch {
    return;
  }
  for (const f of files) {
    try {
      const mod = await import(`file://${join(__dirname, f).replace(/\\/g, '/')}`);
      const p = mod.default || mod;
      if (p?.name && typeof p.onMessage === 'function') {
        plugins.push(p);
        logger.info({ plugin: p.name }, 'plugin loaded');
      }
    } catch (err) {
      logger.warn({ err, file: f }, 'failed to load plugin');
    }
  }
}

export async function runMessagePlugins(ctx) {
  for (const p of plugins) {
    try {
      const stop = await p.onMessage(ctx);
      if (stop) return true;
    } catch (err) {
      logger.warn({ err, plugin: p.name }, 'plugin threw');
    }
  }
  return false;
}
