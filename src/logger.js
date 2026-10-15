/**
 * logger.js
 * pino-based structured logger with secret redaction.
 */
import pino from 'pino';
import config from './config.js';

const redactPatterns = [
  '*.creds.*',
  '*.signalIdentity.*',
  '*.noiseKey.*',
  '*.identityKey.*',
  '*.signedPreKey.*',
  '*.registrationId',
  '*.advSecretKey',
  '*.nextPreKeyId',
  '*.firstUnuploadedPreKeyId',
  '*.serverHasPreKeys',
  'apiKey',
  'api_key',
  '*.apiKey',
  '*.api_key',
  'password',
  '*.password',
  'token',
  '*.token',
  'authorization',
  '*.authorization',
  'session',
  '*.session',
];

const transport = config.LOG_PRETTY
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss.l',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    }
  : undefined;

const logger = pino(
  {
    level: config.LOG_LEVEL,
    base: { bot: config.BOT_NAME, version: config.VERSION },
    redact: {
      paths: redactPatterns,
      censor: '[REDACTED]',
      remove: false,
    },
    transport,
  },
);

export default logger;

// Helper: redact a string in-place (for ad-hoc log lines)
export function redactString(s = '') {
  if (typeof s !== 'string') return s;
  // redact anything that looks like a JID's full phone number — keep domain
  return s.replace(/(\d{6,})@s\.whatsapp\.net/g, '****@s.whatsapp.net');
}
