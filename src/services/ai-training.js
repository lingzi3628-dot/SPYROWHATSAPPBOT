/**
 * services/ai-training.js
 * Per-user AI training — users describe their bot's character, emotions,
 * speaking style, and example Q&A pairs. The AI uses this to reply in
 * their custom personality when they're offline.
 */
import { stmts } from '../database.js';
import { complete } from './ai.js';
import logger from '../logger.js';

/**
 * Get the training data for a user.
 */
export function getTraining(userId) {
  const row = stmts.getAiTraining.get(userId);
  if (!row) {
    return {
      character_name: '',
      personality: '',
      emotions: '',
      speaking_style: '',
      example_pairs: '',
      auto_reply_offline: 0,
    };
  }
  // Parse example_pairs from JSON string
  let examples = [];
  try { examples = JSON.parse(row.example_pairs || '[]'); } catch {}
  return { ...row, example_pairs: examples };
}

/**
 * Save training data for a user.
 */
export function saveTraining(userId, data) {
  const examples = Array.isArray(data.example_pairs) ? data.example_pairs : [];
  stmts.upsertAiTraining.run(
    userId,
    data.character_name || '',
    data.personality || '',
    data.emotions || '',
    data.speaking_style || '',
    JSON.stringify(examples),
    data.auto_reply_offline ? 1 : 0,
  );
  logger.info({ userId }, 'AI training saved');
  return getTraining(userId);
}

/**
 * Is auto-reply-when-offline enabled for this user?
 */
export function isAutoReplyOffline(userId) {
  const row = stmts.getAiTraining.get(userId);
  return row?.auto_reply_offline === 1;
}

/**
 * Build a system prompt from the user's training data.
 * This is what makes the AI reply in the user's custom personality.
 */
export function buildSystemPrompt(userId) {
  const t = getTraining(userId);
  if (!t.character_name && !t.personality && !t.example_pairs?.length) {
    return null; // no training data — use default
  }

  let prompt = 'You are role-playing as a specific person. Stay in character at all times.\n\n';

  if (t.character_name) {
    prompt += `Your name: ${t.character_name}\n`;
  }
  if (t.personality) {
    prompt += `Personality: ${t.personality}\n`;
  }
  if (t.emotions) {
    prompt += `Emotional tendencies: ${t.emotions}\n`;
  }
  if (t.speaking_style) {
    prompt += `Speaking style: ${t.speaking_style}\n`;
  }

  // Add example Q&A pairs
  if (t.example_pairs?.length) {
    prompt += '\nExample conversations (learn the tone and style from these):\n';
    for (const pair of t.example_pairs.slice(0, 20)) {
      if (pair.input && pair.output) {
        prompt += `\nSomeone says: "${pair.input}"\nYou reply: "${pair.output}"\n`;
      }
    }
  }

  prompt += '\nRules:\n';
  prompt += '- Always stay in character\n';
  prompt += '- Keep replies natural and conversational (like texting)\n';
  prompt += '- Keep replies under 150 words\n';
  prompt += '- Use the same language/style as the examples\n';
  prompt += '- Never break character or mention you are an AI\n';
  prompt += '- If someone asks something you don\'t know, improvise in character\n';

  return prompt;
}

/**
 * Generate a reply using the user's trained personality.
 * Falls back to the default AI if no training data.
 * 
 * @param {number} userId - user ID
 * @param {string} userText - the message to reply to
 * @param {string} senderName - name of the sender
 * @param {string} [overrideSystem] - optional override system prompt
 *   (used by unfilter mode to override the trained personality)
 */
export async function generateTrainedReply(userId, userText, senderName, overrideSystem = null) {
  // If an override system prompt is provided (e.g. unfilter mode), use it
  let systemPrompt;
  if (overrideSystem) {
    systemPrompt = overrideSystem;
  } else {
    systemPrompt = buildSystemPrompt(userId);
  }

  if (!systemPrompt) {
    // No training and no override — use default AI
    return complete(userText, {
      system: 'You are a friendly WhatsApp bot. Reply concisely and naturally.',
      maxTokens: 200,
      temperature: 0.8,
    });
  }

  try {
    const prompt = `${senderName || 'Someone'}: ${userText}`;
    const reply = await complete(prompt, {
      system: systemPrompt,
      maxTokens: 250,
      temperature: 0.85,
    });
    return reply;
  } catch (err) {
    logger.warn({ err: err.message, userId }, 'trained AI reply failed');
    return null;
  }
}
