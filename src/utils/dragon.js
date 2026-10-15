/**
 * utils/dragon.js
 * Spyro Dragon ASCII art logo — shown in .menu header.
 *
 * Designed in monospace for WhatsApp's code blocks.
 */

// Full dragon (shown in .menu)
export const DRAGON_FULL = `
   /\\\\\\\\\\\\_
  / . . \\\\\\\\
  \\\\  >  /
   \\\\   /
    \\\\_/
   _|_|_
  [     ]
  |     |
  |_____|
`;

// Compact dragon (shown in .alive, .botinfo)
export const DRAGON_COMPACT = `🐉`;

// Dragon with text banner
export function dragonBanner(text = 'SPYRO BOT') {
  return `
        🐉
   ___/\\___
  | ${text} |
   ¯¯¯¯¯¯¯¯`;
}

// Spyro dragon head — stylized
export const DRAGON_HEAD = `
    ◢███◣
   ◢◤  ◥◣
  ◢◤ ●  ● ◥◣
  ◥◣  ◣◢  ◢◤
   ◥◣ ◣◢ ◢◤
    ◥◣◣◢◢◤
     ◥██◤
      ▼
   S P Y R O`;
