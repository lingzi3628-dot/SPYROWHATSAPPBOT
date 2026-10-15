/**
 * services/group-dna.js
 * Analyzes a group's "vibe" based on message patterns, activity levels,
 * and content analysis. Provides insights and smart suggestions.
 */

// Track group messages for analysis
const _groupStats = new Map(); // groupJid -> { messages, users, hours, keywords, lastAnalysis }

export function recordGroupMessage(groupJid, senderJid, text) {
  if (!_groupStats.has(groupJid)) {
    _groupStats.set(groupJid, {
      messages: [],
      users: new Set(),
      hours: new Array(24).fill(0),
      keywords: new Map(),
      totalChars: 0,
      lastAnalysis: 0,
    });
  }
  const stats = _groupStats.get(groupJid);
  const hour = new Date().getHours();
  stats.hours[hour] += 1;
  stats.users.add(senderJid);
  stats.totalChars += text.length;

  // Track messages (keep last 100)
  stats.messages.push({ sender: senderJid, text: text.slice(0, 200), time: Date.now() });
  if (stats.messages.length > 100) stats.messages.shift();

  // Extract keywords (simple: words > 4 chars, not common)
  const common = ['the', 'this', 'that', 'what', 'have', 'from', 'they', 'will', 'would', 'there', 'their', 'about', 'which', 'when', 'your', 'been', 'them', 'than', 'into', 'only', 'also', 'just', 'like', 'know', 'think', 'really', 'right', 'still', 'back', 'well', 'yeah', 'okay', 'fine', 'good', 'great'];
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 4 && !common.includes(w));
  for (const w of words) {
    stats.keywords.set(w, (stats.keywords.get(w) || 0) + 1);
  }
}

export function analyzeGroup(groupJid) {
  const stats = _groupStats.get(groupJid);
  if (!stats || stats.messages.length < 5) {
    return {
      vibe: 'New Group',
      emoji: '🌱',
      description: 'This group is just getting started. Not enough data to analyze yet.',
      activityLevel: 'low',
      topHours: [],
      topKeywords: [],
      memberCount: stats?.users.size || 0,
      messageCount: stats?.messages.length || 0,
      avgMsgLength: 0,
      suggestions: ['Keep chatting to unlock group insights!'],
    };
  }

  // Determine vibe
  const msgs = stats.messages;
  const avgLength = stats.totalChars / msgs.length;
  const uniqueUsers = stats.users.size;
  const totalMsgs = msgs.length;

  // Analyze sentiment (simple)
  const positiveWords = ['love', 'great', 'awesome', 'happy', 'good', 'nice', 'cool', 'amazing', 'perfect', 'best', 'thanks', 'thank', 'lol', 'haha', '😂', '❤️'];
  const negativeWords = ['hate', 'stupid', 'dumb', 'angry', 'sad', 'bad', 'terrible', 'worst', 'annoying', 'shut up'];
  let positive = 0, negative = 0;
  for (const m of msgs) {
    const t = m.text.toLowerCase();
    if (positiveWords.some(w => t.includes(w))) positive++;
    if (negativeWords.some(w => t.includes(w))) negative++;
  }
  const sentimentScore = (positive - negative) / totalMsgs;

  // Determine vibe
  let vibe, emoji, description;
  if (sentimentScore > 0.3) {
    vibe = 'Wholesome';
    emoji = '😊';
    description = 'This group is positive and friendly. People are supportive and use lots of positive language.';
  } else if (sentimentScore > 0.1) {
    vibe = 'Casual';
    emoji = '😎';
    description = 'This group is relaxed and casual. Good vibes, normal conversation.';
  } else if (sentimentScore > -0.1) {
    vibe = 'Neutral';
    emoji = '😐';
    description = 'This group is balanced. Mix of positive and negative, mostly neutral conversation.';
  } else if (sentimentScore > -0.3) {
    vibe = 'Intense';
    emoji = '🔥';
    description = 'This group has some heated moments. There\'s debate and some tension, but it\'s mostly okay.';
  } else {
    vibe = 'Chaos';
    emoji = '💀';
    description = 'This group is wild. Lots of negativity, arguments, or chaos. Might need moderation.';
  }

  // Activity level
  let activityLevel;
  if (totalMsgs > 80) activityLevel = 'very high';
  else if (totalMsgs > 50) activityLevel = 'high';
  else if (totalMsgs > 20) activityLevel = 'medium';
  else activityLevel = 'low';

  // Top active hours
  const topHours = stats.hours
    .map((count, hour) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .filter(h => h.count > 0);

  // Top keywords
  const topKeywords = [...stats.keywords.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  // Smart suggestions
  const suggestions = [];
  if (activityLevel === 'low') {
    suggestions.push('💬 Group is quiet — try .truth or .8ball to spark conversation');
    suggestions.push('🎮 Run .trivia or .quiz to get people talking');
  }
  if (sentimentScore < -0.1) {
    suggestions.push('🛡️ Vibe is tense — consider .antilink on or .antispam on');
    suggestions.push('☮️ Try a fun topic: .riddle or .fact to lighten the mood');
  }
  if (uniqueUsers < 3) {
    suggestions.push('👥 Only a few people are active — invite more members');
  }
  if (avgLength > 150) {
    suggestions.push('📝 Messages are long — people are having deep conversations');
  } else if (avgLength < 20) {
    suggestions.push('⚡ Messages are short and fast — this is a quick-chat group');
  }
  if (topHours.length) {
    const peakHour = topHours[0].hour;
    suggestions.push(`⏰ Peak activity at ${peakHour}:00 — schedule events around this time`);
  }
  if (suggestions.length === 0) {
    suggestions.push('✅ Group is healthy — keep it up!');
  }

  return {
    vibe,
    emoji,
    description,
    activityLevel,
    sentimentScore: sentimentScore.toFixed(2),
    positiveCount: positive,
    negativeCount: negative,
    topHours: topHours.map(h => `${h.hour}:00 (${h.count} msgs)`),
    topKeywords: topKeywords.map(k => k.word),
    memberCount: uniqueUsers,
    messageCount: totalMsgs,
    avgMsgLength: Math.round(avgLength),
    suggestions,
  };
}
