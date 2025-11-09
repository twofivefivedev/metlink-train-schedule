/**
 * Structured logging utility for server-side code
 */

type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

const LOG_LEVELS: Record<LogLevel, number> = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const LOG_LEVEL_NAMES: Record<number, LogLevel> = {
  0: 'ERROR',
  1: 'WARN',
  2: 'INFO',
  3: 'DEBUG',
};

const getLogLevel = (): LogLevel => {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase() as LogLevel;
  return envLevel && LOG_LEVELS[envLevel] !== undefined ? envLevel : 'INFO';
};

const currentLogLevel = LOG_LEVELS[getLogLevel()];

function formatLog(level: LogLevel, message: string, metadata: Record<string, unknown> = {}): string {
  const timestamp = new Date().toISOString();
  const levelName = LOG_LEVEL_NAMES[LOG_LEVELS[level]] || level;
  const metaStr = Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata)}` : '';
  return `[${timestamp}] [${levelName}] ${message}${metaStr}`;
}

export const logger = {
  error(message: string, error?: Error | Record<string, unknown>): void {
    if (LOG_LEVELS.ERROR <= currentLogLevel) {
      const metadata = error instanceof Error
        ? { message: error.message, stack: error.stack, name: error.name }
        : error || {};
      console.error(formatLog('ERROR', message, metadata));
    }
  },

  warn(message: string, metadata: Record<string, unknown> = {}): void {
    if (LOG_LEVELS.WARN <= currentLogLevel) {
      console.warn(formatLog('WARN', message, metadata));
    }
  },

  info(message: string, metadata: Record<string, unknown> = {}): void {
    if (LOG_LEVELS.INFO <= currentLogLevel) {
      console.log(formatLog('INFO', message, metadata));
    }
  },

  debug(message: string, metadata: Record<string, unknown> = {}): void {
    if (LOG_LEVELS.DEBUG <= currentLogLevel) {
      console.log(formatLog('DEBUG', message, metadata));
    }
  },
};

