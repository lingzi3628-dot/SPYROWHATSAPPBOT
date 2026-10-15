/**
 * utils/text.js
 * Text helpers: parsing, escaping, slicing, templates.
 */

/** Escape characters that WhatsApp would interpret as formatting. */
export function escapeMarkdown(s = '') {
  return String(s).replace(/([*_~`|>])/g, '\\$1');
}

/** Truncate a string to n chars, optionally with ellipsis. */
export function truncate(s = '', n = 4000, ellipsis = '…') {
  if (s.length <= n) return s;
  return s.slice(0, n - ellipsis.length) + ellipsis;
}

/** Template renderer: replaces {var} in template with values. */
export function template(tpl = '', vars = {}) {
  return String(tpl).replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? '' : String(vars[k])));
}

/** Monospace wrapper. */
export function mono(s = '') {
  return `\`\`\`${String(s)}\`\`\``;
}

/** Inline code wrapper. */
export function inlineCode(s = '') {
  return `\`${String(s)}\``;
}

/** Bold wrapper. */
export function bold(s = '') {
  return `*${String(s)}*`;
}

/** Italic wrapper. */
export function italic(s = '') {
  return `_${String(s)}_`;
}

/** Strike wrapper. */
export function strike(s = '') {
  return `~${String(s)}~`;
}

/** Split a long string into chunks no larger than n characters, breaking on word boundaries. */
export function chunkText(s = '', n = 1800) {
  const out = [];
  let rest = String(s);
  while (rest.length > n) {
    let cut = rest.lastIndexOf(' ', n);
    if (cut <= 0) cut = n;
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut).trimStart();
  }
  if (rest.length) out.push(rest);
  return out;
}

/**
 * Parse a single command line into [name, ...args].
 * Quoted segments are kept as one argument.
 *   .kick "John Doe"  -> ["kick", "John Doe"]
 *   .calc 1 + 2        -> ["calc", "1", "+", "2"]
 */
export function parseArgs(line = '') {
  const out = [];
  let buf = '';
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === quote) {
        out.push(buf);
        buf = '';
        quote = null;
      } else {
        buf += c;
      }
    } else if (c === '"' || c === "'") {
      if (buf) {
        out.push(buf);
        buf = '';
      }
      quote = c;
    } else if (c === ' ' || c === '\t' || c === '\n') {
      if (buf) {
        out.push(buf);
        buf = '';
      }
    } else {
      buf += c;
    }
  }
  if (buf) out.push(buf);
  return out;
}

/** Sanitize a string for safe display (remove control chars, normalize whitespace). */
export function sanitize(s = '') {
  return String(s)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Make a slug for filenames. */
export function slugify(s = '') {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'file';
}

/** Title-case each word. */
export function titleCase(s = '') {
  return String(s)
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
