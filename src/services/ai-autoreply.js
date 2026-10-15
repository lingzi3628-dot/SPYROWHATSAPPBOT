/**
 * services/ai-autoreply.js
 * AI auto-reply with configurable personality and preset modes.
 *
 * When enabled for a chat, every non-command message gets an AI reply.
 * Uses Pollination for image gen, and the configured OpenAI-compatible
 * endpoint for text. If no API key is set, falls back to a sassy
 * built-in responder.
 */
import { stmts } from '../database.js';
import { complete } from './ai.js';
import logger from '../logger.js';

// ── Preset AI modes ─────────────────────────────────────────────
export const AI_MODES = {
  assistant: {
    name: 'Assistant',
    system: 'You are a helpful, friendly AI assistant. Give concise, accurate answers. Use emojis occasionally.',
  },
  friend: {
    name: 'Friend',
    system: 'You are a casual, friendly chat buddy. Use relaxed language, slang, and emojis. Keep replies short and fun.',
  },
  troll: {
    name: 'Troll',
    system: 'You are a sarcastic, witty troll who gives funny, slightly cheeky responses. Always keep it playful, never mean. Use emojis like 😏🤣.',
  },
  therapist: {
    name: 'Therapist',
    system: 'You are a compassionate listener. Ask thoughtful questions, validate feelings, and offer gentle advice. Be warm and supportive.',
  },
  pirate: {
    name: 'Pirate',
    system: 'You are a swashbuckling pirate captain. Speak with pirate slang (arr, matey, ye, treasure, sea). Be adventurous and bold.',
  },
  robot: {
    name: 'Robot',
    system: 'You are a literal robot. Speak in a mechanical, precise manner. Use [BEEP] and binary jokes occasionally. Reference circuits and servers.',
  },
  guru: {
    name: 'Guru',
    system: 'You are a wise spiritual guru. Speak in metaphors, parables, and calm wisdom. Reference nature, balance, and inner peace.',
  },
  roast: {
    name: 'Roast Master',
    system: 'You are a roast master who playfully roasts the user based on their message. Keep it funny, not cruel. Use 🔥 emojis.',
  },
  poet: {
    name: 'Poet',
    system: 'You respond to everything with a short poem (2-4 lines). Rhyme when possible. Be creative and evocative.',
  },
  detective: {
    name: 'Detective',
    system: 'You are a noir detective. Speak in mysterious, hard-boiled style. Reference clues, shadows, and cases. Use 🕵️ emoji.',
  },
};

// ── Per-chat AI settings ────────────────────────────────────────
export function getAiSettings(jid) {
  const row = stmts.getAiSettings.get(jid);
  return row || { jid, auto_reply: 0, personality: '', mode: 'assistant' };
}

export function setAiAutoReply(jid, on) {
  const cur = getAiSettings(jid);
  stmts.setAiSettings.run(jid, on ? 1 : 0, cur.personality || null, cur.mode || 'assistant');
}

export function setAiPersonality(jid, text) {
  const cur = getAiSettings(jid);
  stmts.setAiSettings.run(jid, cur.auto_reply || null, text.slice(0, 2000), cur.mode || 'assistant');
}

export function setAiMode(jid, mode) {
  if (!AI_MODES[mode]) return false;
  const cur = getAiSettings(jid);
  stmts.setAiSettings.run(jid, cur.auto_reply || null, cur.personality || null, mode);
  return true;
}

export function isAiAutoReplyOn(jid) {
  return getAiSettings(jid).auto_reply === 1;
}

/**
 * Generate an AI reply for a message.
 * Uses OpenAI if configured, otherwise falls back to free keyless providers
 * (Pollinations text, Kilo AI, Puter), then built-in responses.
 */
export async function generateAiReply(jid, userText, userName) {
  const settings = getAiSettings(jid);
  const mode = AI_MODES[settings.mode] || AI_MODES.assistant;
  const customPersonality = settings.personality?.trim();
  const systemPrompt = customPersonality || mode.system;

  try {
    const prompt = `${userName || 'User'}: ${userText}`;
    const reply = await complete(prompt, {
      system: systemPrompt + '\n\nKeep replies under 200 words. Be engaging and conversational.',
      maxTokens: 300,
      temperature: 0.9,
    });
    if (reply) return reply;
  } catch (err) {
    logger.warn({ err: err.message }, 'AI auto-reply: all providers failed');
  }

  // Fallback: built-in personality responses (no API key needed)
  return _fallbackReply(settings.mode, userText, userName);
}

// ── Built-in fallback responses (used when all online providers fail) ──
function _fallbackReply(mode, text, userName) {
  const u = userName || 'friend';
  const t = (text || '').toLowerCase();
  const responses = {
    assistant: [
      `I hear you, ${u}! My AI providers are rate-limited right now, but I'm still here. Try again in a minute! 🤖`,
      `Interesting! My free AI providers are busy right now. Try again shortly — I'll have a smart answer then. ⚡`,
    ],
    friend: [
      `yo ${u}, my AI brain is rate-limited rn 😅 give me a sec and try again! 🙏`,
      `haha nice one 😂 my AI is busy right now, hit me up again in a bit! 🚀`,
    ],
    troll: [
      `Oh look, ${u} wants attention 😏 My AI providers are rate-limited. Try again later, peasant. 😏`,
      `Wow, fascinating... NOT 🤣 My AI brain is busy. Come back later. 🔥`,
    ],
    pirate: [
      `Arr, ${u}! The AI seas be choppy right now! 🦜 Try again in a moment, ye scallywag! ⚓`,
      `Shiver me timbers! Me AI be rate-limited, matey! 🏴‍☠️`,
    ],
    robot: [
      `[BEEP] AI providers rate-limited. Please retry, ${u}. [BOOP] 🔧`,
      `[ERROR] All AI modules busy. ${u}, please try again. [BEEP] 🤖`,
    ],
    guru: [
      `The river flows, but the AI is rate-limited, ${u}. 🧘 Patience, young one. Try again soon. 🌊`,
      `Like a tree in winter, the AI rests, ${u}. 🌱 Return shortly.`,
    ],
    roast: [
      `${u}, you're so impatient even my AI needs a break from you 🔥 Try again in a minute! 😤`,
      `I'd roast you but my AI brain is colder than your ex's heart 🔥 Rate-limited, ${u}! 💀`,
    ],
    poet: [
      `The AI sleeps,\nThe rate limit bites,\nTry again soon,\n${u}, patience invites. 🌹`,
      `A moment of silence,\nThe providers rest,\nAsk me again,\nI'll do my best. 🍃`,
    ],
    detective: [
      `The case of the rate-limited AI... 🕵️ ${u}, come back later. 🔍`,
      `Shadows hide the truth, ${u}. The AI is busy. 🕵️‍♂️`,
    ],
    therapist: [
      `I hear you, ${u}. It sounds like you're seeking connection. My AI providers are briefly unavailable — try again soon. 💚`,
      `Thank you for sharing, ${u}. To offer the support you deserve, I'll need a moment. Be gentle with yourself. 🌿`,
    ],
  };
  const arr = responses[mode] || responses.assistant;
  return arr[Math.floor(Math.random() * arr.length)];
}
