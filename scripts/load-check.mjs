// Mock socket stub for loading commands without an active connection.
const stub = {
  user: { id: 'bot@s.whatsapp.net' },
  ev: { on: () => {}, off: () => {}, removeAllListeners: () => {} },
};
import handler from '../src/handler.js';
await handler.loadCommands(stub);
console.log('Loaded commands:', handler.commands.size);
console.log('Categories:', [...new Set([...handler.commands.values()].map(c=>c.category))].sort().join(', '));
console.log('Sample:', [...handler.commands.keys()].slice(0, 30).join(', '));
console.log('.vv resolves to:', handler.get('vv')?.name || 'NOT FOUND');
console.log('.avatar resolves to:', handler.get('avatar')?.name || 'NOT FOUND');
console.log('.imagine resolves to:', handler.get('imagine')?.name || 'NOT FOUND');
// Force exit to avoid better-sqlite3 native teardown crash
process.exit(0);
