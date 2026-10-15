/**
 * services/image-menu.js
 * Generates a premium menu image card with the Spyro dragon emblem.
 * Uses sharp (SVG → PNG) with the SPYRO INTELLIGENCE branding.
 */
import sharp from 'sharp';
import config from '../config.js';

const THEMES = {
  dark:     { bg: ['#0a0e14', '#121822'], accent: '#25d366', text: '#e6edf3', dim: '#8b949e' },
  fire:     { bg: ['#1a0a0a', '#3d0a0a'], accent: '#ff4500', text: '#ffe0d0', dim: '#ff8c69' },
  hacker:   { bg: ['#000000', '#0a1a0a'], accent: '#00ff00', text: '#00ff00', dim: '#008000' },
  colorful: { bg: ['#1a0a2e', '#16213e'], accent: '#e94560', text: '#ffffff', dim: '#a5d6a4' },
  minimal:  { bg: ['#ffffff', '#f0f0f0'], accent: '#25d366', text: '#000000', dim: '#666666' },
  light:    { bg: ['#f5f5f5', '#e8e8e8'], accent: '#128c7e', text: '#000000', dim: '#666666' },
};

export async function generateMenuImage({ botName, version, totalCmds, status, uptime, prefix, owner, theme = 'dark' }) {
  const t = THEMES[theme] || THEMES.dark;
  const width = 800;
  const height = 600;

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const svg = `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${t.bg[0]}"/>
        <stop offset="100%" style="stop-color:${t.bg[1]}"/>
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="shadow">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.5)"/>
      </filter>
    </defs>

    <!-- Background -->
    <rect width="${width}" height="${height}" fill="url(#bg)"/>

    <!-- Decorative grid lines -->
    <line x1="0" y1="200" x2="${width}" y2="200" stroke="${t.accent}" stroke-width="1" opacity="0.1"/>
    <line x1="0" y1="400" x2="${width}" y2="400" stroke="${t.accent}" stroke-width="1" opacity="0.1"/>

    <!-- Dragon emblem -->
    <g transform="translate(${width/2 - 80}, 40)" filter="url(#glow)">
      <text x="80" y="30" font-family="monospace" font-size="14" fill="${t.accent}" text-anchor="middle">
        <tspan x="80" dy="0">   ▄████████▄</tspan>
        <tspan x="80" dy="18"> ▄█▀        ▀█▄</tspan>
        <tspan x="80" dy="18">█▀   ◉    ◉   ▀█</tspan>
        <tspan x="80" dy="18">█       ▱       █</tspan>
        <tspan x="80" dy="18"> ▀█▄  ╰──╯  ▄█▀</tspan>
        <tspan x="80" dy="18">   ▀████████▀</tspan>
        <tspan x="80" dy="18">       ▼</tspan>
      </text>
    </g>

    <!-- SPYRO INTELLIGENCE title -->
    <text x="${width/2}" y="230" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="${t.accent}" text-anchor="middle" filter="url(#glow)">◈ SPYRO INTELLIGENCE ◈</text>
    <text x="${width/2}" y="255" font-family="monospace" font-size="14" fill="${t.dim}" text-anchor="middle">SYSTEM v${esc(version)}</text>

    <!-- Divider -->
    <line x1="200" y1="275" x2="${width-200}" y2="275" stroke="${t.accent}" stroke-width="2" opacity="0.3"/>

    <!-- Telemetry box -->
    <rect x="60" y="300" width="${width-120}" height="200" rx="8" fill="rgba(0,0,0,0.2)" stroke="${t.accent}" stroke-width="1" opacity="0.5"/>

    <text x="90" y="335" font-family="monospace" font-size="14" fill="${t.dim}">◉ STATUS</text>
    <text x="280" y="335" font-family="monospace" font-size="14" font-weight="bold" fill="${t.accent}">${esc(status)}</text>

    <text x="90" y="365" font-family="monospace" font-size="14" fill="${t.dim}">⏱ UPTIME</text>
    <text x="280" y="365" font-family="monospace" font-size="14" fill="${t.text}">${esc(uptime)}</text>

    <text x="90" y="395" font-family="monospace" font-size="14" fill="${t.dim}">⚙ PREFIX</text>
    <text x="280" y="395" font-family="monospace" font-size="14" fill="${t.text}">${esc(prefix)}</text>

    <text x="90" y="425" font-family="monospace" font-size="14" fill="${t.dim}">🧩 MODULES</text>
    <text x="280" y="425" font-family="monospace" font-size="14" fill="${t.text}">${esc(String(totalCmds))} COMMANDS</text>

    <text x="90" y="455" font-family="monospace" font-size="14" fill="${t.dim}">👑 OPERATOR</text>
    <text x="280" y="455" font-family="monospace" font-size="14" fill="${t.text}">${esc(owner)}</text>

    <text x="90" y="485" font-family="monospace" font-size="14" fill="${t.dim}">🔐 SECURITY</text>
    <text x="280" y="485" font-family="monospace" font-size="14" fill="${t.accent}">ACTIVE</text>

    <!-- Footer -->
    <text x="${width/2}" y="540" font-family="Arial, sans-serif" font-size="12" fill="${t.dim}" text-anchor="middle" font-style="italic">◈ ━━━━━━ SPYRO NETWORK ━━━━━━ ◈</text>
    <text x="${width/2}" y="560" font-family="Arial, sans-serif" font-size="10" fill="${t.dim}" text-anchor="middle">Intelligence • Innovation • Control</text>
    <text x="${width/2}" y="580" font-family="monospace" font-size="10" fill="${t.dim}" text-anchor="middle">© SPYRO TECHNOLOGIES</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
