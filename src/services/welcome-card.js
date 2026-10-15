/**
 * services/welcome-card.js
 * Generates beautiful welcome card images when someone joins a group.
 * Uses sharp (SVG → PNG) with gradient backgrounds.
 */
import sharp from 'sharp';
import { stmts } from '../database.js';
import logger from '../logger.js';

const GRADIENTS = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#30cfd0', '#330867'],
  ['#a8edea', '#fed6e3'],
  ['#ff9a9e', '#fecfef'],
];

/**
 * Generate a welcome card image.
 * @param {string} userName - the joining user's name
 * @param {string} groupName - the group name
 * @param {number} memberCount - current member count
 * @returns {Promise<Buffer>} PNG image buffer
 */
export async function generateWelcomeCard(userName, groupName, memberCount) {
  const gradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
  const width = 800;
  const height = 400;
  
  // Escape XML
  const escName = _escapeXml(userName?.slice(0, 30) || 'New Member');
  const escGroup = _escapeXml(groupName?.slice(0, 40) || 'This Group');
  
  const svg = `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${gradient[0]}"/>
        <stop offset="100%" style="stop-color:${gradient[1]}"/>
      </linearGradient>
      <filter id="shadow">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.3)"/>
      </filter>
    </defs>
    
    <!-- Background -->
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    
    <!-- Decorative circles -->
    <circle cx="100" cy="80" r="60" fill="rgba(255,255,255,0.1)"/>
    <circle cx="700" cy="320" r="80" fill="rgba(255,255,255,0.1)"/>
    <circle cx="650" cy="60" r="30" fill="rgba(255,255,255,0.15)"/>
    
    <!-- Welcome text -->
    <text x="${width/2}" y="80" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="rgba(255,255,255,0.9)" text-anchor="middle">🎉 WELCOME 🎉</text>
    
    <!-- Avatar circle -->
    <circle cx="${width/2}" cy="180" r="50" fill="rgba(255,255,255,0.3)" filter="url(#shadow)"/>
    <text x="${width/2}" y="195" font-family="Arial, sans-serif" font-size="40" fill="white" text-anchor="middle">👤</text>
    
    <!-- User name -->
    <text x="${width/2}" y="270" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white" text-anchor="middle" filter="url(#shadow)">${escName}</text>
    
    <!-- Group name -->
    <text x="${width/2}" y="310" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.8)" text-anchor="middle">joined ${escGroup}</text>
    
    <!-- Member count -->
    <text x="${width/2}" y="350" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.7)" text-anchor="middle">You are member #${memberCount} 🎊</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Generate a goodbye card image.
 */
export async function generateGoodbyeCard(userName, groupName) {
  const gradient = ['#2c3e50', '#34495e'];
  const width = 800;
  const height = 300;
  
  const escName = _escapeXml(userName?.slice(0, 30) || 'Member');
  const escGroup = _escapeXml(groupName?.slice(0, 40) || 'the group');
  
  const svg = `
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${gradient[0]}"/>
        <stop offset="100%" style="stop-color:${gradient[1]}"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <text x="${width/2}" y="80" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="rgba(255,255,255,0.9)" text-anchor="middle">👋 GOODBYE 👋</text>
    <text x="${width/2}" y="160" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white" text-anchor="middle">${escName}</text>
    <text x="${width/2}" y="200" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.7)" text-anchor="middle">left ${escGroup}</text>
    <text x="${width/2}" y="240" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.5)" text-anchor="middle">We'll miss you! 🥲</text>
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

function _escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
