/**
 * services/ai-limiter.js
 * Per-user AI usage limiter — 30 AI replies per day, resets at midnight.
 *
 * Tracks usage in bot_state as JSON: { date: 'YYYY-MM-DD', count: N }
 */
import { stmts } from '../database.js';
import logger from '../logger.js';

const DAILY_LIMIT = 30;

function _todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function _key(userId) { return `ai_usage_${userId}`; }

function _getUsage(userId) {
  try {
    const row = stmts.getState.get(_key(userId));
    if (!row?.value) return { date: _todayStr(), count: 0 };
    const data = JSON.parse(row.value);
    // Reset if it's a new day
    if (data.date !== _todayStr()) {
      return { date: _todayStr(), count: 0 };
    }
    return data;
  } catch {
    return { date: _todayStr(), count: 0 };
  }
}

function _setUsage(userId, data) {
  stmts.setState.run(_key(userId), JSON.stringify(data), JSON.stringify(data));
}

/**
 * Can this user make another AI request?
 * Returns { allowed: true } or { allowed: false, remaining: 0, limit, resetsAt }
 */
export function canUseAi(userId) {
  const usage = _getUsage(userId);
  if (usage.count < DAILY_LIMIT) {
    return { allowed: true, remaining: DAILY_LIMIT - usage.count, limit: DAILY_LIMIT };
  }
  // Calculate when midnight hits (reset time)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return {
    allowed: false,
    remaining: 0,
    limit: DAILY_LIMIT,
    resetsAt: tomorrow.toISOString(),
  };
}

/**
 * Record an AI usage (increment counter). Call this AFTER a successful AI reply.
 */
export function recordAiUsage(userId) {
  const usage = _getUsage(userId);
  usage.count += 1;
  _setUsage(userId, usage);
  logger.debug({ userId, count: usage.count, limit: DAILY_LIMIT }, 'AI usage recorded');
  return usage;
}

/**
 * Get usage stats for a user.
 */
export function getUsageStats(userId) {
  const usage = _getUsage(userId);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return {
    used: usage.count,
    limit: DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - usage.count),
    resetsAt: tomorrow.toISOString(),
    date: usage.date,
  };
}

/**
 * Reset a user's usage (admin only).
 */
export function resetUsage(userId) {
  _setUsage(userId, { date: _todayStr(), count: 0 });
  return getUsageStats(userId);
}

/**
 * Check if user can use AI, and if not, return a friendly message.
 */
export function checkAndMessage(userId) {
  const check = canUseAi(userId);
  if (!check.allowed) {
    const resetTime = new Date(check.resetsAt).toLocaleString();
    return {
      allowed: false,
      message: `⚠️ You've used all ${check.limit} AI replies for today.\n\nYour limit resets at midnight (in a few hours).\nReset time: ${resetTime}\n\nCome back tomorrow for more! 🌅`,
    };
  }
  return { allowed: true, remaining: check.remaining, limit: check.limit };
}
