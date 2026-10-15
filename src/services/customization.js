/**
 * services/customization.js
 * Per-user bot customization — name, prefix, theme, response style,
 * emoji usage, language, blacklist words, memory, and more.
 */
import { stmts } from '../database.js';
import logger from '../logger.js';

// ── Default customization ───────────────────────────────────────
const DEFAULTS = {
  bot_name: '',
  bot_prefix: '',
  theme: 'dark',
  response_length: 'medium',
  emoji_usage: 'light',
  language: 'en',
  blacklist_words: '',
  custom_greeting: '',
  hide_commands: '',
};

/**
 * Get customization for a user.
 */
export function getCustomization(userId) {
  const row = stmts.getCustomization.get(userId);
  if (!row) return { ...DEFAULTS };
  return { ...DEFAULTS, ...row };
}

/**
 * Save customization for a user.
 * Only updates fields that are provided (non-null).
 */
export function saveCustomization(userId, data) {
  stmts.upsertCustomization.run(
    userId,
    data.bot_name ?? null,
    data.bot_prefix ?? null,
    data.theme ?? null,
    data.response_length ?? null,
    data.emoji_usage ?? null,
    data.language ?? null,
    data.blacklist_words ?? null,
    data.custom_greeting ?? null,
    data.hide_commands ?? null,
  );
  return getCustomization(userId);
}

/**
 * Get the effective bot name for a user (custom or default).
 */
export function getBotName(userId, defaultName) {
  const cust = getCustomization(userId);
  return cust.bot_name || defaultName || 'Spyro Bot';
}

/**
 * Get the effective prefix for a user (custom or default).
 */
export function getPrefix(userId, defaultPrefix) {
  const cust = getCustomization(userId);
  return cust.bot_prefix || defaultPrefix || '.';
}

/**
 * Get the theme for a user.
 */
export function getTheme(userId) {
  return getCustomization(userId).theme || 'dark';
}

/**
 * Get response length preference.
 */
export function getResponseLength(userId) {
  return getCustomization(userId).response_length || 'medium';
}

/**
 * Get emoji usage preference.
 */
export function getEmojiUsage(userId) {
  return getCustomization(userId).emoji_usage || 'light';
}

/**
 * Get language preference.
 */
export function getLanguage(userId) {
  return getCustomization(userId).language || 'en';
}

/**
 * Get blacklist words as an array.
 */
export function getBlacklistWords(userId) {
  const raw = getCustomization(userId).blacklist_words || '';
  return raw.split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
}

/**
 * Get hidden commands as a Set.
 */
export function getHiddenCommands(userId) {
  const raw = getCustomization(userId).hide_commands || '';
  return new Set(raw.split(',').map(c => c.trim().toLowerCase()).filter(Boolean));
}

/**
 * Get custom greeting.
 */
export function getCustomGreeting(userId) {
  return getCustomization(userId).custom_greeting || '';
}

// ── AI Memory ───────────────────────────────────────────────────

/**
 * Store a fact in memory.
 */
export function rememberFact(userId, fact, aboutJid = null) {
  stmts.addMemory.run(userId, fact.slice(0, 1000), aboutJid);
  logger.info({ userId, fact: fact.slice(0, 60) }, 'AI memory: fact stored');
}

/**
 * Get all memories for a user.
 */
export function getMemories(userId, limit = 20) {
  return stmts.getMemories.all(userId, limit);
}

/**
 * Get memories about a specific person.
 */
export function getMemoriesAbout(userId, aboutJid, limit = 10) {
  return stmts.getMemoriesAbout.all(userId, aboutJid, limit);
}

/**
 * Delete a specific memory by ID.
 */
export function deleteMemory(id) {
  stmts.deleteMemory.run(id);
}

/**
 * Clear all memories for a user.
 */
export function clearMemories(userId) {
  stmts.clearMemories.run(userId);
}

/**
 * Build a memory context string for AI prompts.
 * Includes facts the bot remembers about the current user.
 */
export function buildMemoryContext(userId, aboutJid = null) {
  let memories;
  if (aboutJid) {
    memories = getMemoriesAbout(userId, aboutJid, 10);
  } else {
    memories = getMemories(userId, 10);
  }
  if (!memories.length) return '';
  const facts = memories.map(m => `- ${m.fact}`).join('\n');
  return `\n\nThings you remember:\n${facts}\n`;
}

// ── Group Customization ─────────────────────────────────────────

/**
 * Get customization for a group.
 */
export function getGroupCustomization(groupJid) {
  const row = stmts.getGroupCustomization.get(groupJid);
  if (!row) return { custom_prefix: '', ai_personality: '', theme_color: '', welcome_card: '' };
  return row;
}

/**
 * Save group customization.
 */
export function saveGroupCustomization(groupJid, userId, data) {
  stmts.upsertGroupCustomization.run(
    groupJid,
    userId,
    data.custom_prefix ?? null,
    data.ai_personality ?? null,
    data.theme_color ?? null,
    data.welcome_card ?? null,
  );
  return getGroupCustomization(groupJid);
}

/**
 * Get the effective prefix for a group (group custom > user custom > default).
 */
export function getGroupPrefix(groupJid, userId, defaultPrefix) {
  const groupCust = getGroupCustomization(groupJid);
  if (groupCust.custom_prefix) return groupCust.custom_prefix;
  return getPrefix(userId, defaultPrefix);
}

// ── Theme styles ────────────────────────────────────────────────
export const THEMES = {
  dark: { border: '━', corner: '╔╗╚╝', accent: '🟢', name: 'Dark' },
  light: { border: '═', corner: '┌┐└┘', accent: '⚪', name: 'Light' },
  minimal: { border: '─', corner: '  ', accent: '▸', name: 'Minimal' },
  colorful: { border: '■', corner: '◆◆◆◆', accent: '🌈', name: 'Colorful' },
  hacker: { border: '#', corner: '##', accent: '💀', name: 'Hacker' },
  fire: { border: '█', corner: '🔥🔥🔥🔥', accent: '🔥', name: 'Fire' },
};

export function getThemeStyle(userId) {
  const theme = getTheme(userId);
  return THEMES[theme] || THEMES.dark;
}

// ── Emoji application ───────────────────────────────────────────
export function applyEmoji(text, userId) {
  const usage = getEmojiUsage(userId);
  if (usage === 'none') {
    // Strip emojis from bot responses
    return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  }
  // For light/medium/heavy/chaotic — return as-is (AI already adds emojis)
  return text;
}

// ── Response length trimming ────────────────────────────────────
export function applyResponseLength(text, userId) {
  const length = getResponseLength(userId);
  if (length === 'short') {
    // First line only, or first 100 chars
    const firstLine = text.split('\n')[0];
    return firstLine.length > 100 ? firstLine.slice(0, 100) + '...' : firstLine;
  }
  if (length === 'medium') {
    // First 3 lines or 500 chars
    const lines = text.split('\n').slice(0, 3).join('\n');
    return lines.length > 500 ? lines.slice(0, 500) + '...' : lines;
  }
  // long — return as-is
  return text;
}

// ── Blacklist word filtering ────────────────────────────────────
export function filterBlacklist(text, userId) {
  const words = getBlacklistWords(userId);
  if (!words.length) return text;
  let filtered = text;
  for (const word of words) {
    const regex = new RegExp(word, 'gi');
    filtered = filtered.replace(regex, '***');
  }
  return filtered;
}
