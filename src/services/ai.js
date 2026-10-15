/**
 * services/ai.js
 * AI provider adapter — tries OpenAI (if configured) first, then falls back
 * to free keyless providers (Pollinations, Kilo, Puter).
 *
 * The bot has WORKING AI out of the box — no API key needed!
 *
 * Includes a daily usage limiter (30 requests/day per user, resets at midnight).
 */
import axios from 'axios';
import config from '../config.js';
import logger from '../logger.js';
import { freeComplete, freeCompleteOrFallback, checkProviders } from './ai-providers.js';
import { checkAndMessage, recordAiUsage } from './ai-limiter.js';

/**
 * Is the paid OpenAI API configured?
 */
export function isPaidAiAvailable() {
  return config.ENABLE_AI && !!config.OPENAI_API_KEY;
}

/**
 * Is ANY AI available? (always true — we have free providers + fallback)
 */
export function isAvailable() {
  return true;
}

/**
 * Get a list of available AI providers (for the .ai status command).
 */
export async function getProviderStatus() {
  const status = {
    openai: isPaidAiAvailable() ? 'configured' : 'not set',
    free: await checkProviders(),
    fallback: 'always on',
  };
  return status;
}

/**
 * Generate a completion.
 * Tries OpenAI first (if configured), then free providers, then fallback.
 *
 * NOTE: This does NOT check the daily limit. Use completeWithLimit() for
 * user-facing calls that should respect the 30/day limit.
 *
 * @param {string} prompt
 * @param {object} [opts]  { model, system, maxTokens, temperature }
 * @returns {Promise<string>} the completion text (never null)
 */
export async function complete(prompt, opts = {}) {
  // 1. Try OpenAI if configured
  if (isPaidAiAvailable()) {
    try {
      const result = await _openaiComplete(prompt, opts);
      if (result) {
        logger.debug({ provider: 'openai' }, 'AI: using OpenAI');
        return result;
      }
    } catch (err) {
      logger.warn({ err: err.message?.slice(0, 80) }, 'AI: OpenAI failed, falling back to free providers');
    }
  }

  // 2. Try free keyless providers + fallback
  logger.debug('AI: using free providers');
  return freeCompleteOrFallback(prompt, opts);
}

/**
 * Generate a completion WITH daily limit checking.
 * Use this for user-facing AI commands (.ai, .ask, .explain, etc.)
 *
 * @param {string} userId  - user ID for limit tracking
 * @param {string} prompt
 * @param {object} [opts]
 * @returns {Promise<{ok: boolean, reply?: string, error?: string, remaining?: number}>}
 */
export async function completeWithLimit(userId, prompt, opts = {}) {
  const check = checkAndMessage(userId);
  if (!check.allowed) {
    return { ok: false, error: check.message };
  }
  const reply = await complete(prompt, opts);
  recordAiUsage(userId);
  return { ok: true, reply, remaining: check.remaining - 1 };
}

/**
 * Generate a completion — returns null if ALL providers fail (no fallback).
 * Use this when you want to know if real AI succeeded.
 */
export async function completeStrict(prompt, opts = {}) {
  if (isPaidAiAvailable()) {
    try {
      const result = await _openaiComplete(prompt, opts);
      if (result) return result;
    } catch {}
  }
  return freeComplete(prompt, opts);
}

// ── OpenAI (paid) ───────────────────────────────────────────────
async function _openaiComplete(prompt, opts = {}) {
  const base = config.OPENAI_API_BASE.replace(/\/$/, '');
  const url = `${base}/chat/completions`;
  const body = {
    model: opts.model || config.OPENAI_MODEL,
    messages: [
      ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
      { role: 'user', content: prompt },
    ],
    max_tokens: opts.maxTokens || 800,
    temperature: opts.temperature ?? 0.7,
  };
  const res = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 30_000,
  });
  return res.data?.choices?.[0]?.message?.content?.trim() || '';
}

// ── Convenience wrappers ────────────────────────────────────────
export async function explain(text) {
  return complete(`Explain this clearly and concisely:\n\n${text}`, {
    system: 'You are a helpful assistant explaining things to a general audience. Keep it under 200 words.',
  });
}

export async function rewrite(text) {
  return complete(`Rewrite the following to be clearer and more polished:\n\n${text}`);
}

export async function summarize(text) {
  return complete(`Summarize the following in 3-5 bullet points:\n\n${text}`);
}

export async function translate(text, target) {
  return complete(`Translate the following to ${target}. Reply with ONLY the translation, no explanation.\n\n${text}`);
}

export async function code(prompt) {
  return complete(`Write code for the following request. Use markdown code blocks.\n\n${prompt}`, {
    system: 'You are an expert programmer. Always wrap code in fenced code blocks. Keep explanations brief.',
  });
}
