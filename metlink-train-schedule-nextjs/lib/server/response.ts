/**
 * Helper functions for standardized API responses
 */

import type { ApiResponse } from '@/types';

export function success<T>(
  data: T,
  meta?: Record<string, unknown>
): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  };
}

export function error(
  message: string,
  code?: string,
  meta?: Record<string, unknown>
): ApiResponse<never> {
  return {
    success: false,
    error: {
      message,
      ...(code && { code }),
    },
    ...(meta && { meta }),
  };
}

export function validationError(
  message: string,
  details?: Record<string, unknown>
): ApiResponse<never> {
  return error(message, 'VALIDATION_ERROR', details);
}

