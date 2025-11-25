/**
 * Structured logging utility for server-side code
 * Pino-like structured logging with request context support
 */

import type { RequestContext } from './requestContext';

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

// Sampling configuration (0.0 to 1.0, where 1.0 = log everything)
const getSamplingRate = (): number => {
  const envRate = process.env.LOG_SAMPLING_RATE;
  if (envRate) {
    const parsed = parseFloat(envRate);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
      return parsed;
    }
  }
  return 1.0; // Default: log everything
};

const samplingRate = getSamplingRate();

type LogMetadata = Record<string, unknown>;

interface LoggerOptions {
  context?: RequestContext;
  sample?: boolean; // Whether to apply sampling (default: true for INFO/DEBUG)
}

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

function shouldSample(level: LogLevel, options?: LoggerOptions): boolean {
  // Always log ERROR and WARN
  if (level === 'ERROR' || level === 'WARN') {
    return true;
  }

  // Apply sampling for INFO and DEBUG if enabled
  if (options?.sample !== false && samplingRate < 1.0) {
    return Math.random() < samplingRate;
  }

  return true;
}

function formatLog(
  level: LogLevel,
  message: string,
  metadata: LogMetadata = {},
  options?: LoggerOptions
): string {
  const payload: LogMetadata = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  // Include request context if provided
  if (options?.context) {
    payload.requestId = options.context.requestId;
    payload.traceId = options.context.traceId;
    if (options.context.userAgent) {
      payload.userAgent = options.context.userAgent;
    }
  }

  // Merge metadata
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== undefined) {
      payload[key] = value;
    }
  }

  return JSON.stringify(payload);
}

/**
 * Logger interface with request context support
 */
export interface Logger {
  error(message: string, metadata?: Error | LogMetadata, options?: LoggerOptions): void;
  warn(message: string, metadata?: LogMetadata, options?: LoggerOptions): void;
  info(message: string, metadata?: LogMetadata, options?: LoggerOptions): void;
  debug(message: string, metadata?: LogMetadata, options?: LoggerOptions): void;
  
  /**
   * Create a child logger with bound request context
   */
  child(context: RequestContext): Logger;
}

class LoggerImpl implements Logger {
  private boundContext?: RequestContext;

  constructor(boundContext?: RequestContext) {
    this.boundContext = boundContext;
  }

  private getContext(options?: LoggerOptions): RequestContext | undefined {
    return options?.context || this.boundContext;
  }

  error(message: string, metadata?: Error | LogMetadata, options?: LoggerOptions): void {
    if (LOG_LEVELS.ERROR <= currentLogLevel) {
      const context = this.getContext(options);
      console.error(formatLog('ERROR', message, normalizeMetadata(metadata), { ...options, context }));
    }
  }

  warn(message: string, metadata: LogMetadata = {}, options?: LoggerOptions): void {
    if (LOG_LEVELS.WARN <= currentLogLevel) {
      const context = this.getContext(options);
      if (shouldSample('WARN', options)) {
        console.warn(formatLog('WARN', message, metadata, { ...options, context }));
      }
    }
  }

  info(message: string, metadata: LogMetadata = {}, options?: LoggerOptions): void {
    if (LOG_LEVELS.INFO <= currentLogLevel) {
      const context = this.getContext(options);
      if (shouldSample('INFO', options)) {
        console.log(formatLog('INFO', message, metadata, { ...options, context }));
      }
    }
  }

  debug(message: string, metadata: LogMetadata = {}, options?: LoggerOptions): void {
    if (LOG_LEVELS.DEBUG <= currentLogLevel) {
      const context = this.getContext(options);
      if (shouldSample('DEBUG', options)) {
        console.log(formatLog('DEBUG', message, metadata, { ...options, context }));
      }
    }
  }

  child(context: RequestContext): Logger {
    return new LoggerImpl(context);
  }
}

/**
 * Default logger instance
 */
export const logger: Logger = new LoggerImpl();

/**
 * Create a logger with bound request context
 * Use this in route handlers to automatically include requestId and traceId
 * 
 * @example
 * ```ts
 * const context = createRequestContext(request);
 * const requestLogger = createLogger(context);
 * requestLogger.info('Processing request', { endpoint: '/api/departures' });
 * // Output: {"timestamp":"...","level":"INFO","message":"Processing request","requestId":"...","traceId":"...","endpoint":"/api/departures"}
 * ```
 */
export function createLogger(context: RequestContext): Logger {
  return new LoggerImpl(context);
}
