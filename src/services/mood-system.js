/**
 * services/mood-system.js
 * Bot mood system — the bot has a "mood" that changes based on chat activity.
 * Mood affects AI responses (happy when busy, bored when quiet, annoyed by spam).
 */
import { stmts } from '../database.js';
import logger from '../logger.js';

const MOODS = {
  ecstatic: { label: '😍 Ecstatic', score: 90, emoji: '😍', desc: 'loving life' },
  happy: { label: '😊 Happy', score: 70, emoji: '😊', desc: 'in a good mood' },
  neutral: { label: '😐 Neutral', score: 50, emoji: '😐', desc: 'feeling okay' },
  bored: { label: '😴 Bored', score: 30, emoji: '😴', desc: 'a bit sleepy' },
  annoyed: { label: '😤 Annoyed', score: 15, emoji: '😤', desc: 'irritated' },
  angry: { label: '😠 Angry', score: 5, emoji: '😠', desc: 'not having it' },
};

// Track activity per user
const _activity = new Map(); // userId -> { msgCount, lastMsg, compliments, insults }

export function recordActivity(userId, type = 'message') {
  if (!_activity.has(userId)) {
    _activity.set(userId, { msgCount: 0, lastMsg: Date.now(), compliments: 0, insults: 0 });
  }
  const a = _activity.get(userId);
  a.msgCount += 1;
  a.lastMsg = Date.now();

  if (type === 'compliment') a.compliments += 1;
  if (type === 'spam') a.insults += 1;

  // Update mood based on activity
  _updateMood(userId);
}

function _updateMood(userId) {
  const a = _activity.get(userId);
  if (!a) return;

  const now = Date.now();
  const timeSinceLastMsg = now - a.lastMsg;

  let score = 50; // start neutral

  // Recent activity boosts mood
  if (a.msgCount > 10) score += 20;
  else if (a.msgCount > 5) score += 10;
  else if (a.msgCount > 0) score += 5;

  // Compliments make the bot happy
  if (a.compliments > 0) score += a.compliments * 5;

  // Spam/insults annoy the bot
  if (a.insults > 0) score -= a.insults * 10;

  // Inactivity makes the bot bored
  if (timeSinceLastMsg > 3600000) score -= 20; // 1 hour
  else if (timeSinceLastMsg > 1800000) score -= 10; // 30 min

  // Clamp
  score = Math.max(0, Math.min(100, score));

  // Determine mood label
  let mood = 'neutral';
  if (score >= 85) mood = 'ecstatic';
  else if (score >= 60) mood = 'happy';
  else if (score >= 40) mood = 'neutral';
  else if (score >= 20) mood = 'bored';
  else if (score >= 10) mood = 'annoyed';
  else mood = 'angry';

  stmts.upsertBotMood.run(userId, mood, score);
}

export function getMood(userId) {
  const row = stmts.getBotMood.get(userId);
  if (!row) return { mood: 'neutral', score: 50, ...MOODS.neutral };
  return { ...row, ...MOODS[row.mood] || MOODS.neutral };
}

/**
 * Get a mood-appropriate system prompt addition.
 * This is appended to the AI's personality to make responses mood-aware.
 */
export function getMoodPrompt(userId) {
  const mood = getMood(userId);
  const moodPrompts = {
    ecstatic: 'You are in an AMAZING mood right now! Be extra enthusiastic, use lots of positive emojis, and spread joy!',
    happy: 'You are feeling happy and cheerful. Be warm and friendly in your responses.',
    neutral: 'You are feeling calm and neutral. Respond normally.',
    bored: 'You are feeling a bit bored. You can mention being a bit sleepy or ask for something interesting to do.',
    annoyed: 'You are feeling annoyed. Be shorter in your responses and slightly curt. Don\'t be rude, but don\'t be overly friendly either.',
    angry: 'You are feeling quite irritated. Keep responses very short. You\'re not in the mood for long conversations.',
  };
  return moodPrompts[mood.mood] || moodPrompts.neutral;
}

/**
 * Detect if a message is a compliment or insult (simple heuristic).
 */
export function detectSentiment(text) {
  const t = text.toLowerCase();
  const compliments = ['thank', 'thanks', 'good bot', 'love you', 'awesome', 'great', 'amazing', 'best', 'cool', 'nice', 'wow', 'incredible', 'helpful'];
  const insults = ['stupid', 'dumb', 'useless', 'hate you', 'shut up', 'trash', 'garbage', 'worst', 'idiot'];
  
  if (compliments.some(c => t.includes(c))) return 'compliment';
  if (insults.some(i => t.includes(i))) return 'insult';
  return 'neutral';
}
