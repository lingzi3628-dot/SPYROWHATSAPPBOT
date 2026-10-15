import '../src/config.js';
import logger from '../src/logger.js';
import { db, stmts, closeDatabase } from '../src/database.js';
import { ensureAdminAccount } from '../src/web/auth.js';
import { startWebServer } from '../src/web/server.js';

console.log('1. DB loaded');
console.log('tables:', db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t=>t.name).join(', '));

console.log('2. Ensuring admin...');
ensureAdminAccount();
console.log('   done');

console.log('3. Starting web server...');
startWebServer();
console.log('   done');

console.log('4. Waiting...');
setTimeout(() => {
  console.log('5. Still alive after 5s ✅');
  process.exit(0);
}, 5000);
