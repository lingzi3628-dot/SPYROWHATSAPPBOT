/**
 * services/pollination.js
 * Pollination AI — free image generation, NO API KEY required.
 *
 * Docs: https://pollinations.ai
 * Endpoint: https://image.pollinations.ai/prompt/{encodedPrompt}
 *
 * Usage:
 *   const url = await generateImageUrl("a cat riding a skateboard", { width: 1024, height: 1024 });
 *   const buffer = await generateImage("a dragon", { width: 512, height: 512 });
 */
import axios from 'axios';
import logger from '../logger.js';

const BASE = 'https://image.pollinations.ai';

/**
 * Generate an image URL (the image is generated on-demand when you fetch it).
 * @param {string} prompt  text description of the image
 * @param {object} opts    { width, height, seed, model, nologo, enhance }
 * @returns {string} URL that serves the generated image
 */
export function generateImageUrl(prompt, opts = {}) {
  const {
    width = 1024,
    height = 1024,
    seed,
    model = 'flux',
    nologo = true,
    enhance = true,
  } = opts;

  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    model,
    nologo: nologo ? 'true' : 'false',
    enhance: enhance ? 'true' : 'false',
  });
  if (seed !== undefined) params.set('seed', String(seed));

  return `${BASE}/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}

/**
 * Generate an image and return it as a Buffer.
 * @param {string} prompt
 * @param {object} opts  same as generateImageUrl
 * @returns {Promise<Buffer>} image bytes
 */
export async function generateImage(prompt, opts = {}) {
  const url = generateImageUrl(prompt, opts);
  logger.debug({ url: url.slice(0, 120), prompt: prompt.slice(0, 60) }, 'pollination: generating image');
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 90_000,
    headers: { 'User-Agent': 'SpyroBot/1.0' },
  });
  return Buffer.from(res.data);
}

/**
 * Generate an avatar / profile picture from a name or description.
 * @param {string} nameOrDesc  e.g. "Mesh" or "cyberpunk hacker with hoodie"
 * @returns {Promise<Buffer>}
 */
export async function generateAvatar(nameOrDesc) {
  const prompt = `professional avatar portrait, ${nameOrDesc}, digital art, high quality, centered, vibrant colors, anime style, profile picture`;
  return generateImage(prompt, { width: 512, height: 512, nologo: true });
}

/**
 * Check if Pollination AI is reachable (lightweight HEAD request).
 */
export async function isAvailable() {
  try {
    const res = await axios.head(`${BASE}/prompt/test?width=64&height=64&nologo=true`, {
      timeout: 10_000,
    });
    return res.status === 200;
  } catch {
    return false;
  }
}
