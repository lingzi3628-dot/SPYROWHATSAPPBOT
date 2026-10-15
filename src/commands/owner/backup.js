import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import config from '../../config.js';
import { audit } from '../../database.js';
import { safeFileName } from '../../security.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
const execAsync = promisify(exec);

export default {
  name: 'backup',
  aliases: ['dbbackup'],
  category: 'owner',
  ownerOnly: true,
  description: 'Create a backup of the SQLite database.',
  usage: '.backup',
  cooldown: 30,
  async execute(ctx) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const out = resolve(config.DATA_DIR, `backup-${stamp}.sqlite`);
    try {
      // Use sqlite3 CLI if available, otherwise just copy the file.
      try {
        await execAsync(`sqlite3 ${config.DATABASE_PATH} ".backup '${out}'"`);
      } catch {
        await execAsync(`cp ${config.DATABASE_PATH} ${out}`);
      }
      audit({ actor: ctx.sender, action: 'owner.backup', detail: out });
      await ctx.replyOk(`Backup created: ${out}`);
    } catch (err) {
      await ctx.replyError(`Backup failed: ${err.message || err}`);
    }
  },
};
