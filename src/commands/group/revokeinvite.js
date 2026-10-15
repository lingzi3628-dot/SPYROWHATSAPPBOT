import { audit } from '../../database.js';

export default {
  name: 'revokeinvite',
  aliases: ['resetlink', 'revokelink'],
  category: 'group',
  groupOnly: true,
  adminOnly: true,
  botAdminRequired: true,
  description: 'Revoke and regenerate the group invite link.',
  usage: '.revokeinvite',
  async execute(ctx) {
    try {
      const code = await ctx.sock.groupRevokeInvite(ctx.chatId);
      audit({ actor: ctx.sender, action: 'group.revoke_invite', groupJid: ctx.chatId });
      await ctx.replyOk(`Invite revoked. New link:\nhttps://chat.whatsapp.com/${code}`);
    } catch (err) {
      await ctx.replyError(`Could not revoke invite: ${err.message || err}`);
    }
  },
};
