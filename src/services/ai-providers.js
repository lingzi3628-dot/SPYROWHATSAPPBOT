/**
 * services/ai-providers.js
 * Multi-provider free AI text generation — NO API KEY REQUIRED.
 *
 * Providers are tried in order until one succeeds:
 *   1. Pollinations Text API (https://text.pollinations.ai)
 *   2. Kilo AI Gateway (https://api.kilo.ai/api/gateway)
 *   3. Puter AI (https://api.puter.com/developers/internal/default/llm)
 *   4. Built-in fallback responses
 *
 * All providers are free, keyless, and OpenAI-compatible (or close enough).
 * If one is rate-limited or down, the next is tried automatically.
 */
import axios from 'axios';
import logger from '../logger.js';

// ── Provider 1: Pollinations Text ───────────────────────────────
async function _pollinations(prompt, opts = {}) {
  const messages = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: prompt });

  const body = {
    messages,
    model: opts.model || 'openai',
    temperature: opts.temperature ?? 0.7,
    seed: opts.seed || Math.floor(Math.random() * 1_000_000),
  };
  const res = await axios.post('https://text.pollinations.ai/', body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30_000,
  });
  // Pollinations returns plain text or JSON depending on model
  if (typeof res.data === 'string') return res.data.trim();
  if (res.data?.choices?.[0]?.message?.content) return res.data.choices[0].message.content.trim();
  if (res.data?.content) return String(res.data.content).trim();
  return JSON.stringify(res.data).slice(0, 2000);
}

// ── Provider 2: Kilo AI Gateway ─────────────────────────────────
async function _kilo(prompt, opts = {}) {
  const messages = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: prompt });

  const body = {
    model: 'kilo-auto/free',
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens || 500,
  };
  const res = await axios.post('https://api.kilo.ai/api/gateway/v1/chat/completions', body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30_000,
  });
  return res.data?.choices?.[0]?.message?.content?.trim() || '';
}

// ── Provider 3: Puter AI ────────────────────────────────────────
async function _puter(prompt, opts = {}) {
  const messages = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: prompt });

  const body = {
    model: 'gpt-4o-mini',
    messages,
    temperature: opts.temperature ?? 0.7,
  };
  // Try multiple known Puter endpoints
  const urls = [
    'https://api.puter.com/puters/js/util/llm',
    'https://api.puter.com/llm',
  ];
  for (const url of urls) {
    try {
      const res = await axios.post(url, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15_000,
      });
      return res.data?.choices?.[0]?.message?.content?.trim() ||
             res.data?.message?.content?.trim() ||
             res.data?.result?.trim() || '';
    } catch {}
  }
  return '';
}

// ── Built-in fallback (always works, no network) ────────────────
function _fallback(prompt, opts = {}) {
  const p = (prompt || '').toLowerCase();
  if (/hello|hi|hey|sup|yo\b/.test(p)) {
    return 'Hey! 👋 I\'m a free AI bot. My main AI providers might be busy, but I\'m still here to chat! Ask me anything.';
  }
  if (/joke|funny/.test(p)) {
    const jokes = [
      'Why don\'t programmers like nature? It has too many bugs. 🐛',
      'I told my computer I needed a break, and now it won\'t stop sending me KitKat ads. 🍫',
      'Why did the developer go broke? Because he used up all his cache. 💸',
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }
  if (/how are you|how r u/.test(p)) {
    return 'I\'m running great! ⚡ My AI providers might be busy, but the bot itself is online and ready.';
  }
  return 'I\'d love to give you a smart answer, but my free AI providers are rate-limited right now. 🤖 Try again in a minute, or ask the owner to set OPENAI_API_KEY for unlimited AI. ⚡';
}

// ── Provider list (tried in order) ──────────────────────────────
const PROVIDERS = [
  { name: 'pollinations', fn: _pollinations },
  { name: 'kilo', fn: _kilo },
  { name: 'puter', fn: _puter },
];

/**
 * Generate a text completion using the first available free provider.
 * @param {string} prompt
 * @param {object} opts  { system, model, temperature, maxTokens }
 * @returns {Promise<string|null>} the completion, or null if all providers failed
 */
export async function freeComplete(prompt, opts = {}) {
  for (const provider of PROVIDERS) {
    try {
      logger.debug({ provider: provider.name, prompt: prompt.slice(0, 60) }, 'AI: trying provider');
      const result = await provider.fn(prompt, opts);
      if (result && result.length > 0) {
        logger.info({ provider: provider.name, length: result.length }, 'AI: provider succeeded');
        return result;
      }
    } catch (err) {
      const status = err?.response?.status;
      logger.warn({
        provider: provider.name,
        status,
        err: err.message?.slice(0, 80),
      }, 'AI: provider failed, trying next');
    }
  }
  // All providers failed — return null (caller can use fallback)
  logger.warn('AI: all free providers failed');
  return null;
}

/**
 * Generate a text completion with built-in fallback (always returns something).
 */
export async function freeCompleteOrFallback(prompt, opts = {}) {
  const result = await freeComplete(prompt, opts);
  return result || _fallback(prompt, opts);
}

/**
 * Check which free providers are currently available.
 */
export async function checkProviders() {
  const results = {};
  for (const provider of PROVIDERS) {
    try {
      const r = await provider.fn('ping', { maxTokens: 5 });
      results[provider.name] = r ? 'ok' : 'empty';
    } catch (err) {
      results[provider.name] = `fail (${err.response?.status || err.message?.slice(0, 40)})`;
    }
  }
  return results;
}

/**
 * Is at least one free provider available?
 * (Best-effort — doesn't actually ping, just returns true since we have fallback)
 */
export function isFreeAiAvailable() {
  return true; // we always have the fallback
}
