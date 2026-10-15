/**
 * events/groups.js
 * Group-participant join / leave events for welcome / goodbye messages.
 * Now generates beautiful welcome/goodbye card images.
 */
import logger from '../logger.js';
import { getGroupSettings } from '../database.js';
import { template } from '../utils/text.js';
import { generateWelcomeCard, generateGoodbyeCard } from '../services/welcome-card.js';

export function bindGroupEvents(sock) {
  sock.ev.on('groups.upsert', async (groups) => {
    for (const g of groups) {
      logger.info({ jid: g.id, subject: g.subject }, 'group upsert');
    }
  });

  sock.ev.on('groups.update', async (updates) => {
    for (const u of updates) {
      logger.info({ jid: u.id, updates: u }, 'group updated');
    }
  });

  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    try {
      const settings = getGroupSettings(id);
      let meta = null;
      try { meta = await sock.groupMetadata(id); } catch {}

      for (const p of participants) {
        try {
          if (action === 'add' && settings.welcome) {
            const tpl = settings.welcome_msg ||
              'Welcome {user} to {group}!\nYou are member #{count}.';
            const count = meta?.participants?.length ?? '?';
            const userName = p.split('@')[0];
            const groupName = meta?.subject || id;

            // Try to send a welcome card image
            try {
              const card = await generateWelcomeCard(userName, groupName, count);
              await sock.sendMessage(id, {
                image: card,
                caption: template(tpl, {
                  user: '@' + userName,
                  group: groupName,
                  count,
                }),
                mentions: [p],
              });
            } catch (err) {
              // Fallback to text-only if image fails
              logger.warn({ err: err.message }, 'welcome card failed, sending text');
              await sock.sendMessage(id, {
                text: template(tpl, { user: '@' + userName, group: groupName, count }),
                mentions: [p],
              });
            }
          } else if ((action === 'remove' || action === 'leave') && settings.goodbye) {
            const tpl = settings.goodbye_msg || 'Goodbye {user} from {group}.';
            const userName = p.split('@')[0];
            const groupName = meta?.subject || id;

            // Try goodbye card
            try {
              const card = await generateGoodbyeCard(userName, groupName);
              await sock.sendMessage(id, {
                image: card,
                caption: template(tpl, { user: '@' + userName, group: groupName }),
                mentions: [p],
              });
            } catch {
              await sock.sendMessage(id, {
                text: template(tpl, { user: '@' + userName, group: groupName }),
                mentions: [p],
              });
            }
          }
        } catch (err) {
          logger.warn({ err, id, p, action }, 'welcome/goodbye failed');
        }
      }
    } catch (err) {
      logger.error({ err }, 'group participants handler error');
    }
  });
}
