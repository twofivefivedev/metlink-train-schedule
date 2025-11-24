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

const getLogLevel = (): LogLevel => {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase() as LogLevel;
  return envLevel && LOG_LEVELS[envLevel] !== undefined ? envLevel : 'INFO';
};

const currentLogLevel = LOG_LEVELS[getLogLevel()];

type LogMetadata = Record<string, unknown>;

function normalizeMetadata(metadata?: Error | LogMetadata): LogMetadata {
  if (!metadata) {
    return {};
  }

  if (metadata instanceof Error) {
    return {
      error: {
        name: metadata.name,
        message: metadata.message,
        stack: metadata.stack,
      },
    };
  }

  return metadata;
}

function formatLog(level: LogLevel, message: string, metadata: LogMetadata = {}): string {
  const payload: LogMetadata = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  for (const [key, value] of Object.entries(metadata)) {
    if (value !== undefined) {
      payload[key] = value;
    }
  }

  return JSON.stringify(payload);
}

export const logger = {
  error(message: string, metadata?: Error | LogMetadata): void {
    if (LOG_LEVELS.ERROR <= currentLogLevel) {
      console.error(formatLog('ERROR', message, normalizeMetadata(metadata)));
    }
  },

  warn(message: string, metadata: LogMetadata = {}): void {
    if (LOG_LEVELS.WARN <= currentLogLevel) {
      console.warn(formatLog('WARN', message, metadata));
    }
  },

  info(message: string, metadata: LogMetadata = {}): void {
    if (LOG_LEVELS.INFO <= currentLogLevel) {
      console.log(formatLog('INFO', message, metadata));
    }
  },

  debug(message: string, metadata: LogMetadata = {}): void {
    if (LOG_LEVELS.DEBUG <= currentLogLevel) {
      console.log(formatLog('DEBUG', message, metadata));
    }
  },
};

