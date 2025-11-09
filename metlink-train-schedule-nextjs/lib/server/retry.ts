/**
 * Retry utility with exponential backoff
 */

import { API_CONFIG } from '@/lib/constants';
import { logger } from './logger';

interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  shouldRetry?: (error: unknown) => boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = API_CONFIG.RETRY_ATTEMPTS,
    baseDelay = API_CONFIG.RETRY_DELAY,
    shouldRetry = (error: unknown) => {
      // Retry on network errors or 5xx status codes
      if (error && typeof error === 'object' && 'code' in error) {
        const code = error.code as string;
        if (code === 'ECONNREFUSED' || code === 'ETIMEDOUT') {
          return true;
        }
      }
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { status?: number } }).response;
        if (response?.status && response.status >= 500) {
          return true;
        }
      }
      return false;
    },
  } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if we've exhausted attempts or error shouldn't be retried
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`, {
        error: error instanceof Error ? error.message : String(error),
        attempt,
      });

      await sleep(delay);
    }
  }

  throw lastError;
}

