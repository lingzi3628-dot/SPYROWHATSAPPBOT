import { analyzeGroup, recordGroupMessage } from '../../services/group-dna.js';
import { bold, mono, italic } from '../../utils/text.js';

export default {
  name: 'groupdna',
  aliases: ['dna', 'vibe', 'groupanalysis'],
  category: 'group',
  groupOnly: true,
  description: 'Analyze the group\'s vibe, activity patterns, and get smart suggestions.',
  usage: '.groupdna',
  cooldown: 15,
  async execute(ctx) {
    const analysis = analyzeGroup(ctx.chatId);

    // Build activity bar
    const activityBars = {
      'very high': '████████████████████',
      'high': '██████████████░░░░░░',
      'medium': '██████████░░░░░░░░░░',
      'low': '████░░░░░░░░░░░░░░░░',
    };

    let out = `${bold('🧬 Group DNA Analysis')}\n${'━'.repeat(40)}\n\n`;

    out += `${bold('Vibe:')} ${analysis.emoji} ${bold(analysis.vibe)}\n`;
    out += `${italic(analysis.description)}\n\n`;

    out += `${bold('📊 Stats:')}\n`;
    out += `  Messages analyzed: ${mono(String(analysis.messageCount))}\n`;
    out += `  Active members:    ${mono(String(analysis.memberCount))}\n`;
    out += `  Avg message length: ${mono(analysis.avgMsgLength + ' chars')}\n`;
    out += `  Activity level:    ${mono(analysis.activityLevel)}\n`;
    out += `  ${mono(activityBars[analysis.activityLevel] || activityBars.low)}\n\n`;

    out += `${bold('😊 Sentiment:')}\n`;
    out += `  Positive: ${mono(String(analysis.positiveCount))} 😊\n`;
    out += `  Negative: ${mono(String(analysis.negativeCount))} 😤\n`;
    out += `  Score: ${mono(analysis.sentimentScore)}\n\n`;

    if (analysis.topHours.length) {
      out += `${bold('⏰ Peak Hours:')}\n`;
      for (const h of analysis.topHours) {
        out += `  ${mono(h)}\n`;
      }
      out += '\n';
    }

    if (analysis.topKeywords.length) {
      out += `${bold('🔍 Top Keywords:')}\n`;
      out += `  ${mono(analysis.topKeywords.join(', '))}\n\n`;
    }

    out += `${bold('💡 Smart Suggestions:')}\n`;
    for (const s of analysis.suggestions) {
      out += `  ${s}\n`;
    }

    out += `\n${'━'.repeat(40)}\n${italic('_Analysis is based on recent messages. Keep chatting for better insights!_')}`;

    await ctx.replyLong(out);
  },
};
