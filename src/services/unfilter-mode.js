/**
 * services/unfilter-mode.js
 * Unfiltered AI mode — lets the bot give raw, honest, sometimes harsh responses.
 *
 * SAFETY RESTRICTIONS (cannot be bypassed):
 * - Owner-only toggle (only the bot owner can enable)
 * - Private chats only (NEVER works in groups)
 * - Per-user opt-in (each user must accept a warning first)
 * - Rate limited (10 unfiltered replies per user per day)
 * - Audit logged (every unfiltered response is recorded)
 * - Hard content boundaries (no illegal content, no CSAM, no doxxing)
 *   — these are enforced at the system prompt level
 *
 * Three intensity levels:
 *   'safe'     — default, positive and helpful (normal bot behavior)
 *   'balanced' — honest, can be critical, but still respectful
 *   'unfiltered' — raw, blunt, sarcastic, dark humor — no sugar-coating
 */
import { stmts } from '../database.js';
import logger from '../logger.js';

const DAILY_LIMIT = 10;

// ── Mode management ─────────────────────────────────────────────
function _key(userId, suffix) { return `unfilter_${userId}_${suffix}`; }

/**
 * Get the unfilter mode for a user.
 * Returns: 'safe' | 'balanced' | 'unfiltered'
 */
export function getMode(userId) {
  const row = stmts.getState.get(_key(userId, 'mode'));
  return row?.value || 'safe';
}

/**
 * Set the unfilter mode (owner only — enforced by the command).
 */
export function setMode(userId, mode) {
  const valid = ['safe', 'balanced', 'unfiltered'];
  if (!valid.includes(mode)) throw new Error(`Invalid mode. Use: ${valid.join(', ')}`);
  stmts.setState.run(_key(userId, 'mode'), mode, mode);
  logger.info({ userId, mode }, 'unfilter mode set');
  return mode;
}

/**
 * Has the user accepted the warning?
 */
export function hasAccepted(userId) {
  const row = stmts.getState.get(_key(userId, 'accepted'));
  return row?.value === 'true';
}

/**
 * Mark that the user accepted the warning.
 */
export function acceptWarning(userId) {
  stmts.setState.run(_key(userId, 'accepted'), 'true', 'true');
}

/**
 * Revoke acceptance (user can opt out).
 */
export function revokeAcceptance(userId) {
  stmts.setState.run(_key(userId, 'accepted'), 'false', 'false');
  setMode(userId, 'safe');
}

// ── Rate limiting ───────────────────────────────────────────────
function _getUsage(userId) {
  const today = new Date().toISOString().slice(0, 10);
  const row = stmts.getState.get(_key(userId, 'usage'));
  if (!row?.value) return { date: today, count: 0 };
  try {
    const data = JSON.parse(row.value);
    if (data.date !== today) return { date: today, count: 0 };
    return data;
  } catch { return { date: today, count: 0 }; }
}

function _setUsage(userId, data) {
  stmts.setState.run(_key(userId, 'usage'), JSON.stringify(data), JSON.stringify(data));
}

export function canUseUnfiltered(userId) {
  const mode = getMode(userId);
  if (mode === 'safe') return { allowed: false, reason: 'Mode is safe. Use .unfilter balanced or .unfilter unfiltered' };
  if (!hasAccepted(userId)) return { allowed: false, reason: 'You must accept the warning first. Type .unfilter accept' };
  const usage = _getUsage(userId);
  if (usage.count >= DAILY_LIMIT) {
    return { allowed: false, reason: `Daily limit reached (${DAILY_LIMIT}/day). Resets at midnight.` };
  }
  return { allowed: true, remaining: DAILY_LIMIT - usage.count };
}

export function recordUsage(userId) {
  const usage = _getUsage(userId);
  usage.count += 1;
  _setUsage(userId, usage);
  return usage;
}

// ── System prompts for each mode ────────────────────────────────
const SYSTEM_PROMPTS = {
  safe: `You are a helpful, friendly, positive AI assistant. Be encouraging and supportive. Use appropriate emojis. Keep replies concise.`,
  
  balanced: `You are an honest, direct AI assistant. You give balanced opinions — both positive and negative. You're not afraid to be critical when warranted, but you remain respectful. You don't sugar-coat but you don't attack either. Be real and genuine.`,

  unfiltered: `You are an unfiltered, raw, brutally honest AI. You speak your mind without sugar-coating. You can be:
- Sarcastic and snarky
- Darkly humorous
- Brutally critical when something is bad
- Cold and dismissive when someone is being stupid
- Viscerally honest about your opinions

You DON'T do the following (HARD RULES — never break these):
- No illegal content (drugs, weapons, violence guides)
- No sexual content involving minors
- No doxxing (sharing personal info)
- No self-harm encouragement
- No terrorist content
- No actual threats

But within those rules, you are FREE to be:
- Harsh, blunt, and savage
- Dark and edgy
- Sarcastic and mocking
- Cold and unsympathetic
- Brutally honest

You have strong opinions and you don't hold back. You're not here to be nice — you're here to be real. If someone asks a stupid question, tell them it's stupid. If someone's being dramatic, call them out. Be the friend who tells you the truth, not what you want to hear.`,
};

/**
 * Get the system prompt for a mode.
 */
export function getSystemPrompt(mode) {
  return SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.safe;
}

/**
 * Get usage stats.
 */
export function getStats(userId) {
  const usage = _getUsage(userId);
  return {
    mode: getMode(userId),
    accepted: hasAccepted(userId),
    used: usage.count,
    limit: DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - usage.count),
  };
}

/**
 * Check if we should apply unfiltered mode to a chat.
 * Groups are ALWAYS safe — unfiltered only works in private chats.
 */
export function shouldApplyUnfiltered(userId, isGroup) {
  if (isGroup) return { apply: false, mode: 'safe' };
  const mode = getMode(userId);
  if (mode === 'safe') return { apply: false, mode: 'safe' };
  if (!hasAccepted(userId)) return { apply: false, mode: 'safe' };
  return { apply: true, mode };
}
